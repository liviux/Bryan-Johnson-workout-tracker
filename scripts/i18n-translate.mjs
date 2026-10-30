// Build the translation catalogues with Google's public translate endpoint.
// Run: node scripts/i18n-translate.mjs [language...]
// The output is committed; the app never calls a translation service.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { overrides } from "./i18n-overrides.mjs";
import { fixes } from "./i18n-fixes.mjs";
import { terms } from "./i18n-terms.mjs";
import { uiNames } from "./i18n-ui-names.mjs";
import { review } from "./i18n-review/index.mjs";
import { core } from "./i18n-core.mjs";
import { LANGUAGES } from "../public/js/i18n.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keys = JSON.parse(readFileSync(path.join(root, "scripts/i18n-keys.json"), "utf8"));
const languages = process.argv.slice(2).length ? process.argv.slice(2) : LANGUAGES.filter((entry) => entry.id !== "en").map((entry) => entry.id);
const allKeys = [...new Set([...keys, ...Object.values(overrides).flatMap((map) => Object.keys(map)), ...Object.values(fixes).flatMap((map) => Object.keys(map)), ...Object.values(terms).flatMap((map) => Object.keys(map)), ...Object.values(uiNames).flatMap((map) => Object.keys(map)), ...Object.values(review).flatMap((map) => Object.keys(map)), ...Object.values(core).flatMap((map) => Object.keys(map))])];
const cacheFile = process.env.I18N_CACHE || path.join(root, "scripts/i18n-cache.json");
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};

const levelWords = /\bAt (?:New to training and Returning|Returning and above|Returning|higher levels|Active|Well trained)\b|\((?:Returning|Active|Well trained)\):/g;

function protect(text) {
  const replacements = [];
  const body = text
    .replace(levelWords, (match) => { replacements.push(match); return `QQQ${replacements.length - 1}QQQ`; })
    .replace(/\{[^}]+\}/g, (match) => { replacements.push(match); return `QQQ${replacements.length - 1}QQQ`; })
    .replace(/<[^>]+>/g, (match) => { replacements.push(match); return `QQQ${replacements.length - 1}QQQ`; })
    .replace(/`[^`]+`/g, (match) => { replacements.push(match); return `QQQ${replacements.length - 1}QQQ`; })
    .replace(/\*\*/g, () => { replacements.push("**"); return `QQQ${replacements.length - 1}QQQ`; });
  return { body, replacements };
}

function restore(text, replacements) {
  // The public endpoint sometimes drops a Q or the index from a protected
  // token. Recover the index when it survives, otherwise take the next
  // replacement that is not already present in the sentence.
  const present = new Set(replacements.filter((value) => value && text.includes(value)));
  const used = new Set();
  let out = text.replace(/Q{2,}\s*(\d+)?\s*Q{2,}/g, (match, index) => {
    const exact = index == null ? -1 : Number(index);
    if (exact >= 0 && exact < replacements.length && !used.has(exact)) {
      used.add(exact);
      return replacements[exact] ?? "";
    }
    const next = replacements.findIndex((value, position) => !used.has(position) && !present.has(value));
    if (next < 0) return match;
    used.add(next);
    return replacements[next] ?? "";
  });
  out = out.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").trim();
  return out;
}

// Cached values were restored when they were written. Repair a mangled token
// that slipped through, and fall back to the English key when a placeholder
// cannot be recovered safely.
function repair(key, value) {
  const placeholders = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[0]);
  let out = value;
  if (/Q{2,}/.test(out)) {
    const used = new Set(placeholders.filter((placeholder) => out.includes(placeholder)));
    out = out.replace(/Q{2,}\s*(\d+)?\s*Q{2,}/g, (match, index) => {
      const exact = index == null ? -1 : Number(index);
      if (exact >= 0 && exact < placeholders.length && !used.has(placeholders[exact])) {
        used.add(placeholders[exact]);
        return placeholders[exact];
      }
      const next = placeholders.find((placeholder) => !used.has(placeholder));
      if (!next) return match;
      used.add(next);
      return next;
    });
  }
  if (/Q{2,}/.test(out) || placeholders.some((placeholder) => !out.includes(placeholder))) return key;
  return out;
}

async function translateBatch(texts, language) {
  const wrapped = texts.map(protect);
  const body = wrapped.map(({ body }) => `q=${encodeURIComponent(body)}`).join("&");
  const response = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${language}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
    body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const list = Array.isArray(data) ? data : data?.sentences ? data.sentences.map((s) => s.trans) : null;
  if (!Array.isArray(list) || list.length !== texts.length) throw new Error(`Unexpected response (${list?.length} vs ${texts.length})`);
  return list.map((value, index) => restore(String(value), wrapped[index].replacements));
}

async function translate(texts, language) {
  const out = {};
  const missing = [];
  for (const text of texts) {
    const hit = cache[`${language}\n${text}`];
    if (hit != null) out[text] = repair(text, hit); else missing.push(text);
  }
  for (let start = 0; start < missing.length; start += 50) {
    const chunk = missing.slice(start, start + 50);
    let result;
    for (let attempt = 0; attempt < 6; attempt++) {
      try { result = await translateBatch(chunk, language); break; }
      catch (err) {
        if (attempt === 5) throw err;
        const busy = /HTTP 429|HTTP 5\d\d/.test(err.message);
        const wait = busy ? 20000 * (attempt + 1) : 1000 * (attempt + 1);
        if (busy) console.warn(`${language}: ${err.message}, retrying in ${wait / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
    for (const [index, text] of chunk.entries()) {
      out[text] = repair(text, result[index]);
      cache[`${language}\n${text}`] = result[index];
    }
    if (start % 500 === 0) {
      writeFileSync(cacheFile, JSON.stringify(cache));
      console.log(`${language}: ${Math.min(start + chunk.length, missing.length)}/${missing.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  writeFileSync(cacheFile, JSON.stringify(cache));
  return out;
}

// A long English sentence should not become a single word. Such entries usually
// mean a review table slipped out of alignment; keep the generated translation.
function usableReview(language, map) {
  const out = {};
  for (const [key, value] of Object.entries(map || {})) {
    const shortForSentence = key.length >= 60 && !["zh", "hi", "ar", "bn"].includes(language) && value.length < key.length * 0.35;
    if (shortForSentence) {
      console.warn(`${language}: skipped suspicious review value for ${JSON.stringify(key.slice(0, 60))}… -> ${JSON.stringify(value)}`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

for (const language of languages) {
  console.log(`${language}: ${allKeys.length} phrases`);
  const translations = await translate(allKeys, language);
  Object.assign(translations, overrides[language] || {}, terms[language] || {}, fixes[language] || {}, uiNames[language] || {}, usableReview(language, review[language]), core[language] || {});
  for (const key of allKeys) {
    const value = translations[key];
    const placeholders = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[0]);
    if (!value || /Q{2,}/.test(value) || placeholders.some((placeholder) => !value.includes(placeholder))) translations[key] = key;
  }
  const missing = allKeys.filter((key) => !translations[key] || translations[key] === key);
  const lines = [
    "// Generated by scripts/i18n-translate.mjs. Do not edit by hand.",
    "export default {",
    ...allKeys.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(translations[key] || key)},`),
    "};",
    "",
  ];
  writeFileSync(path.join(root, "public/js/locales", `${language}.js`), lines.join("\n"));
  console.log(`${language}: ${allKeys.length - missing.length} translated, ${missing.length} left in English`);
}
