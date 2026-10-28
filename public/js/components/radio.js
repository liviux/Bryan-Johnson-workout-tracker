// Workout radio for guided mode: pick a FIP station, play or pause it, change
// the volume and jump to the next or previous station. The player lives outside
// the exercise panel so it keeps playing from one movement to the next.

import { adjacentStation, DEFAULT_RADIO_STATION, DEFAULT_RADIO_VOLUME, RADIO_SOURCES, RADIO_STATIONS, radioStation } from "../data/radio.js";
import { state, updateProfile } from "../store.js";
import { clamp, esc, h } from "../util.js";
import { icon } from "./icons.js";
import { t } from "../i18n.js";
import { onVoice } from "../voice/player.js";

const TOPICS = [...new Set(RADIO_STATIONS.map((station) => station.mood))];

function savedRadio() {
  const saved = state.profile && state.profile.settings && state.profile.settings.radio;
  return saved && typeof saved === "object" ? saved : {};
}

function stationGroupsHtml() {
  const groups = TOPICS.map((mood) => [mood, RADIO_STATIONS.filter((station) => station.mood === mood)]).filter(([, stations]) => stations.length);
  return groups.map(([mood, stations]) => `<div class="radio-group">
    <span class="radio-group-label">${esc(mood)}</span>
    ${stations.map((station) => `<button type="button" class="radio-station" data-station-id="${esc(station.id)}" aria-pressed="false">
      <span><b>${esc(station.name)}</b><small>${esc(station.tag)}</small></span>
      ${icon("check", "sm")}
    </button>`).join("")}
  </div>`).join("");
}

function sourceLinksHtml() {
  return RADIO_SOURCES.map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)}</a>`).join(" · ");
}

export function createWorkoutRadio() {
  const saved = savedRadio();
  let station = radioStation(saved.station) || radioStation(DEFAULT_RADIO_STATION);
  const savedVolume = Number(saved.volume);
  let volume = clamp(Number.isFinite(savedVolume) ? savedVolume : DEFAULT_RADIO_VOLUME, 0, 1);
  let open = false;
  let intent = false;
  let muted = false;
  let attempt = 0;
  let sourceKey = "";
  let disposed = false;
  let ducked = false;

  const wrap = h(`<div class="workout-radio">
    <button type="button" class="btn sm ghost radio-toggle" data-radio="toggle" aria-expanded="false" aria-controls="workout-radio-panel" aria-label="${esc(t("Workout radio"))}">
      ${icon("radio")}<span class="radio-toggle-text">${t("Radio")}</span><span class="radio-eq" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>
    <div class="radio-panel" id="workout-radio-panel" data-radio="panel" role="group" aria-label="${esc(t("Workout radio"))}" hidden>
      <div class="radio-head">
        <div class="radio-now">
          <span class="radio-mark">${icon("radio")}</span>
          <span class="radio-now-copy"><b data-radio="name"></b><small data-radio="description"></small></span>
        </div>
        <button type="button" class="btn sm ghost icon-only" data-radio="close" aria-label="${esc(t("Close radio"))}">${icon("x", "sm")}</button>
      </div>
      <div class="radio-controls">
        <button type="button" class="btn sm ghost icon-only radio-mute" data-radio="mute" aria-label="${esc(t("Mute radio"))}" aria-pressed="false" title="${esc(t("Mute radio"))}">${icon("volume", "sm")}</button>
        <button type="button" class="btn sm icon-only" data-radio="prev" aria-label="${esc(t("Previous station"))}" title="${esc(t("Previous station"))}">${icon("chevronL")}</button>
        <button type="button" class="btn primary radio-play" data-radio="play" aria-label="${esc(t("Play radio"))}">${icon("play")}<span>${t("Play")}</span></button>
        <button type="button" class="btn sm icon-only" data-radio="next" aria-label="${esc(t("Next station"))}" title="${esc(t("Next station"))}">${icon("chevronR")}</button>
        <span class="radio-state" data-radio="status" role="status" aria-live="polite">${t("Paused")}</span>
      </div>
      <label class="radio-volume">
        ${icon("volume", "sm")}
        <span class="sr-only">${t("Radio volume")}</span>
        <input type="range" min="0" max="1" step="0.01" value="${volume}" aria-label="${esc(t("Radio volume"))}">
        <output data-radio="volume">${Math.round(volume * 100)}%</output>
      </label>
      <div class="radio-list" data-radio="stations">${stationGroupsHtml()}</div>
      <div class="radio-foot"><span>${t("Live streams need internet.")}</span><span class="radio-sources">${t("Stations:")} ${sourceLinksHtml()}</span></div>
    </div>
    <audio preload="none"></audio>
  </div>`);

  const toggle = wrap.querySelector('[data-radio="toggle"]');
  const panel = wrap.querySelector('[data-radio="panel"]');
  const nameEl = wrap.querySelector('[data-radio="name"]');
  const descEl = wrap.querySelector('[data-radio="description"]');
  const statusEl = wrap.querySelector('[data-radio="status"]');
  const playBtn = wrap.querySelector('[data-radio="play"]');
  const muteBtn = wrap.querySelector('[data-radio="mute"]');
  const volumeInput = wrap.querySelector(".radio-volume input");
  const volumeOut = wrap.querySelector('[data-radio="volume"]');
  const audio = wrap.querySelector("audio");
  function applyVolume() {
    const target = volume * (ducked ? 0.12 : 1);
    audio.volume = target;
    // iOS can lock media volume; silence music during speech on those devices.
    audio.muted = muted || (ducked && Math.abs(audio.volume - target) > 0.01);
  }
  applyVolume();
  const stopVoiceListener = onVoice(({ speaking }) => {
    ducked = speaking;
    applyVolume();
  });

  function setStatus(text, error = false) {
    statusEl.textContent = text;
    statusEl.dataset.error = error ? "true" : "false";
  }

  function syncMute() {
    muteBtn.innerHTML = icon(muted ? "mute" : "volume", "sm");
    muteBtn.setAttribute("aria-label", muted ? t("Unmute radio") : t("Mute radio"));
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.title = muted ? t("Unmute radio") : t("Mute radio");
    muteBtn.classList.toggle("is-muted", muted);
  }

  function toggleMute() {
    muted = !muted;
    applyVolume();
    syncMute();
    if (muted) setStatus(intent ? t("Muted") : t("Paused"));
    else if (intent && !audio.paused) setStatus(audio.readyState >= 3 ? t("Live") : t("Connecting…"));
    else setStatus(t("Paused"));
  }

  function syncPlayButton() {
    const playing = intent && !audio.paused;
    playBtn.innerHTML = playing ? `${icon("pause")}<span>${t("Pause")}</span>` : `${icon("play")}<span>${t("Play")}</span>`;
    playBtn.setAttribute("aria-label", playing ? t("Pause radio") : t("Play radio"));
    wrap.classList.toggle("is-playing", playing);
    toggle.setAttribute("aria-label", playing ? t("Workout radio, playing {station}", { station: station.name }) : t("Workout radio"));
  }

  function syncStation() {
    nameEl.textContent = station.name;
    descEl.textContent = station.description;
    for (const button of wrap.querySelectorAll("[data-station-id]")) {
      button.setAttribute("aria-pressed", button.dataset.stationId === station.id ? "true" : "false");
    }
  }

  function remember() {
    if (!state.profile) return;
    updateProfile((profile) => {
      profile.settings = profile.settings || {};
      const current = profile.settings.radio && typeof profile.settings.radio === "object" ? profile.settings.radio : {};
      profile.settings.radio = { ...current, station: station.id, volume };
    }, { silent: true });
  }

  function ensureSource() {
    const key = `${station.id}:${attempt}`;
    if (sourceKey === key) return;
    sourceKey = key;
    audio.src = attempt && station.fallback ? station.fallback : station.stream;
    audio.load();
  }

  function playRadio() {
    if (disposed) return;
    intent = true;
    ensureSource();
    syncPlayButton();
    if (!audio.paused) return;
    setStatus(t("Connecting…"));
    let started;
    try {
      started = audio.play();
    } catch {
      intent = false;
      syncPlayButton();
      setStatus(t("Press play to start."), true);
      return;
    }
    if (started && started.catch) {
      started.catch(() => {
        if (disposed || !intent || audio.error) return;
        intent = false;
        syncPlayButton();
        setStatus(t("Press play to start."), true);
      });
    }
  }

  function pauseRadio() {
    intent = false;
    audio.pause();
    syncPlayButton();
    setStatus(t("Paused"));
  }

  function selectStation(id) {
    const next = radioStation(id);
    if (!next) return;
    const changed = next.id !== station.id;
    station = next;
    attempt = 0;
    if (changed) {
      sourceKey = "";
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    syncStation();
    remember();
    playRadio();
  }

  function stepStation(step) {
    selectStation(adjacentStation(station.id, step).id);
  }

  function setOpen(value) {
    open = value;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    wrap.classList.toggle("is-open", open);
  }

  function close() {
    if (!open) return;
    setOpen(false);
    toggle.focus();
  }

  toggle.addEventListener("click", () => setOpen(!open));
  wrap.addEventListener("click", (event) => {
    const stationButton = event.target.closest("[data-station-id]");
    if (stationButton) {
      selectStation(stationButton.dataset.stationId);
      return;
    }
    const button = event.target.closest("[data-radio]");
    if (!button) return;
    const action = button.dataset.radio;
    if (action === "close") close();
    else if (action === "play") {
      if (intent && !audio.paused) pauseRadio();
      else playRadio();
    } else if (action === "prev") stepStation(-1);
    else if (action === "next") stepStation(1);
    else if (action === "mute") toggleMute();
  });

  volumeInput.addEventListener("input", () => {
    volume = clamp(Number(volumeInput.value), 0, 1);
    applyVolume();
    volumeOut.textContent = `${Math.round(volume * 100)}%`;
  });
  volumeInput.addEventListener("change", remember);

  audio.addEventListener("playing", () => {
    if (disposed) return;
    setStatus(muted ? t("Muted") : t("Live"));
    syncPlayButton();
  });
  audio.addEventListener("waiting", () => {
    if (disposed || !intent) return;
    setStatus(t("Buffering…"));
  });
  audio.addEventListener("pause", () => {
    if (disposed) return;
    syncPlayButton();
  });
  audio.addEventListener("error", () => {
    if (disposed || !intent || !audio.getAttribute("src")) return;
    if (!attempt && station.fallback) {
      attempt = 1;
      sourceKey = "";
      ensureSource();
      audio.play().catch(() => {});
      return;
    }
    intent = false;
    syncPlayButton();
    setStatus(t("Can't reach this station. Try another or check your connection."), true);
  });

  function onPointerDown(event) {
    if (open && !wrap.contains(event.target)) setOpen(false);
  }
  function onKey(event) {
    if (!open || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKey, true);

  syncStation();
  syncMute();
  syncPlayButton();

  return {
    el: wrap,
    close,
    isOpen: () => open,
    dispose() {
      disposed = true;
      stopVoiceListener();
      intent = false;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* playback is optional */
      }
      wrap.remove();
    },
  };
}
