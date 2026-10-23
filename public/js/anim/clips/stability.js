// Animations for the standing stability exercises (side bend, Pallof press, single-leg RDL, Jefferson curl).
import { ANKLE_Y, ARM, FOOT_X, STAND_Y, joints, stand, transition } from "../poses.js";
import { makePose, mirrorPose } from "../rig.js";

// Linear blend of two points.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// One-sided clips (alternate: true) whose setup isn't symmetric put their second key at SWITCH,
// so the mirrored half starts with a clean one-frame cut instead of a morph across sides.
const SWITCH = 0.001;

// Turns a pose `deg` about the vertical axis through the origin, then shifts it
// (root, world IK targets and poles move with it).
function turn(p, deg, shift = [0, 0, 0]) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dir = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  const pos = (v) => dir(v).map((x, i) => x + shift[i]);
  const rot = p.rot || [0, 0, 0];
  const out = { ...p, root: pos(p.root), rot: [rot[0], rot[1] + deg, rot[2]] };
  for (const k of ["footL", "footR"]) if (p[k]) out[k] = pos(p[k]);
  for (const k of ["kneeL", "kneeR"]) if (p[k]) out[k] = dir(p[k]);
  if (!p.handsIn || p.handsIn === "world") {
    for (const k of ["handL", "handR"]) if (p[k]) out[k] = pos(p[k]);
    for (const k of ["elbowL", "elbowR"]) if (p[k]) out[k] = dir(p[k]);
  }
  return out;
}

// ---------- dumbbell side bend ----------
// Dumbbell in the right hand, left hand on the waist. The spine bends straight to the right
// (no twist, no forward lean) while the hips shift a little left; the dumbbell slides down
// the outside of the leg.
function sidebend(d) {
  const p = { ...stand({ root: [0.035 * d, STAND_Y - 0.004 - 0.01 * d, 0] }), footL: [0.13, ANKLE_Y, 0], footR: [-0.13, ANKLE_Y, 0], spine: [0, 40 * d, 0], lumbar: [0, 14 * d, 0], neck: [0, 0] };
  const J = joints(p);
  const sh = J.shoulderR;
  const hx = -0.245 + 0.02 * d; // the dumbbell slides down just outside the thigh
  const dx = hx - sh.x, dz = 0.02;
  const hang = [hx, sh.y - Math.sqrt((ARM * 0.985) ** 2 - dx * dx - dz * dz), sh.z + dz];
  return {
    ...p,
    handsIn: "world",
    handR: hang,
    elbowR: [-0.3, 0, -1],
    handL: [p.root[0] + 0.165, p.root[1] + 0.1, 0.02],
    elbowL: [1, 0, -0.3],
    palmL: [-1, 0, 0],
    fingersL: [0, -1, 0],
  };
}

// ---------- band Pallof press ----------
// Built facing +Z with the door on the left, then turned to face +X: mirrored for the other
// side the figure faces −X, so the door stays put and the press always runs across the view.
// Hands at the sternum (chest frame) press straight out; the trunk doesn't rotate.
const PALLOF_DOOR = { type: "door", pos: [0, 0, -0.85], w: 0.86, anchorH: 1.27, anchorX: 0 };
const PALLOF_ANCHOR = [0, 1.27, -0.79];
function pallof(out) {
  const h = mix([0.028, -0.2, 0.2], [0.028, -0.17, 0.5], out);
  const p = {
    root: [0, STAND_Y - 0.03, 0],
    footL: [0.15, ANKLE_Y, 0],
    footR: [-0.15, ANKLE_Y, 0],
    turnout: 12,
    kneeL: [0.3, 0, 1],
    kneeR: [-0.3, 0, 1],
    rot: [4, 0, 0],
    spine: [-2, 0, 0],
    shrugL: [0, 0.012 * out],
    shrugR: [0, 0.012 * out],
    handsIn: "chest",
    handL: h,
    handR: [-h[0], h[1], h[2]],
    elbowL: [0.6, -1, -0.3],
    elbowR: [-0.6, -1, -0.3],
  };
  return turn(p, 90, [-0.17, 0, 0]);
}

// ---------- single-leg RDL / toe touch ----------
// From standing on both feet: weight onto the left leg, the right toe lifts just off the floor
// behind, then a hip hinge with a flat back; the right leg rises straight, in line with the
// torso, and the right hand reaches toward the left foot. Both feet stay IK (one is just lifted).
const SL_PITCH = 88;
const SL_ROOT = [0.06, 0.885, -0.11]; // bottom: hips back, standing knee soft
function slrdl(phase, { bothHands = false } = {}) {
  // phase 0 = both feet down, 1 = on the left leg, 2 = bottom of the hinge
  const lift = Math.min(phase, 1), h = Math.max(phase - 1, 0);
  const root = mix([0.06 * lift, STAND_Y - 0.004 - 0.008 * lift, 0], SL_ROOT, h);
  const a = (15 + (SL_PITCH - 15) * h) * Math.PI / 180;
  const length = 0.828 + 0.034 * h;
  const p = {
    root,
    rot: [SL_PITCH * h, 0, 0],
    spine: [bothHands ? 0 : 24 * h, 0, 0],
    neck: [-14 * h, 0],
    footL: [FOOT_X, ANKLE_Y, 0],
    kneeL: [0.1, 0, 1],
    footR: h > 0 ? [root[0] - 0.095, root[1] - length * Math.cos(a), root[2] - length * Math.sin(a)] : mix([-FOOT_X, ANKLE_Y, 0], [-0.12, 0.135, -0.22], lift),
    toeR: 25 * lift + 65 * h,
    kneeR: [0, -0.3 * h, 1 - 1.3 * h],
  };
  // Both hands IK so the two-footed start is mirror-symmetric: they hang at the sides, then the
  // right hand reaches toward the left foot (or both hands hang below the shoulders for RDL).
  const J = joints(p);
  const hangL = [J.shoulderL.x + 0.015 + 0.03 * lift, J.shoulderL.y - ARM * 0.985, J.shoulderL.z + 0.03];
  const hangR = [J.shoulderR.x - 0.015, J.shoulderR.y - ARM * 0.985, J.shoulderR.z + 0.03];
  const outL = bothHands ? [J.shoulderL.x - 0.03, J.shoulderL.y - 0.53, J.shoulderL.z - 0.04] : [J.shoulderL.x + 0.2, J.shoulderL.y - 0.5, J.shoulderL.z - 0.06];
  const reach = new (J.shoulderR.constructor)(0.11 - J.shoulderR.x, 0.12 - J.shoulderR.y, 0.02 - J.shoulderR.z).normalize();
  const outR = bothHands ? [J.shoulderR.x + 0.03, J.shoulderR.y - 0.53, J.shoulderR.z - 0.04] : J.shoulderR.clone().addScaledVector(reach, 0.54).toArray();
  return {
    ...p,
    handsIn: "world",
    handL: mix(hangL, outL, h),
    handR: mix(hangR, outR, h),
    elbowL: [0.4, 0.2, -1],
    elbowR: [-0.4, 0.2, -1],
  };
}

// ---------- Jefferson curl ----------
// On a step, legs straight, a light dumbbell in both hands. Chin tucks first, then the spine
// rolls down and only then the hips fold; rolling up the hips come back first, the head last.
const JC_STEP = { type: "step", pos: [0, 0, 0.02], w: 0.62, d: 0.34, h: 0.18 };
const JC_FOOT_Y = JC_STEP.h + ANKLE_Y;
function jefferson(neck, flex, pitch, back = 0) {
  const p = {
    root: [0, JC_FOOT_Y + Math.sqrt(0.866 ** 2 - back * back), -back],
    rot: [pitch, 0, 0],
    spine: [flex, 0, 0],
    lumbar: [Math.max(0, flex - 24) * 0.5, 0, 0],
    neck: [neck, 0],
    head: [neck * 0.25, 0],
    tuck: 0.02 * Math.min(1, neck / 30),
    footL: [0.1, JC_FOOT_Y, 0],
    footR: [-0.1, JC_FOOT_Y, 0],
  };
  // Both hands on the dumbbell, hanging below the shoulders. Upright, the elbows stay soft and
  // the hands rest in front of the thighs; rolled down, the arms hang straight to the floor.
  const J = joints(p);
  const up = Math.max(0, 1 - (pitch + flex) / 60);
  const y = J.shoulderL.y - 0.5 + 0.04 * up;
  const z = (J.shoulderL.z + J.shoulderR.z) / 2 + 0.03 + 0.15 * up;
  return { ...p, handsIn: "world", handL: [0.045, y, z], handR: [-0.045, y, z], elbowL: [1, -0.25, -0.35], elbowR: [-1, -0.25, -0.35] };
}

export default {
  sidebend: {
    clips: [
      {
        title: "Dumbbell side bend",
        hold: { R: true, axis: "z" },
        highlight: ["obliques", "core"],
        camera: { view: "front", target: [0, 0.95, 0], dist: 3.7 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: sidebend(0), cue: "Dumbbell in one hand, other hand on your waist" },
          { t: SWITCH, p: sidebend(0), e: "hold" },
          { t: 0.5, p: sidebend(0), cue: "Bend straight to the side, no twisting" },
          ...transition(sidebend, 0, 1, 0.5, 2.5, "Squeeze the other side to come back up"),
          ...transition(sidebend, 1, 0, 2.5, 4.299, "Switch sides"),
          { t: 4.3, p: mirrorPose(makePose(sidebend(0))), e: "hold" },
        ],
      },
    ],
  },

  pallof: {
    clips: [
      {
        title: "Band Pallof press",
        props: [PALLOF_DOOR],
        bands: [{ a: PALLOF_ANCHOR, b: "handL" }],
        highlight: ["core", "obliques"],
        camera: { view: [0, 1.05, 1], target: [0, 0.85, -0.25], dist: 4.0 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: pallof(0), cue: "Side-on to the door, band at your sternum" },
          { t: SWITCH, p: pallof(0), e: "hold" },
          { t: 0.5, p: pallof(0), cue: "Press the hands straight out" },
          { t: 1.5, p: pallof(1), cue: "Hold 2 s, don't let the band turn you" },
          { t: 3.5, p: pallof(1), cue: "Bring the hands back slowly" },
          { t: 4.999, p: pallof(0), cue: "Switch sides" },
          { t: 5.0, p: mirrorPose(makePose(pallof(0))), e: "hold" },
        ],
      },
    ],
  },

  slrdl: {
    clips: [
      {
        title: "Single-leg toe touch",
        highlight: ["hamstrings", "glutes", "ankles"],
        camera: { view: "side", target: [0, 0.78, -0.22], dist: 4.4 },
        alternate: true,
        keys: [
          { t: 0, p: slrdl(0), cue: "Stand tall, then shift onto one leg" },
          { t: 0.8, p: slrdl(1), cue: "Reach the opposite hand toward your standing foot" },
          ...transition(slrdl, 1, 2, 0.8, 3.0, "Back leg rises; hips stay square"),
          { t: 3.5, p: slrdl(2), cue: "Squeeze the glute to stand back up" },
          ...transition(slrdl, 2, 1, 3.5, 5.5),
          { t: 6.2, p: slrdl(0), cue: "Switch legs" },
        ],
      },
      {
        title: "Single-leg RDL",
        highlight: ["hamstrings", "glutes", "lowerBack"],
        camera: { view: [0.85, 0.22, 0.5], target: [0, 0.78, -0.18], dist: 4.4 },
        alternate: true,
        keys: [
          { t: 0, p: slrdl(0, { bothHands: true }), cue: "Stand on one leg with a soft knee, spine long" },
          { t: 0.8, p: slrdl(1, { bothHands: true }), cue: "Hinge from the hip, both hands tracking below the shoulders" },
          ...transition((v) => slrdl(v, { bothHands: true }), 1, 2, 0.8, 3.0, "Torso and back leg form a straight line"),
          { t: 3.5, p: slrdl(2, { bothHands: true }), cue: "Drive the hips forward to stand tall" },
          ...transition((v) => slrdl(v, { bothHands: true }), 2, 1, 3.5, 5.5),
          { t: 6.2, p: slrdl(0, { bothHands: true }), cue: "Switch legs" },
        ],
      },
    ],
  },

  jefferson: {
    clips: [
      {
        title: "Jefferson curl",
        props: [JC_STEP],
        hold: { both: true },
        highlight: ["lowerBack", "back", "hamstrings"],
        camera: { view: "side", target: [0, 0.9, 0.05], dist: 4.2 },
        keys: [
          { t: 0, p: jefferson(0, 0, 0), cue: "On a step, legs straight, light weight" },
          { t: 0.6, p: jefferson(0, 0, 0), cue: "Tuck your chin, roll down slowly" },
          { t: 1.7, p: jefferson(38, 14, 0), e: "in" },
          { t: 2.8, p: jefferson(40, 52, 8, 0.04), e: "lin" },
          { t: 4.0, p: jefferson(42, 90, 66, 0.2), e: "out", cue: "Hang 2–3 s, let the weight pull you down" },
          { t: 6.5, p: jefferson(42, 90, 66, 0.2), cue: "Roll up slowly from your lower back, lifting your head last" },
          { t: 7.6, p: jefferson(42, 74, 22, 0.08), e: "in" },
          { t: 8.7, p: jefferson(38, 26, 0), e: "lin" },
          { t: 9.8, p: jefferson(0, 0, 0), e: "out" },
        ],
      },
    ],
  },
};
