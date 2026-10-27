// The 3D exercise viewer: wraps anim/stage.js with play/pause, speed, camera
// buttons, clip switching and the cue line. The three.js engine is loaded on
// first use, so the rest of the app never waits for it.

import { esc } from "../util.js";
import { icon } from "./icons.js";
import { t } from "../i18n.js";

let enginePromise = null;
const loadEngine = () => (enginePromise ||= import("../anim/stage.js"));

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const SPEEDS = [0.5, 1, 1.5, 2];
// Height of the cue bar plus its margin, kept clear of the figure.
const CUE_SPACE = 64;

export function createStagePanel(container, { onClipChange } = {}) {
  container.classList.add("stage");
  container.innerHTML = `
    <div class="ctrls">
      <button type="button" class="btn sm icon-only" data-a="play" aria-label="${esc(t("Pause animation"))}">${icon("pause")}</button>
      <button type="button" class="btn sm mono" data-a="speed" aria-label="Animation speed">1×</button>
      <button type="button" class="btn sm icon-only" data-a="zoom-in" aria-label="${esc(t("Zoom in"))}">${icon("plus")}</button>
      <button type="button" class="btn sm icon-only" data-a="zoom-out" aria-label="${esc(t("Zoom out"))}">${icon("minus")}</button>
    </div>
    <div class="views" role="group" aria-label="Camera">
      <button type="button" class="btn sm" data-view="front">Front</button>
      <button type="button" class="btn sm" data-view="side">Side</button>
      <button type="button" class="btn sm" data-view="three">3/4</button>
    </div>
    <div class="cue"><span class="clip-nav"></span><span class="cue-text"><span class="ttl"></span><span class="txt">Loading 3D…</span></span></div>`;
  const cueEl = container.querySelector(".cue .txt");
  const titleEl = container.querySelector(".cue .ttl");
  const navEl = container.querySelector(".cue .clip-nav");
  const playBtn = container.querySelector('[data-a="play"]');
  const speedBtn = container.querySelector('[data-a="speed"]');
  let stage = null;
  let wanted = null;
  let speed = 1;
  let autoAdvance = true;
  let disposed = false;
  let curClipIndex = 0;
  let curClipCount = 0;
  let pendingManual = false;

  function syncAdvanceBtn() {
    const b = navEl.querySelector('[data-a="advance"]');
    if (!b) return;
    b.textContent = autoAdvance ? "Auto" : "Fixed";
    b.setAttribute("aria-pressed", String(autoAdvance));
    b.title = autoAdvance ? "Automatically switch movements" : "Keep this movement selected";
  }

  function onCue({ cue, title, clipIndex, clipCount }) {
    const changed = clipIndex !== curClipIndex || clipCount !== curClipCount;
    curClipIndex = clipIndex || 0;
    curClipCount = clipCount || 0;
    cueEl.textContent = cue || title || "";
    navEl.innerHTML =
      clipCount > 1
        ? `<button type="button" class="btn sm icon-only" data-clip="-1" aria-label="${esc(t("Previous movement"))}">${icon("chevronL", "sm")}</button><span class="mono" aria-label="${esc(t("Movement {current} of {total}", { current: clipIndex + 1, total: clipCount }))}">${clipIndex + 1}/${clipCount}</span><button type="button" class="btn sm icon-only" data-clip="1" aria-label="${esc(t("Next movement"))}">${icon("chevronR", "sm")}</button><button type="button" class="btn sm" data-a="advance" aria-pressed="${autoAdvance}" title="${esc(autoAdvance ? t("Automatically switch movements") : t("Keep this movement selected"))}">${autoAdvance ? t("Auto") : t("Fixed")}</button>`
        : "";
    titleEl.textContent = title || "";
    if (changed && onClipChange) {
      const manual = pendingManual;
      pendingManual = false;
      onClipChange({ clipIndex: curClipIndex, clipCount: curClipCount, title, manual });
    }
  }

  function fail(message) {
    container.querySelectorAll(".ctrls, .views, .cue").forEach((el) => (el.hidden = true));
    let box = container.querySelector(".no3d");
    if (!box) {
      box = document.createElement("div");
      box.className = "no3d";
      container.appendChild(box);
    }
    box.textContent = message;
  }

  if (!webglAvailable()) {
    fail("This browser can't display the 3D animation because WebGL is unavailable. Use the instructions and videos below.");
  } else {
    loadEngine()
      .then(({ Stage }) => {
        if (disposed) return;
        stage = new Stage(container, { onCue });
        stage.setInset(CUE_SPACE);
        stage.setSpeed(speed);
        stage.setAutoAdvance(autoAdvance);
        if (wanted) load(wanted);
      })
      .catch((err) => {
        console.error(err);
        fail("The animation couldn't load. Run npm install in the project folder, then reload this page.");
      });
  }

  function load(id) {
    wanted = id;
    curClipIndex = 0;
    curClipCount = 0;
    autoAdvance = true;
    if (!stage) return;
    stage.setAutoAdvance(true);
    container.querySelector(".no3d")?.remove();
    container.querySelectorAll(".ctrls, .views, .cue").forEach((el) => (el.hidden = false));
    const ok = stage.load(id);
    if (!ok) {
      cueEl.textContent = t("No animation available. Use the instructions and videos.");
      titleEl.textContent = "";
      navEl.innerHTML = "";
    }
    if (!stage.playing) stage.play();
    playBtn.innerHTML = icon("pause");
    playBtn.setAttribute("aria-label", t("Pause animation"));
  }

  function setAutoAdvance(enabled) {
    autoAdvance = !!enabled;
    if (stage) stage.setAutoAdvance(autoAdvance);
    syncAdvanceBtn();
  }

  function setClip(index) {
    setAutoAdvance(false);
    curClipIndex = index;
    if (!stage) return;
    pendingManual = true;
    stage.setClip(index);
    pendingManual = false;
  }

  container.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !stage) return;
    if (b.dataset.a === "play") {
      const playing = stage.toggle();
      b.innerHTML = icon(playing ? "pause" : "play");
      b.setAttribute("aria-label", playing ? t("Pause animation") : t("Play animation"));
    } else if (b.dataset.a === "speed") {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      stage.setSpeed(speed);
      b.textContent = `${speed}×`;
    } else if (b.dataset.a === "zoom-in") {
      stage.zoom(1.2);
    } else if (b.dataset.a === "zoom-out") {
      stage.zoom(1 / 1.2);
    } else if (b.dataset.a === "advance") {
      setAutoAdvance(!autoAdvance);
    } else if (b.dataset.view) {
      stage.userMoved = false;
      stage.setView(b.dataset.view);
    } else if (b.dataset.clip) {
      setAutoAdvance(false);
      pendingManual = true;
      stage.nextClip(Number(b.dataset.clip));
      pendingManual = false;
    }
  });

  return {
    load,
    setClip,
    setAutoAdvance,
    get clipIndex() {
      return stage ? stage.clipIndex : curClipIndex;
    },
    get autoAdvance() {
      return autoAdvance;
    },
    pause: () => stage && stage.pause(),
    play: () => stage && stage.play(),
    dispose() {
      disposed = true;
      if (stage) stage.dispose();
    },
  };
}
