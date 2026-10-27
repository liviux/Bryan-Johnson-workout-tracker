import assert from "node:assert/strict";
import test from "node:test";
import { fillDefaults, renderLogger } from "../public/js/components/logger.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { DAYS } from "../public/js/data/program.js";
import { defaultProfile } from "../public/js/personalize.js";
import { flushNow, state } from "../public/js/store.js";

test("guided logging preserves completion while Today keeps automatic completion", () => {
  state.mode = "local";
  state.profile = defaultProfile();
  const item = { id: "interval-test", ex: "shortint", rx: ["4 × (20 s brisk / 40 s easy)"] };
  for (const manualCompletion of [true, false]) {
    state.days = {};
    const events = {};
    const container = { innerHTML: "", addEventListener: (name, fn) => { events[name] = fn; }, querySelector: () => null };
    renderLogger(container, { date: "2026-10-20", item, ex: EXERCISES.shortint, level: 0, manualCompletion });
    assert.equal(container.innerHTML.includes('data-l="done"'), !manualCompletion);
    events.input({ target: { dataset: { r: "rounds" }, value: "2" } });
    const log = state.days["2026-10-20"].items[item.id];
    assert.equal(log.rounds, 2);
    assert.equal(log.done, !manualCompletion);
    if (manualCompletion) {
      log.done = false; log.skipped = true;
      events.input({ target: { dataset: { r: "rounds" }, value: "3" } });
      assert.equal(state.days["2026-10-20"].items[item.id].skipped, true);
      assert.equal(state.days["2026-10-20"].items[item.id].done, false);
    }
    flushNow();
  }
});

test("blank logs get the level's prescribed values, while typed values stay untouched", () => {
  state.mode = "local";
  state.profile = { ...defaultProfile(), level: "new" };
  state.days = {};
  const date = "2026-10-27";
  const fill = (item) => {
    fillDefaults({ date, item, ex: EXERCISES[item.ex], level: 0 });
    return state.days[date].items[item.id];
  };

  const reps = fill({ id: "default-pushup", ex: "pushup", rx: ["2 × 8–10", "2 × 10–12"] });
  assert.deepEqual(reps.sets.map((set) => set.reps), [10, 10]);

  const hold = fill({ id: "default-balance", ex: "balance", rx: ["2 × 20 s/leg", "2 × 30 s/leg"] });
  assert.deepEqual(hold.sets.map((set) => set.sec), [20, 20]);

  const cardio = fill({ id: "default-zone2", ex: "zone2", rx: ["20 min @ {hr:60-70}"] });
  assert.equal(cardio.cardio.min, 20);

  const walk = fill({ id: "default-backwalk", ex: "backwalkplain", rx: ["2 min, bodyweight"] });
  assert.equal(walk.cardio.min, 2);

  const check = fill({ id: "default-highknees", ex: "highknees", rx: ["20 s"] });
  assert.deepEqual(check.sets.map((set) => set.sec), [20]);

  const interval = DAYS.flatMap((day) => day.blocks.flatMap((block) => block.items)).find((item) => item.ex === "shortint");
  const rounds = fill(interval);
  assert.equal(rounds.rounds, 4);

  state.days[date].items["default-pushup"].sets = [{ reps: 6 }];
  fillDefaults({ date, item: { id: "default-pushup", ex: "pushup", rx: ["2 × 8–10"] }, ex: EXERCISES.pushup, level: 0 });
  assert.deepEqual(state.days[date].items["default-pushup"].sets.map((set) => set.reps), [6, 10]);
  flushNow();
});
