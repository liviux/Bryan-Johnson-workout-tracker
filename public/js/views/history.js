// History: month calendar, streaks and adherence, why days were skipped, and a
// list of every logged day with its notes.

import { state } from "../store.js";
import { SKIP_REASONS, countsAsSession, dayDef, isRestKey, sessionKeyFor, streak } from "../plan.js";
import { addDays, esc, fmtDate, iso, parseIso, todayIso, weekdayKey } from "../util.js";
import { icon } from "../components/icons.js";
import { locale, t } from "../i18n.js";

const STATUS = { done: "Done", partial: "Partly done", skipped: "Skipped" };

export function render(el, params) {
  const today = todayIso();
  let month = params[0] && /^\d{4}-\d{2}$/.test(params[0]) ? params[0] : today.slice(0, 7);
  let filter = "all";
  let limit = 30;

  function stats() {
    let train = 0;
    let done = 0;
    let skipped = 0;
    for (let i = 1; i <= 28; i++) {
      const d = addDays(today, -i);
      if (state.profile && d < state.profile.startDate) break;
      if (isRestKey(weekdayKey(d))) continue;
      train += 1;
      const log = state.days[d];
      if (countsAsSession(log)) done += 1;
      if (log && log.skip) skipped += 1;
    }
    const total = Object.values(state.days).filter(countsAsSession).length;
    let best = 0;
    let run = 0;
    const dates = Object.keys(state.days).sort();
    if (dates.length) {
      for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
        if (isRestKey(sessionKeyFor(d))) continue;
        if (countsAsSession(state.days[d])) best = Math.max(best, ++run);
        else if (d !== today) run = 0;
      }
    }
    return { train, done, skipped, total, best, adherence: train ? Math.round((done / train) * 100) : null };
  }

  function calendar() {
    const first = parseIso(month + "-01");
    const startPad = (first.getDay() + 6) % 7;
    const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [];
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) cells.push(`<span class="dow">${d}</span>`);
    for (let i = 0; i < startPad; i++) cells.push('<span class="pad"></span>');
    for (let n = 1; n <= daysIn; n++) {
      const date = iso(new Date(first.getFullYear(), first.getMonth(), n));
      const log = state.days[date];
      const rest = isRestKey(sessionKeyFor(date));
      const cls = [log && log.status ? log.status : rest ? "rest" : "", date === today ? "today" : "", date > today ? "future" : ""].join(" ");
      const addon = log && Object.values(log.addons || {}).some((a) => a && a.items && Object.values(a.items).some((x) => x.done));
      const title = [fmtDate(date), log && log.status ? STATUS[log.status] : "", log && log.skip ? `(${(SKIP_REASONS.find((r) => r.id === log.skip.reason) || {}).name || ""})` : ""].filter(Boolean).join(" · ");
      cells.push(`<a class="${cls}" href="#/day/${date}" title="${esc(title)}">${n}${addon ? '<i class="mk"></i>' : ""}</a>`);
    }
    return cells.join("");
  }

  function reasons() {
    const counts = {};
    for (const log of Object.values(state.days)) if (log.skip) counts[log.skip.reason] = (counts[log.skip.reason] || 0) + 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return `<p class="muted">No skipped days yet.</p>`;
    return SKIP_REASONS.filter((r) => counts[r.id])
      .sort((a, b) => counts[b.id] - counts[a.id])
      .map(
        (r) => `<div style="display:grid;grid-template-columns:150px 1fr 32px;gap:10px;align-items:center;font-size:0.88rem">
          <span style="display:flex;gap:8px;align-items:center">${icon(r.icon, "sm")} ${esc(r.name)}</span>
          <span style="height:10px;border-radius:5px;background:var(--surface-3);overflow:hidden"><i style="display:block;height:100%;width:${(counts[r.id] / total) * 100}%;background:var(--skip);border-radius:5px"></i></span>
          <span class="mono muted" style="text-align:right">${counts[r.id]}</span>
        </div>`
      )
      .join("");
  }

  function entries() {
    let list = Object.values(state.days)
      .filter((l) => l.status || l.skip || l.notes || (l.extras && l.extras.length) || Object.keys(l.addons || {}).length)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (filter === "done") list = list.filter((l) => l.status === "done" || l.status === "partial");
    if (filter === "skipped") list = list.filter((l) => l.skip);
    if (filter === "notes") list = list.filter((l) => l.notes || l.skip?.note);
    if (!list.length) return `<div class="card empty">No logged days match this filter. Completed exercises, notes and activities appear here as you record them.</div>`;
    return (
      list
        .slice(0, limit)
        .map((l) => {
          const def = dayDef(l.session || weekdayKey(l.date));
          const skip = l.skip ? SKIP_REASONS.find((r) => r.id === l.skip.reason) : null;
          return `<a class="card log-entry" href="#/day/${l.date}">
            <div class="top"><b>${esc(fmtDate(l.date))}</b><span class="chips">${l.status ? `<span class="chip ${l.status === "skipped" ? "skip" : "accent"}">${esc(STATUS[l.status])}</span>` : ""}${l.rpe ? `<span class="chip mono">RPE ${l.rpe}</span>` : ""}</span></div>
            <span class="muted">${esc(def && def.blocks.length ? def.title : "Rest day")}</span>
            ${skip ? `<span class="chip skip" style="justify-self:start">${icon(skip.icon, "sm")} ${esc(skip.name)}${l.skip.note ? `: ${esc(l.skip.note)}` : ""}</span>` : ""}
            ${l.notes ? `<p class="note">${esc(l.notes)}</p>` : ""}
          </a>`;
        })
        .join("") + (list.length > limit ? `<button type="button" class="btn" data-more>Show more</button>` : "")
    );
  }

  function draw() {
    const s = stats();
    const [y, m] = month.split("-").map(Number);
    const prev = iso(new Date(y, m - 2, 1)).slice(0, 7);
    const next = iso(new Date(y, m, 1)).slice(0, 7);
    const title = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" });
    el.innerHTML = `<div class="page">
      <div class="section-title"><h2>History</h2></div>
      <div class="kpis">
        <div class="card kpi">${icon("flame")}<b>${streak(today)}</b><span>day streak (rest days don't break it)</span></div>
        <div class="card kpi">${icon("check")}<b>${s.adherence == null ? "–" : s.adherence + "%"}</b><span>of training days done, last 4 weeks</span></div>
        <div class="card kpi">${icon("history")}<b>${s.total}</b><span>${t("sessions in total · best streak {best}", { best: s.best })}</span></div>
        <div class="card kpi">${icon("skip")}<b>${s.skipped}</b><span>days skipped, last 4 weeks</span></div>
      </div>
      <div class="two-col">
        <section class="card card-pad" style="display:grid;gap:12px">
          <div class="section-title"><h2 style="font-size:1.25rem">${esc(title)}</h2>
            <div class="btn-row"><button type="button" class="btn sm icon-only" data-month="${prev}" aria-label="Previous month">${icon("chevronL")}</button><button type="button" class="btn sm icon-only" data-month="${next}" aria-label="Next month">${icon("chevronR")}</button></div></div>
          <div class="cal">${calendar()}</div>
          <div class="legend"><span><i class="status-dot done"></i>Done</span><span><i class="status-dot partial"></i>Partly</span><span><i class="status-dot skipped"></i>Skipped</span><span><i class="status-dot addon"></i>Add-on done</span></div>
        </section>
        <section class="card card-pad" style="display:grid;gap:12px;align-content:start">
          <h3>Why days were skipped</h3>
          ${reasons()}
        </section>
      </div>
      <div class="section-title"><h2 style="font-size:1.25rem">Logged days</h2>
        <div class="seg" role="group" aria-label="Filter">${[["all", "All"], ["done", "Trained"], ["skipped", "Skipped"], ["notes", "With notes"]].map(([id, n]) => `<button type="button" data-filter="${id}" aria-pressed="${filter === id}">${n}</button>`).join("")}</div>
      </div>
      <div class="log-list">${entries()}</div>
    </div>`;
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.month) {
      month = b.dataset.month;
      draw();
    } else if (b.dataset.filter) {
      filter = b.dataset.filter;
      limit = 30;
      draw();
    } else if (b.hasAttribute("data-more")) {
      limit += 30;
      draw();
    }
  });
  draw();
}
