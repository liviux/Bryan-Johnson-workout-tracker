// Progress: weekly sessions, Zone 2 and hard-cardio minutes against Bryan's
// targets, strength progression per exercise, posture stiffness and body weight.

import { EXERCISES } from "../data/exercises.js";
import { state } from "../store.js";
import { countsAsSession, liftHistory, logLevel, weekStats } from "../plan.js";
import { LEVELS, kgUnit, levelIndex } from "../personalize.js";
import { addDays, esc, fmtDate, fmtShort, parseIso, weekStart } from "../util.js";
import { PROGRESS_RANGES, inProgressRange, progressBeginning, progressRange } from "../progress-ranges.js";
import { icon } from "../components/icons.js";
import { mountChart, tableHtml } from "../components/charts.js";
import { t } from "../i18n.js";

export function render(el) {
  let range = "12w";
  let lift = null;
  const charts = [];
  const tables = new Set();

  const u = () => kgUnit(state.profile);
  const dated = (date) => fmtDate(date, { day: "numeric", month: "short", year: "numeric" });
  const toUnit = (kg) => (u() === "lb" ? Math.round(kg * 2.20462) : kg);

  function weeks(selected) {
    const out = [];
    for (let start = weekStart(selected.start); start <= selected.end; start = addDays(start, 7)) {
      out.push({ start, s: weekStats(start, { from: selected.start, to: selected.end }) });
    }
    return out;
  }

  function lifts(selected) {
    return Object.entries(EXERCISES)
      .filter(([, e]) => !e.hidden && (e.log === "load" || e.log === "reps"))
      .map(([id, e]) => ({ id, name: e.name, hist: liftHistory(id).filter((h) => inProgressRange(h.date, selected)) }))
      .filter((x) => x.hist.length);
  }

  function addonSeries(addonId, metricId, selected) {
    return Object.keys(state.days)
      .filter((d) => inProgressRange(d, selected))
      .sort()
      .map((d) => {
        const a = state.days[d].addons && state.days[d].addons[addonId];
        const v = a && a.metrics ? a.metrics[metricId] : null;
        return v == null ? null : { x: parseIso(d), value: v, label: dated(d), short: fmtShort(d) };
      })
      .filter(Boolean);
  }

  function card(id, title, sub, spec, headers) {
    const showTable = tables.has(id);
    return `<section class="card chart-card" data-chart="${id}">
      <div class="section-title"><div><h3>${esc(title)}</h3><p class="sub">${esc(sub)}</p></div><button type="button" class="btn sm ghost" data-table="${id}">${icon(showTable ? "progress" : "list", "sm")} ${showTable ? "Chart" : "Table"}</button></div>
      ${showTable ? tableHtml(spec, headers) : `<div class="chart" data-host="${id}"></div>`}
    </section>`;
  }

  function draw() {
    charts.splice(0).forEach((c) => c.destroy());
    const selected = progressRange(range, state.profile, state.days);
    const W = weeks(selected);
    const sessions = { type: "columns", integer: true, title: t("Sessions per week"), target: 6, targetLabel: t("6 a week"), fmt: (v) => t("{count} sessions", { count: v }), data: W.map((w) => ({ label: t("Week of {date}", { date: dated(w.start) }), short: fmtShort(w.start), value: w.s.sessions, sub: w.s.skipped ? t("{count} skipped", { count: w.s.skipped }) : "" })) };
    const zone2 = { type: "columns", title: t("Zone 2 minutes per week"), target: 150, targetLabel: t("Bryan: 150"), fmt: (v) => t("{count} min", { count: v }), data: W.map((w) => ({ label: t("Week of {date}", { date: dated(w.start) }), short: fmtShort(w.start), value: w.s.zone2 })) };
    const hard = { type: "columns", title: t("Hard-cardio minutes per week"), target: 75, targetLabel: t("Bryan: 75"), fmt: (v) => t("{count} min", { count: v }), data: W.map((w) => ({ label: t("Week of {date}", { date: dated(w.start) }), short: fmtShort(w.start), value: w.s.hard })) };

    const L = lifts(selected);
    if (!lift || !L.find((x) => x.id === lift)) lift = L.length ? L.sort((a, b) => b.hist.length - a.hist.length)[0].id : null;
    const cur = L.find((x) => x.id === lift);
    const useKg = cur && cur.hist.some((h) => h.kg > 0);
    const liftSpec = cur
      ? {
          type: "line",
          title: cur.name,
          fmt: (v) => (useKg ? `${v} ${u()}` : t("{count} reps", { count: v })),
          data: cur.hist.map((h) => ({ x: parseIso(h.date), value: useKg ? toUnit(h.kg) : h.reps, label: dated(h.date), short: fmtShort(h.date), sub: useKg ? t("{count} reps", { count: h.reps }) : "" })),
        }
      : null;
    const stiffness = state.profile && state.profile.addons && state.profile.addons.posture ? addonSeries("posture", "stiffness", selected) : [];
    const stiffSpec = { type: "line", title: t("Neck & upper-back stiffness"), yMin: 0, fmt: (v) => `${v} / 10`, data: stiffness };
    const bw = Object.keys(state.days)
      .sort()
      .filter((d) => inProgressRange(d, selected) && state.days[d].bodyWeightKg != null)
      .map((d) => ({ x: parseIso(d), value: toUnit(state.days[d].bodyWeightKg), label: dated(d), short: fmtShort(d) }));
    const bwSpec = { type: "line", title: t("Body weight"), fmt: (v) => `${v} ${u()}`, data: bw };

    const logged = Object.entries(state.days).filter(([date, d]) => inProgressRange(date, selected) && countsAsSession(d)).map(([, d]) => d);
    const total = logged.length;
    const beginning = progressBeginning(state.profile, state.days);
    const full = W.filter((w) => w.start >= selected.start && w.start >= beginning && addDays(w.start, 6) <= selected.end);
    const basis = full.length ? full : W;
    const avg = (k) => basis.reduce((a, w) => a + w.s[k], 0) / basis.length;
    const avgSess = avg("sessions").toFixed(1);
    const avgZ2 = Math.round(avg("zone2"));
    const avgNote = full.length ? (full.length === 1 ? t("1 full week in range") : t("{count} full weeks in range", { count: full.length })) : t("selected period");
    const lvl = levelIndex(state.profile);

    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>Progress</h2></div>
      <section class="card card-pad progress-range" aria-label="Progress time interval">
        <div class="section-title"><h3>Time interval</h3><span class="range-dates" data-range-dates>${esc(dated(selected.start))} – ${esc(dated(selected.end))}</span></div>
        <div class="range-groups">${[["Recent", "this-week"], ["Longer", "8w"]].map(([group, first]) => `<div class="range-group"><span class="label">${t(group)}</span><div class="range-options${group === "Longer" ? " longer" : ""}" role="group" aria-label="${t("{group} intervals", { group: t(group) })}">${PROGRESS_RANGES.filter((r) => r.group === group || (group === "Recent" ? ["this-week", "last-week", "this-month", "last-month"].includes(r.id) : ["8w", "12w", "6m", "1y", "all"].includes(r.id))).map((r) => `<button type="button" data-range="${r.id}" aria-pressed="${range === r.id}">${r.name}</button>`).join("")}</div></div>`).join("")}</div>
        <p class="muted range-note">Last week runs from Monday to Sunday. Last month covers the previous calendar month. Charts and totals use the dates above, so the first and last weeks may be incomplete.</p>
      </section>
      <div class="kpis">
        <div class="card kpi"><span>Current level</span><b>${esc(LEVELS[lvl].name)}</b><span>${t("{count} sessions at this level in range", { count: logged.filter((d) => logLevel(d) === lvl).length })}</span></div>
        <div class="card kpi"><span>Sessions done</span><b>${total}</b><span>${t("in selected interval")}</span></div>
        <div class="card kpi"><span>Sessions a week</span><b>${avgSess}</b><span>${t("{note} · plan: 6", { note: avgNote })}</span></div>
        <div class="card kpi"><span>Zone 2 a week</span><b>${avgZ2} min</b><span>${t("{note} · Bryan: 150", { note: avgNote })}</span></div>
      </div>
      <div class="charts">
        ${card("sessions", "Sessions per week", "Sessions count once at least half the exercises are done. The target is 6 a week.", sessions, ["Week", "Sessions"])}
        ${card("zone2", "Zone 2 minutes per week", "Includes Zone 2 blocks, easy recovery between 4×4 intervals and extra activity logged as Easy / Zone 2.", zone2, ["Week", "Minutes"])}
        ${card("hard", "Hard-cardio minutes per week", "Includes controlled vigorous cardio, hard intervals and extra activity logged as Hard. Brisk beginner intervals don't count.", hard, ["Week", "Minutes"])}
      </div>
      <div class="section-title"><h2 style="font-size:1.25rem">Strength</h2>
        ${L.length ? `<select class="input" data-lift style="max-width:320px" aria-label="Exercise">${L.map((x) => `<option value="${x.id}" ${x.id === lift ? "selected" : ""}>${esc(x.name)} (${x.hist.length})</option>`).join("")}</select>` : ""}
      </div>
      ${liftSpec ? `<div class="charts">${card("lift", liftSpec.title, useKg ? t("Heaviest set per session ({unit}). Point details include the reps.", { unit: u() }) : t("Most reps in one set per session."), liftSpec, [t("Date"), useKg ? u() : t("Reps")])}</div>` : `<div class="card empty">${t("No strength sets logged in these dates. Choose a longer interval or record a set during your workout.")}</div>`}
      ${stiffness.length || bw.length ? `<div class="charts">${stiffness.length ? card("stiff", t("Neck & upper-back stiffness"), t("Your posture add-on ratings: 0 means no stiffness, 10 means very stiff. Lower scores mean less stiffness."), stiffSpec, [t("Date"), t("Stiffness")]) : ""}${bw.length ? card("bw", t("Body weight"), t("Weights recorded in each day's notes section."), bwSpec, [t("Date"), u()]) : ""}</div>` : ""}
    </div>`;

    const specs = { sessions, zone2, hard, lift: liftSpec, stiff: stiffSpec, bw: bwSpec };
    el.querySelectorAll("[data-host]").forEach((host) => {
      const spec = specs[host.dataset.host];
      if (spec && spec.data.length) charts.push(mountChart(host, spec));
      else host.innerHTML = `<p class="empty">${t("No data yet.")}</p>`;
    });
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.range) {
      range = b.dataset.range;
      draw();
      el.querySelector(`[data-range="${range}"]`).focus({ preventScroll: true });
    } else if (b.dataset.table) {
      tables.has(b.dataset.table) ? tables.delete(b.dataset.table) : tables.add(b.dataset.table);
      draw();
    }
  });
  el.addEventListener("change", (e) => {
    if (e.target.matches("[data-lift]")) {
      lift = e.target.value;
      draw();
    }
  });
  draw();
  return { destroy: () => charts.forEach((c) => c.destroy()) };
}
