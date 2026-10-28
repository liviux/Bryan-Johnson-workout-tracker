// One player for guided coaching, timers and previews. Only prepared local clips play.
import { state, updateProfile } from "../store.js";
import { voicesForLanguage } from "./script.js";
import { rxFor } from "../plan.js";
import { language, t } from "../i18n.js";

let context = null;
let source = null;
let generation = 0;
let priority = -1;
let speaking = false;
let mutedByVideo = false;
let finishSource = null;
const buffers = new Map();
const listeners = new Set();
let cacheRequest = "";
let pendingCache = "";
export const PREPARING_VOICE = "Loading coach audio. Saved clips play as soon as they arrive. If this voice is still being cached, its progress is shown in Coach.";
export const voiceStatus = { known: false, voice: null, installed: false, installing: false, preparing: false, cacheEnabled: false, cache: null, message: "Checking local voice…", blocked: false };
const notify = () => { for (const fn of listeners) fn({ ...voiceStatus, speaking }); };
export function onVoice(fn) { listeners.add(fn); fn({ ...voiceStatus, speaking }); return () => listeners.delete(fn); }
export function setVoicePreparing(value) { voiceStatus.preparing = value; notify(); }
export const voiceEnabled = () => state.profile?.settings?.voiceCoach === true && voiceStatus.cacheEnabled;
export const selectedVoice = () => voicesForLanguage(language()).find((v) => v.id === state.profile?.settings?.coachVoice) || voicesForLanguage(language())[0];

export function unlockVoice() {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    const resumed = context.resume();
    resumed.catch(() => { voiceStatus.blocked = true; notify(); });
    // Starting a silent buffer in the gesture also unlocks older mobile Safari.
    const silent = context.createBufferSource();
    silent.buffer = context.createBuffer(1, 1, context.sampleRate);
    silent.connect(context.destination); silent.start();
    voiceStatus.blocked = false;
    return resumed;
  } catch {
    voiceStatus.message = t("Audio is unavailable in this browser."); notify();
    return Promise.resolve();
  }
}

export function cancelVoice() {
  generation += 1;
  if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
  source = null; priority = -1;
  finishSource?.(); finishSource = null;
  speaking = false; notify();
}
export function cancelTeaching() { if (priority === 0) cancelVoice(); }
export function videoVoice(value) { mutedByVideo = value; if (value) cancelVoice(); }
export function setVoiceEnabled(value) {
  updateProfile((p) => { p.settings ||= {}; p.settings.voiceCoach = value; }, { silent: true });
  if (!value) { voiceStatus.preparing = false; cancelVoice(); }
  else { mutedByVideo = false; unlockVoice(); cacheVoice({ activate: true }); }
  notify();
}

export async function refreshVoiceStatus() {
  if (pendingCache) { notify(); return voiceStatus; }
  const voice = selectedVoice().id;
  const requestedCache = cacheRequest;
  try {
    const response = await fetch(`/api/voice/status?voice=${voice}`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (pendingCache || selectedVoice().id !== voice || requestedCache !== cacheRequest) { notify(); return voiceStatus; }
    Object.assign(voiceStatus, result, { known: true, voice });
  } catch { voiceStatus.known = false; voiceStatus.installed = false; voiceStatus.message = t("Start the local server to use voice coaching."); }
  notify();
  return voiceStatus;
}

export function voiceCacheMessage() {
  const cache = voiceStatus.cache;
  if (!voiceStatus.cacheEnabled) return t("Turn coaching on once to save the included recordings for playback. No audio is unpacked before that.");
  if (!cache) return t("This voice has not been cached yet. Select it to start its one-time preparation.");
  if (cache.state === "error") return t("Voice cache paused: {error} Turn coaching on again to retry; finished audio is kept.", { error: cache.error });
  if (cache.state === "ready") return t("{voice} is cached. Saved audio is ready for your workout.", { voice: selectedVoice().name });
  if (cache.shared) return t("Preparing {voice} from the included recordings: {done} of {total} clips ready. This only copies saved audio; no speech model needs to run. You can close this page while it finishes.", { voice: selectedVoice().name, done: cache.completed, total: cache.total || "…" });
  const seconds = cache.remainingSeconds;
  const remaining = seconds ? seconds >= 3600 ? ` ${t("About {count} hours remaining.", { count: Math.ceil(seconds / 3600) })}` : ` ${t("About {count} minutes remaining.", { count: Math.max(1, Math.ceil(seconds / 60)) })}` : ` ${t("The first build can take a long time on a slow CPU.")}`;
  return t("Caching {voice}: {done} of {total} clips saved.{remaining} Your week, timer options and form cues are being saved once. You can leave this page; preparation continues on the server.", { voice: selectedVoice().name, done: cache.completed, total: cache.total || "…", remaining });
}

export async function cacheVoice({ activate = false } = {}) {
  if (!activate && !voiceStatus.cacheEnabled) return;
  const body = { voice: selectedVoice().id };
  const key = JSON.stringify(body);
  if (cacheRequest === key && voiceStatus.cache?.state !== "error") return;
  cacheRequest = key;
  pendingCache = key;
  const wasEnabled = voiceStatus.cacheEnabled;
  voiceStatus.cacheEnabled = true;
  voiceStatus.cache = { state: "building", completed: 0, total: 0 };
  notify();
  try {
    const response = await fetch("/api/voice/cache", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("Could not prepare the voice cache."));
    if (cacheRequest === key) Object.assign(voiceStatus, result);
  } catch (err) {
    if (cacheRequest === key) { voiceStatus.cacheEnabled = wasEnabled; voiceStatus.cache = { state: "error", error: err.message }; voiceStatus.message = err.message; cacheRequest = ""; }
  }
  if (pendingCache === key) pendingCache = "";
  notify();
}
export async function installVoice() {
  if (voiceStatus.installed && !voiceStatus.error) return;
  const response = await fetch("/api/voice/install", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voice: selectedVoice().id }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || t("Could not start the download."));
  Object.assign(voiceStatus, { installing: !!data.installing, installed: !!data.installed, message: data.message }); notify();
}

export function voiceRequest(item, level, log = {}, restSec = 75) {
  return {
    itemId: item.id, level, restSec,
    easier: ["dose", "version"].includes(log.easier?.choice) ? log.easier.choice : undefined,
    doseLevel: log.rxOverride ? [0, 1, 2, 3].find((n) => rxFor(item, n) === log.rxOverride) : undefined,
    profile: { units: state.profile?.units },
  };
}

export async function prepareVoice(request) {
  const response = await fetch("/api/voice/prepare", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, voice: selectedVoice().id, pace: state.profile?.settings?.coachPace || "steady" }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || t("Could not prepare this voice."));
  return result;
}

export function loadClip(clip) {
  if (!clip || !context) return Promise.resolve(null);
  if (buffers.has(clip.id)) return buffers.get(clip.id).promise;
  const entry = { buffer: null, promise: null };
  entry.promise = (async () => {
    const response = await fetch(clip.url, { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(t("Could not prepare the local voice. Try the preview again."));
    entry.buffer = await context.decodeAudioData(await response.arrayBuffer());
    return entry.buffer;
  })().catch((err) => { buffers.delete(clip.id); voiceStatus.message = err.message; notify(); return null; });
  buffers.set(clip.id, entry);
  while (buffers.size > 96) buffers.delete(buffers.keys().next().value);
  return entry.promise;
}

export async function preloadVoice(clips, stillCurrent = () => true) {
  for (const clip of clips.flat().filter(Boolean)) {
    if (!stillCurrent()) return;
    await loadClip(clip);
  }
}
export const clipDuration = (clip) => buffers.get(clip?.id)?.buffer?.duration ?? null;

export async function playVoice(clips, { urgent = false, teaching = false, wait = false, preview = false, expires = Infinity } = {}) {
  if ((!preview && !voiceEnabled()) || mutedByVideo || !context || context.state !== "running") {
    if (context && context.state !== "running") { voiceStatus.blocked = true; notify(); }
    return false;
  }
  const nextPriority = urgent ? 2 : teaching ? 0 : 1;
  if (speaking && priority > nextPriority) return false;
  cancelVoice();
  const token = generation;
  priority = nextPriority;
  let played = false;
  try {
    for (const clip of [clips].flat().filter(Boolean)) {
      const buffer = wait ? await loadClip(clip) : buffers.get(clip.id)?.buffer;
      if (!buffer || token !== generation || Date.now() > expires || mutedByVideo || (!preview && !voiceEnabled())) break;
      if (teaching && Date.now() + buffer.duration * 1000 > expires) break;
      speaking = true; notify();
      await new Promise((resolve) => {
        source = context.createBufferSource(); source.buffer = buffer;
        if (source.playbackRate) source.playbackRate.value = clip.rate || 1;
        source.connect(context.destination);
        finishSource = resolve;
        source.onended = resolve;
        source.start();
      });
      played = true;
      if (token !== generation) return played;
      source?.disconnect(); source = null; finishSource = null;
    }
  } catch {
    if (token === generation) { voiceStatus.blocked = true; voiceStatus.message = t("Audio playback stopped. Tap to enable audio again."); }
  } finally {
    if (token === generation) {
      source?.disconnect(); source = null; finishSource = null;
      speaking = false; priority = -1; notify();
    }
  }
  return played;
}
