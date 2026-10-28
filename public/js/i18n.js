// App language: loads one translation catalogue, translates the rendered page,
// and localises the plan data without changing how the rest of the app works.
//
// English is the source language. Every other catalogue maps the exact English
// phrase to its translation. Templates use {name} placeholders, so the same
// catalogue works in the browser and when the shared voice packs are built.

export const LANGUAGES = [
  { id: "en", name: "English", native: "English", locale: "en" },
  { id: "ro", name: "Romanian", native: "Română", locale: "ro-RO" },
  { id: "de", name: "German", native: "Deutsch", locale: "de-DE" },
  { id: "it", name: "Italian", native: "Italiano", locale: "it-IT" },
  { id: "fr", name: "French", native: "Français", locale: "fr-FR" },
  { id: "es", name: "Spanish", native: "Español", locale: "es-ES" },
  { id: "zh", name: "Chinese (Simplified)", native: "简体中文", locale: "zh-CN" },
  { id: "hi", name: "Hindi", native: "हिन्दी", locale: "hi-IN" },
  { id: "ar", name: "Arabic", native: "العربية", locale: "ar-SA", rtl: true },
  { id: "bn", name: "Bengali", native: "বাংলা", locale: "bn-BD" },
];

const byId = new Map(LANGUAGES.map((language) => [language.id, language]));
let current = "en";
let catalogue = {};
let translatedValues = new Set();
let loading = null;
const listeners = new Set();
const objectCache = new WeakMap();

const ATTRIBUTES = ["title", "aria-label", "aria-description", "placeholder", "alt"];
const SKIP = "script, style, textarea, code, pre, .note, [contenteditable='true'], [data-i18n-skip]";

export function languageInfo(id = current) {
  return byId.get(id) || LANGUAGES[0];
}

export function language() {
  return current;
}

export function locale() {
  return languageInfo().locale;
}

export function onLanguage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function normaliseLanguage(value) {
  return byId.has(value) ? value : "en";
}

// Server-side pack builders import a catalogue and switch to it without a DOM.
export function useCatalogue(id, map) {
  current = normaliseLanguage(id);
  catalogue = map || {};
  translatedValues = new Set(Object.values(catalogue));
  return current;
}

// Loads a catalogue before the first paint of a translated view. English needs
// no file; every other language returns a plain source-string → translation map.
export async function setLanguage(value, { silent = false } = {}) {
  const id = normaliseLanguage(value);
  if (id !== current) {
    current = id;
    catalogue = {};
    translatedValues = new Set();
    loading = id === "en" ? Promise.resolve() : import(`./locales/${id}.js`).then((module) => { catalogue = module.default || {}; translatedValues = new Set(Object.values(catalogue)); }).catch((err) => { console.warn(`Language ${id}:`, err.message); catalogue = {}; translatedValues = new Set(); });
  }
  await loading;
  if (typeof document !== "undefined") {
    document.documentElement.lang = languageInfo().locale;
    document.documentElement.dir = languageInfo().rtl ? "rtl" : "ltr";
    if (!silent) for (const fn of listeners) fn(current);
    localizeDocument();
  }
  return current;
}

export function t(source, vars) {
  let text = catalogue[source] ?? source;
  if (vars) for (const [key, value] of Object.entries(vars)) text = text.replaceAll(`{${key}}`, String(value ?? ""));
  return text;
}

export function hasTranslation(source) {
  return Object.prototype.hasOwnProperty.call(catalogue, source);
}

// Exact-phrase translation for text that comes from the plan data or a rendered
// template. Unknown text falls through unchanged.
export function translate(source) {
  return typeof source === "string" ? catalogue[source] ?? source : source;
}

// Rendered text may already be the translation of a different key. Do not run
// it through the catalogue again: "Minute" is Romanian for "Minutes" but also
// the English key for one minute, and double translation would shorten it.
function translateRendered(source) {
  return translatedValues.has(source) ? source : translate(source);
}

function translatedNodeValue(value) {
  const text = String(value ?? "");
  const trimmed = text.trim();
  if (!trimmed) return text;
  const next = translateRendered(trimmed);
  if (next === trimmed) return text;
  const start = text.indexOf(trimmed);
  return `${text.slice(0, start)}${next}${text.slice(start + trimmed.length)}`;
}

export function localizeDocument(root = document) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.parentElement && !root.parentElement.closest(SKIP)) {
      const next = translatedNodeValue(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
    }
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    for (const name of ATTRIBUTES) {
      if (!root.hasAttribute(name)) continue;
      const value = root.getAttribute(name);
      const next = translateRendered(value);
      if (next !== value) root.setAttribute(name, next);
    }
    if (root.matches(SKIP)) return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) {
    if (walker.currentNode.nodeType === Node.TEXT_NODE) {
      const value = walker.currentNode.nodeValue;
      const next = translatedNodeValue(value);
      if (next !== value) walker.currentNode.nodeValue = next;
    } else {
      for (const name of ATTRIBUTES) {
        if (!walker.currentNode.hasAttribute(name)) continue;
        const value = walker.currentNode.getAttribute(name);
        const next = translateRendered(value);
        if (next !== value) walker.currentNode.setAttribute(name, next);
      }
    }
  }
}

// The app replaces innerHTML often (guided workouts, timers, dialogs, toasts).
// Watching the body means new chunks are translated as they arrive, without
// every view having to call the translator itself.
export function watchTranslations() {
  if (!document.body || watchTranslations.started) return;
  watchTranslations.started = true;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        const value = mutation.target.getAttribute(mutation.attributeName);
        const next = translateRendered(value);
        if (next !== value) mutation.target.setAttribute(mutation.attributeName, next);
        continue;
      }
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (parent && !parent.closest(SKIP)) {
          const currentText = mutation.target.nodeValue;
          const next = translatedNodeValue(currentText);
          if (next !== currentText) mutation.target.nodeValue = next;
        }
        continue;
      }
      for (const node of mutation.addedNodes) if (node.isConnected) localizeDocument(node);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  localizeDocument();
}

// Plan objects are wrapped once. Reading a display string returns the current
// language's version; ids, urls, enum values and numbers pass through.
const RAW_KEYS = new Set(["id", "ex", "u", "k", "s", "icon", "color", "log", "type", "kind", "scope", "equipment", "muscles", "cats", "mode", "optional", "tier", "key", "url", "session", "date", "variant"]);

function localizeValue(value, parentKey = "") {
  if (typeof value === "string") return RAW_KEYS.has(parentKey) ? value : translate(value);
  if (Array.isArray(value)) return localized(value);
  if (value && typeof value === "object") return localized(value);
  return value;
}

export function localized(value) {
  if (!value || typeof value !== "object") return value;
  let cached = objectCache.get(value);
  if (cached && cached.language === current) return cached.proxy;
  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      if (typeof key === "string" && RAW_KEYS.has(key)) return result;
      // Array methods must run with the proxy as `this`, so map/filter/splice
      // see translated items and mutations reach the original array.
      if (typeof result === "function") return result;
      return localizeValue(result, typeof key === "string" ? key : "");
    },
  });
  objectCache.set(value, { language: current, proxy });
  return proxy;
}
