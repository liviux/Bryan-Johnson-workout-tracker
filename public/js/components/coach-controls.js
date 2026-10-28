import { state, updateProfile } from "../store.js";
import { esc, h } from "../util.js";
import { icon } from "./icons.js";
import { voicesForLanguage } from "../voice/script.js";
import { PREPARING_VOICE, cacheVoice, cancelVoice, installVoice, onVoice, playVoice, prepareVoice, refreshVoiceStatus, selectedVoice, setVoiceEnabled, unlockVoice, voiceCacheMessage, voiceEnabled, voiceStatus } from "../voice/player.js";
import { language, t } from "../i18n.js";

export function createCoachControls({ popup = false, onChange = () => {} } = {}) {
  const el = h(`<div class="workout-coach${popup ? " coach-popup" : ""}">
    ${popup ? `<button type="button" class="btn sm ghost coach-toggle" aria-expanded="false" aria-controls="workout-coach-panel">${icon("volume", "sm")}<span>${t("Coach")}</span></button>` : ""}
    <div class="coach-panel${popup ? " radio-panel" : ""}" ${popup ? 'id="workout-coach-panel" hidden' : ""} role="group" aria-label="${esc(t("Voice coach"))}">
      <div class="radio-head"><div><h3>${t("Voice coach")}</h3><small class="muted">${t("Spoken guidance for your workout")}</small></div>${popup ? `<button type="button" class="btn sm ghost icon-only" data-coach="close" aria-label="${esc(t("Close coach"))}">${icon("x", "sm")}</button>` : ""}</div>
      <p class="coach-status muted" role="status" aria-live="polite"></p>
      <p class="coach-cache muted" role="status" aria-live="polite"></p>
      <progress data-coach="progress" max="1" value="0" aria-label="${esc(t("Voice cache preparation"))}" hidden style="width:100%"></progress>
      <small class="muted coach-progress-text" data-coach="progress-text" hidden></small>
      <button type="button" class="btn" data-coach="cache" hidden>${icon("download", "sm")} ${t("Download voice")}</button>
      <div class="btn-row"><button type="button" class="btn primary" data-coach="enable"></button><button type="button" class="btn" data-coach="preview">${icon("play", "sm")} ${t("Preview")}</button></div>
      <button type="button" class="btn" data-coach="install">${t("Download local voice")}</button>
      <small class="muted" data-coach="download-info">${t("The app includes recordings for every voice. Download the selected voice once to save it for playback; a speech model is only needed if the shared recordings are missing.")}</small>
      <div class="coach-voices" aria-label="${esc(t("Coach voice"))}">${voicesForLanguage(language()).map((v) => `<button type="button" class="choice" data-coach-voice="${v.id}" aria-pressed="false"><b data-i18n-skip>${esc(v.name)}</b><small>${esc(t(v.detail))}</small></button>`).join("")}</div>
      <div class="coach-options">
        <label class="field"><span>${t("Coaching")}</span><select class="input" data-coach-option="coachDetail"><option value="coach">${t("Cues and form tips during rest")}</option><option value="cues">${t("Essential cues only")}</option></select></label>
        <label class="field"><span>${t("Pace")}</span><select class="input" data-coach-option="coachPace"><option value="steady">${t("Steady")}</option><option value="brisk">${t("Brisk")}</option></select></label>
      </div>
      <p class="muted coach-note">${t("The coach reads today's dose, set numbers and timer cues. Personal weights and heart-rate targets stay on screen. Form tips fit into rests; you count your own reps. Radio gets quieter while the coach speaks.")}</p>
      <button type="button" class="btn" data-coach="unlock" hidden>${t("Tap to enable audio")}</button>
    </div>
  </div>`);
  const panel = el.querySelector(".coach-panel");
  const toggle = el.querySelector(".coach-toggle");
  let disposed = false;
  let poll = null;
  let previewToken = 0;
  function setOpen(value) { if (!popup) return; panel.hidden = !value; toggle.setAttribute("aria-expanded", String(value)); }
  function sync(status) {
    if (disposed) return;
    const enabled = voiceEnabled();
    el.querySelector(".coach-status").textContent = status.preparing ? PREPARING_VOICE : status.message;
    el.querySelector(".coach-cache").textContent = voiceCacheMessage();
    const progress = el.querySelector('[data-coach="progress"]');
    const progressText = el.querySelector('[data-coach="progress-text"]');
    const cache = status.cache;
    const building = cache?.state === "building";
    const cacheReady = status.cacheEnabled && cache?.state === "ready";
    const installing = !!status.installing;
    progress.hidden = !building && !installing;
    if (building) {
      progress.max = cache?.total || 1;
      progress.value = cache?.completed || 0;
    } else {
      progress.removeAttribute("value");
    }
    progressText.hidden = !building && !installing;
    progressText.textContent = building ? (cache?.total ? t("{done} of {total} clips ready", { done: cache.completed || 0, total: cache.total }) : t("Preparing the voice…")) : installing ? t("Downloading the local speech runtime…") : "";
    const cacheButton = el.querySelector('[data-coach="cache"]');
    cacheButton.hidden = !status.known || !status.installed || installing || building || cacheReady;
    cacheButton.disabled = installing;
    cacheButton.innerHTML = `${icon("download", "sm")} ${t("Download locally")}`;
    const button = el.querySelector('[data-coach="enable"]');
    button.textContent = enabled ? t("Turn coaching off") : t("Turn coaching on");
    button.setAttribute("aria-pressed", String(enabled));
    button.disabled = !status.installed || status.installing || !cacheReady;
    toggle?.classList.toggle("is-on", enabled && status.installed);
    toggle?.setAttribute("aria-busy", String(status.preparing));
    toggle?.setAttribute("aria-label", t("Voice coach, {state}", { state: enabled && status.installed ? t("on") : t("off") }));
    const install = el.querySelector('[data-coach="install"]');
    install.hidden = !status.known || (status.installed && !status.installing && !status.error);
    install.disabled = status.installing;
    install.textContent = status.installing ? t("Downloading…") : status.error ? t("Reinstall local voice") : t("Download local voice");
    el.querySelector('[data-coach="download-info"]').hidden = !status.known || (status.installed && (cacheReady || building));
    el.querySelector('[data-coach="preview"]').disabled = !status.installed || status.installing || !cacheReady;
    el.querySelector('[data-coach="unlock"]').hidden = !status.blocked;
    for (const v of el.querySelectorAll("[data-coach-voice]")) v.setAttribute("aria-pressed", String(v.dataset.coachVoice === selectedVoice().id));
    for (const input of el.querySelectorAll("[data-coach-option]")) input.value = state.profile?.settings?.[input.dataset.coachOption] || (input.dataset.coachOption === "coachDetail" ? "coach" : "steady");
    clearTimeout(poll);
    if (status.installing || building) poll = setTimeout(() => refreshVoiceStatus(), 2000);
  }
  const unsubscribe = onVoice(sync);
  refreshVoiceStatus().then(() => {
    if (disposed) return;
    onChange();
  });
  toggle?.addEventListener("click", () => setOpen(panel.hidden));
  el.addEventListener("click", async (event) => {
    const voice = event.target.closest("[data-coach-voice]");
    if (voice) {
      cancelVoice(); previewToken += 1;
      updateProfile((p) => { p.settings ||= {}; p.settings.coachVoice = voice.dataset.coachVoice; }, { silent: true });
      cacheVoice({ activate: true });
      sync(voiceStatus); onChange();
      return;
    }
    const action = event.target.closest("[data-coach]")?.dataset.coach;
    if (action === "close") { setOpen(false); toggle?.focus(); }
    if (action === "unlock") { await unlockVoice(); onChange(); }
    if (action === "enable") { setVoiceEnabled(!voiceEnabled()); onChange(); }
    if (action === "cache") cacheVoice({ activate: true });
    if (action === "install") {
      try { await installVoice(); } catch (err) { el.querySelector(".coach-status").textContent = err.message; }
    }
    if (action === "preview") {
      unlockVoice(); cancelVoice();
      const token = ++previewToken;
      const button = el.querySelector('[data-coach="preview"]');
      button.disabled = true;
      el.querySelector(".coach-status").textContent = t("Preparing the preview…");
      try {
        const manifest = await prepareVoice({ preview: true });
        if (disposed || token !== previewToken) return;
        await playVoice(manifest.preview, { wait: true, preview: true, expires: Date.now() + 60000 });
      } catch (err) { voiceStatus.message = err.message; }
      finally { if (!disposed && token === previewToken) sync(voiceStatus); }
    }
  });
  el.addEventListener("change", (event) => {
    const key = event.target.dataset.coachOption;
    if (!key) return;
    // Read the value before cancelVoice() notifies sync(), which writes the
    // saved profile back into these selects.
    const value = event.target.value;
    previewToken += 1;
    updateProfile((p) => { p.settings ||= {}; p.settings[key] = value; }, { silent: true });
    cancelVoice();
    onChange();
  });
  const pointer = (event) => { if (popup && !el.contains(event.target)) setOpen(false); };
  const keydown = (event) => {
    if (popup && !panel.hidden && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.focus(); }
  };
  if (popup) { document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", keydown, true); }
  return { el, close: () => setOpen(false), dispose() {
    disposed = true; previewToken += 1; clearTimeout(poll); unsubscribe();
    document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", keydown, true);
    cancelVoice(); el.remove();
  } };
}
