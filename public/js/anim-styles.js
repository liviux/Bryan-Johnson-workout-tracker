import { localized, t } from "./i18n.js";
// Animation styles: other ways to draw the exercise animations, on top of the
// original mannequin. Picked in Settings → Animation style or from the floating style
// bar (components/anim-bar.js). They apply to every exercise (STYLED_EXERCISES).
//
// The choice is profile.settings.animStyle; <html data-anim> carries it for the 3D
// stages, which listen for "hp:anim". The styles themselves are in js/anim/styles/.

import { esc } from "./util.js";

// after: what the style is modelled on, shown on its card. tech: how it's drawn —
// "3d" styles are three.js scenes; the others draw the same moving skeleton without
// three.js: "svg" vector shapes, "canvas" 2D canvas, "text" characters.
// fun: one of the funny ones.
export const ANIM_STYLES = localized([
  { id: "athlete", name: "Athlete", tech: "3d", after: "Semi-realistic, like Mixamo characters", blurb: "A person in a T-shirt, shorts and trainers, lit by soft studio light." },
  { id: "female", name: "Female athlete", tech: "3d", after: "Modern sports cartoons", blurb: "A cartoon athlete with tied-back hair, a turquoise training top and violet leggings. Hands grip equipment and plant on the floor." },
  { id: "mannequin", name: "Mannequin", tech: "3d", after: "the app's original figure", blurb: "A smooth grey figure with lights showing which muscles are working." },
  { id: "anime", name: "Anime", tech: "3d", after: "VRM avatars with MToon shading", blurb: "An anime figure with big eyes and spiky hair. Soft shading and thin outlines define the body." },
  { id: "lowpoly", name: "Low poly", tech: "3d", after: "Quaternius' free game characters", blurb: "Flat colours and angular shapes give the figure a simple game character look." },
  { id: "cartoon", name: "Cartoon", tech: "3d", after: "Classic cel shading with ink outlines", blurb: "A brightly coloured cartoon with thick black outlines. Working muscles have yellow outlines." },
  { id: "voxel", name: "Voxel", tech: "3d", after: "Minecraft-style blocks", blurb: "A block figure with pixel-art clothes and equipment, standing on grass." },
  { id: "robot", name: "Robot", tech: "3d", after: "Friendly service robots", blurb: "A robot with ceramic armour, visible joints and a glowing visor. Amber panels show the working muscles." },
  { id: "glass", name: "Stained glass", tech: "3d", after: "Art Nouveau stained-glass windows", blurb: "Jewel-coloured panes joined by brass seams, with a rose window in the chest and a gilded mask. Working muscles glow amber." },
  { id: "pictogram", name: "Pictogram", tech: "svg", after: "Otl Aicher's 1972 Munich Olympics pictograms", blurb: "A white sports sign figure on a blue tile. Orange bars show which muscles are working." },
  { id: "ink", name: "Ink brush", tech: "canvas", after: "Japanese sumi-e painting", blurb: "A brush-painted figure on rice paper with a circular head and fading ink trails. Red washes show the working muscles." },
  { id: "ascii", name: "ASCII", tech: "text", after: "Old green-screen terminals", blurb: "A figure made from text on a glowing green screen, with a floor grid and amber working muscles." },
  { id: "synthwave", name: "Synthwave", tech: "canvas", after: "1980s retro-futurism", blurb: "Neon limbs move across a scrolling grid beneath a striped sunset. A wet floor reflects the figure; working muscles glow pink." },
  { id: "blueprint", name: "Blueprint", tech: "svg", after: "Engineering drawings", blurb: "A technical drawing with live joint angles, centre lines and hatched working muscles. Labels name the exercise and show equipment dimensions." },
  { id: "stardust", name: "Stardust", tech: "canvas", after: "Long-exposure light painting", blurb: "About 1,800 particles form a body and leave light trails in space. Working muscles turn gold." },
  { id: "doodle", name: "Doodle", tech: "svg", fun: true, after: "Margin doodles in a school notebook", blurb: "A wobbly pen drawing on notebook paper, with sweat drops and comments about the exercise. Highlighter marks the working muscles." },
  { id: "googly", name: "Googly", tech: "canvas", fun: true, after: "Felt puppets", blurb: "A fuzzy monster in oversized trainers. Its googly eyes bounce as it moves." },
  { id: "paper", name: "Paper cutouts", tech: "svg", after: "Folded paper collage", blurb: "A figure cut from folded paper, with soft shadows and coral pieces showing the working muscles." },
  { id: "halftone", name: "Halftone", tech: "canvas", after: "Two-colour printed comics", blurb: "A moving comic figure with newsprint dots and bold ink outlines. Working muscles are vermilion." },
  { id: "linocut", name: "Linocut", tech: "canvas", after: "Hand-carved printmaking", blurb: "A carved ink figure against a vermilion sun, with paper grain, gouged lines and uneven edges. Working muscles use ochre ink." },
  { id: "orrery", name: "Orrery", tech: "canvas", after: "Antique mechanical solar systems", blurb: "A clockwork constellation with planets for joints, orbiting moons and a sun in the chest. Brass rods turn coral where muscles work." },
]);

// The style until you pick one.
export const DEFAULT_ANIM_STYLE = "athlete";
// What the exercises without styles show.
export const BASE_ANIM_STYLE = "mannequin";

// Which exercises take the styles: "all", or a list of exercise ids (data/exercises.js)
// to try them on a few first.
export const STYLED_EXERCISES = "all";

// The exercise the Settings preview shows first.
export const PREVIEW_EXERCISE = "zone2";

export function animStyleById(id) {
  return ANIM_STYLES.find((s) => s.id === id) || ANIM_STYLES.find((s) => s.id === DEFAULT_ANIM_STYLE);
}

export function currentAnimStyle() {
  return animStyleById(document.documentElement.dataset.anim).id;
}

export function hasAnimStyles(exId) {
  return STYLED_EXERCISES === "all" || STYLED_EXERCISES.includes(exId);
}

// The style an exercise is drawn in: the chosen one if the exercise takes styles.
export function animStyleFor(exId, styleId = currentAnimStyle()) {
  return hasAnimStyles(exId) ? animStyleById(styleId).id : BASE_ANIM_STYLE;
}

// Applies settings.animStyle and tells the 3D stages.
export function applyAnimStyle(settings = {}) {
  const id = animStyleById(settings.animStyle).id;
  if (document.documentElement.dataset.anim === id) return;
  document.documentElement.dataset.anim = id;
  window.dispatchEvent(new CustomEvent("hp:anim"));
}

// How each kind of style is drawn, for the badges on the cards.
export const TECH_NAMES = { "3d": "3D", svg: "Illustration", canvas: "Illustration", text: "Text" };

// The picker in Settings: one card per style, with a still of the styled exercise
// filled in by the settings view; the three.js styles first, then the others.
export function animStylePickerHtml(current) {
  const cur = animStyleById(current).id;
  const card = (s) => `<button type="button" class="skin-card anim-card" data-anim-style="${s.id}" aria-pressed="${s.id === cur}">
      <span class="anim-thumb"><span class="anim-num mono">${ANIM_STYLES.indexOf(s) + 1}</span><img alt="" data-anim-thumb="${s.id}" hidden></span>
      <span class="anim-badges"><span class="anim-badge">${TECH_NAMES[s.tech]}</span>${s.fun ? '<span class="anim-badge fun">Funny</span>' : ""}</span>
      <span class="skin-meta"><b>${esc(s.name)}</b><small>${esc(s.blurb)}</small><small class="skin-src">${t("Inspired by {source}", { source: esc(s.after) })}</small></span>
    </button>`;
  const group = (title, note, list) => `<div class="anim-group"><h4>${esc(title)} <small class="muted">${esc(note)}</small></h4>
    <div class="skin-grid anim-grid">${list.map(card).join("")}</div></div>`;
  const three = ANIM_STYLES.filter((s) => s.tech === "3d"), flat = ANIM_STYLES.filter((s) => s.tech !== "3d");
  return `<div class="anim-groups" role="group" aria-label="Animation style">
    ${group("3D figures", `${three.length} styles`, three)}
    ${group("Illustrations and text", `${flat.length} styles`, flat)}
  </div>`;
}
