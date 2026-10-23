// Animations for the legs & knees exercises.
import { ANKLE_Y, ARMS, DIM, FOOT_X, anchor, hangArms, hinge, joints, legsTo, squat, transition } from "../poses.js";

// ---------- shared helpers ----------

const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// Ankle position for a foot resting on a slant board (heels high, toes low).
// The board may sit on something (pos[1] = height of its base).
function onSlant(slant, x, z) {
  const d = slant.d, ang = (slant.angle * Math.PI) / 180;
  const h = d * Math.tan(ang);
  const zc = slant.pos[2];
  const surf = (slant.pos[1] || 0) + h * (d / 2 - (z - zc)) / d;
  return { pos: [x, surf + ANKLE_Y * Math.cos(ang), z + ANKLE_Y * Math.sin(ang)], toe: slant.angle };
}

// Vector from the ankle to a point of an IK foot ("heel" | "ball" | "toe") at foot pitch `toe` (+ = heel up).
function footOffset(side, point, toe) {
  const J = joints({ ["foot" + side]: [0, 0.5, 0], ["toe" + side]: toe });
  return J[point + side].clone().sub(J["ankle" + side]);
}

// Ankle target that puts a foot point exactly at `at` (heel tap, ball on a step edge…).
function footAt(side, point, at, toe) {
  const o = footOffset(side, point, toe);
  return [at[0] - o.x, at[1] - o.y, at[2] - o.z];
}

// Back foot up on its toes: toe tip at depth z, the lower of ball and toe tip on the surface y.
function onToes(side, x, z, toe, y = 0) {
  const t = footOffset(side, "toe", toe);
  const b = footOffset(side, "ball", toe);
  // The shoe extends below the rig's toe/ball points, so leave its outsole on the floor.
  return { pos: [x, y + 0.008 - Math.min(t.y, b.y), z - t.z], toe };
}

// Ankle target for toes lifted by `lift` degrees while the heel stays down (back of the heel at zBack).
// The foot mesh (mannequin.js: ellipsoid centred between heel and toe, 0.62·ankleH below the ankle,
// 0.038 thick) rocks on its rounded heel, which ends up ~1.7 cm above the rig's heel point once the
// toes are up: keep the mesh on the floor, but never let the heel point sink more than ~1 cm.
function toesUp(x, zBack, lift) {
  const a = (lift * Math.PI) / 180;
  const fz = Math.cos(a), fy = Math.sin(a), uz = -Math.sin(a), uy = Math.cos(a);
  const c = (DIM.toe - DIM.heel) / 2, half = (DIM.toe + DIM.heel) / 2, dn = DIM.ankleH * 0.62, thick = 0.038;
  const low = c * fy - dn * uy - Math.hypot(half * fy, thick * uy); // lowest point of the sole, from the ankle
  const heel = -DIM.heel * fy - DIM.ankleH * uy; // rig heel point, from the ankle
  const back = (c - half) * fz - dn * uz; // back of the heel, from the ankle
  return [x, Math.max(-0.008 - low, -0.009 - heel), zBack - back];
}

// World wrist targets + elbow poles from chest-frame values, so hands can stay in "world" in every key.
function chestHands(p, hand, pole) {
  const J = joints(p);
  const pt = (v) => J.neckBase.clone().set(...v).applyMatrix4(J.Rc).add(J.neckBase).toArray();
  const dir = (v) => J.neckBase.clone().set(...v).applyMatrix4(J.Rc).toArray();
  const flip = (v) => [-v[0], v[1], v[2]];
  return { ...p, handsIn: "world", handL: pt(hand), handR: pt(flip(hand)), elbowL: dir(pole), elbowR: dir(flip(pole)) };
}

// Wrist target that puts the hand itself (a dumbbell handle) at `at`.
function gripAt(p, side, at) {
  const J = joints({ ...p, handsIn: "world", ["hand" + side]: at });
  const o = J["hand" + side].clone().sub(J["wrist" + side]);
  return [at[0] - o.x, at[1] - o.y, at[2] - o.z];
}

// A folded mat or cushion: stacked 12 mm mat layers.
function cushion(x, z, w, d, layers) {
  return Array.from({ length: layers }, (_, i) => ({ type: "mat", pos: [x, i * 0.012, z], w, d }));
}

// Sofa raised on four short legs, so the heels can hook under its front edge.
function sofaOnLegs(z, w, lift) {
  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push({ type: "box", pos: [sx * (w / 2 - 0.07), 0, z + sz * 0.35], w: 0.05, d: 0.05, h: lift });
  return [{ type: "sofa", pos: [0, lift, z], w }, ...legs];
}

// ---------- heels-elevated goblet squat ----------

const SLANT = { type: "slant", pos: [0, 0, 0.04], w: 0.56, d: 0.36, angle: 14 };

function gobletSquat(d) {
  const f = onSlant(SLANT, 0.14, 0.0);
  return {
    ...squat(d, { feet: { y: f.pos[1], z: f.pos[2], toe: f.toe, x: 0.14 } }),
    rot: [24 * d, 0, 0],
    spine: [2 * d, 0, 0],
    shrugL: [-0.008 * d, 0],
    shrugR: [-0.008 * d, 0],
    neck: [-10 * d, 0],
    ...ARMS.goblet,
  };
}

// ---------- Poliquin step-up ----------
// The slant board stays on the floor; the free heel taps just beyond its front edge.

// RDL: dumbbells hang in front of the thighs (not through them) and slide down the legs.
function rdlPose(d) {
  return hangArms(hinge(d), { fwd: 0.18 * (1 - 2 * d), out: 0.045, inward: 0, drop: 0.92 });
}

const PQ_BOARD = { type: "slant", pos: [0, 0, 0.06], w: 0.5, d: 0.28, angle: 15 };
const PQ_L = onSlant(PQ_BOARD, 0.11, 0);
const PQ_R = onSlant(PQ_BOARD, -0.11, 0);

// Both feet on the board: start and end of each side, so the sides switch cleanly.
const PQ_STAND = {
  root: [0, 0.993, 0],
  footL: PQ_L.pos,
  footR: PQ_R.pos,
  toeL: PQ_L.toe,
  toeR: PQ_R.toe,
  kneeR: [0, 0, 1],
  ...ARMS.hips,
};

function poliquin(d) {
  // d = 0: standing tall on the left leg, right leg straight in front; 1: heel tap
  const free = d < 0.5
    ? { footR: [-0.07, 0.18, 0.29], toeR: -12 }
    : { footR: footAt("R", "heel", [-0.08, 0, 0.255], -22), toeR: -22 };
  return {
    root: mix([0.05, 0.993, 0.0], [0.05, 0.81, -0.02], d),
    rot: [2 + 10 * d, 0, -1.5 * d],
    neck: [-4 * d, 0],
    spine: [2 * d, 0, 0],
    footL: PQ_L.pos,
    toeL: PQ_L.toe,
    ...free,
    kneeR: [0, 0, 1],
    ...ARMS.hips,
  };
}

// ---------- ATG split squat ----------
// Long split stance: left foot flat in front, right foot on its toes behind, back knee down to a cushion.
// Each side starts and ends standing, stepping back into the stance (clean switch between sides).

const ATG_FRONT = [0.11, ANKLE_Y, 0.45];
const ATG_TOE_Z = -0.42; // back toe tip, ~87 cm behind the front ankle

function atgPose(root, pitch, spine, backToe) {
  const back = onToes("R", -0.11, ATG_TOE_Z, backToe);
  return {
    root,
    rot: [pitch, 0, 0],
    neck: [-pitch * 0.4, 0],
    spine: [spine, 0, 0],
    footL: ATG_FRONT,
    footR: back.pos,
    toeR: back.toe,
    kneeR: [0, -0.3, 1],
    ...ARMS.hips,
  };
}

const ATG_STAND = { ...atgPose([0, 0.943, 0.45], 0, 0, 0), footR: [-0.11, ANKLE_Y, 0.45], toeR: 0 };
const ATG_STEP = { ...atgPose([0.02, 0.86, 0.2], 4, 0, 0), footR: [-0.11, 0.2, -0.05], toeR: 25 }; // back foot in the air
const ATG_TOP = atgPose([0, 0.8, -0.02], 3, 0, 27); // tall split stance, back heel up
const ATG_DOWN = atgPose([0, 0.538, -0.03], 6, -3, 70); // back knee resting on the cushion
const ATG_KNEE = joints(ATG_DOWN).kneeR;

// Slide forward from ATG_DOWN (s = 0) to full depth (s = 1): the hips travel on an arc
// around the back knee, so it stays on the cushion while the front knee goes past the toes.
function atgSlide(s) {
  const a = (47.6 * s * Math.PI) / 180;
  return atgPose([0, ATG_KNEE.y + 0.44 * Math.cos(a), ATG_KNEE.z + 0.44 * Math.sin(a)], 6 + 6 * s, -3 - 5 * s, 70);
}

// ---------- Nordic hamstring curl ----------
// Knees on a folded mat, heels hooked under a sofa; the body pivots at the knees in one straight line.

const NORDIC_KNEE = [0.118, 0.086, 0];
const NORDIC_POLE = [0.5, -1, -0.4]; // elbows: down/out when upright, up/back on the floor

function nordicBody(theta) {
  // theta: forward lean of the straight body from vertical (deg)
  const slope = 6; // shins run slightly down from the mat to the floor
  const leg = [0, 3, 90 - slope - theta, 85];
  const p = { rot: [theta, 0, 0], legL: leg, legR: leg, neck: [-4, 0], palmL: [0, 1, 0], palmR: [0, 1, 0], shrugL: [0, 0.012 * Math.sin(theta * Math.PI / 180)], shrugR: [0, 0.012 * Math.sin(theta * Math.PI / 180)] };
  return anchor(p, "kneeL", NORDIC_KNEE, "yz");
}

// hands: "ready" (in front of the chest), "reach" (towards the floor) or "floor" (planted)
function nordic(theta, hands = "ready") {
  const body = nordicBody(theta);
  if (hands === "ready") return chestHands(body, [0.11, -0.2, 0.24], NORDIC_POLE);
  if (hands === "reach") return chestHands(body, [0.2, -0.41, 0.37], NORDIC_POLE);
  // Plant the hands as far forward on the floor as the arms can actually reach.
  const J = joints(body), hand = (s) => {
    const x = 0.22 * s, sh = J["shoulder" + (s > 0 ? "L" : "R")];
    const dy = 0.035 - sh.y, dx = x - sh.x;
    const dz = Math.sqrt(Math.max(0.02, 0.53 ** 2 - dx * dx - dy * dy));
    return [x, 0.035, sh.z + dz];
  };
  return { ...chestHands(body, [0, 0, 0], NORDIC_POLE), handL: hand(1), handR: hand(-1) };
}

// ---------- reverse Nordic ----------

function revNordic(lean) {
  // lean: backward lean of the straight body from vertical (deg)
  const slope = 2;
  const leg = [0, 3, 90 - slope + lean, 70];
  const p = { rot: [-lean, 0, 0], legL: leg, legR: leg, neck: [6, 0], armL: [78 + 0.15 * lean, 10, 12 + 0.12 * lean, 0], armR: [78 + 0.15 * lean, 10, 12 + 0.12 * lean, 0] };
  return anchor(p, "kneeL", [0.118, 0.062, 0], "yz");
}

// ---------- tibialis raise ----------
// Back and hips on the wall, straight legs angled forward to the heels.

const TIB_WALL_Z = -0.15; // front face of the wall
const TIB_HEEL_Z = 0.29; // back of the heels, ~45 cm from the wall

function tibRaise(lift) {
  const footL = toesUp(FOOT_X, TIB_HEEL_Z, lift);
  const footR = [-FOOT_X, footL[1], footL[2]];
  const pz = TIB_WALL_Z + 0.118;
  const leg = 0.862; // hip → ankle, knees nearly straight
  const y = footL[1] + Math.sqrt(leg * leg - (footL[2] - pz) ** 2);
  return {
    root: [0, y, pz],
    rot: [-2, 0, 0],
    neck: [2, 0],
    footL,
    footR,
    toeL: -lift,
    toeR: -lift,
    armL: [-4, 10, 12, 0],
    armR: [-4, 10, 12, 0],
  };
}

// ---------- calf raises ----------

// Seated: balls of the feet on a book, dumbbells across the knees.
const CALF_CHAIR = { type: "chair", pos: [0, 0, -0.06] };
const CALF_BOOK = { type: "box", pos: [0, 0, 0.61], w: 0.44, d: 0.12, h: 0.05 };
const CALF_BALL_Z = 0.575;

function seatedCalf(raise) {
  // raise: foot pitch (deg), negative = heels below the book (stretch)
  const p = {
    root: [0, 0.595, 0],
    rot: [5, 0, 0],
    spine: [7, 0, 0],
    neck: [-5, 0],
    footL: footAt("L", "ball", [0.135, 0.05, CALF_BALL_Z], raise),
    footR: footAt("R", "ball", [-0.135, 0.05, CALF_BALL_Z], raise),
    toeL: raise,
    toeR: raise,
  };
  const J = joints(p);
  // Handle resting on top of the thigh, 12 cm behind the knee; the heads hang either side.
  const onThigh = (s) => {
    const knee = J["knee" + s], along = knee.clone().sub(J["hip" + s]).normalize();
    const up = knee.clone().set(0, 1, 0).addScaledVector(along, -along.y).normalize();
    return knee.clone().addScaledVector(along, -0.12).addScaledVector(up, 0.128).toArray();
  };
  const arms = { handsIn: "world", elbowL: [0.25, -0.4, -1], elbowR: [-0.25, -0.4, -1] };
  const q = { ...p, ...arms };
  return { ...q, handL: gripAt(q, "L", onThigh("L")), handR: gripAt(q, "R", onThigh("R")) };
}

// Standing on a step edge: left ball on the edge, heel hanging off, right foot lifted behind, hands on the wall.
const CALF_STEP = { type: "step", pos: [0, 0, 0.24], w: 0.62, d: 0.34, h: 0.18 };
const CALF_WALL = { type: "wall", pos: [0, 0, 0.54], w: 1.6, h: 2.3 };
const CALF_EDGE_Z = 0.1; // balls of the feet, 3 cm in from the back edge

function stepCalf(raise, oneLeg = true) {
  const footL = footAt("L", "ball", [0.12, 0.18, CALF_EDGE_Z], raise);
  const pelvis = [oneLeg ? 0.05 : 0, footL[1] + 0.862, footL[2] - 0.01];
  const footR = oneLeg
    ? [-0.06, pelvis[1] - 0.62, pelvis[2] - 0.3]
    : footAt("R", "ball", [-0.12, 0.18, CALF_EDGE_Z], raise);
  const body = {
    root: pelvis,
    rot: [3, 0, 0],
    neck: [-3, 0],
    footL,
    footR,
    toeL: raise,
    toeR: oneLeg ? 45 : raise,
    handsIn: "world",
    palmL: [0, 0, -1],
    palmR: [0, 0, -1],
    fingersL: [0, 1, 0],
    fingersR: [0, 1, 0],
    elbowL: [0.6, -0.8, -0.2],
    elbowR: [-0.6, -0.8, -0.2],
  };
  // Keep both palms on the wall at a comfortable height as the body rises.
  const J = joints(body), hand = (s) => {
    const sh = J["shoulder" + s], dx = 0.2 * (s === "L" ? 1 : -1) - sh.x, dz = 0.49 - sh.z;
    return [0.2 * (s === "L" ? 1 : -1), sh.y - Math.sqrt(Math.max(0.01, 0.50 ** 2 - dx * dx - dz * dz)), 0.49];
  };
  return { ...body, handL: hand("L"), handR: hand("R") };
}

// ---------- dumbbell swing ----------
// FK arms swing like pendulums from the shoulders; the hips do the work.

const SWING_FEET = {
  footL: [0.23, ANKLE_Y, 0], footR: [-0.23, ANKLE_Y, 0],
  kneeL: [0.4, 0, 1], kneeR: [-0.4, 0, 1], turnout: 12,
};

// A two-handed swing: both wrists stay on one handle, close together, while
// the hips hinge and snap. The hands follow the shoulder line, never the body
// centre, so the dumbbell swings in front of the thighs instead of through them.
function swing(stage) {
  const S = {
    top: { legs: [0, 0], rot: -2, spine: -2, arm: [0, -0.12, 0.99], neck: 0 },
    drop: { legs: [1, 3], rot: 3, spine: 0, arm: [0, -0.74, 0.67], neck: 0 },
    hike: { legs: [8, 26], rot: 52, spine: 4, arm: [0, -0.97, -0.16], neck: -24 },
    snap: { legs: [2, 6], rot: 10, spine: 0, arm: [0, -0.55, 0.83], neck: -4 },
  }[stage];
  const { y, z } = legsTo(S.legs[0], S.legs[1]);
  const body = {
    ...SWING_FEET,
    root: [0, y - 0.012, z],
    rot: [S.rot, 0, 0],
    spine: [S.spine, 0, 0],
    neck: [S.neck, 0],
  };
  const sh = joints(body).shoulderL;
  const dir = S.arm, len = Math.hypot(...dir), reach = 0.5;
  const hy = sh.y + (dir[1] / len) * reach;
  const hz = sh.z + (dir[2] / len) * reach;
  return {
    ...body,
    handsIn: "world",
    handL: [0.04, hy, hz],
    handR: [-0.04, hy, hz],
    elbowL: [0.35, -0.1, -1],
    elbowR: [-0.35, -0.1, -1],
  };
}

// ---------- reverse lunge ----------
// Left foot stays planted; the right foot steps back onto its toes. Dumbbells hang at the sides.

const LUNGE_TOE_Z = -0.72;

function lunge(stage) {
  const S = {
    stand: { root: [0, 0.94, 0], footR: [-0.11, ANKLE_Y, 0], toeR: 0, rot: 0 },
    lift: { root: [0.03, 0.9, -0.06], footR: [-0.11, 0.2, -0.3], toeR: 20, rot: 3 },
    land: { root: [0, 0.75, -0.24], back: 40, rot: 4 },
    bottom: { root: [0, 0.53, -0.3], back: 70, rot: 5 },
  }[stage];
  let footR = S.footR, toeR = S.toeR;
  if (S.back != null) {
    const b = onToes("R", -0.11, LUNGE_TOE_Z, S.back);
    footR = b.pos;
    toeR = b.toe;
  }
  const p = { root: S.root, rot: [S.rot, 0, 0], neck: [-S.rot, 0], shrugL: [-0.008, 0], shrugR: [-0.008, 0], footL: [0.11, ANKLE_Y, 0], footR, toeR, kneeR: [0, -0.2, 1] };
  return hangArms(p, { fwd: 0.035, out: 0.08, drop: 0.975 });
}

// ---------- step-up ----------
// Left foot onto a low aerobic step, drive up, bring the right foot up, then step down slowly.

const BOX = { type: "step", pos: [0, 0, 0.47], w: 0.75, d: 0.34, h: 0.15 };
const BOX_TOP = BOX.h + ANKLE_Y;

function stepUp(stage, arms) {
  const S = {
    floor: { root: [0, 0.94, 0], rot: 2, L: [0.11, ANKLE_Y, 0], R: [-0.11, ANKLE_Y, 0] },
    lift: { root: [-0.02, 0.935, 0], rot: 4, L: [0.11, 0.4, 0.1], toeL: 40, R: [-0.11, ANKLE_Y, 0] },
    place: { root: [-0.02, 0.92, 0.02], rot: 14, L: [0.11, BOX_TOP, 0.37], R: [-0.11, ANKLE_Y, 0] },
    drive: { root: [0.02, 1.01, 0.24], rot: 18, L: [0.11, BOX_TOP, 0.37], R: [-0.11, 0.2, -0.02], toeR: 15 },
    knee: { root: [0.03, 1.07, 0.34], rot: 4, L: [0.11, BOX_TOP, 0.37], R: [-0.11, 0.46, 0.16], toeR: 35 },
    top: { root: [0, 1.09, 0.37], rot: 1, L: [0.11, BOX_TOP, 0.37], R: [-0.11, BOX_TOP, 0.37] },
    reach: { root: [0.03, 1.02, 0.3], rot: 8, L: [0.11, BOX_TOP, 0.37], R: [-0.11, 0.4, 0.1], toeR: 35 },
    touch: { root: [0.02, 0.93, 0.14], rot: 12, L: [0.11, BOX_TOP, 0.37], R: [-0.11, ANKLE_Y, 0.0], toeR: 0 },
    shift: { root: [-0.03, 0.935, 0.05], rot: 6, L: [0.11, 0.37, 0.35], toeL: 8, R: [-0.11, ANKLE_Y, 0] },
    back: { root: [-0.03, 0.935, 0.0], rot: 4, L: [0.11, 0.39, 0.04], toeL: 40, R: [-0.11, ANKLE_Y, 0] },
  }[stage];
  const p = {
    root: S.root,
    rot: [S.rot, 0, 0],
    neck: [-S.rot * 0.7, 0],
    spine: [-2 * Math.sin(S.rot * Math.PI / 36), 0, 0],
    footL: S.L,
    footR: S.R,
    toeL: S.toeL ?? 0,
    toeR: S.toeR ?? 0,
    kneeL: [0.1, 0, 1],
    kneeR: [-0.1, 0, 1],
  };
  return arms === "dumbbells" ? hangArms(p, { fwd: 0.03, out: 0.08, drop: 0.975 }) : { ...p, ...ARMS.hips };
}

// One rep: foot onto the box, drive up, stand tall, step back down slowly. cues: [setup, drive, lower]
function stepUpKeys(arms, cues) {
  return [
    { t: 0, p: stepUp("floor", arms), cue: cues[0] },
    { t: 0.6, p: stepUp("floor", arms), cue: "Whole foot on the step" },
    { t: 1.0, p: stepUp("lift", arms) },
    { t: 1.35, p: stepUp("place", arms), cue: cues[1] },
    { t: 1.8, p: stepUp("drive", arms) },
    { t: 2.1, p: stepUp("knee", arms) },
    { t: 2.4, p: stepUp("top", arms), cue: "Stand tall on top" },
    { t: 2.9, p: stepUp("top", arms), cue: cues[2] },
    { t: 3.4, p: stepUp("reach", arms) },
    { t: 4.5, p: stepUp("touch", arms), cue: "Step down; switch legs" },
    { t: 4.9, p: stepUp("shift", arms) },
    { t: 5.3, p: stepUp("back", arms) },
    { t: 5.7, p: stepUp("floor", arms) },
  ];
}

export default {
  gobletsquat: {
    clips: [
      {
        title: "Heels-elevated goblet squat",
        props: [SLANT],
        hold: { goblet: true },
        highlight: ["quads", "glutes"],
        camera: { view: "three", target: [0, 0.94, 0], dist: 4.1 },
        keys: [
          { t: 0, p: gobletSquat(0), cue: "Heels on the board, dumbbell at your chest" },
          { t: 0.6, p: gobletSquat(0), cue: "3 s down: knees travel past the toes" },
          ...transition(gobletSquat, 0, 1, 0.6, 3.6, "Pause at the bottom"),
          { t: 4.1, p: gobletSquat(1), cue: "Push firmly through your feet to stand" },
          ...transition(gobletSquat, 1, 0, 4.1, 5.3),
        ],
      },
    ],
  },

  rdl: {
    clips: [
      {
        title: "Dumbbell Romanian deadlift",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["hamstrings", "glutes", "lowerBack"],
        camera: { view: "side", target: [0, 0.9, 0.12], dist: 3.9 },
        keys: [
          { t: 0, p: rdlPose(0), cue: "Dumbbells at your thighs, knees soft" },
          { t: 0.5, p: rdlPose(0), cue: "Push your hips back and keep your back flat" },
          { t: 1.75, p: rdlPose(0.5), e: "in" }, // in-between key keeps the hands on the arm's arc
          { t: 3, p: rdlPose(1), e: "out", cue: "Stretch at mid-shin" },
          { t: 3.4, p: rdlPose(1), cue: "Drive the hips forward" },
          { t: 4.1, p: rdlPose(0.5), e: "in" },
          { t: 4.8, p: rdlPose(0), e: "out" },
        ],
      },
    ],
  },

  poliquin: {
    clips: [
      {
        title: "Poliquin step-up",
        props: [PQ_BOARD],
        highlight: ["quads", "glutes"],
        camera: { view: "side", target: [0, 1.0, 0.1], dist: 4.3 },
        alternate: true,
        keys: [
          { t: 0, p: PQ_STAND, cue: "Slant board on the floor; one leg out in front" },
          { t: 0.6, p: poliquin(0), cue: "Knee far over the toes, lower slowly" },
          { t: 3.1, p: poliquin(1), cue: "Tap the heel lightly" },
          { t: 3.6, p: poliquin(1), cue: "Straighten the knee; no push-off" },
          { t: 4.9, p: poliquin(0), cue: "Switch legs" },
          { t: 5.5, p: PQ_STAND },
        ],
      },
    ],
  },

  atg: {
    clips: [
      {
        title: "ATG split squat",
        props: cushion(0, -0.03, 0.5, 0.3, 4),
        highlight: ["quads", "hips", "glutes"],
        camera: { view: "side", target: [0, 0.86, 0.12], dist: 4.25 },
        alternate: true,
        keys: [
          { t: 0, p: ATG_STAND, cue: "Step back into a long split stance" },
          { t: 0.4, p: ATG_STEP },
          { t: 0.8, p: ATG_TOP },
          { t: 1.1, p: ATG_TOP, cue: "Lower the back knee to the cushion" },
          { t: 2.3, p: ATG_DOWN, cue: "Slide forward: knee past the toes, heel down" },
          { t: 2.75, p: atgSlide(0.33), e: "in" },
          { t: 3.2, p: atgSlide(0.67), e: "lin" },
          { t: 3.7, p: atgSlide(1), e: "out", cue: "Back leg long: stretch the hip flexor" },
          { t: 4.6, p: atgSlide(1), cue: "Push back up to the top" },
          { t: 5.9, p: ATG_TOP, cue: "Step the back foot in; switch legs" },
          { t: 6.3, p: ATG_STEP },
          { t: 6.7, p: ATG_STAND },
        ],
      },
    ],
  },

  nordic: {
    clips: [
      {
        title: "Nordic hamstring curl",
        props: [...cushion(0, 0, 0.5, 0.26, 3), ...sofaOnLegs(-0.79, 1.4, 0.125)],
        highlight: ["hamstrings", "glutes"],
        camera: { view: "side", target: [0, 0.55, 0.33], dist: 4.3 },
        keys: [
          { t: 0, p: nordic(0), cue: "Heels hooked, body straight from knees to head" },
          { t: 0.6, p: nordic(0), cue: "Lower as slowly as you can, glutes squeezed" },
          // ~20°/s while lowering, then the fall speeds up until the hands catch it.
          { t: 1.5, p: nordic(12), e: "in" },
          { t: 2.25, p: nordic(27), e: "lin" },
          { t: 3.0, p: nordic(42, "reach"), e: "lin" },
          { t: 3.55, p: nordic(53, "reach"), e: "lin", cue: "Catch yourself with your hands" },
          { t: 3.9, p: nordic(62, "floor"), e: "lin" },
          { t: 4.15, p: nordic(71, "floor"), e: "lin" },
          { t: 4.45, p: nordic(80, "floor"), e: "out" },
          { t: 4.7, p: nordic(80, "floor"), cue: "Push back up with your hands" },
          { t: 5.0, p: nordic(71, "floor"), e: "in" },
          { t: 5.2, p: nordic(64, "floor"), e: "out", cue: "Hamstrings pull you back upright" },
          { t: 5.75, p: nordic(45, "reach"), e: "in" },
          { t: 6.1, p: nordic(28), e: "lin" },
          { t: 6.42, p: nordic(13), e: "lin" },
          { t: 6.85, p: nordic(0), e: "out" },
        ],
      },
    ],
  },

  revnordic: {
    clips: [
      {
        title: "Reverse Nordic",
        props: [{ type: "mat", pos: [0, 0, -0.15], w: 0.6, d: 0.9 }],
        highlight: ["quads", "hips"],
        camera: { view: "side", target: [0, 0.65, -0.1], dist: 3.7 },
        keys: [
          { t: 0, p: revNordic(0), cue: "Kneel tall, knees hip-width, glutes squeezed" },
          { t: 0.6, p: revNordic(0), cue: "Lean back in one straight line, knees to head" },
          { t: 1.74, p: revNordic(14), e: "in" },
          { t: 2.46, p: revNordic(28), e: "lin" },
          { t: 3.6, p: revNordic(42), e: "out", cue: "Only as far as you can control" },
          { t: 4.1, p: revNordic(42), cue: "Return to kneeling upright" },
          { t: 4.65, p: revNordic(28), e: "in" },
          { t: 5.05, p: revNordic(14), e: "lin" },
          { t: 5.6, p: revNordic(0), e: "out" },
        ],
      },
    ],
  },

  tibraise: {
    clips: [
      {
        title: "Tibialis raise against a wall",
        props: [{ type: "wall", pos: [0, 0, TIB_WALL_Z - 0.025], w: 1.6, h: 2.1 }],
        highlight: ["shins", "ankles"],
        camera: { view: "side", target: [0, 0.86, 0.15], dist: 3.9 },
        keys: [
          { t: 0, p: tibRaise(0), cue: "Back and hips on the wall, feet out, legs straight" },
          { t: 0.8, p: tibRaise(0), cue: "Lift the toes as high as you can" },
          { t: 1.8, p: tibRaise(34), cue: "Pause 1 s" },
          { t: 2.8, p: tibRaise(34), cue: "Lower slowly" },
          { t: 4.8, p: tibRaise(0) },
        ],
      },
    ],
  },

  calf: {
    clips: [
      {
        title: "Seated dumbbell calf raise",
        props: [CALF_CHAIR, CALF_BOOK],
        hold: { L: true, R: true, axis: "z" },
        highlight: ["calves"],
        camera: { view: [1, 0.22, 0.35], target: [0, 0.68, 0.25], dist: 3.4 },
        keys: [
          { t: 0, p: seatedCalf(-12), cue: "Balls of the feet on a book, dumbbells on your knees" },
          { t: 0.6, p: seatedCalf(-12), cue: "Raise the heels as high as you can" },
          { t: 1.25, p: seatedCalf(11), e: "in" },
          { t: 1.9, p: seatedCalf(34), e: "out", cue: "Pause at the top" },
          { t: 2.5, p: seatedCalf(34), cue: "Lower to a full stretch" },
          { t: 3.3, p: seatedCalf(11), e: "in" },
          { t: 4.1, p: seatedCalf(-12), e: "out" },
        ],
      },
      {
        title: "Single-leg calf raise on a step",
        props: [CALF_STEP, CALF_WALL],
        highlight: ["calves", "ankles"],
        camera: { view: [1, 0.2, -0.5], target: [0, 1.0, 0.15], dist: 4.6 },
        alternate: true,
        keys: [
          { t: 0, p: stepCalf(0, false), cue: "Hands on the wall; stand on the step edge" },
          { t: 0.7, p: stepCalf(-20), cue: "Lift the free foot; 2 s up, as high as you can" },
          { t: 1.7, p: stepCalf(7), e: "in" },
          { t: 2.7, p: stepCalf(34), e: "out" },
          { t: 3.0, p: stepCalf(34), cue: "2 s down to a full stretch" },
          { t: 4.0, p: stepCalf(7), e: "in" },
          { t: 5.0, p: stepCalf(-20), e: "out", cue: "Switch legs" },
          { t: 5.6, p: stepCalf(0, false) },
        ],
      },
    ],
  },

  swing: {
    clips: [
      {
        title: "Dumbbell swing",
        hold: { both: true },
        highlight: ["glutes", "hamstrings", "core"],
        camera: { view: "side", target: [0, 0.92, 0.15], dist: 4.0 },
        keys: [
          // Three swings per loop, one cue per swing (top → hike → snap → float).
          { t: 0, p: swing("top"), cue: "Hinge back: it passes between the thighs" },
          { t: 0.45, p: swing("drop"), e: "in" },
          { t: 0.9, p: swing("hike"), e: "out" },
          { t: 1.25, p: swing("snap"), e: "in" },
          { t: 1.8, p: swing("top"), e: "out", cue: "Snap the hips: it floats to chest height" },
          { t: 2.25, p: swing("drop"), e: "in" },
          { t: 2.7, p: swing("hike"), e: "out" },
          { t: 3.05, p: swing("snap"), e: "in" },
          { t: 3.6, p: swing("top"), e: "out", cue: "Snap your hips forward without squatting; keep your arms relaxed" },
          { t: 4.05, p: swing("drop"), e: "in" },
          { t: 4.5, p: swing("hike"), e: "out" },
          { t: 4.85, p: swing("snap"), e: "in" },
          { t: 5.4, p: swing("top"), e: "out" },
        ],
      },
    ],
  },

  lunge: {
    clips: [
      {
        title: "Reverse lunge with dumbbells",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["quads", "glutes"],
        camera: { view: "side", target: [0, 0.9, -0.2], dist: 4.0 },
        alternate: true,
        keys: [
          { t: 0, p: lunge("stand"), cue: "Stand tall, dumbbells at your sides" },
          { t: 0.6, p: lunge("stand"), cue: "Step one foot back" },
          { t: 1.2, p: lunge("lift") },
          { t: 1.6, p: lunge("land"), cue: "Torso tall, back knee down almost to the floor" },
          { t: 3.0, p: lunge("bottom") },
          { t: 3.3, p: lunge("bottom"), cue: "Push through the front foot to stand" },
          { t: 4.4, p: lunge("land") },
          { t: 4.9, p: lunge("lift") },
          { t: 5.4, p: lunge("stand") },
        ],
      },
    ],
  },

  stepup: {
    clips: [
      {
        title: "Step-up onto a low aerobic step",
        props: [BOX],
        highlight: ["quads", "glutes"],
        camera: { view: [1, 0.22, 0.4], target: [0, 0.98, 0.3], dist: 4.3 },
        alternate: true,
        keys: stepUpKeys(null, ["Use a low, stable aerobic step", "Drive up through that leg, no push-off", "Lower slowly"]),
      },
      {
        title: "Step-up holding dumbbells",
        props: [BOX],
        hold: { L: true, R: true, axis: "z" },
        highlight: ["quads", "glutes"],
        camera: { view: [1, 0.22, 0.4], target: [0, 0.98, 0.3], dist: 4.3 },
        alternate: true,
        keys: stepUpKeys("dumbbells", ["Dumbbells at your sides, low stable step", "Push up quickly through the leg on the step", "Lower slowly, keeping control"]),
      },
    ],
  },
};
