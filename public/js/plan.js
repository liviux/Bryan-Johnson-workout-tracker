import { localized } from "./i18n.js";
// Program logic: which session belongs to a date, which training level's doses a
// day uses, completion status, add-ons for the day, and the numbers behind the stats pages.

import { DAYS, LEVEL_PLANS } from "./data/program.js";
import { EXERCISES } from "./data/exercises.js";
import { ADDONS } from "./data/addons/index.js";
import { state, updateDay } from "./store.js";
import { LEVELS, levelIndex } from "./personalize.js";
import { addDays, daysBetween, normalizeDigits, todayIso, weekdayKey } from "./util.js";

const scheduledItems = [...DAYS.flatMap((d) => d.blocks.flatMap((b) => b.items)), ...ADDONS.flatMap((a) => Object.values(a.variants).flatMap((v) => v.items))];
const itemsById = new Map(scheduledItems.map((item) => [item.id, item]));

// Read old group logs in place; a child's own log always takes precedence.
export function itemLog(log, scope, id) {
  const bag = scope === "main" ? log?.items : log?.addons?.[scope]?.items;
  if (bag?.[id]) return bag[id];
  const item = itemsById.get(id);
  const old = item?.legacyId && bag?.[item.legacyId];
  if (!old || (item.id === "fri-strength-rdl-jumps" && old.splitMovements)) return null;
  if (item.legacyEx === "dynamic" || item.id === "fri-strength-rdl-jumps") return { ex: item.ex, done: old.done, skipped: old.skipped, note: old.note, easier: old.easier, holdProgress: old.holdProgress };
  if (item.legacyEx === "tibraise" && old.sets) return { ...old, ex: item.ex, sets: item.ex === "tibdouble" ? old.sets.slice(0, 1) : old.sets.slice(1) };
  if (item.legacyEx === "deadhang" && old.sets) return { ...old, ex: item.ex, sets: old.sets.filter((_, i) => i % 2 === (item.ex === "hangpassive" ? 0 : 1)) };
  return { ...old, ex: item.ex };
}

export function loggedExerciseId(log, id, entry) {
  if (entry.ex && !EXERCISES[entry.ex]?.hidden) return entry.ex;
  const level = logLevel(log) ?? levelIndex(state.profile);
  const def = dayDef(log.session || weekdayKey(log.date));
  const candidates = [...(def?.blocks.flatMap((b) => b.items) || []), ...scheduledItems.filter((it) => !it.id.match(/^(mon|tue|wed|thu|fri|sat)-/))];
  const item = candidates.find((it) => (it.id === id || it.legacyId === id) && visible(it, level));
  const bags = [log.items, ...Object.values(log.addons || {}).map((addon) => addon?.items)];
  if (item?.legacyId === id && bags.some((bag) => bag?.[item.id])) return null;
  return item?.ex || entry.ex;
}

export const dayDef = (key) => DAYS.find((d) => d.key === key) || null;
export const isRestKey = (key) => {
  const d = dayDef(key);
  return !d || d.blocks.length === 0;
};
// Doses (rx, mins, timer) are arrays per training level: [new, returning, active,
// trained]. Arrays with three entries (custom add-ons written for the old phases)
// start at Returning, so New to training gets their first entry.
export function dose(arr, lvl) {
  if (!Array.isArray(arr)) return arr;
  return arr.length >= LEVELS.length ? arr[lvl] : arr[Math.max(0, lvl - 1)];
}
export const rxFor = (item, lvl) => dose(item.rx, lvl);
export const visible = (item, lvl) => {
  const rx = rxFor(item, lvl);
  return !!rx && rx !== "—";
};
export const countable = (item) => (EXERCISES[item.ex] || {}).log !== "none";
export const blockMins = (b, lvl) => dose(b.mins, lvl) || 0;
export const timerPresets = (item, lvl) => (item.timer && dose(item.timer, lvl)) || [];

export function blockItems(block, lvl) {
  return block.items.filter((it) => visible(it, lvl));
}

export function dayMins(def, lvl) {
  if (!def) return 0;
  return def.blocks.reduce((a, b) => a + (blockItems(b, lvl).length ? blockMins(b, lvl) : 0), 0);
}

export function sessionItems(def, lvl) {
  if (!def) return [];
  return def.blocks.flatMap((b) => blockItems(b, lvl)).filter(countable);
}

export function sessionKeyFor(date) {
  const log = state.days[date];
  return (log && log.session) || weekdayKey(date);
}

// ---------- level and progress ----------

// The level a logged day was done at: frozen as a level id when first logged;
// days from before levels replaced phases store phase 0–2 (= Returning…Well trained).
export function logLevel(log) {
  if (!log) return null;
  if (log.level != null) {
    const i = LEVELS.findIndex((l) => l.id === log.level);
    if (i >= 0) return i;
  }
  if (log.phase != null) return Math.min(LEVELS.length - 1, Number(log.phase) + 1);
  return null;
}

// Doses for a date: the level it was logged at, otherwise your current level.
export function levelFor(date) {
  return logLevel(state.days[date]) ?? levelIndex(state.profile);
}

export function progressOf(log) {
  if (!log) return { done: 0, total: 0 };
  const def = dayDef(log.session || weekdayKey(log.date));
  const items = sessionItems(def, logLevel(log) ?? levelIndex(state.profile));
  return { done: items.filter((it) => itemLog(log, "main", it.id)?.done).length, total: items.length };
}

export function computeStatus(log) {
  if (log.skip) return "skipped";
  const { done, total } = progressOf(log);
  if (!total) return null;
  if (done === total) return "done";
  return done > 0 ? "partial" : null;
}

// A day counts as a completed session when it is done, or at least half done.
export function countsAsSession(log) {
  if (!log || log.skip) return false;
  if (log.status === "done") return true;
  if (log.status !== "partial") return false;
  const { done, total } = progressOf(log);
  return total > 0 && done / total >= 0.5;
}

// Completed sessions, all of them or only those done at one level.
export function sessionsDone(lvl = null) {
  let n = 0;
  for (const log of Object.values(state.days)) {
    if (lvl != null && logLevel(log) !== lvl) continue;
    if (countsAsSession(log)) n += 1;
  }
  return n;
}

// ---------- level readiness ----------

// The plan's own move-up checkpoints for the current level, plus the answers the
// user has ticked so far. Nothing changes level by itself.
export function currentReadiness() {
  const i = levelIndex(state.profile);
  const plan = LEVEL_PLANS[i];
  const r = plan && plan.readiness;
  if (!r) return null;
  const sessions = sessionsDone(i);
  const saved = state.profile && state.profile.levelCheck && state.profile.levelCheck.level === plan.id ? state.profile.levelCheck : null;
  const checks = {};
  for (const q of r.questions) checks[q.id] = !!(saved && saved.checks && saved.checks[q.id]);
  const allChecked = r.questions.every((q) => checks[q.id]);
  return { levelIndex: i, plan, sessions, target: r.sessions, weeks: r.weeks, next: r.next, questions: r.questions, checks, allChecked, ready: allChecked && sessions >= r.sessions };
}

// The most recent day that counts as a completed session.
export function lastSessionDate() {
  const dates = Object.keys(state.days).filter((d) => countsAsSession(state.days[d])).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

// Every edit to a day goes through here: freezes the level on first touch and
// keeps the status in sync.
export function editDay(date, fn, opts) {
  return updateDay(
    date,
    (d) => {
      if (logLevel(d) == null) d.level = LEVELS[levelIndex(state.profile)].id;
      fn(d);
      d.status = computeStatus(d);
    },
    opts
  );
}

// ---------- add-ons ----------

export const ADDON_EVERY_MAX = 7;

// The schedule a user picks in Settings, or null to keep the add-on's built-in
// weekday table. Every add-on is saved under its own id.
export function addonSchedule(addon) {
  const saved = state.profile && state.profile.addonSchedules && state.profile.addonSchedules[addon.id];
  if (!saved) return null;
  const rawEvery = Math.round(Number(saved.every));
  const every = Math.min(ADDON_EVERY_MAX, Math.max(2, Number.isFinite(rawEvery) && rawEvery > 1 ? rawEvery : 2));
  return {
    mode: saved.mode === "every" && Number.isFinite(rawEvery) && rawEvery > 1 ? "every" : "daily",
    every,
    sunday: saved.sunday !== false,
    since: saved.since || null,
  };
}

// The variant an add-on uses on a date. Posture, for example, switches to its
// strength block on Wednesday and Saturday.
function addonEntryFor(addon, date) {
  const v = addon.schedule[weekdayKey(date)];
  const variantKey = v && v !== "optional" && addon.variants[v] ? v : Object.keys(addon.variants)[0];
  return { addon, variantKey, variant: addon.variants[variantKey], optional: v === "optional" };
}

export function addonRunsOn(addon, date) {
  const schedule = addonSchedule(addon);
  if (!schedule) return true;
  if (weekdayKey(date) === "sun" && !schedule.sunday) return false;
  if (schedule.mode === "daily") return true;
  const since = schedule.since || (state.profile && state.profile.startDate);
  if (!since) return true;
  const offset = daysBetween(since, date);
  return offset >= 0 && offset % schedule.every === 0;
}

export function addonsForDate(date) {
  const p = state.profile || {};
  const enabled = p.addons || {};
  const wk = weekdayKey(date);
  return ADDONS.filter((a) => enabled[a.id])
    .map((a) => {
      const custom = addonSchedule(a);
      if (custom && !addonRunsOn(a, date)) return null;
      if (!custom && !a.schedule[wk]) return null;
      return addonEntryFor(a, date);
    })
    .filter(Boolean);
}

export function addonProgress(log, entry, lvl) {
  const items = entry.variant.items.filter((it) => visible(it, lvl)).filter(countable);
  const a = (log && log.addons && log.addons[entry.addon.id]) || {};
  const done = items.filter((it) => itemLog(log, entry.addon.id, it.id)?.done).length;
  return { done, total: items.length, skipped: !!a.skipped };
}

// ---------- stats ----------

const firstNumber = (s) => {
  const m = /(\d+(?:\.\d+)?)/.exec(normalizeDigits(s) || "");
  return m ? Number(m[1]) : 0;
};

// Minutes of Zone 2, hard intervals and extra activity logged on one day.
export function dayLoad(log) {
  const out = { zone2: 0, hard: 0, extra: 0 };
  if (!log || log.skip) return out;
  const def = dayDef(log.session || weekdayKey(log.date));
  const lvl = logLevel(log) ?? levelIndex(state.profile);
  if (def) {
    for (const b of def.blocks) {
      for (const it of blockItems(b, lvl)) {
        const l = log.items[it.id];
        if (!l) continue;
        if (EXERCISES[it.ex]?.log === "cardio" && it.intensity !== "light") {
          const min = l.cardio?.min;
          out[EXERCISES[it.ex].intensity || "zone2"] += min != null ? Number(min) : (l.done ? firstNumber(rxFor(it, lvl)) : 0);
        } else if (it.timer) {
          const presets = timerPresets(it, lvl);
          const preset = presets[l.preset || 0] || presets[0];
          const rounds = Number(l.rounds) || (l.done ? preset.rounds * (preset.blocks || 1) : 0);
          if (!preset.workHr || preset.workHr[0] >= 80) out.hard += (rounds * preset.work) / 60;
          if (it.ex === "norwegian" && (l.done || rounds)) out.zone2 += (Math.max(0, rounds - 1) * preset.rest) / 60;
        }
      }
    }
  }
  for (const x of log.extras || []) {
    const m = Number(x.min) || 0;
    out.extra += m;
    if (x.intensity === "hard") out.hard += m;
    else if (x.intensity !== "light") out.zone2 += m;
  }
  out.zone2 = Math.round(out.zone2);
  out.hard = Math.round(out.hard);
  return out;
}

export function weekStats(start, { from, to } = {}) {
  const s = { sessions: 0, skipped: 0, partial: 0, zone2: 0, hard: 0, extra: 0, planned: 6, addonDays: 0 };
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    if ((from && date < from) || (to && date > to)) continue;
    const log = state.days[date];
    if (!log) continue;
    if (countsAsSession(log)) s.sessions += 1;
    if (log.status === "partial") s.partial += 1;
    if (log.skip) s.skipped += 1;
    const l = dayLoad(log);
    s.zone2 += l.zone2;
    s.hard += l.hard;
    s.extra += l.extra;
    if (Object.values(log.addons || {}).some((a) => a && a.items && Object.values(a.items).some((x) => x.done))) s.addonDays += 1;
  }
  return s;
}

// Consecutive training days completed, ignoring rest days. Today only counts once done.
export function streak(today = todayIso()) {
  let n = 0;
  let date = today;
  const todayLog = state.days[today];
  if (!countsAsSession(todayLog)) date = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    const key = weekdayKey(date);
    const log = state.days[date];
    if (isRestKey((log && log.session) || key)) {
      date = addDays(date, -1);
      continue;
    }
    if (countsAsSession(log)) n += 1;
    else break;
    date = addDays(date, -1);
  }
  return n;
}

// Top set per day for a loaded exercise: [{ date, kg, reps }]
export function liftHistory(exId) {
  const out = [];
  for (const [date, log] of Object.entries(state.days).sort(([a], [b]) => (a < b ? -1 : 1))) {
    let best = null;
    const scan = (items) => {
      for (const [id, l] of Object.entries(items || {})) {
        if (loggedExerciseId(log, id, l) !== exId || !l.sets) continue;
        for (const st of l.sets) {
          const kg = Number(st.kg) || 0;
          const reps = Number(st.reps) || 0;
          if (!reps && !kg) continue;
          if (!best || kg > best.kg || (kg === best.kg && reps > best.reps)) best = { date, kg, reps };
        }
      }
    };
    scan(log.items);
    for (const a of Object.values(log.addons || {})) scan(a && a.items);
    if (best) out.push(best);
  }
  return out;
}

export const SKIP_REASONS = localized([
  { id: "sick", name: "Sick", icon: "thermo" },
  { id: "injury", name: "Pain or injury", icon: "bandage" },
  { id: "tired", name: "Too tired or sore", icon: "battery" },
  { id: "work", name: "Work", icon: "briefcase" },
  { id: "travel", name: "Travel", icon: "plane" },
  { id: "family", name: "Family or social", icon: "people" },
  { id: "time", name: "No time", icon: "clock" },
  { id: "other", name: "Other", icon: "dots" },
]);

export const EXTRA_TYPES = localized([
  { id: "desk", name: "Desk treadmill walk" },
  { id: "walk", name: "Walk" },
  { id: "hike", name: "Hike" },
  { id: "bike", name: "Bike ride" },
  { id: "run", name: "Run" },
  { id: "swim", name: "Swim" },
  { id: "sport", name: "Sport or game" },
  { id: "treadmill-run", name: "Treadmill run" },
  { id: "jog", name: "Jog" },
  { id: "trail-run", name: "Trail run" },
  { id: "indoor-bike", name: "Indoor cycling" },
  { id: "row", name: "Rowing" },
  { id: "elliptical", name: "Elliptical" },
  { id: "stairs", name: "Stair climbing" },
  { id: "rope", name: "Skipping rope" },
  { id: "dance", name: "Dancing" },
  { id: "yoga", name: "Yoga" },
  { id: "pilates", name: "Pilates" },
  { id: "mobility", name: "Mobility / stretching" },
  { id: "strength", name: "Strength training" },
  { id: "calisthenics", name: "Calisthenics" },
  { id: "boxing", name: "Boxing / martial arts" },
  { id: "tennis", name: "Tennis" },
  { id: "badminton", name: "Badminton" },
  { id: "pickleball", name: "Pickleball" },
  { id: "padel", name: "Padel" },
  { id: "table-tennis", name: "Table tennis" },
  { id: "football", name: "Football" },
  { id: "basketball", name: "Basketball" },
  { id: "volleyball", name: "Volleyball" },
  { id: "climb", name: "Climbing / bouldering" },
  { id: "skate", name: "Skating" },
  { id: "ski", name: "Skiing" },
  { id: "snowboard", name: "Snowboarding" },
  { id: "kayak", name: "Kayaking / canoeing" },
  { id: "other", name: "Other" },
]);
