import { EQUIPMENT_CATEGORIES, RECOMMENDED_EQUIPMENT, equipmentUrl } from "../data/equipment.js";
import { esc, uid } from "../util.js";
import { icon } from "./icons.js";
import { t } from "../i18n.js";

export function createEquipmentEditor(host, { profile, save }) {
  const inventory = () => Array.isArray(profile().equipment) ? profile().equipment : [];
  const recommendations = () => RECOMMENDED_EQUIPMENT.map((g) => ({ ...g, id: "recommended-" + g.type, owned: false, url: "" }));
  const rows = () => {
    const saved = inventory();
    return [...recommendations().map((g) => ({ ...g, ...saved.find((x) => x.id === g.id) })), ...saved.filter((g) => g && !recommendations().some((r) => r.id === g.id))];
  };
  const options = (values) => values.map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join("");

  function draw() {
    host.innerHTML = `<div class="equipment-editor">
      <p class="muted">${t("Your equipment list is optional. Tick what you own, then add a name and optional product link. You can add equivalent equipment below. These details stay in your inventory; exercise instructions use generic names.")}</p>
      ${EQUIPMENT_CATEGORIES.map((category) => `<details class="equipment-category" open><summary>${esc(t(category))}</summary><div class="equipment-grid">${rows().filter((g) => (EQUIPMENT_CATEGORIES.includes(g.category) ? g.category : "Other") === category).map((g) => `<article class="equipment-row" data-equipment-id="${esc(g.id)}">        <label class="equipment-owned"><input type="checkbox" data-equipment-field="owned" ${g.owned ? "checked" : ""}> <b>${esc(RECOMMENDED_EQUIPMENT.find((r) => r.type === g.type)?.name || t("Extra equipment"))}</b></label>
        ${g.description ? `<p class="muted">${esc(g.description)}</p>` : ""}
        <label class="field"><span>${t("Name")}</span><input class="input" data-equipment-field="name" value="${esc(g.name || "")}" maxlength="200" required></label>
        <label class="field"><span>${t("Product link (optional)")}</span><input class="input" type="url" data-equipment-field="url" value="${esc(g.url || "")}" placeholder="https://…" maxlength="2000"><small data-equipment-error role="status"></small></label>
        ${g.note ? `<small class="muted">${esc(g.note)}</small>` : ""}
        <div class="btn-row">${equipmentUrl(g.url) ? `<a class="btn sm" data-equipment-link href="${esc(equipmentUrl(g.url))}" target="_blank" rel="noopener noreferrer">${t("View product")}</a>` : '<span data-equipment-link></span>'}${g.id.startsWith("recommended-") ? "" : `<button type="button" class="btn ghost sm" data-remove-equipment>${icon("trash")} ${t("Remove")}</button>`}</div>
      </article>`).join("") || `<p class="muted">${t("Add your own equipment below.")}</p>`}</div></details>`).join("")}
      <form data-add-equipment class="card card-pad" style="display:grid;gap:12px">
        <h4>${t("Add equipment")}</h4>
        <label class="field"><span>${t("Category")}</span><select class="input" name="category">${options(EQUIPMENT_CATEGORIES.map((g) => [g, t(g)]))}</select></label>
        <label class="field"><span>${t("Name")}</span><input class="input" name="name" required maxlength="200" placeholder="${esc(t("Your equipment or equivalent"))}"></label>
        <label class="field"><span>${t("Product link (optional)")}</span><input class="input" type="url" name="url" maxlength="2000" placeholder="https://…"></label>
        <button class="btn" type="submit">${icon("plus")} ${t("Add equipment")}</button>
      </form>
    </div>`;
  }

  function edit(e) {
    const field = e.target.dataset.equipmentField;
    const row = e.target.closest("[data-equipment-id]");
    if (!field || !row) return;
    const value = field === "owned" ? e.target.checked : e.target.value;
    if (field === "url") {
      const url = equipmentUrl(value);
      const error = value.trim() && !url ? t("Use a full http:// or https:// product link.") : "";
      row.querySelector("[data-equipment-error]").textContent = error;
      e.target.setCustomValidity(error);
      const link = row.querySelector("[data-equipment-link]");
      link.outerHTML = url ? `<a class="btn sm" data-equipment-link href="${esc(url)}" target="_blank" rel="noopener noreferrer">${t("View product")}</a>` : '<span data-equipment-link></span>';
    }
    const entry = rows().find((g) => g.id === row.dataset.equipmentId);
    save((p) => {
      p.equipment = inventory().slice();
      const index = p.equipment.findIndex((g) => g.id === entry.id);
      const { id, type, category, name, url, owned, note } = entry;
      const updated = { id, type, category, name, url, owned, ...(note ? { note } : {}), [field]: value };
      if (index < 0) p.equipment.push(updated);
      else p.equipment[index] = updated;
    });
  }

  function click(e) {
    if (!e.target.closest("[data-remove-equipment]")) return;
    const id = e.target.closest("[data-equipment-id]").dataset.equipmentId;
    save((p) => { p.equipment = inventory().filter((g) => g.id !== id); });
    draw();
  }

  function submit(e) {
    if (!e.target.matches("[data-add-equipment]")) return;
    e.preventDefault();
    const data = new FormData(e.target);
    const name = String(data.get("name")).trim();
    const rawUrl = String(data.get("url")).trim();
    const url = equipmentUrl(rawUrl);
    if (!name || (rawUrl && !url)) {
      const input = e.target.elements[!name ? "name" : "url"];
      input.setCustomValidity(!name ? t("Enter an equipment name.") : t("Use a full http:// or https:// product link."));
      input.reportValidity();
      return;
    }
    const entry = { id: uid(), type: "other", category: String(data.get("category")), name, url, owned: true };
    save((p) => { p.equipment = [...inventory(), entry]; });
    draw();
    host.querySelector(`[data-equipment-id="${entry.id}"] input`).focus();
  }

  const input = (e) => { e.target.setCustomValidity?.(""); edit(e); };
  host.addEventListener("input", input);
  host.addEventListener("click", click);
  host.addEventListener("submit", submit);
  draw();
  return { destroy() {
    host.removeEventListener("input", input);
    host.removeEventListener("click", click);
    host.removeEventListener("submit", submit);
  } };
}
