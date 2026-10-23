// Animations for the posture exercises. Keyed by exercise id (see data/exercises.js).
// Most of these are small head and shoulder-blade motions, so cameras sit close to the
// shoulders. Pose fields used a lot here: tuck (head glide back), neck/head (pitch),
// shrugL/R ([up, forward] of the shoulder girdle) and spine flexion for slouching.
import { ANKLE_Y, D2R, DIM, FOOT_X, STAND_Y, joints, stand, transition } from "../poses.js";
import { makePose, mirrorPose } from "../rig.js";

// Keys for one smooth move through n intermediate poses, poseAt(u) for u = 1/n … 1.
// The first segment eases in, the middle ones are linear and the last eases out, with
// durations chosen so the speed never jumps. Used where a straight blend between two
// poses would cut a corner (arms sweeping along a wall). endCue goes on the final key.
function sweep(t0, dur, n, poseAt, endCue) {
  const lin = dur / (Math.PI + n - 2);
  const end = (Math.PI / 2) * lin;
  const keys = [];
  let t = t0;
  for (let i = 1; i <= n; i++) {
    t += i === 1 || i === n ? end : lin;
    keys.push({ t: +t.toFixed(3), p: poseAt(i / n), e: "smooth" });
  }
  if (endCue) keys[n - 1].cue = endCue;
  return keys;
}

// Arms hanging relaxed (FK), compensating the chest pitch so they hang plumb.
function relaxedArms(chestPitch = 0, o = {}) {
  const { flex = 0, abd = 7, elbow = 10, rot = 0 } = o;
  const a = [flex - chestPitch, abd, elbow, rot];
  return { armL: a, armR: a.slice() };
}

const shrug = (up, fwd) => ({ shrugL: [up, fwd], shrugR: [up, fwd] });

// ---------- string reset ----------
// Slumped (sway-back): hips drift forward, the trunk sags back and the upper back rounds,
// the head pokes forward with the chin lifted so the eyes stay level, shoulders roll forward.
function slouched() {
  return stand({
    root: [0, STAND_Y - 0.01, 0.045],
    rot: [-13, 0, 0],
    spine: [25, 0, 0],
    neck: [15, 0],
    head: [-27, 0], // rot + spine + neck + head = 0: eyes level
    tuck: -0.015,
    ...shrug(-0.006, 0.035),
    ...relaxedArms(12, { rot: -25, elbow: 14 }),
  });
}
// Tall: the string lifts the crown. breath 0…1 lifts the chest a touch.
function tall(breath = 0, settle = 1) {
  return stand({
    spine: [-3 * breath, 0, 0],
    tuck: 0.008,
    ...shrug(-0.008 * settle + 0.003 * breath, -0.014 * settle),
    ...relaxedArms(-3 * breath),
  });
}

// ---------- chin tuck ----------
// The head glides straight back (no nod), d = 0…1. Slightly exaggerated so it reads.
function chinTuck(d) {
  return stand({ tuck: 0.04 * d, neck: [-3 * d, 0], head: [3 * d, 0] });
}

// ---------- wall slide ----------
// Pelvis, upper back and head touch the wall (surface at WALL_Z); heels a small step out.
const WALL_Z = -0.16;
const WALL = { type: "wall", pos: [0, 0, WALL_Z - 0.025], w: 1.7, h: 2.3 };
function wallBody(sh) {
  return {
    root: [0, STAND_Y - 0.012, WALL_Z + 0.1176],
    rot: [-2, 0, 0], // leaning back on the wall
    tuck: 0.01,
    footL: [FOOT_X, ANKLE_Y, WALL_Z + 0.19],
    footR: [-FOOT_X, ANKLE_Y, WALL_Z + 0.19],
    shrugL: sh,
    shrugR: sh.slice(),
  };
}
// Backs of the upper arms and forearms flat on the wall: upper arm `up`° from hanging
// (in the wall plane), forearm `fore`° out from vertical. Wrist targets plus elbow poles.
function wallArms(p, up, fore) {
  const J = joints(p);
  const out = { ...p, handsIn: "world" };
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    const S = J["shoulder" + side];
    const ez = WALL_Z + 0.09, wz = WALL_Z + 0.035; // elbow and wrist centres, limb radius off the wall
    const ru = Math.sqrt(DIM.upperArm ** 2 - (ez - S.z) ** 2);
    const E = [S.x + s * ru * Math.sin(up * D2R), S.y - ru * Math.cos(up * D2R), ez];
    const rf = Math.sqrt(DIM.forearm ** 2 - (wz - ez) ** 2);
    out["hand" + side] = [E[0] + s * rf * Math.sin(fore * D2R), E[1] + rf * Math.cos(fore * D2R), wz];
    out["elbow" + side] = [E[0] - S.x, E[1] - S.y, E[2] - S.z];
    out["palm" + side] = [0, 0, 1];
    out["fingers" + side] = [s * Math.sin(fore * D2R), Math.cos(fore * D2R), 0];
  }
  return out;
}
// u = 0: low W (elbows by the ribs, forearms vertical); u = 1: Y overhead.
function wallSlide(u) {
  const sh = [-0.012 + 0.032 * u * u, -0.02 + 0.02 * u];
  return wallArms(wallBody(sh), 40 + 108 * u, 30 * u);
}

// ---------- band pull-apart ----------
// a = 0: arms straight in front at shoulder height, hands shoulder-width; a = 1: band on the chest.
function pullApart(a) {
  const arm = [90, 74.5 * a, 4, 0]; // flex 90 + abduction sweeps the arm level at shoulder height
  return stand({ armL: arm, armR: arm.slice(), spine: [-2 * a, 0, 0], lumbar: [0, 0, 0], tuck: 0.008, ...shrug(-0.006 * a, -0.03 * a) });
}

// ---------- levator shrug ----------
// Elbows slightly bent and pulled back; the shoulder girdle moves up and slightly forward.
function levator(up, fwd) {
  const arm = [-10, 6, 18, 0];
  return stand({ tuck: 0.01, armL: arm, armR: arm.slice(), ...shrug(up, fwd) });
}
const SET = [-0.01, -0.02]; // shoulders back and down
const TOP = [0.045, 0.012]; // up toward the ears, slightly forward

// ---------- band face pull ----------
// A closed door in front; the band is looped round an anchor at face height (rotY 180 turns
// the anchor side toward the figure) and both ends are held.
const DOOR_Z = 1.12;
const DOOR = { type: "door", pos: [0, 0, DOOR_Z], rotY: 180, anchorH: 1.66 };
const ANCHOR = [0, 1.66, DOOR_Z - 0.07];
const mirrorX = (v) => [-v[0], v[1], v[2]];
function faceArms(hand, pole, sh) {
  return stand({ tuck: 0.01, ...shrug(...sh), handsIn: "world", handL: hand, handR: mirrorX(hand), elbowL: pole, elbowR: mirrorX(pole) });
}
function facePull(pull) {
  const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * pull);
  const wrist = [0, 0, -35 * pull];
  return { ...faceArms(mix([0.075, 1.585, 0.535], [0.26, 1.69, 0.06]), mix([1, -0.4, -0.1], [1, 0.05, -0.35]), mix([0.004, 0.028], [-0.006, -0.03])), wristL: wrist, wristR: wrist };
}

// ---------- side-lying external rotation ----------
// Lying on the right side, knees bent and stacked, head on a cushion. The top (left) elbow
// stays on the ribs at 90°; r rotates the forearm from across the belly (−) up toward the
// ceiling (+). Shoulder, hip, knee and ankle of the bottom side all rest on the floor.
const CONTACT_R = { shoulderR: 0.062, hipR: 0.095, kneeR: 0.052, ankleR: 0.052 };
function onFloor(p) {
  const J = joints(p);
  let low = Infinity;
  for (const [n, r] of Object.entries(CONTACT_R)) low = Math.min(low, J[n].y - r);
  return { ...p, root: [p.root[0], p.root[1] - low + 0.012, p.root[2]] };
}
function sideLying(r) {
  const p = onFloor({
    root: [0.06, 0.3, 0],
    rot: [0, 0, 83.5], // on the right side; the wider shoulders lift the chest end a little
    neck: [4, 0],
    legL: [40, -11, 105, 20], // top knee resting on the bottom knee
    legR: [40, -1, 105, 20],
    armL: [0, 7, 90, r], // elbow at the ribs (7° keeps the upper arm off the chest mesh)
    armR: [90, 4, 40, 0], // bottom arm resting forward on the floor
  });
  const J = joints(p);
  return { ...p, handsIn: "world", handR: [J.wristR.x, 0.05, J.wristR.z], elbowR: [0.5, 0, -0.5], palmR: [0, 1, 0], fingersR: [0, 0, 1] };
}
// A cushion exactly under the head (the neck has no side bend to lower it onto the arm).
const CUSHION = (() => {
  const J = joints(sideLying(0));
  const e = J.Rh.elements; // world "down" in head space → lowest point of the head ellipsoid
  const drop = Math.hypot(0.094 * e[1], 0.113 * e[5], 0.104 * e[9]);
  return { type: "step", pos: [J.head.x - 0.01, 0, J.head.z], w: 0.24, d: 0.34, h: +(J.head.y - drop).toFixed(3) };
})();
const LIE_MAT = { type: "mat", pos: [0.05, 0, 0.12], rotY: 90, w: 0.7, d: 1.85 };

// Lean over the raised knee; rotate the forearm around an elbow resting on that knee.
function elbowOnKnee(rotation) {
  const body = { root: [-0.04, 0.87, -0.16], rot: [41.3, 0, 0], neck: [-12, 0], footR: [-FOOT_X, ANKLE_Y, 0], footL: [0.14, 0.42 + ANKLE_Y, 0.28], kneeL: [0.2, 0, 1], armR: [12, 8, 12, 0] };
  const J = joints(body), S = J.shoulderL;
  const axis = J.kneeL.clone().add({ x: 0, y: 0.065, z: 0 }).sub(S).normalize();
  const elbow = S.clone().addScaledVector(axis, DIM.upperArm);
  const fore = axis.clone().set(0, 0, 1).addScaledVector(axis, -axis.z).normalize();
  fore.applyAxisAngle(axis, rotation * D2R);
  const wrist = elbow.clone().addScaledVector(fore, DIM.forearm);
  return { ...body, handsIn: "world", handL: wrist.toArray(), elbowL: elbow.clone().sub(S).toArray() };
}

// ---------- neck: forehead resistance ----------
// Left palm on the forehead. ext 0…1 tips the head back up to about 30° (the hand follows).
function headTip(ext) {
  return { tuck: 0.012 * (1 - ext), neck: [3 - 15 * ext, 0], head: [4 - 22 * ext, 0] };
}
// Keep the palm on the forehead and the fingers pointing up as the head tilts.
function handOnHead(p, local, pole) {
  const q = { ...p, handsIn: "world", elbowL: pole };
  const J0 = joints(q);
  const offset = J0.head.clone().set(...local).applyMatrix4(J0.Rh); // head-space offset → world
  const target = J0.head.clone().add(offset);
  const fingers = J0.head.clone().set(0, 1, 0).transformDirection(J0.Rh);
  const palm = J0.head.clone().set(0, 0, 1).transformDirection(J0.Rh);
  const wrist = target.addScaledVector(fingers, -DIM.hand * 0.55).addScaledVector(palm, 0.018);
  return { ...q, handL: wrist.toArray(), palmL: palm.toArray(), fingersL: fingers.toArray() };
}
const FOREHEAD = [0, 0.025, 0.114]; // a palm's thickness in front of the forehead
const ELBOW_OUT = [1, -0.45, 0.5]; // elbow forward and out to the side
// IK version (wrist target + elbow pole) of an FK left-arm pose, so every key uses IK.
function leftArmIK(base, arm) {
  const J = joints({ ...base, armL: arm });
  const pole = J.elbowL.clone().sub(J.shoulderL);
  return { ...base, handsIn: "world", handL: J.wristL.toArray(), elbowL: pole.toArray(), palmL: J.handRefL.toArray(), fingersL: J.handDirL.toArray() };
}
// hand: 0 = arm hanging, 0.5 = rising in front of the chest, 1 = palm on the forehead.
function neckPose(ext, hand = 1) {
  const base = stand({ ...headTip(ext), ...shrug(-0.004, -0.008) });
  if (hand === 1) return handOnHead(base, FOREHEAD, ELBOW_OUT);
  return leftArmIK(base, hand === 0.5 ? [55, 25, 115, 0] : [0, 7, 10, 0]);
}

// ---------- doorway chest stretch ----------
// Forearms flat on the front face of the door-frame posts, elbows at shoulder height and bent
// 90°. Elbows sit so the shoulders start ~10 cm behind them and end ~10 cm in front: the
// forearms then stay put on the frame as the body steps and leans through.
const FRAME_Z = 0.3;
const FRAME = { type: "doorframe", pos: [0, 0, FRAME_Z], w: 0.86, h: 2.05 };
const ARM_Z = FRAME_Z - 0.07 - 0.034; // forearm centre line, one radius off the post face
const ELBOW_X = DIM.shoulderX + Math.sqrt(DIM.upperArm ** 2 - 0.1 ** 2);
const ELBOW_Y = STAND_Y + DIM.lumbar + DIM.thoracic + DIM.chest + DIM.shoulderY; // standing shoulder height
const Z0 = ARM_Z - 0.09; // pelvis at the start
// step: front (left) foot through the door; lift: foot in the air mid-step; lean 0…1.
function doorway({ step = 0, lift = 0, lean = 0, breath = 0 } = {}) {
  const p = {
    // Hips move forward between the feet and drop a little so both legs reach the floor.
    root: [0, STAND_Y - 0.004 - 0.034 * step, Z0 + 0.1 * step + 0.065 * lean],
    rot: [4 * lean, 0, 0],
    spine: [1.5 * lean - 1.5 * breath, 0, 0], // ribs down; the breath lifts the chest a touch
    tuck: 0.008,
    ...shrug(0.003 * breath, -0.012 * lean),
    footL: [FOOT_X, ANKLE_Y + 0.08 * lift, Z0 + 0.34 * step],
    footR: [-FOOT_X, ANKLE_Y, Z0],
    toeL: -10 * lift,
  };
  // Wrists fixed on the posts; poles aim the elbows at their spot on the frame.
  const J = joints(p);
  const E = [ELBOW_X, ELBOW_Y, ARM_Z];
  const pole = (S, s) => [s * E[0] - S.x, E[1] - S.y, E[2] - S.z];
  return {
    ...p,
    handsIn: "world",
    handL: [ELBOW_X, ELBOW_Y + DIM.forearm, ARM_Z],
    handR: [-ELBOW_X, ELBOW_Y + DIM.forearm, ARM_Z],
    palmL: [0, 0, -1],
    palmR: [0, 0, -1],
    fingersL: [0, 1, 0],
    fingersR: [0, 1, 0],
    elbowL: pole(J.shoulderL, 1),
    elbowR: pole(J.shoulderR, -1),
  };
}

export default {
  string: {
    clips: [
      {
        title: "String reset",
        effects: ["string"],
        highlight: ["neck", "upperBack"],
        camera: { view: [1, 0.12, 0.08], target: [0, 1.02, 0.03], dist: 3.6 },
        keys: [
          // A key's cue shows while the move that starts at that key plays.
          { t: 0, p: slouched(), cue: "Slumped: head forward, back rounded" },
          { t: 0.8, p: slouched(), cue: "Imagine a string lifting the top of your head; chin level, neck long" },
          { t: 2.6, p: tall(0, 0), cue: "Shoulders settle down and back" },
          { t: 3.6, p: tall(0), cue: "Slow breath in…" },
          { t: 5.2, p: tall(1), cue: "…and out (1 of 3)" },
          { t: 7.0, p: tall(0), cue: "Breathe in, stay tall" },
          { t: 8.6, p: tall(1), cue: "…and out (2 of 3)" },
          { t: 10.4, p: tall(0), cue: "Breathe in" },
          { t: 12.0, p: tall(1), cue: "…and out (3 of 3)" },
          { t: 13.8, p: tall(0), cue: "Repeat every time you sit down at the desk" },
        ],
        closeTime: 1.4,
      },
    ],
  },

  chintuck: {
    clips: [
      {
        title: "Chin tuck",
        highlight: ["neck"],
        camera: { view: [1, 0.1, 0.06], target: [0, 1.52, 0.0], dist: 1.75 },
        keys: [
          { t: 0, p: chinTuck(0), cue: "Stand tall, eyes level" },
          { t: 0.6, p: chinTuck(0), cue: "Slide your head straight back to make a slight double chin" },
          ...transition(chinTuck, 0, 1, 0.6, 1.8, "Hold 3 s; don't nod down"),
          { t: 4.8, p: chinTuck(1), cue: "Release slowly" },
          ...transition(chinTuck, 1, 0, 4.8, 6.4),
        ],
      },
    ],
  },

  wallslide: {
    clips: [
      {
        title: "Wall slides",
        props: [WALL],
        highlight: ["upperBack", "shoulders"],
        camera: { view: [0.85, 0.2, 0.75], target: [0, 1.06, -0.05], dist: 4.0 },
        keys: [
          { t: 0, p: wallSlide(0), cue: "Head, upper back and buttocks on the wall" },
          { t: 0.8, p: wallSlide(0), cue: "Forearms on the wall: slide up into a Y" },
          ...sweep(0.8, 2.6, 5, (u) => wallSlide(u)),
          { t: 3.8, p: wallSlide(1), cue: "Pull the elbows down toward the ribs" },
          ...sweep(3.8, 2.6, 5, (u) => wallSlide(1 - u), "Squeeze the blades, ribs down; slow reps"),
          { t: 7.2, p: wallSlide(0) },
        ],
      },
    ],
  },

  pullapart: {
    clips: [
      {
        title: "Band pull-apart",
        bands: [{ a: "handL", b: "handR" }],
        highlight: ["upperBack", "shoulders"],
        camera: { view: [0.5, 0.45, 1], target: [0, 1.25, 0.1], dist: 3.5 },
        keys: [
          { t: 0, p: pullApart(0), cue: "Arms straight at shoulder height, hands shoulder-width" },
          { t: 0.5, p: pullApart(0), cue: "Pull the band apart and squeeze your shoulder blades" },
          ...transition(pullApart, 0, 1, 0.5, 1.8, "Shoulders down, away from the ears; pause 1 s"),
          { t: 2.8, p: pullApart(1), cue: "Return slowly" },
          ...transition(pullApart, 1, 0, 2.8, 4.4),
        ],
      },
    ],
  },

  levator: {
    clips: [
      {
        title: "Shoulders up and out",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["neck", "upperBack"],
        camera: { view: [0.9, 0.2, 0.6], target: [0, 1.25, 0], dist: 2.6 },
        keys: [
          { t: 0, p: levator(...SET), cue: "Stand tall, neck long, shoulders back and down" },
          { t: 0.6, p: levator(...SET), cue: "Lift up and out toward the ears, elbows back" },
          { t: 1.8, p: levator(...TOP), cue: "Pause 1 s" },
          { t: 2.8, p: levator(...TOP), cue: "Lower slowly" },
          { t: 5.0, p: levator(...SET) },
        ],
      },
    ],
  },

  facepull: {
    clips: [
      {
        title: "Band face pull",
        props: [DOOR],
        bands: [{ a: ANCHOR, b: "handL" }, { a: ANCHOR, b: "handR" }],
        highlight: ["upperBack", "rotatorCuff", "shoulders"],
        camera: { view: [0.3, 0.32, -1], target: [0, 1.42, 0.45], dist: 3.3 },
        keys: [
          { t: 0, p: facePull(0), cue: "Band at face height, arms long, stand tall" },
          { t: 0.5, p: facePull(0), cue: "Pull toward your eyes, elbows high" },
          ...transition(facePull, 0, 1, 0.5, 1.7, "Point your thumbs back; squeeze your shoulder blades for 1 s"),
          { t: 2.7, p: facePull(1), cue: "Slow return; stay tall" },
          ...transition(facePull, 1, 0, 2.7, 4.7),
        ],
      },
    ],
  },

  extrot: {
    clips: [
      {
        title: "Elbow-on-knee external rotation",
        props: [{ type: "bench", pos: [0.14, 0, 0.28], w: 0.42, d: 0.42, h: 0.42 }],
        hold: { L: true, axis: "wx" },
        highlight: ["rotatorCuff", "shoulders"],
        camera: { view: [0.75, 0.25, 0.85], target: [0, 1.05, 0.1], dist: 3.6 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: elbowOnKnee(-55), cue: "Prop one foot up and rest your elbow on the knee at 90°" },
          { t: 0.001, p: elbowOnKnee(-55), e: "hold" },
          { t: 0.6, p: elbowOnKnee(-55), cue: "Rotate the forearm up and back" },
          ...transition(elbowOnKnee, -55, 50, 0.6, 1.8),
          { t: 2.2, p: elbowOnKnee(50), cue: "Lower slowly in 2–3 s, shoulder blade down" },
          ...transition(elbowOnKnee, 50, -55, 2.2, 4.69),
          { t: 4.7, p: mirrorPose(makePose(elbowOnKnee(-55))), e: "hold" },
        ],
      },
      {
        title: "Side-lying external rotation",
        props: [LIE_MAT, CUSHION],
        hold: { L: true, axis: "wx" },
        highlight: ["rotatorCuff"],
        camera: { view: [0.55, 0.6, 1], target: [0, 0.3, 0.1], dist: 3.7 },
        alternate: true,
        close: false,
        keys: [
          // The held mirrored endpoint switches with the mirrored equipment at each half.
          { t: 0, p: sideLying(-45), cue: "On your side, top elbow pinned to the ribs at 90°" },
          { t: 0.001, p: sideLying(-45), e: "hold", cue: "On your side, top elbow pinned to the ribs at 90°" },
          { t: 0.6, p: sideLying(-45), cue: "Rotate the forearm up and back" },
          { t: 1.8, p: sideLying(95) },
          { t: 2.2, p: sideLying(95), cue: "Lower slowly in 2–3 s, blade back and down" },
          ...transition(sideLying, 95, -45, 2.2, 4.69),
          { t: 4.7, p: mirrorPose(makePose(sideLying(-45))), e: "hold" },
        ],
      },
    ],
  },

  neck: {
    clips: [
      {
        title: "Forehead resistance: hold",
        highlight: ["neck"],
        camera: { view: [1, 0.12, 0.25], target: [0, 1.45, 0.08], dist: 2.4 },
        keys: [
          { t: 0, p: neckPose(0, 0), cue: "Stand tall, chin slightly tucked, neck long" },
          { t: 0.5, p: neckPose(0, 0), cue: "Hand on the forehead, push gently back" },
          { t: 0.95, p: neckPose(0, 0.5), e: "in" },
          { t: 1.4, p: neckPose(0), e: "out" },
          { t: 1.6, p: neckPose(0), cue: "Neck resists, head still: hold" },
          { t: 5.6, p: neckPose(0), cue: "Relax; 5 holds at 30–50% effort" },
          { t: 6.05, p: neckPose(0, 0.5), e: "in" },
          { t: 6.5, p: neckPose(0, 0), e: "out" },
          { t: 7.0, p: neckPose(0, 0) },
        ],
      },
      {
        title: "Forehead resistance: slow",
        highlight: ["neck"],
        camera: { view: [1, 0.12, 0.25], target: [0, 1.45, 0.08], dist: 2.4 },
        keys: [
          { t: 0, p: neckPose(0, 0), cue: "Hand on the forehead, neck long" },
          { t: 0.45, p: neckPose(0, 0.5), e: "in" },
          { t: 0.9, p: neckPose(0), e: "out" },
          { t: 1.2, p: neckPose(0), cue: "Let the hand win slowly, 3–5 s" },
          { t: 3.2, p: neckPose(0.5), e: "in" }, // halfway key keeps the palm on the forehead arc
          { t: 5.2, p: neckPose(1), e: "out" },
          { t: 5.6, p: neckPose(1), cue: "About 30° back; return to level" },
          { t: 6.8, p: neckPose(0.5), e: "in" },
          { t: 8.0, p: neckPose(0), e: "out" },
          { t: 8.3, p: neckPose(0), cue: "Repeat gently until your neck muscles tire" },
          { t: 8.75, p: neckPose(0, 0.5), e: "in" },
          { t: 9.2, p: neckPose(0, 0), e: "out" },
        ],
      },
    ],
  },

  doorway: {
    clips: [
      {
        title: "Doorway chest stretch",
        props: [FRAME],
        highlight: ["chest", "shoulders"],
        camera: { view: [1, 0.35, -0.65], target: [0, 1.1, 0.3], dist: 4.3 },
        alternate: true,
        keys: [
          { t: 0, p: doorway(), cue: "Forearms on the frame, elbows at shoulder height" },
          { t: 0.6, p: doorway(), cue: "Step one foot through" },
          { t: 0.95, p: doorway({ step: 0.5, lift: 1 }), e: "in" },
          { t: 1.3, p: doorway({ step: 1 }), e: "out" },
          { t: 1.5, p: doorway({ step: 1 }), cue: "Lean gently until the chest stretches" },
          { t: 3.3, p: doorway({ step: 1, lean: 1 }), cue: "Ribs down, breathe; hold" },
          { t: 4.5, p: doorway({ step: 1, lean: 1, breath: 1 }) },
          { t: 5.7, p: doorway({ step: 1, lean: 1 }), cue: "Ease back" },
          { t: 7.0, p: doorway({ step: 1 }), cue: "Step back" },
          { t: 7.35, p: doorway({ step: 0.5, lift: 1 }), e: "in" },
          { t: 7.7, p: doorway(), e: "out", cue: "Other foot next" },
        ],
      },
    ],
  },
};
