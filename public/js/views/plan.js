// The plan: training levels and rules, your heart-rate zones, the week by level, how it
// compares with Bryan's targets, what Bryan does now, equipment and sources.

import { DAYS, LEVEL_PLANS, PROGRAM, RULES, SOURCES, SWAPS, TAKEAWAYS, TARGETS, TIMELINE, ZONES } from "../data/program.js";
import { state, updateProfile } from "../store.js";
import { dayMins } from "../plan.js";
import { LEVELS, bpm, hrMax, levelIndex, personalize } from "../personalize.js";
import { esc } from "../util.js";
import { newestFirst, sourceListHtml } from "../components/sources.js";
import { toast } from "../components/ui.js";
import { t } from "../i18n.js";

const ZONE_COLORS = ["#8aa0ba", "#3ee0b0", "#e0b93c", "#f08f47", "#ef6a60"];

export function render(el) {
  const p = state.profile;
  const cur = levelIndex(p);
  const P = (s) => esc(personalize(s, p));
  const totals = LEVELS.map((_, i) => (DAYS.reduce((a, d) => a + dayMins(d, i), 0) / 60).toFixed(1));

  el.innerHTML = `<div class="page plan-page">
    <section class="card hero">
      <span class="eyebrow">${esc(PROGRAM.version)}</span>
      <h1>The plan</h1>
      <p class="focus">${esc(PROGRAM.summary)}</p>
      <p class="muted" style="font-size:0.85rem">This app is unofficial. Bryan Johnson and Blueprint do not endorse it. It provides a training plan, not medical advice.</p>
    </section>

    <div class="section-title"><h2>Training levels</h2><span class="chip accent">${t("Your level: {level}", { level: esc(LEVELS[cur].name) })}</span></div>
    <p class="muted">Choose a level below when you need an easier or harder workout. Past logs keep their original level.</p>
    <div class="plan-levels">${LEVEL_PLANS.map(
      (lp, i) => `<section class="card card-pad plan-level${i === cur ? " current" : ""}" style="display:grid;gap:8px">
        <span class="eyebrow">${esc(LEVELS[i].detail)}</span><h3 class="display" style="font-size:1.5rem">${esc(LEVELS[i].name)}</h3>
        <p><b>${P(lp.effort)}</b></p><ul class="list">${lp.points.map((s) => `<li>${P(s)}</li>`).join("")}</ul>
        <p class="muted" style="font-size:0.88rem">${P(lp.moveUp)}</p>
        <button type="button" class="btn${i === cur ? " primary" : ""}" data-plan-level="${LEVELS[i].id}" aria-pressed="${i === cur}">${i === cur ? t("Your current level") : t("Use {level}", { level: esc(LEVELS[i].name) })}</button></section>`
    ).join("")}</div>
    <section class="card card-pad" style="display:grid;gap:8px"><h3>Rules</h3><ul class="list">${RULES.map((s) => `<li>${P(s)}</li>`).join("")}</ul></section>

    <div class="section-title"><h2>The week</h2></div>
    <div class="table-wrap"><table class="plan-week">
      <colgroup><col class="weekday-col"><col class="session-col">${LEVELS.map(() => '<col class="duration-col">').join("")}</colgroup>
      <thead><tr><th>Day</th><th>Session</th>${LEVELS.map((l, i) => `<th class="num ${i === cur ? "cur" : ""}"><span class="level-full">${esc(l.name)}</span><abbr class="level-short" title="${esc(l.name)}">${["New", "Return.", "Active", "Trained"][i]}</abbr></th>`).join("")}</tr></thead>
      <tbody>${DAYS.map((d) => `<tr><td><b>${esc(d.short)}</b></td><td><a href="#/library">${esc(d.title)}</a></td>${LEVELS.map((_, i) => `<td class="num ${i === cur ? "cur" : ""}">${d.blocks.length ? t("{count} min", { count: dayMins(d, i) }) : t("Rest")}</td>`).join("")}</tr>`).join("")}
      <tr><td colspan="2"><b>Total</b> (without add-ons)</td>${totals.map((total, i) => `<td class="num ${i === cur ? "cur" : ""}"><b>${t("{hours} h", { hours: total })}</b></td>`).join("")}</tr></tbody>
    </table></div>
    <p class="muted">Your workouts include the scheduled cardio. Extra activity is optional. Lower levels build toward Bryan's weekly targets. At Well trained, sessions take about 72 to 93 minutes (8.2 hours a week) with all strength and mobility work, before add-ons or extra recovery breaks. The extra vigorous cardio and Zone 2 time adapt his weekly targets for this home plan.</p>
    <section class="card card-pad" style="display:grid;gap:10px"><h3>How this plan follows Bryan's routine</h3>
      <p class="muted">Well trained meets his full weekly targets. Lower levels build toward them.</p>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${TARGETS.map(([status, text]) => `<li style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start"><span class="status ${status === "ok" ? "ok" : "part"}">${status === "ok" ? t("Met") : t("Partly")}</span><span>${P(text)}</span></li>`).join("")}</ul>
      <details><summary>Home exercise choices</summary><ul class="list">${TAKEAWAYS.slice(1).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></details>
    </section>

    <div class="section-title"><h2>Your heart-rate zones</h2><span class="muted">${t("Max {max} bpm {source}", { max: hrMax(p), source: p && p.hrMax ? t("(measured)") : t("(estimated from your age)") })}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Zone</th><th class="num">% of max</th><th class="num">Your bpm</th><th>How it feels and when to use it</th></tr></thead><tbody>
      ${ZONES.map((z, i) => `<tr><td><span class="zone-sw" style="background:${ZONE_COLORS[i]}"></span><b>${esc(z.zone)}</b></td><td class="num">${t("{low} to {high}%", { low: z.pct[0], high: z.pct[1] })}</td><td class="num">${t("{low} to {high}", { low: bpm(p, z.pct[0]), high: bpm(p, z.pct[1]) })}</td><td>${esc(z.feel)}</td></tr>`).join("")}
      <tr><td><b>4×4 work</b></td><td class="num">85 to 95%</td><td class="num">${t("{low} to {high}", { low: bpm(p, 85), high: bpm(p, 95) })}</td><td>Thursday's hard 4×4 intervals at Well trained. Other levels use a lower target.</td></tr>
    </tbody></table></div>

    <div class="section-title"><h2>Home substitutions</h2><a class="btn sm" href="#/setup/redo/equipment">Set up your equipment</a></div>
    <p class="muted">Add or edit your equipment during setup or in Settings under Your equipment. These home exercises stand in for Bryan's gym exercises.</p>
    <div class="table-wrap"><table><thead><tr><th>Bryan's gym exercise</th><th>Your home exercise</th></tr></thead><tbody>${SWAPS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join("")}</tbody></table></div>

    <div class="section-title"><h2>What Bryan does now</h2></div>
    <section class="card card-pad"><ul class="timeline">${newestFirst(TIMELINE).map((t) => `<li><time class="when" datetime="${esc(t.date)}">${esc(t.d)}</time><div><b>${esc(t.t)}</b><p class="muted">${esc(t.s)}</p><div class="timeline-links">${t.links.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join("")}</div></div></li>`).join("")}</ul></section>

    <div class="section-title"><h2>Sources</h2></div>
    <div class="source-grid">${SOURCES.map((g) => `<section class="card card-pad"><h3>${esc(g.g)}</h3>${sourceListHtml(g.items)}</section>`).join("")}</div>
  </div>`;
  el.querySelectorAll("[data-plan-level]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.planLevel;
      if (id === state.profile.level) return;
      updateProfile((profile) => {
        profile.level = id;
        profile.levelCheck = null;
      });
      render(el);
      el.querySelector(`[data-plan-level="${id}"]`).focus({ preventScroll: true });
      toast(t("Level set to {level}. Past logs keep their original level.", { level: LEVELS.find((level) => level.id === id).name }));
    });
  });
}

