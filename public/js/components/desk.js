// Desk mode: Bryan's posture habits for long sitting days — stand and move for
// 2–3 minutes every 30 minutes, and do 10 squats every 45 minutes.
//
// The countdown lives in this tab and is remembered across reloads. Only the
// breaks you tap are written to the day log; nothing here counts as training.

import { state } from "../store.js";
import { addonsForDate } from "../plan.js";
import { addDays, fmtSecs, todayIso } from "../util.js";
import { toast } from "./ui.js";
import { beep } from "./timer.js";

const LS_KEY = "hp:desk";
const MOVE_MS = 30 * 60 * 1000;
const SQUAT_MS = 45 * 60 * 1000;

const listeners = new Set();
let loaded = false;
let ticker = null;
let pausedAt = 0;
const desk = { running: false, startedAt: 0, nextMoveAt: 0, nextSquatAt: 0, due: new Set(), notified: new Set(), pauses: new Set() };

function save() {
  if (typeof window === "undefined") return;
  try {
    if (!desk.running) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify({ running: true, startedAt: desk.startedAt, nextMoveAt: desk.nextMoveAt, nextSquatAt: desk.nextSquatAt }));
  } catch {}
}

function load() {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const kept = JSON.parse(raw);
    if (!kept || !kept.running) return;
    desk.running = true;
    desk.startedAt = Number(kept.startedAt) || Date.now();
    desk.nextMoveAt = Number(kept.nextMoveAt) || Date.now() + MOVE_MS;
    desk.nextSquatAt = Number(kept.nextSquatAt) || Date.now() + SQUAT_MS;
    startTicker();
  } catch {}
}

function emit() {
  for (const fn of listeners) fn();
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 1000);
}

// The desk card can be set to repeat every few days. Stop the countdown when
// today is not a desk day, so reminders do not keep running while the card is
// hidden. Checked once a minute rather than every second.
let scheduleChecked = 0;
let scheduleOn = true;
function deskScheduled() {
  const now = Date.now();
  if (now - scheduleChecked < 60000) return scheduleOn;
  scheduleChecked = now;
  scheduleOn = addonsForDate(todayIso()).some((a) => a.addon.id === "desk");
  return scheduleOn;
}

// Optional system notification while the app tab is in the background. Off
// until it is turned on in Settings.
function notify(kind) {
  const settings = state.profile && state.profile.settings;
  if (!settings || !settings.deskNotify) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(kind === "move" ? "Desk break: stand and move" : "Desk break: 10 squats", {
      body: kind === "move" ? "Get up for 2–3 minutes, as Bryan does at his desk." : "Do 10 squats, then back to work.",
      tag: `hp-desk-${kind}`,
    });
  } catch {
    /* notifications are optional */
  }
}

function tick() {
  if (!desk.running || desk.pauses.size) return;
  if (!deskScheduled()) {
    stopDesk();
    return;
  }
  const now = Date.now();
  let changed = false;
  for (const [kind, key, wait] of [["move", "nextMoveAt", MOVE_MS], ["squats", "nextSquatAt", SQUAT_MS]]) {
    if (now < desk[key]) continue;
    if (!desk.due.has(kind)) {
      desk.due.add(kind);
      changed = true;
      if (!desk.notified.has(kind)) {
        desk.notified.add(kind);
        toast(kind === "move" ? "Time to stand up and move for 2–3 minutes" : "Time for 10 squats", { icon: "timer", ms: 6000 });
        beep(kind === "move" ? 780 : 880, 250, 0.2);
        notify(kind);
      }
    }
    desk[key] = now + wait;
  }
  if (changed) save();
  // Keep the visible countdown moving; the view updates text in place.
  emit();
}

export function deskState() {
  load();
  const paused = desk.pauses.size > 0;
  const now = paused && pausedAt ? pausedAt : Date.now();
  return {
    running: desk.running,
    paused,
    due: [...desk.due],
    nextMoveIn: desk.running ? Math.max(0, Math.round((desk.nextMoveAt - now) / 1000)) : 0,
    nextSquatIn: desk.running ? Math.max(0, Math.round((desk.nextSquatAt - now) / 1000)) : 0,
    nextMoveInText: fmtSecs(desk.running ? Math.max(0, Math.round((desk.nextMoveAt - now) / 1000)) : 0),
    nextSquatInText: fmtSecs(desk.running ? Math.max(0, Math.round((desk.nextSquatAt - now) / 1000)) : 0),
  };
}

export function startDesk() {
  load();
  scheduleChecked = 0;
  desk.running = true;
  desk.startedAt = Date.now();
  desk.nextMoveAt = Date.now() + MOVE_MS;
  desk.nextSquatAt = Date.now() + SQUAT_MS;
  desk.due.clear();
  desk.notified.clear();
  if (desk.pauses.size) pausedAt = Date.now();
  save();
  startTicker();
  emit();
}

export function stopDesk() {
  desk.running = false;
  desk.due.clear();
  desk.notified.clear();
  desk.pauses.clear();
  pausedAt = 0;
  clearInterval(ticker);
  ticker = null;
  save();
  emit();
}

// The user tapped "Done" on a due break: clear it and start the next countdown.
export function doneDesk(kind) {
  const key = kind === "move" ? "nextMoveAt" : "nextSquatAt";
  desk.due.delete(kind);
  desk.notified.delete(kind);
  if (desk.running) desk[key] = Date.now() + (kind === "move" ? MOVE_MS : SQUAT_MS);
  save();
  emit();
}

// "Not now, 5 minutes": hide the due nudge and come back, without logging a
// break. Only Done writes to the day log, so the counts stay honest.
export function snoozeDesk(kind, minutes = 5) {
  const key = kind === "move" ? "nextMoveAt" : "nextSquatAt";
  desk.due.delete(kind);
  desk.notified.delete(kind);
  if (desk.running) desk[key] = Date.now() + minutes * 60 * 1000;
  save();
  emit();
}

// Pause the countdowns while a workout is under way (guided mode, or a session
// in progress). Reasons stack so one can end without the others.
export function pauseDesk(reason) {
  load();
  if (desk.pauses.has(reason)) return;
  desk.pauses.add(reason);
  if (!pausedAt) pausedAt = Date.now();
  emit();
}

export function resumeDesk(reason) {
  load();
  if (!desk.pauses.delete(reason)) return;
  if (!desk.pauses.size && pausedAt) {
    const delta = Date.now() - pausedAt;
    if (desk.running) {
      desk.nextMoveAt += delta;
      desk.nextSquatAt += delta;
    }
    pausedAt = 0;
    save();
  }
  emit();
}

export function subscribeDesk(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Consecutive days with at least one logged desk break, starting yesterday if
// today has none yet so the streak does not read zero before the first break.
export function deskStreak(today = todayIso()) {
  const hasBreaks = (date) => {
    const d = state.days[date] && state.days[date].desk;
    return !!(d && ((d.move || 0) > 0 || (d.squats || 0) > 0));
  };
  let date = today;
  if (!hasBreaks(date)) date = addDays(date, -1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (!hasBreaks(date)) break;
    n += 1;
    date = addDays(date, -1);
  }
  return n;
}
