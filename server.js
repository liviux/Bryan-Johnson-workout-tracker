#!/usr/bin/env node
// Local server for the workout tracker.
// Serves the app from ./public and stores your data as plain JSON files:
//   data/profile.json          your profile, settings and chosen add-ons
//   data/days/YYYY-MM-DD.json  one file per day (sets, reps, notes, skips)
// No database and no runtime dependencies beyond Node itself.

import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { clearHealthStore, importHealthConnect, readHealthStore } from "./health-connect.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const DAYS_DIR = path.join(DATA_DIR, "days");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const PORT = Number(process.env.PORT) || 3030;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY = 2 * 1024 * 1024;
const MAX_HEALTH_BODY = 384 * 1024 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// URL prefixes served straight from installed packages, so the app works offline.
const VENDOR = [
  ["/vendor/three/", path.join(ROOT, "node_modules", "three")],
  ["/vendor/fonts/@fontsource/", path.join(ROOT, "node_modules", "@fontsource")],
  ["/vendor/fonts/@fontsource-variable/", path.join(ROOT, "node_modules", "@fontsource-variable")],
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
};

// ---------- helpers ----------

function send(res, status, body, type = "application/json; charset=utf-8") {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(data);
}

function fail(res, status, message) {
  send(res, status, { error: message });
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

// Updates can replace package.json while this local server keeps running.
async function appVersion() {
  return (await readJson(path.join(ROOT, "package.json"))).version;
}

// Write to a temp file first, then rename: a crash mid-write never corrupts your data.
async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function readRawBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("File too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

async function readAllDays() {
  const out = {};
  let names = [];
  try {
    names = await readdir(DAYS_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const name of names.sort()) {
    const date = name.replace(/\.json$/, "");
    if (!DATE_RE.test(date) || !name.endsWith(".json")) continue;
    try {
      out[date] = await readJson(path.join(DAYS_DIR, name));
    } catch (err) {
      console.warn(`Skipping unreadable day file ${name}: ${err.message}`);
    }
  }
  return out;
}

// ---------- API ----------

async function handleApi(req, res, pathname) {
  const method = req.method;

  if (pathname.startsWith("/api/voice/")) {
    const { handleVoice } = await import("./voice/service.js");
    return handleVoice(req, res, pathname, { readBody, send, fail, profile: () => readJson(PROFILE_FILE, {}) });
  }

  if (pathname === "/api/info" && method === "GET") {
    return send(res, 200, { app: "bryan-johnson-workout-website", version: await appVersion(), storage: "server", dataDir: path.relative(ROOT, DATA_DIR) || "." });
  }

  if (pathname === "/api/changelog" && method === "GET") {
    return send(res, 200, await readFile(path.join(ROOT, "CHANGELOG.md"), "utf8"), "text/markdown; charset=utf-8");
  }

  // Read-only Health Connect import. The uploaded file is parsed and discarded;
  // only the normalized exercise sessions are kept in data/health-connect.json.
  if (pathname === "/api/health-connect") {
    if (method === "GET") return send(res, 200, await readHealthStore(DATA_DIR));
    if (method === "DELETE") {
      await clearHealthStore(DATA_DIR);
      return send(res, 200, { ok: true });
    }
    if (method === "POST") {
      const name = new URL(req.url, "http://localhost").searchParams.get("name") || "";
      const buffer = await readRawBody(req, MAX_HEALTH_BODY);
      try {
        return send(res, 200, await importHealthConnect(buffer, { filename: name, dataDir: DATA_DIR }));
      } catch (err) {
        return send(res, err.status || 400, { error: err.message, code: err.code || "import-failed" });
      }
    }
  }

  if (pathname === "/api/profile") {
    if (method === "GET") {
      const profile = await readJson(PROFILE_FILE);
      return send(res, 200, profile); // null until the setup wizard has run
    }
    if (method === "PUT") {
      const body = await readBody(req);
      if (!isPlainObject(body)) return fail(res, 400, "Profile must be a JSON object");
      body.updatedAt = new Date().toISOString();
      await writeJson(PROFILE_FILE, body);
      return send(res, 200, { ok: true, updatedAt: body.updatedAt });
    }
    if (method === "DELETE") {
      await unlink(PROFILE_FILE).catch((err) => {
        if (err.code !== "ENOENT") throw err;
      });
      return send(res, 200, { ok: true });
    }
  }

  if (pathname === "/api/days" && method === "GET") {
    return send(res, 200, await readAllDays());
  }

  const dayMatch = pathname.match(/^\/api\/days\/([^/]+)$/);
  if (dayMatch) {
    const date = decodeURIComponent(dayMatch[1]);
    if (!DATE_RE.test(date)) return fail(res, 400, "Date must be YYYY-MM-DD");
    const file = path.join(DAYS_DIR, `${date}.json`);
    if (method === "GET") {
      const day = await readJson(file);
      return day ? send(res, 200, day) : fail(res, 404, "No log for this day");
    }
    if (method === "PUT") {
      const body = await readBody(req);
      if (!isPlainObject(body)) return fail(res, 400, "Day log must be a JSON object");
      body.date = date;
      body.updatedAt = new Date().toISOString();
      await writeJson(file, body);
      return send(res, 200, { ok: true, updatedAt: body.updatedAt });
    }
    if (method === "DELETE") {
      try {
        await unlink(file);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
      return send(res, 200, { ok: true });
    }
  }

  if (pathname === "/api/export" && method === "GET") {
    const payload = {
      app: "bryan-johnson-workout-website",
      version: await appVersion(),
      exportedAt: new Date().toISOString(),
      profile: await readJson(PROFILE_FILE),
      days: await readAllDays(),
    };
    return send(res, 200, payload);
  }

  if (pathname === "/api/import" && method === "POST") {
    const body = await readBody(req);
    if (!isPlainObject(body)) return fail(res, 400, "Import must be a JSON object");
    const mode = body.mode === "replace" ? "replace" : "merge";
    let count = 0;
    if (mode === "replace") {
      const existing = await readAllDays();
      for (const date of Object.keys(existing)) await unlink(path.join(DAYS_DIR, `${date}.json`)).catch(() => {});
    }
    if (isPlainObject(body.profile)) await writeJson(PROFILE_FILE, body.profile);
    if (isPlainObject(body.days)) {
      for (const [date, day] of Object.entries(body.days)) {
        if (!DATE_RE.test(date) || !isPlainObject(day)) continue;
        await writeJson(path.join(DAYS_DIR, `${date}.json`), { ...day, date });
        count += 1;
      }
    }
    return send(res, 200, { ok: true, mode, days: count });
  }

  return fail(res, 404, "Unknown API route");
}

// ---------- static files ----------

// Maps a URL path to a file, refusing anything that escapes the allowed folder.
function inside(dir, rel) {
  const file = path.normalize(path.join(dir, rel));
  return file === dir || file.startsWith(dir + path.sep) ? file : null;
}

function resolveStatic(pathname) {
  for (const [prefix, dir] of VENDOR) {
    if (pathname.startsWith(prefix)) return inside(dir, pathname.slice(prefix.length));
  }
  return inside(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname.slice(1));
}

async function serveStatic(req, res, pathname) {
  const file = resolveStatic(pathname);
  if (!file) return fail(res, 403, "Forbidden");
  let info;
  try {
    info = await stat(file);
  } catch {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  if (info.isDirectory()) return serveStatic(req, res, path.posix.join(pathname, "index.html"));
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-cache",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return fail(res, 400, "Bad URL");
  }
  try {
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);
    if (req.method !== "GET" && req.method !== "HEAD") return fail(res, 405, "Method not allowed");
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) fail(res, err.status || 500, err.status ? err.message : "Server error");
  }
});

await mkdir(DAYS_DIR, { recursive: true });
if (existsSync(path.join(ROOT, ".voice", "packs"))) {
  import("./voice/service.js").then(({ resumeVoiceCache }) => resumeVoiceCache()).catch((err) => console.warn("Voice cache:", err.message));
}
if (!existsSync(path.join(ROOT, "node_modules", "three"))) {
  console.warn("\n  three.js is missing. Run `npm install` first, or the 3D animations won't load.\n");
}
server.listen(PORT, HOST, () => {
  const shown = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`\n  Workout tracker running at http://${shown}:${PORT}`);
  console.log(`  Your data is saved in ${DATA_DIR}`);
  if (HOST === "0.0.0.0") console.log("  Listening on your whole network (HOST=0.0.0.0). There is no login, so only do this on a network you trust.");
  console.log("  Press Ctrl+C to stop.\n");
});
