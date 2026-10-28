import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { existsSync } from "node:fs";
import { MODEL_SHA } from "./runtime.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const validId = (id) => /^[a-f0-9]{64}$/.test(id);

export function combineWaves(waves) {
  let format;
  const samples = waves.map((wave) => {
    if (wave.toString("ascii", 0, 4) !== "RIFF" || wave.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid voice audio");
    let pcm, data;
    for (let pos = 12; pos + 8 <= wave.length;) {
      const size = wave.readUInt32LE(pos + 4), end = pos + 8 + size;
      if (end > wave.length) throw new Error("Truncated voice audio");
      const name = wave.toString("ascii", pos, pos + 4);
      if (name === "fmt ") pcm = wave.subarray(pos + 8, end);
      if (name === "data") data = wave.subarray(pos + 8, end);
      pos = end + (size % 2);
    }
    if (!pcm || pcm.length < 16 || pcm.readUInt16LE(0) !== 1 || !data) throw new Error("Voice audio must be PCM WAV");
    if (format && !pcm.subarray(0, 16).equals(format)) throw new Error("Voice audio formats differ");
    format = pcm.subarray(0, 16);
    return data;
  });
  if (!format) throw new Error("No voice audio");
  const data = Buffer.concat(samples), header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(data.length + 36, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); format.copy(header, 20); header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export async function writeBundle(voice, entries, audioDir, outputDir, { ext = "wav", mime = "audio/wav" } = {}) {
  const dir = path.join(outputDir, voice);
  await mkdir(dir, { recursive: true });
  const metadata = { format: ext === "wav" ? 2 : 3, voice, model: MODEL_SHA, ext, mime, clips: [] };
  let previous = new Map();
  try {
    const saved = JSON.parse(await readFile(path.join(outputDir, `${voice}.json`), "utf8"));
    if ([2, 3].includes(saved.format) && saved.voice === voice && saved.model === MODEL_SHA) previous = new Map(saved.clips.map((clip) => [clip.id, clip]));
  } catch {}
  for (const entry of entries) {
    const file = path.join(dir, `${entry.id}.${ext}.gz`), saved = previous.get(entry.id);
    if (saved && existsSync(file)) {
      const bytes = await readFile(file);
      if (bytes.length === saved.bytes && hash(bytes) === saved.sha256) { metadata.clips.push({ ...saved, text: entry.text, ext, mime }); continue; }
    }
    const audio = await readFile(path.join(audioDir, `${entry.id}.${ext}`));
    const bytes = gzipSync(audio, { level: 9 });
    await writeFile(file, bytes);
    metadata.clips.push({ id: entry.id, text: entry.text, ext, mime, sha256: hash(bytes), bytes: bytes.length });
  }
  const ids = new Set(entries.map((entry) => entry.id));
  for (const name of await readdir(dir)) if (/^[a-f0-9]{64}\.(?:wav|mp3)\.gz$/.test(name) && !ids.has(name.slice(0, 64))) await rm(path.join(dir, name));
  await writeFile(path.join(outputDir, `${voice}.json`), JSON.stringify(metadata, null, 2) + "\n");
  return metadata;
}

export async function readBundle(voice, sourceDir) {
  if (!/^[a-z]{2}_[a-z]+$/.test(voice)) throw new Error("Unknown voice");
  const metadata = JSON.parse(await readFile(path.join(sourceDir, `${voice}.json`), "utf8"));
  const ext = metadata.ext || "wav";
  if (![2, 3].includes(metadata.format) || metadata.voice !== voice || metadata.model !== MODEL_SHA || !["wav", "mp3"].includes(ext) || !Array.isArray(metadata.clips) || !metadata.clips.length || metadata.clips.length > 20000 || !metadata.clips.every((clip) => clip && validId(clip.id) && validId(clip.sha256) && (clip.text === undefined || (typeof clip.text === "string" && clip.text.length <= 1024)) && Number.isInteger(clip.bytes) && clip.bytes > 0 && clip.bytes <= 16 * 1024 * 1024) || new Set(metadata.clips.map((clip) => clip.id)).size !== metadata.clips.length) throw new Error("Invalid shared voice pack");
  return metadata;
}

export async function unpackBundle(voice, sourceDir, audioDir, clipId, onProgress) {
  const metadata = await readBundle(voice, sourceDir);
  await mkdir(audioDir, { recursive: true });
  const clips = clipId ? metadata.clips.filter((clip) => clip.id === clipId) : metadata.clips;
  const ext = metadata.ext || "wav";
  const fileFor = (clip) => path.join(audioDir, `${clip.id}.${ext}`);
  const present = new Set(clips.filter((clip) => existsSync(fileFor(clip))).map((clip) => clip.id));
  let done = present.size;
  onProgress?.(done);
  for (let start = 0; start < clips.length; start += 16) {
    const chunk = clips.slice(start, start + 16);
    await Promise.all(chunk.map(async (clip) => {
      const file = fileFor(clip);
      if (existsSync(file)) return;
      const bytes = await readFile(path.join(sourceDir, voice, `${clip.id}.${ext}.gz`));
      if (bytes.length !== clip.bytes || hash(bytes) !== clip.sha256) throw new Error("Voice pack checksum failed. Update the app and retry.");
      const audio = gunzipSync(bytes, { maxOutputLength: 16 * 1024 * 1024 });
      if (ext === "wav") combineWaves([audio]);
      const tmp = path.join(audioDir, `${clip.id}.${randomUUID()}.tmp`);
      await writeFile(tmp, audio); await rename(tmp, file);
      present.add(clip.id);
    }));
    done = present.size;
    onProgress?.(done);
  }
  onProgress?.(clips.length);
  return metadata;
}
