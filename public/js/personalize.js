// Turns the generic plan into numbers for one person:
// - heart-rate ranges from age (Tanaka: 208 − 0.7 × age) or a measured max,
// - starting loads scaled by body weight, sex, age and training level,
// - units (kg/cm or lb/in).
// Your training level alone decides the workouts (the doses in data/program.js);
// it only changes when you change it.
//
// The plan's loads were set for a 75 kg man of 38 returning to training ("returning");
// everyone else gets the same loads scaled. They are starting points: the effort
// target of your level (reps left in the tank) always wins.

import { localized, t } from "./i18n.js";
import { iso } from "./util.js";
import { DEFAULT_RADIO_STATION, DEFAULT_RADIO_VOLUME } from "./data/radio.js";

// Each level has its own workouts (index into the dose arrays of data/program.js)
// and scales the starting weights. Weight, sex and age scale the weights too.
export const LEVELS = localized([
  { id: "new", name: "New to training", detail: "You have little or no strength training experience.", load: 0.7, plan: "Start with supported exercises, 1–2 sets and light weights. There are no jumps." },
  { id: "returning", name: "Returning", detail: "You trained before and have taken months or years off.", load: 1.0, plan: "Practise the movements with 2 sets, landing drills in place of jumps and short, controlled intervals." },
  { id: "active", name: "Active", detail: "You have trained regularly for the last few months.", load: 1.15, plan: "Do 3 sets, add jumps and spend longer on intervals and Zone 2." },
  { id: "trained", name: "Well trained", detail: "You have lifted and done hard cardio regularly for at least a year.", load: 1.3, plan: "Follow the full plan with heavy main lifts, all-out intervals and the full Norwegian 4×4." },
]);

export function levelIndex(p) {
  const i = LEVELS.findIndex((l) => l.id === (p && p.level));
  return i < 0 ? 1 : i;
}

// Profiles saved before levels replaced phases (v1.x) carry startPhase/phaseLock.
// Keep their current difficulty: a lock, or else the phase of the latest logged
// day, maps Re-entry → their level (at most Returning), Build → Active,
// Blueprint → Well trained, and drops the old fields. Returns true if it changed p.
export function migrateProfile(p, days = {}) {
  if (!p) return false;
  let changed = false;
  if (p.settings?.animStyle === "chrome") {
    p.settings.animStyle = "athlete";
    changed = true;
  }
  if (!("startPhase" in p || "phaseLock" in p || "levelSince" in p)) return changed;
  let phase = p.phaseLock != null && p.phaseLock !== "" ? Number(p.phaseLock) : null;
  if (phase == null) {
    const logged = Object.values(days).filter((d) => d && d.phase != null).sort((a, b) => (a.date < b.date ? 1 : -1));
    phase = logged.length ? Number(logged[0].phase) : Number(p.startPhase) || 0;
  }
  const idx = phase === 0 ? Math.min(levelIndex(p), 1) : Math.min(3, phase + 1);
  p.level = LEVELS[idx].id;
  delete p.startPhase;
  delete p.phaseLock;
  delete p.levelSince;
  return true;
}

export const SEXES = localized([
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "other", name: "Prefer not to say" },
]);

export function defaultProfile() {
  return {
    name: "",
    age: 30,
    sex: "other",
    weightKg: 70,
    heightCm: 170,
    level: "new",
    units: "metric",
    maxDumbbellKg: 20,
    equipment: [],
    hrMax: null,
    startDate: iso(new Date()),
    addons: { posture: true },
    settings: { language: "en", theme: "system", skin: "original", restSec: 75, sound: true, voiceCoach: true, radio: { station: DEFAULT_RADIO_STATION, volume: DEFAULT_RADIO_VOLUME } },
    createdAt: new Date().toISOString(),
  };
}

// ---------- heart rate ----------

export function hrMax(p) {
  if (p && Number(p.hrMax) > 100) return Math.round(Number(p.hrMax));
  const age = Number(p && p.age) || 38;
  return Math.round(208 - 0.7 * age);
}

export function bpm(p, pct) {
  return Math.round((hrMax(p) * pct) / 100);
}

export function bpmRange(p, lo, hi) {
  return `${bpm(p, lo)}–${bpm(p, hi)} bpm`;
}

// ---------- loads ----------

export function loadFactor(p) {
  if (!p) return 1;
  const w = Number(p.weightKg) || 75;
  const level = (LEVELS.find((l) => l.id === p.level) || LEVELS[1]).load;
  const sex = p.sex === "female" ? 0.7 : p.sex === "other" ? 0.85 : 1;
  const age = Number(p.age) || 38;
  const ageF = age >= 65 ? 0.8 : age >= 55 ? 0.88 : age >= 45 ? 0.95 : 1;
  // Strength scales with roughly body weight^(2/3), not linearly.
  return Math.pow(w / 75, 2 / 3) * level * sex * ageF;
}

// Rounds to what adjustable dumbbells actually offer.
export function roundKg(x) {
  if (x < 6) return Math.max(0.5, Math.round(x * 2) / 2);
  if (x < 20) return Math.round(x);
  return Math.round(x / 2) * 2;
}

const toLb = (kg) => {
  const lb = kg * 2.20462;
  return lb < 20 ? Math.max(1, Math.round(lb)) : Math.round(lb / 5) * 5;
};

export function kgUnit(p) {
  return p && p.units === "imperial" ? "lb" : "kg";
}

// Display a body-weight or load value (kg in, user's unit out).
export function fmtWeight(p, kg, digits = 1) {
  if (kg == null || kg === "") return "";
  if (p && p.units === "imperial") return `${Math.round(kg * 2.20462 * 10 ** digits) / 10 ** digits} lb`;
  return `${Math.round(kg * 10 ** digits) / 10 ** digits} kg`;
}

export function fmtLoad(p, lo, hi = null) {
  const f = loadFactor(p);
  let a = roundKg(lo * f);
  let b = hi == null ? null : roundKg(hi * f);
  const max = Number(p && p.maxDumbbellKg) || null;
  let note = "";
  if (max) {
    if (a >= max) {
      a = max;
      b = null;
      note = ` (${t("your heaviest")})`;
    } else if (b != null && b > max) b = max;
  }
  if (b != null && b <= a) b = null;
  if (p && p.units === "imperial") {
    const la = toLb(a);
    const lb = b == null ? null : toLb(b);
    return (lb != null && lb !== la ? `${la}–${lb} lb` : `${la} lb`) + note;
  }
  return (b != null ? `${a}–${b} kg` : `${a} kg`) + note;
}

export function fmtLen(p, lo, hi = null) {
  if (p && p.units === "imperial") {
    const a = Math.round(lo / 2.54);
    const b = hi == null ? null : Math.round(hi / 2.54);
    return b != null && b !== a ? `${a}–${b} in` : `${a} in`;
  }
  return hi != null ? `${lo}–${hi} cm` : `${lo} cm`;
}

// ---------- text tokens ----------

const TOKEN = /\{(hr|kg|cm):(~?)([\d.]+)(?:-([\d.]+))?\}/g;

// "{hr:60-70}" → "109–127 bpm", "{kg:10-14}" → "10–14 kg" (scaled), "{cm:30}" → "30 cm"/"12 in".
export function personalize(text, p) {
  if (text == null) return text;
  return String(text).replace(TOKEN, (_, kind, approx, a, b) => {
    const lo = Number(a);
    const hi = b != null ? Number(b) : null;
    if (kind === "hr") return hi == null ? `${approx ? "≈" : ""}${bpm(p, lo)} bpm` : bpmRange(p, lo, hi);
    if (kind === "kg") return fmtLoad(p, lo, hi);
    return fmtLen(p, lo, hi);
  });
}

// The first load mentioned in a prescription, scaled — used as the placeholder in the set logger.
export function suggestedKg(text, p) {
  const m = /\{kg:([\d.]+)(?:-([\d.]+))?\}/.exec(text || "");
  if (!m) return null;
  const f = loadFactor(p);
  let v = roundKg(Number(m[1]) * f);
  const max = Number(p && p.maxDumbbellKg) || null;
  if (max && v > max) v = max;
  return v;
}
