import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LANGUAGES, useCatalogue } from "../public/js/i18n.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { ALL_VOICES, LANGUAGE_VOICES, VOICES, voiceById, voicesForLanguage } from "../public/js/voice/script.js";

const keys = JSON.parse(readFileSync(new URL("../scripts/i18n-keys.json", import.meta.url), "utf8"));
const translated = LANGUAGES.filter((language) => language.id !== "en");

test("fifty languages are offered, each with a native catalogue", async () => {
  assert.equal(LANGUAGES.length, 50);
  assert.deepEqual(LANGUAGES.map((language) => language.id), ["en", "zh", "es", "ar", "hi", "pt", "ru", "ja", "fr", "de", "id", "bn", "tr", "vi", "ko", "it", "fa", "ur", "pl", "th", "nl", "ms", "ro", "fil", "uk", "sw", "el", "cs", "sv", "hu", "he", "da", "fi", "no", "bg", "sk", "hr", "sr", "lt", "sl", "lv", "et", "ca", "is", "af", "sq", "mk", "bs", "ka", "az"]);
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
  assert.equal(LANGUAGE_VOICES.length, 49);
  assert.equal(ALL_VOICES.length, 54);
  assert.equal(new Set(ALL_VOICES.map((voice) => voice.id)).size, ALL_VOICES.length, "voice ids are unique");
  assert.equal(new Set(LANGUAGE_VOICES.map((voice) => voice.edge)).size, LANGUAGE_VOICES.length, "each language uses a different native voice");
  assert.deepEqual(LANGUAGE_VOICES.map((voice) => voice.lang).sort(), translated.map((language) => language.id).sort(), "every translated language has exactly one voice");
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

test("release notes translate the whole line, not just text around bold labels", async () => {
  const german = (await import("../public/js/locales/de.js")).default;
  useCatalogue("de", german);
  try {
    const { renderReleases } = await import("../public/js/components/changelog.js");
    const html = renderReleases([
      "## [1.44.5] - 2026-10-29\n\n### Fixed\n- Switching language now shows the voice download button immediately. **Turn coaching on** is no longer greyed out; turning it on with an unsaved voice also starts the download.",
    ]);
    assert.match(html, /<h4>Fehlerbehebungen<\/h4>/);
    assert.match(html, /Beim Wechseln der Sprache wird jetzt sofort/);
    assert.match(html, /„<strong>Coaching einschalten<\/strong>“/);
    assert.doesNotMatch(html, /Turn coaching on/);
  } finally {
    useCatalogue("en", {});
  }
});
