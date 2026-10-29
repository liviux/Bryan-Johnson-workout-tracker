import assert from "node:assert/strict";
import test from "node:test";
import { state } from "../public/js/store.js";
import { cacheVoice, cancelTeaching, cancelVoice, loadClip, onVoice, playVoice, refreshVoiceStatus, unlockVoice, videoVoice, voiceStatus } from "../public/js/voice/player.js";

test("one player cancels stale audio, prioritises clocks, and restores ducking on every stop", async (t) => {
  const sources = [];
  let decoded;
  let delayDecode = false;
  let failStart = false;
  class Context {
    state = "running";
    sampleRate = 24000;
    destination = {};
    resume() { return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() {
      const source = { playbackRate: { value: 1 }, connect() {}, disconnect() {}, start() { if (failStart) throw new Error("Audio device stopped"); source.started = true; }, stop() { source.stopped = true; }, onended: null };
      sources.push(source);
      return source;
    }
    decodeAudioData() { return delayDecode ? new Promise((resolve) => { decoded = resolve; }) : Promise.resolve({ duration: 2 }); }
  }
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  globalThis.window = { AudioContext: Context };
  t.after(() => { globalThis.fetch = originalFetch; if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
  state.profile = { settings: { voiceCoach: true, sound: false } };
  voiceStatus.cacheEnabled = true;
  await unlockVoice();
  const events = [];
  const off = onVoice((status) => events.push(status.speaking));
  t.after(() => { cancelVoice(); off(); state.profile = null; });
  const clip = (id) => ({ id, url: `/api/voice/audio/${id}.wav` });
  const teaching = { ...clip("teaching"), rate: 1.06 }, clock = clip("clock");
  await loadClip(teaching); await loadClip(clock);
  const first = playVoice(teaching, { teaching: true });
  assert.equal(events.at(-1), true, "beeps can be off while voice plays and ducks the radio");
  const oldSource = sources.at(-1);
  assert.equal(oldSource.playbackRate.value, 1.06, "brisk pace reuses the cached audio at a faster playback rate");
  const warning = playVoice(clock, { urgent: true });
  assert.equal(oldSource.stopped, true, "clock interrupts teaching");
  const warningSource = sources.at(-1);
  assert.equal(warningSource.playbackRate.value, 1);
  assert.equal(await playVoice(teaching, { teaching: true }), false, "teaching cannot interrupt a clock");
  cancelTeaching();
  assert(!warningSource.stopped, "typing does not silence a clock cue");
  warningSource.onended();
  await warning; await first;
  assert.equal(events.at(-1), false);
  const second = playVoice(teaching);
  videoVoice(true);
  await second;
  assert.equal(events.at(-1), false, "video restores radio volume");
  assert.equal(await playVoice(clock, { urgent: true }), false);
  videoVoice(false);
  assert.equal(await playVoice(clip("not-ready"), { urgent: true }), false, "a missing clock cue stays silent");
  delayDecode = true;
  const stale = playVoice(clip("stale"), { wait: true });
  while (!decoded) await new Promise((resolve) => setImmediate(resolve));
  const count = sources.length;
  cancelVoice(); decoded({ duration: 2 });
  assert.equal(await stale, false);
  assert.equal(sources.length, count, "navigation while loading cannot play the old cue later");
  assert.equal(events.at(-1), false);
  failStart = true;
  assert.equal(await playVoice(clock), false);
  assert.equal(events.at(-1), false, "failed playback restores radio volume");
  state.profile.settings.voiceCoach = false;
  assert.equal(await playVoice(clock), false);
});

test("a coach voice can be downloaded explicitly by id", async (t) => {
  const originalFetch = globalThis.fetch;
  const previousStatus = { ...voiceStatus };
  t.after(() => { globalThis.fetch = originalFetch; Object.assign(voiceStatus, previousStatus); state.profile = null; });
  state.profile = { settings: { coachVoice: "af_heart" } };
  voiceStatus.cacheEnabled = false;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ cacheEnabled: true, cache: { state: "ready", completed: 1, total: 1 } }) };
  };
  await cacheVoice({ activate: true, voice: "af_bella" });
  assert.equal(body.voice, "af_bella");
});

test("voice selection cannot cache before opt-in and status polling cannot undo activation", async (t) => {
  const originalFetch = globalThis.fetch;
  const previousStatus = { ...voiceStatus };
  t.after(() => { globalThis.fetch = originalFetch; Object.assign(voiceStatus, previousStatus); state.profile = null; });
  state.profile = { level: "new", settings: { coachVoice: "af_heart" } };
  voiceStatus.cacheEnabled = false;
  const calls = [];
  let finish;
  globalThis.fetch = (url) => { calls.push(url); return new Promise((resolve) => { finish = resolve; }); };
  await cacheVoice();
  assert.deepEqual(calls, [], "choosing a voice before first activation saves nothing");
  const activation = cacheVoice({ activate: true });
  await refreshVoiceStatus();
  assert.deepEqual(calls, ["/api/voice/cache"], "polling waits for explicit activation to finish");
  finish({ ok: true, json: async () => ({ cacheEnabled: true, cache: { state: "ready", completed: 10, total: 10 } }) });
  await activation;
  assert.equal(voiceStatus.cacheEnabled, true);
  assert.equal(voiceStatus.cache.state, "ready");
  await cacheVoice();
  assert.equal(calls.length, 1, "unchanged preferences reuse the same pack");
});
