// Logging UI for one exercise on one day: sets × reps × load, holds with a timer,
// cardio minutes and heart rate, or interval rounds. Everything auto-saves.

import { EXERCISES } from "../data/exercises.js";
import { INTERVAL_MOVES } from "../data/routines.js";
import { state } from "../store.js";
import { editDay, itemLog, loggedExerciseId, logLevel, rxFor, timerPresets } from "../plan.js";
import { LEVELS, bpmRange, fmtWeight, kgUnit, personalize, suggestedKg } from "../personalize.js";
import { esc, fmtShort } from "../util.js";
import { icon } from "./icons.js";
import { openDialog, toast } from "./ui.js";
import { startCountdown, startHold, startIntervals, startRest } from "./timer.js";
import { voiceRequest } from "../voice/player.js";

// "3 × 8–10 @ …" → { sets: 3, reps: "8–10", seconds: null, perSide: false }
// A load such as "12–16 kg" is not a rep count, so it is removed before the
// prescription is read.
export function parseRx(rx) {
  const raw = rx || "";
  const t = raw.replace(/\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:kg|lb)\b/gi, " ");
  const out = { sets: 1, reps: "", seconds: null, minutes: null, perSide: /\/(side|leg|arm)\b/.test(raw), unit: "" };
  const m = /(\d+)\s*×\s*(\d+)(?:–(\d+))?\s*(s\b|min\b)?/.exec(t);
  if (m) {
    out.sets = Number(m[1]);
    if (m[4] === "s") out.seconds = Number(m[3] || m[2]);
    else if (m[4] === "min") out.minutes = Number(m[2]);
    else out.reps = m[3] ? `${m[2]}–${m[3]}` : m[2];
  } else {
    const r = /(\d+)(?:–(\d+))?\s*reps?\b/.exec(t);
    if (r) out.reps = r[2] ? `${r[1]}–${r[2]}` : r[1];
    const s = /(\d+)(?:–(\d+))?\s*s\b/.exec(t);
    if (s) out.seconds = Number(s[2] || s[1]);
    const mi = /(\d+)(?:–(\d+))?\s*min\b/.exec(t);
    if (mi) out.minutes = Number(mi[1]);
    if (/fatigue/.test(raw)) out.reps = "max";
    else if (!out.reps && out.seconds == null && out.minutes == null) {
      // "10/leg", "10 forward", "3 circles" and "10 breaths" are rep counts too.
      const lead = /^\s*(?:≈\s*)?(\d+)(?:[.,]\d+)?(?:\s*[–-]\s*(\d+))?/.exec(raw);
      if (lead) out.reps = lead[2] ? `${lead[1]}–${lead[2]}` : lead[1];
    }
  }
  if (/breath/i.test(raw)) out.unit = "breaths";
  else if (/circles?/i.test(raw)) out.unit = "circles";
  return out;
}

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

const topText = (n, what = "sessions") => `${n} of 2 ${what} at the top of the range`;

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
    if (!last) return { kind: "start", seconds: top, text: `Hold ${top} s and build from there.` };
    if (last.log.holdProgress) return { kind: "repeat", seconds: top, text: `Repeat ${top} s — progression is paused after the easier session.` };
    if (count >= 2) return { kind: "add", seconds: top + 5, text: `Try ${top + 5} s next time — ${topText(count, "holds")}.` };
    return { kind: "repeat", seconds: top, text: `Hold ${top} s again — ${topText(count, "holds")}; two in a row unlock more time.` };
  }

  if (ex.log === "carry") {
    const secs = topValue(target, "seconds");
    const lastKg = topKg(last && last.log);
    const suggested = suggestedKg(rx, p);
    const count = topCountFor(hist, target, "sec");
    if (!last) return suggested != null ? { kind: "start", kg: suggested, seconds: secs, text: `Start around ${showKg(p, suggested)} for ${secs || 30} s.` } : null;
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? `Repeat ${showKg(p, lastKg)} — progression is paused after the easier session.` : `Repeat the same hold — progression is paused after the easier session.` };
    if (count >= 2 && lastKg) return { kind: "add", kg: lastKg + 1, seconds: secs, text: `Try ${showKg(p, lastKg + 1)} next time — ${topText(count, "holds")}.` };
    return { kind: "repeat", kg: lastKg || null, seconds: secs, text: lastKg ? `Repeat ${showKg(p, lastKg)} — ${topText(count, "holds")}; two in a row unlock the next step.` : `Repeat the same hold — ${topText(count, "holds")}; two in a row unlock the next step.` };
  }

  if (ex.log === "load") {
    const top = topValue(target, "reps");
    const suggested = suggestedKg(rx, p);
    if (!last) {
      if (suggested == null) return null;
      return { kind: "start", kg: suggested, text: `Start around ${showKg(p, suggested)} — adjust so you finish with the reps your level recommends.` };
    }
    const lastKg = topKg(last.log);
    const count = topCountFor(hist, target, "reps");
    if (!lastKg) {
      if (top) return { kind: "repeat", reps: top, text: `Aim for ${top} reps and add reps before adding weight — ${topText(count)}.` };
      return null;
    }
    if (last.log.holdProgress) return { kind: "repeat", kg: lastKg, text: `Repeat ${showKg(p, lastKg)} — progression is paused after the easier session.` };
    if (top && count >= 2) {
      const inc = ex.cat === "Legs & knees" ? 2 : 1;
      let kg = lastKg + inc;
      const max = Number(p && p.maxDumbbellKg) || null;
      let note = "";
      if (max && kg > max) {
        kg = max;
        note = " You are at your heaviest dumbbell: aim for one more rep instead.";
      }
      return { kind: "add", kg, text: `Try ${showKg(p, kg)} next time — ${topText(count)}.${note}` };
    }
    return { kind: "repeat", kg: lastKg, text: `Repeat ${showKg(p, lastKg)} — ${topText(count)}; two in a row unlock the next jump.` };
  }

  // Bodyweight reps.
  const top = topValue(target, "reps");
  if (!top) return null;
  const count = topCountFor(hist, target, "reps");
  if (!last) return { kind: "start", reps: top, text: `Aim for ${top} reps.` };
  if (last.log.holdProgress) return { kind: "repeat", reps: top, text: `Repeat ${top} reps — progression is paused after the easier session.` };
  if (count >= 2) return { kind: "add", reps: top + 1, text: `Try ${top + 1} reps next time — ${topText(count)}.` };
  return { kind: "repeat", reps: top, text: `Aim for ${top} reps again — ${topText(count)}; two in a row unlock the next step.` };
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
      if (setIndex != null && i !== setIndex) continue;
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
        return a + b;
      });
    if (parts.length) return parts.join(" · ");
  }
  if (l.cardio && (l.cardio.min || l.cardio.avg)) return [l.cardio.min && `${l.cardio.min} min`, l.cardio.avg && `avg ${l.cardio.avg} bpm`].filter(Boolean).join(" · ");
  if (l.rounds) return `${l.rounds} rounds${l.peak ? ` · peak ${l.peak} bpm` : ""}`;
  return "";
}

export function renderLogger(container, ctx) {
  const { date, item, ex, level, scope = "main" } = ctx;
  const p = state.profile;
  const type = ex.log;
  const u = kgUnit(p);
  const restSec = item.id === "fri-strength-rdl" && level === 3 ? 25 : (p && p.settings && p.settings.restSec) || 75;
  const cardioRange = item.intensity === "light" ? [50, 60] : ex.intensity === "hard" ? [80, level === 1 ? 85 : 90] : [60, 70];
  const cardioLabel = item.intensity === "light" ? "Easy pace" : ex.intensity === "hard" ? "Vigorous" : "Zone 2";

  function draw() {
    const l = getItemLog(date, scope, item.id) || {};
    const done = !!l.done;
    // An easier choice made today changes only today's displayed dose.
    const rxText = personalize(l.rxOverride || rxFor(item, level), p);
    const target = parseRx(rxText);
    if (ctx.onDraw) ctx.onDraw(l);
    const suggestion = nextTimeRecommendation({ item, ex, level, date });
    const defaults = planDefaults({ item, ex, level, date, target, type, log: l });
    const checkLabel = target.unit === "breaths" ? "Breaths" : target.unit === "circles" ? "Circles" : "Reps";
    const timedCheck = type === "check" && target.seconds != null;
    const setType = ["reps", "load", "hold", "carry"].includes(type) || (type === "check" && target.minutes == null);
    let body = "";
    if (type === "none") {
      container.innerHTML = `<p class="muted">Choose movements from this list for your intervals, then record them in the interval block.</p>`;
      return;
    }
    const doneButton = ctx.manualCompletion ? "" : `<button type="button" class="btn ${done ? "primary" : ""}" data-l="done" aria-pressed="${done}">${icon("check")} ${done || ctx.compactActions ? "Done" : "Mark done"}</button>`;
    const doneBtn = ctx.compactActions ? "" : doneButton;

    if (setType) {
      const cols = [];
      if (type === "reps" || type === "load" || (type === "check" && !timedCheck)) cols.push(["reps", checkLabel, target.reps || ""]);
      if (type === "hold" || type === "carry" || timedCheck) cols.push(["sec", "Seconds", target.seconds || ""]);
      if (type === "load" || type === "carry") cols.push(["kg", u, ""]);
      const timed = type === "hold" || type === "carry" || timedCheck;
      const n = Math.max(l.sets ? l.sets.length : 0, target.sets || 1);
      const sets = Array.from({ length: n }, (_, i) => (l.sets && l.sets[i]) || {});
      body += `<div class="sets">
        ${sets
          .map(
            (s, i) => ctx.setIndex != null && i !== ctx.setIndex ? "" : `<div class="set-row">
              <span class="n">Set ${i + 1}</span>
              ${cols
                .map(([k, label, ph]) => {
                  const plan = defaults[k];
                  const blank = s[k] == null;
                  const v = blank ? (plan ?? "") : k === "kg" ? toUnit(s[k]) : s[k];
                  const isPlan = blank && plan != null;
                  const planText = k === "kg" ? fmtWeight(p, plan) : k === "sec" ? `${plan} s` : `${plan}`;
                  const hint = isPlan ? `Plan default: ${planText}` : ph ? `Plan: ${ph}` : "";
                  return `<label class="set-field"><span>${esc(label)}</span><input class="input num" inputmode="decimal" data-set="${i}" data-k="${k}" value="${esc(v)}" placeholder="${esc(ph && !isPlan ? ph : "")}"${isPlan ? ' data-default="true"' : ""}${hint ? ` title="${esc(hint)}"` : ""} aria-label="Set ${i + 1} ${esc(label)}"></label>`;
                })
                .join("")}
              <span class="set-actions">
                ${
                  timed && !ctx.guided
                    ? `<button type="button" class="btn sm icon-only" data-l="hold" data-i="${i}" aria-label="Start ${defaults.sec || target.seconds || 30} second timer for set ${i + 1}">${icon("timer", "sm")}</button>`
                    : ""
                }
                ${sets.length > 1 ? `<button type="button" class="btn sm icon-only ghost" data-l="del" data-i="${i}" aria-label="Remove set ${i + 1}">${icon("minus", "sm")}</button>` : ""}
                ${i === sets.length - 1 && ctx.setIndex == null ? `<button type="button" class="btn sm icon-only" data-l="add" aria-label="Add set" title="Add set">${icon("plus", "sm")}</button>` : ""}
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
          <label class="field inline"><span>Minutes</span><input class="input num" inputmode="decimal" data-c="min" value="${esc(min)}" placeholder="${esc(target.minutes || "")}"${minPlan ? ' data-default="true" title="Plan default"' : ""}></label>
          ${isCheck ? "" : `<label class="field inline"><span>Avg bpm</span><input class="input num" inputmode="numeric" data-c="avg" value="${esc(c.avg ?? "")}" placeholder="${esc(bpmRange(p, ...cardioRange).replace(" bpm", ""))}"></label>
          <label class="field inline"><span>Max bpm</span><input class="input num" inputmode="numeric" data-c="max" value="${esc(c.max ?? "")}"></label>`}
        </div>
        <div class="btn-row">${doneBtn}${target.minutes && !ctx.guided ? `<button type="button" class="btn" data-l="countdown">${icon("timer")} ${target.minutes} min timer</button>` : ""}</div>`;
    } else if (type === "intervals") {
      const presets = timerPresets(item, level);
      const pi = Math.min(l.preset || 0, Math.max(0, presets.length - 1));
      if (item.ex === "shortint") body += `<div class="grid-form">${[0, 1].map((index) => `<label class="field"><span>${index ? "Alternate with (optional)" : "Movement for work bursts"}</span><select class="input" data-interval-move="${index}">${index ? '<option value="">Same movement every burst</option>' : ""}${INTERVAL_MOVES.map((id) => `<option value="${id}" ${(l.moves?.[index] || (index === 0 ? "highknees" : "")) === id ? "selected" : ""}>${esc(EXERCISES[id].name)}</option>`).join("")}</select></label>`).join("")}</div><p class="muted interval-choice-help">Each work burst uses one movement. Pick an alternate to switch movements each round: first → march → alternate → march.</p>`;
      body += `${presets.length > 1 ? `<div class="seg" role="group" aria-label="Preset">${presets.map((pr, i) => `<button type="button" data-preset="${i}" aria-pressed="${i === pi}">${esc(pr.label)}</button>`).join("")}</div>` : ""}
        ${ctx.guided ? "" : `<div class="btn-row"><button type="button" class="btn primary" data-l="intervals">${icon("timer")} Start interval timer</button>${doneBtn}</div>`}
        <div class="grid-form" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <label class="field inline"><span>Hard intervals done</span><input class="input num" inputmode="numeric" data-r="rounds" value="${esc(l.rounds ?? defaults.rounds ?? "")}"${l.rounds == null && defaults.rounds != null ? ' data-default="true" title="Plan default"' : ""} placeholder="${presets[pi] ? presets[pi].rounds * (presets[pi].blocks || 1) : ""}"></label>
          <label class="field inline"><span>Peak bpm</span><input class="input num" inputmode="numeric" data-r="peak" value="${esc(l.peak ?? "")}"></label>
        </div>`;
    } else {
      // Unmeasured checks keep the plain done action.
      body += `<div class="btn-row">${doneBtn}</div>`;
    }

    if (l.easier) {
      const label = l.easier.choice === "skip" ? "Skipped today" : "Easier today";
      body += `<div class="banner easier"><span>${icon("info", "lg")}</span><div class="grow"><b>${esc(label)}</b><span>${esc(l.easier.text || "")}</span></div><button type="button" class="btn sm ghost" data-l="easier-undo">${icon("undo", "sm")} Undo</button></div>`;
    }
    body += suggestionHtml(l.holdProgress ? { kind: "repeat", text: "Progression paused today after the easier choice. Repeat this session next time." } : suggestion);
    const easierButton = `<button type="button" class="btn sm ghost" data-l="easier" aria-label="${l.easier ? "Change easier choice" : "Something hurts or too hard?"}" title="Something hurts or too hard?">${icon("info", "sm")} ${l.easier ? "Change easier choice" : ctx.compactActions ? "Something hurts?" : "Something hurts or too hard?"}</button>`;
    const last = type !== "check" && type !== "cardio" && type !== "intervals" ? lastPerformance(item.ex, date, { level }) : null;
    body += last ? `<p class="muted" style="font-size:0.84rem">Last time (${esc(fmtShort(last.date))}): <span class="mono">${esc(summarizeLog(last.log, type))}</span></p>` : "";
    const noteField = `<textarea class="input" data-l="note" aria-label="Note for this exercise" rows="2" placeholder="Note how it felt, any pain or a technique cue to remember.">${esc(l.note || "")}</textarea>`;
    const notePanel = `<div class="note-panel">${noteField}<div class="note-easier">${easierButton}</div></div>`;
    if (ctx.noteHost) ctx.noteHost.innerHTML = notePanel;
    body += ctx.noteHost
      ? ""
      : ctx.compactActions
        ? `<div class="logger-actions">${doneButton}<button type="button" class="btn sm ghost${l.note ? " has-note" : ""}" data-l="note-toggle" aria-label="Note for this exercise" aria-expanded="${!!l.note}">${icon("note", "sm")} Note</button></div><div class="note-panel" data-note-panel${l.note ? "" : " hidden"}>${noteField}<div class="note-easier">${easierButton}</div></div>`
        : `<details ${l.note ? "open" : ""}><summary class="muted" style="cursor:pointer;font-size:0.86rem">${icon("note", "sm")} Note for this exercise</summary>${notePanel}</details>`;
    container.innerHTML = `<div class="logger${ctx.compactActions ? " compact-actions" : ""}${ctx.guided ? " guided-logger" : ""}">${body}</div>`;
  }

  // The next-time line turns the plan's progression rule into one clear action.
  function suggestionHtml(rec) {
    if (!rec) return "";
    const value = rec.kg != null ? fmtWeight(p, rec.kg) : rec.reps != null ? `${rec.reps} reps` : rec.seconds != null ? `${rec.seconds} s` : "";
    const kind = rec.kg != null ? "kg" : rec.reps != null ? "reps" : rec.seconds != null ? "sec" : null;
    const raw = rec.kg != null ? rec.kg : rec.reps != null ? rec.reps : rec.seconds;
    const use = kind && raw != null ? `<button type="button" class="btn sm" data-l="use" data-use-kind="${kind}" data-use-value="${raw}">${icon("check", "sm")} Use ${esc(value)}</button>` : "";
    return `<div class="next-time" data-kind="${esc(rec.kind)}">
      <div class="grow"><span class="eyebrow">Next time</span><p>${esc(rec.text)}</p></div>
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
    content.innerHTML = `<p class="muted">Bryan's rule: injury prevention comes first. Swap to the easier variant whenever a joint complains; never train through sharp pain.</p>
      <div class="reason-grid">
        <button type="button" data-easy-reason="hard" aria-pressed="false">${icon("battery")} Too hard today</button>
        <button type="button" data-easy-reason="joint" aria-pressed="false">${icon("bandage")} A joint hurts</button>
      </div>
      <div data-easy-options hidden>
        ${hasEasier ? `<button type="button" class="choice" data-easy-choice="version"><b>Use the easier version</b><small>${esc(personalize(ex.easier, p))}</small></button>` : ""}
        ${prevRx ? `<button type="button" class="choice" data-easy-choice="dose"><b>Use the easier dose</b><small>${esc(prevName)}: ${esc(prevRx)}</small></button>` : ""}
        ${ctx.manualCompletion ? "" : `<button type="button" class="choice" data-easy-choice="skip"><b>Skip this exercise today</b><small>Today's dose only; the rest of the session is unchanged.</small></button>`}
        <p class="muted" data-easy-advice hidden>Sharp pain, tingling, numbness or a joint that gives way: stop this movement and get it checked before training it again.</p>
      </div>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-easy-cancel>Cancel</button></div>`;
    const d = openDialog({ title: "Make today easier", content, sheet: false });
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
      const text = choice === "version" ? personalize(ex.easier, p) : choice === "dose" ? `${prevName}: ${prevRx}` : "Skipped today";
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
      toast(choice === "skip" ? "Exercise skipped today" : "Easier version logged for today");
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

  // Rest timer after you log the reps of a set.
  container.addEventListener("change", (e) => {
    const t = e.target;
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
      b.innerHTML = `${icon("check")} ${l.done || ctx.compactActions ? "Done" : "Mark done"}`;
    }
  }

  function startHoldTimer(i, auto = false) {
    const t = currentTarget();
    const secs = t.seconds || 30;
    startHold({
      title: ex.name,
      host: ctx.timerHost,
      auto,
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
      onClose: showTimerPrompt,
    });
  }

  function startCountdownTimer(auto = false) {
    const t = currentTarget();
    startCountdown({
      title: ex.name,
      host: ctx.timerHost,
      auto,
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
      onClose: showTimerPrompt,
    });
  }

  function startIntervalsTimer(auto = false) {
    const presets = timerPresets(item, level);
    const l0 = getItemLog(date, scope, item.id) || {};
    const preset = presets[Math.min(l0.preset || 0, presets.length - 1)];
    if (!preset) return;
    const hr = { work: preset.workHr ? bpmRange(p, ...preset.workHr) : "", rest: preset.restHr ? bpmRange(p, ...preset.restHr) : "" };
    startIntervals({
      title: `${ex.name} · ${preset.label}`,
      host: ctx.timerHost,
      auto,
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
      onClose: showTimerPrompt,
    });
  }

  function timerPlan() {
    if (!ctx.timerHost) return null;
    const t = currentTarget();
    if (type === "intervals") {
      const presets = timerPresets(item, level);
      const l0 = getItemLog(date, scope, item.id) || {};
      const preset = presets[Math.min(l0.preset || 0, presets.length - 1)];
      if (!preset) return null;
      return { label: "Intervals", value: preset.label, sub: "Start when ready", start: () => startIntervalsTimer() };
    }
    if (type === "cardio" || (type === "check" && t.minutes != null)) {
      if (!t.minutes) return null;
      return { label: type === "cardio" ? cardioLabel : "Minutes", value: `${t.minutes} min`, sub: "Countdown", start: () => startCountdownTimer() };
    }
    if (type === "hold" || type === "carry" || (type === "check" && t.seconds != null)) {
      if (!t.seconds) return null;
      const l = getItemLog(date, scope, item.id) || {};
      const saved = Array.isArray(l.sets) ? l.sets : [];
      const sets = Math.max(saved.length, t.sets || 1);
      let index = ctx.setIndex;
      if (index == null) {
        const next = saved.findIndex((s) => s.sec == null);
        index = next >= 0 ? next : 0;
      }
      const details = [t.perSide ? "Both sides" : "", sets > 1 ? `Set ${index + 1} of ${sets}` : ""].filter(Boolean);
      return { label: "Hold", value: `${t.seconds} s`, sub: details.join(" · ") || "Start when ready", start: () => startHoldTimer(index) };
    }
    return null;
  }

  // A timed exercise shows one compact card in the guided right panel with a
  // Start button. It never starts by itself.
  function showTimerPrompt() {
    if (!ctx.timerHost || ctx.timerHost.querySelector(".timer")) return false;
    const plan = timerPlan();
    if (!plan) {
      ctx.timerHost.innerHTML = "";
      return false;
    }
    ctx.timerHost.innerHTML = `<div class="timer-prompt">
      <div class="timer-prompt-copy"><span class="eyebrow">${esc(plan.label)}</span><b class="mono">${esc(plan.value)}</b><small>${esc(plan.sub)}</small></div>
      <button type="button" class="btn sm primary" data-timer-start>${icon("play", "sm")} Start timer</button>
    </div>`;
    ctx.timerHost.querySelector("[data-timer-start]")?.addEventListener("click", plan.start);
    return true;
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
      toast("Back to the plan's dose for today");
    } else if (a === "use") {
      const kind = b.dataset.useKind;
      const v = Number(b.dataset.useValue);
      const t = currentTarget();
      save((l) => {
        l.sets = l.sets || [];
        const n = Math.max(l.sets.length, t.sets || 1);
        while (l.sets.length < n) l.sets.push({});
        for (const s of l.sets) {
          if (kind === "kg" && s.kg == null) s.kg = v;
          else if (kind === "reps" && s.reps == null) s.reps = v;
          else if (kind === "sec" && s.sec == null) s.sec = v;
        }
      });
      draw();
      toast("Filled in the suggestion");
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
      if (ctx.guided) showTimerPrompt();
    } else if (a === "del") {
      const i = Number(b.dataset.i);
      save((l) => {
        if (l.sets && l.sets.length > i) l.sets.splice(i, 1);
      });
      draw();
      if (ctx.guided) showTimerPrompt();
    } else if (a === "hold") {
      startHoldTimer(Number(b.dataset.i));
    } else if (a === "countdown") {
      startCountdownTimer();
    } else if (a === "intervals") {
      startIntervalsTimer();
    } else if (b.dataset.preset != null) {
      save((l) => {
        l.preset = Number(b.dataset.preset);
      });
      draw();
    }
  });

  draw();
  return { redraw: draw, showTimerPrompt };
}
