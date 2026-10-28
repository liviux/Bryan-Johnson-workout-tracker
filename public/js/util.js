// Small shared helpers: HTML escaping, dates, formatting, DOM shortcuts.

import { locale } from "./i18n.js";

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Bengali, Hindi, Arabic-Indic and Eastern Arabic-Indic digits used by the
// translated plan. Dose parsing and totals read every number as ASCII.
const DIGIT_GROUPS = [
  ["০১২৩৪৫৬৭৮৯", "0123456789"],
  ["०१२३४५६७८९", "0123456789"],
  ["٠١٢٣٤٥٦٧٨٩", "0123456789"],
  ["۰۱۲۳۴۵۶۷۸۹", "0123456789"],
];
export function normalizeDigits(value) {
  let text = String(value ?? "");
  for (const [from, to] of DIGIT_GROUPS) {
    const map = new Map([...from].map((d, i) => [d, to[i]]));
    text = text.replace(new RegExp(`[${from}]`, "g"), (d) => map.get(d));
  }
  return text.replace(/\u066b/g, ".").replace(/\u066c/g, ",");
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- dates (local time, ISO "YYYY-MM-DD") ----------

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const todayIso = () => iso(new Date());

export function addDays(s, n) {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function weekdayKey(s) {
  return WEEKDAY_KEYS[(parseIso(s).getDay() + 6) % 7];
}

export function weekStart(s) {
  const d = parseIso(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

export function daysBetween(a, b) {
  return Math.round((parseIso(b) - parseIso(a)) / 86400000);
}

export function fmtDate(s, opts = { weekday: "long", day: "numeric", month: "long" }) {
  return parseIso(s).toLocaleDateString(locale(), opts);
}

export function fmtShort(s) {
  return parseIso(s).toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

export function isoWeekNumber(s) {
  const d = parseIso(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

// ---------- formatting ----------

export function fmtSecs(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtRuntime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtMinSec(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `min ${m} sec ${s}`;
}

export function plural(n, one, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export function clamp(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
