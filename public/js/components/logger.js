// Logging UI for one exercise on one day: sets × reps × load, holds with a timer,
// cardio minutes and heart rate, or interval rounds. Everything auto-saves.

import { CATEGORIES, EXERCISES } from "../data/exercises.js";
import { INTERVAL_MOVES } from "../data/routines.js";
import { bandById, bandOptionsHtml } from "../data/bands.js";
import { state } from "../store.js";
import { editDay, itemLog, loggedExerciseId, logLevel, rxFor, timerPresets } from "../plan.js";
import { LEVELS, bpmRange, fmtWeight, kgUnit, personalize, suggestedKg } from "../personalize.js";
import { esc, fmtShort } from "../util.js";
import { parseRx } from "../rx.js";
import { icon } from "./icons.js";
import { openDialog, toast } from "./ui.js";
import { t } from "../i18n.js";
import { startCountdown, startHold, startIntervals, startRest } from "./timer.js";
import { voiceRequest } from "../voice/player.js";

export { parseRx };


const toUnit = (kg) => (state.profile && state.profile.units === "imperial" ? Math.round(kg * 2.20462 * 10) / 10 : kg);
const fromUnit = (v) => (state.profile && state.profile.units === "imperial" ? Math.round((v / 2.20462) * 10) / 10 : v);
const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function getItemLog(date, scope, itemId) {
  return itemLog(state.days[date], scope, itemId);
}

export function editItem(date, scope, item, fn) {
  return editDay(date, (d) => {
    let bag;
    if (scope === "main") bag = d.items;
    else {
      d.addons[scope] = d.addons[scope] || { items: {} };
      d.addons[scope].items = d.addons[scope].items || {};
      bag = d.addons[scope].items;
    }
    const cur = structuredClone(bag[item.id] || getItemLog(date, scope, item.id) || { ex: item.ex, done: false });
    if (!bag[item.id] && item.id === "fri-strength-rdl") cur.splitMovements = true;
    cur.ex = item.ex;
    fn(cur);
    bag[item.id] = cur;
  });
}

// Earlier logs of the same exercise, newest first, for "last time" and the
// progression rule. Entries without any set values are ignored. Pass a level to
// compare only sessions done at that level: after a level change the count
// starts fresh at the new range.
export function performanceHistory(exId, beforeDate, limit = 4, { level = null } = {}) {
  const out = [];
  const dates = Object.keys(state.days).filter((d) => d < beforeDate).sort().reverse();
  for (const date of dates) {
    const day = state.days[date];
    const bags = [day.items, ...Object.values(day.addons || {}).map((a) => a && a.items)];
    for (const bag of bags) {
      for (const [id, l] of Object.entries(bag || {})) {
        if (loggedExerciseId(day, id, l) !== exId || !l.sets || !l.sets.some((s) => s.reps != null || s.kg != null || s.sec != null)) continue;
        const lvl = logLevel(day);
        if (level != null && lvl != null && lvl !== level) continue;
        out.push({ date, log: l });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// Most recent earlier log of the same exercise, for "last time".
export function lastPerformance(exId, beforeDate, opts) {
  return performanceHistory(exId, beforeDate, 1, opts)[0] || null;
}

// Top of the rep range or the hold time, if the dose gives one.
function topValue(target, key) {
  const v = key === "reps" ? target.reps : target.seconds;
  if (v == null || v === "max") return null;
  const m = /(\d+)(?:–(\d+))?/.exec(String(v));
  return m ? Number(m[2] || m[1]) : null;
}

function hitTarget(log, target, key) {
  const top = topValue(target, key);
  if (!top || !log || !log.sets) return false;
  const rows = log.sets.filter((s) => (key === "reps" ? s.reps != null : s.sec != null));
  if (rows.length < (target.sets || 1)) return false;
  return rows.every((s) => Number(key === "reps" ? s.reps : s.sec) >= top);
}

function topKg(log) {
  return Math.max(0, ...((log && log.sets) || []).map((s) => Number(s.kg) || 0));
}

// Consecutive earlier sessions at the top of the range, capped at 2 for the
// plan's "two sessions in a row" rule.
function topCountFor(hist, target, key) {
  let n = 0;
  for (const h of hist) {
    if (!hitTarget(h.log, target, key)) break;
    n += 1;
  }
  return Math.min(2, n);
}

const topText = (n, what = "sessions") => t("{count} of 2 {what} at the top of the range", { count: n, what: t(what) });

const showKg = (p, kg) => fmtWeight(p, kg, 1);

// The plan's own progression rule, turned into a suggestion for the next time:
// add weight only after two sessions at the top of the rep range, and step back
// to "repeat" whenever the last session was marked easier or painful.
export function nextTimeRecommendation({ item, ex, level, date }) {
  const p = state.profile;
  if (!ex || !["load", "reps", "hold", "carry"].includes(ex.log)) return null;
  const rx = rxFor(item, level);
  const target = parseRx(personalize(rx, p));
  // Only sessions done at the same level count: a level change restarts the
  // two-in-a-row comparison at the new level's range.
  const hist = performanceHistory(item.ex, date, 6, { level });
  const last = hist[0] || null;

  if (ex.log === "hold" || (ex.log === "carry" && !target.seconds && !topValue(target, "reps"))) {
    const top = topValue(target, "seconds");
    if (!top) return null;
    const count = topCountFor(hist, target, "sec");
    if (!last) return { kind: "start", seconds: top, text: t("Hold {seconds} s and build from there.", { seconds: top }) };
    if (last.log.holdProgress) return { kind: "repeat", seconds: top, text: t("Repeat {seconds} s — progression is paused after the easier session.", { seconds: top }) };
    if (count >= 2) return { kind: "add", seconds: top + 5, text: t("Try {seconds} s next time — {top}.", { seconds: top + 5, top: topText(count, "holds") }) };
    return { kind: "repeat", seconds: top, text: t("Hold {seconds} s again — {top}; two in a row unlock more time.", { seconds: top, top: topText(count, "holds") }) };
  }

  if (ex.log === "carry") {
    const secs = topValue(target, "seconds");
    const lastKg = topKg(last && last.log);
    const suggested = suggestedKg(rx, p);
    const count = topCountFor(hist, target, "sec");
    if (!last) return suggested != null ? { kind: "start", kg: suggested, seconds: secs, text: t("Start around {weight} for {seconds} s.", { weight: showKg(p, suggested), seconds: secs || 30 }) } : null;
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? t("Repeat {weight} — progression is paused after the easier session.", { weight: showKg(p, lastKg) }) : t("Repeat the same hold — progression is paused after the easier session.") };
    if (count >= 2 && lastKg) return { kind: "add", kg: lastKg + 1, seconds: secs, text: t("Try {weight} next time — {top}.", { weight: showKg(p, lastKg + 1), top: topText(count, "holds") }) };
    return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? t("Repeat {weight} — {top}; two in a row unlock the next step.", { weight: showKg(p, lastKg), top: topText(count, "holds") }) : t("Repeat the same hold — {top}; two in a row unlock the next step.", { top: topText(count, "holds") }) };
  }

  if (ex.log === "load") {
    const top = topValue(target, "reps");
    const suggested = suggestedKg(rx, p);
    if (!last) {
      if (suggested == null) return null;
      return { kind: "start", kg: suggested, text: t("Start around {weight} — adjust so you finish with the reps your level recommends.", { weight: showKg(p, suggested) }) };
    }
    const lastKg = topKg(last.log);
    const count = topCountFor(hist, target, "reps");
    if (!lastKg) {
      if (top) return { kind: "repeat", reps: top, text: t("Aim for {reps} reps and add reps before adding weight — {top}.", { reps: top, top: topText(count) }) };
      return null;
    }
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg, text: t("Repeat {weight} — progression is paused after the easier session.", { weight: showKg(p, lastKg) }) };
    if (top && count >= 2) {
      const inc = ex.cat === CATEGORIES[2] ? 2 : 1;
      let kg = lastKg + inc;
      const max = Number(p && p.maxDumbbellKg) || null;
      let note = "";
      if (max && kg > max) {
        kg = max;
        note = " " + t("You are at your heaviest dumbbell: aim for one more rep instead.");
      }
      return { kind: "add", kg, text: t("Try {weight} next time — {top}.", { weight: showKg(p, kg), top: topText(count) }) + note };
    }
    return { kind: "repeat", kg: lastKg, text: t("Repeat {weight} — {top}; two in a row unlock the next jump.", { weight: showKg(p, lastKg), top: topText(count) }) };
  }

  // Bodyweight reps.
  const top = topValue(target, "reps");
  if (!top) return null;
  const count = topCountFor(hist, target, "reps");
  if (!last) return { kind: "start", reps: top, text: t("Aim for {reps} reps.", { reps: top }) };
  if (last.log.holdProgress) return { kind: "repeat", reps: top, text: t("Repeat {reps} reps — progression is paused after the easier session.", { reps: top }) };
  if (count >= 2) return { kind: "add", reps: top + 1, text: t("Try {reps} reps next time — {top}.", { reps: top + 1, top: topText(count) }) };
  return { kind: "repeat", reps: top, text: t("Aim for {reps} reps again — {top}; two in a row unlock the next step.", { reps: top, top: topText(count) }) };
}

// A paired guided step shows one set. The step for the last planned set also
// shows any sets added after it, so extra sets have a place to live.
function showsSet(i, setIndex, sets) {
  return setIndex == null || i === setIndex || (setIndex >= sets - 1 && i > setIndex);
}

// The number to record when a field is left blank: the level's target (top of
// a rep or hold range), or the next-time suggestion when there is one.
function topNumber(value) {
  if (value == null || value === "" || value === "max") return null;
  const m = /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?/.exec(String(value));
  if (!m) return null;
  const n = Number(String(m[2] || m[1]).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function planDefaults({ item, ex, level, date, target, type, log = {} }) {
  const p = state.profile || {};
  const suggestion = nextTimeRecommendation({ item, ex, level, date });
  const out = { reps: null, sec: null, kg: null, min: null, rounds: null };
  if (type === "reps" || type === "load") out.reps = suggestion?.reps ?? topNumber(target.reps);
  if (type === "hold" || type === "carry") out.sec = suggestion?.seconds ?? topNumber(target.seconds);
  if (type === "load" || type === "carry") out.kg = suggestion?.kg ?? suggestedKg(rxFor(item, level), p);
  if (type === "cardio") out.min = target.minutes ?? null;
  if (type === "intervals") {
    const presets = timerPresets(item, level);
    const preset = presets[Math.min(log.preset || 0, Math.max(0, presets.length - 1))];
    out.rounds = preset ? preset.rounds * (preset.blocks || 1) : null;
  }
  if (type === "check") {
    if (target.seconds != null) out.sec = topNumber(target.seconds);
    else if (target.minutes != null) out.min = target.minutes;
    else if (target.reps !== "max") out.reps = topNumber(target.reps);
  }
  return out;
}

// Fill any empty values with the plan's default for the level. Called when an
// exercise is marked done, so a blank log still records what was prescribed.
export function fillDefaults({ date, scope = "main", item, ex, level, setIndex = null }) {
  if (!item || !ex || ex.log === "none") return;
  const log = getItemLog(date, scope, item.id) || {};
  const rxText = personalize(log.rxOverride || rxFor(item, level), state.profile);
  const target = parseRx(rxText);
  const type = ex.log;
  const d = planDefaults({ item, ex, level, date, target, type, log });
  if (d.reps == null && d.sec == null && d.kg == null && d.min == null && d.rounds == null) return;
  editItem(date, scope, item, (l) => {
    if (type === "cardio" || (type === "check" && d.min != null)) {
      l.cardio = l.cardio || {};
      if (l.cardio.min == null) l.cardio.min = d.min;
      return;
    }
    if (type === "intervals") {
      if (l.rounds == null) l.rounds = d.rounds;
      return;
    }
    if (!["reps", "load", "hold", "carry", "check"].includes(type)) return;
    l.sets = Array.isArray(l.sets) ? l.sets : [];
    while (l.sets.length < (target.sets || 1)) l.sets.push({});
    for (let i = 0; i < l.sets.length; i++) {
      if (!showsSet(i, setIndex, target.sets || 1)) continue;
      const s = l.sets[i] || (l.sets[i] = {});
      if (d.reps != null && s.reps == null) s.reps = d.reps;
      if (d.sec != null && s.sec == null) s.sec = d.sec;
      if (d.kg != null && s.kg == null) s.kg = d.kg;
    }
  });
}

export function summarizeLog(l, logType) {
  if (!l) return "";
  const u = kgUnit(state.profile);
  if (l.sets && l.sets.length) {
    const parts = l.sets
      .filter((s) => s.reps != null || s.kg != null || s.sec != null)
      .map((s) => {
        const a = s.sec != null ? `${s.sec} s` : s.reps != null ? `${s.reps}` : "";
        const b = s.kg != null ? ` × ${toUnit(s.kg)} ${u}` : "";
        const band = s.band === "custom" ? s.bandCustom : bandById(s.band)?.name;
        return a + b + (band ? ` · ${band}` : "");
      });
    if (parts.length) return parts.join(" · ");
  }
  if (l.cardio && (l.cardio.min || l.cardio.avg)) return [l.cardio.min && `${l.cardio.min} min`, l.cardio.avg && t("avg {bpm} bpm", { bpm: l.cardio.avg })].filter(Boolean).join(" · ");
  if (l.rounds) return `${t("{count} rounds", { count: l.rounds })}${l.peak ? ` · ${t("peak {bpm} bpm", { bpm: l.peak })}` : ""}`;
  return "";
}

export function renderLogger(container, ctx) {
  const { date, item, ex, level, scope = "main" } = ctx;
  const p = state.profile;
  const type = ex.log;
  const u = kgUnit(p);
  const restSec = item.id === "fri-strength-rdl" && level === 3 ? 25 : (p && p.settings && p.settings.restSec) || 75;
  const cardioRange = item.intensity === "light" ? [50, 60] : ex.intensity === "hard" ? [80, level === 1 ? 85 : 90] : [60, 70];
  const cardioLabel = item.intensity === "light" ? t("Easy pace") : ex.intensity === "hard" ? t("Vigorous") : t("Zone 2");
  const hasBand = ex.band === true || (ex.equipment || []).includes("band");

  function draw() {
    const l = getItemLog(date, scope, item.id) || {};
    const done = !!l.done;
    // An easier choice made today changes only today's displayed dose.
    const rxText = personalize(l.rxOverride || rxFor(item, level), p);
    const target = parseRx(rxText);
    if (ctx.onDraw) ctx.onDraw(l);
    const suggestion = nextTimeRecommendation({ item, ex, level, date });
    const defaults = planDefaults({ item, ex, level, date, target, type, log: l });
    const checkLabel = target.unit === "breaths" ? t("Breaths") : target.unit === "circles" ? t("Circles") : t("Reps");
    const timedCheck = type === "check" && target.seconds != null;
    const setType = ["reps", "load", "hold", "carry"].includes(type) || (type === "check" && target.minutes == null);
    let body = "";
    if (type === "none") {
      container.innerHTML = `<p class="muted">${t("Choose movements from this list for your intervals, then record them in the interval block.")}</p>`;
      return;
    }
    const doneButton = ctx.manualCompletion ? "" : `<button type="button" class="btn ${done ? "primary" : ""}" data-l="done" aria-pressed="${done}">${icon("check")} ${done || ctx.compactActions ? t("Done") : t("Mark done")}</button>`;
    const doneBtn = ctx.compactActions ? "" : doneButton;

    if (setType) {
      const cols = [];
      if (type === "reps" || type === "load" || (type === "check" && !timedCheck)) cols.push(["reps", checkLabel, target.reps || ""]);
      if (type === "hold" || type === "carry" || timedCheck) cols.push(["sec", t("Seconds"), target.seconds || ""]);
      if (type === "load" || type === "carry") cols.push(["kg", u, ""]);
      if (hasBand) cols.push(["band", t("Band"), ""]);
      const timed = type === "hold" || type === "carry" || timedCheck;
      const n = Math.max(l.sets ? l.sets.length : 0, target.sets || 1);
      const sets = Array.from({ length: n }, (_, i) => (l.sets && l.sets[i]) || {});
      body += `<div class="sets">
        ${sets
          .map(
            (s, i) => !showsSet(i, ctx.setIndex, target.sets || 1) ? "" : `<div class="set-row">
              <span class="n">${t("Set {set}", { set: i + 1 })}</span>
              ${cols
                .map(([k, label, ph]) => {
                  if (k === "band") {
                    const selected = s.band || "";
                    const band = bandById(selected);
                    const custom = selected === "custom";
                    return `<span class="set-field band-field"><span>${esc(label)}</span><span class="band-dot" style="${band ? `background:${band.color}` : ""}" aria-hidden="true"></span><select class="input band-pick" data-set="${i}" data-k="band" aria-label="${esc(t("Set {set} band", { set: i + 1 }))}"><option value="">${t("None")}</option>${bandOptionsHtml(p?.units, selected)}<option value="custom"${custom ? " selected" : ""}>${t("Custom")}</option></select>${custom ? `<input class="input num band-custom" data-set="${i}" data-k="bandCustom" value="${esc(s.bandCustom || "")}" placeholder="${esc(u)}" aria-label="${esc(t("Set {set} custom band value", { set: i + 1 }))}">` : ""}</span>`;
                  }
                  const plan = defaults[k];
                  const blank = s[k] == null;
                  const v = blank ? (plan ?? "") : k === "kg" ? toUnit(s[k]) : s[k];
                  const isPlan = blank && plan != null;
                  const planText = k === "kg" ? fmtWeight(p, plan) : k === "sec" ? `${plan} s` : `${plan}`;
                  const hint = isPlan ? t("Plan default: {value}", { value: planText }) : ph ? t("Plan: {value}", { value: ph }) : "";
                  return `<label class="set-field"><span>${esc(label)}</span><input class="input num" inputmode="decimal" data-set="${i}" data-k="${k}" value="${esc(v)}" placeholder="${esc(ph && !isPlan ? ph : "")}"${isPlan ? ' data-default="true"' : ""}${hint ? ` title="${esc(hint)}"` : ""} aria-label="${esc(t("Set {set} {field}", { set: i + 1, field: label }))}"></label>`;
                })
                .join('<span class="set-sep" aria-hidden="true">×</span>')}
              <span class="set-actions${timed ? " has-timer" : ""}">
                <span class="set-timer-cell">
                  <span class="timer-slot"></span>
                  ${timed ? `<button type="button" class="btn sm icon-only timer-start" data-l="hold" data-i="${i}" aria-label="${esc(t("Start {seconds} second timer for set {set}", { seconds: defaults.sec || target.seconds || 30, set: i + 1 }))}" title="${esc(t("Start set timer"))}">${icon("timer", "sm")}</button>` : ""}
                </span>
                ${sets.length > 1 ? `<button type="button" class="btn sm icon-only ghost" data-l="del" data-i="${i}" aria-label="${esc(t("Remove set {set}", { set: i + 1 }))}">${icon("minus", "sm")}</button>` : ""}
                ${i === sets.length - 1 ? `<button type="button" class="btn sm" data-l="add" aria-label="${esc(t("Add set"))}" title="${esc(t("Add set"))}">${icon("plus", "sm")} ${t("Add set")}</button>` : ""}
              </span>
            </div>`
          )
          .join("")}
      </div>
      ${doneBtn ? `<div class="btn-row">${doneBtn}</div>` : ""}`;
    } else if (type === "cardio" || (type === "check" && target.minutes != null)) {
      const c = l.cardio || {};
      const isCheck = type === "check";
      const min = c.min ?? defaults.min ?? "";
      const minPlan = c.min == null && defaults.min != null;
      body += `<div class="grid-form cardio-form${isCheck ? " one" : ""}">
          <div class="field inline"><span>${t("Minutes")}</span><input class="input num" inputmode="decimal" data-c="min" aria-label="${esc(t("Minutes"))}" value="${esc(min)}" placeholder="${esc(target.minutes || "")}"${minPlan ? ` data-default="true" title="${esc(t("Plan default"))}"` : ""}><span class="timer-slot"></span>${target.minutes ? `<button type="button" class="btn sm${ctx.guided ? " icon-only" : ""} timer-start" data-l="countdown" aria-label="${esc(t("Start {minutes} minute timer", { minutes: target.minutes }))}" title="${esc(t("Start {minutes} minute timer", { minutes: target.minutes }))}">${icon("timer", "sm")}${ctx.guided ? "" : ` ${t("Timer")}`}</button>` : ""}</div>
          ${isCheck ? "" : `<label class="field inline"><span>${t("Avg bpm")}</span><input class="input num" inputmode="numeric" data-c="avg" value="${esc(c.avg ?? "")}" placeholder="${esc(bpmRange(p, ...cardioRange).replace(" bpm", ""))}"></label>
          <label class="field inline"><span>${t("Max bpm")}</span><input class="input num" inputmode="numeric" data-c="max" value="${esc(c.max ?? "")}"></label>`}
        </div>
        <div class="btn-row">${doneBtn}</div>`;
    } else if (type === "intervals") {
      const presets = timerPresets(item, level);
      const pi = Math.min(l.preset || 0, Math.max(0, presets.length - 1));
      if (item.ex === "shortint") body += `<div class="grid-form">${[0, 1].map((index) => `<label class="field"><span>${index ? t("Alternate with (optional)") : t("Movement for work bursts")}</span><select class="input" data-interval-move="${index}">${index ? `<option value="">${t("Same movement every burst")}</option>` : ""}${INTERVAL_MOVES.map((id) => `<option value="${id}" ${(l.moves?.[index] || (index === 0 ? "highknees" : "")) === id ? "selected" : ""}>${esc(EXERCISES[id].name)}</option>`).join("")}</select></label>`).join("")}</div><p class="muted interval-choice-help">${t("Each work burst uses one movement. Pick an alternate to switch movements each round: first → march → alternate → march.")}</p>`;
      body += `${presets.length > 1 ? `<div class="seg" role="group" aria-label="${esc(t("Preset"))}">${presets.map((pr, i) => `<button type="button" data-preset="${i}" aria-pressed="${i === pi}">${esc(pr.label)}</button>`).join("")}</div>` : ""}
        <div class="grid-form" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="field inline"><span>${t("Hard intervals done")}</span><input class="input num" inputmode="numeric" data-r="rounds" aria-label="${esc(t("Hard intervals done"))}" value="${esc(l.rounds ?? defaults.rounds ?? "")}"${l.rounds == null && defaults.rounds != null ? ` data-default="true" title="${esc(t("Plan default"))}"` : ""} placeholder="${presets[pi] ? presets[pi].rounds * (presets[pi].blocks || 1) : ""}"><span class="timer-slot"></span><button type="button" class="btn sm${ctx.guided ? " icon-only" : ""} timer-start" data-l="intervals" aria-label="${esc(t("Start interval timer"))}" title="${esc(t("Start interval timer"))}">${icon("timer", "sm")}${ctx.guided ? "" : ` ${t("Timer")}`}</button></div>
          <label class="field inline"><span>${t("Peak bpm")}</span><input class="input num" inputmode="numeric" data-r="peak" value="${esc(l.peak ?? "")}"></label>
        </div>
        ${doneBtn ? `<div class="btn-row">${doneBtn}</div>` : ""}`;
    } else {
      // Unmeasured checks keep the plain done action.
      body += `<div class="btn-row">${doneBtn}</div>`;
    }

    if (l.easier) {
      const label = l.easier.choice === "skip" ? t("Skipped today") : t("Easier today");
      body += `<div class="banner easier"><span>${icon("info", "lg")}</span><div class="grow"><b>${esc(label)}</b><span>${esc(l.easier.text || "")}</span></div><button type="button" class="btn sm ghost" data-l="easier-undo">${icon("undo", "sm")} ${t("Undo")}</button></div>`;
    }
    const nextTime = suggestionHtml(l.holdProgress ? { kind: "repeat", text: t("Progression paused today after the easier choice. Repeat this session next time.") } : suggestion);
    if (ctx.nextTimeHost) ctx.nextTimeHost.innerHTML = nextTime;
    else body += nextTime;
    const easierButton = `<button type="button" class="btn sm ghost" data-l="easier" aria-label="${esc(l.easier ? t("Change easier choice") : t("Something hurts or too hard?"))}" title="${esc(t("Something hurts or too hard?"))}">${icon("info", "sm")} ${l.easier ? t("Change easier choice") : ctx.compactActions ? t("Something hurts?") : t("Something hurts or too hard?")}</button>`;
    const last = type !== "check" && type !== "cardio" && type !== "intervals" ? lastPerformance(item.ex, date, { level }) : null;
    body += last ? `<p class="muted last-time" style="font-size:0.84rem">${t("Last time ({date}):", { date: esc(fmtShort(last.date)) })} <span class="mono">${esc(summarizeLog(last.log, type))}</span> <button type="button" class="btn sm ghost" data-l="use-last">${icon("check", "sm")} ${t("Use these values")}</button></p>` : "";
    const noteField = `<textarea class="input" data-l="note" aria-label="${esc(t("Note for this exercise"))}" rows="2" placeholder="${esc(t("Note how it felt, any pain or a technique cue to remember."))}">${esc(l.note || "")}</textarea>`;
    const notePanel = `<div class="note-panel">${noteField}<div class="note-easier">${easierButton}</div></div>`;
    if (ctx.noteHost) ctx.noteHost.innerHTML = notePanel;
    body += ctx.noteHost
      ? ""
      : ctx.compactActions
        ? `<div class="logger-actions">${doneButton}<button type="button" class="btn sm ghost${l.note ? " has-note" : ""}" data-l="note-toggle" aria-label="${esc(t("Note for this exercise"))}" aria-expanded="${!!l.note}">${icon("note", "sm")} ${t("Note")}</button>${typeof ctx.extraActions === "function" ? ctx.extraActions() : ctx.extraActions || ""}</div><div class="note-panel" data-note-panel${l.note ? "" : " hidden"}>${noteField}<div class="note-easier">${easierButton}</div></div>`
        : `<details ${l.note ? "open" : ""}><summary class="muted" style="cursor:pointer;font-size:0.86rem">${icon("note", "sm")} ${t("Note for this exercise")}</summary>${notePanel}</details>`;
    container.innerHTML = `<div class="logger${ctx.compactActions ? " compact-actions" : ""}${ctx.guided ? " guided-logger" : ""}">${body}</div>`;
  }

  // The next-time line turns the plan's progression rule into one clear action.
  function suggestionHtml(rec) {
    if (!rec) return "";
    const value = rec.kg != null ? fmtWeight(p, rec.kg) : rec.reps != null ? t("{count} reps", { count: rec.reps }) : rec.seconds != null ? `${rec.seconds} s` : "";
    const kind = rec.kg != null ? "kg" : rec.reps != null ? "reps" : rec.seconds != null ? "sec" : null;
    const raw = rec.kg != null ? rec.kg : rec.reps != null ? rec.reps : rec.seconds;
    const use = kind && raw != null ? `<button type="button" class="btn sm" data-l="use" data-use-kind="${kind}" data-use-value="${raw}">${icon("check", "sm")} ${t("Use {value}", { value: esc(value) })}</button>` : "";
    return `<div class="next-time" data-kind="${esc(rec.kind)}">
      <div class="grow"><span class="eyebrow">${t("Next time")}</span><p>${esc(rec.text)}</p></div>
      ${use}
    </div>`;
  }

  // One tap to an easier version of today's dose, using only options already in
  // the plan. Progression pauses after this so the next-time line stays safe.
  function openEasier() {
    const hasEasier = !!ex.easier;
    const prevName = level > 0 ? LEVELS[level - 1].name : null;
    const prevRaw = level > 0 ? rxFor(item, level - 1) : null;
    const prevRx = prevRaw && prevRaw !== "—" ? personalize(prevRaw, p) : null;
    const content = document.createElement("div");
    content.className = "easier-dialog";
    content.style.display = "grid";
    content.style.gap = "12px";
    content.innerHTML = `<p class="muted">${t("Bryan's rule: injury prevention comes first. Swap to the easier variant whenever a joint complains; never train through sharp pain.")}</p>
      <div class="reason-grid">
        <button type="button" data-easy-reason="hard" aria-pressed="false">${icon("battery")} ${t("Too hard today")}</button>
        <button type="button" data-easy-reason="joint" aria-pressed="false">${icon("bandage")} ${t("A joint hurts")}</button>
      </div>
      <div data-easy-options hidden>
        ${hasEasier ? `<button type="button" class="choice" data-easy-choice="version"><b>${t("Use the easier version")}</b><small>${esc(personalize(ex.easier, p))}</small></button>` : ""}
        ${prevRx ? `<button type="button" class="choice" data-easy-choice="dose"><b>${t("Use the easier dose")}</b><small>${esc(prevName)}: ${esc(prevRx)}</small></button>` : ""}
        ${ctx.manualCompletion ? "" : `<button type="button" class="choice" data-easy-choice="skip"><b>${t("Skip this exercise today")}</b><small>${t("Today's dose only; the rest of the session is unchanged.")}</small></button>`}
        <p class="muted" data-easy-advice hidden>${t("Sharp pain, tingling, numbness or a joint that gives way: stop this movement and get it checked before training it again.")}</p>
      </div>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-easy-cancel>${t("Cancel")}</button></div>`;
    const d = openDialog({ title: t("Make today easier"), content, sheet: false });
    let reason = null;
    content.addEventListener("click", (e) => {
      const r = e.target.closest("[data-easy-reason]");
      if (r) {
        reason = r.dataset.easyReason;
        content.querySelectorAll("[data-easy-reason]").forEach((x) => x.setAttribute("aria-pressed", String(x === r)));
        content.querySelector("[data-easy-options]").hidden = false;
        if (reason === "joint") content.querySelector("[data-easy-advice]").hidden = false;
        return;
      }
      if (e.target.closest("[data-easy-cancel]")) return d.close();
      const c = e.target.closest("[data-easy-choice]");
      if (!c || !reason) return;
      const choice = c.dataset.easyChoice;
      const text = choice === "version" ? personalize(ex.easier, p) : choice === "dose" ? `${prevName}: ${prevRx}` : t("Skipped today");
      save((l) => {
        l.easier = { reason, choice, text, at: new Date().toISOString() };
        l.holdProgress = true;
        if (choice === "dose" && level > 0) l.rxOverride = rxFor(item, level - 1);
        if (choice === "skip") {
          l.skipped = true;
          l.done = false;
        }
      });
      d.close();
      draw();
      toast(choice === "skip" ? t("Exercise skipped today") : t("Easier version logged for today"));
    });
  }

  const save = (fn) => {
    editItem(date, scope, item, (l) => {
      const { done, skipped } = l;
      fn(l);
      if (ctx.manualCompletion) Object.assign(l, { done, skipped });
    });
    if (ctx.onChange) ctx.onChange();
  };

  function saveNote(value) {
    save((l) => {
      l.note = value;
    });
    container.querySelector('[data-l="note-toggle"]')?.classList.toggle("has-note", !!value);
  }

  container.addEventListener("input", (e) => {
    const t = e.target;
    if (t.removeAttribute) t.removeAttribute("data-default");
    if (t.dataset.set != null) {
      const i = Number(t.dataset.set);
      const k = t.dataset.k;
      save((l) => {
        l.sets = l.sets || [];
        while (l.sets.length <= i) l.sets.push({});
        if (k === "band" || k === "bandCustom") {
          l.sets[i][k] = t.value || null;
          return;
        }
        const v = num(t.value);
        l.sets[i][k] = v == null ? null : k === "kg" ? fromUnit(v) : v;
        if (v != null && ctx.setIndex == null) l.done = true;
      });
    } else if (t.dataset.c) {
      save((l) => {
        l.cardio = l.cardio || {};
        l.cardio[t.dataset.c] = num(t.value);
        if (num(t.value) != null) l.done = true;
      });
    } else if (t.dataset.r) {
      save((l) => {
        l[t.dataset.r] = num(t.value);
        if (t.dataset.r === "rounds" && num(t.value)) l.done = true;
      });
    } else if (t.dataset.l === "note") {
      saveNote(t.value);
    }
    refreshDoneButton();
  });

  // In guided mode the note lives in its own collapsed panel outside the
  // logger, so its events are handled on that host.
  if (ctx.noteHost) {
    ctx.noteHost.addEventListener("input", (e) => {
      if (e.target.matches('[data-l="note"]')) saveNote(e.target.value);
    });
    ctx.noteHost.addEventListener("click", (e) => {
      if (e.target.closest('[data-l="easier"]')) openEasier();
    });
  }
  if (ctx.nextTimeHost) {
    ctx.nextTimeHost.onclick = (e) => {
      const b = e.target.closest('[data-l="use"]');
      if (b) useSuggestion(b);
    };
  }

  // Rest timer after you log the reps of a set.
  container.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.k === "band") {
      save((l) => {
        l.sets = l.sets || [];
        while (l.sets.length <= Number(t.dataset.set)) l.sets.push({});
        l.sets[Number(t.dataset.set)].band = t.value || null;
      });
      draw();
      return;
    }
    if (t.dataset.intervalMove != null) {
      const index = Number(t.dataset.intervalMove);
      if (![0, 1].includes(index) || (t.value && !INTERVAL_MOVES.includes(t.value))) return;
      save((l) => { l.moves = Array.isArray(l.moves) ? l.moves : ["highknees"]; l.moves[index] = t.value; });
      draw();
    }
    if (["reps", "sec"].includes(t.dataset.k) && num(t.value) != null && (!p.settings || p.settings.autoRest !== false)) startRest(restSec, { itemId: item.id, scope, setIndex: Number(t.dataset.set) });
  });

  function currentTarget() {
    const l = getItemLog(date, scope, item.id) || {};
    return parseRx(personalize(l.rxOverride || rxFor(item, level), p));
  }

  function refreshDoneButton() {
    const l = getItemLog(date, scope, item.id) || {};
    const b = container.querySelector('[data-l="done"]');
    if (b) {
      b.classList.toggle("primary", !!l.done);
      b.setAttribute("aria-pressed", String(!!l.done));
      b.innerHTML = `${icon("check")} ${l.done || ctx.compactActions ? t("Done") : t("Mark done")}`;
    }
  }

  function startHoldTimer(i, host = null) {
    const t = currentTarget();
    const secs = t.seconds || 30;
    startHold({
      title: ex.name,
      host,
      mini: !!host,
      voiceContext: voiceRequest(item, level, getItemLog(date, scope, item.id) || {}, restSec),
      seconds: secs,
      sides: t.perSide ? 2 : 1,
      onFinish: () => {
        save((l) => {
          if (type === "hold" || type === "carry" || type === "check") {
            l.sets = l.sets || [];
            while (l.sets.length <= i) l.sets.push({});
            if (l.sets[i].sec == null) l.sets[i].sec = secs;
          }
          if (ctx.setIndex == null) l.done = true;
        });
        draw();
      },
    });
  }

  function startCountdownTimer(host = null) {
    const t = currentTarget();
    startCountdown({
      title: ex.name,
      host,
      mini: !!host,
      voiceContext: voiceRequest(item, level, getItemLog(date, scope, item.id) || {}, restSec),
      minutes: t.minutes,
      sub: `${cardioLabel}: ${bpmRange(p, ...cardioRange)}`,
      onFinish: () => {
        save((l) => {
          l.cardio = l.cardio || {};
          if (l.cardio.min == null) l.cardio.min = t.minutes;
          l.done = true;
        });
        draw();
      },
    });
  }

  function startIntervalsTimer(host = null) {
    const presets = timerPresets(item, level);
    const l0 = getItemLog(date, scope, item.id) || {};
    const preset = presets[Math.min(l0.preset || 0, presets.length - 1)];
    if (!preset) return;
    const hr = { work: preset.workHr ? bpmRange(p, ...preset.workHr) : "", rest: preset.restHr ? bpmRange(p, ...preset.restHr) : "" };
    startIntervals({
      title: `${ex.name} · ${preset.label}`,
      host,
      mini: !!host,
      voiceContext: voiceRequest(item, level, l0, restSec),
      presetIndex: Math.min(l0.preset || 0, presets.length - 1),
      exId: item.ex, moves: l0.moves,
      preset,
      hr,
      onFinish: (rounds) => {
        save((l) => {
          l.rounds = rounds;
          l.done = true;
        });
        draw();
      },
    });
  }

  function useSuggestion(b) {
    const kind = b.dataset.useKind;
    const v = Number(b.dataset.useValue);
    const target = currentTarget();
    save((l) => {
      l.sets = l.sets || [];
      const n = Math.max(l.sets.length, target.sets || 1);
      while (l.sets.length < n) l.sets.push({});
      for (const s of l.sets) {
        if (kind === "kg" && s.kg == null) s.kg = v;
        else if (kind === "reps" && s.reps == null) s.reps = v;
        else if (kind === "sec" && s.sec == null) s.sec = v;
      }
    });
    draw();
    toast(t("Filled in the suggestion"));
  }

  // Copy last time's sets over the plan defaults, set by set. When today has
  // more sets than last time, the extra ones repeat the last logged set.
  function useLast() {
    const last = lastPerformance(item.ex, date, { level });
    const rows = (last?.log.sets || []).filter((s) => s.reps != null || s.kg != null || s.sec != null);
    if (!rows.length) return;
    const target = currentTarget();
    save((l) => {
      l.sets = l.sets || [];
      const n = Math.max(l.sets.length, target.sets || 1, ctx.setIndex == null ? rows.length : 0);
      while (l.sets.length < n) l.sets.push({});
      l.sets.forEach((s, i) => {
        if (!showsSet(i, ctx.setIndex, target.sets || 1)) return;
        const from = rows[i] || rows[rows.length - 1];
        for (const k of ["reps", "sec", "kg", "band", "bandCustom"]) if (from[k] != null) s[k] = from[k];
      });
    });
    draw();
    toast(t("Filled in last time's values"));
  }

  container.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const a = b.dataset.l;
    if (a === "note-toggle") {
      const panel = container.querySelector("[data-note-panel]");
      if (!panel) return;
      panel.hidden = !panel.hidden;
      b.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) panel.querySelector('[data-l="note"]')?.focus();
    } else if (a === "done") {
      if (!(getItemLog(date, scope, item.id) || {}).done) fillDefaults({ date, scope, item, ex, level });
      save((l) => {
        l.done = !l.done;
        if (l.done) l.skipped = false;
      });
      draw();
    } else if (a === "easier") {
      openEasier();
    } else if (a === "easier-undo") {
      save((l) => {
        delete l.easier;
        delete l.rxOverride;
        l.skipped = false;
        l.holdProgress = false;
      });
      draw();
      toast(t("Back to the plan's dose for today"));
    } else if (a === "use") {
      useSuggestion(b);
    } else if (a === "use-last") {
      useLast();
    } else if (a === "add") {
      const target = currentTarget();
      save((l) => {
        const n = Math.max(l.sets ? l.sets.length : 0, target.sets || 1);
        l.sets = l.sets || [];
        while (l.sets.length < n) l.sets.push({});
        l.sets.push({});
      });
      draw();
      const sets = container.querySelector(".sets");
      if (sets) sets.scrollTop = sets.scrollHeight;
    } else if (a === "del") {
      const i = Number(b.dataset.i);
      save((l) => {
        if (l.sets && l.sets.length > i) l.sets.splice(i, 1);
      });
      draw();
    } else if (a === "hold") {
      const slot = b.closest(".set-row, .field")?.querySelector(".timer-slot");
      startHoldTimer(Number(b.dataset.i), slot);
    } else if (a === "countdown") {
      const slot = b.closest(".field")?.querySelector(".timer-slot");
      startCountdownTimer(slot);
    } else if (a === "intervals") {
      const slot = b.closest(".field")?.querySelector(".timer-slot");
      startIntervalsTimer(slot);
    } else if (b.dataset.preset != null) {
      save((l) => {
        l.preset = Number(b.dataset.preset);
      });
      draw();
    }
  });

  draw();
  return { redraw: draw };
}
