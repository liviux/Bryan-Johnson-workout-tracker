import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSharedVoicePack, buildVoicePack } from "../voice/service.js";
import { writeBundle } from "../voice/bundles.js";
import { MODEL_SHA } from "../voice/runtime.js";

async function testServer(t) {
  const root = await mkdtemp(path.join(tmpdir(), "workout-voice-api-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ["server.js", "package.json", "CHANGELOG.md"]) await copyFile(new URL(`../${name}`, import.meta.url), path.join(root, name));
  await mkdir(path.join(root, "voice"));
  for (const name of ["service.js", "cache.js", "bundles.js", "runtime.js", "worker.js"]) await copyFile(new URL(`../voice/${name}`, import.meta.url), path.join(root, "voice", name));
  await cp(new URL("../public/js", import.meta.url), path.join(root, "public/js"), { recursive: true });
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let child;
  const stop = async () => { if (!child) return; const ended = new Promise((resolve) => child.once("exit", resolve)); child.kill(); await ended; child = null; };
  t.after(stop);
  const start = async () => {
    child = spawn(process.execPath, [path.join(root, "server.js")], { env: { ...process.env, PORT: String(port), DATA_DIR: path.join(root, "data") }, stdio: "ignore" });
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(base + "/api/info")).ok) return; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail("test server did not start");
  };
  const post = (route, body) => fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { root, base, start, stop, post };
}

test("the API saves no audio before activation and serves a ready pack without a model runtime, including after restart", async (t) => {
  const { root, base, start, stop, post } = await testServer(t);
  await mkdir(path.join(root, ".voice/model"), { recursive: true });
  await writeFile(path.join(root, ".voice/ready.json"), JSON.stringify({ sha256: MODEL_SHA }));
  await writeFile(path.join(root, ".voice/model/model.int8.onnx"), "unused model fixture");
  await start();
  assert.equal((await (await fetch(base + "/api/voice/status")).json()).cacheEnabled, false);
  const preview = (await (await post("/api/voice/prepare", { preview: true })).json()).preview;
  assert.equal((await fetch(base + preview.url)).status, 409, "preview cannot create audio before the first explicit activation");
  const entries = buildVoicePack({ voice: "af_heart", addons: [] });
  await mkdir(path.join(root, ".voice/audio"));
  const audio = Buffer.from("a saved voice clip");
  await Promise.all(entries.map((entry) => writeFile(path.join(root, ".voice/audio", `${entry.id}.wav`), audio)));
  const activated = await post("/api/voice/cache", { voice: "af_heart", addons: [] });
  assert.equal(activated.status, 202);
  assert.equal((await activated.json()).cache.state, "ready");
  assert.deepEqual(Buffer.from(await (await fetch(base + preview.url)).arrayBuffer()), audio);
  const crossSite = await fetch(base + "/api/voice/cache", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(crossSite.status, 403);
  await stop(); await start();
  const status = await (await fetch(base + "/api/voice/status")).json();
  assert.equal(status.cacheEnabled, true);
  assert.equal(status.cache.state, "ready");
  await post("/api/voice/prepare", { preview: true });
  assert.deepEqual(Buffer.from(await (await fetch(base + preview.url)).arrayBuffer()), audio);
  assert.equal((await fetch(base + "/api/info")).status, 200);
});

test("included recordings activate, switch voices and speak custom timers without a model or personal data", async (t) => {
  const { root, base, start, stop, post } = await testServer(t);
  const audio = Buffer.alloc(48);
  audio.write("RIFF"); audio.writeUInt32LE(40, 4); audio.write("WAVEfmt ", 8); audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(24000, 24); audio.writeUInt32LE(48000, 28);
  audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(4, 40);
  const source = path.join(root, "fixtures"); await mkdir(source);
  for (const voice of ["af_heart", "am_michael"]) {
    const entries = buildSharedVoicePack(voice);
    await Promise.all(entries.map((entry) => writeFile(path.join(source, `${entry.id}.wav`), audio)));
    await writeBundle(voice, entries, source, path.join(root, "voice/packs"));
  }
  await start();
  const initial = await (await fetch(base + "/api/voice/status")).json();
  assert.equal(initial.installed, true, "included audio needs no model installation");
  assert.equal(initial.cacheEnabled, true, "included packs can play without unpacking every clip");
  assert(!existsSync(path.join(root, ".voice/audio")), "opening controls does not unpack audio before opt-in");
  const activated = await post("/api/voice/cache", { voice: "am_michael" });
  assert.equal(activated.status, 202);
  const ready = async (voice) => {
    for (let i = 0; i < 400; i++) {
      const status = await (await fetch(base + "/api/voice/status?voice=" + voice)).json();
      assert.notEqual(status.cache?.state, "error", status.cache?.error);
      if (status.cache?.state === "ready") return status;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail("included voice did not finish unpacking");
  };
  const streamed = await ready("am_michael");
  assert.equal(streamed.cache.shared, true);
  assert.equal(streamed.cache.streamed, true);
  await ready("af_heart");
  assert.deepEqual((await readdir(path.join(root, ".voice/packs"))).sort(), ["af_heart.json"], "only the default voice is unpacked locally");
  assert(!existsSync(path.join(root, ".voice/model")), "no model is downloaded or used");
  const manifest = await (await post("/api/voice/prepare", { voice: "am_michael", itemId: "mon-strength-row", level: 2, restSec: 777 })).json();
  assert(manifest.rest, JSON.stringify(manifest));
  const combined = Buffer.from(await (await fetch(base + manifest.rest.url)).arrayBuffer());
  assert.equal(combined.subarray(0, 4).toString(), "RIFF");
  assert(combined.length > audio.length, "custom rest duration is assembled from saved fragments");
  const preview = (await (await post("/api/voice/prepare", { voice: "am_michael", preview: true })).json()).preview;
  await rm(path.join(root, ".voice/audio", `${preview.id}.wav`), { force: true });
  assert.equal((await fetch(base + preview.url)).status, 200, "a removed playback file is restored from the included recording");
  const saved = JSON.parse(await readFile(path.join(root, ".voice/packs/af_heart.json"), "utf8"));
  assert(saved.entries.every((entry) => Object.keys(entry).every((key) => ["id", "text", "sid", "vid", "speed"].includes(key))));
  await stop(); await start();
  assert.equal((await ready("am_michael")).cache.state, "ready");
  await post("/api/voice/prepare", { voice: "am_michael", itemId: "mon-strength-row", level: 2, restSec: 777 });
  assert.equal((await fetch(base + manifest.rest.url)).status, 200);
});
