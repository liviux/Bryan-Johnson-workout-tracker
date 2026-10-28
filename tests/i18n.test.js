import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LANGUAGES, useCatalogue } from "../public/js/i18n.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { ALL_VOICES, LANGUAGE_VOICES, VOICES, voiceById, voicesForLanguage } from "../public/js/voice/script.js";

const keys = JSON.parse(readFileSync(new URL("../scripts/i18n-keys.json", import.meta.url), "utf8"));
const translated = LANGUAGES.filter((language) => language.id !== "en");

test("ten languages are offered, each with a native catalogue", async () => {
  assert.equal(LANGUAGES.length, 10);
  assert.deepEqual(LANGUAGES.map((language) => language.id), ["en", "ro", "de", "it", "fr", "es", "zh", "hi", "ar", "bn"]);
  for (const language of translated) {
    const catalogue = (await import(`../public/js/locales/${language.id}.js`)).default;
    const missing = keys.filter((key) => typeof catalogue[key] !== "string" || !catalogue[key].trim());
    assert.deepEqual(missing, [], `${language.id} has every phrase`);
    assert(!JSON.stringify(catalogue).includes("QQQ"), `${language.id} has no protected-token leftovers`);
  }
});

test("placeholders survive translation, so counts and names stay in the right place", async () => {
  for (const language of translated) {
    const catalogue = (await import(`../public/js/locales/${language.id}.js`)).default;
    for (const key of keys) {
      const placeholders = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      if (!placeholders.length) continue;
      const value = catalogue[key] || "";
      for (const name of placeholders) assert(value.includes(`{${name}}`), `${language.id}: ${key} lost {${name}}`);
    }
  }
});

test("plan data and exercise names switch language without changing ids", async () => {
  const german = (await import("../public/js/locales/de.js")).default;
  useCatalogue("de", german);
  try {
    assert.equal(EXERCISES.row.name, "Einarmiges Kurzhantelrudern");
    assert.equal(EXERCISES.row.id, undefined);
    assert.equal(EXERCISES.row.log, "load");
    assert.match(EXERCISES.row.how.join(" "), /Rücken/);
    assert.match(EXERCISES.row.how[0], /Legen Sie eine Hand und ein Knie auf einen Stuhl oder ein Bett\./);
  } finally {
    useCatalogue("en", {});
  }
});

test("language review files keep every placeholder", async () => {
  const { review } = await import("../scripts/i18n-review/index.mjs");
  const { core } = await import("../scripts/i18n-core.mjs");
  for (const language of translated) {
    for (const [key, value] of [...Object.entries(review[language.id] || {}), ...Object.entries(core[language.id] || {})]) {
      assert.equal(typeof value, "string", `${language.id}: ${key} is text`);
      assert(value.trim(), `${language.id}: ${key} is not empty`);
      for (const match of key.matchAll(/\{(\w+)\}/g)) assert(value.includes(`{${match[1]}}`), `${language.id}: ${key} lost {${match[1]}}`);
      assert(!value.includes("QQQ"), `${language.id}: ${key} has a protected-token leftover`);
    }
  }
});

test("each language has a native coach voice and English keeps its five", () => {
  assert.equal(VOICES.length, 5);
  assert.equal(LANGUAGE_VOICES.length, 9);
  assert.equal(ALL_VOICES.length, 14);
  for (const language of translated) {
    const voices = voicesForLanguage(language.id);
    assert.equal(voices.length, 1, `${language.id} has one voice`);
    assert.equal(voices[0].engine, "edge");
    assert.equal(voiceById(voices[0].id), voices[0]);
  }
  assert.equal(voicesForLanguage("en").length, 5);
});

test("German coach speech is generated from translated plan text", async () => {
  const german = (await import("../public/js/locales/de.js")).default;
  useCatalogue("de", german);
  try {
    const { exerciseScript } = await import("../public/js/voice/script.js");
    const { defaultProfile } = await import("../public/js/personalize.js");
    const item = EXERCISES.row && { id: "row", ex: "row" };
    const script = exerciseScript({ item, rx: "3 × 10/arm", level: 2, profile: defaultProfile() });
    assert.equal(script.name, "Einarmiges Kurzhantelrudern");
    assert.match(script.intro.join(" "), /Wiederholungen/);
    assert.match(script.sets[0], /^Satz 1 von 3\./);
  } finally {
    useCatalogue("en", {});
  }
});
