import { state } from "../store.js";
import { getItemLog } from "../components/logger.js";
import { PREPARING_VOICE, cacheVoice, cancelTeaching, cancelVoice, clipDuration, playVoice, preloadVoice, prepareVoice, refreshVoiceStatus, setVoicePreparing, videoVoice, voiceEnabled, voiceRequest, voiceStatus } from "./player.js";

export function createGuidedVoice(date, steps, statusEl) {
  let index = 0;
  let token = 0;
  let activity = 0;
  let manifest = null;
  let nextManifest = null;
  let disposed = false;
  let timerOpen = false;
  let lastInput = 0;
  let rest = null;
  let requestKey = "";
  const heard = new Set();
  const effortHeard = new Set();
  let lastBlock = "";
  const teachingAt = new Map();
  const prepared = new Map();
  const stepKey = (step) => `${step.scope}:${step.item.id}`;
  const request = (step) => voiceRequest(step.item, step.level, getItemLog(date, step.scope, step.item.id) || {}, step.item.id === "fri-strength-rdl" && step.level === 3 ? 25 : state.profile?.settings?.restSec || 75);
  const stepRequestKey = (step) => JSON.stringify([request(step), state.profile?.settings?.coachVoice, state.profile?.settings?.coachPace]);
  function getManifest(step) {
    const body = request(step);
    const key = JSON.stringify([body, state.profile?.settings?.coachVoice, state.profile?.settings?.coachPace]);
    if (!prepared.has(key)) prepared.set(key, prepareVoice(body).catch((err) => { prepared.delete(key); throw err; }));
    return prepared.get(key);
  }
  async function enter(nextIndex, reason = "next") {
    index = nextIndex;
    const stamp = ++token;
    const enteredAt = ++activity;
    manifest = null; nextManifest = null; rest = null;
    cancelVoice(); videoVoice(false);
    if (!steps[index] || !voiceEnabled()) { statusEl.textContent = ""; setVoicePreparing(false); return; }
    statusEl.textContent = PREPARING_VOICE;
    setVoicePreparing(true);
    requestKey = stepRequestKey(steps[index]);
    try {
      if (!voiceStatus.installed) await refreshVoiceStatus();
      if (disposed || stamp !== token || !voiceEnabled()) return;
      if (!voiceStatus.installed) { statusEl.textContent = ""; setVoicePreparing(false); return; }
      cacheVoice();
      const current = await getManifest(steps[index]);
      if (disposed || stamp !== token) return;
      manifest = current;
      const step = steps[index];
      const key = stepKey(step);
      const repeated = heard.has(key);
      const intro = reason === "back" ? [current.back] : repeated && step.setIndex != null ? [current.sets[step.setIndex]] : current.intro;
      const block = `${step.scope}:${step.block}`;
      const lines = [...(lastBlock !== block ? [current.block] : []), ...intro, ...current.safety, ...(!effortHeard.has(block) ? [current.effort] : []), ...(!repeated && !current.safety.length ? current.how.slice(0, 1) : [])];
      const valid = () => !disposed && stamp === token && voiceEnabled();
      await preloadVoice(lines, valid);
      if (!valid()) return;
      statusEl.textContent = "";
      setVoicePreparing(false);
      if (enteredAt === activity && !timerOpen) playVoice(lines).then((played) => {
        if (played && valid()) {
          heard.add(key);
          lastBlock = block;
          if (current.effort) effortHeard.add(block);
          if (!repeated && !current.safety.length) teachingAt.set(key, 1);
        }
      });
      await preloadVoice([current.clock.ten, current.clock.restEnd, current.rest, ...current.sets, current.clock.finish, ...current.how], valid);
      if (valid() && steps[index + 1]) {
        const next = await getManifest(steps[index + 1]);
        if (valid()) { nextManifest = next; preloadVoice([next.next, ...next.intro, ...next.safety], valid); }
      }
    } catch (err) { if (!disposed && stamp === token) { statusEl.textContent = err.message; voiceStatus.message = err.message; setVoicePreparing(false); } }
  }
  return {
    enter,
    changed() {
      const step = steps[index];
      if (step && requestKey && requestKey !== stepRequestKey(step)) enter(index);
    },
    input() { lastInput = Date.now(); cancelTeaching(); },
    timer(value) { timerOpen = value; activity += 1; cancelVoice(); statusEl.textContent = ""; setVoicePreparing(false); },
    rest(event) {
      const step = steps[index];
      if (!step || !manifest || timerOpen || event.context?.itemId !== step.item.id || event.context.scope !== step.scope) return;
      if (event.type === "start") {
        activity += 1;
        cancelVoice();
        rest = { spoken: false, preview: false, setIndex: event.context.setIndex, ten: false, busy: false };
        playVoice(manifest.rest, { urgent: true });
      } else if (event.type === "stop") { rest = null; cancelVoice(); }
      else if (event.type === "extend" && rest && event.left > 10) rest.ten = false;
      else if (event.type === "end") {
        cancelVoice();
        const nextSet = step.setIndex == null ? manifest.sets[(rest?.setIndex ?? 0) + 1] : null;
        playVoice(nextSet || manifest.clock.restEnd, { urgent: true });
        rest = null;
      } else if (event.type === "tick" && rest) {
        if (event.left === 10 && event.total >= 30 && !rest.ten) { rest.ten = true; playVoice(manifest.clock.ten, { urgent: true }); }
        if (event.left <= 10) return;
        if (event.total - event.left < 5 || Date.now() - lastInput < 2000 || state.profile?.settings?.coachDetail === "cues") return;
        const key = stepKey(step);
        const cursor = teachingAt.get(key) || 0;
        const line = manifest.how[cursor];
        const duration = clipDuration(line);
        if (!rest.spoken && duration != null && duration + 2 < event.left - 10) {
          const activeRest = rest;
          rest.spoken = true;
          rest.busy = true;
          playVoice(line, { teaching: true, expires: Date.now() + (event.left - 10) * 1000 }).then((played) => { activeRest.busy = false; activeRest.spoken = played; if (played) teachingAt.set(key, cursor + 1); });
        }
        const preview = nextManifest?.next;
        const previewDuration = clipDuration(preview);
        if (!rest.busy && !rest.preview && manifest.setCount && rest.setIndex === manifest.setCount - 1 && previewDuration != null && previewDuration + 2 < event.left - 10) {
          rest.preview = true;
          playVoice(preview, { teaching: true, expires: Date.now() + (event.left - 10) * 1000 });
        }
      }
    },
    finish() { token += 1; cancelVoice(); rest = null; statusEl.textContent = ""; setVoicePreparing(false); if (manifest) playVoice(manifest.clock.finish, { urgent: true }); },
    dispose() { disposed = true; token += 1; cancelVoice(); videoVoice(false); setVoicePreparing(false); },
  };
}
