// Collect user-facing English from the plan data and the browser UI.
// Run: node scripts/i18n-extract.mjs
import { existsSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// themes.js reads the browser's colour-scheme preference at import time.
globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
globalThis.document = { documentElement: { dataset: {}, style: {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const data = await import("../public/js/data/exercises.js");
const program = await import("../public/js/data/program.js");
const addons = await import("../public/js/data/addons/index.js");
const radio = await import("../public/js/data/radio.js");
const equipment = await import("../public/js/data/equipment.js");
const personalize = await import("../public/js/personalize.js");
const benchmarks = await import("../public/js/views/benchmarks.js");
const plan = await import("../public/js/plan.js");
const themes = await import("../public/js/themes.js");
const animStyles = await import("../public/js/anim-styles.js");
const ranges = await import("../public/js/progress-ranges.js");
const voiceScript = await import("../public/js/voice/script.js");

const keys = new Set();
const skipKeys = new Set(["id", "ex", "u", "k", "s", "icon", "color", "log", "type", "kind", "scope", "equipment", "muscles", "cats", "key", "url", "session", "date", "variant", "mode", "schedule", "pct", "tech", "rx", "mins", "timer", "quote"]);

function add(value) {
  if (typeof value !== "string") return;
  const text = value.trim();
  if (!text || text.length > 1200) return;
  if (/^(?:https?:|mailto:|\/|#|\.|@|--)/.test(text)) return;
  if (/^[\d\s.,:;×x/–—%°+@{}()-]+$/.test(text)) return;
  if (!/[A-Za-zÀ-ž\u0900-\u097F\u4e00-\u9fff]/.test(text)) return;
  if (/^[a-z0-9_.-]+$/.test(text) && text === text.toLowerCase() && !text.includes(" ")) return;
  if (/\{\{|\}\}|=>|\b(?:const|function|import|export)\b/.test(text)) return;
  if (/^[\d.]+(?:s|min|kg|lb|cm|in|bpm)$/i.test(text)) return;
  if (/^\d+\s*×/.test(text)) return;
  if (/^[\[(_\-]|^["']|["']$|\.querySelector|\?\.|viewBox|stroke-|\baria-[a-z]+=|\bdata-[a-z-]+=?|<[a-z/]|\bclass=|\bstyle=|\bxmlns=|\bfont-|\bwidth=|\bheight=|\bpath\b/.test(text)) return;
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return;
  if (!/[A-Za-zÀ-ž\u0900-\u097F\u4e00-\u9fff]{2}/.test(text)) return;
  if (/^[,;:·•|]+/.test(text)) return;
  keys.add(text);
}

function walk(value, parent = "", depth = 0) {
  if (depth > 12) return;
  if (typeof value === "string") { if (!skipKeys.has(parent)) add(value); return; }
  if (Array.isArray(value)) { for (const item of value) walk(item, parent, depth + 1); return; }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walk(item, key, depth + 1);
  }
}

for (const mod of [data, program, addons, radio, equipment, personalize, benchmarks, plan, themes, animStyles, ranges, voiceScript]) {
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function") continue;
    walk(value, key);
  }
}

// Source strings used by the browser, including t("...") templates.
const uiFiles = [];
function files(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) { if (!["anim", "voice"].includes(name)) files(file); }
    else if (name.endsWith(".js")) uiFiles.push(file);
  }
}
files(path.join(root, "public/js"));

function scanStrings(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      let buf = "";
      while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") { buf += source.slice(i, i + 2); i += 2; continue; }
        if (ch === quote) { i++; break; }
        buf += ch; i++;
      }
      if (quote === "`") {
        for (const part of buf.split(/\$\{[^}]*\}/)) if (part.trim()) out.push(part);
      } else out.push(buf);
    } else if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      i = end < 0 ? source.length : end + 1;
    } else if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
    } else i++;
  }
  return out;
}

for (const file of uiFiles) {
  const relative = path.relative(root, file);
  if (relative === "public/js/i18n.js" || relative.startsWith("public/js/locales/")) continue;
  for (const text of scanStrings(readFileSync(file, "utf8"))) {
    if (text.includes("${")) continue;
    if (/[<>{};]|\b(?:var|function|const|return|import|export)\b|https?:\/\//.test(text)) continue;
    add(text);
  }
}

// t("...") calls may span a template that is not user-visible otherwise.
const callFiles = [...uiFiles];
for (const dir of [path.join(root, "public/js/voice"), path.join(root, "voice")]) {
  if (!existsSync(dir)) continue;
  const addFiles = (folder) => {
    for (const name of readdirSync(folder)) {
      if (name === "language-audio" || name === "node_modules" || name === "packs") continue;
      const file = path.join(folder, name);
      try {
        if (statSync(file).isDirectory()) addFiles(file);
        else if (name.endsWith(".js")) callFiles.push(file);
      } catch {}
    }
  };
  addFiles(dir);
}
for (const file of callFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\b(?:t|tr)\(\s*"((?:\\.|[^"\\])*)"/g)) add(match[1].replace(/\\"/g, '"'));
  for (const match of source.matchAll(/\b(?:t|tr)\(\s*'((?:\\.|[^'\\])*)'/g)) add(match[1].replace(/\\'/g, "'"));
}

// Text seen in real rendered pages, collected with scripts/i18n-dom.mjs.
if (existsSync(path.join(root, "scripts/dom-strings.json"))) {
  for (const text of JSON.parse(readFileSync(path.join(root, "scripts/dom-strings.json"), "utf8"))) add(text);
}

// Release notes are rendered in Settings → Latest changes.
const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
for (const line of changelog.split("\n")) {
  const bullet = line.match(/^\s*- (.+)$/);
  if (bullet) add(bullet[1].replace(/`([^`]+)`/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1"));
  const heading = line.match(/^### (.+)$/);
  if (heading) add(heading[1]);
}
for (const key of ["about","at","by","then","percent","kilograms","pounds","centimeters","degrees","dumbbell","Romanian deadlift","controlled joint circles","range of motion","reps","seconds","minutes","and","side","arm","leg","sets","each {side}","{count} degrees","{count} inches","{count} minutes","{count} seconds","{value} to ","Change sides. Get into position for the other side.","workout tracker","Home Protocol · workout tracker","counts toward your weekly minutes","(about {weeks} weeks)","about {weeks} weeks","Get ready. Your timer will start in a few seconds.","{label}. {duration}. Breathe steadily throughout the hold.","Recover with easy marching.","Round {round} of {total}.","beats per minute","kilograms", "each {side}", "Rest for", "Continue when you are ready.", "{block} is next.", "Set {set} of {sets}.", "Rest for {duration}. Continue when you are ready.", "1 minute", "1 second", "1 session to go", "1 full week in range", "1 session", "1 session at {level} · checkpoint about {target} sessions{weeks}."]) keys.add(key);
add("Plan change:");
add("Read more");
add("Latest changes");

const list = [...keys].sort((a, b) => a.localeCompare(b, "en"));
writeFileSync(path.join(root, "scripts/i18n-keys.json"), JSON.stringify(list, null, 2) + "\n");
console.log(`${list.length} phrases, ${list.reduce((n, s) => n + s.length, 0)} characters`);
