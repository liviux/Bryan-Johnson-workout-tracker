// The timer and movement list share the same order and round boundaries.
import { t } from "../i18n.js";

export const INTERVAL_MOVES = ["highknees", "faststep", "climbers", "jacks", "burpee"];
export const DYNAMIC_MOVES = ["armcircles", "legswingfront", "legswingside", "highknees", "laterallunge", "hipcars", "lungetwist"];

export function intervalPhases(exId, preset, moves = ["highknees"]) {
  const phases = [{ kind: "ready", label: t("Get ready"), sec: 10, sub: t("First round starts soon") }];
  const choices = (Array.isArray(moves) ? moves : []).filter((id) => INTERVAL_MOVES.includes(id));
  if (!choices.length) choices.push("highknees");
  const total = preset.rounds * (preset.blocks || 1);
  for (let block = 0; block < (preset.blocks || 1); block++) {
    for (let round = 0; round < preset.rounds; round++) {
      const number = block * preset.rounds + round + 1;
      let remaining = preset.work;
      const workMoves = exId === "norwegian" ? ["faststep", "highknees", "jacks", "climbers"] : [choices[(number - 1) % choices.length]];
      let index = 0;
      while (remaining > 0) {
        const sec = exId === "norwegian" ? Math.min(60, remaining) : remaining;
        remaining -= sec;
        phases.push({ kind: "work", ex: workMoves[index % workMoves.length], sec, round: number, total, roundEnd: remaining === 0, label: t("Round {round} of {total}", { round: number, total }), sub: t("Follow today's work pace and heart-rate target") });
        index++;
      }
      if (round < preset.rounds - 1) phases.push({ kind: "rest", ex: "marching", sec: preset.rest, round: number, total, label: t("Easy marching"), sub: t("Recover before round {round} of {total}", { round: number + 1, total }) });
    }
    if (block < (preset.blocks || 1) - 1) phases.push({ kind: "rest", ex: "marching", sec: preset.blockRest || 180, label: t("Block recovery"), sub: t("March gently and breathe"), blockRecovery: true });
  }
  return phases;
}
