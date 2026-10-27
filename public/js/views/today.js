// Today (or any day): the session block by block, tick-offs and logging,
// optional add-ons, skip with a reason, swapping sessions, notes and extras.

import { DAYS } from "../data/program.js";
import { EXERCISES } from "../data/exercises.js";
import { onChange, state, updateDay, updateProfile } from "../store.js";
import {
  EXTRA_TYPES, SKIP_REASONS, addonProgress, addonsForDate, blockItems, blockMins, countable, currentReadiness, dayDef, dayMins,
  editDay, isRestKey, lastSessionDate, levelFor, progressOf, rxFor, sessionKeyFor, visible,
} from "../plan.js";
import { LEVELS, fmtWeight, kgUnit, levelIndex, personalize } from "../personalize.js";
import { addDays, daysBetween, esc, fmtDate, fmtShort, parseIso, todayIso, uid, weekStart, weekdayKey } from "../util.js";
import { EQUIPMENT_NAMES, icon } from "../components/icons.js";
import { createExercisePanel } from "../components/exercise-panel.js";
import { animBarOpen } from "../components/anim-bar.js";
import { hasAnimStyles } from "../anim-styles.js";
import { getItemLog, editItem, fillDefaults, summarizeLog } from "../components/logger.js";
import { deskState, deskStreak, doneDesk, pauseDesk, resumeDesk, snoozeDesk, startDesk, stopDesk, subscribeDesk } from "../components/desk.js";
import { mountLevelCheck } from "../components/level-check.js";
import { weekTargets } from "../week-targets.js";
import { confirmDialog, openDialog, ring, toast } from "../components/ui.js";
import { blockKind, detailMode, sessionKind } from "../themes.js";
import { unlockVoice } from "../voice/player.js";
import { t } from "../i18n.js";

const ENERGY = ["Very low", "Low", "OK", "Good", "Great"];
const STATUS_TEXT = { done: "Done", partial: "In progress", skipped: "Skipped" };

export function render(el, params) {
  const date = params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0]) ? params[0] : todayIso();
  const isToday = date === todayIso();
  let selected = null; // { scope, id }
  let panel = null;
  let showSkipped = false;
  let collapsedAddons = new Set();
  let lastStatus = state.days[date] ? state.days[date].status : null;
  const narrowView = window.matchMedia("(max-width: 1180px)");
  let panelMode = detailMode();

  const log = () => state.days[date] || null;
  const profile = () => state.profile;

  function context() {
    const key = sessionKeyFor(date);
    const def = dayDef(key);
    return { key, def, level: levelFor(date), rest: isRestKey(key), swapped: !!(log() && log().session && log().session !== weekdayKey(date)) };
  }

  // ---------- rendering ----------

  function itemRow(item, level, scope) {
    const ex = EXERCISES[item.ex];
    if (!ex) return "";
    const l = getItemLog(date, scope, item.id);
    const info = !countable(item);
    const name = item.label ? personalize(item.label, profile()) : ex.name;
    const sel = selected && selected.scope === scope && selected.id === item.id;
    const summary = summarizeLog(l, ex.log);
    const easier = l && l.easier ? `<div class="item-easier${l.skipped ? " skip" : ""}">${esc(l.skipped ? t("Skipped today") : t("Easier today: {text}", { text: l.easier.text || "" }))}</div>` : "";
    return `<li class="item${l && l.done ? " done" : ""}${l && l.skipped ? " skipped" : ""}${info ? " info" : ""}" data-scope="${esc(scope)}" data-id="${esc(item.id)}" aria-selected="${sel}"${info ? "" : ` tabindex="0" aria-label="${esc(t("{name}: open details", { name }))}"`}>
      ${info ? `<span aria-hidden="true" style="display:grid;place-items:center;color:var(--muted)">${icon("list")}</span>` : `<input type="checkbox" class="tick" data-tick ${l && l.done ? "checked" : ""} aria-label="${esc(t("Done: {name}", { name }))}">`}
      <div class="item-main">
        <div class="item-name">${esc(name)}${ex.classic ? ` <span class="badge-classic">${t("classic")}</span>` : ""}</div>
        <div class="item-rx">${esc(personalize((l && l.rxOverride) || rxFor(item, level), profile()))}</div>
        ${item.bryan ? `<div class="item-b">${esc(personalize(item.bryan, profile()))}</div>` : ""}
        <div class="item-log" data-summary>${esc(summary)}</div>
        ${easier}
      </div>
      <div class="item-side">${(ex.equipment || []).slice(0, 3).map((e) => `<span title="${esc(EQUIPMENT_NAMES[e] || e)}">${icon(e, "sm")}</span>`).join("")}${icon("chevronR", "sm")}</div>
    </li>`;
  }

  function itemRows(items, level, scope) {
    return items.map((item, index) => `${item.group && item.group !== items[index - 1]?.group ? `<li class="item-group">${esc(item.group)}</li>` : ""}${itemRow(item, level, scope)}`).join("");
  }

  function blocksHtml(def, level) {
    return def.blocks
      .map((b) => {
        const items = blockItems(b, level);
        if (!items.length) return "";
        return `<section class="card block" data-kind="${blockKind(b.name)}">
          <div class="block-head"><h3>${esc(b.name)}</h3><span class="eyebrow">${t("≈{count} min", { count: blockMins(b, level) })}</span></div>
          ${b.note ? `<p class="block-note">${esc(personalize(b.note, profile()))}</p>` : ""}
          <ul class="items">${itemRows(items, level, "main")}</ul>
        </section>`;
      })
      .join("");
  }

  function addonHtml(entry, level) {
    const { addon, variant, optional } = entry;
    const a = (log() && log().addons && log().addons[addon.id]) || {};
    const prog = addonProgress(log(), entry, level);
    const items = variant.items.filter((it) => visible(it, level));
    const metrics = (addon.metrics || [])
      .map((m) => {
        const v = a.metrics ? a.metrics[m.id] : null;
        const btns = [];
        for (let i = m.min; i <= m.max; i++) btns.push(`<button type="button" data-metric="${esc(m.id)}" data-v="${i}" aria-pressed="${v === i}">${i}</button>`);
        return `<div class="field"><span>${esc(m.label)} <small class="muted">(${esc(m.low)} → ${esc(m.high)})</small></span><div class="scale">${btns.join("")}</div></div>`;
      })
      .join("");
    const due = (addon.periodic || []).filter((pd) => isDue(addon.id, pd));
    const periodic = due
      .map((pd) => `<label class="banner hint" style="align-items:center"><input type="checkbox" class="tick" data-periodic="${esc(pd.id)}" ${a.periodic && a.periodic[pd.id] ? "checked" : ""}><span class="grow"><b>Due today</b><span>${esc(pd.label)}</span></span></label>`)
      .join("");
    return `<details class="card block addon-scope" data-addon="${esc(addon.id)}" ${collapsedAddons.has(addon.id) ? "" : "open"}>
      <summary class="block-head">
        <div class="addon-head">${icon(addon.icon || "sparkle", "lg")}<h3>${esc(addon.name)}</h3><span class="chip addon">${optional ? t("Optional today") : t("Add-on")}</span></div>
        <span class="addon-summary"><span class="eyebrow" data-addon-prog>${prog.skipped ? t("skipped") : t("{done}/{total} · ≈{mins} min", { done: prog.done, total: prog.total, mins: variant.mins })}</span>${icon("chevronD", "addon-chevron")}</span>
      </summary>
      <p class="block-note">${esc(variant.name)}. ${esc(variant.note || "")}</p>
      ${
        a.skipped
          ? `<div class="banner skip" style="margin:0 20px 16px"><div class="grow"><b>Skipped today</b>${a.skipReason ? `<span>${esc(a.skipReason)}</span>` : ""}</div><button type="button" class="btn sm" data-addon-unskip>${icon("undo", "sm")} Undo</button></div>`
          : `<ul class="items">${itemRows(items, level, addon.id)}</ul>
             <div style="padding:6px 20px 18px;display:grid;gap:14px">${metrics}${periodic}
               <div class="btn-row"><button type="button" class="btn sm" data-addon-all>${icon("check", "sm")} Mark all done</button><button type="button" class="btn sm ghost skip" data-addon-skip>${icon("skip", "sm")} Skip ${esc(addon.short || addon.name)} today</button></div>
             </div>`
      }
    </details>`;
  }

  // Desk breaks follows the other add-ons, with its own countdowns and daily count.
  function deskAddonHtml(entry) {
    if (date !== todayIso()) return "";
    const { addon, optional } = entry;
    const d = (log() && log().desk) || {};
    const total = (d.move || 0) + (d.squats || 0);
    return `<details class="card block desk-addon" data-addon="desk" ${collapsedAddons.has("desk") ? "" : "open"}>
      <summary class="block-head">
        <div class="addon-head">${icon(addon.icon || "clock", "lg")}<h3>${esc(addon.name)}</h3><span class="chip">${optional ? t("Optional today") : t("Add-on")}</span></div>
        <span class="addon-summary"><span class="eyebrow" data-desk-count-label>${total ? t("{count} logged today", { count: total }) : t("Not started")}</span>${icon("chevronD", "addon-chevron")}</span>
      </summary>
      <p class="block-note">${esc(addon.description)}</p>
      <div class="desk-inner" data-desk>${deskBodyHtml()}</div>
    </details>`;
  }

  function deskBodyHtml() {
    const ds = deskState();
    const d = (log() && log().desk) || {};
    const move = d.move || 0;
    const squats = d.squats || 0;
    const streak = deskStreak();
    const due = (kind) => ds.due.includes(kind) && !ds.paused;
    const timerRow = (kind, label, left, action) => {
      const isDue = due(kind);
      return `<div class="desk-timer${isDue ? " due" : ""}" data-desk-kind="${kind}">
        <span class="grow" data-desk-label="${kind}">${ds.paused ? label : isDue ? `${label} now` : label}</span>
        <b class="mono" data-desk-left="${kind}">${ds.paused ? t("paused") : isDue ? t("due") : left}</b>
        ${isDue ? `<button type="button" class="btn sm ghost" data-desk-snooze="${action}">${icon("clock", "sm")} ${t("Not now, 5 min")}</button>` : ""}
        <button type="button" class="btn sm" data-desk-${action}>${icon("check", "sm")} Done</button>
      </div>`;
    };
    return `<div class="desk-start">
        ${ds.paused ? `<div class="banner hint desk-paused"><span>${icon("pause", "lg")}</span><div class="grow"><b>Paused during your workout</b><span>The countdowns resume when the session is done.</span></div></div>` : ""}
        ${
          ds.running
            ? `<div class="desk-timers">
                ${timerRow("move", "Next stand-up", ds.nextMoveInText, "move")}
                ${timerRow("squats", "Next 10 squats", ds.nextSquatInText, "squats")}
              </div>
              <div class="btn-row"><button type="button" class="btn sm ghost" data-desk-stop>${icon("pause", "sm")} Stop</button></div>`
            : `<div class="btn-row"><button type="button" class="btn sm" data-desk-start>${icon("play", "sm")} Start desk mode</button></div>`
        }
        <div class="desk-counts muted">${t("Today: {move} move breaks · {squats} squat sets · {streak}-day streak", { move, squats, streak })}</div>
      </div>`;
  }

  // The countdown ticks every second, so update text in place: replacing the
  // whole box would replace its buttons mid-click. Rebuild only when the due,
  // paused or running state changes, or when start/stop/log needs new counts.
  function refreshDesk(rebuild = false) {
    const ds = deskState();
    el.querySelectorAll("[data-desk]").forEach((box) => {
      const sig = `${[...ds.due].sort().join(",")}|${ds.paused ? "p" : ""}|${ds.running ? "r" : ""}`;
      if (rebuild || box.dataset.sig !== sig || !box.querySelector("[data-desk-left]")) {
        box.innerHTML = deskBodyHtml();
        box.dataset.sig = sig;
        return;
      }
      const row = (kind, left, label) => {
        const isDue = ds.due.includes(kind) && !ds.paused;
        const el2 = box.querySelector(`[data-desk-kind="${kind}"]`);
        const value = box.querySelector(`[data-desk-left="${kind}"]`);
        const name = box.querySelector(`[data-desk-label="${kind}"]`);
        if (value) value.textContent = ds.paused ? "paused" : isDue ? "due" : left;
        if (name) name.textContent = ds.paused || !isDue ? label : `${label} now`;
        if (el2) el2.classList.toggle("due", isDue);
      };
      row("move", ds.nextMoveInText, "Next stand-up");
      row("squats", ds.nextSquatInText, "Next 10 squats");
    });
    const label = el.querySelector("[data-desk-count-label]");
    if (label) {
      const d = (log() && log().desk) || {};
      const total = (d.move || 0) + (d.squats || 0);
      label.textContent = total ? t("{count} logged today", { count: total }) : t("Not started");
    }
  }

  // Desk countdowns stay quiet while today's session is under way, then
  // resume once it is done (or skipped).
  function syncDeskPause() {
    if (date !== todayIso()) return;
    const s = log() && log().status;
    if (s === "partial") pauseDesk("session");
    else resumeDesk("session");
  }

  // A periodic check shows until done, then hides for `every` days.
  function isDue(addonId, pd) {
    if (date > todayIso()) return false;
    const here = log() && log().addons && log().addons[addonId] && log().addons[addonId].periodic;
    if (here && here[pd.id] != null) return true;
    const prior = Object.keys(state.days).filter((d) => d < date).sort().reverse();
    for (const d of prior) {
      const a = state.days[d].addons && state.days[d].addons[addonId];
      if (a && a.periodic && a.periodic[pd.id]) return daysBetween(d, date) >= pd.every;
    }
    return true;
  }

  function obsHtml() {
    const l = log() || {};
    const u = kgUnit(profile());
    const rpe = Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" aria-pressed="${l.rpe === i + 1}">${i + 1}</button>`).join("");
    const energy = ENERGY.map((e, i) => `<button type="button" data-energy="${i + 1}" aria-pressed="${l.energy === i + 1}">${esc(e)}</button>`).join("");
    const extras = (l.extras || [])
      .map(
        (x) => `<div class="extra-row" data-extra="${esc(x.id)}">
          <select class="input" data-x="type" aria-label="Activity">${EXTRA_TYPES.map((t) => `<option value="${t.id}" ${x.type === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
          <input class="input num" data-x="min" inputmode="numeric" placeholder="min" value="${esc(x.min ?? "")}" aria-label="Minutes">
          <input class="input num" data-x="avg" inputmode="numeric" placeholder="bpm" value="${esc(x.avg ?? "")}" aria-label="Average heart rate">
          <select class="input" data-x="intensity" aria-label="Intensity"><option value="zone2" ${x.intensity !== "hard" && x.intensity !== "light" ? "selected" : ""}>Easy / Zone 2</option><option value="hard" ${x.intensity === "hard" ? "selected" : ""}>Hard</option><option value="light" ${x.intensity === "light" ? "selected" : ""}>Light</option></select>
          <button type="button" class="btn sm icon-only ghost" data-x-del aria-label="Remove activity">${icon("trash", "sm")}</button>
        </div>`
      )
      .join("");
    return `<section class="card card-pad obs">
      <div class="section-title"><h2>Notes & observations</h2><span class="eyebrow">saved automatically</span></div>
      <div class="obs-ratings">
        <div class="rating-line"><span class="label" title="1 = very easy, 10 = maximum">Session effort <small>(1–10)</small></span><div class="scale" role="group" aria-label="Session effort, 1 very easy to 10 maximum">${rpe}</div></div>
        <div class="rating-line"><span class="label">Energy today</span><div class="seg" role="group" aria-label="Energy today">${energy}</div></div>
      </div>
      <label class="field"><span>Notes</span><textarea class="input" data-notes rows="3" placeholder="How did the workout feel? Note soreness or anything to change next time.">${esc(l.notes || "")}</textarea></label>
      <div class="field"><span>Extra activity <small>· ${t("counts toward your weekly minutes")}</small></span>
        <div class="extras">${extras}</div>
        <div><button type="button" class="btn sm" data-x-add>${icon("plus", "sm")} Add activity</button></div>
      </div>
      <label class="field" style="max-width:220px"><span>Body weight today (optional, ${esc(u)})</span><input class="input num" data-bw inputmode="decimal" value="${l.bodyWeightKg != null ? esc(u === "lb" ? Math.round(l.bodyWeightKg * 2.20462 * 10) / 10 : l.bodyWeightKg) : ""}" placeholder="${esc(fmtWeight(profile(), profile() && profile().weightKg).replace(/ (kg|lb)$/, ""))}"></label>
      ${isToday ? '<div class="level-check-host" data-level-check-host></div>' : ""}
    </section>`;
  }

  function missedHint(ctx) {
    if (!isToday || ctx.rest) return "";
    const l = log();
    if (l && (l.status || l.skip || l.session)) return "";
    try {
      if (localStorage.getItem("hp:hint:" + date)) return "";
    } catch {}
    for (let i = 1; i <= 2; i++) {
      const d = addDays(date, -i);
      if (parseIso(d) < parseIso(profile().startDate || d)) break;
      const key = weekdayKey(d);
      if (isRestKey(key)) break;
      const prev = state.days[d];
      if (prev && (prev.status === "done" || prev.status === "partial")) break;
      const def = dayDef(key);
      return `<div class="banner hint"><span>${icon("info")}</span><div class="grow"><b>${t("No workout logged for {day} ({title}).", { day: esc(def.name), title: esc(def.title) })}</b><span>${t("You can do that session today. Choose one session; don't do both in one day.")}</span></div><div class="btn-row"><button type="button" class="btn sm" data-swap-to="${esc(key)}">${t("Do {day}'s session", { day: esc(def.short) })}</button><button type="button" class="btn sm ghost" data-hint-off aria-label="${esc(t("Dismiss"))}">${icon("x", "sm")}</button></div></div>`;
    }
    return "";
  }

  // Step down for a while after a long break. The move-up checkpoints live at
  // in Notes & observations, so this banner only appears for a real gap.
  function breakBanner(ctx) {
    if (!isToday || ctx.rest) return "";
    const p = profile();
    const lvl = levelIndex(p);
    const kept = p.levelCheck || {};
    const last = lastSessionDate();
    if (lvl > 0 && last && daysBetween(last, todayIso()) >= 14 && kept.breakDismissedFor !== last) {
      const prev = LEVELS[lvl - 1];
      return `<div class="banner hint"><span>${icon("info", "lg")}</span><div class="grow"><b>${t("Coming back after a break?")}</b><span>${t("Your last session was {days} days ago. The plan says step down for a while after a long break.", { days: daysBetween(last, todayIso()) })}</span></div><div class="btn-row"><button type="button" class="btn sm" data-level-down="${esc(prev.id)}">${t("Step down to {level}", { level: esc(prev.name) })}</button><button type="button" class="btn sm ghost" data-level-stay="${esc(last)}">${t("Stay at this level")}</button></div></div>`;
    }
    return "";
  }

  // Pre-workout readiness check from Bryan's "Don't Die" / Zero Injury principle:
  // if recovery, sleep or joints are compromised, adapt today's dose without guilt.
  function readinessBanner(ctx) {
    if (!isToday || ctx.rest) return "";
    const l = log();
    if (l && l.skip) return "";
    const p = profile();
    const curLevelIdx = levelIndex(p);
    const todayLevelIdx = ctx.level;

    if (l && l.readiness) {
      const rd = l.readiness;
      const isScaled = todayLevelIdx < curLevelIdx;
      const title = rd === "ready" ? t("Feeling 100%") : rd === "tired" ? t("Tired / Low recovery") : t("Joint tightness / Sore");
      const desc = isScaled
        ? t("Session volume temporarily scaled to {level} for today.", { level: LEVELS[todayLevelIdx].name })
        : rd === "ready"
        ? t("Normal session volume loaded.")
        : t("Taking it controlled today.");
      const ic = rd === "ready" ? "check" : rd === "tired" ? "battery" : "bandage";
      return `<div class="banner hint readiness-banner"><span>${icon(ic, "lg")}</span><div class="grow"><b>${t("Daily Readiness: {status}", { status: esc(title) })}</b><span>${esc(desc)}</span></div><button type="button" class="btn sm ghost" data-readiness-reset>${icon("undo", "sm")} ${t("Change")}</button></div>`;
    }

    try {
      if (sessionStorage.getItem("hp:readiness-dismiss:" + date)) return "";
    } catch {}

    return `<div class="card readiness-check" style="padding:14px 18px;display:grid;gap:10px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span>${icon("heart", "sm")}</span>
          <b style="font-size:0.92rem">Daily Readiness Check</b>
          <small class="muted">— Bryan's #1 rule: injury prevention first</small>
        </div>
        <button type="button" class="btn sm icon-only ghost" data-readiness-dismiss aria-label="Dismiss">${icon("x", "sm")}</button>
      </div>
      <p class="muted" style="font-size:0.84rem;margin:0">How did you recover overnight? Adapt today's dose to match how your body feels.</p>
      <div class="btn-row" style="flex-wrap:wrap">
        <button type="button" class="btn sm" data-readiness-pick="ready">${icon("check", "sm")} Feeling 100%</button>
        <button type="button" class="btn sm ghost" data-readiness-pick="tired">${icon("battery", "sm")} Tired / Low sleep</button>
        <button type="button" class="btn sm ghost" data-readiness-pick="sore">${icon("bandage", "sm")} Sore / Joint tight</button>
      </div>
    </div>`;
  }

  function heroHtml(ctx) {
    const { def, level, rest } = ctx;
    const l = log();
    const st = l && l.status;
    const prog = progressOf(l || { date, items: {}, session: ctx.key });
    const addons = addonsForDate(date);
    const addonMins = addons.filter((a) => !a.optional).reduce((s, a) => s + (a.variant.mins || 0), 0);
    const total = rest ? 0 : prog.total || def.blocks.flatMap((b) => blockItems(b, level)).filter(countable).length;
    const done = prog.done;
    // A day already logged keeps the level it was done at.
    const levelLine = level !== levelIndex(profile()) ? t("Logged at {level} level", { level: LEVELS[level].name }) : t("{level} level", { level: LEVELS[level].name });
    const wt = isToday && !rest ? weekTargets(weekStart(todayIso())) : null;
    const rd = isToday && !rest ? currentReadiness() : null;
    const swapOptions = DAYS.filter((d) => d.blocks.length)
      .map((d) => `<button type="button" data-swap-to="${esc(d.key)}" ${ctx.key === d.key ? 'aria-current="true"' : ""}>${esc(d.name)}: ${esc(d.title)}${ctx.key === d.key ? icon("check", "sm") : ""}</button>`)
      .join("");
    return `<section class="card hero${rest ? " rest" : ""}">
      <div class="hero-top">
        <div style="display:grid;gap:10px;min-width:0">
          <span class="eyebrow">${esc(levelLine)}</span>
          <h1>${esc(rest ? t("Rest day") : def.title)}</h1>
          <p class="focus">${esc(rest ? t("Take a rest day. Keep up your posture habits or go for an easy walk. You can log activity and notes below.") : def.focus)}</p>
          <div class="chips">
            ${rest ? "" : `<span class="chip mono">${icon("clock", "sm")} ${t("≈{mins} min", { mins: dayMins(def, level) })}${addonMins ? ` ${t("+ {mins} min add-ons", { mins: addonMins })}` : ""}</span>`}
            ${ctx.swapped ? `<span class="chip bryan">${icon("swap", "sm")} ${t("Doing {day}'s session", { day: esc(def.name) })}</span>` : ""}
            ${wt ? `<a class="chip link" href="#/activity/week" title="${esc(t("Weekly targets for your level; open This week for the full Bryan comparison"))}">${icon("check", "sm")} ${t("{met}/{total} weekly targets", { met: wt.metCount, total: wt.total })}</a>` : ""}
            ${rd && rd.ready ? `<button type="button" class="chip accent link" data-level-jump title="${esc(t("See your level check in Notes & observations"))}">${icon("check", "sm")} Level check ready</button>` : ""}
            ${st ? `<span class="chip ${st === "skipped" ? "skip" : "accent"}" data-status>${esc(STATUS_TEXT[st] || st)}</span>` : `<span class="chip" data-status>${date > todayIso() ? "Planned" : isToday ? "Not started" : profile().startDate && date < profile().startDate ? "Before your start" : "Not logged"}</span>`}
          </div>
        </div>
        ${rest ? "" : `<div data-ring>${ring(done, total, 76)}</div>`}
      </div>
      <div class="btn-row">
        ${rest || (l && l.skip) ? "" : `<button type="button" class="btn primary" data-guided>${icon("play")} Start guided workout</button><button type="button" class="btn" data-all>${icon("check")} Mark all done</button>`}
        <details class="session-swap">
          <summary class="btn">${icon("swap")} <span>${rest ? "Train anyway" : "Swap session"}</span>${icon("chevronD", "sm session-swap-chevron")}</summary>
          <div class="session-swap-menu">
            ${ctx.swapped ? `<button type="button" data-swap-reset>Scheduled session</button>` : ""}
            ${swapOptions}
          </div>
        </details>
        ${rest || (l && l.skip) ? "" : `<button type="button" class="btn ghost skip" data-skip>${icon("skip")} Skip day</button>`}
      </div>
    </section>`;
  }

  function skipBanner() {
    const l = log();
    if (!l || !l.skip) return "";
    const r = SKIP_REASONS.find((x) => x.id === l.skip.reason) || SKIP_REASONS[SKIP_REASONS.length - 1];
    return `<div class="banner skip"><span>${icon(r.icon, "lg")}</span><div class="grow"><b>${t("Skipped: {reason}", { reason: esc(r.name) })}</b>${l.skip.note ? `<span>${esc(l.skip.note)}</span>` : ""}</div><div class="btn-row"><button type="button" class="btn sm" data-skip-edit>${icon("note", "sm")} ${t("Edit")}</button><button type="button" class="btn sm" data-unskip>${icon("undo", "sm")} ${t("Undo skip")}</button></div></div>`;
  }

  function draw() {
    if (!profile()) return;
    collapsedAddons = new Set([...el.querySelectorAll("details[data-addon]:not([open])")].map((card) => card.dataset.addon));
    const ctx = context();
    const l = log();
    const prev = addDays(date, -1);
    const next = addDays(date, 1);
    const showBlocks = !ctx.rest && (!(l && l.skip) || showSkipped);
    // Themes colour or arrange the page by the kind of session (see themes.js).
    document.documentElement.dataset.venue = ctx.rest ? "rest" : sessionKind(ctx.key);
    el.innerHTML = `<div class="page">
      <div class="day-layout today-layout">
        <div class="day-head">
          <div class="day-nav">
            <a class="btn sm icon-only" href="#/day/${prev}" aria-label="Previous day">${icon("chevronL")}</a>
            <a class="btn sm icon-only" href="#/day/${next}" aria-label="Next day">${icon("chevronR")}</a>
            <span class="date">${esc(fmtDate(date))}</span>
            ${isToday ? `<span class="chip accent">${t("Today")}</span>` : `<a class="btn sm ghost" href="#/today">${t("Back to today")}</a>`}
          </div>
          ${heroHtml(ctx)}
          ${skipBanner()}
          ${breakBanner(ctx)}
          ${missedHint(ctx)}
          ${readinessBanner(ctx)}
          ${l && l.skip && !ctx.rest ? `<div><button type="button" class="btn sm ghost" data-show-skipped>${showSkipped ? t("Hide") : t("Show")} ${t("skipped session")}</button></div>` : ""}
        </div>
        <div class="day-list">
          ${showBlocks ? blocksHtml(ctx.def, ctx.level) : ""}
          ${addonsForDate(date).filter((a) => a.addon.id !== "desk").map((a) => addonHtml(a, ctx.level)).join("")}
          ${addonsForDate(date).filter((a) => a.addon.id === "desk").map(deskAddonHtml).join("")}
          ${obsHtml()}
        </div>
        <div class="detail-col"><div data-panel-host></div></div>
      </div>
    </div>`;
    if (panel) panel.dispose();
    panel = null;
    if (selected) showPanel(selected);
    else autoselect();
    const lcHost = el.querySelector("[data-level-check-host]");
    if (lcHost) mountLevelCheck(lcHost, { showStepDown: false });
    syncDeskPause();
    const r = el.querySelector("[data-ring] .ring-wrap");
    if (r) r.classList.add("intro");
    updatePanelTop();
  }

  function onLook() {
    updatePanelTop();
    const mode = detailMode();
    if (mode === panelMode) return;
    panelMode = mode;
    draw();
  }

  function autoselect() {
    const rows = [...el.querySelectorAll(".item:not(.info)")];
    // While the animation style switcher is open, start on an exercise the styles apply to.
    const styled = animBarOpen() && rows.find((li) => hasAnimStyles((findItem(li.dataset.scope, li.dataset.id) || { item: {} }).item.ex));
    const first = styled || rows[0];
    if (first) select(first.dataset.scope, first.dataset.id);
  }

  function findItem(scope, id) {
    const ctx = context();
    if (scope === "main") {
      for (const b of ctx.def ? ctx.def.blocks : []) for (const it of b.items) if (it.id === id) return { item: it, level: ctx.level };
    } else {
      for (const a of addonsForDate(date)) if (a.addon.id === scope) for (const it of a.variant.items) if (it.id === id) return { item: it, level: ctx.level, scopeName: a.addon.name };
    }
    return null;
  }

  function select(scope, id) {
    // Opened in place: a second click on the open exercise folds it away.
    if (detailMode() === "inline" && selected && selected.scope === scope && selected.id === id && el.querySelector(".inline-panel")) {
      closeInline();
      selected = null;
      el.querySelectorAll(".item").forEach((li) => li.setAttribute("aria-selected", "false"));
      return;
    }
    selected = { scope, id };
    el.querySelectorAll(".item").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.scope === scope && li.dataset.id === id)));
    showPanel(selected);
    if (detailMode() !== "inline") el.querySelector(".detail-col").scrollTop = 0;
  }

  function panelCtx(found) {
    return { exId: found.item.ex, item: found.item, date, level: found.level, scope: selected.scope, scopeName: found.scopeName, compactActions: true, onChange: refreshStatus };
  }

  function closeInline() {
    if (panel) panel.dispose();
    panel = null;
    const host = el.querySelector(".inline-panel");
    if (host) host.remove();
  }

  // On narrow screens and in inline themes, the exercise opens under its row.
  function showInline(sel, found) {
    const li = el.querySelector(`.item[data-scope="${CSS.escape(sel.scope)}"][data-id="${CSS.escape(sel.id)}"]`);
    if (!li) return;
    let host = el.querySelector(".inline-panel");
    if (!host || host.previousElementSibling !== li) {
      closeInline();
      host = document.createElement("li");
      host.className = "inline-panel";
      li.after(host);
    }
    if (!panel) panel = createExercisePanel(host);
    panel.show(panelCtx(found));
  }

  function showPanel(sel) {
    const found = findItem(sel.scope, sel.id);
    if (!found) return;
    if (detailMode() === "inline") return showInline(sel, found);
    const host = el.querySelector("[data-panel-host]");
    if (!host) return;
    if (!panel) panel = createExercisePanel(host);
    panel.show(panelCtx(found));
  }

  // Updates ticks, summaries, the ring and status without re-rendering inputs.
  function refreshStatus() {
    const ctx = context();
    const l = log();
    el.querySelectorAll(".item[data-id]").forEach((li) => {
      const found = findItem(li.dataset.scope, li.dataset.id);
      if (!found) return;
      const il = getItemLog(date, li.dataset.scope, li.dataset.id);
      li.classList.toggle("done", !!(il && il.done));
      li.classList.toggle("skipped", !!(il && il.skipped));
      const cb = li.querySelector("[data-tick]");
      if (cb) cb.checked = !!(il && il.done);
      const s = li.querySelector("[data-summary]");
      if (s) s.textContent = summarizeLog(il, EXERCISES[found.item.ex].log);
      const rxEl = li.querySelector(".item-rx");
      if (rxEl) rxEl.textContent = personalize((il && il.rxOverride) || rxFor(found.item, ctx.level), profile());
      const old = li.querySelector(".item-easier");
      if (old) old.remove();
      if (il && il.easier) {
        const div = document.createElement("div");
        div.className = `item-easier${il.skipped ? " skip" : ""}`;
        div.textContent = il.skipped ? t("Skipped today") : t("Easier today: {text}", { text: il.easier.text || "" });
        li.querySelector(".item-main").appendChild(div);
      }
    });
    if (!ctx.rest) {
      const prog = progressOf(l || { date, items: {}, session: ctx.key });
      const r = el.querySelector("[data-ring]");
      if (r) r.innerHTML = ring(prog.done, prog.total, 76);
    }
    const chip = el.querySelector("[data-status]");
    if (chip && l) {
      chip.textContent = l.status ? STATUS_TEXT[l.status] : isToday ? "Not started" : "Not logged";
      chip.className = `chip ${l.status === "skipped" ? "skip" : l.status ? "accent" : ""}`;
    }
    for (const a of addonsForDate(date)) {
      const pEl = el.querySelector(`[data-addon="${a.addon.id}"] [data-addon-prog]`);
      const pr = addonProgress(l, a, ctx.level);
      if (pEl) pEl.textContent = pr.skipped ? t("skipped") : t("{done}/{total} · ≈{mins} min", { done: pr.done, total: pr.total, mins: a.variant.mins });
    }
    syncDeskPause();
    if (l && l.status === "done" && lastStatus !== "done") toast("Workout complete.", { icon: "flame" });
    lastStatus = l && l.status;
  }

  // ---------- actions ----------

  function openSkip() {
    const l = log();
    const cur = (l && l.skip) || { reason: null, note: "" };
    const content = document.createElement("div");
    content.style.display = "grid";
    content.style.gap = "14px";
    content.innerHTML = `<p class="muted">Choose a reason so you can see it later in History. You can return to your usual schedule or swap sessions when you're ready.</p>
      <div class="reason-grid">${SKIP_REASONS.map((r) => `<button type="button" data-reason="${r.id}" aria-pressed="${cur.reason === r.id}">${icon(r.icon)} ${esc(r.name)}</button>`).join("")}</div>
      <label class="field"><span>Note (optional)</span><textarea class="input" rows="3" data-skip-note placeholder="e.g. flight at 7 am, will do Tuesday's session tomorrow">${esc(cur.note || "")}</textarea></label>
      <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn primary" data-confirm>${icon("skip")} Skip ${date === todayIso() ? "today" : "this day"}</button></div>`;
    const d = openDialog({ title: "Skip this day", content, sheet: false });
    let reason = cur.reason || "other";
    content.addEventListener("click", (e) => {
      const r = e.target.closest("[data-reason]");
      if (r) {
        reason = r.dataset.reason;
        content.querySelectorAll("[data-reason]").forEach((b) => b.setAttribute("aria-pressed", String(b === r)));
      }
      if (e.target.closest("[data-cancel]")) d.close();
      if (e.target.closest("[data-confirm]")) {
        const note = content.querySelector("[data-skip-note]").value.trim();
        editDay(date, (day) => {
          day.skip = { reason, note };
        });
        d.close();
        showSkipped = false;
        selected = null;
        draw();
        toast("Day marked as skipped.", { icon: "skip" });
      }
    });
  }

  el.addEventListener("click", async (e) => {
    const t = e.target;
    const tick = t.closest("[data-tick]");
    if (tick) {
      const li = tick.closest(".item");
      const found = findItem(li.dataset.scope, li.dataset.id);
      if (found) {
        if (tick.checked) fillDefaults({ date, scope: li.dataset.scope, item: found.item, ex: EXERCISES[found.item.ex], level: found.level });
        editItem(date, li.dataset.scope, found.item, (l) => {
          l.done = tick.checked;
          if (tick.checked) l.skipped = false;
        });
      }
      refreshStatus();
      if (panel && selected && selected.id === li.dataset.id) showPanel(selected);
      return;
    }
    const periodic = t.closest("[data-periodic]");
    if (periodic) {
      const aid = periodic.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].periodic = d.addons[aid].periodic || {};
        d.addons[aid].periodic[periodic.dataset.periodic] = periodic.checked;
      });
      return;
    }
    const li = t.closest(".item");
    if (li && !li.classList.contains("info") && !t.closest("input")) {
      select(li.dataset.scope, li.dataset.id);
      return;
    }
    const b = t.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-level-jump")) {
      const host = el.querySelector("[data-level-check-host]");
      if (host) {
        host.scrollIntoView({ behavior: "smooth", block: "center" });
        host.classList.add("flash");
        setTimeout(() => host.classList.remove("flash"), 1600);
      }
      return;
    }
    if (b.hasAttribute("data-guided")) {
      unlockVoice();
      const { startGuided } = await import("./guided.js");
      startGuided(date, () => {
        draw();
      });
    } else if (b.hasAttribute("data-all")) {
      const ctx = context();
      for (const bl of ctx.def.blocks) for (const it of blockItems(bl, ctx.level)) if (countable(it)) fillDefaults({ date, item: it, ex: EXERCISES[it.ex], level: ctx.level });
      editDay(date, (d) => {
        for (const bl of ctx.def.blocks) for (const it of blockItems(bl, ctx.level)) if (countable(it)) {
          d.items[it.id] = d.items[it.id] || { ex: it.ex };
          d.items[it.id].done = true;
          d.items[it.id].skipped = false;
        }
      });
      refreshStatus();
      if (panel && selected) showPanel(selected);
    } else if (b.dataset.levelDown) {
      const id = b.dataset.levelDown;
      const name = (LEVELS.find((l) => l.id === id) || {}).name || id;
      updateProfile((p) => {
        p.level = id;
        p.levelCheck = null;
      });
      toast(t("Level set to {level}. Past logs keep the level they were done at.", { level: name }));
      draw();
    } else if (b.dataset.levelStay) {
      updateProfile((p) => {
        p.levelCheck = { ...(p.levelCheck || {}), breakDismissedFor: b.dataset.levelStay };
      });
      b.closest(".banner").remove();
    } else if (b.hasAttribute("data-desk-start")) {
      startDesk();
      refreshDesk(true);
    } else if (b.hasAttribute("data-desk-stop")) {
      stopDesk();
      refreshDesk(true);
    } else if (b.hasAttribute("data-desk-snooze")) {
      snoozeDesk(b.dataset.deskSnooze);
      refreshDesk(true);
    } else if (b.hasAttribute("data-desk-move") || b.hasAttribute("data-desk-squats")) {
      const kind = b.hasAttribute("data-desk-move") ? "move" : "squats";
      updateDay(date, (d) => {
        d.desk = d.desk || { move: 0, squats: 0 };
        d.desk[kind] = (d.desk[kind] || 0) + 1;
      });
      doneDesk(kind);
      refreshDesk(true);
      toast(kind === "move" ? t("Stand-and-move break logged") : t("10 squats logged"), { icon: "check" });
    } else if (b.hasAttribute("data-skip") || b.hasAttribute("data-skip-edit")) openSkip();
    else if (b.hasAttribute("data-unskip")) {
      editDay(date, (d) => {
        d.skip = null;
      });
      draw();
    } else if (b.hasAttribute("data-show-skipped")) {
      showSkipped = !showSkipped;
      draw();
    } else if (b.hasAttribute("data-swap-reset")) {
      editDay(date, (d) => {
        d.session = null;
      });
      selected = null;
      draw();
    } else if (b.dataset.swapTo) {
      editDay(date, (d) => {
        d.session = b.dataset.swapTo === weekdayKey(date) ? null : b.dataset.swapTo;
      });
      selected = null;
      draw();
    } else if (b.hasAttribute("data-hint-off")) {
      try {
        localStorage.setItem("hp:hint:" + date, "1");
      } catch {}
      b.closest(".banner").remove();
    } else if (b.dataset.readinessPick) {
      const pick = b.dataset.readinessPick;
      const curLvl = levelIndex(profile());
      editDay(date, (d) => {
        d.readiness = pick;
        if (pick !== "ready" && curLvl > 0) {
          d.level = LEVELS[curLvl - 1].id;
        } else if (pick === "ready") {
          delete d.level;
        }
      });
      toast(pick === "ready" ? t("Logged: Feeling 100%") : t("Scaled session to {level} for today", { level: LEVELS[curLvl > 0 ? curLvl - 1 : 0].name }));
      draw();
    } else if (b.hasAttribute("data-readiness-reset")) {
      editDay(date, (d) => {
        delete d.readiness;
        delete d.level;
      });
      toast(t("Readiness reset to standard plan"));
      draw();
    } else if (b.hasAttribute("data-readiness-dismiss")) {
      try {
        sessionStorage.setItem("hp:readiness-dismiss:" + date, "1");
      } catch {}
      draw();
    } else if (b.dataset.rpe) {
      editDay(date, (d) => {
        d.rpe = d.rpe === Number(b.dataset.rpe) ? null : Number(b.dataset.rpe);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().rpe === Number(x.dataset.rpe))));
    } else if (b.dataset.energy) {
      editDay(date, (d) => {
        d.energy = d.energy === Number(b.dataset.energy) ? null : Number(b.dataset.energy);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().energy === Number(x.dataset.energy))));
    } else if (b.dataset.metric) {
      const aid = b.closest("[data-addon]").dataset.addon;
      const v = Number(b.dataset.v);
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].metrics = d.addons[aid].metrics || {};
        d.addons[aid].metrics[b.dataset.metric] = d.addons[aid].metrics[b.dataset.metric] === v ? null : v;
      });
      const cur = log().addons[aid].metrics[b.dataset.metric];
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.v) === cur)));
    } else if (b.hasAttribute("data-addon-all")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      const entry = addonsForDate(date).find((a) => a.addon.id === aid);
      const level = context().level;
      for (const it of entry.variant.items) if (visible(it, level)) fillDefaults({ date, scope: aid, item: it, ex: EXERCISES[it.ex], level });
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].items = d.addons[aid].items || {};
        for (const it of entry.variant.items) if (visible(it, level)) d.addons[aid].items[it.id] = { ...(d.addons[aid].items[it.id] || {}), ex: it.ex, done: true };
      });
      refreshStatus();
    } else if (b.hasAttribute("data-addon-skip")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        d.addons[aid] = d.addons[aid] || { items: {} };
        d.addons[aid].skipped = true;
      });
      draw();
    } else if (b.hasAttribute("data-addon-unskip")) {
      const aid = b.closest("[data-addon]").dataset.addon;
      editDay(date, (d) => {
        if (d.addons[aid]) d.addons[aid].skipped = false;
      });
      draw();
    } else if (b.hasAttribute("data-x-add")) {
      editDay(date, (d) => {
        d.extras = d.extras || [];
        d.extras.push({ id: uid(), type: "desk", min: null, avg: null, intensity: "zone2" });
      });
      draw();
    } else if (b.hasAttribute("data-x-del")) {
      const id = b.closest("[data-extra]").dataset.extra;
      if (await confirmDialog({ title: "Remove activity?", message: "This removes the activity from this day.", confirm: "Remove", danger: true })) {
        editDay(date, (d) => {
          d.extras = (d.extras || []).filter((x) => x.id !== id);
        });
        draw();
      }
    }
  });

  // Keyboard: Enter or Space on a row opens the exercise.
  el.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".item[tabindex]")) {
      e.preventDefault();
      select(e.target.dataset.scope, e.target.dataset.id);
    }
  });

  el.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-x]") && t.tagName === "SELECT") {
      const id = t.closest("[data-extra]").dataset.extra;
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[t.dataset.x] = t.value;
      });
    }
  });

  el.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-notes]")) editDay(date, (d) => (d.notes = t.value), { delay: 900 });
    else if (t.matches("[data-bw]")) {
      const v = Number(String(t.value).replace(",", "."));
      const kg = t.value === "" || !Number.isFinite(v) ? null : kgUnit(profile()) === "lb" ? Math.round((v / 2.20462) * 10) / 10 : v;
      editDay(date, (d) => (d.bodyWeightKg = kg), { delay: 900 });
    } else if (t.matches("[data-x]") && t.tagName === "INPUT") {
      const id = t.closest("[data-extra]").dataset.extra;
      const v = t.value === "" ? null : Number(t.value);
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[t.dataset.x] = Number.isFinite(v) ? v : null;
      });
    }
  });

  const unsub = onChange((evt) => {
    if (evt.type === "all" || evt.type === "profile") draw();
  });
  const unsubDesk = subscribeDesk(refreshDesk);
  window.addEventListener("hp:look", onLook);
  narrowView.addEventListener("change", onLook);
  draw();

  const navigation = document.querySelector(".sidebar");
  function updatePanelTop() {
    const nav = document.querySelector(".sidebar");
    const height = nav && nav.offsetWidth > window.innerWidth / 2 ? nav.offsetHeight : 0;
    el.style.setProperty("--today-nav-height", `${height}px`);
    el.style.setProperty("--today-bottom-space", "16px");
  }
  const navigationSize = new ResizeObserver(updatePanelTop);
  if (navigation) navigationSize.observe(navigation);
  updatePanelTop();
  return {
    destroy() {
      unsub();
      unsubDesk();
      window.removeEventListener("hp:look", onLook);
      narrowView.removeEventListener("change", onLook);
      navigationSize.disconnect();
      el.style.removeProperty("--today-nav-height");
      el.style.removeProperty("--today-bottom-space");
      if (panel) panel.dispose();
      delete document.documentElement.dataset.venue;
    },
  };
}
