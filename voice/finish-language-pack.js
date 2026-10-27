// Package synthesized MP3 clips into the shared voice bundle format.
// Usage: node voice/finish-language-pack.js entries.json
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeBundle } from "./bundles.js";
import { ROOT } from "./runtime.js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node voice/finish-language-pack.js <entries.json>");
  process.exit(1);
}
const payload = JSON.parse(await readFile(input, "utf8"));
if (!payload.language || !payload.voice || !Array.isArray(payload.entries)) throw new Error("Invalid entries file");
const audioDir = path.join(ROOT, "voice/language-audio", payload.language, payload.voice);
const metadata = await writeBundle(payload.voice, payload.entries, audioDir, path.join(ROOT, "voice/packs"), { ext: "mp3", mime: "audio/mpeg" });
console.log(`${payload.voice}: ${metadata.clips.length} clips, ${metadata.clips.reduce((n, clip) => n + clip.bytes, 0)} compressed bytes`);
