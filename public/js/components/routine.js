import { MOVEMENTS } from "../data/movements.js";
import { EXERCISES } from "../data/exercises.js";
import { DYNAMIC_MOVES, INTERVAL_MOVES, intervalPhases } from "../data/routines.js";
import { rxFor, timerPresets } from "../plan.js";
import { esc } from "../util.js";
import { t } from "../i18n.js";

export function routineSteps(item, level, log = {}) {
  if (item.ex === "dynamic") return DYNAMIC_MOVES.map((ex) => ({ ex, dose: t("Once through") }));
  if (item.ex === "indoorhiit") return INTERVAL_MOVES.map((ex) => ({ ex, dose: t("Choose for a work interval") }));
  const presets = timerPresets(item, level);
  const preset = presets[log.preset || 0] || presets[0];
  if (!preset) return Object.entries(MOVEMENTS).filter(([, movement]) => movement.source === item.ex).map(([ex]) => ({ ex, dose: t("Choose the version prescribed in your workout") }));
  return intervalPhases(item.ex, preset, log.moves).filter((phase) => phase.ex).map((phase) => ({ ...phase, dose: `${phase.sec} s · ${phase.label}` }));
}

export function routineHtml(item, level, log, { compact = false } = {}) {
  const steps = routineSteps(item, level, log);
  if (compact && steps.some((step) => step.round)) {
    const rounds = [];
    for (const step of steps) {
      if (step.round && rounds.at(-1)?.number !== step.round) rounds.push({ number: step.round, steps: [] });
      rounds.at(-1).steps.push(step);
    }
    return `<div class="routine"><h4>${t("Movement order · read across, then down")}</h4><ol class="routine-rounds">${rounds.map((round) => `<li><b>${t("Round {round}", { round: round.number })}</b>${round.steps.map((step, index) => `<div class="routine-phase"><span aria-hidden="true">${index ? "→" : ""}</span><button type="button" data-movement="${esc(step.ex)}" title="${esc(EXERCISES[step.ex].name)}${step.blockRecovery ? ` · ${t("Block recovery")}` : ""}">${esc(step.blockRecovery ? t("March · block recovery") : EXERCISES[step.ex].name.replace(/ on the spot$/, ""))}</button><span>${step.sec} s</span></div>`).join("")}</li>`).join("")}</ol></div>`;
  }
  if (!steps.length) return "";
  return `<div class="routine"><h4>${t("Movement steps")}</h4><ol class="routine-steps">${steps.map((step) => `<li><button type="button" class="btn sm" data-movement="${esc(step.ex)}">${esc(EXERCISES[step.ex].name)}</button><span class="muted">${esc(step.dose)}</span><a href="#/library/${step.ex}" aria-label="${esc(t("Instructions for {name}", { name: EXERCISES[step.ex].name }))}">${t("Details")}</a></li>`).join("")}</ol></div>`;
}

export function alternativeHtml(item, level) {
  const alternative = item?.alternative;
  const rx = alternative && rxFor(alternative, level);
  return rx && rx !== "—" ? `<p class="muted">${t("Optional replacement:")} <a href="#/library/${alternative.ex}">${esc(EXERCISES[alternative.ex].name)}</a>, ${esc(rx)}. ${t("Do this instead of the hang.")}</p>` : "";
}
