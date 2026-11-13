import assert from "node:assert/strict";
import test from "node:test";
import { DAYS } from "../public/js/data/program.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { useCatalogue } from "../public/js/i18n.js";
import { migrateProfile } from "../public/js/personalize.js";
import { restSecondsFor } from "../public/js/plan.js";
import { holdPhases } from "../public/js/components/timer.js";

const blocks = DAYS.flatMap((day) => day.blocks);
const block = (name) => blocks.find((entry) => entry.name === name);
const item = (id) => blocks.flatMap((entry) => entry.items).find((entry) => entry.id === id);

test("rest follows the plan's guidance per block", () => {
  assert.equal(restSecondsFor(item("mon-strength-pushup"), 1, block("Strength").rest, { restMode: "plan" }), 75);
  assert.equal(restSecondsFor(item("mon-jumps-jumps"), 2, block("Jumps").rest, { restMode: "plan" }), 60);
  assert.equal(restSecondsFor(item("mon-core-knees-plank"), 2, block("Core & knees").rest, { restMode: "plan" }), 30);
  assert.equal(restSecondsFor(item("wed-strength-triceps"), 2, block("Strength").rest, { restMode: "plan" }), 45);
  assert.equal(restSecondsFor(item("fri-strength-rdl"), 3, block("Strength").rest, { restMode: "plan" }), 25);
  assert.equal(restSecondsFor(item("fri-strength-rdl"), 2, block("Strength").rest, { restMode: "plan" }), 75);
  assert.equal(restSecondsFor(item("mon-zone-2-topup"), 1, block("Zone 2").rest, { restMode: "plan" }), 0);
});

test("a fixed rest setting still wins, and the old 75 s default means the plan", () => {
  assert.equal(restSecondsFor(item("mon-strength-pushup"), 1, 75, { restMode: "fixed", restSec: 90 }), 90);
  assert.equal(restSecondsFor(item("mon-strength-pushup"), 1, 75, { restSec: 90 }), 90);
  assert.equal(restSecondsFor(item("mon-strength-pushup"), 1, 75, { restSec: 75 }), 75);
  assert.equal(restSecondsFor(item("mon-jumps-jumps"), 2, 60, { restSec: 45 }), 45);
  assert.equal(restSecondsFor(item("mon-warm-up-dynamic"), 2, 0, { restMode: "fixed", restSec: 90 }), 0);
  assert.equal(restSecondsFor(item("mon-zone-2-topup"), 2, 0, { restSec: 90 }), 0);
});

test("timed single-side holds name the side and the switch", () => {
  const leg = holdPhases(30, 2, "leg").map((phase) => phase.label);
  assert.deepEqual(leg, ["Get set", "First side", "Switch legs", "Other leg"]);
  const arm = holdPhases(20, 2, "arm").map((phase) => phase.label);
  assert.deepEqual(arm, ["Get set", "First side", "Switch arms", "Other arm"]);
  const side = holdPhases(15, 2, "side").map((phase) => phase.label);
  assert.deepEqual(side, ["Get set", "First side", "Switch sides", "Other side"]);
  assert.deepEqual(holdPhases(30, 1, "leg").map((phase) => phase.label), ["Get set", "Hold"]);
});

test("old profiles keep a chosen fixed rest, while the old 75 s default becomes the plan", () => {
  const oldDefault = { settings: { restSec: 75 } };
  assert.equal(migrateProfile(oldDefault), true);
  assert.equal(oldDefault.settings.restMode, "plan");
  const chosen = { settings: { restSec: 60 } };
  migrateProfile(chosen);
  assert.equal(chosen.settings.restMode, "fixed");
});

test("the side unit stays a code value while its display text is translated", async () => {
  const german = (await import("../public/js/locales/de.js")).default;
  useCatalogue("de", german);
  try {
    assert.equal(EXERCISES.balance.side, "leg");
    assert.equal(EXERCISES.sideplank.side, "side");
    assert.deepEqual(holdPhases(30, 2, EXERCISES.balance.side).map((phase) => phase.label), ["Auf die Plätze", "Erste Seite", "Bein wechseln", "Anderes Bein"]);
  } finally {
    useCatalogue("en", {});
  }
});
