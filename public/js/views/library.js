// Exercise library: every exercise with a 3D preview, search and categories,
// Bryan's own videos, and a detail page showing where it sits in your plan.

import { CATEGORIES, EXERCISES } from "../data/exercises.js";
import { DAYS } from "../data/program.js";
import { ADDONS } from "../data/addons/index.js";
import { BRYAN_VIDEOS, WATCH } from "../data/videos.js";
import { state } from "../store.js";
import { INTERVAL_MOVES, intervalPhases } from "../data/routines.js";
import { rxFor, timerPresets } from "../plan.js";
import { LEVELS, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { EQUIPMENT_NAMES, icon } from "../components/icons.js";
import { filterExercises } from "../components/exercise-filters.js";
import { sourceListHtml } from "../components/sources.js";
import { createExercisePanel } from "../components/exercise-panel.js";
import { renderVideos, youtubeId } from "../components/video.js";
import { thumbnail } from "../components/thumbs.js";
import { t } from "../i18n.js";

function usages(exId) {
  const out = [];
  for (const d of DAYS) for (const b of d.blocks) for (const it of b.items) if (it.ex === exId) out.push({ where: `${d.name} · ${b.name}`, item: it });
  for (const d of DAYS) for (const b of d.blocks) for (const it of b.items) if (it.alternative?.ex === exId) out.push({ where: `${d.name} · ${b.name} ${t("(optional replacement)")}`, item: it.alternative });
  for (const d of DAYS) for (const b of d.blocks) for (const it of b.items) if (it.timer) {
    const rx = LEVELS.map((_, level) => timerPresets(it, level).map((preset) => {
      const phases = intervalPhases(it.ex, preset, it.ex === "shortint" && INTERVAL_MOVES.includes(exId) ? [exId] : undefined).filter((phase) => phase.ex === exId);
      if (!phases.length) return "—";
      return [...new Set(phases.map((phase) => phase.sec))].map((sec) => `${phases.filter((phase) => phase.sec === sec).length} × ${sec} s`).join(" + ");
    }).filter((dose) => dose !== "—").join(" or ") || "—");
    if (rx.some((dose) => dose !== "—")) out.push({ where: `${d.name} · ${EXERCISES[it.ex].name}${it.ex === "shortint" && exId !== "marching" ? ` ${t("(work option)")}` : ""}`, item: { rx } });
  }
  for (const a of ADDONS) for (const v of Object.values(a.variants)) for (const it of v.items) if (it.ex === exId) out.push({ where: `${a.name} · ${v.name}`, item: it });
  return out;
}

export function render(el, params) {
  if (params[0] && EXERCISES[params[0]]) return detail(el, params[0]);
  const total = Object.values(EXERCISES).filter((ex) => !ex.hidden).length;
  const filters = { query: "", category: "all", equipment: "all", muscle: "all", origin: "all", sort: "original" };
  let io = null;
  const equipment = [...new Set(Object.values(EXERCISES).flatMap((ex) => ex.equipment || []))].sort((a, b) => (EQUIPMENT_NAMES[a] || a).localeCompare(EQUIPMENT_NAMES[b] || b));
  const muscles = [...new Set(Object.values(EXERCISES).flatMap((ex) => ex.muscles || []))].sort();
  const muscleName = (name) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()).replace(/ Back$/, " back").replace(/^Rotator Cuff$/, "Rotator cuff").replace(/^Heart$/, "Heart & lungs");

  function cards() {
    const list = filterExercises(filters);
    if (!list.length) return `<div class="card empty">${t("No exercises match. Clear a filter or try a shorter search.")}</div>`;
    return `<div class="lib-grid">${list
      .map(
        ([id, e]) => `<a class="card ex-card" href="#/library/${id}">
          <div class="thumb" data-thumb="${id}"><span class="muted">${icon("rotate")}</span></div>
          <div class="meta"><span class="eyebrow">${esc(e.cat)}</span><b>${esc(e.name)}</b>${e.group ? `<small class="muted">${esc(e.group)}</small>` : ""}
          <small class="muted">${esc((e.equipment || []).map((g) => EQUIPMENT_NAMES[g] || g).join(" · ") || t("No equipment"))}</small>
          <span class="chips">${e.classic ? `<span class="badge-classic">${t("classic")}</span>` : ""}${(e.bryanVideos || []).some((b) => typeof b.s === "number") ? `<span class="chip bryan">${icon("video", "sm")} ${t("Bryan")}</span>` : ""}</span></div>
        </a>`
      )
      .join("")}</div>`;
  }

  function draw() {
    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>Exercises</h2><span class="muted">${t("{count} exercises with animations, instructions and videos", { count: total })}</span></div>
      <details class="card card-pad">
        <summary style="cursor:pointer;font-weight:650;display:flex;gap:8px;align-items:center">${icon("video")} Bryan's workout videos</summary>
        <div style="display:grid;gap:12px;margin-top:12px">
          ${sourceListHtml(WATCH.map(([k, note]) => ({ ...BRYAN_VIDEOS[k], t: BRYAN_VIDEOS[k].t.replace(/^Bryan( on X)?: /, ""), note })))}
          <div data-watch></div>
        </div>
      </details>
      <div class="card card-pad"><h3>${t("Workout sequences")}</h3><p class="muted">${t("Open a group to see its individual movements and their order.")}</p><div class="btn-row">${["dynamic", "shortint", "norwegian", "indoorhiit"].map((id) => `<a class="btn sm" href="#/library/${id}">${esc(EXERCISES[id].name)}</a>`).join("")}</div></div>
      <div class="lib-tools">
        <input class="input" type="search" data-filter="query" placeholder="${esc(t("Search names, equipment or muscles…"))}" aria-label="${esc(t("Search exercises"))}">
        <button type="button" class="btn ghost sm" data-clear-filters>${t("Clear filters")}</button>
      </div>
      <div class="lib-filters">${[
        ["category", t("Category"), [["all", t("All categories")], ...CATEGORIES.map((c) => [c, c])]],
        ["equipment", t("Equipment"), [["all", t("All equipment")], ["none", t("No equipment")], ...equipment.map((g) => [g, EQUIPMENT_NAMES[g] || g])]],
        ["muscle", t("Muscle"), [["all", t("All muscles")], ...muscles.map((m) => [m, t(muscleName(m))])]],
        ["origin", t("Source"), [["all", t("All sources")], ["bryan", t("Bryan's protocol and home alternatives")], ["classic", t("Classic additions")], ["video", t("Bryan demo with timestamp")]]],
        ["sort", t("Sort"), [["original", t("Original order")], ["name", t("Name: A to Z")], ["reverse", t("Name: Z to A")], ["category", t("Category, then name")]]],
      ].map(([key, title, options]) => `<label class="field"><span>${esc(title)}</span><select class="input" data-filter="${key}">${options.map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join("")}</select></label>`).join("")}</div>
      <p class="muted library-count" data-library-count role="status">${t("{shown} of {total} exercises", { shown: filterExercises(filters).length, total })}</p>
      <div data-cards>${cards()}</div>
    </div>`;
    const vids = WATCH.map(([k]) => ({ kind: "bryan", title: BRYAN_VIDEOS[k].t.replace(/^Bryan( on X)?: /, ""), url: BRYAN_VIDEOS[k].u, id: youtubeId(BRYAN_VIDEOS[k].u), start: null })).filter((v) => v.id);
    renderVideos(el.querySelector("[data-watch]"), vids);
    observeThumbs();
  }

  function observeThumbs() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        const id = en.target.dataset.thumb;
        thumbnail(id)
          .then((url) => {
            if (url) en.target.innerHTML = `<img alt="" src="${url}">`;
          })
          .catch(() => {});
      }
    }, { rootMargin: "200px" });
    el.querySelectorAll("[data-thumb]").forEach((t) => io.observe(t));
  }

  function refresh() {
    el.querySelector("[data-cards]").innerHTML = cards();
    el.querySelector("[data-library-count]").textContent = t("{shown} of {total} exercises", { shown: filterExercises(filters).length, total });
    observeThumbs();
  }
  el.addEventListener("input", (e) => {
    if (e.target.dataset.filter !== "query") return;
    filters.query = e.target.value;
    refresh();
  });
  el.addEventListener("change", (e) => {
    if (!e.target.dataset.filter) return;
    filters[e.target.dataset.filter] = e.target.value;
    refresh();
  });
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-clear-filters]")) {
      Object.assign(filters, { query: "", category: "all", equipment: "all", muscle: "all", origin: "all", sort: "original" });
      el.querySelectorAll("[data-filter]").forEach((input) => { input.value = filters[input.dataset.filter]; });
      refresh();
      el.querySelector('[data-filter="query"]').focus();
    }
  });
  draw();
  return { destroy: () => io && io.disconnect() };
}

function detail(el, id) {
  const ex = EXERCISES[id];
  const p = state.profile;
  const cur = levelIndex(p);
  const uses = usages(id);
  el.innerHTML = `<div class="page">
    <div class="btn-row"><a class="btn sm" href="#/library">${icon("chevronL", "sm")} All exercises</a></div>
    <div class="day-layout">
      <div style="display:grid;gap:16px;min-width:0">
        <div data-panel></div>
      </div>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="card card-pad" style="display:grid;gap:10px">
          <h3>In your plan</h3>
          ${
            uses.length
              ? `<div class="table-wrap"><table><thead><tr><th>Where</th>${LEVELS.map((l, i) => `<th class="${i === cur ? "cur" : ""}">${esc(l.name)}</th>`).join("")}</tr></thead><tbody>${uses
                  .map((u) => `<tr><td>${esc(u.where)}</td>${LEVELS.map((_, i) => `<td class="${i === cur ? "cur" : ""}">${esc(personalize(rxFor(u.item, i), { ...p, level: LEVELS[i].id }))}</td>`).join("")}</tr>`)
                  .join("")}</tbody></table></div>`
              : `<p class="muted">${ex.routine ? "Open an individual movement below for its doses in your plan." : "Not scheduled in the current plan."}</p>`
          }
        </section>
      </div>
    </div>
  </div>`;
  const panel = createExercisePanel(el.querySelector("[data-panel]"), { mode: "library" });
  panel.show({ exId: id, item: ex.routine ? uses[0]?.item || { ex: id } : undefined, level: cur });
  return { destroy: () => panel.dispose() };
}
