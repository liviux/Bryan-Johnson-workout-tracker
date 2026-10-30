// Quick checks for the per-language review maps. It is not a translator: it
// catches structural slips, misaligned pairs and placeholders before the
// catalogues are rebuilt.
import { readFileSync } from "node:fs";
import { review } from "./i18n-review/index.mjs";
import { uiNames } from "./i18n-ui-names.mjs";
import { core } from "./i18n-core.mjs";

const keys = new Set(JSON.parse(readFileSync(new URL("./i18n-keys.json", import.meta.url), "utf8")));
const keep = new Set(["Bryan", "Bryan Johnson", "Blueprint", "FIP", "KEXP", "The Current", "Rinse FM", "Fréquence 3", "Radio Paradise", "YouTube", "X", "DEXA", "VO2 max", "ASCII", "Anime", "Auto", "HIIT", "kg", "lb", "cm", "in", "bpm", "min", "s", "Zone 2"]);
let problems = 0;

function check(language, source, value, origin) {
  const key = source.trim();
  if (!value || typeof value !== "string") {
    console.log(`${language} ${origin}: empty value for ${JSON.stringify(key)}`);
    problems++;
    return;
  }
  if (value.includes("QQQ")) {
    console.log(`${language} ${origin}: protected-token leftover in ${JSON.stringify(key)}`);
    problems++;
  }
  for (const match of key.matchAll(/\{(\w+)\}/g)) {
    if (!value.includes(`{${match[1]}}`)) {
      console.log(`${language} ${origin}: ${JSON.stringify(key)} lost {${match[1]}}`);
      problems++;
    }
  }
  if (!keep.has(key) && value === key) {
    console.log(`${language} ${origin}: left in English: ${JSON.stringify(key)}`);
    problems++;
  }
  if (key.length <= 25 && value.length > 90) {
    console.log(`${language} ${origin}: suspiciously long value for ${JSON.stringify(key)} -> ${JSON.stringify(value.slice(0, 80))}…`);
    problems++;
  }
  if (key.length >= 60 && !["zh", "hi", "ar", "bn"].includes(language) && value.length < key.length * 0.35) {
    console.log(`${language} ${origin}: suspiciously short value for ${JSON.stringify(key.slice(0, 60))}… -> ${JSON.stringify(value)}`);
    problems++;
  }
  if (!keys.has(key) && origin === "review") {
    console.log(`${language} review: key is not in i18n-keys.json: ${JSON.stringify(key)}`);
  }
}

for (const [language, map] of Object.entries(review)) {
  for (const [key, value] of Object.entries(map)) check(language, key, value, "review");
}
for (const [language, map] of Object.entries(uiNames)) {
  for (const [key, value] of Object.entries(map)) check(language, key, value, "names");
}
for (const [language, map] of Object.entries(core)) {
  for (const [key, value] of Object.entries(map)) check(language, key, value, "core");
}
console.log(`${problems} problem${problems === 1 ? "" : "s"}`);
process.exitCode = problems ? 1 : 0;
