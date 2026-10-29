// First-run setup: who you are (for heart-rate zones and starting loads),
// your training level, units, equipment names and links, start date and add-ons.

import { ADDONS } from "../data/addons/index.js";
import { EQUIPMENT } from "../data/program.js";
import { EXERCISES } from "../data/exercises.js";
import { setProfile, state } from "../store.js";
import { LEVELS, SEXES, bpmRange, defaultProfile, fmtLoad, hrMax } from "../personalize.js";
import { esc, todayIso } from "../util.js";
import { icon } from "../components/icons.js";
import { levelPickerHtml } from "../components/level-picker.js";
import { createStagePanel } from "../components/stage-panel.js";
import { createEquipmentEditor } from "../components/equipment-editor.js";
import { seg } from "../components/ui.js";
import { applyLook, skinById, skinPickerHtml } from "../themes.js";
import { LANGUAGES, normaliseLanguage, setLanguage, t } from "../i18n.js";
import { voicesForLanguage } from "../voice/script.js";

const STEPS = ["Language", "Welcome", "Theme", "About you", "Your level", "Equipment", "Add-ons", "Ready"];
const LB = 2.20462;
// Accessories with an example animation, in the order they're shown.
const GEAR = [...EQUIPMENT.have, ...EQUIPMENT.add].filter((g) => g.ex);

function gearUse(g) {
  const ex = EXERCISES[g.ex];
  return `${icon(g.icon)}<span><b>${esc(g.i)}</b> <span class="muted">${esc(g.d)}</span><br><span class="muted">${t("Example, {exercise}:", { exercise: esc(ex ? ex.name : g.ex) })}</span> ${esc(g.use)}</span>`;
}

export function render(el, params) {
  const redo = params.includes("redo");
  const draft = redo && state.profile ? structuredClone(state.profile) : defaultProfile();
  draft.settings = draft.settings || {};
  if (!redo) {
    // Keep whatever look this browser already shows (e.g. after "Reset everything").
    draft.settings.skin = document.documentElement.dataset.skin || "original";
    try {
      draft.settings.theme = JSON.parse(localStorage.getItem("hp:theme")) || "system";
    } catch {}
  }
  let step = redo && params.includes("equipment") ? 5 : 0;
  let equipmentEditor = null;
  let saved = false;
  let error = "";
  let gear = 0;
  let stage = null;

  const imperial = () => draft.units === "imperial";
  const wShow = (kg) => (kg == null ? "" : imperial() ? Math.round(kg * LB) : kg);
  const hShow = (cm) => (cm == null ? "" : imperial() ? Math.round(cm / 2.54) : cm);

  function stepBody() {
    if (step === 0) {
      const current = draft.settings.language || "en";
      return `<p class="muted">${t("Choose the language for the app, the exercise instructions and the coach. You can change it later in Settings.")}</p>
        <div class="choice-grid languages">${LANGUAGES.map((l) => `<button type="button" class="choice" data-language="${l.id}" data-i18n-skip aria-pressed="${l.id === current}"><b>${esc(l.native)}</b></button>`).join("")}</div>
        <p class="muted" style="font-size:0.86rem">${t("Arabic, Persian, Urdu and Hebrew also switch the layout to right to left.")}</p>`;
    }
    if (step === 1) {
      return `<p>Plan and track six home workouts a week based on Bryan Johnson's public exercise protocol. You'll do strength training three days a week, plus short intervals, the Norwegian 4×4, Zone 2, balance and mobility. The workouts use bodyweight, adjustable dumbbells, a pull-up bar and bands.</p>
        <div class="preview">
          <p>${icon("info")} This app is unofficial and isn't affiliated with or endorsed by Bryan Johnson or Blueprint. It provides a training plan, not medical advice.</p>
          <p>${icon("download")} ${state.mode === "server" ? t("Your details and workouts save in the <code>{dir}/</code> folder on this computer.", { dir: esc(state.dataDir) }) : t("Your details and workouts are saved in this browser because the local server isn't running. Run <code>npm start</code> to save them as files.")}</p>
        </div>
        <label class="field"><span>${t("Your name (optional)")}</span><input class="input" data-f="name" value="${esc(draft.name)}" placeholder="${esc(t("Your first name"))}" autocomplete="given-name"></label>`;
    }
    if (step === 2) {
      const sk = skinById(draft.settings.skin);
      return `<p class="muted">Choose a theme to try its layout, fonts and colours. The screenshots show different animation styles; choose yours later in Settings. You can change either choice any time.</p>
        ${skinPickerHtml(sk.id)}
        <div class="field"><span>Light or dark</span>${sk.modes.length > 1 ? seg("mode", [{ id: "system", name: "Follow the system" }, { id: "light", name: "Light mode" }, { id: "dark", name: "Dark mode" }], draft.settings.theme || "system") : `<small>${esc(sk.name)} is always dark.</small>`}</div>`;
    }
    if (step === 3) {
      return `<p class="muted">These details set your heart-rate zones and suggested starting weights. They stay on this computer.</p>
        <div class="field"><span>Units</span>${seg("units", [{ id: "metric", name: "Metric (kg, cm)" }, { id: "imperial", name: "Imperial (lb, in)" }], draft.units, "accent")}</div>
        <div class="grid-form">
          <label class="field"><span>Age</span><input class="input" data-f="age" inputmode="numeric" value="${esc(draft.age)}"></label>
          <label class="field"><span>Weight (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="weight" inputmode="decimal" value="${esc(wShow(draft.weightKg))}"></label>
          <label class="field"><span>Height (${imperial() ? "in" : "cm"}, optional)</span><input class="input" data-f="height" inputmode="decimal" value="${esc(hShow(draft.heightCm))}"></label>
        </div>
        <div class="field"><span>Sex <small>(only used to scale starting weights)</small></span>${seg("sex", SEXES, draft.sex)}</div>`;
    }
    if (step === 4) {
      const ex = (lo, hi) => fmtLoad(draft, lo, hi);
      return `<div class="field"><span>Where are you starting from?</span>${levelPickerHtml(draft.level)}</div>
        <div class="grid-form">
          <label class="field"><span>Measured max heart rate (optional)</span><input class="input" data-f="hrmax" inputmode="numeric" value="${esc(draft.hrMax ?? "")}" placeholder="${hrMax({ age: draft.age })} (estimated)"><small>Leave empty to estimate from age.</small></label>
          <label class="field"><span>Start date</span><input class="input" type="date" data-f="start" value="${esc(draft.startDate)}"></label>
        </div>
        <div class="preview"><b>Your starting targets</b><dl>
          <dt>Max heart rate</dt><dd>${hrMax(draft)} bpm</dd>
          <dt>Zone 2</dt><dd>${bpmRange(draft, 60, 70)}</dd>
          <dt>4×4 hard minutes</dt><dd>${bpmRange(draft, 85, 95)}</dd>
          <dt>Goblet squat</dt><dd>${ex(10, 14)}</dd>
          <dt>Dumbbell row</dt><dd>${ex(14, 16)}</dd>
          <dt>Overhead press</dt><dd>2 × ${ex(6, 8)}</dd>
        </dl><small class="muted">These starting weights use your level, weight, sex and age. Adjust them so you can finish with good form and the number of reps left that your level recommends.</small></div>`;
    }
    if (step === 5) {
      return `<p class="muted">Add your equipment names and product links, or skip this step and do it later in Settings. The animations show how the plan uses each accessory.</p>
        <div class="gear-demo card"><div class="stage-host"></div><p class="gear-use">${gearUse(GEAR[gear])}</p></div>
        <div class="gear-grid">${GEAR.map(
          (x, i) => `<button type="button" class="choice gear" data-gear="${i}" aria-pressed="${i === gear}">${icon(x.icon)}<b>${esc(x.i)}</b></button>`
        ).join("")}</div>
        <div data-equipment-editor></div>
        <p class="muted" style="font-size:0.88rem">If you don't have an item, see the easier exercises and equipment swaps in <i>The plan</i>. Massage devices are optional and aren't part of the prescribed exercises.</p>
        <label class="field" style="max-width:320px"><span>Heaviest dumbbell you have (${imperial() ? "lb" : "kg"})</span><input class="input" data-f="maxdb" inputmode="decimal" value="${esc(wShow(draft.maxDumbbellKg))}"><small>Suggested weights are capped at this.</small></label>`;
    }
    if (step === 6) {
      return `<p class="muted">Choose any extra blocks you want after your workout. You can log them like the main session and change your choices in Settings.</p>
        ${ADDONS.map(
          (a) => `<label class="addon-card">${icon(a.icon || "sparkle")}<span style="display:grid;gap:4px"><b>${esc(a.name)}</b><small class="muted">${esc(a.description)}</small></span><span class="switch"><input type="checkbox" data-addon="${esc(a.id)}" ${draft.addons && draft.addons[a.id] ? "checked" : ""} aria-label="${esc(a.name)}"><span></span></span></label>`
        ).join("")}
        <p class="muted" style="font-size:0.85rem">The README explains how to add more blocks.</p>`;
    }
    const lvl = LEVELS.find((l) => l.id === draft.level);
    return `<div class="preview"><dl>
        ${draft.name ? `<dt>Name</dt><dd>${esc(draft.name)}</dd>` : ""}
        <dt>${t("Age, weight")}</dt><dd>${esc(draft.age)} · ${esc(wShow(draft.weightKg))} ${imperial() ? "lb" : "kg"}</dd>
        <dt>${t("Level")}</dt><dd>${esc(lvl ? lvl.name : "")}</dd>
        <dt>${t("Theme")}</dt><dd>${esc(skinById(draft.settings.skin).name)}</dd>
        <dt>${t("Starts")}</dt><dd>${esc(draft.startDate)}</dd>
        <dt>Zone 2</dt><dd>${bpmRange(draft, 60, 70)}</dd>
        <dt>${t("Add-ons")}</dt><dd>${esc(ADDONS.filter((a) => draft.addons && draft.addons[a.id]).map((a) => a.name).join(", ") || t("None"))}</dd>
      </dl></div>
      <p>Your week: Mon, strength; Tue, short intervals and Zone 2; Wed, strength and mobility; Thu, Norwegian 4×4 and stability; Fri, power and strength; Sat, controlled vigorous cardio, Zone 2 and a long stretch; Sun, rest.</p>
      <p>Open an exercise for its animation, instructions and videos, including Bryan's demonstrations at the relevant timestamp.</p>`;
  }

  function draw() {
    equipmentEditor?.destroy();
    equipmentEditor = null;
    if (stage) stage.dispose();
    stage = null;
    el.innerHTML = `<div class="setup"><div class="card setup-card">
      <div class="setup-head">
        <div class="steps">${STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
        <span class="eyebrow">${t("Step {step} of {total} · {name}", { step: step + 1, total: STEPS.length, name: esc(t(STEPS[step])) })}</span>
        <h1>${step === 1 ? "Home Protocol" : esc(t(STEPS[step]))}</h1>
      </div>
      <div class="setup-body">${stepBody()}${error ? `<p style="color:var(--danger)">${esc(error)}</p>` : ""}</div>
      <div class="setup-foot">
        ${step > 0 ? `<button type="button" class="btn" data-back>${icon("chevronL")} ${t("Go back")}</button>` : redo ? `<a class="btn" href="#/settings">${t("Cancel")}</a>` : "<span></span>"}
        ${step === 5 ? `<button type="button" class="btn ghost" data-skip-equipment>${t("Skip for now")}</button>` : ""}
        <button type="button" class="btn primary" data-next>${step === STEPS.length - 1 ? `${icon("check")} ${redo ? t("Save") : t("Start training")}` : `${t("Next")} ${icon("chevronR")}`}</button>
      </div>
    </div></div>`;
    const editorHost = el.querySelector("[data-equipment-editor]");
    if (editorHost) equipmentEditor = createEquipmentEditor(editorHost, { profile: () => draft, save: (fn) => fn(draft) });
    const host = el.querySelector(".gear-demo .stage-host");
    if (host) {
      stage = createStagePanel(host);
      stage.load(GEAR[gear].ex);
    }
  }

  function validate() {
    if (step === 5) {
      const invalid = [...el.querySelectorAll("[data-equipment-id]")].filter((row) => row.querySelector('[data-equipment-field="owned"]').checked).map((row) => row.querySelector("input:invalid")).find(Boolean);
      if (invalid) { invalid.reportValidity(); return t("Please check the equipment name or product link."); }
    }
    if (step === 3) {
      const age = Number(draft.age);
      if (!(age >= 14 && age <= 99)) return t("Please enter an age between 14 and 99.");
      if (!(draft.weightKg >= 30 && draft.weightKg <= 250)) return t("Please enter your weight.");
    }
    return "";
  }

  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.value;
    const n = Number(String(v).replace(",", "."));
    if (f === "name") draft.name = v;
    else if (f === "age") draft.age = Math.round(n) || "";
    else if (f === "weight") draft.weightKg = Number.isFinite(n) && v !== "" ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
    else if (f === "height") draft.heightCm = Number.isFinite(n) && v !== "" ? Math.round(imperial() ? n * 2.54 : n) : null;
    else if (f === "maxdb") draft.maxDumbbellKg = Number.isFinite(n) && v !== "" ? Math.round((imperial() ? n / LB : n) * 10) / 10 : null;
    else if (f === "hrmax") draft.hrMax = Number.isFinite(n) && n > 100 ? Math.round(n) : null;
    else if (f === "start") draft.startDate = v || todayIso();
    if (step === 4 && f !== "start") {
      // Refresh the preview numbers without losing focus.
      const preview = el.querySelector(".preview");
      const tmp = document.createElement("div");
      tmp.innerHTML = stepBody();
      const fresh = tmp.querySelector(".preview");
      if (preview && fresh) preview.replaceWith(fresh);
    }
  });

  el.addEventListener("change", (e) => {
    if (e.target.dataset.addon) {
      draft.addons = draft.addons || {};
      draft.addons[e.target.dataset.addon] = e.target.checked;
    }
  });

  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.language) {
      const id = normaliseLanguage(b.dataset.language);
      draft.settings.language = id;
      draft.settings.coachVoice = voicesForLanguage(id)[0]?.id;
      await setLanguage(id, { silent: true });
      draw();
      el.querySelector(`[data-language="${id}"]`)?.focus();
      return;
    }
    if (b.dataset.skin) {
      draft.settings.skin = b.dataset.skin;
      applyLook(draft.settings);
      draw();
      el.querySelector(`[data-skin="${b.dataset.skin}"]`).focus();
      return;
    }
    const segEl = b.closest("[data-seg]");
    if (segEl) {
      const name = segEl.dataset.seg;
      const v = b.dataset.value;
      if (name === "mode") {
        draft.settings.theme = v;
        applyLook(draft.settings);
      } else if (name === "units") draft.units = v;
      else if (name === "sex") draft.sex = v;
      draw();
      return;
    }
    if (b.dataset.level) {
      draft.level = b.dataset.level;
      draw();
      return;
    }
    if (b.dataset.gear) {
      gear = Number(b.dataset.gear);
      el.querySelectorAll("[data-gear]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      el.querySelector(".gear-use").innerHTML = gearUse(GEAR[gear]);
      if (stage) stage.load(GEAR[gear].ex);
      return;
    }
    if (b.hasAttribute("data-back")) {
      step = Math.max(0, step - 1);
      error = "";
      draw();
      return;
    }
    if (b.hasAttribute("data-skip-equipment")) {
      draft.equipment = redo ? structuredClone(state.profile.equipment || []) : [];
      step += 1;
      error = "";
      draw();
      return;
    }
    if (b.hasAttribute("data-next")) {
      error = validate();
      if (error) return draw();
      if (step < STEPS.length - 1) {
        step += 1;
        draw();
        return;
      }
      draft.updatedAt = new Date().toISOString();
      saved = true;
      setProfile(draft);
      applyLook(draft.settings);
      location.hash = redo ? "#/settings" : "#/today";
    }
  });

  draw();
  return {
    destroy() {
      equipmentEditor?.destroy();
      if (stage) stage.dispose();
      // Leaving a re-run of setup without saving puts the saved look back.
      if (redo && !saved && state.profile) {
        applyLook(state.profile.settings);
        setLanguage(state.profile.settings?.language || "en", { silent: true });
      }
    },
  };
}
