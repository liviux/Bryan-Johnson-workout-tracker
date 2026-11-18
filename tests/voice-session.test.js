import assert from "node:assert/strict";
import test from "node:test";
import { DAYS } from "../public/js/data/program.js";
import { defaultProfile } from "../public/js/personalize.js";
import { state } from "../public/js/store.js";
import { createGuidedVoice } from "../public/js/voice/session.js";
import { unlockVoice, voiceStatus } from "../public/js/voice/player.js";
import { prepareManifest } from "../voice/service.js";

test("guided voice prepares a step, plays its intro and reports a failed preparation", async (t) => {
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  const texts = new Map(), played = [];
  let manifest;
  let failPreparation = false;
  let releaseAudio, audioStarted;
  const firstAudio = new Promise((resolve) => { releaseAudio = resolve; });
  const loadingAudio = new Promise((resolve) => { audioStarted = resolve; });
  class Context {
    state = "running"; sampleRate = 24000; destination = {};
    resume() { return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, stop() {}, start() { if (source.buffer.text) played.push(source.buffer.text); queueMicrotask(() => source.onended?.()); } };
      return source;
    }
    decodeAudioData(data) { return Promise.resolve({ duration: 2, text: new TextDecoder().decode(data) }); }
  }
  globalThis.window = { AudioContext: Context };
  globalThis.fetch = async (url, options) => {
    if (url.startsWith("/api/voice/status")) return { ok: true, json: async () => ({ installed: true, cacheEnabled: true }) };
    if (url === "/api/voice/cache") return { ok: true, json: async () => ({ cacheEnabled: true, cache: { state: "ready", completed: 1, total: 1 } }) };
    if (url === "/api/voice/prepare") {
      if (failPreparation) throw new Error("Could not prepare the local voice.");
      const result = prepareManifest(JSON.parse(options.body));
      const visit = (value) => {
        if (value?.id) texts.set(value.url, value.text);
        else if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") Object.values(value).forEach(visit);
      };
      visit(result); manifest ||= result;
      return { ok: true, json: async () => result };
    }
    audioStarted();
    await firstAudio;
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(texts.get(url)).buffer };
  };
  state.profile = { ...defaultProfile(), level: "active" };
  voiceStatus.cacheEnabled = true;
  const all = DAYS.flatMap((d) => d.blocks.flatMap((b) => b.items.map((item) => ({ item, block: b.name, level: 2, scope: "main" }))));
  const row = all.find((s) => s.item.ex === "row");
  const next = all.find((s) => s.item.ex === "pushup");
  const status = { textContent: "" };
  const coach = createGuidedVoice("2026-10-19", [row, next], status);
  t.after(() => {
    coach.dispose(); state.profile = null;
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  });
  await unlockVoice();
  const entering = coach.enter(0);
  await loadingAudio;
  assert.equal(voiceStatus.preparing, true, "the popup stays in preparation state while speech is loading");
  assert.match(status.textContent, /Loading coach audio/);
  assert.match(status.textContent, /progress is shown in Coach/);
  releaseAudio(); await entering;
  assert.equal(voiceStatus.preparing, false, "preparation ends when the opening speech is ready");
  assert.equal(status.textContent, "");
  await new Promise((resolve) => setImmediate(resolve));
  assert(played.includes(manifest.intro[0].text), "the step intro plays");
  coach.input();
  failPreparation = true;
  state.profile.settings.coachVoice = "am_puck";
  await coach.enter(0);
  assert.equal(voiceStatus.preparing, false, "an error cannot leave the popup stuck preparing");
  assert.equal(voiceStatus.message, "Could not prepare the local voice.");
});
