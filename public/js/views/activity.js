// One navigation destination for the schedule, logged days and training trends.
import * as week from "./week.js";
import * as history from "./history.js";
import * as progress from "./progress.js";
import * as benchmarks from "./benchmarks.js";
import { icon } from "../components/icons.js";
import { esc } from "../util.js";
import { t } from "../i18n.js";

const TABS = [
  { id: "week", name: "This week", icon: "week", view: week },
  { id: "history", name: "History", icon: "history", view: history },
  { id: "progress", name: "Progress", icon: "progress", view: progress },
  { id: "benchmarks", name: "Benchmarks", icon: "heart", view: benchmarks },
];

export function render(el, params) {
  const tab = TABS.find((tabDef) => tabDef.id === params[0]) || TABS[0];
  el.innerHTML = `<div class="page activity-page">
    <header class="activity-head"><h1>${esc(t("Activity"))}</h1>
      <nav class="activity-tabs" aria-label="${esc(t("Activity views"))}">${TABS.map((tabDef) => `<a href="#/activity/${tabDef.id}"${tabDef === tab ? ' aria-current="page"' : ""}>${icon(tabDef.icon, "sm")} ${esc(t(tabDef.name))}</a>`).join("")}</nav>
    </header>
    <div data-activity-view></div>
  </div>`;
  return tab.view.render(el.querySelector("[data-activity-view]"), params.slice(1));
}
