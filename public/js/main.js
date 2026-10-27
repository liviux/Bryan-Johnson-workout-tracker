// App shell: boots the store, draws navigation, routes #/view/param to views,
// and shows the save status. First run (no profile yet) goes to the setup wizard.

import * as store from "./store.js";
import { icon } from "./components/icons.js";
import { esc } from "./util.js";
import { applyLook } from "./themes.js";
import { applyAnimStyle } from "./anim-styles.js";
import { restoreSkinBar } from "./components/skin-bar.js";
import { restoreAnimBar } from "./components/anim-bar.js";
import { openChangelogDialog } from "./components/changelog.js";
import { onLanguage, setLanguage, t, watchTranslations } from "./i18n.js";

const VIEWS = {
  today: () => import("./views/today.js"),
  day: () => import("./views/today.js"),
  activity: () => import("./views/activity.js"),
  library: () => import("./views/library.js"),
  plan: () => import("./views/plan.js"),
  settings: () => import("./views/settings.js"),
  setup: () => import("./views/setup.js"),
};

const NAV = [
  ["today", "Today", "today"],
  ["activity", "Activity", "progress"],
  ["library", "Exercises", "library"],
  ["plan", "The plan", "plan"],
  ["settings", "Settings", "settings"],
];
const TABS = [
  ["today", "Today", "today"],
  ["activity", "Activity", "progress"],
  ["library", "Exercises", "library"],
  ["plan", "Plan", "plan"],
  ["settings", "Settings", "settings"],
];

const viewEl = document.getElementById("view");
let current = null;
let token = 0;
let lastRoute = "today";

function drawNav(route) {
  const active = route === "day" ? "today" : route;
  document.getElementById("nav").innerHTML = NAV.map(
    ([id, label, ic]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span></a>`
  ).join("");
  document.getElementById("tabbar").innerHTML = TABS.map(
    ([id, label, ic]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span></a>`
  ).join("");
  const setup = route === "setup";
  document.querySelector(".sidebar").hidden = setup;
  document.querySelector(".topbar").hidden = setup;
  document.getElementById("tabbar").hidden = setup;
  document.getElementById("app").style.gridTemplateColumns = setup ? "minmax(0,1fr)" : "";
}

function drawShell() {
  const brand = t("Home Protocol");
  const tagline = t("Inspired by Bryan Johnson");
  document.title = t("Home Protocol · workout tracker");
  document.querySelectorAll(".brand-text b, .brand.small b").forEach((el) => { el.textContent = brand; });
  document.querySelectorAll(".brand-text small").forEach((el) => { el.textContent = tagline; });
  document.querySelector(".sidebar")?.setAttribute("aria-label", t("Main"));
  document.querySelector(".tabbar")?.setAttribute("aria-label", t("Main"));
}

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (["week", "history", "progress", "benchmarks"].includes(parts[0])) {
    history.replaceState(null, "", "#/activity/" + parts.map(encodeURIComponent).join("/"));
    return { route: "activity", params: parts };
  }
  return { route: VIEWS[parts[0]] ? parts[0] : "today", params: parts.slice(1) };
}

async function route() {
  const my = ++token;
  let { route: name, params } = parseHash();
  if (!store.state.profile && name !== "setup") {
    location.replace("#/setup");
    return;
  }
  if (store.state.profile && name === "setup" && !params.includes("redo")) {
    location.replace("#/today");
    return;
  }
  const mod = await VIEWS[name]();
  if (my !== token) return;
  if (current && current.destroy) current.destroy();
  // Themes can style a page by its route; Today sets the session's "venue" itself.
  document.documentElement.dataset.route = name;
  delete document.documentElement.dataset.venue;
  drawNav(name);
  drawShell();
  // A fresh container per view, so event listeners never outlive their view.
  viewEl.innerHTML = "";
  const host = document.createElement("div");
  viewEl.appendChild(host);
  current = mod.render(host, params) || null;
  viewEl.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function drawStatus(s) {
  const local = store.state.mode === "local";
  const text = {
    idle: local ? t("Saved in this browser") : t("All changes saved"),
    pending: t("Saving…"),
    saving: t("Saving…"),
    saved: local ? t("Saved in this browser") : t("All changes saved"),
    offline: t("Can't reach the server. Retrying…"),
  }[s];
  for (const id of ["save-status", "save-status-top"]) {
    const el = document.getElementById(id);
    el.dataset.s = s;
    el.innerHTML = `<span class="dot"></span><span>${esc(text)}</span>`;
    el.title = local ? t("Saved only in this browser. Run npm start to save as files on this computer.") : t("Saved to {dir}/ on this computer", { dir: store.state.dataDir });
  }
}

window.addEventListener("beforeunload", (e) => {
  if (store.hasUnsaved() && store.state.saveStatus === "offline") {
    e.preventDefault();
    e.returnValue = "";
  }
});

function drawVersion() {
  const el = document.getElementById("sidebar-version");
  if (!el) return;
  const v = store.state.version;
  el.textContent = v ? `v${v}` : "";
  el.hidden = !v;
  el.title = v ? t("Version {version} · Latest changes", { version: v }) : t("Latest changes");
}

document.getElementById("sidebar-version")?.addEventListener("click", () => {
  openChangelogDialog();
});

drawVersion();
await store.init();
drawVersion();
if (store.state.profile) await setLanguage(store.state.profile.settings?.language || "en", { silent: true });
watchTranslations();
// The profile on disk decides the look (this browser may have an older copy in localStorage).
if (store.state.profile) applyLook(store.state.profile.settings);
if (store.state.profile) applyAnimStyle(store.state.profile.settings);
restoreSkinBar();
restoreAnimBar();
store.onStatus(drawStatus);
window.addEventListener("hashchange", route);
onLanguage(() => {
  drawNav(lastRoute);
  drawShell();
  drawStatus(store.state.saveStatus);
  drawVersion();
  route();
});
route();
