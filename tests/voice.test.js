import assert from "node:assert/strict";
import test from "node:test";
import { DAYS } from "../public/js/data/program.js";
import { ADDONS } from "../public/js/data/addons/index.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { parseRx } from "../public/js/components/logger.js";
import { defaultProfile, LEVELS, personalize } from "../public/js/personalize.js";
import { rxFor } from "../public/js/plan.js";
import { CLOCK, VOICES, clockKey, durationText, exerciseScript, phaseLine, sentences, speechText } from "../public/js/voice/script.js";
import { buildSharedVoicePack, buildVoicePack, prepareManifest } from "../voice/service.js";

const items = [...DAYS.flatMap((d) => d.blocks.flatMap((b) => b.items)), ...ADDONS.flatMap((a) => Object.values(a.variants).flatMap((v) => v.items))];

test("speech covers real prescriptions at every level, in both unit systems", () => {
  for (const [level, { id }] of LEVELS.entries()) for (const units of ["metric", "imperial"]) {
    const profile = { ...defaultProfile(), level: id, units, sex: level % 2 ? "male" : "female", maxDumbbellKg: 12 };
    for (const item of items) {
      const rx = rxFor(item, level);
      if (!rx || rx === "—") continue;
      const script = exerciseScript({ item, rx, profile, level });
      const lines = [...script.intro, ...script.how, ...script.safety, ...script.sets];
      assert(lines.length, item.id);
      for (const line of lines) {
        assert.doesNotMatch(line, /[×@{}—–]|\b(?:NaN|undefined|kg|lb|bpm)\b|\d/, `${item.id}: ${line}`);
        assert(line.length < 500, `${item.id} clip is bounded`);
      }
      if (rx.includes("{kg:")) assert.match(script.intro.join(" "), /weight shown on screen/);
      assert(!script.name.includes("{"));
    }
  }
});

test("spoken lines never consist only of punctuation", () => {
  for (const text of ["Heart rate (60–70%). You can talk.", "Zone 2 (easy). Finish."]) {
    const lines = sentences(speechText(text));
    assert(lines.length);
    for (const line of lines) assert.match(line, /[\p{L}\p{N}]/u);
  }
});

test("equipment counts never become extra sets, and time and tempo survive", () => {
  assert.equal(speechText("2 min holding 2 × 8–10 kg"), "two minutes holding two weights of eight to ten kilograms each");
  assert.equal(speechText("1 × 12 @ 2 × 10 kg"), "one set of twelve reps at two weights of ten kilograms each");
  assert.equal(speechText("1 × 25 + 1 × 10/leg single-leg"), "one set of twenty five reps, then one set of ten reps each leg single-leg");
  assert.equal(speechText("2 × 15–20 s, knees down is fine"), "two sets of fifteen to twenty seconds, knees down is fine");
  assert.equal(speechText("1–2 min, bodyweight, slow"), "one to two minutes, bodyweight, slow");
  assert.match(speechText("2 × 8 @ 5.5–8 kg, down to a chair, 3 s down"), /five point five to eight kilograms, down to a chair, three seconds down/);
  const item = items.find((it) => it.ex === "backwalkloaded");
  const script = exerciseScript({ item, rx: "2 min holding 2 × 8–10 kg", level: 2 });
  assert.equal(script.setCount, null);
  assert.deepEqual(script.sets, []);
});

test("shared speech keeps the prescribed dose while personal loads and heart rates stay on screen", () => {
  const item = items.find((it) => it.ex === "row");
  const profile = { ...defaultProfile(), level: "active", units: "imperial", sex: "male", maxDumbbellKg: 12 };
  const raw = rxFor(item, 2);
  assert.match(personalize(raw, profile), /lb \(your heaviest\)/);
  const result = prepareManifest({ itemId: item.id, level: 2, profile, easier: "dose", voice: "am_michael" });
  const expected = speechText(rxFor(item, 1), profile);
  assert.equal(result.intro.map((c) => c.text).join(" ").includes(expected), true);
  assert.match(result.sets[0].text, /each side/);
  assert.match(result.intro.map((c) => c.text).join(" "), /weight shown on screen/);
  assert.doesNotMatch(result.intro.map((c) => c.text).join(" "), /pounds|heaviest/);
  const easier = prepareManifest({ itemId: item.id, level: 2, easier: "version" });
  assert.deepEqual(easier.how, []);
  const retained = prepareManifest({ itemId: item.id, level: 2, easier: "version", doseLevel: 1 });
  assert(retained.intro.map((c) => c.text).join(" ").includes(speechText(rxFor(item, 1), defaultProfile())));
  assert.match(retained.effort.text, /two or three/);
  const cardio = items.find((it) => it.ex === "zone2");
  const cleared = prepareManifest({ itemId: cardio.id, level: 2, profile: { age: 30, hrMax: null }, timer: { type: "countdown", minutes: 10 } }, { hrMax: 230 });
  assert.match(cleared.phases[1].map((c) => c.text).join(" "), /prescribed heart-rate range/);
  const other = prepareManifest({ itemId: item.id, level: 2, profile: { age: 78, sex: "female", weightKg: 44, hrMax: 180, maxDumbbellKg: 3, units: "imperial" }, easier: "dose", voice: "am_michael" });
  assert.deepEqual(result, other, "different personal details use exactly the same speech files");
});

test("the public pack covers all levels, units, add-ons, easier alternatives and arbitrary timer durations", () => {
  const ids = new Set(buildSharedVoicePack("af_heart").map((entry) => entry.id));
  const check = (entry) => {
    if (entry.parts) entry.parts.forEach(check);
    else assert(ids.has(entry.id), entry.text);
  };
  for (const [level, { id }] of LEVELS.entries()) for (const units of ["metric", "imperial"]) {
    const profile = { ...defaultProfile(), level: id, units, age: 82, weightKg: 54, maxDumbbellKg: 2.5, hrMax: 168 };
    buildVoicePack({ voice: "af_heart", level, addons: ADDONS.map((a) => a.id), restSec: 3599 }, profile).forEach(check);
  }
});

test("level-specific teaching and safety follow the actual movement", () => {
  const make = (level) => {
    const item = items.find((it) => it.ex === (level === 0 ? "backwalkplain" : "backwalkloaded"));
    return exerciseScript({ item, rx: rxFor(item, level), profile: defaultProfile(), level });
  };
  assert(!make(0).how.join(" ").includes("a dumbbell in each hand"));
  assert(make(2).how.join(" ").includes("dumbbell"));
  assert(make(0).safety.some((s) => /Stop if you feel pain inside the knee/.test(s)));
});

test("hold, recovery and countdown cues use their own names and exact durations", () => {
  assert.equal(durationText(75), "one minute and fifteen seconds");
  assert.match(phaseLine({ kind: "work", label: "Other side", sec: 45 }, "hold"), /^Other side\. forty five seconds/);
  assert.doesNotMatch(phaseLine({ kind: "work", label: "First side", sec: 20 }, "hold"), /Interval|Round|Work!/);
  assert.match(phaseLine({ kind: "work", label: "Zone 2", sec: 1200, sub: "120–140 bpm" }, "countdown"), /^Zone two\. twenty minutes/);
  assert.match(phaseLine({ kind: "rest", sec: 75 }), /one minute and fifteen seconds/);
  assert(!phaseLine({ kind: "work", sec: 20, sub: "120–140 bpm" }).includes("beats"));
  assert.equal(clockKey(20, 10, "work"), null);
  assert.equal(clockKey(30, 10, "work"), "workTen");
  assert.equal(clockKey(60, 30, "work"), "thirty");
  assert.equal(clockKey(180, 60, "work"), "minute");
  assert.equal(clockKey(240, 120, "work"), "halfway");
  assert.equal(clockKey(75, 10, "rest"), "ten");
  assert(!Object.values(CLOCK).some((s) => /great job/i.test(s)));
});

test("five voices include US men and women; paces reuse cached audio", () => {
  assert.equal(VOICES.length, 5);
  assert(VOICES.some((v) => v.id.startsWith("am_")));
  assert(VOICES.some((v) => v.id.startsWith("af_")));
  const first = prepareManifest({ preview: true, voice: "af_heart" }).preview;
  assert.equal(first.id, prepareManifest({ preview: true, voice: "af_heart" }).preview.id);
  assert.notEqual(first.id, prepareManifest({ preview: true, voice: "am_michael" }).preview.id);
  const brisk = prepareManifest({ preview: true, pace: "brisk" }).preview;
  assert.equal(first.id, brisk.id);
  assert.equal(brisk.rate, 1.06);
  assert.equal(first.rate, 1);
  assert.match(first.url, /^\/api\/voice\/audio\/[a-f0-9]{64}\.wav$/);
});

test("a deduplicated voice pack covers the week, both paces and interval movement choices", () => {
  const profile = { ...defaultProfile(), level: "active" };
  const pack = buildVoicePack({ voice: "af_heart", addons: [] }, profile);
  const ids = new Set(pack.map((entry) => entry.id));
  assert.equal(ids.size, pack.length);
  assert(pack.every((entry) => entry.sid === VOICES[0].sid && entry.speed === 1));
  const collect = (value) => {
    if (value?.id) assert(ids.has(value.id), value.text);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  for (const day of DAYS) for (const block of day.blocks) for (const item of block.items) {
    if (!rxFor(item, 2) || rxFor(item, 2) === "—") continue;
    collect(prepareManifest({ voice: "af_heart", itemId: item.id, level: 2, pace: "brisk" }, profile));
  }
  const interval = items.find((item) => item.ex === "shortint");
  collect(prepareManifest({ voice: "af_heart", itemId: interval.id, level: 2, timer: { type: "intervals", preset: 0, moves: ["burpee", "jacks"] } }, profile));
  assert.throws(() => buildVoicePack({ level: 99 }), /Invalid training level/);
  assert.throws(() => buildVoicePack({ addons: ["unknown"] }), /Unknown add-on/);
});

test("packs include the hold and cardio timers offered by the logger at every level", () => {
  for (const [level, { id }] of LEVELS.entries()) {
    const profile = { ...defaultProfile(), level: id };
    const ids = new Set(buildVoicePack({ addons: ADDONS.map((addon) => addon.id) }, profile).map((entry) => entry.id));
    for (const item of items) {
      const rx = rxFor(item, level);
      if (!rx || rx === "—") continue;
      const type = EXERCISES[item.ex].log;
      const target = parseRx(personalize(rx, profile));
      const timer = type === "hold" || (type === "check" && target.seconds)
        ? { type: "hold", seconds: target.seconds || 30, sides: target.perSide ? 2 : 1 }
        : type === "cardio" && target.minutes ? { type: "countdown", minutes: target.minutes } : null;
      if (!timer) continue;
      const manifest = prepareManifest({ itemId: item.id, level, timer }, profile);
      for (const clip of manifest.phases.flat()) assert(ids.has(clip.id), `${id}: ${item.id}: ${clip.text}`);
    }
  }
});

test("the local API accepts plan context, never arbitrary speech or invalid resource requests", () => {
  const item = items.find((it) => it.ex === "row");
  assert.throws(() => prepareManifest({ text: "Speak this for anyone" }), /Unknown workout/);
  assert.throws(() => prepareManifest({ preview: true, voice: "unknown" }), /Unknown voice/);
  assert.throws(() => prepareManifest({ itemId: item.id, level: 99 }), /Unknown workout/);
  assert.throws(() => prepareManifest({ itemId: item.id, level: 1, restSec: 999999 }), /Invalid rest/);
  assert.throws(() => prepareManifest({ itemId: item.id, level: 1, profile: { age: "arbitrary text" } }), /Invalid profile/);
  assert.throws(() => prepareManifest({ itemId: item.id, level: 1, timer: { type: "hold", seconds: -1, sides: 1 } }), /Invalid hold/);
  const hidden = items.find((it) => rxFor(it, 0) === "—");
  assert.throws(() => prepareManifest({ itemId: hidden.id, level: 0 }), /not in this level/);
});
