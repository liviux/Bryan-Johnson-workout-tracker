// The training-level chips used in setup and Settings: one chip per level, then
// what the chosen level means and when to move up or down. Clicks are handled by
// the view (buttons carry data-level).

import { LEVEL_PLANS } from "../data/program.js";
import { LEVELS } from "../personalize.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";
import { t } from "../i18n.js";

// sessions: completed sessions at the chosen level (Settings), or null (setup).
export function levelPickerHtml(selected, { sessions = null } = {}) {
  const i = Math.max(0, LEVELS.findIndex((l) => l.id === selected));
  const lvl = LEVELS[i];
  const lp = LEVEL_PLANS[i];
  const chips = LEVELS.map(
    (l) => `<button type="button" class="choice" data-level="${l.id}" aria-pressed="${l.id === lvl.id}"><b>${esc(l.name)}</b><small>${esc(l.detail)}</small></button>`
  ).join("");
  const down = i > 0 ? ` ${t("If workouts feel too hard or you're returning after a break, you can switch to {level}.", { level: esc(LEVELS[i - 1].name) })}` : "";
  const after =
    sessions != null
      ? `<br><span class="muted">${sessions === 1 ? t("You've completed 1 session at this level. Past workouts keep the level you logged them at.") : t("You've completed {count} sessions at this level. Past workouts keep the level you logged them at.", { count: sessions })}</span>`
      : `<br><span class="muted">${t("Change your level in Settings whenever you need easier workouts or feel ready for harder ones.")}</span>`;
  return `<div class="choice-grid levels" role="group" aria-label="${esc(t("Training level"))}">${chips}</div>
    <p class="level-note">${icon("info")}<span><b>${esc(lvl.name)}${t(":")}</b> ${esc(lvl.plan)} ${esc(lp.effort)}
      <br><b>${t("When to change:")}</b> ${esc(lp.moveUp)}${down}${after}</span></p>`;
}
