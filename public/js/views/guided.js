// Guided workout: one exercise at a time, full screen — the animation, today's
// dose, the logger and the how-to — then "Done, next". Add-ons come last.

import { orderedSteps } from "../components/workout-steps.js";
import { alternativeHtml, routineHtml, routineSteps } from "../components/routine.js";
import { EXERCISES } from "../data/exercises.js";
import { state } from "../store.js";
import { addonsForDate, blockItems, countable, dayDef, levelFor, rxFor, sessionKeyFor, visible } from "../plan.js";
import { personalize } from "../personalize.js";
import { esc, fmtSecs, h } from "../util.js";
import { icon } from "../components/icons.js";
import { createStagePanel } from "../components/stage-panel.js";
import { editItem, fillDefaults, getItemLog, renderLogger } from "../components/logger.js";
import { exerciseInfoHtml } from "../components/exercise-panel.js";
import { renderVideos, videoGroupsFor, videosFor } from "../components/video.js";
import { mountObservations } from "../components/observations.js";
import { mountLevelCheck } from "../components/level-check.js";
import { t } from "../i18n.js";
import { pauseDesk, resumeDesk } from "../components/desk.js";
import { onRest, onTimer, stopInlineTimer, stopRest } from "../components/timer.js";
import { createWorkoutRadio } from "../components/radio.js";
import { createCoachControls } from "../components/coach-controls.js";
import { createGuidedVoice } from "../voice/session.js";
import { unlockVoice, videoVoice } from "../voice/player.js";

function buildSteps(date) {
  const level = levelFor(date);
  const log = state.days[date];
  const steps = [];
  const skipped = (scope, id) => {
    const l = getItemLog(date, scope, id);
    return !!(l && l.skipped);
  };
  const def = dayDef(sessionKeyFor(date));
  if (def) for (const b of def.blocks) for (const step of orderedSteps(blockItems(b, level).filter((it) => countable(it) && !skipped("main", it.id)), level)) steps.push({ scope: "main", block: b.name, ...step, level });
  for (const a of addonsForDate(date)) {
    if (log && log.addons && log.addons[a.addon.id] && log.addons[a.addon.id].skipped) continue;
    for (const step of orderedSteps(a.variant.items.filter((it) => visible(it, level) && countable(it) && !skipped(a.addon.id, it.id)), level)) steps.push({ scope: a.addon.id, block: a.addon.name, ...step, level });
  }
  return steps;
}

function stepDone(date, step) {
  const log = getItemLog(date, step.scope, step.item.id);
  if (log?.skipped) return false;
  return step.setIndex == null ? !!log?.done : !!log?.done || !!log?.completedSets?.[step.setIndex];
}

export function startGuided(date, onExit) {
  if (document.querySelector(".guided")) return;
  unlockVoice();
  const steps = buildSteps(date);
  if (!steps.length) return;
  // Desk breaks stay quiet while the guided workout is open.
  pauseDesk("guided");
  let i = steps.findIndex((s) => !stepDone(date, s));
  if (i < 0) i = 0;
  const stepName = (step) => personalize(step.item.label || EXERCISES[step.item.ex].name, state.profile);
  const stepLabels = steps.map((step, index) => `${index + 1}/${steps.length} · ${stepName(step)}${step.setIndex != null ? ` · ${t("Set {set} of {sets}", { set: step.setIndex + 1, sets: step.sets })}` : ""}`);
  // Notes & observations follow the last exercise as one more page.
  const notesIndex = steps.length;
  stepLabels.push(t("Notes & observations"));
  // Keep the guided workout in the same blocks as Today. Consecutive steps with
  // the same block share a group; add-ons get their own colour.
  const stepGroups = [];
  for (const [index, step] of steps.entries()) {
    const key = `${step.scope}:${step.block}`;
    const last = stepGroups[stepGroups.length - 1];
    if (!last || last.key !== key) stepGroups.push({ key, title: step.block, addon: step.scope !== "main", steps: [] });
    stepGroups[stepGroups.length - 1].steps.push(index);
  }
  stepGroups.push({ key: "notes", title: t("Notes & observations"), addon: false, steps: [notesIndex] });
  const stepButton = (index) => `<button type="button" data-step-index="${index}" aria-label="${esc(stepLabels[index])}"><span class="guided-progress-preview">${esc(stepLabels[index])}</span></button>`;
  const wrap = h(`<div class="guided" role="dialog" aria-modal="true" aria-label="${esc(t("Guided workout"))}">
    <div class="guided-top">
      <button type="button" class="btn sm ghost" data-g="close">${icon("x")} ${t("Exit")}</button>
      <details class="guided-jump">
        <summary class="btn sm ghost mono" data-g="count" aria-label="${esc(t("Choose workout step"))}"></summary>
        <div class="radio-panel guided-step-list" role="group" aria-label="${esc(t("Workout steps"))}">${stepGroups.map((group) => `<div class="guided-step-group${group.addon ? " addon" : ""}"><span class="guided-step-group-name">${esc(group.title)}</span>${group.steps.map((index) => `<button type="button" class="btn sm ghost" data-step-index="${index}"><span>${esc(stepLabels[index])}</span></button>`).join("")}</div>`).join("")}</div>
      </details>
      <div class="bar guided-progress"><i></i><div class="guided-progress-steps" role="group" aria-label="${esc(t("Jump to workout step"))}">${stepGroups.map((group) => `<div class="guided-progress-group${group.addon ? " addon" : ""}" style="flex:${group.steps.length}"><div class="guided-progress-buttons">${group.steps.map(stepButton).join("")}</div><small class="guided-progress-group-name">${esc(group.title)}</small></div>`).join("")}</div></div>
      <div class="radio-host"></div>
    </div>
    <div class="guided-main"><div class="guided-demo"><div class="stage-host"></div><div data-routine></div></div><div class="guided-column"><div class="guided-side"></div><div class="guided-foot"><p class="guided-voice-status muted" role="status" aria-live="polite"></p><div class="guided-next-time-host"></div></div></div></div>
    <div class="guided-bottom">
      <button type="button" class="btn" data-g="prev">${icon("chevronL")} ${t("Go back")}</button>
      <button type="button" class="btn ghost" data-g="skip">${t("Skip")} ${icon("skip", "sm")}</button>
      <div class="guided-clock" aria-label="${esc(t("Workout time"))}">
        <span><small>${t("Total")}</small><b class="mono" data-g="total-time">0:00</b></span>
        <span><small>${t("This step")}</small><b class="mono" data-g="step-time">0:00</b></span>
      </div>
      <button type="button" class="btn primary" data-g="next">${icon("check")} ${t("Done, next")}</button>
    </div>
  </div>`);
  document.getElementById("overlay-root").appendChild(wrap);
  document.body.style.overflow = "hidden";
  let videoCtrl = null;
  let currentDemo = null;
  const stage = createStagePanel(wrap.querySelector(".stage-host"), {
    onClipChange: ({ clipIndex, manual }) => {
      if (videoCtrl) videoCtrl.setGroup(clipIndex, { manual });
    },
  });
  const side = wrap.querySelector(".guided-side");
  const bar = wrap.querySelector(".bar i");
  const count = wrap.querySelector('[data-g="count"]');
  const jump = wrap.querySelector(".guided-jump");
  jump.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") jump.open = true; });
  jump.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") jump.open = false; });
  jump.addEventListener("focusout", (event) => { if (!jump.contains(event.relatedTarget)) jump.open = false; });
  jump.addEventListener("toggle", () => {
    if (jump.open) jump.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest" });
  });
  const radio = createWorkoutRadio();
  const voice = createGuidedVoice(date, steps, wrap.querySelector(".guided-voice-status"));
  const stopRestListener = onRest((event) => voice.rest(event));
  const stopTimerListener = onTimer((open) => voice.timer(open));
  const coach = createCoachControls({ popup: true, onChange: () => voice.enter(i) });
  wrap.querySelector(".radio-host").append(radio.el, coach.el);
  wrap.addEventListener("input", () => voice.input());

  // Two quiet clocks in the bottom bar: the whole session and the current step.
  const startedAt = Date.now();
  let stepStartedAt = startedAt;
  let clockTimer = null;
  const totalClock = wrap.querySelector('[data-g="total-time"]');
  const stepClock = wrap.querySelector('[data-g="step-time"]');
  function tickClocks() {
    totalClock.textContent = fmtSecs((Date.now() - startedAt) / 1000);
    stepClock.textContent = fmtSecs((Date.now() - stepStartedAt) / 1000);
  }
  function startClocks() {
    tickClocks();
    if (!clockTimer) clockTimer = setInterval(tickClocks, 1000);
  }
  startClocks();

  function markSteps() {
    wrap.querySelectorAll("[data-step-index]").forEach((button) => {
      const index = Number(button.dataset.stepIndex);
      button.setAttribute("aria-current", index === i ? "step" : "false");
      if (index < steps.length) button.dataset.completion = getItemLog(date, steps[index].scope, steps[index].item.id)?.skipped ? "skipped" : stepDone(date, steps[index]) ? "done" : "";
    });
  }

  // The last page: no animation, just the day's notes and the level check.
  function finishScreen() {
    stopRest(); stopInlineTimer(); voice.finish();
    clearInterval(clockTimer); clockTimer = null;
    tickClocks();
    wrap.classList.add("guided-notes");
    wrap.querySelector(".guided-foot").hidden = true;
    wrap.querySelector(".guided-next-time-host").innerHTML = "";
    const done = steps.filter((s) => stepDone(date, s)).length;
    stage.pause();
    wrap.querySelector("[data-routine]").innerHTML = "";
    side.scrollTop = 0;
    // Notes on the left and the level check on the right, so a wide window
    // shows the whole page without scrolling.
    side.innerHTML = `<div class="guided-notes-grid"><div><span class="eyebrow">${t("Finished")}</span><h2 class="display" style="font-size:2.2rem">${t("Workout complete")}</h2>
      <p>${t("{done} of {total} steps done. Record how it felt below.", { done, total: steps.length })}</p>
      <div data-obs-host></div></div><div data-level-check-host></div></div>`;
    mountObservations(side.querySelector("[data-obs-host]"), date);
    mountLevelCheck(side.querySelector("[data-level-check-host]"), { compact: true, showStepDown: false });
    bar.style.width = `${done / steps.length * 100}%`;
    count.innerHTML = `${steps.length}/${steps.length}<small class="guided-count-group">${esc(t("Notes & observations"))}</small>`;
    markSteps();
    wrap.querySelector('[data-g="skip"]').hidden = true;
    wrap.querySelector('[data-g="prev"]').disabled = false;
    wrap.querySelector('[data-g="next"]').innerHTML = `${icon("check")} ${t("Back to the day")}`;
  }

  function show(reason = "next") {
    stopRest();
    stopInlineTimer();
    if (i >= steps.length) return finishScreen();
    stepStartedAt = Date.now();
    startClocks();
    wrap.classList.remove("guided-notes");
    wrap.querySelector('[data-g="skip"]').hidden = false;
    wrap.querySelector('[data-g="next"]').innerHTML = `${icon("check")} ${t("Done, next")}`;
    wrap.querySelector(".guided-foot").hidden = false;
    const s = steps[i];
    const ex = EXERCISES[s.item.ex];
    const p = state.profile;
    const demoId = routineSteps(s.item, s.level, getItemLog(date, s.scope, s.item.id) || {})[0]?.ex || s.item.ex;
    const demo = EXERCISES[demoId];
    currentDemo = demo;
    stage.load(demoId);
    bar.style.width = `${steps.filter((step) => stepDone(date, step)).length / steps.length * 100}%`;
    count.innerHTML = `${i + 1}/${steps.length}<small class="guided-count-group${s.scope !== "main" ? " addon" : ""}">${esc(s.block)}</small>`;
    count.setAttribute("aria-label", t("Step {step} of {total}. Choose workout step", { step: i + 1, total: steps.length }));
    markSteps();
    const itemLog = getItemLog(date, s.scope, s.item.id);
    wrap.querySelector("[data-routine]").innerHTML = ex.routine ? routineHtml(s.item, s.level, itemLog || {}, { compact: true }) : "";
    side.scrollTop = 0;
    const rx = personalize((itemLog && itemLog.rxOverride) || rxFor(s.item, s.level), p);
    const bryanCount = videosFor(demo).filter((v) => v.kind === "bryan").length;
    side.innerHTML = `
      <span class="eyebrow${s.scope !== "main" ? " addon" : ""}">${esc(s.item.group || s.block)}${s.round ? ` · ${t("Round {round} of {rounds}", { round: s.round, rounds: s.rounds })}` : ""}</span>
      <h2 class="display" style="font-size:2.1rem;line-height:1">${esc(s.item.label ? personalize(s.item.label, p) : ex.name)}</h2>
      <div class="guided-tools" role="group" aria-label="${esc(t("Exercise details"))}">
        <button type="button" class="btn sm ghost" data-tool="how" aria-expanded="true">${icon("list", "sm")} ${t("How to")}</button>
        <button type="button" class="btn sm ghost" data-tool="note" aria-expanded="false">${icon("note", "sm")} ${t("Note")}</button>
        <button type="button" class="btn sm ghost" data-tool="videos" aria-expanded="false">${icon("video", "sm")} ${t("Videos")}${bryanCount ? ` <small class="tab-bryan">${t("Bryan")}</small>` : ""}</button>
      </div>
      <div class="guided-tool-body">
        <section data-tool-panel="how">${exerciseInfoHtml(ex)}</section>
        <section data-tool-panel="note" hidden><span class="eyebrow">${t("Note for this exercise")}</span><div data-note-host></div></section>
        <section data-tool-panel="videos" hidden data-g="videos"></section>
      </div>
      <div class="guided-dose-row">
        <div class="rx guided-rx">${s.setIndex != null ? `<b class="guided-set-pill">${t("Set {set} of {sets}", { set: s.setIndex + 1, sets: s.sets })}</b> ` : ""}${esc(s.setIndex != null ? oneSet(rx) : rx)}</div>
        ${s.item.bryan ? `<span class="chip bryan guided-bryan">${esc(personalize(s.item.bryan, p))}</span>` : ""}
      </div>
      ${s.setIndex != null ? `<p class="muted guided-set-note">${setNote(s)}</p>` : ""}
      ${alternativeHtml(s.item, s.level)}
      <div class="logger-host guided-logger-host${s.scope !== "main" ? " addon-scope" : ""}"></div>`;
    renderLogger(side.querySelector(".logger-host"), { date, item: s.item, ex, level: s.level, scope: s.scope, setIndex: s.setIndex, manualCompletion: true, guided: true, noteHost: side.querySelector("[data-note-host]"), nextTimeHost: wrap.querySelector(".guided-next-time-host"), onDraw: (log) => { const host = wrap.querySelector("[data-routine]"); if (host) host.innerHTML = ex.routine ? routineHtml(s.item, s.level, log, { compact: true }) : ""; voice.changed(); } });
    videoCtrl?.destroy();
    videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(demo), {
      groups: videoGroupsFor(demo),
      activeGroup: stage.clipIndex,
      onSelectGroup: (gi) => stage.setClip(gi),
      onSelectVideo: () => { stage.setAutoAdvance(false); videoVoice(true); },
      onPlay: () => { stage.setAutoAdvance(false); videoVoice(true); },
    });
    wrap.querySelector('[data-g="prev"]').disabled = i === 0;
    voice.enter(i, reason);
  }

  // A paired step is one set, so its dose reads "1 × 8" and the note says
  // when the next set of this exercise comes back.
  const oneSet = (rx) => rx.replace(/^(\s*)\d+(\s*[×x])/, "$11$2");
  function setNote(s) {
    const later = steps.findIndex((step, index) => index > i && step.scope === s.scope && step.item.id === s.item.id);
    if (later < 0) return t("This is the last set.");
    if (later > i + 1) return t("Do one set now. Set {set} of this exercise comes after {exercise}.", { set: s.setIndex + 2, exercise: esc(stepName(steps[i + 1])) });
    return t("Complete set {set} of {sets}, then continue to the next movement.", { set: s.setIndex + 1, sets: s.sets });
  }

  function toggleTool(name) {
    const bar = side.querySelector(".guided-tools");
    const body = side.querySelector(".guided-tool-body");
    if (!bar || !body) return;
    const current = bar.querySelector('[aria-expanded="true"]')?.dataset.tool;
    const next = current === name ? null : name;
    if (current === "videos" && next !== "videos") {
      videoCtrl?.destroy();
      videoCtrl = null;
      videoVoice(false);
    }
    if (next === "videos" && !videoCtrl && currentDemo) {
      videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(currentDemo), {
        groups: videoGroupsFor(currentDemo),
        activeGroup: stage.clipIndex,
        onSelectGroup: (gi) => stage.setClip(gi),
        onSelectVideo: () => { stage.setAutoAdvance(false); videoVoice(true); },
        onPlay: () => { stage.setAutoAdvance(false); videoVoice(true); },
      });
    }
    bar.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.tool === next)));
    body.hidden = !next;
    body.querySelectorAll("[data-tool-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.toolPanel !== next;
    });
  }

  function close() {
    stopRest();
    stopInlineTimer();
    clearInterval(clockTimer);
    videoCtrl?.destroy();
    videoCtrl = null;
    stopRestListener(); stopTimerListener(); voice.dispose(); coach.dispose();
    resumeDesk("guided");
    radio.dispose();
    stage.dispose();
    wrap.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (onExit) onExit();
  }

  function onKey(e) {
    if (document.querySelector("#overlay-root > .overlay")) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.target.closest?.(".guided-progress") && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      (e.key === "ArrowRight" ? e.target.nextElementSibling : e.target.previousElementSibling)?.focus();
      return;
    }
    if (jump.open && e.target.closest?.(".guided-jump")) {
      if (e.key === "Escape") { jump.open = false; count.focus(); e.preventDefault(); }
      return;
    }
    if (e.key === "Escape") close();
    else if (e.target.closest && e.target.closest(".workout-radio, .workout-coach")) return;
    else if (e.key === "ArrowRight") {
      i = Math.min(steps.length, i + 1);
      show();
    } else if (e.key === "ArrowLeft") {
      i = Math.max(0, i - 1);
      show("back");
    }
  }

  wrap.addEventListener("click", (e) => {
    const tool = e.target.closest("[data-tool]");
    if (tool) {
      toggleTool(tool.dataset.tool);
      return;
    }
    const target = e.target.closest("[data-step-index]");
    if (target) {
      const next = Number(target.dataset.stepIndex);
      if (!Number.isInteger(next) || next < 0 || next > notesIndex) return;
      const reason = next < i ? "back" : "next";
      i = next;
      jump.open = false;
      count.focus();
      show(reason);
      return;
    }
    if (!e.target.closest(".guided-jump")) jump.open = false;
    const movement = e.target.closest("[data-movement]");
    if (movement) {
      const demo = EXERCISES[movement.dataset.movement];
      currentDemo = demo;
      stage.load(movement.dataset.movement);
      videoCtrl?.destroy();
      videoCtrl = renderVideos(side.querySelector('[data-g="videos"]'), videosFor(demo), {
        groups: videoGroupsFor(demo),
        activeGroup: stage.clipIndex,
        onSelectGroup: (gi) => stage.setClip(gi),
        onSelectVideo: () => { stage.setAutoAdvance(false); videoVoice(true); },
        onPlay: () => { stage.setAutoAdvance(false); videoVoice(true); },
      });
      return;
    }
    const b = e.target.closest("[data-g]");
    if (!b) return;
    const a = b.dataset.g;
    if (a === "close") close();
    else if (a === "prev") {
      i = Math.max(0, i - 1);
      show("back");
    } else if (a === "skip") {
      const s = steps[i];
      editItem(date, s.scope, s.item, (l) => { l.skipped = true; l.done = false; });
      i += 1;
      show();
    } else if (a === "next") {
      if (i >= steps.length) return close();
      const s = steps[i];
      fillDefaults({ date, scope: s.scope, item: s.item, ex: EXERCISES[s.item.ex], level: s.level, setIndex: s.setIndex });
      editItem(date, s.scope, s.item, (l) => {
        l.skipped = false;
        if (s.setIndex == null) l.done = true;
        else {
          l.completedSets = l.completedSets || [];
          l.completedSets[s.setIndex] = true;
          l.done = Array.from({ length: s.sets }, (_, index) => l.completedSets[index]).every(Boolean);
        }
      });
      i += 1;
      show();
    }
  });
  document.addEventListener("keydown", onKey);
  show();
}
