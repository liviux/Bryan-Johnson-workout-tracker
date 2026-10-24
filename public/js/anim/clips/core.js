// Animations for the core & stability exercises.
import { anchor, ground, joints, pinHands, transition } from "../poses.js";
import { DIM, makePose, mirrorPose } from "../rig.js";

const MAT_Y = 0.012; // top of the exercise mat

// World point at a local offset from `origin`, in the rotation frame R of joints() (Rp, Rc…).
function at(R, origin, [x, y, z]) {
  const e = R.elements; // column-major: the frame's X, Y, Z axes in world space
  return [origin.x + e[0] * x + e[4] * y + e[8] * z, origin.y + e[1] * x + e[5] * y + e[9] * z, origin.z + e[2] * x + e[6] * y + e[10] * z];
}

// ---------- forearm plank ----------
// On the mat, elbows under the shoulders: fists 1 cm inboard of the shoulder line,
// wrists 0.035 above the mat so the palms rest flat. Contact constants carry MAT_Y.
function plankBody(theta, breath = 0) {
  const p = { rot: [90 - theta, 0, 0], spine: [-1 + breath, 0, 0], legL: [0, 4, 0, -22], legR: [0, 4, 0, -22], neck: [4, 0] };
  return anchor(p, "toeL", [0, MAT_Y, -0.95], "yz");
}
function plank(theta, breath = 0) {
  const body = plankBody(theta, breath);
  const J = joints(plankBody(5));
  const zEl = J.shoulderL.z + 0.02;
  return { ...body, handsIn: "world", palmL: [0, 1, 0], palmR: [0, 1, 0], handL: [0.175, 0.035 + MAT_Y, zEl + 0.25], handR: [-0.175, 0.035 + MAT_Y, zEl + 0.25], elbowL: [0.25, -1, -0.2], elbowR: [-0.25, -1, -0.2] };
}

// ---------- quadruped (bird dog base) ----------
// Support hands sit under the shoulder line (abd 2° keeps the wrists within 2 cm).
const QUAD = pinHands(ground({ rot: [82, 0, 0], legL: [82, 4, 90, 80], legR: [82, 4, 90, 80], armL: [82, 2, 0, 0], armR: [82, 2, 0, 0], neck: [-8, 0], palmL: [0, 1, 0], palmR: [0, 1, 0] }, ["kneeL", "kneeR", "handL", "handR"]), "R");
function birdDog(reach) {
  const p = pinHands({ ...QUAD, armL: [82 + 90 * reach, 2 + 2 * reach, 5 * Math.sin(Math.PI * reach), 0], legR: [82 * (1 - reach), 4 - reach, 90 - 88 * reach, 80 - 50 * reach], shrugL: [0.012 * reach, 0], elbowL: [0.3, 0, -1], elbowR: [-0.3, 0, -1] });
  // Lower the knees to the floor without moving the pinned palms.
  return { ...p, root: [p.root[0], p.root[1] - 0.018, p.root[2]] };
}

// ---------- supine (dead bug base) ----------
const SUPINE = ground({ rot: [-90, 0, 0], legL: [90, 4, 90, 10], legR: [90, 4, 90, 10], armL: [90, 6, 0, 0], armR: [90, 6, 0, 0], neck: [6, 0] }, ["pelvis", "thoracic", "head"], 0.008);
function deadBug(reach) {
  const s = reach * reach * (3 - 2 * reach); // both limbs share the same easing shaper
  // 174° flexion swings the working fingers over the head toward the mat while the
  // straightened leg reaches nearly level, toes pointing at the floor.
  return { ...SUPINE, armL: [90 + 84 * s, 6, 0, 4], legR: [90 - 88 * s, 4, 90 - 86 * s, 10 + 2 * s] };
}

// ---------- hanging knee / leg raise ----------
// Active hang (shoulders pulled down) with straight arms on the door-frame bar.
// hip/knee: leg angles; curl: posterior pelvic tilt at the top; lean: torso pitch that
// keeps the centre of mass under the bar (no swinging); back: shoulders drift behind the bar.
const BAR_Y = 2.265;
const BAR_Z = 0.08;
const GRIP = 0.25;
const DOORFRAME = { type: "doorframe", pos: [0, 0, -0.36], w: 0.9, h: 2.26, bar: true, barH: BAR_Y, barZ: BAR_Z + 0.36 };
function legRaise({ hip = 12, knee = 6, curl = 0, lean = 0, back = 0, plantar = 10, shrug = -0.03 } = {}) {
  const p = {
    rot: [lean - curl, 0, 0],
    spine: [curl, 0, 0],
    legL: [hip, 2, knee, plantar],
    legR: [hip, 2, knee, plantar],
    // A pulled-down hang retracts the blades a little as well; the passive hang keeps them.
    shrugL: [shrug, shrug < 0 ? -0.012 : 0],
    shrugR: [shrug, shrug < 0 ? -0.012 : 0],
    neck: [4, 0],
  };
  // Shoulders sit one straight arm length below the hands, less a 2 mm margin.
  // A hang is an overhead reach to the rig: it lifts the blade ~25 mm right after the
  // anchor pins the shoulder, so the drop backs that lift out — the wrists then land
  // exactly on the bar with straight elbows instead of clamping below the authored spot.
  const dx = GRIP - (DIM.shoulderX - 0.012);
  const dz = 0.02 + back;
  const shoulderY = BAR_Y - 0.085 - Math.sqrt(0.55 ** 2 - dx * dx - dz * dz) + 0.002 - 0.025;
  return {
    ...anchor(p, "shoulderL", [0, shoulderY, BAR_Z - dz], "yz"),
    handsIn: "world",
    handL: [GRIP, BAR_Y - 0.085, BAR_Z],
    handR: [-GRIP, BAR_Y - 0.085, BAR_Z],
    palmL: [0, 0, 1],
    palmR: [0, 0, 1],
    fingersL: [0, 1, 0],
    fingersR: [0, 1, 0],
    elbowL: [0.6, -1, 0.1],
    elbowR: [-0.6, -1, 0.1],
  };
}
const PASSIVE_HANG = legRaise({ shrug: 0.032 });
const HANG = legRaise();
const KNEES_UP = legRaise({ hip: 118, knee: 108, curl: 16, lean: 14, back: 0.04 });
const KNEES_CURL = legRaise({ hip: 128, knee: 116, curl: 28, lean: 18, back: 0.05 });
const LEGS_UP = legRaise({ hip: 96, knee: 3, curl: 10, lean: 14, back: 0.07 });
const LEGS_CURL = legRaise({ hip: 102, knee: 3, curl: 22, lean: 16, back: 0.08 });

// ---------- floor back extension ----------
// Face down on the mat, fingertips at the temples; lift = spine extension in degrees.
function backExt(lift = 0) {
  const p = {
    rot: [88, 0, 0],
    spine: [-lift, 0, 0],
    lumbar: [-lift * 0.25, 0, 0],
    shrugL: [0, -0.0006 * lift],
    shrugR: [0, -0.0006 * lift],
    neck: [lift * 0.25, 0],
    legL: [6, 3, 6, 72],
    legR: [6, 3, 6, 72],
    handsIn: "chest",
    handL: [0.18, 0.17, 0.05],
    handR: [-0.18, 0.17, 0.05],
    elbowL: [1, 0, 0.2],
    elbowR: [-1, 0, 0.2],
  };
  return ground(p, ["pelvis", "kneeL", "kneeR"], MAT_Y + 0.006);
}

// ---------- side plank ----------
// Lying on the right side along X (head toward −X), facing +Z, on the right forearm.
// tilt: body angle off the floor; bend: waist side bend; legTilt: legs vs. pelvis; feet stacked.
const SIDE_FOOT = [0.8, 0.058 + MAT_Y, 0]; // bottom ankle, foot on its outer edge
function sideBody({ tilt, bend = 0, legTilt = 0, breath = 0 }) {
  const p = {
    rot: [0, 0, 90 - tilt],
    spine: [breath, -bend, 0],
    legL: [0, legTilt - 3, 2, 6],
    legR: [0, -legTilt - 3, 2, 6],
    neck: [0, 0],
  };
  return anchor(p, "ankleR", SIDE_FOOT);
}
// Hips lifted: body in one straight line, bottom elbow straight under the shoulder.
const SIDE_UP = { tilt: 16.75 };
// Hips resting on the mat, propped on the forearm.
const SIDE_DOWN = { tilt: 10, legTilt: 5.7 };
// The planted forearm: elbow on the mat under the lifted shoulder, forearm pointing forward.
const SIDE_ELBOW = (() => {
  const s = joints(sideBody(SIDE_UP)).shoulderR;
  return [s.x, s.y - 0.29, s.z];
})();
const SIDE_WRIST = [SIDE_ELBOW[0], 0.037 + MAT_Y, SIDE_ELBOW[2] + 0.26];
function sidePlank(o) {
  // Keep the shoulder one upper-arm length from the elbow while the hips rise.
  let lo = 0, hi = 65;
  for (let i = 0; i < 18; i++) {
    const bend = (lo + hi) / 2, S = joints(sideBody({ ...o, bend })).shoulderR;
    if (Math.hypot(S.x - SIDE_ELBOW[0], S.y - SIDE_ELBOW[1], S.z - SIDE_ELBOW[2]) < 0.29) lo = bend;
    else hi = bend;
  }
  const body = sideBody({ ...o, bend: (lo + hi) / 2 });
  const J = joints(body);
  const S = J.shoulderR;
  return {
    ...body,
    handsIn: "world",
    handR: SIDE_WRIST,
    palmR: [0, 1, 0],
    elbowR: [SIDE_ELBOW[0] - S.x, SIDE_ELBOW[1] - S.y, SIDE_ELBOW[2] - S.z], // pole through the planted elbow
    handL: at(J.Rp, J.pelvis, [0.2, 0.06, 0.03]), // top hand resting on the hip
    elbowL: [0, 0.6, -1],
  };
}
const sideLift = (d) => sidePlank({ tilt: 10 + 6.75 * d, legTilt: 5.7 * (1 - d) });

// ---------- high plank (shoulder taps) ----------
// Straight body on the hands, feet a bit wider than the hips; hands planted under the shoulders.
const TAP_BODY = anchor(
  { rot: [90 - 16.5, 0, 0], spine: [-1, 0, 0], legL: [0, 6, 0, -24], legR: [0, 6, 0, -24], neck: [-6, 0] },
  "toeL",
  [0, 0.006 + MAT_Y, -0.95],
  "yz"
);
const TAP_J = joints(TAP_BODY);
const TAP_HANDS = { L: [0.21, 0.035 + MAT_Y, TAP_J.shoulderL.z + 0.02], R: [-0.21, 0.035 + MAT_Y, TAP_J.shoulderR.z + 0.02] };
const TAP_TOE = Math.asin(-TAP_J.footFL.y) * 180 / Math.PI;
// Right hand touching the front of the left shoulder.
const TAP_TARGET = at(TAP_J.Rc, TAP_J.shoulderL, [-0.015, 0.095, 0.02]);
function shoulderTap(reach = 0) {
  const handR = TAP_HANDS.R.map((v, i) => v + (TAP_TARGET[i] - v) * reach);
  return { ...TAP_BODY, root: [TAP_BODY.root[0] + 0.015 * reach, TAP_BODY.root[1], TAP_BODY.root[2]], footL: TAP_J.ankleL.toArray(), footR: TAP_J.ankleR.toArray(), feetMode: "ground", toeL: TAP_TOE, toeR: TAP_TOE, kneeL: [0.1, -1, 0.3], kneeR: [-0.1, -1, 0.3], palmL: [0, 1, 0], palmR: [0, 1, 0], handsIn: "world", handL: TAP_HANDS.L, handR, elbowL: [0.6, 0.2, -0.6], elbowR: [-1, -0.2, -0.4] };
}

export default {
  plank: {
    clips: [
      {
        title: "Forearm plank",
        props: [{ type: "mat", pos: [0, 0, -0.2], w: 0.62, d: 1.9 }],
        highlight: ["core", "shoulders"],
        camera: { view: [1, 0.4, 0.3], target: [0, 0.25, -0.15], dist: 3.9 },
        keys: [
          { t: 0, p: plank(5, 0), cue: "Elbows under shoulders, glutes squeezed" },
          { t: 2, p: plank(5.6, 2), cue: "Brace your abs and breathe normally" },
          { t: 4, p: plank(5, 0) },
        ],
      },
    ],
  },

  birddog: {
    clips: [
      {
        title: "Bird dog",
        highlight: ["core", "lowerBack", "glutes"],
        camera: { view: [1, 0.38, 0.35], target: [0, 0.42, 0.1], dist: 4.8 },
        alternate: true,
        keys: [
          { t: 0, p: birdDog(0), cue: "Hands under shoulders, knees under hips" },
          { t: 0.4, p: birdDog(0), cue: "Reach one arm forward and the opposite leg back" },
          ...transition(birdDog, 0, 1, 0.4, 1.8, "Hold 2 s, hips level"),
          { t: 3.8, p: birdDog(1), cue: "Return slowly, switch sides" },
          ...transition(birdDog, 1, 0, 3.8, 5.0),
        ],
      },
    ],
  },

  deadbug: {
    clips: [
      {
        title: "Dead bug",
        highlight: ["core"],
        camera: { view: [1, 0.55, -0.15], target: [0, 0.3, -0.35], dist: 4.0 },
        alternate: true,
        keys: [
          { t: 0, p: deadBug(0), cue: "Arms up, knees over hips, lower back pressed down" },
          { t: 0.4, p: deadBug(0), cue: "Lower one arm and the opposite leg slowly" },
          ...transition(deadBug, 0, 1, 0.4, 2.2),
          { t: 2.7, p: deadBug(1), cue: "Return, breathe out, then switch sides" },
          ...transition(deadBug, 1, 0, 2.7, 4.2),
        ],
      },
    ],
  },

  deadhang: {
    clips: [
      {
        title: "Passive dead hang",
        props: [DOORFRAME],
        highlight: ["grip", "forearms", "shoulders", "back"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.1], dist: 4.5 },
        keys: [
          { t: 0, p: PASSIVE_HANG, cue: "Passive hang: relax shoulders and let gravity stretch your spine" },
          { t: 2.0, p: legRaise({ shrug: 0.036, hip: 10 }), cue: "Breathe slowly and decompress the spine" },
          { t: 4.0, p: PASSIVE_HANG },
        ],
      },
      {
        title: "Active dead hang",
        props: [DOORFRAME],
        highlight: ["grip", "forearms", "shoulders", "upperBack"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.1], dist: 4.5 },
        keys: [
          { t: 0, p: PASSIVE_HANG, cue: "Start from a full passive hang, elbows straight" },
          { t: 0.6, p: PASSIVE_HANG, cue: "Pull shoulder blades down and back away from your ears" },
          { t: 1.6, p: HANG, cue: "Hold the active hang without bending your elbows" },
          { t: 3.4, p: HANG, cue: "Lower slowly back into a passive hang" },
          { t: 4.4, p: PASSIVE_HANG },
        ],
      },
    ],
  },

  legraise: {
    clips: [
      {
        title: "Hanging knee raise",
        props: [DOORFRAME],
        highlight: ["core", "hips", "grip"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.1], dist: 4.5 },
        keys: [
          { t: 0, p: HANG, cue: "Active hang: shoulders pulled down" },
          { t: 0.4, p: HANG, cue: "Raise the knees toward your chest" },
          { t: 1.6, p: KNEES_UP, cue: "Curl the pelvis up; no swinging" },
          { t: 2.1, p: KNEES_CURL },
          { t: 2.5, p: KNEES_CURL, cue: "Lower slowly" },
          { t: 5.0, p: HANG },
        ],
      },
      {
        title: "Hanging straight-leg raise",
        props: [DOORFRAME],
        highlight: ["core", "hips", "grip"],
        camera: { view: [1, 0.2, 0.9], target: [0, 1.12, 0.15], dist: 4.5 },
        keys: [
          { t: 0, p: HANG, cue: "Active hang, legs straight" },
          { t: 0.4, p: HANG, cue: "Raise straight legs to hip height" },
          { t: 1.8, p: LEGS_UP, cue: "Curl the pelvis up; no swinging" },
          { t: 2.3, p: LEGS_CURL },
          { t: 2.7, p: LEGS_CURL, cue: "Lower slowly" },
          { t: 5.4, p: HANG },
        ],
      },
    ],
  },

  backext: {
    clips: [
      {
        title: "Floor back extension",
        props: [{ type: "mat", pos: [0, 0, -0.1], w: 0.62, d: 2.0 }],
        highlight: ["back", "lowerBack", "glutes"],
        camera: { view: [1, 0.32, 0.22], target: [0, 0.2, -0.08], dist: 4.0 },
        keys: [
          { t: 0, p: backExt(0), cue: "Face down, fingertips lightly at your temples" },
          { t: 0.8, p: backExt(0), cue: "Squeeze your glutes, lift your chest a few cm" },
          { t: 2.2, p: backExt(7), cue: "Hold 1–2 s, eyes on the floor" },
          { t: 3.7, p: backExt(7), cue: "Lower slowly" },
          { t: 5.7, p: backExt(0) },
        ],
      },
    ],
  },

  sideplank: {
    clips: [
      {
        title: "Side plank",
        props: [{ type: "mat", pos: [0, 0, 0.05], w: 0.62, d: 1.9, rotY: 90 }],
        highlight: ["obliques", "glutes", "shoulders"],
        camera: { view: [0.15, 0.3, 1], target: [0, 0.28, 0], dist: 3.7 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: sidePlank(SIDE_DOWN), cue: "On one forearm, elbow under the shoulder" },
          // 1 ms "hold" segment: switching sides is an instant cut, not a flip through the air.
          { t: 0.001, p: sidePlank(SIDE_DOWN), e: "hold", cue: "On one forearm, elbow under the shoulder" },
          { t: 0.6, p: sidePlank(SIDE_DOWN), cue: "Lift the hips into a straight line" },
          ...transition(sideLift, 0, 1, 0.6, 2.0, "Hold and breathe, feet stacked"),
          { t: 3.6, p: sidePlank({ ...SIDE_UP, breath: 2 }) },
          { t: 5.2, p: sidePlank(SIDE_UP), cue: "Lower with control, then switch sides" },
          ...transition(sideLift, 1, 0, 5.2, 6.599),
          { t: 6.6, p: mirrorPose(makePose(sidePlank(SIDE_DOWN))), e: "hold" },
        ],
      },
    ],
  },

  shouldertap: {
    clips: [
      {
        title: "Plank shoulder taps",
        props: [{ type: "mat", pos: [0, 0, -0.25], w: 0.62, d: 1.85 }],
        highlight: ["core", "shoulders"],
        camera: { view: [0.45, 0.32, 1], target: [0, 0.32, -0.28], dist: 3.5 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: shoulderTap(0), cue: "High plank, feet a bit wider than the hips" },
          { t: 0.5, p: shoulderTap(0), cue: "Tap the opposite shoulder" },
          ...transition(shoulderTap, 0, 1, 0.5, 1.4, "Keep the hips still"),
          { t: 1.8, p: shoulderTap(1), cue: "Put your hand down, then tap with the other hand" },
          ...transition(shoulderTap, 1, 0, 1.8, 2.699),
          { t: 2.7, p: mirrorPose(makePose(shoulderTap(0))), e: "hold" },
        ],
      },
    ],
  },
};
