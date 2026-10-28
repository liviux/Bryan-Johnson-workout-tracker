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
  const stepLabels = steps.map((step, index) => `${index + 1}/${steps.length} · ${personalize(step.item.label || EXERCISES[step.item.ex].name, state.profile)}${step.setIndex != null ? ` · ${t("Set {set} of {sets}", { set: step.setIndex + 1, sets: step.sets })}` : ""}`);
  const wrap = h(`<div class="guided" role="dialog" aria-modal="true" aria-label="${esc(t("Guided workout"))}">
    <div class="guided-top">
      <button type="button" class="btn sm ghost" data-g="close">${icon("x")} ${t("Exit")}</button>
      <details class="guided-jump">
        <summary class="btn sm ghost mono" data-g="count" aria-label="${esc(t("Choose workout step"))}"></summary>
        <div class="radio-panel guided-step-list" role="group" aria-label="${esc(t("Workout steps"))}">${steps.map((step, index) => `<button type="button" class="btn sm ghost" data-step-index="${index}"><span>${esc(stepLabels[index])}</span><small class="muted">${esc(step.block)}</small></button>`).join("")}</div>
      </details>
      <div class="bar guided-progress"><i></i><div class="guided-progress-steps" role="group" aria-label="${esc(t("Jump to workout step"))}">${stepLabels.map((label, index) => `<button type="button" data-step-index="${index}" aria-label="${esc(label)}"><span class="guided-progress-preview">${esc(label)}</span></button>`).join("")}</div></div>
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

  function finishScreen() {
    stopRest(); stopInlineTimer(); voice.finish();
    clearInterval(clockTimer); clockTimer = null;
    tickClocks();
    wrap.querySelector(".guided-foot").hidden = true;
    wrap.querySelector(".guided-next-time-host").innerHTML = "";
    const done = steps.filter((s) => stepDone(date, s)).length;
    stage.pause();
    wrap.querySelector("[data-routine]").innerHTML = "";
    side.innerHTML = `<span class="eyebrow">${t("Finished")}</span><h2 class="display" style="font-size:2.2rem">${t("Workout complete")}</h2>
      <p>${t("{done} of {total} steps done. You can record how it felt in the day's notes.", { done, total: steps.length })}</p>
      <div class="btn-row"><button type="button" class="btn primary" data-g="close">${icon("check")} ${t("Back to the day")}</button></div>
      <div data-level-check-host></div>`;
    bar.style.width = `${done / steps.length * 100}%`;
    count.textContent = `${steps.length}/${steps.length}`;
    wrap.querySelector(".guided-bottom").hidden = true;
    const lcHost = side.querySelector("[data-level-check-host]");
    if (lcHost) mountLevelCheck(lcHost, { compact: true, showStepDown: false });
  }

  function show(reason = "next") {
    stopRest();
    stopInlineTimer();
    if (i >= steps.length) return finishScreen();
    stepStartedAt = Date.now();
    startClocks();
    wrap.querySelector(".guided-bottom").hidden = false;
    wrap.querySelector(".guided-foot").hidden = false;
    const s = steps[i];
    const ex = EXERCISES[s.item.ex];
    const p = state.profile;
    const demoId = routineSteps(s.item, s.level, getItemLog(date, s.scope, s.item.id) || {})[0]?.ex || s.item.ex;
    const demo = EXERCISES[demoId];
    currentDemo = demo;
    stage.load(demoId);
    bar.style.width = `${steps.filter((step) => stepDone(date, step)).length / steps.length * 100}%`;
    count.textContent = `${i + 1}/${steps.length}`;
    count.setAttribute("aria-label", t("Step {step} of {total}. Choose workout step", { step: i + 1, total: steps.length }));
    wrap.querySelectorAll("[data-step-index]").forEach((button) => {
      const index = Number(button.dataset.stepIndex);
      button.setAttribute("aria-current", index === i ? "step" : "false");
      button.dataset.completion = getItemLog(date, steps[index].scope, steps[index].item.id)?.skipped ? "skipped" : stepDone(date, steps[index]) ? "done" : "";
    });
    const itemLog = getItemLog(date, s.scope, s.item.id);
    wrap.querySelector("[data-routine]").innerHTML = ex.routine ? routineHtml(s.item, s.level, itemLog || {}, { compact: true }) : "";
    side.scrollTop = 0;
    const bryanCount = videosFor(demo).filter((v) => v.kind === "bryan").length;
    side.innerHTML = `
      <span class="eyebrow">${esc(s.item.group || s.block)}${s.round ? ` · ${t("Round {round} of {rounds}", { round: s.round, rounds: s.rounds })}` : ""}</span>
      <h2 class="display" style="font-size:2.1rem;line-height:1">${esc(s.item.label ? personalize(s.item.label, p) : ex.name)}</h2>
      <div class="guided-tools" role="group" aria-label="${esc(t("Exercise details"))}">
        <button type="button" class="btn sm ghost" data-tool="note" aria-expanded="false">${icon("note", "sm")} ${t("Note")}</button>
        <button type="button" class="btn sm ghost" data-tool="how" aria-expanded="false">${icon("list", "sm")} ${t("How to")}</button>
        <button type="button" class="btn sm ghost" data-tool="videos" aria-expanded="false">${icon("video", "sm")} ${t("Videos")}${bryanCount ? ` <small class="tab-bryan">${t("Bryan")}</small>` : ""}</button>
      </div>
      <div class="guided-tool-body" hidden>
        <section data-tool-panel="note"><span class="eyebrow">${t("Note for this exercise")}</span><div data-note-host></div></section>
        <section data-tool-panel="how" hidden>${exerciseInfoHtml(ex)}</section>
        <section data-tool-panel="videos" hidden data-g="videos"></section>
      </div>
      <div class="guided-dose-row">
        <div class="rx guided-rx">${esc(personalize((itemLog && itemLog.rxOverride) || rxFor(s.item, s.level), p))}</div>
        ${s.item.bryan ? `<span class="chip bryan guided-bryan">${esc(personalize(s.item.bryan, p))}</span>` : ""}
      </div>
      ${s.setIndex != null ? `<p class="muted guided-set-note">${t("Complete set {set} of {sets}, then continue to the next movement.", { set: s.setIndex + 1, sets: s.sets })}</p>` : ""}
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
      if (!Number.isInteger(next) || next < 0 || next >= steps.length) return;
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
      if (i >= steps.length) return show();
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
