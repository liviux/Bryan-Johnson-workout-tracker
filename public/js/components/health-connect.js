// Read-only Health Connect comparison.
//
// Health Connect lives on Android and has no cloud API, so the user exports it
// (Settings → Health Connect → Manage data → Backup and restore) and chooses the
// file here. The server keeps the imported sessions; per day, the user picks
// the one that overlaps the hours the tracker was used.

import { onChange, state, syncHealthFile, clearHealthConnect } from "../store.js";
import { dayDef, editDay, isRestKey, levelFor, progressOf, sessionKeyFor, trackerWindowFor } from "../plan.js";
import { sessionKind } from "../themes.js";
import { esc, fmtDate, todayIso } from "../util.js";
import { icon } from "./icons.js";
import { confirmDialog, openDialog, toast } from "./ui.js";
import { locale, t } from "../i18n.js";

// The export database uses its own sequence of exercise type ids, so map them
// here instead of showing raw numbers.
const ACTIVITY_NAMES = {
  0: "Exercise",
  2: "Badminton",
  4: "Running",
  5: "Basketball",
  8: "Biking",
  10: "Boxing",
  11: "Calisthenics",
  13: "Cricket",
  14: "Dancing",
  16: "Fencing",
  17: "Football (American)",
  18: "Football (Australian)",
  20: "Golf",
  22: "Gymnastics",
  23: "Handball",
  24: "High-intensity interval",
  25: "Hiking",
  26: "Ice hockey",
  27: "Ice skating",
  29: "Martial arts",
  31: "Paddling",
  32: "Paragliding",
  33: "Elliptical",
  34: "Treadmill",
  35: "Rock climbing",
  36: "Roller hockey",
  37: "Rowing",
  38: "Rugby",
  39: "Running",
  40: "Sailing",
  42: "Scuba diving",
  43: "Skating",
  44: "Skiing",
  45: "Snowboarding",
  46: "Snowshoeing",
  47: "Soccer",
  48: "Softball",
  49: "Squash",
  50: "Stair climbing",
  51: "Strength training",
  52: "Stretching",
  53: "Walking",
  54: "Surfing",
  55: "Swimming (open water)",
  56: "Swimming (pool)",
  57: "Table tennis",
  58: "Weight training",
  59: "Volleyball",
  60: "Dynamic workout",
  61: "Water polo",
  62: "Wheelchair",
  63: "Yoga",
};

const STRENGTH = new Set([11, 51, 58]);
const INTERVALS = new Set([4, 8, 24, 33, 34, 37, 39, 50, 60]);
const ENDURANCE = new Set([14, 20, 22, 25, 43, 44, 45, 46, 47, 53, 54, 55, 56, 59, 61, 63]);

const ERROR_TEXT = {
  "unsupported-node": "Health Connect ZIP and database imports need Node.js 22.13 or newer. Update Node, or upload a JSON export.",
  "not-health-connect": "This file is not a Health Connect export.",
  "not-zip": "This file is not a Health Connect export.",
  "bad-zip": "This file is not a Health Connect export.",
  "no-db": "This file is not a Health Connect export.",
  "not-db": "This file is not a Health Connect export.",
  "no-sessions": "No exercise sessions were found in this file.",
  "invalid-json": "This JSON file could not be read.",
  "unknown-file": "Choose a Health Connect .zip, .db or .json export.",
  "server-required": "Start the local server with npm start to import Health Connect.",
  "no-file": "Choose a Health Connect export first.",
  "import-failed": "Could not read this Health Connect export.",
};

const activityName = (session) => t(ACTIVITY_NAMES[session.type] || session.activity || "Exercise");

function kindForType(type) {
  if (STRENGTH.has(type)) return "strength";
  if (INTERVALS.has(type)) return "intervals";
  if (ENDURANCE.has(type)) return "endurance";
  return "other";
}

function clock(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
}

function sessionTime(session) {
  const start = session.startLocal || (session.start ? clock(session.start) : "");
  const end = session.endLocal || (session.end ? clock(session.end) : "");
  return start && end ? `${start}–${end}` : start || "";
}

function syncTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" });
}

function sessionsForDate(date) {
  const sessions = state.health && Array.isArray(state.health.sessions) ? state.health.sessions : [];
  return sessions.filter((session) => session.date === date).sort((a, b) => (a.start < b.start ? -1 : 1));
}

function sameSession(a, b) {
  if (!a || !b || !a.start || !b.start) return false;
  const near = (left, right) => Number.isFinite(Date.parse(left)) && Number.isFinite(Date.parse(right)) && Math.abs(Date.parse(left) - Date.parse(right)) < 120000;
  return near(a.start, b.start) && near(a.end, b.end);
}

function exerciseSnapshot(session) {
  return {
    start: session.start,
    end: session.end,
    startLocal: session.startLocal,
    endLocal: session.endLocal,
    minutes: session.minutes,
    type: session.type,
    activity: session.activity,
    title: session.title,
    sourceApp: session.sourceApp,
    averageBpm: session.averageBpm,
    maxBpm: session.maxBpm,
    calories: session.calories,
    sets: session.sets,
    reps: session.reps,
    syncedAt: new Date().toISOString(),
  };
}

function linkedSession(date) {
  const link = state.days[date] && state.days[date].healthConnect;
  if (!link) return null;
  return sessionsForDate(date).find((session) => sameSession(session, link)) || link;
}

function matchFor(session, window) {
  if (!window) return { kind: "none", overlap: 0 };
  const start = Date.parse(session.start);
  const end = Date.parse(session.end);
  const from = Date.parse(window.start);
  const to = Date.parse(window.end);
  if (![start, end, from, to].every(Number.isFinite)) return { kind: "none", overlap: 0 };
  const overlap = Math.max(0, Math.min(end, to) - Math.max(start, from));
  const full = start >= from - 5 * 60000 && end <= to + 5 * 60000;
  if (full) return { kind: "full", overlap };
  return overlap > 0 ? { kind: "partial", overlap } : { kind: "none", overlap: 0 };
}

const matchRank = (match) => (match.kind === "full" ? 0 : match.kind === "partial" ? 1 : 2);
const matchLabel = (kind) => (kind === "full" ? t("Full match") : kind === "partial" ? t("Partly overlaps") : t("No overlap"));
const timeHtml = (session, kind) => `<span class="hc-time ${kind}">${esc(sessionTime(session))}</span>`;

function candidatesFor(date) {
  const window = trackerWindowFor(date);
  return sessionsForDate(date)
    .map((session) => ({ session, match: matchFor(session, window) }))
    .sort((a, b) => matchRank(a.match) - matchRank(b.match) || Date.parse(a.session.start) - Date.parse(b.session.start));
}

function planFor(date) {
  const key = sessionKeyFor(date);
  if (isRestKey(key)) return { rest: true, title: t("Rest day"), done: 0, total: 0, log: state.days[date] || null };
  const def = dayDef(key);
  const log = state.days[date] || null;
  const progress = progressOf(log);
  return { rest: false, title: def ? def.title : t("Workout"), done: progress.done, total: progress.total, log, kind: sessionKind(key) };
}

function comparison(session, plan) {
  if (plan.rest) return { kind: "other", text: t("Extra activity") };
  if (!plan.kind || plan.kind === "rest") return { kind: "other", text: t("Different activity from today's plan") };
  if (kindForType(session.type) === plan.kind) return { kind: "same", text: t("Same kind of session as today's plan") };
  return { kind: "other", text: t("Different activity from today's plan") };
}

function valuesHtml(session) {
  const parts = [];
  if (session.averageBpm != null) parts.push(`<span>${icon("heart", "sm")} ${esc(t("avg {bpm} bpm", { bpm: session.averageBpm }))}</span>`);
  if (session.maxBpm != null) parts.push(`<span>${esc(t("peak {bpm} bpm", { bpm: session.maxBpm }))}</span>`);
  if (session.calories != null) parts.push(`<span>${esc(t("{count} kcal", { count: session.calories }))}</span>`);
  if (session.sets != null) parts.push(`<span>${esc(session.reps ? t("{sets} sets · {reps} reps", { sets: session.sets, reps: session.reps }) : t("{count} sets", { count: session.sets }))}</span>`);
  return parts.length ? `<div class="hc-values">${parts.join("")}</div>` : "";
}

function sessionCardHtml(session, plan, window) {
  const match = matchFor(session, window);
  const cmp = comparison(session, plan);
  const minutes = Number.isFinite(Number(session.minutes)) ? Number(session.minutes) : 0;
  return `<article class="hc-session">
    <div class="hc-session-top">
      <div class="hc-session-name"><b>${esc(activityName(session))}</b>${session.title ? `<span class="muted">${esc(session.title)}</span>` : ""}</div>
      <span class="chip hc-${cmp.kind}">${esc(cmp.text)}</span>
    </div>
    <div class="hc-meta">
      <span>${timeHtml(session, match.kind)} <small class="hc-match">${esc(matchLabel(match.kind))}</small></span>
      <span>${esc(t("{count} min", { count: minutes }))}</span>
      ${session.sourceApp ? `<span>${esc(session.sourceApp)}</span>` : ""}
    </div>
    ${valuesHtml(session)}
  </article>`;
}

function logHtml(plan) {
  if (plan.rest) return `<div class="hc-log"><span class="eyebrow">${t("Your log")}</span><b>${t("Rest day")}</b></div>`;
  const status = plan.log && plan.log.skip ? t("Skipped") : plan.log && plan.log.status === "done" ? t("Done") : plan.log && plan.log.status === "partial" ? t("In progress") : t("Not logged");
  return `<div class="hc-log"><span class="eyebrow">${t("Your log")}</span><b>${esc(plan.title)}</b><span>${esc(status)}${plan.total ? ` · ${t("{done} of {total} done", { done: plan.done, total: plan.total })}` : ""}</span></div>`;
}

function introHtml() {
  return `<p class="hc-intro muted">${t("Read-only, one-way import from your phone's fitness apps. Nothing is written back to Health Connect.")}</p>
    <ol class="hc-steps">
      <li>${t("On your Android phone, open Health Connect → Manage data → Backup and restore → Export now.")}</li>
      <li>${t("Save the Health Connect.zip file where this computer can reach it, such as Google Drive.")}</li>
      <li>${t("Import it below. Only exercise sessions are kept here; the file is not sent anywhere else.")}</li>
    </ol>
    <p class="muted hc-note">${t("ZIP and database exports need Node.js 22.13 or newer. A JSON export works on older versions.")}</p>`;
}

function trackerSource(win) {
  if (!win) return "";
  if (win.estimated) return t("Estimated from your last save");
  return win.source === "guided" ? t("From your guided workout") : t("From your workout edits");
}

function trackerLine(win) {
  if (!win) return `<p class="muted">${t("No tracker time for this day. Pick the session that matches your workout.")}</p>`;
  return `<div class="hc-tracker"><span class="eyebrow">${t("Tracker time")}</span><b class="mono">${esc(clock(win.start))}–${esc(clock(win.end))}</b><span class="muted">${esc(trackerSource(win))}</span></div>`;
}

// The chooser. It shows every exercise session on the date, marks the time
// green when it sits inside the tracker window, amber when it only overlaps,
// and muted when it does not. The user confirms the one to link.
export function openHealthConnectSync(date, { onDone = null } = {}) {
  const store = state.health;
  if (!store || !Array.isArray(store.sessions)) {
    toast(t("Import a Health Connect export in Settings first."), { icon: "info" });
    return;
  }
  const window = trackerWindowFor(date);
  const candidates = candidatesFor(date);
  const link = state.days[date] && state.days[date].healthConnect;
  let selected = link ? candidates.findIndex(({ session }) => sameSession(session, link)) : -1;
  if (selected < 0) selected = candidates.length === 1 ? 0 : candidates.findIndex(({ match }) => match.kind === "full");
  if (selected < 0) selected = candidates.findIndex(({ match }) => match.kind === "partial");
  const content = document.createElement("div");
  content.className = "hc-sync-dialog";
  const list = candidates.length
    ? `<div class="hc-choice-list" role="radiogroup" aria-label="${esc(t("Health Connect sessions"))}">${candidates.map(({ session, match }, index) => `
        <label class="hc-choice">
          <input type="radio" name="hc-session" value="${index}" ${index === selected ? "checked" : ""}>
          <div class="hc-choice-body">
            <span class="hc-choice-top"><b>${esc(activityName(session))}</b>${session.title ? `<span class="muted">${esc(session.title)}</span>` : ""}${timeHtml(session, match.kind)}</span>
            <span class="hc-meta"><span>${esc(t("{count} min", { count: Number(session.minutes) || 0 }))}</span>${session.sourceApp ? `<span>${esc(session.sourceApp)}</span>` : ""}<span class="hc-match">${esc(matchLabel(match.kind))}</span></span>
            ${valuesHtml(session)}
          </div>
        </label>`).join("")}</div>
      <div class="hc-legend">${["full", "partial", "none"].map((kind) => `<span><i class="hc-dot ${kind}"></i>${esc(matchLabel(kind))}</span>`).join("")}</div>`
    : `<p class="muted">${t("No Health Connect session for this date.")}</p>`;
  content.innerHTML = `<p class="muted">${t("Choose the session that matches the hours you used the tracker.")}</p>
    ${trackerLine(window)}
    ${list}
    <div class="btn-row hc-dialog-actions">
      ${link ? `<button type="button" class="btn ghost" data-hc-unlink>${t("Remove this day's link")}</button>` : ""}
      <button type="button" class="btn" data-hc-cancel>${t("Cancel")}</button>
      ${candidates.length ? `<button type="button" class="btn primary" data-hc-use ${selected < 0 ? "disabled" : ""}>${icon("check")} ${t("Link this session")}</button>` : ""}
    </div>`;
  const dialog = openDialog({ title: t("Link a Health Connect session to {date}", { date: fmtDate(date) }), content, sheet: false });
  const use = content.querySelector("[data-hc-use]");
  content.addEventListener("change", (event) => {
    if (event.target.name === "hc-session" && use) use.disabled = false;
  });
  use?.addEventListener("click", () => {
    const chosen = content.querySelector('input[name="hc-session"]:checked');
    if (!chosen) return;
    const session = candidates[Number(chosen.value)].session;
    editDay(date, (day) => { day.healthConnect = exerciseSnapshot(session); });
    toast(t("Linked {activity} to {date}.", { activity: activityName(session), date: fmtDate(date) }));
    dialog.close();
    onDone?.();
  });
  content.querySelector("[data-hc-cancel]")?.addEventListener("click", () => dialog.close());
  content.querySelector("[data-hc-unlink]")?.addEventListener("click", () => {
    editDay(date, (day) => { delete day.healthConnect; });
    toast(t("Removed this day's Health Connect link."), { icon: "trash" });
    dialog.close();
    onDone?.();
  });
}

// The per-day card on Today and Activity. Once a day is linked, it shows that
// one session; otherwise it offers the matching sessions for the date.
export function mountHealthConnect(host, date, { compact = false, onSync = null } = {}) {
  if (!host) return null;
  let busy = false;
  let error = "";
  let disposed = false;
  let linkSignature = "";

  function draw() {
    if (disposed) return;
    linkSignature = JSON.stringify((state.days[date] && state.days[date].healthConnect) || null);
    const store = state.health;
    const sessions = sessionsForDate(date);
    const candidates = candidatesFor(date);
    const linked = linkedSession(date);
    const plan = planFor(date);
    const total = store && Array.isArray(store.sessions) ? store.sessions.length : 0;
    const syncLabel = store ? t("Import a new file") : t("Import Health Connect file");
    const button = busy
      ? `<span class="btn sm" aria-disabled="true">${icon("upload", "sm")} ${t("Reading…")}</span>`
      : `<label class="btn sm hc-file">${icon("upload", "sm")} ${esc(syncLabel)}<input class="sr-only" type="file" accept=".zip,.db,.json,application/zip,application/octet-stream,application/json"></label>`;
    const clear = store && !busy ? `<button type="button" class="btn sm ghost" data-hc-clear>${icon("trash", "sm")} ${t("Remove imported data")}</button>` : "";
    const choose = store && sessions.length && !busy
      ? `<button type="button" class="btn sm" data-hc-sync>${icon("swap", "sm")} ${linked ? t("Change session") : t("Choose a session")}</button>`
      : "";
    const unlink = linked && !busy
      ? `<button type="button" class="btn sm ghost" data-hc-unlink>${icon("trash", "sm")} ${t("Remove this day's link")}</button>`
      : "";
    const sessionBlock = linked
      ? `<div class="hc-sessions">${sessionCardHtml(linked, plan, trackerWindowFor(date))}</div>`
      : sessions.length
        ? `<div class="hc-candidates"><p class="muted">${t("{count} sessions found for this day. Choose the one that matches the hours you used the tracker.", { count: sessions.length })}</p><div class="hc-candidate-times">${candidates.map(({ session, match }) => `<span class="hc-time ${match.kind}" title="${esc(matchLabel(match.kind))}">${esc(sessionTime(session))}</span>`).join("")}</div></div>`
        : store
          ? `<p class="hc-empty muted">${t("No Health Connect session for this date.")}</p>`
          : "";
    const storeLine = store
      ? `<div class="hc-store-line"><span>${t("Last import {date}", { date: esc(syncTime(store.syncedAt)) })}</span><span class="muted">${t("{count} sessions in the imported copy", { count: total })}</span></div>`
      : "";
    const linkedCount = linked ? 1 : 0;
    const linkedMinutes = linked ? Number(linked.minutes) || 0 : sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
    host.innerHTML = `<section class="card block health-connect${compact ? " compact" : ""}" data-hc>
      <div class="hc-head">
        <div class="addon-head">${icon("heart", "lg")}<h3>${t("Health Connect")}</h3></div>
        <span class="eyebrow">${t("Read-only")}</span>
      </div>
      ${store ? storeLine : introHtml()}
      ${store || linked ? `<div class="hc-plan-row">${logHtml(plan)}<div class="hc-log"><span class="eyebrow">${t("Health Connect")}</span><b>${esc(t("{count} sessions", { count: linked ? linkedCount : sessions.length }))}</b>${linkedMinutes ? `<span>${esc(t("{count} min", { count: linkedMinutes }))}</span>` : ""}</div></div>` : ""}
      ${sessionBlock}
      ${linked || sessions.length ? `<p class="muted hc-note">${t("Health Connect keeps the workout as one session. This compares time, length and heart rate; sets stay in your log.")}</p>` : ""}
      ${error ? `<div class="banner hc-error" role="status"><span>${icon("info", "lg")}</span><div class="grow">${esc(error)}</div></div>` : ""}
      <div class="hc-actions">${button}${choose}${unlink}${clear}</div>
    </section>`;

    const input = host.querySelector('input[type="file"]');
    input?.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) sync(file);
    });
    host.querySelector("[data-hc-sync]")?.addEventListener("click", () => openHealthConnectSync(date, { onDone: () => { draw(); onSync?.(); } }));
    host.querySelector("[data-hc-unlink]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("Remove this day's link"),
        message: t("The session summary is removed from this day's log. Health Connect and the imported copy stay untouched."),
        confirm: t("Remove"),
        danger: true,
      });
      if (!ok) return;
      editDay(date, (day) => { delete day.healthConnect; });
      toast(t("Removed this day's Health Connect link."), { icon: "trash" });
      draw();
      onSync?.();
    });
    host.querySelector("[data-hc-clear]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("Remove imported Health Connect data?"),
        message: t("This only removes the sessions imported here. Your Health Connect data, linked days and workout log stay untouched."),
        confirm: t("Remove"),
        danger: true,
      });
      if (!ok) return;
      try {
        await clearHealthConnect();
        toast(t("Health Connect import removed."), { icon: "trash" });
        onSync?.();
      } catch (err) {
        error = t(ERROR_TEXT["import-failed"]);
        toast(error, { icon: "info" });
        draw();
      }
    });
  }

  async function sync(file) {
    busy = true;
    error = "";
    draw();
    try {
      const result = await syncHealthFile(file);
      toast(t("Loaded {count} sessions from Health Connect.", { count: result.imported }));
      onSync?.();
    } catch (err) {
      error = t(ERROR_TEXT[err.code] || ERROR_TEXT["import-failed"]);
      toast(error, { icon: "info" });
    } finally {
      busy = false;
      draw();
    }
  }

  // Health updates redraw the card; day edits are handled by the view's own
  // refresh() and by the chooser's onDone callback.
  const unsubscribe = onChange((event) => {
    if (event.type === "health") draw();
    else if (event.type === "day" && event.date === date && JSON.stringify((state.days[date] && state.days[date].healthConnect) || null) !== linkSignature) draw();
  });
  draw();
  return {
    refresh: draw,
    dispose() { disposed = true; unsubscribe(); host.innerHTML = ""; },
  };
}

// Settings → Health Connect: connection state and a manual day picker.
export function mountHealthConnectSettings(host, { onChanged = null } = {}) {
  if (!host) return null;
  let day = todayIso();
  let busy = false;
  let error = "";
  let disposed = false;

  function draw() {
    if (disposed) return;
    const store = state.health;
    const sessions = sessionsForDate(day);
    const linked = linkedSession(day);
    const total = store && Array.isArray(store.sessions) ? store.sessions.length : 0;
    const status = store ? t("Ready") : t("No file imported");
    const last = store ? t("Last import {date}", { date: syncTime(store.syncedAt) }) : "";
    const support = state.mode === "local"
      ? t("Start the local server to import Health Connect.")
      : t("Health Connect is on your phone. Export it, then import the file here. Nothing is written back.");
    const importButton = busy
      ? `<span class="btn" aria-disabled="true">${icon("upload")} ${t("Reading…")}</span>`
      : `<label class="btn hc-file">${icon("upload")} ${store ? t("Import a new file") : t("Import Health Connect file")}<input class="sr-only" type="file" accept=".zip,.db,.json,application/zip,application/octet-stream,application/json"></label>`;
    host.innerHTML = `<section class="card card-pad health-connect-settings" data-hc-settings>
      <div class="section-title"><div style="display:grid;gap:3px"><h3>${t("Health Connect")}</h3><p class="sub">${t("Read-only, one-way import")}</p></div><span class="chip ${store ? "accent" : ""}">${esc(status)}</span></div>
      <p class="muted" style="font-size:0.88rem">${support}</p>
      <details class="hc-help" ${store ? "" : "open"}>
        <summary>${t("How to import from Health Connect")}</summary>
        <ol class="hc-steps">
          <li>${t("Make sure your fitness app writes workouts to Health Connect.")}</li>
          <li>${t("On your Android phone, open Health Connect → Manage data → Backup and restore → Export now.")}</li>
          <li>${t("Save the Health Connect.zip file where this computer can reach it, such as Google Drive.")}</li>
          <li>${t("Import the file below, then pick the day and the session that matches your tracker time.")}</li>
        </ol>
        <p class="muted hc-note">${t("Health Connect has no live web API, so this reads the export you choose.")}</p>
        <p class="muted hc-note">${t("ZIP and database exports need Node.js 22.13 or newer. A JSON export works on older versions.")}</p>
      </details>
      <div class="hc-connect-row">${importButton}${store ? `<button type="button" class="btn ghost" data-hc-remove>${icon("trash")} ${t("Remove imported data")}</button>` : ""}</div>
      ${store ? `<p class="muted hc-store-line"><span>${esc(last)}</span><span>${t("{count} sessions in the imported copy", { count: total })}</span></p>` : ""}
      ${error ? `<div class="banner hc-error" role="status"><span>${icon("info", "lg")}</span><div class="grow">${esc(error)}</div></div>` : ""}
      <div class="hc-day-row">
        <label class="field"><span>${t("Day")}</span><input class="input" type="date" data-hc-day value="${esc(day)}"></label>
        <div class="btn-row" style="align-items:end">
          <button type="button" class="btn" data-hc-choose ${!store || busy ? "disabled" : ""}>${icon("swap")} ${t("Choose a session")}</button>
          ${linked ? `<button type="button" class="btn ghost" data-hc-settings-unlink>${icon("trash")} ${t("Remove this day's link")}</button>` : ""}
        </div>
      </div>
      ${linked ? `<p class="muted hc-note">${t("Health Connect")}: <b>${esc(activityName(linked))}</b> · ${esc(sessionTime(linked))}</p>` : ""}
      ${store ? `<p class="muted hc-note">${sessions.length ? t("{count} sessions on {date}. Choose the one that matches the hours you used the tracker.", { count: sessions.length, date: fmtDate(day) }) : t("No Health Connect session for this date.")}</p>` : ""}
      <p class="muted hc-note">${t("The card on Today and Activity → This week shows the session linked to that day.")}</p>
    </section>`;

    const input = host.querySelector('input[type="file"]');
    input?.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) sync(file);
    });
    host.querySelector("[data-hc-day]")?.addEventListener("change", (event) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) {
        day = event.target.value;
        draw();
      }
    });
    host.querySelector("[data-hc-choose]")?.addEventListener("click", () => openHealthConnectSync(day, { onDone: () => { draw(); onChanged?.(); } }));
    host.querySelector("[data-hc-settings-unlink]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("Remove this day's link"),
        message: t("The session summary is removed from this day's log. Health Connect and the imported copy stay untouched."),
        confirm: t("Remove"),
        danger: true,
      });
      if (!ok) return;
      editDay(day, (entry) => { delete entry.healthConnect; });
      toast(t("Removed this day's Health Connect link."), { icon: "trash" });
      draw();
      onChanged?.();
    });
    host.querySelector("[data-hc-remove]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("Remove imported Health Connect data?"),
        message: t("This only removes the sessions imported here. Your Health Connect data, linked days and workout log stay untouched."),
        confirm: t("Remove"),
        danger: true,
      });
      if (!ok) return;
      try {
        await clearHealthConnect();
        toast(t("Health Connect import removed."), { icon: "trash" });
        onChanged?.();
        draw();
      } catch (err) {
        error = t(ERROR_TEXT["import-failed"]);
        toast(error, { icon: "info" });
        draw();
      }
    });
  }

  async function sync(file) {
    busy = true;
    error = "";
    draw();
    try {
      const result = await syncHealthFile(file);
      toast(t("Loaded {count} sessions from Health Connect.", { count: result.imported }));
      onChanged?.();
    } catch (err) {
      error = t(ERROR_TEXT[err.code] || ERROR_TEXT["import-failed"]);
      toast(error, { icon: "info" });
    } finally {
      busy = false;
      draw();
    }
  }

  draw();
  return {
    refresh: draw,
    dispose() { disposed = true; host.innerHTML = ""; },
  };
}

// Exposed for the tracker tests; the UI uses the same comparison.
export const healthMatch = (session, window) => matchFor(session, window);
