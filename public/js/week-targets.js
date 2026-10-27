// Bryan's week scoreboard: the plan's own weekly targets, counted from what is
// already scheduled and logged. It adds no extra work, it only surfaces the
// strength, cardio, jumps, balance, mobility and posture targets that the plan
// asks for.

import { CATEGORIES, EXERCISES } from "./data/exercises.js";
import { state } from "./store.js";
import { addDays } from "./util.js";
import { levelIndex } from "./personalize.js";
import { addonsForDate, countsAsSession, dayDef, dayLoad, sessionKeyFor } from "./plan.js";

// Weekly cardio targets by training level (New, Returning, Active, Well trained).
const LEVEL_TARGETS = [
  { zone2: 60, hard: 0 },
  { zone2: 90, hard: 26 },
  { zone2: 120, hard: 51 },
  { zone2: 150, hard: 75 },
];
const STRENGTH_KEYS = new Set(["mon", "wed", "fri"]);
const JUMP_IDS = new Set(["pogo", "jumps", "snapdown", "squatjump", "cmjump", "powerskip", "heidens"]);
const BALANCE_IDS = new Set(["tree"]);
const BALANCE_CATS = new Set(["Warm-up & balance", "Core & stability"]);
const MOBILITY_CAT = CATEGORIES[6];

// Item ids come from the program; the log stores the exercise id as `ex`.
function exIdFor(date, scope, id) {
  if (scope === "main") {
    const def = dayDef(sessionKeyFor(date));
    if (def) for (const b of def.blocks) for (const it of b.items) if (it.id === id) return it.ex;
  } else {
    for (const a of addonsForDate(date)) if (a.addon.id === scope) for (const it of a.variant.items) if (it.id === id) return it.ex;
  }
  return null;
}

// Every exercise with a completed item on this day (main session and add-ons).
function doneExercises(date) {
  const out = new Set();
  const log = state.days[date];
  if (!log) return out;
  const scan = (scope, items) => {
    for (const [id, l] of Object.entries(items || {})) {
      if (!l || !l.done) continue;
      const ex = l.ex || exIdFor(date, scope, id);
      if (ex) out.add(ex);
    }
  };
  scan("main", log.items);
  for (const [addonId, a] of Object.entries(log.addons || {})) scan(addonId, a && a.items);
  return out;
}

function daysWith(days, predicate) {
  return days.filter(predicate).map((d) => d.date);
}

export function weekTargets(start, { level = levelIndex(state.profile) } = {}) {
  const profile = state.profile || {};
  const cfg = LEVEL_TARGETS[level] || LEVEL_TARGETS[LEVEL_TARGETS.length - 1];
  const postureOn = !!(profile.addons && profile.addons.posture);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const log = state.days[date] || null;
    const load = log ? dayLoad(log) : { zone2: 0, hard: 0 };
    days.push({ date, log, load, ex: doneExercises(date) });
  }

  const has = (d, predicate) => [...d.ex].some(predicate);
  const strength = daysWith(days, (d) => d.log && countsAsSession(d.log) && STRENGTH_KEYS.has(sessionKeyFor(d.date)));
  const jumps = daysWith(days, (d) => has(d, (ex) => JUMP_IDS.has(ex)));
  const balance = daysWith(days, (d) => has(d, (ex) => BALANCE_IDS.has(ex) || BALANCE_CATS.has((EXERCISES[ex] || {}).cat)));
  const mobility = daysWith(days, (d) => has(d, (ex) => (EXERCISES[ex] || {}).cat === MOBILITY_CAT));
  const posture = postureOn
    ? daysWith(days, (d) => {
        const items = d.log && d.log.addons && d.log.addons.posture && d.log.addons.posture.items;
        return !!(items && Object.values(items).some((x) => x && x.done));
      })
    : [];
  const zone2 = days.reduce((n, d) => n + d.load.zone2, 0);
  const hard = days.reduce((n, d) => n + d.load.hard, 0);
  const byDay = (key) => days.map((d) => ({ date: d.date, value: d.load[key] }));

  const targets = [
    {
      id: "strength",
      label: "Strength sessions",
      targetLabel: "3 sessions",
      value: strength.length,
      target: 3,
      met: strength.length >= 3,
      unit: "sessions",
      days: strength,
      note: "Monday, Wednesday and Friday strength sessions.",
    },
    {
      id: "zone2",
      label: "Zone 2 minutes",
      targetLabel: `${cfg.zone2} min`,
      value: zone2,
      target: cfg.zone2,
      met: zone2 >= cfg.zone2,
      unit: "min",
      minutes: byDay("zone2"),
      note: "Scheduled Zone 2 blocks, easy 4×4 recoveries and easy extra activity.",
    },
    {
      id: "hard",
      label: "Hard-cardio minutes",
      targetLabel: `${cfg.hard} min`,
      value: hard,
      target: cfg.hard,
      met: hard >= cfg.hard,
      unit: "min",
      minutes: byDay("hard"),
      note: "Controlled vigorous blocks and hard work intervals; brisk beginner intervals are excluded.",
    },
    {
      id: "jumps",
      label: "Jumps & hops",
      targetLabel: "4–7 days",
      value: jumps.length,
      target: 4,
      met: jumps.length >= 4,
      unit: "days",
      days: jumps,
      note: "From the bone protocol: hops or jumps in the warm-up; power work counts too.",
    },
    {
      id: "balance",
      label: "Balance & stability",
      targetLabel: "5 days",
      value: balance.length,
      target: 5,
      met: balance.length >= 5,
      unit: "days",
      days: balance,
      note: "Balance work, core and the stability menu.",
    },
    {
      id: "mobility",
      label: "Mobility & stretching",
      targetLabel: "6 training days",
      value: mobility.length,
      target: 6,
      met: mobility.length >= 6,
      unit: "days",
      days: mobility,
      note: "Sunday is rest; an easy stretch there is optional.",
    },
  ];

  if (postureOn) {
    targets.push({
      id: "posture",
      label: "Posture block",
      targetLabel: "6 training days",
      value: posture.length,
      target: 6,
      met: posture.length >= 6,
      unit: "days",
      days: posture,
      note: "Sunday is optional.",
    });
  }

  const metCount = targets.filter((t) => t.met).length;
  return { start, end: addDays(start, 6), days, targets, metCount, total: targets.length, allMet: metCount === targets.length };
}
