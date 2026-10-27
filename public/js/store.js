// App state and persistence.
//
// With the local server (`npm start`) everything is written to ./data as JSON files.
// If the server isn't there (e.g. the files are served by a static host), the app
// falls back to this browser's localStorage and says so in Settings.
// Every change saves itself shortly after you stop typing — there is no Save button.
// If a save fails (server stopped, laptop asleep), the change is parked in
// localStorage and retried until it gets through.

import { migrateProfile } from "./personalize.js";

const LS = { profile: "hp:profile", days: "hp:days", pending: "hp:pending", theme: "hp:theme", version: "hp:version" };
const SAVE_DELAY = 600;

export const state = {
  ready: false,
  mode: "server", // "server" | "local"
  dataDir: "data",
  version: lsGet("hp:version", null),
  profile: null,
  days: {},
  saveStatus: "idle", // idle | pending | saving | saved | offline
  lastSaved: null,
};

const listeners = new Set();
const statusListeners = new Set();
const timers = new Map(); // key → debounce timer
const versions = new Map(); // key → edit counter; only a save of the latest version clears it
let retryTimer = null;

function lsGet(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
}
function lsSet(k, v) {
  try {
    if (v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function onStatus(fn) {
  statusListeners.add(fn);
  fn(state.saveStatus);
  return () => statusListeners.delete(fn);
}
function emit(evt) {
  for (const fn of listeners) fn(evt);
}
function setStatus(s) {
  state.saveStatus = s;
  if (s === "saved") state.lastSaved = new Date();
  for (const fn of statusListeners) fn(s);
}

// ---------- boot ----------

export async function init() {
  try {
    const res = await fetch("/api/info", { cache: "no-store" });
    const info = res.ok ? await res.json() : null;
    if (!info || info.storage !== "server") throw new Error("no server");
    state.mode = "server";
    state.dataDir = info.dataDir;
    state.version = info.version;
    lsSet(LS.version, info.version);
    const [p, d] = await Promise.all([fetch("/api/profile", { cache: "no-store" }), fetch("/api/days", { cache: "no-store" })]);
    state.profile = p.ok ? await p.json() : null;
    state.days = d.ok ? await d.json() : {};
    // Changes parked in the browser while the server was unreachable go out now.
    const parked = lsGet(LS.pending, null);
    if (parked) {
      if (parked.profile) {
        state.profile = parked.profile;
        touch("profile");
      }
      for (const [date, day] of Object.entries(parked.days || {})) {
        state.days[date] = day;
        touch("day:" + date);
      }
      flushNow();
    }
  } catch {
    state.mode = "local";
    state.profile = lsGet(LS.profile, null);
    state.days = lsGet(LS.days, {});
  }
  if (migrateProfile(state.profile, state.days)) schedule("profile", 0);
  state.ready = true;
  window.addEventListener("online", () => flushNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow(true);
  });
  window.addEventListener("pagehide", () => flushNow(true));
}

// ---------- saving ----------

function touch(key) {
  versions.set(key, (versions.get(key) || 0) + 1);
}

function schedule(key, delay = SAVE_DELAY) {
  touch(key);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => save(key), delay));
  setStatus("pending");
}

function parkUnsaved() {
  if (state.mode !== "server") return;
  const parked = { profile: null, days: {} };
  for (const key of versions.keys()) {
    if (key === "profile") parked.profile = state.profile;
    else parked.days[key.slice(4)] = state.days[key.slice(4)] ?? null;
  }
  lsSet(LS.pending, versions.size ? parked : undefined);
}

async function save(key, keepalive = false) {
  clearTimeout(timers.get(key));
  timers.delete(key);
  const version = versions.get(key);
  if (version == null) return;

  if (state.mode === "local") {
    lsSet(LS.profile, state.profile);
    lsSet(LS.days, state.days);
    versions.delete(key);
    setStatus("saved");
    return;
  }

  const isProfile = key === "profile";
  const date = isProfile ? null : key.slice(4);
  const url = isProfile ? "/api/profile" : `/api/days/${date}`;
  const body = isProfile ? state.profile : state.days[date];
  setStatus("saving");
  try {
    const res =
      body == null
        ? await fetch(url, { method: "DELETE", keepalive })
        : await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });
    if (!res.ok) throw new Error("HTTP " + res.status);
    if (versions.get(key) === version) versions.delete(key);
    parkUnsaved();
    setStatus(versions.size ? "pending" : "saved");
  } catch {
    parkUnsaved();
    setStatus("offline");
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => flushNow(), 5000);
  }
}

export function flushNow(keepalive = false) {
  for (const key of [...versions.keys()]) save(key, keepalive);
}

export function hasUnsaved() {
  return versions.size > 0;
}

// ---------- profile ----------

export function setProfile(p, { silent = false } = {}) {
  state.profile = p;
  if (p && p.settings && p.settings.theme) lsSet(LS.theme, p.settings.theme);
  schedule("profile", 300);
  if (!silent) emit({ type: "profile" });
}

export function updateProfile(fn, opts) {
  const p = structuredClone(state.profile || {});
  fn(p);
  setProfile(p, opts);
}

// ---------- days ----------

export function newDay(date) {
  return {
    date,
    session: null, // program day key actually done (null = the weekday's own session)
    level: null, // training level id frozen when you first log the day (older days have phase 0–2 instead)
    status: null, // "done" | "partial" | "skipped" | null
    skip: null, // { reason, note }
    items: {}, // item id → { done, sets: [{ reps, kg, sec }], cardio: { min, avg, max }, rounds, peak, note }
    addons: {}, // add-on id → { skipped, items: {...}, metrics: {...}, periodic: {...} }
    rpe: null,
    energy: null,
    notes: "",
    extras: [], // [{ id, type, min, avg, note }]
    bodyWeightKg: null,
  };
}

export function getDay(date) {
  return state.days[date] || null;
}

export function updateDay(date, fn, { delay } = {}) {
  const day = state.days[date] ? state.days[date] : newDay(date);
  fn(day);
  day.updatedAt = new Date().toISOString();
  state.days[date] = day;
  schedule("day:" + date, delay);
  emit({ type: "day", date });
  return day;
}

export function deleteDay(date) {
  delete state.days[date];
  schedule("day:" + date, 0);
  emit({ type: "day", date });
}

// ---------- export / import / reset ----------

export function exportAll() {
  return { app: "bryan-johnson-workout-website", version: 1, exportedAt: new Date().toISOString(), profile: state.profile, days: state.days };
}

export async function importAll(payload, mode = "merge") {
  if (!payload || typeof payload !== "object") throw new Error("This file isn't a workout backup.");
  const days = payload.days && typeof payload.days === "object" ? payload.days : {};
  if (state.mode === "server") {
    const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, profile: payload.profile, days }) });
    if (!res.ok) throw new Error("Import failed (HTTP " + res.status + ")");
  }
  if (mode === "replace") state.days = {};
  if (payload.profile) state.profile = payload.profile;
  Object.assign(state.days, days);
  if (migrateProfile(state.profile, state.days) && state.mode === "server") schedule("profile", 0);
  if (state.mode === "local") {
    lsSet(LS.profile, state.profile);
    lsSet(LS.days, state.days);
  }
  emit({ type: "all" });
}

// Clears every logged day, keeping the profile, settings, equipment and add-ons.
export async function resetDays() {
  if (state.mode === "server") {
    const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "replace", days: {} }) });
    if (!res.ok) throw new Error("Reset failed (HTTP " + res.status + ")");
  }
  for (const key of [...versions.keys()]) {
    if (!key.startsWith("day:")) continue;
    clearTimeout(timers.get(key));
    timers.delete(key);
    versions.delete(key);
  }
  state.days = {};
  if (state.mode === "local") {
    lsSet(LS.days, {});
    const parked = lsGet(LS.pending, null);
    if (parked) {
      parked.days = {};
      lsSet(LS.pending, parked.profile ? parked : undefined);
    }
  } else parkUnsaved();
  emit({ type: "all" });
}

export async function resetAll() {
  if (state.mode === "server") {
    await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "replace", days: {} }) });
    await fetch("/api/profile", { method: "DELETE" });
  }
  lsSet(LS.profile, undefined);
  lsSet(LS.days, undefined);
  lsSet(LS.pending, undefined);
  versions.clear();
  state.profile = null;
  state.days = {};
  emit({ type: "all" });
}
