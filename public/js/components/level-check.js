// The plan's level check: the session count and the two questions for the
// current level, in a card that can sit at the end of Today, at the end of a
// guided workout, or in Settings. Nothing changes level without a tap.

import { LEVEL_PLANS } from "../data/program.js";
import { state, updateProfile } from "../store.js";
import { currentReadiness } from "../plan.js";
import { LEVELS, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";
import { openDialog, ring, toast } from "./ui.js";
import { t } from "../i18n.js";

function statusText(rd) {
  if (rd.ready) return t("Ready to move up");
  if (rd.sessions >= rd.target) return t("Checkpoint reached");
  const left = rd.target - rd.sessions;
  return left === 1 ? t("1 session to go") : t("{count} sessions to go", { count: left });
}

function hintText(rd) {
  if (rd.ready) return t("Both checks are true and the session count is met. Move up when you want.");
  if (rd.sessions >= rd.target) return t("The session count is met. Tick the two checks that are true for you.");
  const left = rd.target - rd.sessions;
  return t("Keep going: {count} more {sessions}{weeks} to the checkpoint. Tick the checks when they are true.", { count: left, sessions: left === 1 ? t("session") : t("sessions"), weeks: rd.weeks ? ` ${t("(about {weeks} weeks)", { weeks: rd.weeks })}` : "" });
}

export function levelCheckHtml({ showStepDown = false, compact = false } = {}) {
  const p = state.profile;
  const lvl = levelIndex(p);
  const current = LEVELS[lvl];
  const rd = currentReadiness();

  if (!rd) {
    const prev = lvl > 0 ? LEVELS[lvl - 1] : null;
    return `<section class="card card-pad level-check${compact ? " compact" : ""}" data-level-check>
      <div class="level-check-head">
        <span class="level-check-badge">${icon("check", "lg")}</span>
        <div class="grow">
          <span class="eyebrow">${t("Level check")}</span>
          <h3>${t("You're on the full plan")}</h3>
          <p class="muted">${t("Well trained is the top level. After illness, injury or a long break, the plan says step down for a while.")}</p>
        </div>
        <span class="chip accent">${t("Well trained")}</span>
      </div>
      ${showStepDown && prev ? `<div class="btn-row"><button type="button" class="btn ghost" data-level-down="${esc(prev.id)}">${t("Step down to {level}", { level: esc(prev.name) })}</button></div>` : ""}
    </section>`;
  }

  const next = LEVELS.find((l) => l.id === rd.next);
  const nextName = next ? next.name : t("the next level");
  const reached = rd.sessions >= rd.target;
  const questions = rd.questions
    .map(
      (q) => `<label class="level-check-row">
        <input type="checkbox" data-readiness="${esc(q.id)}" ${rd.checks[q.id] ? "checked" : ""}>
        <span class="level-check-copy"><b>${esc(q.label)}</b>${q.detail ? `<small>${esc(q.detail)}</small>` : ""}</span>
        <span class="level-check-tick" aria-hidden="true">${icon("check", "sm")}</span>
      </label>`
    )
    .join("");

  return `<section class="card card-pad level-check${compact ? " compact" : ""}" data-level-check>
    <div class="level-check-head">
      <div class="level-check-ring">${ring(Math.min(rd.sessions, rd.target), rd.target, compact ? 58 : 72)}</div>
      <div class="grow">
        <span class="eyebrow">${t("Level check · {level}", { level: esc(current.name) })}</span>
        <h3 data-level-title>${rd.ready ? t("Ready for {level}", { level: esc(nextName) }) : t("Next level: {level}", { level: esc(nextName) })}</h3>
        <p class="muted">${rd.sessions === 1 ? t("1 session at {level} · checkpoint about {target} sessions{weeks}.", { level: esc(current.name), target: rd.target, weeks: rd.weeks ? ` ${t("about {weeks} weeks", { weeks: rd.weeks })}` : "" }) : t("{count} sessions at {level} · checkpoint about {target} sessions{weeks}.", { count: rd.sessions, level: esc(current.name), target: rd.target, weeks: rd.weeks ? ` ${t("about {weeks} weeks", { weeks: rd.weeks })}` : "" })}</p>
      </div>
      <span class="chip${rd.ready ? " accent" : ""}" data-level-status>${esc(statusText(rd))}</span>
    </div>
    <div class="level-check-questions">
      <span class="eyebrow">${t("The plan's two checks")}</span>
      ${questions}
    </div>
    <div class="level-check-foot">
      <p class="muted" data-level-hint>${esc(hintText(rd))}</p>
      <div class="btn-row">
        <button type="button" class="btn primary" data-level-up="${esc(rd.next)}" ${rd.ready ? "" : "disabled"}>${t("Move up to {level}", { level: esc(nextName) })}</button>
        ${showStepDown && lvl > 0 ? `<button type="button" class="btn ghost" data-level-down="${esc(LEVELS[lvl - 1].id)}">${t("Step down to {level}", { level: esc(LEVELS[lvl - 1].name) })}</button>` : ""}
      </div>
    </div>
    <p class="muted level-check-note">${t("Past sessions keep the level they were done at.")} ${reached && !rd.ready ? t("The session count is met; only the two checks are left.") : ""}</p>
  </section>`;
}

function applyLevel(id, name, render, onChange) {
  updateProfile((p) => {
    p.level = id;
    p.levelCheck = null;
  });
  toast(t("Level set to {level}. Past logs keep the level they were done at.", { level: name }));
  if (render) render();
  if (onChange) onChange("level");
}

// A short "what changes" step before the level switches, so Monday is not a
// surprise. It stays a summary of the plan's own notes for the next level.
function confirmMoveUp(apply) {
  const nextIndex = levelIndex(state.profile) + 1;
  const plan = LEVEL_PLANS[nextIndex];
  const nextName = (LEVELS[nextIndex] || {}).name || t("the next level");
  const points = (plan && plan.points ? plan.points : []).slice(0, 3);
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gap = "12px";
  const p = state.profile;
  content.innerHTML = `<p>${t("{level} keeps the same week but changes the work:", { level: esc(nextName) })}</p>
    ${plan && plan.effort ? `<p class="muted">${esc(personalize(plan.effort, p))}</p>` : ""}
    <ul>${points.map((point) => `<li>${esc(personalize(point, p))}</li>`).join("")}</ul>
    <p class="muted">${t("Your past sessions keep the level they were done at.")}</p>
    <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn" data-move-cancel>Not yet</button><button type="button" class="btn primary" data-move-confirm>${t("Move up to {level}", { level: esc(nextName) })}</button></div>`;
  const d = openDialog({ title: t("Move up to {level}?", { level: nextName }), content, sheet: false });
  content.addEventListener("click", (e) => {
    if (e.target.closest("[data-move-cancel]")) return d.close();
    if (e.target.closest("[data-move-confirm]")) {
      d.close();
      apply();
    }
  });
}

export function mountLevelCheck(host, { showStepDown = false, compact = false, onChange } = {}) {
  function render() {
    host.innerHTML = levelCheckHtml({ showStepDown, compact });
  }

  render();
  host.addEventListener("change", (e) => {
    if (!e.target.matches("[data-readiness]")) return;
    const checks = {};
    host.querySelectorAll("[data-readiness]").forEach((c) => (checks[c.dataset.readiness] = c.checked));
    const rd = currentReadiness();
    // Silent: only this card needs to react, so the page keeps focus and scroll.
    updateProfile((p) => {
      p.levelCheck = { ...(p.levelCheck || {}), level: rd ? rd.plan.id : p.level, checks };
    }, { silent: true });
    if (!rd) return;
    const ready = rd.sessions >= rd.target && rd.questions.every((q) => checks[q.id]);
    const next = LEVELS.find((l) => l.id === rd.next);
    const card = host.querySelector("[data-level-check]");
    const status = card && card.querySelector("[data-level-status]");
    const title = card && card.querySelector("[data-level-title]");
    const hint = card && card.querySelector("[data-level-hint]");
    const up = card && card.querySelector("[data-level-up]");
    if (status) {
      status.className = `chip${ready ? " accent" : ""}`;
      status.textContent = ready ? t("Ready to move up") : rd.sessions >= rd.target ? t("Checkpoint reached") : rd.target - rd.sessions === 1 ? t("1 session to go") : t("{count} sessions to go", { count: rd.target - rd.sessions });
    }
    if (title) title.textContent = ready ? t("Ready for {level}", { level: next ? next.name : t("the next level") }) : t("Next level: {level}", { level: next ? next.name : t("the next level") });
    if (hint) hint.textContent = hintText({ ...rd, ready, checks });
    if (up) up.disabled = !ready;
    if (onChange) onChange("check");
  });

  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-level-up], [data-level-down]");
    if (!b) return;
    // The host pages have their own level buttons; handle this one here only.
    e.stopPropagation();
    if (b.dataset.levelUp) {
      confirmMoveUp(() => applyLevel(b.dataset.levelUp, (LEVELS.find((l) => l.id === b.dataset.levelUp) || {}).name || b.dataset.levelUp, render, onChange));
      return;
    }
    const id = b.dataset.levelDown;
    if (!id) return;
    const name = (LEVELS.find((l) => l.id === id) || {}).name || id;
    applyLevel(id, name, render, onChange);
  });
}
