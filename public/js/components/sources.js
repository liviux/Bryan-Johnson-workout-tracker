import { esc } from "../util.js";
import { locale, t } from "../i18n.js";

// ISO dates may contain only a year or month when the source is less precise.
export function newestFirst(items) {
  return [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function sourceDate(date) {
  if (!date) return t("Undated");
  if (date.length === 4) return date;
  const full = date.length === 7 ? date + "-01" : date;
  return new Intl.DateTimeFormat(locale(), { ...(date.length > 7 ? { day: "numeric" } : {}), month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(full + "T12:00:00Z"));
}

export function sourceListHtml(items) {
  return `<ul class="source-list">${newestFirst(items).map((s) => `<li>
    ${s.date ? `<time class="source-date" datetime="${esc(s.date)}">${esc(sourceDate(s.date))}</time>` : `<span class="source-date">${t("Undated")}</span>`}
    <div><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>${s.note ? `<p class="muted">${esc(s.note)}</p>` : ""}</div>
  </li>`).join("")}</ul>`;
}
