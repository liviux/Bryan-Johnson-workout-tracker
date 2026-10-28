import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// A saved pack is also consent to resume its unfinished work after a restart.
export class VoiceCache {
  constructor(dir, render) {
    this.dir = dir;
    this.render = render;
    this.packs = new Map();
    this.pinnedIds = new Set();
    this.running = false;
    this.selected = "";
  }

  async load() {
    this.loaded ||= (async () => {
      const names = await readdir(path.join(this.dir, "packs")).catch((err) => { if (err.code === "ENOENT") return []; throw err; });
      for (const name of names.filter((name) => /^[a-z]{2}_[a-z]+\.json$/.test(name))) {
        try {
          const pack = JSON.parse(await readFile(path.join(this.dir, "packs", name), "utf8"));
          if (`${pack.voice}.json` !== name || !Array.isArray(pack.entries) || !pack.entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.id) && typeof entry.text === "string")) throw new Error("Invalid voice pack");
          pack.completed = pack.entries.filter((entry) => existsSync(this.file(entry.id))).length;
          pack.state = pack.completed === pack.entries.length ? "ready" : "building";
          pack.started = Date.now(); pack.initial = pack.completed;
          this.packs.set(pack.voice, pack);
          for (const entry of pack.entries) this.pinnedIds.add(entry.id);
        } catch (err) { console.warn(`Voice pack ${name}: ${err.message}. Select the voice to prepare it again.`); }
      }
    })();
    await this.loaded;
  }

  file(id) {
    for (const ext of ["wav", "mp3"]) {
      const file = path.join(this.dir, "audio", `${id}.${ext}`);
      if (existsSync(file)) return file;
    }
    return path.join(this.dir, "audio", `${id}.wav`);
  }

  async start(voice, entries) {
    await this.load();
    const signature = createHash("sha256").update(entries.map((entry) => entry.id).sort().join("\n")).digest("hex");
    let pack = this.packs.get(voice);
    if (!pack || pack.signature !== signature || pack.state === "error") {
      pack = { voice, signature, entries, state: "building", completed: entries.filter((entry) => existsSync(this.file(entry.id))).length, started: Date.now() };
      pack.initial = pack.completed;
      if (pack.completed === entries.length) pack.state = "ready";
      const dir = path.join(this.dir, "packs");
      await mkdir(dir, { recursive: true });
      const tmp = path.join(dir, `${voice}.${randomUUID()}.tmp`);
      await writeFile(tmp, JSON.stringify(pack));
      await rename(tmp, path.join(dir, `${voice}.json`));
      this.packs.set(voice, pack);
      this.pinnedIds = new Set([...this.packs.values()].flatMap((p) => p.entries.map((entry) => entry.id)));
    }
    this.selected = voice;
    this.resume();
    return this.status(voice);
  }

  status(voice) {
    const pack = this.packs.get(voice);
    if (!pack) return null;
    const generated = pack.completed - pack.initial;
    const remaining = pack.entries.length - pack.completed;
    return { state: pack.state, completed: pack.completed, total: pack.entries.length, remainingSeconds: generated >= 3 && remaining ? Math.ceil((Date.now() - pack.started) / 1000 / generated * remaining) : null, error: pack.error || null };
  }

  pinned(id) { return this.pinnedIds.has(id); }

  async resume() {
    if (this.running) return;
    this.running = true;
    try {
      let pack;
      while ((pack = [this.packs.get(this.selected), ...this.packs.values()].find((p) => p?.state === "building"))) {
        const entry = pack.entries.find((entry) => !existsSync(this.file(entry.id)));
        if (!entry) { pack.state = "ready"; pack.completed = pack.entries.length; continue; }
        try {
          await this.render(entry, (completed) => { pack.completed = completed; });
          pack.completed = pack.entries.filter((entry) => existsSync(this.file(entry.id))).length;
        } catch (err) { pack.state = "error"; pack.error = err.message; }
      }
    } finally { this.running = false; }
  }
}
