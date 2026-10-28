import assert from "node:assert/strict";
import test from "node:test";
import { parseRx } from "../public/js/rx.js";

test("dose parsing reads translated units and native digits", () => {
  assert.deepEqual(parseRx("5 Minuten @ 60-70%"), { sets: 1, explicitSets: false, reps: "", seconds: null, minutes: 5, perSide: false, unit: "" });
  assert.deepEqual(parseRx("2 × 20 à 30 s"), { sets: 2, explicitSets: true, reps: "", seconds: 30, minutes: null, perSide: false, unit: "" });
  assert.deepEqual(parseRx("2 × 15–20 s, knees down is fine"), { sets: 2, explicitSets: true, reps: "", seconds: 20, minutes: null, perSide: false, unit: "" });
  assert.deepEqual(parseRx("45 s/side"), { sets: 1, explicitSets: false, reps: "", seconds: 45, minutes: null, perSide: true, unit: "" });
  assert.deepEqual(parseRx("20 secunde fiecare parte"), { sets: 1, explicitSets: false, reps: "", seconds: 20, minutes: null, perSide: true, unit: "" });
  assert.equal(parseRx("৪০ মিনিট; ওয়েটেড ভেস্ট ঐচ্ছিক").minutes, 40);
  assert.equal(parseRx("1 minut, ușor").minutes, 1);
  assert.equal(parseRx("دقيقتان مع حمل").minutes, 2);
  assert.equal(parseRx("30–50 de repetări").reps, "30–50");
  assert.equal(parseRx("2 × 6/side, 2 s hold").perSide, true);
});

test("equipment counts and tempo are not read as extra sets", () => {
  assert.equal(parseRx("1 × 12 @ 2 × 10 kg").sets, 1);
  assert.equal(parseRx("2 min holding 2 × 8–10 kg").sets, 1);
  assert.equal(parseRx("2 min holding 2 × 8–10 kg").minutes, 2);
  assert.equal(parseRx("1 × 5 slow holds").reps, "5");
});
