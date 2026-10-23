// The 3D stage: renderer, lights, floor, camera and the clip player.
//
//   const stage = new Stage(element, { onCue });
//   stage.load("gobletsquat");      // plays the exercise's clips in a loop
//   stage.setView("side"); stage.setSpeed(0.5); stage.pause();
//
// Clips are defined in ./clips/*.js (see clips/README in the project README).
// The figure is the mannequin, or for the exercises that take animation styles
// (js/anim-styles.js) the chosen style's figure from ./styles/. A style can also
// change the scene around it: lights, tone mapping, floor colours (its `look`).
// Flat styles (SVG, 2D canvas, text) bring their own element instead of a 3D group:
// the stage lays it over the canvas, keeps working out the pose and the camera, and
// hands them the joints projected to the screen to draw (see styles/flat.js).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { computeJoints, lerpPose, makePose, mirrorPose } from "./rig.js";
import { createMannequin } from "./mannequin.js";
import { applyPalette, createBand, createDumbbell, createMaterials, createProp } from "./props.js";
import { getAnimation } from "./clips/index.js";
import { loadFigure } from "./styles/index.js";
import { animStyleFor } from "../anim-styles.js";

const EASE = {
  lin: (t) => t,
  inOut: (t) => t * t * t * (10 + t * (-15 + 6 * t)),
  in: (t) => 1 - Math.cos((Math.PI * t) / 2),
  out: (t) => Math.sin((Math.PI * t) / 2),
  hold: (t) => (t < 1 ? 0 : 1),
};

const VIEWS = {
  front: [0.32, 0.18, 1],
  side: [1, 0.16, 0.12],
  three: [0.78, 0.26, 0.74],
  back: [-0.35, 0.25, -1],
  left: [1, 0.16, 0.12],
  right: [-1, 0.16, 0.12],
  top: [0.3, 1.2, 0.6],
};

function isDark() {
  const root = document.documentElement;
  if (root.dataset.scheme) return root.dataset.scheme === "dark";
  const forced = root.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Themes may recolour the scene with CSS custom properties on <html> (hex colours):
// --stage-floor, --stage-grid, --stage-hl (highlighted muscles) and --stage-body.
function themeColor(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}

const themeColors = () => ({ body: themeColor("--stage-body"), hl: themeColor("--stage-hl") });

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function mirrorSpec(spec) {
  const pos = spec.pos ? [-spec.pos[0], spec.pos[1] || 0, spec.pos[2] || 0] : spec.pos;
  return { ...spec, pos, rotY: spec.rotY ? -spec.rotY : spec.rotY };
}

const swapSide = (s) => (typeof s === "string" ? s.replace(/L$/, "§").replace(/R$/, "L").replace(/§$/, "R") : Array.isArray(s) ? [-s[0], s[1], s[2]] : s);

// Turns an authored clip into absolute, full poses ready for sampling.
export function prepareClip(raw) {
  const keys = raw.keys.map((k) => ({ t: k.t, pose: makePose(k.p), cue: k.cue || "", e: k.e || "inOut" }));
  const first = keys[0];
  const last = keys[keys.length - 1];
  const same = JSON.stringify(first.pose) === JSON.stringify(last.pose);
  if (!same && raw.close !== false) keys.push({ t: last.t + (raw.closeTime ?? 0.8), pose: first.pose, cue: raw.closeCue || "", e: "inOut" });
  const half = keys[keys.length - 1].t;
  let all = keys;
  if (raw.alternate) {
    const second = keys.slice(1).map((k) => ({ ...k, t: k.t + half, pose: mirrorPose(k.pose), cue: k.cue }));
    all = keys.concat(second);
  }
  return {
    title: raw.title || "",
    keys: all,
    cyclic: JSON.stringify(all[0].pose) === JSON.stringify(all.at(-1).pose),
    duration: all[all.length - 1].t,
    half: raw.alternate ? half : null,
    loops: raw.loops ?? null,
    props: raw.props || [],
    hold: raw.hold || null,
    bands: raw.bands || [],
    camera: raw.camera || { view: "three" },
    highlight: raw.highlight || [],
    floorScroll: raw.floorScroll || 0,
    effects: raw.effects || [],
    thumb: raw.thumb ?? null,
  };
}

export function sampleClip(clip, time) {
  const tt = clip.duration > 0 ? (time >= 0 && time < clip.duration ? time : ((time % clip.duration) + clip.duration) % clip.duration) : 0;
  const keys = clip.keys;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= tt) i++;
  const a = keys[i];
  const b = keys[i + 1] || a;
  const span = b.t - a.t;
  const raw = span > 0 ? Math.min(1, Math.max(0, (tt - a.t) / span)) : 1;
  const alpha = (EASE[b.e] || EASE.inOut)(raw);
  let cue = a.cue;
  for (let j = i; !cue && j >= 0; j--) cue = keys[j].cue;
  const pose = b.e === "smooth" ? smoothPose(clip, i, raw) : lerpPose(a.pose, b.pose, alpha);
  let following;
  for (const side of ["L", "R"]) {
    const arm = "arm" + side;
    if (span <= 0.1 || b.e === "hold" || a.pose["hand" + side] || b.pose["hand" + side] || a.pose[arm].every((v, j) => v === b.pose[arm][j])) continue;
    // Free arms follow the body's movement by up to 45 ms, without moving planted contacts.
    const delayed = raw - Math.min(0.08, 0.045 / span) * Math.sin(Math.PI * raw) ** 2;
    following ||= b.e === "smooth" ? smoothPose(clip, i, delayed) : lerpPose(a.pose, b.pose, (EASE[b.e] || EASE.inOut)(delayed));
    pose[arm] = following[arm];
  }
  return { pose, cue, mirrored: clip.half != null && tt >= clip.half, phase: tt / clip.duration };
}

// Monotone cubic tangents keep continuous motion flowing without overshooting a contact.
function smoothPose(clip, i, t) {
  const keys = clip.keys, a = keys[i], b = keys[i + 1];
  const closed = clip.cyclic;
  const before = keys[i - 1] || (closed ? { ...keys.at(-2), t: keys.at(-2).t - clip.duration } : a);
  const after = keys[i + 2] || (closed ? { ...keys[1], t: keys[1].t + clip.duration } : b);
  const span = b.t - a.t;
  const tangent = (d0, d1, h0, h1) => d0 * d1 <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
  const blend = (v0, v1, vp, vn) => {
    if (v0 === v1) return v0;
    const d = (v1 - v0) / span;
    const hp = a.t - before.t, hn = after.t - b.t;
    const m0 = hp > 0 ? tangent((v0 - vp) / hp, d, hp, span) : 0;
    const m1 = hn > 0 ? tangent(d, (vn - v1) / hn, span, hn) : 0;
    return (2 * t ** 3 - 3 * t ** 2 + 1) * v0 + (t ** 3 - 2 * t ** 2 + t) * span * m0
      + (-2 * t ** 3 + 3 * t ** 2) * v1 + (t ** 3 - t ** 2) * span * m1;
  };
  const pose = lerpPose(a.pose, b.pose, t);
  for (const k of Object.keys(pose)) {
    const x = a.pose[k], y = b.pose[k], p = before.pose[k], n = after.pose[k];
    if (typeof x === "number" && typeof y === "number") pose[k] = blend(x, y, p ?? x, n ?? y);
    else if (Array.isArray(x) && Array.isArray(y)) pose[k] = x.map((v, j) => blend(v, y[j], p?.[j] ?? v, n?.[j] ?? y[j]));
  }
  return pose;
}

export class Stage {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = { interactive: true, preserve: false, autoplay: true, ...opts };
    this.onCue = opts.onCue || (() => {});
    this.speed = 1;
    this.time = 0;
    this.playing = this.opts.autoplay;
    this.clips = [];
    this.clipIndex = 0;
    this.clipLoops = 0;
    this.autoAdvance = true;
    this.userMoved = false;
    this.visible = true;
    this.dark = isDark();
    this.look = {};

    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: this.opts.preserve });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.className = "stage-canvas";
    container.appendChild(r.domElement);
    this.renderer = r;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    this.camTarget = new THREE.Vector3(0, 0.9, 0);
    this.camGoal = null;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.15);
    scene.add(this.hemi);
    const key = (this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2));
    key.position.set(2.2, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.4;
    key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 2.6;
    key.shadow.camera.bottom = -2.4;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = (this.rimLight = new THREE.DirectionalLight(0x9fc8ff, 0.7));
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);

    this.buildFloor();

    this.M = createMaterials(this.dark);
    this.man = createMannequin();
    this.man.setTheme(this.dark, themeColors());
    scene.add(this.man.group);
    // The figure on stage: the mannequin or an animation style's (loaded on first use).
    this.figure = this.man;
    this.styleId = "mannequin";
    this.figures = new Map([["mannequin", Promise.resolve(this.man)]]);
    this.loadedFigures = new Set([this.man]);

    this.dumbbells = { L: createDumbbell(this.M), R: createDumbbell(this.M), goblet: createDumbbell(this.M, 1.15), both: createDumbbell(this.M) };
    Object.values(this.dumbbells).forEach((d) => {
      d.visible = false;
      scene.add(d);
    });
    this.bandPool = Array.from({ length: 12 }, () => createBand(this.M));
    this.bandPool.forEach((b) => {
      b.mesh.visible = false;
      scene.add(b.mesh);
    });
    this.stringLine = createBand(this.M, true);
    this.stringLine.mesh.visible = false;
    scene.add(this.stringLine.mesh);

    this.propGroups = [new THREE.Group(), new THREE.Group()];
    this.propGroups.forEach((g) => scene.add(g));

    if (this.opts.interactive) {
      const c = new OrbitControls(this.camera, r.domElement);
      c.enableDamping = true;
      c.dampingFactor = 0.08;
      c.enablePan = false;
      c.enableZoom = false;
      c.minDistance = 1.4;
      c.maxDistance = 9;
      c.maxPolarAngle = Math.PI * 0.495;
      c.addEventListener("start", () => {
        this.userMoved = true;
        this.camGoal = null;
      });
      this.controls = c;
    }

    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    }
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.updateLoop();
      });
      this.io.observe(container);
    }
    this.mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    this.onScheme = () => this.setTheme(isDark());
    this.mq && this.mq.addEventListener && this.mq.addEventListener("change", this.onScheme);
    window.addEventListener("hp:look", this.onScheme);
    this.onAnim = () => this.syncStyle();
    window.addEventListener("hp:anim", this.onAnim);

    this.lastNow = performance.now();
    this.updateLoop();
  }

  buildFloor() {
    const size = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    this.floorCanvas = cv;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const grid = document.createElement("canvas");
    grid.width = grid.height = 128;
    this.gridCanvas = grid;
    const gridTex = new THREE.CanvasTexture(grid);
    gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.repeat.set(10, 10);
    this.gridTex = gridTex;
    const fade = document.createElement("canvas");
    fade.width = fade.height = 256;
    const fx = fade.getContext("2d");
    const fg = fx.createRadialGradient(128, 128, 30, 128, 128, 128);
    fg.addColorStop(0, "#fff");
    fg.addColorStop(1, "#000");
    fx.fillStyle = fg;
    fx.fillRect(0, 0, 256, 256);
    const fadeTex = new THREE.CanvasTexture(fade);

    const base = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.95, metalness: 0 }));
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    const lines = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshBasicMaterial({ map: gridTex, alphaMap: fadeTex, transparent: true, depthWrite: false, opacity: 0.5 })
    );
    lines.rotation.x = -Math.PI / 2;
    lines.position.y = 0.002;
    // Shadow catcher on top so shadows read strongly on the gradient.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    shadow.receiveShadow = true;
    this.floorTex = tex;
    this.floorMeshes = [base, lines, shadow];
    this.scene.add(base, lines, shadow);
    this.paintFloor();
  }

  paintFloor() {
    const dark = this.dark;
    const x = this.floorCanvas.getContext("2d");
    const s = this.floorCanvas.width;
    x.clearRect(0, 0, s, s);
    const look = this.look.floor || {};
    const floor = look.color || themeColor("--stage-floor");
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s / 2);
    if (floor) {
      g.addColorStop(0, rgba(floor, 1));
      g.addColorStop(0.55, rgba(floor, 0.8));
      g.addColorStop(1, rgba(floor, 0));
    } else {
      g.addColorStop(0, dark ? "rgba(70,86,108,0.95)" : "rgba(214,222,232,1)");
      g.addColorStop(0.55, dark ? "rgba(40,52,68,0.75)" : "rgba(226,232,240,0.85)");
      g.addColorStop(1, dark ? "rgba(20,28,38,0)" : "rgba(240,244,248,0)");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    this.floorTex.needsUpdate = true;
    const gx = this.gridCanvas.getContext("2d");
    gx.clearRect(0, 0, 128, 128);
    const grid = look.grid || themeColor("--stage-grid");
    gx.strokeStyle = grid ? rgba(grid, 0.4) : dark ? "rgba(160,190,220,0.35)" : "rgba(80,100,130,0.28)";
    gx.lineWidth = 2;
    gx.strokeRect(0, 0, 128, 128);
    this.gridTex.needsUpdate = true;
  }

  setTheme(dark) {
    this.dark = dark;
    this.figure.setTheme(dark, themeColors());
    applyPalette(this.M, dark);
    this.applyLook();
    if (this.figure.dressProp) this.buildProps();
    this.render();
  }

  // ---------- animation styles ----------

  // Forces a style whatever the exercise (previews and thumbnails); null follows the
  // user's choice. Resolves once the figure is on stage.
  setStyle(id) {
    this.opts.style = id || null;
    return this.syncStyle();
  }

  syncStyle() {
    const want = this.opts.style || animStyleFor(this.id);
    this.wantStyle = want;
    if (want === this.styleId) {
      showFigure(this.figure, true);
      return Promise.resolve();
    }
    // Hide the old figure rather than show it while the new one loads.
    showFigure(this.figure, false);
    if (!this.figures.has(want)) {
      this.figures.set(
        want,
        loadFigure(want).then(
          (fig) => (this.disposed ? (fig.dispose(), null) : (this.loadedFigures.add(fig), fig)),
          (err) => (console.error(err), null)
        )
      );
    }
    return this.figures.get(want).then((fig) => {
      if (this.disposed || this.wantStyle !== want) return;
      if (fig) this.useFigure(want, fig);
      else showFigure(this.figure, true);
    });
  }

  useFigure(id, fig) {
    if (this.figure.dom) this.figure.dom.remove();
    else this.scene.remove(this.figure.group);
    this.figure = fig;
    this.styleId = id;
    showFigure(fig, true);
    if (fig.dom) {
      // Over the WebGL canvas, which stays (see-through) underneath to take the
      // drags that turn the camera.
      this.renderer.domElement.after(fig.dom);
      this.renderer.domElement.style.opacity = "0";
    } else {
      this.scene.add(fig.group);
      this.renderer.domElement.style.opacity = "";
    }
    fig.setTheme(this.dark, themeColors());
    this.applyLook();
    this.buildProps();
    if (this.clip) fig.setHighlight(this.clip.highlight);
    this.render();
  }

  // The figure's look: lights, tone mapping and floor colours (defaults: the mannequin's).
  applyLook() {
    const f = this.figure;
    const L = (typeof f.look === "function" ? f.look(this.dark) : f.look) || {};
    this.look = L;
    const [sky, ground, hemi] = L.hemi || [0xffffff, this.dark ? 0x334455 : 0x8899aa, 1.15];
    this.hemi.color.set(sky);
    this.hemi.groundColor.set(ground);
    this.hemi.intensity = hemi;
    const [kc, ki] = L.key || [0xffffff, 2.2];
    this.keyLight.color.set(kc);
    this.keyLight.intensity = ki;
    const [rc, ri] = L.rim || [0x9fc8ff, 0.7];
    this.rimLight.color.set(rc);
    this.rimLight.intensity = ri;
    this.renderer.toneMapping = L.tone === "none" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = L.exposure ?? 1.05;
    const [, lines] = this.floorMeshes;
    lines.material.opacity = (L.floor && L.floor.gridOpacity) ?? 0.5;
    this.paintFloor();
  }

  // Reserves `px` CSS pixels at the bottom for an overlay (the cue bar): the
  // clip's whole framing is drawn above it, with a little extra floor around.
  setInset(px) {
    this.inset = Math.max(0, px || 0);
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const inset = Math.min(this.inset || 0, h * 0.35);
    if (inset > 0) {
      const fh = h - inset;
      const fw = (w * fh) / h;
      this.camera.setViewOffset(fw, fh, -(w - fw) / 2, 0, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.render();
  }

  load(id, { view } = {}) {
    const anim = getAnimation(id);
    this.id = id;
    this.anim = anim;
    this.clips = anim ? anim.clips.map(prepareClip) : [];
    this.clipIndex = 0;
    this.time = 0;
    this.clipLoops = 0;
    this.lastCue = null;
    this.userMoved = false;
    this.forcedView = view || null;
    this.applyClip(true);
    this.syncStyle();
    this.lastNow = performance.now();
    this.updateLoop();
    this.render();
    return !!anim;
  }

  get clip() {
    return this.clips[this.clipIndex];
  }

  // The clip's props, both sides, restyled by the figure if its style does that.
  buildProps() {
    const clip = this.clip;
    this.propGroups.forEach((g) => g.clear());
    if (!clip) return;
    for (const spec of clip.props) {
      this.propGroups[0].add(createProp(spec, this.M));
      this.propGroups[1].add(createProp(mirrorSpec(spec), this.M));
    }
    const dress = this.figure.dressProp;
    if (dress) this.propGroups.forEach((g) => g.traverse((o) => o.isMesh && dress(o)));
  }

  applyClip(snapCamera = false) {
    const clip = this.clip;
    this.buildProps();
    if (!clip) return;
    this.propGroups[1].visible = false;
    this.figure.setHighlight(clip.highlight);
    // Keep a camera angle the user chose by dragging; otherwise follow the clip's view.
    if (snapCamera || !this.userMoved) this.setView(this.forcedView || clip.camera.view || "three", snapCamera);
    this.onCue({ cue: "", title: clip.title, clipIndex: this.clipIndex, clipCount: this.clips.length });
  }

  setView(view, snap = false) {
    const clip = this.clip;
    const cam = (clip && clip.camera) || {};
    const target = new THREE.Vector3(...(cam.target || [0, 0.9, 0]));
    const dist = cam.dist || 3.4;
    const dir = Array.isArray(view) ? new THREE.Vector3(...view) : new THREE.Vector3(...(VIEWS[view] || VIEWS.three));
    dir.normalize();
    const pos = target.clone().addScaledVector(dir, dist);
    this.viewName = Array.isArray(view) ? "custom" : view;
    if (snap) {
      this.camera.position.copy(pos);
      this.camTarget.copy(target);
      this.camera.lookAt(target);
      if (this.controls) {
        this.controls.target.copy(target);
        this.controls.update();
      }
      this.camGoal = null;
    } else {
      this.camGoal = { pos, target, t: 0 };
    }
    this.render();
  }

  setSpeed(s) {
    this.speed = s;
  }
  setAutoAdvance(enabled) {
    this.autoAdvance = enabled;
    this.clipLoops = 0;
  }
  zoom(factor) {
    if (!this.controls) return;
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(target).add(offset);
    this.camTarget.copy(target);
    this.camGoal = null;
    this.userMoved = true;
    this.controls.update();
    this.render();
  }
  play() {
    this.playing = true;
    this.lastNow = performance.now();
    this.updateLoop();
  }
  pause() {
    this.playing = false;
    this.updateLoop();
  }
  toggle() {
    this.playing ? this.pause() : this.play();
    return this.playing;
  }
  nextClip(step = 1) {
    if (!this.clips.length) return;
    this.clipIndex = (this.clipIndex + step + this.clips.length) % this.clips.length;
    this.time = 0;
    this.clipLoops = 0;
    this.applyClip(false);
  }
  setClip(index) {
    if (!this.clips.length) return;
    const next = ((index % this.clips.length) + this.clips.length) % this.clips.length;
    if (next === this.clipIndex) return;
    this.clipIndex = next;
    this.time = 0;
    this.clipLoops = 0;
    this.applyClip(false);
  }

  updateLoop() {
    const run = this.playing && this.visible && this.clips.length > 0;
    this.renderer.setAnimationLoop(run ? () => this.tick() : null);
    if (!run) this.render();
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.lastNow) / 1000, 0.1) * this.speed;
    this.lastNow = now;
    const clip = this.clip;
    if (clip) {
      const before = Math.floor(this.time / clip.duration);
      this.time += dt;
      const after = Math.floor(this.time / clip.duration);
      if (after > before && this.autoAdvance && this.clips.length > 1) {
        this.clipLoops += 1;
        const limit = clip.loops ?? 2;
        if (this.clipLoops >= limit) {
          this.clipIndex = (this.clipIndex + 1) % this.clips.length;
          this.time = 0;
          this.clipLoops = 0;
          this.applyClip(false);
        }
      }
    }
    this.render();
  }

  // Poses the figure for the current time (or an explicit time) and draws one frame.
  render(time = null) {
    const clip = this.clip;
    if (clip) {
      const t = time == null ? this.time : time;
      const s = sampleClip(clip, t);
      const J = computeJoints(s.pose);
      // still: a single frame at a set time (thumbnails), not part of the playback.
      this.propGroups[0].visible = !s.mirrored;
      this.propGroups[1].visible = s.mirrored;
      this.updateAttachments(clip, J, s.mirrored);
      const hold = clip.hold ? (s.mirrored ? mirrorHold(clip.hold) : clip.hold) : {};
      const bar = clip.props.some((p) => p.type === "bar" || p.bar);
      const grip = {}, gripAxis = {};
      for (const side of ["L", "R"]) {
        grip[side] = !!(hold.goblet || hold.both || hold[side] || bar || clip.bands.some((b) => [b.a, b.b].some((end) => (s.mirrored ? swapSide(end) : end) === "hand" + side)));
        // A goblet holds the top head in both palms, so the hands keep their own
        // cradling angle. Handle grips turn the knuckles to line up with the bar.
        if (hold[side] || hold.both) gripAxis[side] = new THREE.Vector3(1, 0, 0).applyQuaternion(this.dumbbells[hold.both ? "both" : side].quaternion);
        else if (grip[side]) gripAxis[side] = new THREE.Vector3(1, 0, 0);
      }
      this.figure.update(J, { t, still: time != null, id: this.id, title: clip.title, grip, gripAxis, breath: 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 4.2) });
      this.figure.setPulse(0.5 + 0.5 * Math.sin(s.phase * Math.PI * 2));
      if (clip.floorScroll) this.gridTex.offset.y = ((time == null ? this.time : time) * clip.floorScroll) % 1;
      this.mirrored = s.mirrored;
      if (s.cue !== this.lastCue) {
        this.lastCue = s.cue;
        this.onCue({ cue: s.cue, title: clip.title, clipIndex: this.clipIndex, clipCount: this.clips.length });
      }
    }
    if (this.camGoal) {
      const g = this.camGoal;
      g.t = Math.min(1, g.t + 0.06);
      const k = EASE.inOut(g.t);
      this.camera.position.lerp(g.pos, k);
      this.camTarget.lerp(g.target, k);
      if (g.t >= 1) this.camGoal = null;
    }
    if (this.controls) {
      if (this.camGoal || !this.userMoved) this.controls.target.copy(this.camTarget);
      this.controls.update();
    } else {
      this.camera.lookAt(this.camTarget);
    }
    if (this.figure.draw) this.figure.draw(this.flatView());
    else this.renderer.render(this.scene, this.camera);
  }

  // What a flat style needs to draw a frame: the size, a projection of world points
  // to CSS pixels (x right, y down; z: depth, larger is further), the props, and the
  // camera itself (position, world matrix, inverse projection) for styles that cast
  // their own rays.
  flatView() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const v = new THREE.Vector3();
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const project = (p) => {
      v.set(p.x, p.y, p.z).project(cam);
      return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, z: v.z };
    };
    const clip = this.clip;
    return {
      width: w,
      height: h,
      project,
      // CSS pixels per metre at a world point.
      scaleAt(p) {
        const a = project(p);
        const b = project({ x: p.x + right.x * 0.1, y: p.y + right.y * 0.1, z: p.z + right.z * 0.1 });
        return Math.hypot(b.x - a.x, b.y - a.y) * 10;
      },
      props: clip ? (this.mirrored ? clip.props.map(mirrorSpec) : clip.props) : [],
      dark: this.dark,
      interactive: this.opts.interactive, // a stage with view buttons in its top right
      camera: { pos: cam.position.toArray(), world: cam.matrixWorld.elements, invProj: cam.projectionMatrixInverse.elements },
      attachments: this.attachments(),
    };
  }

  // What the hands hold and the bands, as the 3D scene has them this frame (for flat
  // styles): dumbbells { c, axis, size }, bands and the string as [end, end].
  attachments() {
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
    const dumbbells = Object.entries(this.dumbbells)
      .filter(([, d]) => d.visible)
      .map(([k, d]) => ({ c: d.position.clone(), axis: X.clone().applyQuaternion(d.quaternion), size: k === "goblet" ? 1.15 : 1 }));
    const ends = (m) => {
      const half = Y.clone().applyQuaternion(m.quaternion).multiplyScalar(m.scale.y / 2);
      return [m.position.clone().add(half), m.position.clone().sub(half)];
    };
    return {
      dumbbells,
      bands: this.bandPool.filter((b) => b.mesh.visible).map((b) => ends(b.mesh)),
      string: this.stringLine.mesh.visible ? ends(this.stringLine.mesh) : null,
    };
  }

  updateAttachments(clip, J, mirrored) {
    const hold = clip.hold ? (mirrored ? mirrorHold(clip.hold) : clip.hold) : null;
    const d = this.dumbbells;
    d.L.visible = d.R.visible = d.goblet.visible = d.both.visible = false;
    if (hold) {
      if (hold.goblet) {
        const mid = J.handL.clone().lerp(J.handR, 0.5);
        const up = new THREE.Vector3(0, 1, 0).applyMatrix4(J.Rc).normalize();
        d.goblet.visible = true;
        // The top head rests in the palms: its underside sits at the hand centres,
        // with the handle and lower head hanging below.
        d.goblet.position.copy(mid).addScaledVector(up, -0.046);
        d.goblet.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), up);
      }
      if (hold.both) {
        const mid = J.handL.clone().lerp(J.handR, 0.5);
        const axis = new THREE.Vector3(1, 0, 0).applyMatrix4(J.Rc).normalize();
        d.both.visible = true;
        d.both.position.copy(mid);
        d.both.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
      }
      for (const s of ["L", "R"]) {
        if (!hold[s]) continue;
        const db = d[s];
        db.visible = true;
        // Sit the handle inside the loop the curled fingers make, just forward of
        // the palm and on the palm side of the knuckles.
        db.position.copy(J["hand" + s]).addScaledVector(J["handDir" + s], -0.012).addScaledVector(J["handRef" + s], -0.012);
        const fore = J["foreDir" + s];
        const axisName = hold.axis || "x";
        let ref;
        if (axisName === "hand") ref = new THREE.Vector3().setFromMatrixColumn(J["handFrame" + s], 0);
        else if (axisName === "z") ref = new THREE.Vector3(0, 0, 1).applyMatrix4(J.Rc);
        else if (axisName === "y") ref = new THREE.Vector3(0, 1, 0);
        else if (axisName === "wz") ref = new THREE.Vector3(0, 0, 1);
        else if (axisName === "wx") ref = new THREE.Vector3(1, 0, 0);
        else ref = new THREE.Vector3(1, 0, 0).applyMatrix4(J.Rc);
        const axis = ref.addScaledVector(fore, -ref.dot(fore));
        if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
        db.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis.normalize());
      }
    }
    this.bandPool.forEach((b) => (b.mesh.visible = false));
    let bandIndex = 0;
    for (const spec of clip.bands) {
      const refs = [spec.a, ...(spec.via || []), spec.b];
      for (let i = 0; i < refs.length - 1; i++) {
        const band = this.bandPool[bandIndex++];
        if (!band) break;
        const a = this.point(mirrored ? swapSide(refs[i]) : refs[i], J);
        const b = this.point(mirrored ? swapSide(refs[i + 1]) : refs[i + 1], J);
        if (!a || !b) continue;
        band.mesh.visible = true;
        band.set(a, b);
      }
    }
    const showString = clip.effects.includes("string");
    this.stringLine.mesh.visible = showString;
    if (showString) {
      const top = J.head.clone().add(new THREE.Vector3(0, 0.11, 0).applyMatrix4(J.Rh));
      this.stringLine.set(top, top.clone().add(new THREE.Vector3(0, 1.4, 0)));
    }
  }

  point(ref, J) {
    if (Array.isArray(ref)) return new THREE.Vector3(...ref);
    if (typeof ref === "string" && J[ref]) return J[ref].clone();
    return null;
  }

  // Renders a still image of clip `clipIndex` at time `t`; used by the library thumbnails.
  async snapshot(id, clipIndex = 0, t = null, view = null) {
    if (this.id !== id) this.load(id, { view });
    await this.syncStyle();
    if (this.clipIndex !== clipIndex && this.clips[clipIndex]) {
      this.clipIndex = clipIndex;
      this.applyClip(true);
    }
    if (view) this.setView(view, true);
    const clip = this.clip;
    const time = t == null && clip ? thumbTime(clip) : t || 0;
    this.render(time);
    return this.figure.snapshot ? this.figure.snapshot() : this.renderer.domElement.toDataURL("image/png");
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro && this.ro.disconnect();
    this.io && this.io.disconnect();
    this.mq && this.mq.removeEventListener && this.mq.removeEventListener("change", this.onScheme);
    window.removeEventListener("hp:look", this.onScheme);
    window.removeEventListener("hp:anim", this.onAnim);
    this.disposed = true;
    this.controls && this.controls.dispose();
    this.loadedFigures.forEach((f) => f.dispose());
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// The most telling moment of a clip for a still image: its `thumb` time if set,
// otherwise the key (on the first side) where the body is furthest from the start.
function thumbTime(clip) {
  if (clip.thumb != null) return clip.thumb;
  const end = clip.half ?? clip.duration;
  const start = computeJoints(clip.keys[0].pose);
  let best = clip.duration * 0.45;
  let bestD = 0.02;
  for (const k of clip.keys) {
    if (k.t >= end) break;
    const J = computeJoints(k.pose);
    let d = 0;
    for (const n of ["head", "handL", "handR", "kneeL", "kneeR", "ankleL", "ankleR", "pelvis"]) d += J[n].distanceTo(start[n]);
    if (d > bestD) {
      bestD = d;
      best = k.t;
    }
  }
  return best;
}

function showFigure(fig, on) {
  if (fig.dom) fig.dom.style.visibility = on ? "" : "hidden";
  else fig.group.visible = on;
}

function mirrorHold(h) {
  return { ...h, L: h.R, R: h.L };
}
