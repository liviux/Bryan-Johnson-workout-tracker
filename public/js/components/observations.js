// Notes & observations for one day: effort, energy, notes, extra activity, body
// weight and the level check. Shared by Today and the end of a guided workout.

import { state } from "../store.js";
import { EXTRA_TYPES, editDay } from "../plan.js";
import { fmtWeight, kgUnit } from "../personalize.js";
import { esc, uid } from "../util.js";
import { icon } from "./icons.js";
import { confirmDialog } from "./ui.js";
import { mountLevelCheck } from "./level-check.js";
import { t } from "../i18n.js";

const ENERGY = ["Very low", "Low", "OK", "Good", "Great"];

export function mountObservations(host, date, { levelCheck = false, compact = false } = {}) {
  const log = () => state.days[date] || null;
  const profile = () => state.profile;

  function html() {
    const l = log() || {};
    const u = kgUnit(profile());
    const rpe = Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" aria-pressed="${l.rpe === i + 1}">${i + 1}</button>`).join("");
    const energy = ENERGY.map((e, i) => `<button type="button" data-energy="${i + 1}" aria-pressed="${l.energy === i + 1}">${esc(e)}</button>`).join("");
    const extras = (l.extras || [])
      .map(
        (x) => `<div class="extra-row" data-extra="${esc(x.id)}">
          <select class="input" data-x="type" aria-label="${esc(t("Activity"))}">${EXTRA_TYPES.map((t) => `<option value="${t.id}" ${x.type === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
          <input class="input num" data-x="min" inputmode="numeric" placeholder="${esc(t("min"))}" value="${esc(x.min ?? "")}" aria-label="${esc(t("Minutes"))}">
          <input class="input num" data-x="avg" inputmode="numeric" placeholder="bpm" value="${esc(x.avg ?? "")}" aria-label="${esc(t("Average heart rate"))}">
          <select class="input" data-x="intensity" aria-label="${esc(t("Intensity"))}"><option value="zone2" ${x.intensity !== "hard" && x.intensity !== "light" ? "selected" : ""}>${t("Easy / Zone 2")}</option><option value="hard" ${x.intensity === "hard" ? "selected" : ""}>${t("Hard effort")}</option><option value="light" ${x.intensity === "light" ? "selected" : ""}>${t("Light effort")}</option></select>
          <button type="button" class="btn sm icon-only ghost" data-x-del aria-label="${esc(t("Remove activity"))}">${icon("trash", "sm")}</button>
        </div>`
      )
      .join("");
    return `<section class="card card-pad obs">
      <div class="section-title"><h2>${t("Notes & observations")}</h2><span class="eyebrow">${t("saved automatically")}</span></div>
      <div class="obs-ratings">
        <div class="rating-line"><span class="label" title="${esc(t("1 = very easy, 10 = maximum"))}">${t("Session effort")} <small>(1–10)</small></span><div class="scale" role="group" aria-label="${esc(t("Session effort, 1 very easy to 10 maximum"))}">${rpe}</div></div>
        <div class="rating-line"><span class="label">${t("Energy today")}</span><div class="seg" role="group" aria-label="${esc(t("Energy today"))}">${energy}</div></div>
      </div>
      <label class="field"><span>${t("Notes")}</span><textarea class="input" data-notes rows="3" placeholder="${esc(t("How did the workout feel? Note soreness or anything to change next time."))}">${esc(l.notes || "")}</textarea></label>
      <div class="obs-row">
        <div class="field obs-extras"><span>${t("Extra activity")} <small>· ${t("counts toward your weekly minutes")}</small></span>
          <div class="extras">${extras}</div>
          <div><button type="button" class="btn sm" data-x-add>${icon("plus", "sm")} ${t("Add activity")}</button></div>
        </div>
        <label class="field obs-weight"><span>${t("Body weight today (optional, {unit})", { unit: esc(u) })}</span><input class="input num" data-bw inputmode="decimal" value="${l.bodyWeightKg != null ? esc(u === "lb" ? Math.round(l.bodyWeightKg * 2.20462 * 10) / 10 : l.bodyWeightKg) : ""}" placeholder="${esc(fmtWeight(profile(), profile() && profile().weightKg).replace(/ (kg|lb)$/, ""))}"></label>
      </div>
      ${levelCheck ? '<div class="level-check-host" data-level-check-host></div>' : ""}
    </section>`;
  }

  function render() {
    host.innerHTML = html();
    const lcHost = host.querySelector("[data-level-check-host]");
    if (lcHost) mountLevelCheck(lcHost, { compact, showStepDown: false });
  }

  host.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.rpe) {
      editDay(date, (d) => {
        d.rpe = d.rpe === Number(b.dataset.rpe) ? null : Number(b.dataset.rpe);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().rpe === Number(x.dataset.rpe))));
    } else if (b.dataset.energy) {
      editDay(date, (d) => {
        d.energy = d.energy === Number(b.dataset.energy) ? null : Number(b.dataset.energy);
      });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(log().energy === Number(x.dataset.energy))));
    } else if (b.hasAttribute("data-x-add")) {
      editDay(date, (d) => {
        d.extras = d.extras || [];
        d.extras.push({ id: uid(), type: "desk", min: null, avg: null, intensity: "zone2" });
      });
      render();
    } else if (b.hasAttribute("data-x-del")) {
      const id = b.closest("[data-extra]").dataset.extra;
      if (await confirmDialog({ title: t("Remove activity?"), message: t("This removes the activity from this day."), confirm: t("Remove"), danger: true })) {
        editDay(date, (d) => {
          d.extras = (d.extras || []).filter((x) => x.id !== id);
        });
        render();
      }
    }
  });

  host.addEventListener("change", (e) => {
    const target = e.target;
    if (target.matches("[data-x]") && target.tagName === "SELECT") {
      const id = target.closest("[data-extra]").dataset.extra;
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[target.dataset.x] = target.value;
      });
    }
  });

  host.addEventListener("input", (e) => {
    const target = e.target;
    if (target.matches("[data-notes]")) editDay(date, (d) => (d.notes = target.value), { delay: 900 });
    else if (target.matches("[data-bw]")) {
      const v = Number(String(target.value).replace(",", "."));
      const kg = target.value === "" || !Number.isFinite(v) ? null : kgUnit(profile()) === "lb" ? Math.round((v / 2.20462) * 10) / 10 : v;
      editDay(date, (d) => (d.bodyWeightKg = kg), { delay: 900 });
    } else if (target.matches("[data-x]") && target.tagName === "INPUT") {
      const id = target.closest("[data-extra]").dataset.extra;
      const v = target.value === "" ? null : Number(target.value);
      editDay(date, (d) => {
        const x = d.extras.find((y) => y.id === id);
        if (x) x[target.dataset.x] = Number.isFinite(v) ? v : null;
      });
    }
  });

  render();
}
