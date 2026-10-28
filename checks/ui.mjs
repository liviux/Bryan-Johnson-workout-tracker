// Run with node checks/ui.mjs; no browser or personal files are used.
import assert from "node:assert/strict";
import { ANIM_STYLES } from "../public/js/anim-styles.js";
import { Stage } from "../public/js/anim/stage.js";
import { createFigure } from "../public/js/anim/styles/robot.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { joints } from "../public/js/anim/poses.js";
import { filterExercises } from "../public/js/components/exercise-filters.js";
import { newestFirst, sourceDate, sourceListHtml } from "../public/js/components/sources.js";
import { EXERCISES } from "../public/js/data/exercises.js";
import { TIMELINE } from "../public/js/data/program.js";
import { defaultProfile } from "../public/js/personalize.js";
import { EXTRA_TYPES } from "../public/js/plan.js";
import { state } from "../public/js/store.js";
import { render } from "../public/js/views/plan.js";

state.profile = defaultProfile();
const host = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };
render(host);
assert(!host.innerHTML.includes("=&gt;") && !host.innerHTML.includes("=>"), "The week must contain totals, never function source");
assert.equal((host.innerHTML.match(/<b>\d+\.\d h<\/b>/g) || []).length, 4);
assert(TIMELINE.every((item) => item.date && item.links?.length && item.links.every((link) => link.u.startsWith("https://"))));
assert.equal(newestFirst(TIMELINE)[0].date, "2026-10-14");

assert.equal(filterExercises().length, Object.values(EXERCISES).filter((ex) => !ex.hidden).length);
assert(filterExercises({ equipment: "none" }).every(([, ex]) => !ex.equipment?.length));
assert(filterExercises({ equipment: "band", muscle: "shoulders" }).every(([, ex]) => ex.equipment.includes("band") && ex.muscles.includes("shoulders")));
assert(filterExercises({ origin: "classic" }).every(([, ex]) => ex.classic));
assert(filterExercises({ origin: "video" }).every(([, ex]) => ex.bryanVideos.some((v) => typeof v.s === "number")));
assert(filterExercises({ query: "rotator cuff" }).length > 0);
assert.equal(filterExercises({ query: "not-an-exercise-xyz" }).length, 0);
const names = filterExercises({ sort: "name" }).map(([, ex]) => ex.name);
assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
assert.deepEqual(filterExercises({ sort: "reverse" }).map(([, ex]) => ex.name), [...names].reverse());
const sources = [{ t: "Old", date: "2023" }, { t: "Unknown" }, { t: "Newest", date: "2026-05-26" }, { t: "Month", date: "2026-04" }];
assert.deepEqual(newestFirst(sources).map((s) => s.t), ["Newest", "Month", "Old", "Unknown"]);
assert.equal(sources[0].t, "Old");
assert.equal(sourceDate("2026-05-26"), "May 26, 2026");
assert.equal(sourceDate("2023-07"), "Jul 2023");
assert.equal(sourceDate("2023"), "2023");
assert.equal(sourceDate(), "Undated");
assert(sourceListHtml([{ t: "Safe <title>", u: "https://example.com", date: "2023" }]).includes("Safe &lt;title&gt;"));
assert.equal(ANIM_STYLES.length, 21);
assert.equal(ANIM_STYLES.filter((s) => s.tech === "3d").length, 9);
assert.equal(new Set(EXTRA_TYPES.map((t) => t.id)).size, EXTRA_TYPES.length);
assert(EXTRA_TYPES.length >= 30);
for (const id of ["desk", "walk", "hike", "bike", "run", "swim", "sport", "other"]) assert(EXTRA_TYPES.some((t) => t.id === id));

let resolveStyle, loaded = false, rendered = false;
const ready = new Promise((resolve) => { resolveStyle = resolve; });
const stage = {
  id: "test", clipIndex: 0, clip: null,
  syncStyle: () => ready,
  render() { assert(loaded, "Snapshot must wait for the figure"); rendered = true; },
  figure: { snapshot: () => "data:image/png,test" },
};
const pending = Stage.prototype.snapshot.call(stage, "test");
assert.equal(rendered, false);
loaded = true; resolveStyle();
assert.equal(await pending, "data:image/png,test");
assert.equal(rendered, true);
const robot = createFigure();
for (const id of animationIds()) {
  for (const clip of getAnimation(id).clips) {
    robot.setHighlight(clip.highlight);
    for (const key of clip.keys) {
      robot.update(joints(key.p));
      robot.group.updateMatrixWorld(true);
      robot.group.traverse((part) => assert(part.matrixWorld.elements.every(Number.isFinite), `Robot must have a finite pose: ${id}`));
    }
  }
}
robot.dispose();
let narrow = false;
globalThis.window = { matchMedia: (query) => ({ matches: query === "(max-width: 1180px)" && narrow, addEventListener() {} }) };
globalThis.document = { documentElement: { dataset: {} } };
const { SKINS, detailMode } = await import("../public/js/themes.js");
for (const skin of SKINS) {
  document.documentElement.dataset.skin = skin.id;
  narrow = true;
  assert.equal(detailMode(), "inline", `${skin.name} must show animations inline on phones and tablets`);
  narrow = false;
  assert.equal(detailMode(), ["course", "journal"].includes(skin.id) ? "inline" : "side");
}
delete globalThis.window;
delete globalThis.document;
console.log("Weekly totals, source dates and links, exercise filters, new choices and asynchronous snapshots passed.");
