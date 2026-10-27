// Workout timers: interval timer (20 s bursts, Norwegian 4×4), hold timer
// (planks, stretches), countdown for Zone 2 blocks, and a floating rest timer.
// Beeps with Web Audio, vibrates on phones, keeps the screen awake while running.

import { EXERCISES } from "../data/exercises.js";
import { intervalPhases } from "../data/routines.js";
import { createStagePanel } from "./stage-panel.js";
import { state } from "../store.js";
import { fmtSecs } from "../util.js";
import { icon } from "./icons.js";
import { openDialog } from "./ui.js";
import { clockKey } from "../voice/script.js";
import { cacheVoice, cancelVoice, playVoice, preloadVoice, prepareVoice, refreshVoiceStatus, setVoiceEnabled, unlockVoice, videoVoice, voiceEnabled, voiceStatus } from "../voice/player.js";

let audio = null;
export function beep(freq = 880, ms = 120, vol = 0.18) {
  if (state.profile && state.profile.settings && state.profile.settings.sound === false) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g).connect(audio.destination);
    const t = audio.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {
    /* sound is optional */
  }
}
const buzz = (p) => navigator.vibrate && navigator.vibrate(p);
const timerListeners = new Set();
export function onTimer(fn) { timerListeners.add(fn); return () => timerListeners.delete(fn); }

async function wake() {
  try {
    return navigator.wakeLock ? await navigator.wakeLock.request("screen") : null;
  } catch {
    return null;
  }
}

// The inline timer replaces the big dialog inside guided workouts.
let inlineCleanup = null;
export function stopInlineTimer() {
  const fn = inlineCleanup;
  inlineCleanup = null;
  if (fn) fn();
}

// phases: [{ kind: "work" | "rest" | "ready", label, sec, sub }]
function runPhases({ title, phases, onFinish, voiceContext, voiceTimer, host = null }) {
  if (host) stopInlineTimer();
  for (const fn of timerListeners) fn(true);
  stopRest();
  cancelVoice();
  videoVoice(false);
  unlockVoice();
  const R = 120;
  const C = 2 * Math.PI * R;
  let voiceOn = host ? false : voiceEnabled();
  let manifest = null;
  let started = false;
  let closed = false;
  const timerHtml = `<div class="timer${host ? " inline" : ""}" data-kind="ready">
        <div class="timer-ring"><svg viewBox="0 0 280 280"><circle class="bg" cx="140" cy="140" r="${R}"/><circle class="fg" cx="140" cy="140" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="timer-center"><span class="phase"></span><span class="big mono">0:00</span><span class="sub"></span></div></div>
        <div class="btn-row">
          <button class="btn primary" data-t="begin" hidden>Start without waiting</button>
          <button class="btn" data-t="pause" disabled>${icon("pause")} Pause</button>
          <button class="btn" data-t="skip" disabled>${icon("skip")} Next</button>
          ${host ? "" : `<button class="btn sm ghost" data-t="voice" aria-label="Toggle voice coach">${icon(voiceOn ? "volume" : "mute", "sm")} ${voiceOn ? "Voice on" : "Voice off"}</button>`}
          <button class="btn danger" data-t="stop">${icon("x")} Stop</button>
        </div>
        <p class="muted" data-t="info"></p>
      </div>`;
  let dialog = null;
  if (host) {
    host.innerHTML = timerHtml;
    host.scrollIntoView({ block: "nearest" });
    inlineCleanup = () => stop(false);
  } else {
    dialog = openDialog({ title, sheet: false, content: timerHtml, onClose: () => stop(false) });
  }
  const el = host ? host.querySelector(".timer") : dialog.el.querySelector(".timer");
  if (host && title) el.setAttribute("aria-label", title);
  const fg = el.querySelector(".fg");
  const phaseEl = el.querySelector(".phase");
  const big = el.querySelector(".big");
  const sub = el.querySelector(".sub");
  const info = el.querySelector('[data-t="info"]');
  let i = 0;
  let left = phases[0].sec;
  let paused = false;
  let timer = null;
  let lock = null;
  let lastWhole = null;
  let finished = false;
  let lastSpokenPhase = -1;
  const spoken = new Set();
  let lastTick = Date.now();
  const say = (clip) => voiceOn && playVoice(clip, { urgent: true });
  const isRoundEnd = (p) => p.kind === "work" && p.roundEnd !== false;
  const workDone = () => phases.slice(0, i).filter(isRoundEnd).length;
  const stageHost = document.createElement("div");
  let stage = null;
  if (!host && phases.some((p) => p.ex)) {
    stageHost.className = "interval-stage";
    el.prepend(stageHost);
    stage = createStagePanel(stageHost);
  }
  el.setAttribute("role", "timer");
  wake().then((l) => { if (closed) l?.release().catch(() => {}); else lock = l; });

  function show() {
    const p = phases[i];
    el.dataset.kind = p.kind;
    phaseEl.textContent = p.ex ? `${p.label}: ${EXERCISES[p.ex].name}` : p.label;
    big.textContent = fmtSecs(Math.ceil(left));
    sub.textContent = p.sub || "";
    fg.setAttribute("stroke-dashoffset", String(C * (1 - left / p.sec)));
    const totalWork = phases.filter(isRoundEnd).length;
    const currentWork = workDone() + (p.kind === "work" ? 1 : 0);
    info.textContent = p.total ? `Round ${p.round} of ${p.total}` : totalWork > 1 ? `Interval ${Math.min(currentWork, totalWork)} of ${totalWork}` : "";

    if (lastSpokenPhase !== i) {
      lastSpokenPhase = i;
      if (stage) stage.load(p.ex || phases.find((phase) => phase.ex).ex);
      spoken.clear();
      lastWhole = Math.ceil(left);
      if (started) say(manifest?.phases?.[i]);
    }
  }
  function next() {
    cancelVoice();
    i += 1;
    if (i >= phases.length) return finish();
    left = phases[i].sec;
    lastTick = Date.now();
    beep(phases[i].kind === "work" ? 1040 : 620, 320, 0.22);
    buzz(phases[i].kind === "work" ? [180, 80, 180] : 300);
    show();
  }
  function tick() {
    const now = Date.now();
    const elapsed = (now - lastTick) / 1000;
    lastTick = now;
    if (paused) return;
    left -= elapsed;
    const whole = Math.ceil(left);
    if (whole !== lastWhole && whole <= 3 && whole > 0) beep(780, 90);
    const p = phases[i];
    if (p) {
      const key = clockKey(p.sec, whole, p.kind);
      if (key && !spoken.has(key)) { spoken.add(key); say(manifest?.clock?.[key]); }
    }
    lastWhole = whole;
    if (left <= 0) next();
    else show();
  }
  function finish() {
    finished = true;
    clearInterval(timer);
    beep(1320, 500, 0.25);
    buzz([200, 100, 200, 100, 400]);
    cancelVoice();
    say(manifest?.clock?.done);
    el.dataset.kind = "done";
    phaseEl.textContent = "Done";
    big.textContent = "✓";
    sub.textContent = "";
    fg.setAttribute("stroke-dashoffset", "0");
    el.querySelector(".btn-row").innerHTML = `<button class="btn primary" data-t="close">${icon("check")} Log it</button>`;
    if (stage) { stage.dispose(); stage = null; }
    if (onFinish) onFinish(phases.filter(isRoundEnd).length);
  }
  function stop(close = true) {
    if (closed) return;
    closed = true;
    for (const fn of timerListeners) fn(false);
    clearInterval(timer);
    if (stage) { stage.dispose(); stage = null; }
    cancelVoice();
    if (lock) lock.release().catch(() => {});
    if (!finished && onFinish && workDone() > 0) onFinish(workDone(), true);
    finished = true;
    if (host) {
      inlineCleanup = null;
      el.remove();
    } else if (close) dialog.close();
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    if (b.dataset.t === "pause") {
      if (!started) return;
      paused = !paused;
      b.innerHTML = paused ? `${icon("play")} Resume` : `${icon("pause")} Pause`;
      if (stage) paused ? stage.pause() : stage.play();
      if (paused) cancelVoice();
    } else if (b.dataset.t === "voice") {
      setVoiceEnabled(!voiceEnabled());
      voiceOn = voiceEnabled();
      b.innerHTML = `${icon(voiceOn ? "volume" : "mute", "sm")} ${voiceOn ? "Voice on" : "Voice off"}`;
      if (voiceOn && !manifest) prepare();
      else if (!voiceOn) begin();
    } else if (b.dataset.t === "begin") begin();
    else if (b.dataset.t === "skip" && started) next();
    else if (b.dataset.t === "stop" || b.dataset.t === "close") stop(true);
  });
  function begin() {
    if (started || closed) return;
    started = true; lastTick = Date.now(); lastSpokenPhase = -1;
    const startBtn = el.querySelector('[data-t="begin"]');
    if (startBtn) startBtn.hidden = true;
    el.querySelector('[data-t="pause"]').disabled = false;
    el.querySelector('[data-t="skip"]').disabled = false;
    beep(660, 160); show(); timer = setInterval(tick, 100);
  }
  async function prepare() {
    try {
      // The inline timer is deliberately quiet: the guided voice keeps talking
      // and the compact controls have no voice switch.
      if (host || !voiceContext || state.profile?.settings?.voiceCoach !== true) return begin();
      if (!voiceStatus.installed || !voiceStatus.cacheEnabled) await refreshVoiceStatus();
      if (!voiceStatus.installed) {
        const button = el.querySelector('[data-t="voice"]');
        button.textContent = "Voice unavailable"; button.disabled = true;
        button.title = "Download the local voice in Settings → Voice coach.";
        return begin();
      }
      voiceOn = voiceEnabled();
      el.querySelector('[data-t="voice"]').innerHTML = `${icon(voiceOn ? "volume" : "mute", "sm")} ${voiceOn ? "Voice on" : "Voice off"}`;
      if (!voiceOn) return begin();
      cacheVoice();
      el.querySelector('[data-t="begin"]').hidden = started;
      info.textContent = "Preparing coach audio. You can start the timer while it loads.";
      manifest = await prepareVoice({ ...voiceContext, timer: voiceTimer });
      const keys = new Set(phases.flatMap((p) => Array.from({ length: p.sec }, (_, n) => clockKey(p.sec, n + 1, p.kind))).filter(Boolean));
      const essential = [manifest.phases[0], manifest.phases[1], ...[...keys].map((key) => manifest.clock[key]), manifest.clock.done];
      await preloadVoice(essential, () => !closed && voiceEnabled());
      if (!closed) { begin(); preloadVoice(manifest.phases.slice(2), () => !closed && voiceEnabled()); }
    } catch { if (!closed) begin(); }
  }
  prepare();
}

// Interval timer from a preset: { rounds, work, rest, blocks?, blockRest?, workHr?, restHr? }
export function startIntervals({ title, preset, hr, exId, moves, onFinish, voiceContext, presetIndex = 0, host = null }) {
  const phases = intervalPhases(exId, preset, moves);
  for (const phase of phases) {
    if (phase.kind === "work" && hr?.work) phase.sub = `Aim for ${hr.work}`;
    else if (phase.kind === "rest" && hr?.rest) phase.sub += ` · ${hr.rest}`;
  }
  runPhases({ title, phases, onFinish, voiceContext, voiceTimer: { type: "intervals", preset: presetIndex, moves }, host });
}

// Hold timer: seconds per side, optionally both sides with a short switch.
export function startHold({ title, seconds, sides = 1, onFinish, voiceContext, host = null }) {
  const phases = [{ kind: "ready", label: "Get set", sec: 5 }];
  for (let s = 0; s < sides; s++) {
    phases.push({ kind: "work", label: sides > 1 ? (s === 0 ? "First side" : "Other side") : "Hold", sec: seconds, sub: "Breathe slowly" });
    if (s < sides - 1) phases.push({ kind: "rest", label: "Switch", sec: 5 });
  }
  runPhases({ title, phases, onFinish, voiceContext, voiceTimer: { type: "hold", seconds, sides }, host });
}

export function startCountdown({ title, minutes, sub, onFinish, voiceContext, host = null }) {
  runPhases({ title, phases: [{ kind: "ready", label: "Get ready", sec: 5 }, { kind: "work", label: "Go", sec: Math.round(minutes * 60), sub }], onFinish, voiceContext, voiceTimer: { type: "countdown", minutes }, host });
}

// Floating rest timer after a set. Tap it to dismiss.
let restEl = null;
let restTimer = null;
const restListeners = new Set();
let restContext = null;
export function onRest(fn) { restListeners.add(fn); return () => restListeners.delete(fn); }
function restEvent(type, left, total) { for (const fn of restListeners) fn({ type, left, total, context: restContext }); }
export function startRest(seconds, context = null) {
  stopRest();
  restContext = context;
  let left = seconds;
  let total = seconds;
  let lastTick = Date.now();
  restEl = document.createElement("div");
  restEl.className = "rest-pill";
  restEl.setAttribute("role", "timer");
  restEl.innerHTML = `${icon("timer")}<span>Rest</span><b class="mono">${fmtSecs(left)}</b><button class="btn sm" data-r="add">+15 s</button><button class="btn sm icon-only" data-r="x" aria-label="Dismiss rest timer">${icon("x", "sm")}</button>`;
  document.body.appendChild(restEl);
  const out = restEl.querySelector("b");
  restEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    if (b.dataset.r === "add") { left += 15; total += 15; restEvent("extend", Math.ceil(left), total); }
    else stopRest();
  });
  restEvent("start", left, total);
  let lastWhole = Math.ceil(left);
  restTimer = setInterval(() => {
    const now = Date.now(); left -= (now - lastTick) / 1000; lastTick = now;
    const whole = Math.ceil(left);
    if (whole === lastWhole) return;
    lastWhole = whole;
    restEvent("tick", whole, total);
    if (whole <= 3 && whole > 0) beep(780, 90);
    if (left <= 0) {
      beep(1040, 350, 0.22);
      buzz([150, 80, 150]);
      restEvent("end", 0, total);
      stopRest(false);
      return;
    }
    out.textContent = fmtSecs(whole);
  }, 100);
}
export function stopRest(notify = true) {
  clearInterval(restTimer);
  if (restEl && notify) restEvent("stop", 0, 0);
  if (restEl) restEl.remove();
  restEl = null;
  restContext = null;
}

