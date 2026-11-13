// Read-only Health Connect comparison.
//
// Health Connect lives on Android and has no cloud API, so the user exports it
// (Settings → Health Connect → Manage data → Backup and restore) and chooses the
// file here. The server keeps only exercise sessions; nothing is written back.

import { onChange, state, syncHealthFile, clearHealthConnect } from "../store.js";
import { dayDef, isRestKey, levelFor, progressOf, sessionKeyFor } from "../plan.js";
import { sessionKind } from "../themes.js";
import { esc } from "../util.js";
import { icon } from "./icons.js";
import { confirmDialog, toast } from "./ui.js";
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
  "server-required": "Start the local server with npm start to sync Health Connect.",
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

function sessionTime(session) {
  const start = session.startLocal || (session.start ? new Date(session.start).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : "");
  const end = session.endLocal || (session.end ? new Date(session.end).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : "");
  return start && end ? `${start}–${end}` : start || "";
}

function syncTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" });
}

function planFor(date) {
  const key = sessionKeyFor(date);
  if (isRestKey(key)) return { rest: true, title: t("Rest day"), done: 0, total: 0, log: state.days[date] || null };
  const def = dayDef(key);
  const level = levelFor(date);
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

function sessionHtml(session, plan) {
  const match = comparison(session, plan);
  const minutes = Number.isFinite(Number(session.minutes)) ? Number(session.minutes) : 0;
  return `<article class="hc-session">
    <div class="hc-session-top">
      <div class="hc-session-name"><b>${esc(activityName(session))}</b>${session.title ? `<span class="muted">${esc(session.title)}</span>` : ""}</div>
      <span class="chip hc-${match.kind}">${esc(match.text)}</span>
    </div>
    <div class="hc-meta">
      <span>${esc(sessionTime(session))}</span>
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
  return `<p class="hc-intro muted">${t("Read-only, one-way sync from your phone's fitness apps. Nothing is written back to Health Connect.")}</p>
    <ol class="hc-steps">
      <li>${t("On your Android phone, open Health Connect → Manage data → Backup and restore → Export now.")}</li>
      <li>${t("Save the Health Connect.zip file where this computer can reach it, such as Google Drive.")}</li>
      <li>${t("Choose it below. Only exercise sessions are kept here; the file is not sent anywhere else.")}</li>
    </ol>
    <p class="muted hc-note">${t("ZIP and database exports need Node.js 22.13 or newer. A JSON export works on older versions.")}</p>`;
}

export function mountHealthConnect(host, date, { compact = false } = {}) {
  if (!host) return null;
  let busy = false;
  let error = "";
  let disposed = false;

  function draw() {
    if (disposed) return;
    const store = state.health;
    const sessions = (store && Array.isArray(store.sessions) ? store.sessions : []).filter((session) => session.date === date);
    const plan = planFor(date);
    const total = store && Array.isArray(store.sessions) ? store.sessions.length : 0;
    const syncLabel = store ? t("Sync again") : t("Sync Health Connect");
    const button = busy
      ? `<span class="btn sm" aria-disabled="true">${icon("upload", "sm")} ${t("Reading…")}</span>`
      : `<label class="btn sm hc-file">${icon("upload", "sm")} ${esc(syncLabel)}<input class="sr-only" type="file" accept=".zip,.db,.json,application/zip,application/octet-stream,application/json"></label>`;
    const clear = store && !busy ? `<button type="button" class="btn sm ghost" data-hc-clear>${icon("trash", "sm")} ${t("Remove synced data")}</button>` : "";
    const sessionBlock = sessions.length
      ? `<div class="hc-sessions">${sessions.map((session) => sessionHtml(session, plan)).join("")}</div>`
      : store
        ? `<p class="hc-empty muted">${t("No Health Connect session for this date.")}</p>`
        : "";
    const storeLine = store
      ? `<div class="hc-store-line"><span>${t("Last synced {date}", { date: esc(syncTime(store.syncedAt)) })}</span><span class="muted">${t("{count} sessions in the synced copy", { count: total })}</span></div>`
      : "";
    host.innerHTML = `<section class="card block health-connect${compact ? " compact" : ""}" data-hc>
      <div class="hc-head">
        <div class="addon-head">${icon("heart", "lg")}<h3>${t("Health Connect")}</h3></div>
        <span class="eyebrow">${t("Read-only")}</span>
      </div>
      ${store ? storeLine : introHtml()}
      ${store ? `<div class="hc-plan-row">${logHtml(plan)}<div class="hc-log"><span class="eyebrow">${t("Health Connect")}</span><b>${t("{count} sessions", { count: sessions.length })}</b>${sessions.length ? `<span>${esc(t("{count} min", { count: sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0) }))}</span>` : ""}</div></div>` : ""}
      ${sessionBlock}
      ${sessions.length ? `<p class="muted hc-note">${t("Health Connect keeps the workout as one session. This compares time, length and heart rate; sets stay in your log.")}</p>` : ""}
      ${error ? `<div class="banner hc-error" role="status"><span>${icon("info", "lg")}</span><div class="grow">${esc(error)}</div></div>` : ""}
      <div class="hc-actions">${button}${clear}</div>
    </section>`;

    const input = host.querySelector('input[type="file"]');
    input?.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) sync(file);
    });
    host.querySelector("[data-hc-clear]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: t("Remove synced Health Connect data?"),
        message: t("This only removes the sessions imported here. Your Health Connect data and your workout log stay untouched."),
        confirm: t("Remove"),
        danger: true,
      });
      if (!ok) return;
      try {
        await clearHealthConnect();
        toast(t("Synced Health Connect data removed."), { icon: "trash" });
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
      toast(t("Synced {count} sessions from Health Connect.", { count: result.imported }));
    } catch (err) {
      error = t(ERROR_TEXT[err.code] || ERROR_TEXT["import-failed"]);
      toast(error, { icon: "info" });
    } finally {
      busy = false;
      draw();
    }
  }

  // Health updates redraw the card; day edits are handled by the view's own
  // refresh() so typing in the logger does not replace this panel.
  const unsubscribe = onChange((event) => {
    if (event.type === "health") draw();
  });
  draw();
  return {
    refresh: draw,
    dispose() { disposed = true; unsubscribe(); host.innerHTML = ""; },
  };
}
