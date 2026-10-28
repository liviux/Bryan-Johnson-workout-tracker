// Modals, bottom sheets, toasts and confirm dialogs.

import { esc, h } from "../util.js";
import { icon } from "./icons.js";
import { t } from "../i18n.js";

const root = () => document.getElementById("overlay-root");
const isPhone = () => window.matchMedia("(max-width: 900px)").matches;

// Opens a dialog. `content` is an HTML string or element; returns { el, close }.
// Uses a bottom sheet on phones unless { sheet: false }.
export function openDialog({ title, content, sheet = isPhone(), wide = false, hideTitle = false, onClose } = {}) {
  const last = document.activeElement;
  const overlay = h(`<div class="overlay${sheet ? " sheet-overlay" : ""}" role="presentation"></div>`);
  const box = h(
    `<div class="${sheet ? "sheet" : "modal"}${hideTitle ? " no-title" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title || t("Dialog"))}"${wide ? ' style="width:min(860px,100%)"' : ""}>
      ${sheet ? '<div class="grab"></div>' : ""}
      <div class="modal-head"><h2${hideTitle ? ' class="sr-only"' : ""}>${esc(title || "")}</h2><button type="button" class="btn ghost icon-only" data-close aria-label="${esc(t("Close dialog"))}">${icon("x")}</button></div>
      <div class="modal-body"></div>
    </div>`
  );
  const body = box.querySelector(".modal-body");
  if (typeof content === "string") body.innerHTML = content;
  else if (content) body.appendChild(content);
  overlay.appendChild(box);
  root().appendChild(overlay);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
    if (last && last.focus) last.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  box.querySelector("[data-close]").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  const focusable = box.querySelector("input, select, textarea, button:not([data-close])");
  (focusable || box.querySelector("[data-close]")).focus();
  return { el: box, body, close };
}

export function toast(message, { icon: ic = "check", ms = 2600 } = {}) {
  const t = h(`<div class="toast">${icon(ic)}<span>${esc(message)}</span></div>`);
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export function confirmDialog({ title, message, confirm = t("Confirm"), danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const d = openDialog({
      title,
      sheet: false,
      content: `<p>${esc(message)}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" data-no>${t("Cancel")}</button><button class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(confirm)}</button></div>`,
      onClose: () => !answered && resolve(false),
    });
    d.el.querySelector("[data-no]").addEventListener("click", () => d.close());
    d.el.querySelector("[data-yes]").addEventListener("click", () => {
      answered = true;
      resolve(true);
      d.close();
    });
  });
}

// Segmented control HTML. options: [{ id, name }]
export function seg(name, options, value, cls = "") {
  return `<div class="seg ${cls}" role="group" data-seg="${esc(name)}">${options
    .map((o) => `<button type="button" data-value="${esc(o.id)}" aria-pressed="${String(o.id) === String(value)}">${esc(t(o.name))}</button>`)
    .join("")}</div>`;
}

export function switchHtml(name, checked, label = "", cls = "") {
  return `<label class="switch${cls ? ` ${esc(cls)}` : ""}"><input type="checkbox" data-switch="${esc(name)}" ${checked ? "checked" : ""} aria-label="${esc(t(label))}"><span></span></label>`;
}

export function ring(done, total, size = 64) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 0;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px"><svg class="ring" viewBox="0 0 64 64" style="width:${size}px;height:${size}px"><circle class="bg" cx="32" cy="32" r="${r}"/><circle class="fg" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg><b>${Math.round(p * 100)}%</b></div>`;
}
