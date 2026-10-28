// Dependency-free SVG charts: columns and lines, single series, with a hover
// tooltip (columns: per bar; lines: crosshair) and an optional target line.
// Rendered at the container's real width so text stays crisp; redraws on resize.
// Colours come from CSS variables (--viz-*), validated for both themes.

import { esc } from "../util.js";
import { t } from "../i18n.js";

const H = 210; // plot height
const PAD = { top: 14, right: 16, bottom: 30, left: 40 };

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

function ticks(min, max, count = 4, integer = false) {
  let step = niceMax((max - min) / count);
  if (integer) step = Math.max(1, Math.round(step));
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

const fmtTick = (v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}K` : String(Math.round(v * 10) / 10));

function barPath(x, y, w, y0, r = 4) {
  const h = y0 - y;
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y0}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y0}Z`;
}

// spec: { type: "columns" | "line", data: [{ label, value, sub? } | { x: Date|number, value, label }],
//         target?, targetLabel?, fmt?(v) → string, yMin? }
export function mountChart(host, spec) {
  host.classList.add("chart");
  host.style.position = "relative";
  const fmt = spec.fmt || ((v) => String(v));

  function draw() {
    const W = Math.max(280, host.clientWidth || 600);
    const iw = W - PAD.left - PAD.right;
    const data = spec.data;
    const vals = data.map((d) => d.value).filter((v) => v != null);
    const hi = niceMax(Math.max(spec.target || 0, ...vals, 0) * 1.08 || 1);
    const lo = spec.yMin != null ? spec.yMin : spec.type === "line" && vals.length ? Math.max(0, Math.floor(Math.min(...vals) * 0.85)) : 0;
    const y = (v) => PAD.top + H - ((v - lo) / (hi - lo || 1)) * H;
    const y0 = PAD.top + H;
    let marks = "";
    let hits = "";
    let xLabels = "";

    if (spec.type === "columns") {
      const band = iw / Math.max(1, data.length);
      const bw = Math.min(24, band * 0.62);
      const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(iw / 70))));
      host._bars = [];
      data.forEach((d, i) => {
        const x = PAD.left + i * band + (band - bw) / 2;
        host._bars.push([x + bw / 2, y(d.value || 0)]);
        if (d.value) marks += `<path class="mark" data-i="${i}" d="${barPath(x, y(d.value), bw, y0)}" fill="var(--viz-1)"/>`;
        hits += `<rect class="hit" data-i="${i}" x="${PAD.left + i * band}" y="${PAD.top}" width="${band}" height="${H}" fill="transparent" tabindex="0" aria-label="${esc(`${d.label}: ${fmt(d.value || 0)}`)}"/>`;
        if (i % every === 0) xLabels += `<text x="${PAD.left + i * band + band / 2}" y="${y0 + 18}" text-anchor="middle">${esc(d.short || d.label)}</text>`;
      });
    } else {
      const xs = data.map((d) => +d.x);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const xp = (v) => PAD.left + (x1 === x0 ? iw / 2 : ((v - x0) / (x1 - x0)) * iw);
      const pts = data.map((d) => [xp(+d.x), y(d.value)]);
      if (pts.length > 1) marks += `<path d="M${pts.map((p) => p.join(",")).join("L")}" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach((p, i) => (marks += `<circle class="mark" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="var(--viz-1)" stroke="var(--viz-surface)" stroke-width="2"/>`));
      hits += `<rect class="hit-area" x="${PAD.left}" y="${PAD.top}" width="${iw}" height="${H}" fill="transparent"/>`;
      const labelIdx = data.length <= 2 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];
      for (const i of [...new Set(labelIdx)]) xLabels += `<text x="${pts[i][0]}" y="${y0 + 18}" text-anchor="${i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}">${esc(data[i].short || data[i].label)}</text>`;
      host._pts = pts;
    }

    const grid = ticks(lo, hi, 4, spec.integer)
      .map((t) => `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(t)}" y2="${y(t)}"/><text x="${PAD.left - 8}" y="${y(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`)
      .join("");
    const target =
      spec.target != null
        ? `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(spec.target)}" y2="${y(spec.target)}" stroke="var(--viz-target)" stroke-width="1.5"/><text x="${W - PAD.right}" y="${y(spec.target) - 6}" text-anchor="end" class="target-label">${esc(spec.targetLabel || "Target")}</text>`
        : "";
    host.innerHTML = `<svg width="${W}" height="${H + PAD.top + PAD.bottom}" viewBox="0 0 ${W} ${H + PAD.top + PAD.bottom}" role="img" aria-label="${esc(spec.title || "")}">
      <g class="grid axis">${grid}</g>
      <line class="baseline" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y0}" y2="${y0}"/>
      ${target}
      <g>${marks}</g>
      <g class="axis">${xLabels}</g>
      <line class="cross" x1="0" x2="0" y1="${PAD.top}" y2="${y0}" visible="false" style="display:none"/>
      <g>${hits}</g>
    </svg><div class="chart-tip" hidden></div>${vals.some((v) => v) ? "" : `<p class="muted" style="font-size:0.82rem;margin-top:4px">${t("Nothing logged in this range yet.")}</p>`}`;
    wire();
  }

  function showTip(i, px, py) {
    const d = spec.data[i];
    const tip = host.querySelector(".chart-tip");
    tip.innerHTML = `<b>${esc(fmt(d.value || 0))}</b><span><i class="key"></i>${esc(d.label)}${d.sub ? ` · ${esc(d.sub)}` : ""}</span>`;
    tip.hidden = false;
    const w = host.clientWidth;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(4, px - tw / 2), w - tw - 4)}px`;
    tip.style.top = `${Math.max(0, py - tip.offsetHeight - 10)}px`;
    host.querySelectorAll(".mark").forEach((m) => m.classList.toggle("on", Number(m.dataset.i) === i));
  }
  function hideTip() {
    const tip = host.querySelector(".chart-tip");
    if (tip) tip.hidden = true;
    host.querySelectorAll(".mark.on").forEach((m) => m.classList.remove("on"));
    const cross = host.querySelector(".cross");
    if (cross) cross.style.display = "none";
  }

  function wire() {
    const svg = host.querySelector("svg");
    if (spec.type === "columns") {
      svg.querySelectorAll(".hit").forEach((r) => {
        const i = Number(r.dataset.i);
        const show = () => showTip(i, host._bars[i][0], host._bars[i][1]);
        r.addEventListener("pointerenter", show);
        r.addEventListener("focus", show);
        r.addEventListener("pointerleave", hideTip);
        r.addEventListener("blur", hideTip);
      });
    } else {
      const area = svg.querySelector(".hit-area");
      const cross = svg.querySelector(".cross");
      const move = (e) => {
        const pt = svg.getBoundingClientRect();
        const px = e.clientX - pt.left;
        let best = 0;
        host._pts.forEach((p, i) => {
          if (Math.abs(p[0] - px) < Math.abs(host._pts[best][0] - px)) best = i;
        });
        const [cx, cy] = host._pts[best];
        cross.setAttribute("x1", cx);
        cross.setAttribute("x2", cx);
        cross.style.display = "";
        showTip(best, cx, cy);
      };
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerleave", hideTip);
    }
  }

  draw();
  // Redraw only when the width really changes (avoids resize feedback loops).
  let lastW = host.clientWidth;
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (Math.abs(host.clientWidth - lastW) > 2) {
            lastW = host.clientWidth;
            draw();
          }
        })
      : null;
  if (ro) ro.observe(host);
  return {
    destroy() {
      if (ro) ro.disconnect();
    },
  };
}

// Accessible twin of a chart: the same data as a table.
export function tableHtml(spec, headers) {
  const fmt = spec.fmt || ((v) => String(v));
  return `<div class="table-wrap"><table><thead><tr><th>${esc(headers[0])}</th><th class="num">${esc(headers[1])}</th></tr></thead><tbody>${spec.data
    .map((d) => `<tr><td>${esc(d.label)}${d.sub ? ` <span class="muted">· ${esc(d.sub)}</span>` : ""}</td><td class="num">${esc(fmt(d.value || 0))}</td></tr>`)
    .join("")}</tbody></table></div>`;
}
