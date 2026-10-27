// Calendar periods are separate from longer spans; every end date is inclusive.
import { localized } from "./i18n.js";
import { addDays, iso, todayIso, weekStart } from "./util.js";

export const PROGRESS_RANGES = localized([
  { id: "this-week", name: "This week", group: "Recent" },
  { id: "last-week", name: "Last week", group: "Recent" },
  { id: "this-month", name: "This month", group: "Recent" },
  { id: "last-month", name: "Last month", group: "Recent" },
  { id: "8w", name: "8 weeks", group: "Longer" },
  { id: "12w", name: "12 weeks", group: "Longer" },
  { id: "6m", name: "6 months", group: "Longer" },
  { id: "1y", name: "1 year", group: "Longer" },
  { id: "all", name: "Since beginning", group: "Longer" },
]);

export function progressBeginning(profile, days, today = todayIso()) {
  const dates = [profile?.startDate, ...Object.keys(days)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") && d <= today);
  return dates.sort()[0] || today;
}

function monthsBefore(today, months) {
  const [y, m, d] = today.split("-").map(Number);
  const first = new Date(y, m - 1 - months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return iso(new Date(first.getFullYear(), first.getMonth(), Math.min(d, lastDay)));
}

export function progressRange(id, profile, days, today = todayIso()) {
  const range = PROGRESS_RANGES.find((r) => r.id === id) || PROGRESS_RANGES.find((r) => r.id === "12w");
  const thisWeek = weekStart(today), thisMonth = today.slice(0, 7) + "-01";
  let start, end = today;
  if (range.id === "this-week") start = thisWeek;
  else if (range.id === "last-week") { start = addDays(thisWeek, -7); end = addDays(thisWeek, -1); }
  else if (range.id === "this-month") start = thisMonth;
  else if (range.id === "last-month") { end = addDays(thisMonth, -1); start = end.slice(0, 7) + "-01"; }
  else if (range.id === "8w" || range.id === "12w") start = addDays(thisWeek, -7 * (Number(range.id.slice(0, -1)) - 1));
  else if (range.id === "6m" || range.id === "1y") start = addDays(monthsBefore(today, range.id === "6m" ? 6 : 12), 1);
  else start = progressBeginning(profile, days, today);
  if (["8w", "12w", "6m", "1y", "all"].includes(range.id)) start = [start, progressBeginning(profile, days, today)].sort()[1];
  return { ...range, start, end };
}

export const inProgressRange = (date, range) => date >= range.start && date <= range.end;
