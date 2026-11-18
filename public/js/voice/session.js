import { state } from "../store.js";
import { getItemLog } from "../components/logger.js";
import { PREPARING_VOICE, cacheVoice, cancelTeaching, cancelVoice, playVoice, preloadVoice, prepareVoice, refreshVoiceStatus, setVoicePreparing, videoVoice, voiceEnabled, voiceRequest, voiceStatus } from "./player.js";

export function createGuidedVoice(date, steps, statusEl) {
  let index = 0;
  let token = 0;
  let activity = 0;
  let manifest = null;
  let disposed = false;
  let timerOpen = false;
  let requestKey = "";
  const heard = new Set();
  const effortHeard = new Set();
  let lastBlock = "";
  const prepared = new Map();
  const stepKey = (step) => `${step.scope}:${step.item.id}`;
  const request = (step) => voiceRequest(step.item, step.level, getItemLog(date, step.scope, step.item.id) || {});
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
    manifest = null;
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
        }
      });
      await preloadVoice([...current.sets, current.clock.finish, ...current.how], valid);
      if (valid() && steps[index + 1]) {
        const next = await getManifest(steps[index + 1]);
        if (valid()) preloadVoice([next.next, ...next.intro, ...next.safety], valid);
      }
    } catch (err) { if (!disposed && stamp === token) { statusEl.textContent = err.message; voiceStatus.message = err.message; setVoicePreparing(false); } }
  }
  return {
    enter,
    changed() {
      const step = steps[index];
      if (step && requestKey && requestKey !== stepRequestKey(step)) enter(index);
    },
    input() { cancelTeaching(); },
    timer(value) { timerOpen = value; activity += 1; cancelVoice(); statusEl.textContent = ""; setVoicePreparing(false); },
    finish() { token += 1; cancelVoice(); statusEl.textContent = ""; setVoicePreparing(false); if (manifest) playVoice(manifest.clock.finish, { urgent: true }); },
    dispose() { disposed = true; token += 1; cancelVoice(); videoVoice(false); setVoicePreparing(false); },
  };
}
