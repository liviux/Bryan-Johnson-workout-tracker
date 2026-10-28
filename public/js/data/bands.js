// The resistance-band set in the standard FitBeast 6-level kit: six tube
// strengths, each printed in its own colour. The logger offers these values and
// a custom entry for any other band.
import { localized } from "../i18n.js";

export const BAND_LEVELS = localized([
  { id: "yellow", name: "Yellow", color: "#e7c438", lb: [5, 15] },
  { id: "red", name: "Red", color: "#d94b45", lb: [15, 35] },
  { id: "black", name: "Black", color: "#2f3438", lb: [30, 60] },
  { id: "purple", name: "Purple", color: "#8155b3", lb: [40, 80] },
  { id: "green", name: "Green", color: "#4f9d5d", lb: [50, 125] },
  { id: "deepblue", name: "Deep blue", color: "#315a9b", lb: [80, 170] },
]);

const LB_PER_KG = 2.20462;
const one = (n) => Math.round(n * 10) / 10;

export function bandById(id) {
  return BAND_LEVELS.find((band) => band.id === id) || null;
}

export function bandResistance(band, units = "metric") {
  if (!band) return "";
  const [lo, hi] = band.lb;
  if (units === "imperial") return `${lo}–${hi} lb`;
  return `${one(lo / LB_PER_KG)}–${one(hi / LB_PER_KG)} kg`;
}

export function bandLabel(band, units = "metric") {
  return band ? `${band.name} · ${bandResistance(band, units)}` : "";
}

export function bandOptionsHtml(units = "metric", selected = "") {
  return BAND_LEVELS.map((band) => `<option value="${band.id}"${band.id === selected ? " selected" : ""}>${band.name} · ${bandResistance(band, units)}</option>`).join("");
}
