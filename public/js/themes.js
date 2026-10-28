import { localized, t } from "./i18n.js";
import { blockKindFromName } from "./data/block-kinds.js";
// Themes: each look has its own layout, type and
// colours (css/themes.css), on top of the light/dark mode setting.
//
// The chosen theme is profile.settings.skin; the mode is profile.settings.theme
// ("system" | "light" | "dark"). Both are mirrored in localStorage so the right
// look paints before the app boots (see the inline script in index.html).
// <html> carries data-skin, data-theme (a forced mode, if any) and data-scheme
// (the resolved "light" or "dark"), which is all the CSS and the 3D stage read.

import { esc } from "./util.js";

export const SKINS = localized([
  {
    id: "original",
    name: "Original",
    blurb: "Left sidebar, rounded cards and teal accents.",
    modes: ["light", "dark"],
    preview: "Goblet squat with the Athlete animation",
  },
  {
    id: "chapters",
    name: "Chapters",
    blurb: "Top navigation, large headings and a colour for each workout block.",
    modes: ["light", "dark"],
    preview: "Push-up with the Anime animation",
  },
  {
    id: "darkroom",
    name: "Dark room",
    blurb: "A dark background, the exercise on the left and navigation on the right.",
    modes: ["dark"],
    preview: "One-arm dumbbell row with the Stardust animation",
  },
  {
    id: "pulse",
    name: "Pulse",
    blurb: "Black, orange and green tiles with a progress ring and a slim icon bar.",
    modes: ["light", "dark"],
    preview: "Dumbbell swing with the Synthwave animation",
  },
  {
    id: "lab",
    name: "Lab",
    blurb: "A three-column grid with ruled lines and compact numbers.",
    modes: ["light", "dark"],
    preview: "Pull-up with the Blueprint animation",
  },
  {
    id: "olympia",
    name: "Olympia",
    blurb: "Colours follow the session: blue for strength, orange for intervals and green for Zone 2.",
    modes: ["light", "dark"],
    preview: "High knees with the Pictogram animation",
  },
  {
    id: "course",
    name: "Course",
    blurb: "Exercises follow a purple line and open where you tap them.",
    modes: ["light", "dark"],
    preview: "Arm circles with the Doodle animation",
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "A large exercise demonstration on the left, with the workout beside it.",
    modes: ["light", "dark"],
    preview: "Dumbbell overhead press with the Robot animation",
  },
  {
    id: "journal",
    name: "Journal",
    blurb: "Serif headings, paired exercise rows and demonstrations that open on the page.",
    modes: ["light", "dark"],
    preview: "Backward walk with the Paper cutouts animation",
  },
]);

export const DEFAULT_SKIN = "original";
const LS_SKIN = "hp:skin";
const LS_MODE = "hp:theme";

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function currentSkin() {
  return skinById(document.documentElement.dataset.skin);
}

// How Today shows the selected exercise: beside the list, or opened in place.
export function detailMode() {
  return window.matchMedia("(max-width: 1180px)").matches || ["course", "journal"].includes(currentSkin().id) ? "inline" : "side";
}

const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolveScheme() {
  const root = document.documentElement;
  const forced = root.dataset.theme;
  root.dataset.scheme = forced === "light" || forced === "dark" ? forced : darkQuery && darkQuery.matches ? "dark" : "light";
}

if (darkQuery && darkQuery.addEventListener) {
  darkQuery.addEventListener("change", () => {
    resolveScheme();
    window.dispatchEvent(new CustomEvent("hp:look"));
  });
}

// Applies { skin, theme } from profile settings: sets the <html> attributes,
// remembers them for the next page load and tells listeners (the 3D stages).
export function applyLook(settings = {}) {
  const root = document.documentElement;
  const skin = skinById(settings.skin);
  root.dataset.skin = skin.id;
  const mode = skin.modes.length === 1 ? skin.modes[0] : settings.theme;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode;
  else delete root.dataset.theme;
  resolveScheme();
  try {
    localStorage.setItem(LS_SKIN, JSON.stringify(skin.id));
    localStorage.setItem(LS_MODE, JSON.stringify(settings.theme || "system"));
  } catch {}
  window.dispatchEvent(new CustomEvent("hp:look"));
}

// ---------- what a session or a block is, for the themes that colour by kind ----------

const SESSION_KINDS = { mon: "strength", tue: "intervals", wed: "strength", thu: "intervals", fri: "strength", sat: "endurance", sun: "rest" };

export function sessionKind(dayKey) {
  return SESSION_KINDS[dayKey] || "strength";
}

// Order matters: "Dynamic mobility" is a warm-up, "yoga & balance" is balance work.
export function blockKind(block) {
  if (block && typeof block === "object") return block.kind || blockKindFromName(block.name);
  return blockKindFromName(block);
}

// ---------- the theme picker (setup and settings) ----------

export function skinPickerHtml(current) {
  const cur = skinById(current).id;
  return `<div class="skin-grid" role="group" aria-label="Theme">${SKINS.map(
    (s) => `<button type="button" class="skin-card" data-skin="${s.id}" aria-pressed="${s.id === cur}">
      <img class="skin-pv" src="/images/themes/${s.id}.jpg" alt="${esc(t("Today"))}: ${esc(s.preview)}" width="1440" height="1000" loading="lazy">
      <span class="skin-meta"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small></span>
    </button>`
  ).join("")}</div>`;
}
