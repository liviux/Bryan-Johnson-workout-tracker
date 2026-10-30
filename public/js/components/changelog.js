// Changelog dialog: renders recent release notes in a modal dialog
// with pagination and a direct link to GitHub's full changelog.

import { hasTranslation, t } from "../i18n.js";
import { openDialog, toast } from "./ui.js";
import { icon } from "./icons.js";
import { esc } from "../util.js";

export const REPO = "https://github.com/liviux/Bryan-Johnson-workout-website";
const PAGE_SIZE = 20;
const CATEGORY_SOURCES = {
  Added: "New features",
  Changed: "Improvements",
  Fixed: "Bug fixes",
  Removed: "Removed features",
};
const APP_LABELS = ["Turn coaching on", "Turn coaching off", "Download local voice", "Voice coach"];

function escapePattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Release notes arrive with **bold** labels and `code`. Translate the whole
// sentence first so the bold tags cannot break the lookup, then put the same
// labels and code spans back around their translated text.
function inlineHtml(source) {
  const plain = source.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
  if (!hasTranslation(plain)) {
    return esc(source).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  const labels = [...new Set([...APP_LABELS, ...[...source.matchAll(/\*\*(.+?)\*\*/g)].map((match) => match[1])])];
  let text = t(plain);
  for (const label of labels) {
    const translated = t(label);
    if (translated === label) continue;
    text = text.replace(new RegExp(escapePattern(label), "gi"), translated);
  }
  let html = esc(text);
  for (const label of labels) {
    const translated = esc(t(label));
    html = html.replace(translated, `<strong>${translated}</strong>`);
  }
  for (const match of source.matchAll(/`([^`]+)`/g)) {
    const translated = esc(t(match[1]));
    html = html.replace(translated, `<code>${translated}</code>`);
  }
  return html;
}

export function renderReleases(list) {
  return list.map((release) => {
    const [heading, ...lines] = release.trim().split("\n");
    const [, version, date] = heading.match(/^## \[(.+?)\] - (.+)$/) || [];
    const planChanged = lines.some((line) => /^- \*\*Plan change:\*\*/.test(line));
    const changes = lines.map((line) => {
      const category = line.match(/^### (.+)$/);
      const item = line.match(/^(\s*)- (.+)$/);
      if (category) {
        const source = CATEGORY_SOURCES[category[1]] || category[1];
        return `<h4>${esc(hasTranslation(source) ? t(source) : source)}</h4>`;
      }
      if (item) {
        const planChange = item[2].startsWith("**Plan change:**");
        return `<p class="release-bullet${item[1] ? " nested" : ""}${planChange ? " release-plan-change" : ""}">${inlineHtml(item[2])}</p>`;
      }
      return "";
    }).join("");
    return `<section class="release-entry"><h3><span>v${esc(version || "?")}${planChanged ? ` <span class="plan-change-badge">${esc(t("Plan changed"))}</span>` : ""}</span><small>${esc(date || "")}</small></h3>${changes}</section>`;
  }).join("");
}

export async function openChangelogDialog() {
  try {
    const res = await fetch("/api/changelog", { cache: "no-store" });
    if (!res.ok) throw new Error("Changelog unavailable");
    const releases = (await res.text()).split(/(?=^## \[)/m).filter((section) => section.startsWith("## ["));
    if (!releases.length) throw new Error("Changelog is empty");
    let shown = Math.min(PAGE_SIZE, releases.length);
    const content = `<div class="release-list">${renderReleases(releases.slice(0, shown))}</div>${shown < releases.length ? `<div class="btn-row changelog-more-row"><button type="button" class="btn sm" data-changelog-more>${esc(t("Read more"))}</button></div>` : ""}`;
    const d = openDialog({ title: t("Latest changes"), content, wide: true });
    d.el.querySelector(".modal-head").classList.add("changelog-head");
    d.el.querySelector("[data-close]").insertAdjacentHTML("beforebegin", `<a class="btn sm" href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">${esc(t("Full changelog"))} ${icon("external", "sm")}</a>`);
    d.el.querySelector(".changelog-head a").focus();
    d.el.scrollTop = 0;
    d.body.addEventListener("click", (ev) => {
      const moreBtn = ev.target.closest("[data-changelog-more]");
      if (!moreBtn) return;
      if (shown >= releases.length) return;
      const next = Math.min(shown + PAGE_SIZE, releases.length);
      const chunk = releases.slice(shown, next);
      const listEl = d.body.querySelector(".release-list");
      if (listEl && chunk.length) {
        listEl.insertAdjacentHTML("beforeend", renderReleases(chunk));
      }
      shown = next;
      if (shown >= releases.length) {
        const moreRow = moreBtn.closest(".changelog-more-row") || moreBtn;
        moreRow.remove();
      }
    });
    return d;
  } catch {
    toast(t("Couldn't load the changelog"), { icon: "info" });
  }
}
