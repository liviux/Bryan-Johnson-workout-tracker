import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../public/js/data/exercises.js";
import { useCatalogue } from "../public/js/i18n.js";
import { migrateProfile } from "../public/js/personalize.js";
import { holdPhases } from "../public/js/components/timer.js";

test("timed single-side holds name the side and the switch", () => {
  const leg = holdPhases(30, 2, "leg").map((phase) => phase.label);
  assert.deepEqual(leg, ["Get set", "First side", "Switch legs", "Other leg"]);
  const arm = holdPhases(20, 2, "arm").map((phase) => phase.label);
  assert.deepEqual(arm, ["Get set", "First side", "Switch arms", "Other arm"]);
  const side = holdPhases(15, 2, "side").map((phase) => phase.label);
  assert.deepEqual(side, ["Get set", "First side", "Switch sides", "Other side"]);
  assert.deepEqual(holdPhases(30, 1, "leg").map((phase) => phase.label), ["Get set", "Hold"]);
});

test("old rest timer settings are dropped from saved profiles", () => {
  const profile = { settings: { restSec: 60, restMode: "fixed", autoRest: false, coachDetail: "coach", sound: false } };
  assert.equal(migrateProfile(profile), true);
  assert.deepEqual(profile.settings, { sound: false });
  assert.equal(migrateProfile(profile), false);
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
