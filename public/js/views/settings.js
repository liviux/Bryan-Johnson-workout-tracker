// Settings: profile (drives zones and loads), training level, add-ons, workout options,
// theme, animation style, and your data (export, import, reset). Everything saves as you type.

import { ADDONS } from "../data/addons/index.js";
import { CATEGORIES, EXERCISES } from "../data/exercises.js";
import { exportAll, importAll, resetAll, resetDays, state, updateProfile } from "../store.js";
import { SEXES, bpmRange, hrMax, levelIndex } from "../personalize.js";
import { blockItems, dayDef, levelFor, sessionKeyFor, sessionsDone, addonRunsOn, addonSchedule, ADDON_EVERY_MAX } from "../plan.js";
import { levelPickerHtml } from "../components/level-picker.js";
import { mountLevelCheck } from "../components/level-check.js";
import { addDays, esc, fmtShort, todayIso } from "../util.js";
import { icon } from "../components/icons.js";
import { confirmDialog, openDialog, seg, switchHtml, toast } from "../components/ui.js";
import { applyLook, currentSkin, detailMode, skinById, skinPickerHtml } from "../themes.js";
import { openSkinBar } from "../components/skin-bar.js";
import { ANIM_STYLES, PREVIEW_EXERCISE, animStylePickerHtml, applyAnimStyle, currentAnimStyle, hasAnimStyles } from "../anim-styles.js";
import { openAnimBar } from "../components/anim-bar.js";
import { createEquipmentEditor } from "../components/equipment-editor.js";
import { createStagePanel } from "../components/stage-panel.js";
import { thumbnail } from "../components/thumbs.js";
import { createCoachControls } from "../components/coach-controls.js";
import { REPO, openChangelogDialog } from "../components/changelog.js";

const LB = 2.20462;
const REST_PRESETS = [45, 60, 75, 90, 120];
const DEFAULT_ADDON_EVERY = 2;

export function render(el) {
  const p = () => state.profile;
  const imperial = () => p().units === "imperial";
  const w = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB * 10) / 10 : kg);
  const hgt = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);
  let customRest = !REST_PRESETS.includes(p().settings?.restSec || 75);

  // The animation style preview: one 3D stage, kept across redraws of the page, on the
  // exercise picked under it (remembered for this tab).
  let previewEx = PREVIEW_EXERCISE;
  try {
    const kept = sessionStorage.getItem("hp:animpreview");
    if (kept && EXERCISES[kept] && !EXERCISES[kept].hidden) previewEx = kept;
  } catch {}
  const previewEl = document.createElement("div");
  previewEl.className = "anim-preview stage";
  let equipmentEditor = null;
  let coachControls = null;
  let preview = null;
  let disposed = false;
  function refreshVersion() {
    fetch("/api/info", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then((info) => {
      if (disposed || !info?.version) return;
      state.version = info.version;
      el.querySelector("[data-changelog]").textContent = `Version ${info.version} · Latest changes`;
    }).catch(() => {});
  }
  const previewObserver = new IntersectionObserver((entries) => {
    if (disposed || !entries.some((entry) => entry.isIntersecting)) return;
    previewObserver.disconnect();
    preview = createStagePanel(previewEl);
    preview.load(previewEx);
    fillAnimThumbs();
  }, { rootMargin: "200px" });

  function editAddonSchedule(id, fn) {
    updateProfile((pr) => {
      pr.addonSchedules = pr.addonSchedules || {};
      const sched = pr.addonSchedules[id] || (pr.addonSchedules[id] = { mode: "daily", every: DEFAULT_ADDON_EVERY, sunday: true });
      fn(sched);
    });
  }

  function nextAddonDate(a) {
    const sched = addonSchedule(a);
    if (!sched || sched.mode !== "every") return null;
    const since = sched.since || p().startDate;
    if (!since) return null;
    const today = todayIso();
    const start = today > since ? today : since;
    for (let i = 0; i < 15; i++) {
      const date = addDays(start, i);
      if (addonRunsOn(a, date)) return date;
    }
    return null;
  }

  function addonCardHtml(a, pr) {
    const sched = addonSchedule(a);
    const mode = sched ? sched.mode : "daily";
    const every = sched ? sched.every : DEFAULT_ADDON_EVERY;
    const sunday = sched ? sched.sunday : true;
    const next = nextAddonDate(a);
    const name = esc(a.name);
    return `<div class="addon-card">${icon(a.icon || "sparkle")}<span style="display:grid;gap:4px"><b>${name}</b><small class="muted">${esc(a.description)}</small></span>${switchHtml("addon:" + a.id, pr.addons && pr.addons[a.id], a.name)}
      <div class="addon-schedule">
        <label class="addon-repeat"><span>Repeat</span><select class="input" data-addon-repeat="${esc(a.id)}" aria-label="How often ${name} runs"><option value="daily"${mode === "daily" ? " selected" : ""}>Daily</option>${Array.from({ length: ADDON_EVERY_MAX - 1 }, (_, i) => i + 2).map((n) => `<option value="${n}"${mode === "every" && n === every ? " selected" : ""}>Every ${n} days</option>`).join("")}</select>${next ? `<small class="addon-next">${next === todayIso() ? "Due today" : `Next ${fmtShort(next)}`}</small>` : ""}</label>
        <label class="addon-sunday">${switchHtml("addon-sunday:" + a.id, sunday, "Include Sunday", "sm")}<span>Include Sunday</span></label>
      </div>
    </div>`;
  }

  function drawPage() {
    const pr = p();
    const st = pr.settings || {};
    el.innerHTML = `<div class="page narrow">
      <div class="section-title"><h2>Settings</h2><span class="muted">Changes save automatically</span></div>

      <section class="card card-pad" style="display:grid;gap:16px">
        <h3>Your details</h3>
        <p class="muted" style="font-size:0.86rem">Your details set your suggested starting weights and heart-rate zones: max ${hrMax(pr)} bpm, Zone 2 ${bpmRange(pr, 60, 70)}.</p>
        <div class="profile-row">
          <label class="field profile-name"><span>Name</span><input class="input" data-f="name" value="${esc(pr.name || "")}"></label>
          <label class="field"><span>Age</span><input class="input" data-f="age" inputmode="numeric" value="${esc(pr.age)}"></label>
          <label class="field"><span>Weight (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="weight" inputmode="decimal" value="${esc(w(pr.weightKg))}"></label>
          <label class="field"><span>Height (${imperial() ? "in" : "cm"})</span><input class="input" data-f="height" inputmode="decimal" value="${esc(hgt(pr.heightCm))}"></label>
        </div>
        <div class="profile-pair">
          <div class="field"><span>Sex (scales starting weights)</span>${seg("sex", SEXES, pr.sex)}</div>
          <div class="field"><span>Units</span>${seg("units", [{ id: "metric", name: "Metric (kg, cm)" }, { id: "imperial", name: "Imperial (lb, in)" }], pr.units, "accent")}</div>
        </div>
        <div class="grid-form">
          <label class="field"><span>Heaviest dumbbell (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="maxdb" inputmode="decimal" value="${esc(w(pr.maxDumbbellKg))}"></label>
          <label class="field"><span>Measured max heart rate</span><input class="input" data-f="hrmax" inputmode="numeric" value="${esc(pr.hrMax ?? "")}" placeholder="estimated from age"></label>
          <label class="field"><span>Program start date</span><input class="input" type="date" data-f="start" value="${esc(pr.startDate || "")}"></label>
        </div>
      </section>

      <details class="card card-pad equipment-settings" id="equipment">
        <summary>Your equipment <small class="muted">Optional inventory</small></summary>
        <div data-equipment-editor></div>
      </details>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Training level</h3>
        <p class="muted" style="font-size:0.86rem">Your level sets the exercises, sets, reps and intervals. Your weight, sex and age adjust the suggested weights.</p>
        <div class="level-manual">
          <h4>Change level manually</h4>
          <p class="muted" style="font-size:0.86rem">Choose an easier or harder level. Past logs keep the level they were done at.</p>
          ${levelPickerHtml(pr.level, { sessions: sessionsDone(levelIndex(pr)) })}
        </div>
        <details class="level-check-disclosure">
          <summary>Level check</summary>
          <div data-level-check-host></div>
        </details>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Add-ons</h3>
        <p class="muted" style="font-size:0.86rem">Turn each add-on on or off, choose how often it repeats (daily or every 2–7 days), and decide whether it appears on Sunday. A repeat counts from the day you set it; Sunday only changes whether the add-on appears that day.</p>
        ${ADDONS.map((a) => addonCardHtml(a, pr)).join("")}
      </section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>During workouts</h3>
        <div class="field"><span>Rest timer after a set</span>${seg("rest", [...REST_PRESETS.map((s) => ({ id: String(s), name: `${s} s` })), { id: "custom", name: "Custom" }], customRest ? "custom" : String(st.restSec || 75))}</div>
        <label class="field rest-custom" ${customRest ? "" : "hidden"}><span>Custom rest (seconds)</span><input class="input" type="number" data-f="restCustom" min="1" max="3600" step="1" required value="${esc(st.restSec || 75)}"><small>Enter 1 to 3,600 seconds.</small></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("autoRest", st.autoRest !== false, "Start the rest timer automatically")}<span>Start the rest timer automatically when you log a set</span></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("sound", st.sound !== false, "Timer sounds")}<span>Timer beeps</span></label>
        <label style="display:flex;gap:12px;align-items:center">${switchHtml("deskNotify", !!st.deskNotify, "Desk break notifications")}<span>Desk break notifications while this tab is in the background <small class="muted">(off by default; your browser asks for permission)</small></span></label>
      </section>

      <section class="card card-pad" data-coach-settings></section>

      <section class="card card-pad" style="display:grid;gap:14px">
        <h3>Appearance</h3>
        <p class="muted" style="font-size:0.86rem">Choose a theme from these Today screenshots. Each shows a different exercise and animation style; you can choose your animation style below.</p>
        ${skinPickerHtml(st.skin)}
        <div class="live-row">
          <button type="button" class="btn" data-live>${icon("eye")} Try themes live</button>
          <small class="muted">Compare themes on Today with the switcher at the top. Hover a letter to see the theme name. Close it with ×.</small>
        </div>
        <div class="field"><span>Light or dark</span>${skinById(st.skin).modes.length > 1 ? seg("theme", [{ id: "system", name: "Follow the system" }, { id: "light", name: "Light" }, { id: "dark", name: "Dark" }], st.theme || "system") : `<small>${esc(skinById(st.skin).name)} is always dark.</small>`}</div>
      </section>

      <section class="card card-pad" data-anim-settings style="display:grid;gap:14px">
        <h3>Animation style</h3>
        <p class="muted" style="font-size:0.86rem">Pick how the demonstrations look. Every style shows the same movement.</p>
        <div data-anim-preview></div>
        <label class="field anim-preview-pick"><span>Exercise in the preview</span><select class="input" data-anim-ex>${CATEGORIES.map((c) => `<optgroup label="${esc(c)}">${Object.entries(EXERCISES).filter(([, x]) => x.cat === c && !x.hidden).map(([id, x]) => `<option value="${id}"${id === previewEx ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        ${animStylePickerHtml(st.animStyle)}
        <div class="live-row">
          <button type="button" class="btn" data-anim-live>${icon("eye")} Try styles live</button>
          <small class="muted">Compare ${ANIM_STYLES.length} styles during today's session. On a phone or rest day, the exercise above opens instead. Hover a number for the style name, or use ‹ › on a phone. Close the switcher with ×.</small>
        </div>
      </section>

      <section class="card card-pad" style="display:grid;gap:12px">
        <h3>Your data</h3>
        <p class="muted" style="font-size:0.88rem">${state.mode === "server" ? `Your data saves to <code>${esc(state.dataDir)}/</code> on this computer. Git ignores this folder. Copy it or export a backup below to keep a spare copy.` : "The local server is unavailable, so your data saves only in this browser. Export a backup regularly, or run <code>npm start</code> to save to files on your computer."}</p>
        <div class="btn-row">
          <button type="button" class="btn" data-export>${icon("download")} Export backup</button>
          <label class="btn">${icon("upload")} Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
          <a class="btn" href="#/setup/redo">${icon("rotate")} Run setup again</a>
          <button type="button" class="btn danger" data-reset>${icon("trash")} Reset everything</button>
          <button type="button" class="btn danger" data-reset-days>${icon("trash")} Reset workout history</button>
        </div>
      </section>

      <p class="muted" style="font-size:0.82rem">Home Protocol is open source and unaffiliated with Bryan Johnson or Blueprint. It provides a training plan, not medical advice.</p>
      <div class="settings-footer"><button type="button" class="btn ghost sm" data-changelog>Version ${esc(state.version || "unavailable")} · Latest changes</button><a href="${REPO}" target="_blank" rel="noopener noreferrer">GitHub repository ${icon("external", "sm")}</a></div>
    </div>`;
  }

  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.value;
    const n = Number(String(v).replace(",", "."));
    const ok = v !== "" && Number.isFinite(n);
    if (f === "restCustom") {
      const valid = ok && Number.isInteger(n) && n >= 1 && n <= 3600;
      e.target.setCustomValidity(valid ? "" : "Enter a whole number from 1 to 3,600 seconds.");
      if (!valid) return;
    }
    updateProfile((pr) => {
      if (f === "name") pr.name = v;
      else if (f === "age" && ok && n >= 10 && n <= 110) pr.age = Math.round(n);
      else if (f === "weight" && ok && n > 0) pr.weightKg = Math.round((imperial() ? n / LB : n) * 10) / 10;
      else if (f === "height") pr.heightCm = ok ? Math.round(imperial() ? n * 2.54 : n) : null;
      else if (f === "maxdb") pr.maxDumbbellKg = ok ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
      else if (f === "hrmax") pr.hrMax = ok && n > 100 ? Math.round(n) : null;
      else if (f === "start" && v) pr.startDate = v;
      else if (f === "restCustom") {
        pr.settings = pr.settings || {};
        pr.settings.restSec = n;
      }
    });
  });

  el.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.matches("[data-anim-ex]")) {
      previewEx = t.value;
      try {
        sessionStorage.setItem("hp:animpreview", previewEx);
      } catch {}
      preview?.load(previewEx);
      fillAnimThumbs();
    } else if (t.matches("[data-addon-repeat]")) {
      const v = t.value;
      const id = t.dataset.addonRepeat;
      editAddonSchedule(id, (sched) => {
        sched.mode = v === "daily" ? "daily" : "every";
        if (v !== "daily") {
          sched.every = Number(v);
          sched.since = todayIso();
        }
      });
      draw();
      el.querySelector(`[data-addon-repeat="${id}"]`)?.focus();
    } else if (t.dataset.switch) {
      const name = t.dataset.switch;
      if (name.startsWith("addon-sunday:")) {
        editAddonSchedule(name.slice("addon-sunday:".length), (sched) => (sched.sunday = t.checked));
        draw();
        el.querySelector(`[data-switch="${name}"]`)?.focus();
        return;
      }
      if (name === "deskNotify" && t.checked && typeof Notification !== "undefined") {
        try {
          const req = Notification.requestPermission();
          if (req && req.then) req.then((permission) => { if (permission !== "granted") toast("Browser notifications are blocked for this site.", { icon: "info" }); });
        } catch {
          /* notifications are optional */
        }
      }
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        if (name.startsWith("addon:")) {
          pr.addons = pr.addons || {};
          pr.addons[name.slice(6)] = t.checked;
        } else pr.settings[name] = t.checked;
      });
    } else if (t.matches("[data-import]") && t.files && t.files[0]) {
      try {
        const data = JSON.parse(await t.files[0].text());
        const days = Object.keys(data.days || {}).length;
        const replace = await confirmDialog({ title: "Import backup", message: `This backup has ${days} logged days${data.profile ? " and a profile" : ""}. Choose Replace all to overwrite your current data. Cancel merges the backup instead; its days overwrite matching dates.`, confirm: "Replace all", danger: true });
        await importAll(data, replace ? "replace" : "merge");
        customRest = !REST_PRESETS.includes(p().settings?.restSec || 75);
        applyLook(state.profile && state.profile.settings);
        applyAnimStyle((state.profile && state.profile.settings) || {});
        toast(`Imported ${days} days`);
        draw();
      } catch (err) {
        toast("That file isn't a backup from this app", { icon: "info" });
      }
      t.value = "";
    }
  });

  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-changelog")) {
      refreshVersion();
      openChangelogDialog();
      return;
    }
    if (b.hasAttribute("data-live")) {
      openSkinBar();
      location.hash = "#/today";
      return;
    }
    if (b.hasAttribute("data-anim-live")) {
      openAnimBar();
      location.hash = styledToday() ? "#/today" : `#/library/${previewEx}`;
      return;
    }
    if (b.dataset.animStyle) {
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        pr.settings.animStyle = b.dataset.animStyle;
      });
      applyAnimStyle(p().settings);
      return;
    }
    if (b.dataset.level) {
      updateProfile((pr) => (pr.level = b.dataset.level));
      draw();
      el.querySelector(`[data-level="${b.dataset.level}"]`).focus();
      return;
    }
    if (b.dataset.skin) {
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        pr.settings.skin = b.dataset.skin;
      });
      applyLook(p().settings);
      draw();
      el.querySelector(`[data-skin="${b.dataset.skin}"]`).focus();
      return;
    }
    const sg = b.closest("[data-seg]");
    if (sg) {
      const name = sg.dataset.seg;
      const v = b.dataset.value;
      if (name === "rest") {
        customRest = v === "custom";
        if (customRest) {
          draw();
          el.querySelector('[data-f="restCustom"]').focus();
          return;
        }
      }
      updateProfile((pr) => {
        pr.settings = pr.settings || {};
        if (name === "sex") pr.sex = v;
        else if (name === "units") pr.units = v;
        else if (name === "rest") pr.settings.restSec = Number(v);
        else if (name === "theme") pr.settings.theme = v;
      });
      if (name === "theme") applyLook(p().settings);
      draw();
      return;
    }
    if (b.hasAttribute("data-export")) {
      const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `home-protocol-backup-${todayIso()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else if (b.hasAttribute("data-reset")) {
      if (await confirmDialog({ title: "Reset everything?", message: "This deletes your profile and every logged day. Export a backup first if you might want them back.", confirm: "Delete everything", danger: true })) {
        await resetAll();
        applyAnimStyle({});
        location.hash = "#/setup";
      }
    } else if (b.hasAttribute("data-reset-days")) {
      if (await confirmDialog({ title: "Reset workout history?", message: "This deletes every logged day: sets, notes, skips, body weight and extra activity. Your profile, settings, equipment and add-ons stay. Export a backup first if you might want the logs back.", confirm: "Delete history", danger: true })) {
        try {
          await resetDays();
          toast("Workout history reset");
        } catch {
          toast("Couldn't reach the server, so nothing was deleted.", { icon: "info" });
        }
      }
    }
  });

  // The floating switchers can change the theme or the style while this page is open.
  function onLook() {
    const cur = currentSkin();
    el.querySelectorAll(".skin-card[data-skin]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.skin === cur.id)));
    if (!!el.querySelector('[data-seg="theme"]') !== cur.modes.length > 1) draw();
    else fillAnimThumbs();
  }
  function onAnim() {
    const cur = currentAnimStyle();
    el.querySelectorAll("[data-anim-style]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.animStyle === cur)));
  }
  window.addEventListener("hp:look", onLook);
  window.addEventListener("hp:anim", onAnim);

  // Is an exercise that takes styles in today's session, where Today will show it
  // beside the list?
  function styledToday() {
    const today = todayIso();
    const def = dayDef(sessionKeyFor(today));
    const wide = detailMode() !== "inline" && !window.matchMedia("(max-width: 1180px)").matches;
    return wide && !!def && def.blocks.some((bl) => blockItems(bl, levelFor(today)).some((it) => hasAnimStyles(it.ex)));
  }

  // A still of the preview exercise on each style's card (in this theme's colours). A
  // newer pick wins over stills still being drawn for the last one.
  function fillAnimThumbs() {
    if (!preview) return;
    const ex = previewEx;
    el.querySelectorAll("img[data-anim-thumb]").forEach((img) => {
      thumbnail(ex, img.dataset.animThumb).then((url) => {
        if (ex !== previewEx) return;
        img.src = url;
        img.hidden = false;
      });
    });
  }

  function draw() {
    equipmentEditor?.destroy();
    coachControls?.dispose();
    drawPage();
    coachControls = createCoachControls();
    el.querySelector("[data-coach-settings]").appendChild(coachControls.el);
    equipmentEditor = createEquipmentEditor(el.querySelector("[data-equipment-editor]"), { profile: p, save: updateProfile });
    const lc = el.querySelector("[data-level-check-host]");
    if (lc) mountLevelCheck(lc, { showStepDown: true, onChange: (type) => type === "level" && draw() });
    el.querySelector("[data-anim-preview]").replaceWith(previewEl);
    if (preview) fillAnimThumbs();
    else {
      previewObserver.disconnect();
      previewObserver.observe(el.querySelector("[data-anim-settings]"));
    }
  }

  draw();
  refreshVersion();
  return {
    destroy() {
      equipmentEditor?.destroy();
      coachControls?.dispose();
      disposed = true;
      previewObserver.disconnect();
      window.removeEventListener("hp:look", onLook);
      window.removeEventListener("hp:anim", onAnim);
      preview?.dispose();
    },
  };
}
