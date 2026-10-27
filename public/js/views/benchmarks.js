import { localized } from "../i18n.js";
// Blueprint Longevity Benchmarks: 8 zero-blood, at-home physical capability tests
// from Bryan Johnson's published testing battery and longevity fitness standards.

import { state, updateProfile } from "../store.js";
import { icon } from "../components/icons.js";
import { esc, fmtShort, todayIso } from "../util.js";
import { startHold } from "../components/timer.js";
import { toast } from "../components/ui.js";
import { t } from "../i18n.js";

export const BENCHMARKS = localized([
  {
    id: "pushups",
    name: "Strict Continuous Push-Ups",
    cat: "Upper body endurance",
    unit: "reps",
    bryan: "Bryan: 60+ strict continuous reps (chest to floor, zero top pauses). Harvard study: 40+ push-ups correlated with 96% lower cardiovascular events.",
    instructions: "Chest touches floor every rep; elbows reach full lockout; no resting in the plank or downward dog.",
    hasTimer: false,
    rate(val) {
      if (val >= 40) return { tier: "elite", label: "Elite (top 5% / 18yo standard)" };
      if (val >= 25) return { tier: "good", label: "Good (longevity zone)" };
      if (val >= 15) return { tier: "moderate", label: "Moderate" };
      return { tier: "developing", label: "Developing" };
    },
  },
  {
    id: "grip",
    name: "Handgrip Strength",
    cat: "Neuromuscular & muscle quality",
    unit: "kg",
    bryan: "Bryan tests ~60 kg (top 5% across all ages). Handgrip strength is a primary biological age biomarker in clinical longevity literature.",
    instructions: "Stand upright, arm at your side. Squeeze a handheld dynamometer with maximum isometric force for 3 seconds. Record your best hand.",
    hasTimer: false,
    rate(val) {
      if (val >= 55) return { tier: "elite", label: "Elite (top 5% biomarker)" };
      if (val >= 45) return { tier: "good", label: "Good (healthy muscle quality)" };
      if (val >= 35) return { tier: "moderate", label: "Moderate" };
      return { tier: "developing", label: "Developing" };
    },
  },
  {
    id: "deadhang",
    name: "Maximum Dead Hang",
    cat: "Spine decompression & grip endurance",
    unit: "seconds",
    bryan: "Unbroken passive or active hang from a pull-up bar. Longevity benchmark: 60 to 120 seconds.",
    instructions: "Grip the bar with two hands, feet off the floor. Breathe steadily and hold as long as possible until grip gives out.",
    hasTimer: true,
    timerSec: 120,
    rate(val) {
      if (val >= 90) return { tier: "elite", label: "Elite (90+ s endurance)" };
      if (val >= 60) return { tier: "good", label: "Good (60+ s longevity standard)" };
      if (val >= 30) return { tier: "moderate", label: "Moderate (30–60 s)" };
      return { tier: "developing", label: "Developing (<30 s)" };
    },
  },
  {
    id: "balance",
    name: "Eyes-Closed Single-Leg Balance",
    cat: "Cerebellar & brain neurological age",
    unit: "seconds",
    bryan: "Balance is one of Bryan's five exercise pillars. Balance decline closely mirrors cerebellar, vestibular and neurological brain aging.",
    instructions: "Stand on one leg next to a wall for safety. Place hands on hips, close eyes, and balance without letting the foot shift or touch down.",
    hasTimer: true,
    timerSec: 60,
    rate(val) {
      if (val >= 30) return { tier: "elite", label: "Elite (youthful brain score)" };
      if (val >= 15) return { tier: "good", label: "Good (longevity standard)" };
      if (val >= 10) return { tier: "moderate", label: "Baseline (10 s minimum)" };
      return { tier: "developing", label: "High fall risk (<10 s)" };
    },
  },
  {
    id: "sitrise",
    name: "Sit-and-Rise Test (SRT)",
    cat: "Functional mobility & fall prevention",
    unit: "score (0–10)",
    bryan: "From standing, sit cross-legged onto the floor and rise back up without using hands, knees or arms for support. Scored out of 10.",
    instructions: "Start standing. Cross legs and lower to the floor, then stand back up. Subtract 1 point for each hand, forearm, knee, or side of leg that touches the floor.",
    hasTimer: false,
    rate(val) {
      if (val >= 8) return { tier: "elite", label: "Lowest all-cause mortality (8–10 pts)" };
      if (val >= 6) return { tier: "good", label: "Good mobility (6–7.5 pts)" };
      return { tier: "developing", label: "Mobility focus needed (<6 pts)" };
    },
  },
  {
    id: "vo2max",
    name: "VO2 Max Estimate",
    cat: "Cardiorespiratory longevity",
    unit: "ml/kg/min",
    bryan: "Bryan tests at ~64 ml/kg/min (top 1% 18yo). Cardiovascular fitness is the single strongest statistical predictor of longevity.",
    instructions: "Log your estimate from your smartwatch, a lab test, or calculate it from a 12-minute Cooper Run/Walk test.",
    hasTimer: false,
    rate(val) {
      if (val >= 55) return { tier: "elite", label: "Elite (top 1% tier)" };
      if (val >= 45) return { tier: "good", label: "Excellent longevity zone" };
      if (val >= 35) return { tier: "moderate", label: "Healthy baseline" };
      return { tier: "developing", label: "Developing (<35 ml/kg/min)" };
    },
  },
  {
    id: "sitreach",
    name: "Sit & Reach Flexibility",
    cat: "Spine & arterial elasticity",
    unit: "cm",
    bryan: "Hamstring and posterior chain flexibility correlates with lower arterial stiffness in clinical longevity research.",
    instructions: "Sit on the floor, legs straight out in front. Reach smoothly forward along your shins toward your toes. Measure how many cm past toes you can reach (negative if short).",
    hasTimer: false,
    rate(val) {
      if (val >= 5) return { tier: "elite", label: "Youthful flexibility (+5 cm)" };
      if (val >= 0) return { tier: "good", label: "Toes reached (healthy standard)" };
      return { tier: "developing", label: "Tight posterior chain" };
    },
  },
  {
    id: "hrrecovery",
    name: "1-Minute Heart Rate Recovery Drop",
    cat: "Autonomic nervous system recovery",
    unit: "bpm drop",
    bryan: "Drop in heart rate exactly 60 seconds after finishing the Norwegian 4×4 or hard HIIT. Measures parasympathetic reactivation speed.",
    instructions: "At the end of your last interval, note your peak heart rate. Walk gently for 60 seconds and note your heart rate again. Enter the drop (peak minus 60s reading).",
    hasTimer: true,
    timerSec: 60,
    rate(val) {
      if (val >= 35) return { tier: "elite", label: "Elite parasympathetic recovery (35+ bpm)" };
      if (val >= 25) return { tier: "good", label: "Good recovery (25–34 bpm)" };
      if (val >= 15) return { tier: "moderate", label: "Moderate (15–24 bpm)" };
      return { tier: "developing", label: "Slow recovery (<15 bpm)" };
    },
  },
]);

export function getBenchmarkLogs() {
  const p = state.profile || {};
  return (p.benchmarks && p.benchmarks.logs) || [];
}

export function latestBenchmarkLog(testId) {
  const logs = getBenchmarkLogs().filter((l) => l.testId === testId);
  return logs.sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}

export function saveBenchmarkScore(testId, value, note = "") {
  updateProfile((p) => {
    p.benchmarks = p.benchmarks || { cadence: "monthly", logs: [] };
    p.benchmarks.logs = p.benchmarks.logs || [];
    p.benchmarks.logs.push({
      date: todayIso(),
      testId,
      value: Number(value),
      note: String(note).trim(),
    });
  });
}

export function render(el) {
  function draw() {
    const p = state.profile || {};
    const bm = p.benchmarks || { cadence: "monthly", logs: [] };
    const cadence = bm.cadence || "monthly";
    const logs = bm.logs || [];
    const latestDate = logs.length ? [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))[0].date : null;

    let dueNotice = "";
    if (!latestDate) {
      dueNotice = `<div class="banner hint"><span>${icon("info", "lg")}</span><div class="grow"><b>${t("Ready for your first longevity baseline?")}</b><span>${t("Test your physical benchmarks today to establish your biological fitness starting point.")}</span></div></div>`;
    }

    el.innerHTML = `<div class="page benchmarks-page" style="display:grid;gap:18px">
      <header class="benchmarks-head" style="display:grid;gap:8px">
        <h2 class="display" style="font-size:1.8rem">Longevity Benchmarks & Fitness Age</h2>
        <p class="muted">Bryan Johnson's zero-blood, at-home physical testing battery. Track your functional biomarkers against elite 18-year-old and longevity longevity percentiles.</p>
        <div class="cadence-picker" style="display:flex;align-items:center;gap:12px;margin-top:4px">
          <span class="muted" style="font-size:0.86rem">Testing cadence:</span>
          <div class="seg" data-bm-cadence>
            <button type="button" data-cadence="monthly" aria-pressed="${cadence === "monthly"}">${t("Monthly (every 30 days)")}</button>
            <button type="button" data-cadence="quarterly" aria-pressed="${cadence === "quarterly"}">${t("Quarterly (every 90 days)")}</button>
          </div>
        </div>
      </header>

      ${dueNotice}

      <div class="benchmark-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px">
        ${BENCHMARKS.map((b) => benchmarkCardHtml(b)).join("")}
      </div>
    </div>`;

    bindEvents();
  }

  function benchmarkCardHtml(b) {
    const last = latestBenchmarkLog(b.id);
    const rating = last ? b.rate(last.value) : null;
    const tierColor = rating ? (rating.tier === "elite" ? "var(--teal)" : rating.tier === "good" ? "var(--amber)" : "var(--muted)") : "var(--muted)";

    return `<section class="card block benchmark-card" data-bm-id="${esc(b.id)}" style="display:grid;gap:12px;padding:16px 18px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="display:grid;gap:2px">
          <span class="eyebrow">${esc(b.cat)}</span>
          <h3 style="font-size:1.15rem;margin:0">${esc(b.name)}</h3>
        </div>
        ${rating ? `<span class="chip" style="color:${tierColor};border-color:${tierColor};font-weight:600;font-size:0.75rem">${esc(t(rating.label))}</span>` : `<span class="chip muted" style="font-size:0.75rem">${t("Not tested")}</span>`}
      </div>

      <p class="muted" style="font-size:0.84rem;margin:0;line-height:1.4">${esc(b.bryan)}</p>

      <div class="benchmark-score-box" style="display:flex;align-items:baseline;justify-content:space-between;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px 14px">
        <span class="muted" style="font-size:0.84rem">Latest result:</span>
        <div style="display:flex;align-items:baseline;gap:6px">
          <b class="mono" style="font-size:1.4rem">${last ? last.value : "—"}</b>
          <small class="muted">${esc(b.unit)}</small>
          ${last ? `<small class="muted" style="font-size:0.75rem">(${esc(fmtShort(last.date))})</small>` : ""}
        </div>
      </div>

      <details style="font-size:0.84rem">
        <summary class="muted" style="cursor:pointer">How to perform the test</summary>
        <p style="margin-top:6px;line-height:1.4">${esc(b.instructions)}</p>
      </details>

      <form class="benchmark-log-form" data-bm-form="${esc(b.id)}">
        <label class="field"><span>${t("Score ({unit})", { unit: esc(b.unit) })}</span><input class="input" inputmode="decimal" data-bm-input="${esc(b.id)}" placeholder="${esc(t("Enter score"))}" required></label>
        ${b.hasTimer ? `<button type="button" class="btn sm ghost" data-bm-timer="${esc(b.id)}" data-sec="${b.timerSec}">${icon("timer", "sm")} ${t("Timer")}</button>` : ""}
        <button type="submit" class="btn sm primary">${icon("check", "sm")} ${t("Save")}</button>
      </form>
    </section>`;
  }

  function bindEvents() {
    el.querySelectorAll("[data-cadence]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cad = btn.dataset.cadence;
        updateProfile((p) => {
          p.benchmarks = p.benchmarks || { logs: [] };
          p.benchmarks.cadence = cad;
        });
        draw();
      });
    });

    el.querySelectorAll("[data-bm-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = form.dataset.bmForm;
        const input = form.querySelector(`[data-bm-input="${id}"]`);
        const val = Number(input.value);
        if (!Number.isFinite(val) || input.value.trim() === "") return;
        saveBenchmarkScore(id, val);
        toast("Benchmark score saved!");
        draw();
      });
    });

    el.querySelectorAll("[data-bm-timer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.bmTimer;
        const b = BENCHMARKS.find((x) => x.id === id);
        const sec = Number(btn.dataset.sec) || 60;
        startHold({
          title: b ? b.name : "Benchmark test",
          seconds: sec,
          onFinish: () => {
            const input = el.querySelector(`[data-bm-input="${id}"]`);
            if (input && !input.value) input.value = sec;
          },
        });
      });
    });
  }

  draw();
  return {
    destroy() {},
  };
}
