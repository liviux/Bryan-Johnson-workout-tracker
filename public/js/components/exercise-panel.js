// Exercise detail: 3D animation, today's dose, the logger, how-to steps and videos.
// One panel instance is reused as you click through exercises (one WebGL context).

import { alternativeHtml, routineHtml, routineSteps } from "./routine.js";
import { EXERCISES } from "../data/exercises.js";
import { state } from "../store.js";
import { personalize } from "../personalize.js";
import { rxFor } from "../plan.js";
import { esc } from "../util.js";
import { EQUIPMENT_NAMES, icon } from "./icons.js";
import { getItemLog, renderLogger } from "./logger.js";
import { createStagePanel } from "./stage-panel.js";
import { renderVideos, videoGroupsFor, videosFor } from "./video.js";

const MUSCLE_NAMES = {
  quads: "Quads", hamstrings: "Hamstrings", adductors: "Inner thighs", glutes: "Glutes", hips: "Hips", calves: "Calves",
  shins: "Shins", ankles: "Ankles", feet: "Feet", core: "Core", obliques: "Obliques", lowerBack: "Lower back", back: "Back",
  upperBack: "Upper back", chest: "Chest", shoulders: "Shoulders", rotatorCuff: "Rotator cuff", biceps: "Biceps",
  triceps: "Triceps", arms: "Arms", grip: "Grip", neck: "Neck", heart: "Heart & lungs",
};

export function exerciseInfoHtml(ex) {
  const p = state.profile;
  const steps = ex.how.map((s) => `<li>${esc(personalize(s, p))}</li>`).join("");
  return `<div class="how">
      <div class="from-bryan${ex.classic ? " classic" : ""}"><span class="eyebrow">${ex.classic ? "Classic exercise outside Bryan's protocol" : "From Bryan's protocol"}</span><p>${esc(personalize(ex.bryan, p))}</p></div>
      <h4>How to do it</h4><ol>${steps}</ol>
      ${ex.tips && ex.tips.length ? `<h4>Tips</h4><ul>${ex.tips.map((s) => `<li>${esc(personalize(s, p))}</li>`).join("")}</ul>` : ""}
      ${ex.easier ? `<h4>Easier version</h4><p>${esc(personalize(ex.easier, p))}</p>` : ""}
    </div>`;
}

export function createExercisePanel(container, { mode = "log" } = {}) {
  container.innerHTML = `<div class="card detail"><div class="stage-host"></div><div class="detail-body"></div></div>`;
  let videoCtrl = null;
  const stage = createStagePanel(container.querySelector(".stage-host"), {
    onClipChange: ({ clipIndex, manual }) => {
      if (videoCtrl) videoCtrl.setGroup(clipIndex, { manual });
    },
  });
  const body = container.querySelector(".detail-body");
  let tab = "how";
  let tabOpen = mode !== "log";
  let current = null;
  let movement = null;

  function drawTab() {
    const host = body.querySelector(".tab-body");
    if (!host || !current) return;
    body.querySelectorAll("[data-tab]").forEach((b) => {
      const selected = tabOpen && b.dataset.tab === tab;
      b.setAttribute("aria-selected", String(selected));
      b.setAttribute("aria-expanded", String(selected));
    });
    host.hidden = !tabOpen;
    if (!tabOpen) {
      videoCtrl = null;
      host.innerHTML = "";
      return;
    }
    const ex = EXERCISES[movement || current.exId];
    if (tab === "videos") {
      host.innerHTML = "";
      videoCtrl = renderVideos(host, videosFor(ex), {
        groups: videoGroupsFor(ex),
        activeGroup: stage.clipIndex,
        onSelectGroup: (gi) => stage.setClip(gi),
        onSelectVideo: () => stage.setAutoAdvance(false),
        onPlay: () => stage.setAutoAdvance(false),
      });
    } else {
      videoCtrl = null;
      host.innerHTML = exerciseInfoHtml(ex);
    }
  }

  function show(ctx) {
    const sameExercise = current && current.exId === ctx.exId;
    current = ctx;
    const ex = EXERCISES[ctx.exId];
    if (!ex) return;
    const p = state.profile;
    if (!sameExercise) movement = ex.routine ? routineSteps(ctx.item || { ex: ctx.exId }, ctx.level || 0, ctx.date ? getItemLog(ctx.date, ctx.scope || "main", ctx.item?.id) || {} : {})[0]?.ex : null;
    if (!sameExercise) stage.load(movement || ctx.exId);
    const item = ctx.item;
    const itemLog = item && ctx.date ? getItemLog(ctx.date, ctx.scope || "main", item.id) : null;
    const rx = item ? personalize((itemLog && itemLog.rxOverride) || rxFor(item, ctx.level), p) : "";
    const vids = videosFor(EXERCISES[movement || ctx.exId]);
    const bryanCount = vids.filter((v) => v.kind === "bryan").length;
    body.innerHTML = `
      <div style="display:grid;gap:8px">
        <span class="eyebrow">${esc(ex.cat)}${ctx.scopeName ? ` · ${esc(ctx.scopeName)}` : ""}</span>
        <h2>${esc(item && item.label ? personalize(item.label, p) : ex.name)} ${ex.classic ? '<span class="badge-classic">classic</span>' : ""}</h2>
        ${rx || item?.bryan ? `<div class="detail-dose-row">${rx ? `<div class="rx">${esc(rx)}</div>` : ""}${item && item.bryan ? `<span class="chip bryan">${esc(personalize(item.bryan, p))}</span>` : ""}</div>` : ""}
        <div class="chips">
          ${(ex.equipment || []).map((e) => `<span class="chip" title="${esc(EQUIPMENT_NAMES[e] || e)}">${icon(e)} ${esc(EQUIPMENT_NAMES[e] || e)}</span>`).join("")}
          ${(ex.muscles || []).map((m) => `<span class="chip accent">${esc(MUSCLE_NAMES[m] || m)}</span>`).join("")}
        </div>
      </div>
      <div class="detail-tools" role="tablist" aria-label="Exercise details">
        <button type="button" class="btn sm ghost" role="tab" data-tab="how" aria-selected="false" aria-expanded="false">${icon("list", "sm")} How to</button>
        <button type="button" class="btn sm ghost" role="tab" data-tab="videos" aria-selected="false" aria-expanded="false">${icon("video", "sm")} Videos (${vids.length}${bryanCount ? `, ${bryanCount} with Bryan` : ""})</button>
      </div>
      <div class="tab-body" role="tabpanel"${mode === "log" ? " hidden" : ""}></div>
      ${alternativeHtml(item, ctx.level)}
      ${ex.routine ? `<div data-routine>${routineHtml(item || { ex: ctx.exId }, ctx.level || 0, itemLog || {})}</div>` : ""}
      ${mode === "log" && item && ctx.date ? '<div class="logger-host"></div>' : ""}`;
    const lh = body.querySelector(".logger-host");
    if (lh)
      renderLogger(lh, {
        date: ctx.date,
        item,
        ex,
        level: ctx.level,
        scope: ctx.scope || "main",
        onChange: ctx.onChange,
        compactActions: ctx.compactActions,
        // Keep the dose above the logger in step with an easier choice.
        onDraw: (log) => {
          const routine = body.querySelector("[data-routine]");
          if (routine) routine.innerHTML = routineHtml(item, ctx.level, log);
          const rxEl = body.querySelector(".rx");
          if (rxEl && item) rxEl.textContent = personalize((log && log.rxOverride) || rxFor(item, ctx.level), p);
        },
      });
    drawTab();
  }

  body.addEventListener("click", (e) => {
    const step = e.target.closest("[data-movement]");
    if (step) {
      movement = step.dataset.movement;
      stage.load(movement);
      body.querySelectorAll("[data-movement]").forEach((button) => button.setAttribute("aria-pressed", String(button === step)));
      drawTab();
      return;
    }
    const b = e.target.closest("[data-tab]");
    if (b) {
      const next = b.dataset.tab;
      if (tabOpen && tab === next) tabOpen = false;
      else {
        tab = next;
        tabOpen = true;
      }
      drawTab();
    }
  });

  return {
    show,
    get current() {
      return current;
    },
    dispose: () => stage.dispose(),
    pause: () => stage.pause(),
  };
}
