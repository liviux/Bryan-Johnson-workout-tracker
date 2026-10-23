// Animations for the mobility & stretching exercises. Keyed by exercise id (see data/exercises.js).
// Each entry: { clips: [{ title, props, hold, bands, camera, highlight, keys: [{ t, p, cue, e }] }] }
import { ANKLE_Y, ARMS, FOOT_X, LEG, STAND_Y, anchor, ground, hangArms, hinge, joints, legsTo, pinFeet, pinHands, squat, stand, translate, transition } from "../poses.js";
import { makePose, mirrorPose } from "../rig.js";

const MAT_Y = 0.012; // top of the exercise mat
const mat = (z = 0, d = 1.85) => ({ type: "mat", pos: [0, 0, z], w: 0.62, d });

// World point at a local offset from `origin`, in the rotation frame R of joints() (Rp, Rc…).
function at(R, origin, [x, y, z]) {
  const e = R.elements; // column-major: the frame's X, Y, Z axes in world space
  return [origin.x + e[0] * x + e[4] * y + e[8] * z, origin.y + e[1] * x + e[5] * y + e[9] * z, origin.z + e[2] * x + e[6] * y + e[10] * z];
}
const v3 = (v) => [v.x, v.y, v.z];

// Blend two parameter objects (numbers; a missing value counts as 0).
function mix(a, b, s) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * s;
  return out;
}

// Keys for one smooth move (from the key at t0 to t1) whose pose has to be rebuilt along the
// way, e.g. hips swinging around a planted knee (plain key blending would cut the corner and
// slide the knee). The pose is rebuilt exactly at n points; the move eases in, runs at constant
// speed and eases out, so it still reads as one move. `after`: cue for what follows the move
// (a cue shows from its key until the next cue, so the move's own cue goes on the key at t0).
function move(build, from, to, t0, t1, { n = 4, after } = {}) {
  const a = 1 / (2 + ((n - 2) * Math.PI) / 2); // share of the first (and last) step
  const keys = [];
  for (let i = 1; i <= n; i++) {
    const s = i === n ? 1 : a + (i - 1) * a * (Math.PI / 2);
    keys.push({ t: t0 + ((t1 - t0) * i) / n, p: build(mix(from, to, s)), e: "smooth" });
  }
  if (after) keys[n - 1].cue = after;
  return keys;
}

// ---------- hands and knees (cat-cow, thread the needle) ----------
// The pelvis stays over the knees. tilt rotates the pelvis (− tucks the tailbone) and the
// hip flexion follows it, so thighs and knees stay put. Hands are planted under the shoulders,
// and the tops of the feet rest on the mat.
const QUAD_BASE = ground(
  { rot: [82, 0, 0], legL: [82, 4, 86, 80], legR: [82, 4, 86, 80], armL: [82, 4, 0, 0], armR: [82, 4, 0, 0] },
  ["kneeL", "kneeR"],
  MAT_Y
);
const QUAD_J = joints(QUAD_BASE);
const QUAD_HANDS = {
  L: [QUAD_J.shoulderL.x + 0.02, 0.035 + MAT_Y, QUAD_J.shoulderL.z + 0.02],
  R: [QUAD_J.shoulderR.x - 0.02, 0.035 + MAT_Y, QUAD_J.shoulderR.z + 0.02],
};
function quad({ tilt = 0, flex = 0, side = 0, twist = 0, neck = -8, turn = 0, nod = 0, shrug = 0, handL = QUAD_HANDS.L, handR = QUAD_HANDS.R, elbowL = [0.3, 0, -1], elbowR = [-0.3, 0, -1] } = {}) {
  const palmTurn = Math.min(1, Math.max(0, (handR[1] - QUAD_HANDS.R[1]) / 0.5)) * Math.PI / 2;
  return {
    root: QUAD_BASE.root,
    rot: [82 + tilt, 0, 0],
    spine: [flex, side, twist],
    legL: [82 + tilt, 4, 86, 80],
    legR: [82 + tilt, 4, 86, 80],
    neck: [neck, turn],
    head: [nod, 0],
    shrugL: [0, shrug],
    shrugR: [0, shrug],
    handsIn: "world",
    palmL: [0, 1, 0],
    palmR: [0, Math.cos(palmTurn), -Math.sin(palmTurn)],
    handL,
    handR,
    elbowL,
    elbowR,
  };
}
// Cat: back rounded up between planted hands and knees (tilt solved so the shoulders keep
// their height); cow: chest forward, back dipped, tailbone up.
const CAT = { tilt: -24, flex: 34, neck: 24, shrug: 0.03 };
const COW = { tilt: 18.5, flex: -28, neck: -24, shrug: -0.02 };

// Thread the needle (right arm). u = −1 threaded: right hand slid under the body to the left,
// chest turned down, right shoulder and temple toward the mat; 0 = hands and knees; +1 open:
// chest turned up, right arm to the ceiling, eyes on the hand. Left hand and knees stay planted.
const THREAD_UNDER = [0.42, 0.045 + MAT_Y, QUAD_HANDS.L[2] - 0.15]; // behind the left wrist
const THREAD_S0 = joints(quad()).shoulderR;
function thread(u) {
  const under = Math.max(0, -u), open = Math.max(0, u);
  const body = quad({
    tilt: 8 * under,
    flex: 48 * under,
    twist: 60 * under - 45 * open,
    neck: -8 + 6 * under - 6 * open,
    turn: 30 * under - 30 * open,
    nod: -18 * open,
    elbowL: [0.7, 0.1, -0.7],
    elbowR: [-0.3, -0.2, -1],
  });
  let handR;
  if (u <= 0) {
    handR = QUAD_HANDS.R.map((v, i) => v + (THREAD_UNDER[i] - v) * under); // slides along the mat
  } else {
    // Sweep out and up: the start arm vector turned about the body's long axis (≈ Z).
    const a = -Math.PI * open, S = joints(body).shoulderR;
    const v = [QUAD_HANDS.R[0] - THREAD_S0.x, QUAD_HANDS.R[1] - THREAD_S0.y, QUAD_HANDS.R[2] - THREAD_S0.z];
    handR = [S.x + v[0] * Math.cos(a) - v[1] * Math.sin(a), S.y + v[0] * Math.sin(a) + v[1] * Math.cos(a), S.z + v[2]];
  }
  const palmTurn = open * Math.PI / 2;
  return { ...body, handR, palmR: [0, Math.cos(palmTurn), -Math.sin(palmTurn)] };
}
const threadPose = (q) => thread(q.u ?? 0);

// ---------- prone (cobra) ----------
// Face down on the mat; lift = spine extension, the hips stay down. Low cobra: hands planted
// beside the chest, wrists just behind the shoulder line, elbows drawn back along the ribs.
function proneBody(lift = 0) {
  const p = { rot: [88, 0, 0], spine: [-lift, 0, 0], lumbar: [-lift * 0.25, 0, 0], neck: [lift * 0.12, 0], shrugL: [-0.0002 * lift, -0.0003 * lift], shrugR: [-0.0002 * lift, -0.0003 * lift], legL: [6, 3, 6, 72], legR: [6, 3, 6, 72] };
  return ground(p, ["pelvis", "kneeL", "kneeR"], MAT_Y + 0.006);
}
const COBRA_J = joints(proneBody(0));
const COBRA_HANDS = { L: [0.22, 0.035 + MAT_Y, COBRA_J.shoulderL.z - 0.07], R: [-0.22, 0.035 + MAT_Y, COBRA_J.shoulderR.z - 0.07] };
function cobra(lift = 0) {
  const s = Math.min(1, lift / 50); // elbow pole: up and back when flat, back along the ribs when lifted
  const pole = [0.15, 1 - 0.7 * s, -0.3 - 0.7 * s];
  return { ...proneBody(lift), handsIn: "world", palmL: [0, 1, 0], palmR: [0, 1, 0], handL: COBRA_HANDS.L, handR: COBRA_HANDS.R, elbowL: pole, elbowR: [-pole[0], pole[1], pole[2]] };
}

// ---------- kneeling (shin stretch, toe sit) ----------
// Knees and feet planted on the mat. sit: thigh angle back from vertical (0 = tall kneeling,
// ~66 = sitting on the heels); lift: knees raised off the mat, pivoting on the feet (deg);
// lean: torso lean (+ forward, − back). Tucked toes raise the ankles, so the shins slope up.
const KNEEL = {
  flat: { slope: -2, plantar: 74 }, // tops of the feet on the mat
  tucked: { slope: 16, plantar: 0 }, // toes tucked under, heels up
};
const KNEE_AT = [0.1, 0.051 + MAT_Y, 0.2];
const KNEEL_ANKLE = {};
for (const feet of Object.keys(KNEEL)) {
  const u = KNEEL[feet].slope;
  KNEEL_ANKLE[feet] = v3(joints(anchor({ legL: [0, 4, 90 + u, 0] }, "kneeL", KNEE_AT, "yz")).ankleL);
}
function kneelBody({ sit = 0, lift = 0, lean = 0, breath = 0 }, feet = "flat") {
  const { slope, plantar } = KNEEL[feet];
  const u = slope - lift; // shin angle from the knee back to the ankle (+ up)
  const leg = [sit + lean, 4, 90 + u + sit, plantar + lift];
  const p = { rot: [lean, 0, 0], spine: [breath, 0, 0], neck: [-lean * (lean < 0 ? 0.7 : 0.3), 0], legL: leg, legR: leg };
  return anchor(p, "ankleL", KNEEL_ANKLE[feet], "yz"); // the feet never move
}
// Hand spots: resting (hanging at the sides when tall, on the thighs when sitting back), on the
// mat behind the feet (leaning back) or on the mat in front of the knees (leaning forward).
// `reach` blends from one spot to the next.
function handsRest(J, sit) {
  const w = Math.min(1, sit / 60);
  const spot = (s, out) => {
    const sh = J["shoulder" + s], h = J["hip" + s], k = J["knee" + s];
    const d = k.clone().sub(h).normalize(); // thigh axis; its front faces (0, d.z, −d.y)
    const hang = [sh.x + out * 2, sh.y - 0.535, sh.z + 0.07];
    const thigh = [h.x + (k.x - h.x) * 0.33 + out, h.y + (k.y - h.y) * 0.33 + d.z * 0.075, h.z + (k.z - h.z) * 0.33 - d.y * 0.075];
    const hand = hang.map((v, i) => v + (thigh[i] - v) * w);
    const distance = Math.hypot(hand[0] - sh.x, hand[1] - sh.y, hand[2] - sh.z);
    return hand.map((v, i) => [sh.x, sh.y, sh.z][i] + (v - [sh.x, sh.y, sh.z][i]) * Math.min(1, 0.535 / distance));
  };
  return { L: spot("L", 0.02), R: spot("R", -0.02) };
}
const HANDS_BEHIND = { L: [0.26, 0.035 + MAT_Y, KNEE_AT[2] - 0.74], R: [-0.26, 0.035 + MAT_Y, KNEE_AT[2] - 0.74] };
const TOE_ON_HANDS = { sit: 10, lean: 84, reach: 1 };
const TOE_SIT_BACK = { sit: 50, lean: 80, reach: 1 };
const HANDS_FRONT = (() => {
  const J = joints(kneelBody(TOE_ON_HANDS, "tucked"));
  return { L: [0.21, 0.035 + MAT_Y, J.shoulderL.z + 0.06], R: [-0.21, 0.035 + MAT_Y, J.shoulderR.z + 0.06] };
})();
function kneel(o, feet = "flat", { from = "thighs", to = "thighs", elbows = [0.5, -0.2, -1] } = {}) {
  const body = kneelBody(o, feet);
  const spots = { thighs: handsRest(joints(body), o.sit ?? 0), behind: HANDS_BEHIND, front: HANDS_FRONT };
  const reach = o.reach ?? 0;
  const s = to === "front" ? reach ** 3 : reach;
  const arc = Math.sin(Math.PI * s) * 0.1; // hands lift a little on the way
  const hand = (side) => spots[from][side].map((v, i) => v + (spots[to][side][i] - v) * s + (i === 1 ? arc : 0));
  const p = { ...body, handsIn: "world", handL: hand("L"), handR: hand("R"), elbowL: elbows, elbowR: [-elbows[0], elbows[1], elbows[2]] };
  const J = joints(p), contact = from === "thighs" ? to === "thighs" ? 0 : s : 1 - s;
  const flat = Math.max(contact, Math.min(1, (o.sit ?? 0) / 60));
  const palm = (side) => {
    const normal = J["handRef" + side];
    return [normal.x * (1 - flat), normal.y * (1 - flat) + flat, normal.z * (1 - flat)];
  };
  return { ...p, palmL: palm("L"), palmR: palm("R") };
}
// Shin stretch: sitting on the heels, then leaning back on the hands to lift the knees.
const SEIZA = { sit: 66 };
const LEAN_BACK = { sit: 66, lean: -50, reach: 1 };
const KNEES_UP = { sit: 74, lean: -50, reach: 1, lift: 8 }; // hips stay level as the knees rise
const shinPose = (q) => kneel(q, "flat", { from: "thighs", to: "behind", elbows: [0.4, 0, -1] });
// Toe sit: lean onto the hands, sit back toward the heels, then sit up as tolerance allows.
const toeHandsDown = (q) => kneel(q, "tucked", { from: "thighs", to: "front", elbows: [0.5, 0, -0.6] });
const toeHandsUp = (q) => kneel(q, "tucked", { from: "front", to: "thighs", elbows: [0.5, -0.2, -1] });

// ---------- half-kneeling (couch stretch, hip flexor stretch) ----------
// Left knee back and planted, right foot forward and planted (mirrored for the other side).
// beta: back-thigh angle from vertical (+ = hips forward of the knee); tilt: pelvis pitch
// (− = tucked); torso: chest pitch (+ = leaning forward). The back hip is placed exactly one
// thigh length from the planted knee, and the knee pole points at that knee.
const D2R = Math.PI / 180;
function halfKneel({ beta, tilt = 0, torso = 0, side = 0, breath = 0 }, S) {
  const base = { rot: [tilt, 0, 0], spine: [torso - tilt + breath, side, 0], neck: [-torso * 0.4, 0] };
  const off = joints({ ...base, root: [0, 0, 0] }).hipL; // hip joint relative to the pelvis centre
  const hip = [S.knee[0], S.knee[1] + 0.44 * Math.cos(beta * D2R), S.knee[2] + 0.44 * Math.sin(beta * D2R)];
  return {
    ...base,
    root: [hip[0] - off.x, hip[1] - off.y, hip[2] - off.z],
    footL: S.backAnkle,
    footModeL: "shin",
    ankleL: S.backPlantar,
    kneeL: [S.knee[0] - hip[0], S.knee[1] - hip[1], S.knee[2] - hip[2]],
    footR: S.frontAnkle,
    kneeR: [-0.15, 0, 1],
  };
}
// Hands resting on the front (right) thigh: t = how far toward the knee.
function onFrontThigh(J, t) {
  const h = J.hipR, k = J.kneeR;
  const p = [h.x + (k.x - h.x) * t, h.y + (k.y - h.y) * t + 0.075, h.z + (k.z - h.z) * t];
  return { handL: [p[0] + 0.075, p[1], p[2]], handR: [p[0] - 0.06, p[1], p[2] - 0.02] };
}

// Couch stretch: back knee on the mat at the foot of the sofa, the shin leaning up against the
// seat edge and the top of the foot resting on the seat.
const SOFA_FACE = -0.62; // z of the sofa's front
const COUCH = (() => {
  const g = 14 * D2R; // shin lean back from vertical
  const knee = [0.1, 0.051 + MAT_Y, SOFA_FACE + 0.37 * Math.tan(g) + 0.045 / Math.cos(g)];
  return { knee, backAnkle: [knee[0], knee[1] + 0.43 * Math.cos(g), knee[2] - 0.43 * Math.sin(g)], backPlantar: -14, frontAnkle: [-0.12, 0.075 + MAT_Y, 0.06] };
})();
function couch(o, hands) {
  const body = halfKneel(o, COUCH);
  return { ...body, handsIn: "world", ...onFrontThigh(joints(body), hands), elbowL: [0.6, -0.2, -1], elbowR: [-0.6, -0.2, -1] };
}
const COUCH_SET = { beta: 8, tilt: 12, torso: 30 }; // leaning on the front knee
const COUCH_UP = { beta: 17, tilt: -10, torso: 0 }; // upright, glute squeezed, pelvis tucked

// Hip flexor stretch: back knee on a cushion, top of the back foot flat on the mat.
const CUSHION = { type: "step", pos: [0.1, 0, -0.27], w: 0.3, d: 0.24, h: 0.05 };
const HIPFLEX = (() => {
  const knee = [0.1, 0.05 + 0.051, -0.3];
  const drop = knee[1] - (0.036 + MAT_Y);
  const run = Math.sqrt(0.43 ** 2 - drop ** 2);
  return { knee, backAnkle: [knee[0], knee[1] - drop, knee[2] - run], backPlantar: 76, frontAnkle: [-0.12, 0.075 + MAT_Y, 0.36] };
})();
// The back-leg-side (left) arm reaches up by angles; the right hand rests on the hip.
function hipFlexor(o, reach = 0) {
  return {
    ...halfKneel(o, HIPFLEX),
    armL: [8 + 164 * reach, 8 + 10 * reach, 12 - 7 * reach, 0],
    handsIn: "pelvis",
    handR: [-0.23, 0.05, 0.03],
    elbowR: [-1, 0, -0.3],
  };
}
const HF_START = { beta: 2, tilt: 4 };
const HF_TUCK = { beta: 4, tilt: -10 };
const HF_SHIFT = { beta: 15, tilt: -10 };

// ---------- butterfly (cobbler's pose) ----------
// Sitting on the mat, soles together, knees out (IK poles point sideways; the feet stay put).
// hinge: forward tilt of the pelvis from the sitting bones (long spine); drop: knees sinking.
const BF_FEET = { x: 0.085, y: 0.068 + MAT_Y, z: 0.32 };
function butterflyBody({ hinge = 0, drop = 0, breath = 0 }) {
  const pole = [1, 0.25 - drop, 0.1];
  const p = {
    root: [0, MAT_Y + 0.12 + 0.012 * Math.sin(hinge * D2R), 0],
    rot: [hinge + 4, 0, 0],
    spine: [3 + hinge * 0.2 + breath, 0, 0],
    neck: [hinge * 0.15, 0],
    footL: [BF_FEET.x, BF_FEET.y, BF_FEET.z],
    footR: [-BF_FEET.x, BF_FEET.y, BF_FEET.z],
    kneeL: pole,
    kneeR: [-pole[0], pole[1], pole[2]],
    feetMode: "shin",
    ankleL: 10,
    ankleR: 10,
  };
  return p;
}
function butterfly(o) {
  const body = butterflyBody(o);
  const J = joints(body);
  // Hands holding the feet: the hand rests on the instep, so the wrist sits a little short of it.
  const grip = (s) => {
    const a = J["ankle" + s], b = J["ball" + s], sh = J["shoulder" + s];
    const g = [(a.x + b.x) / 2 * 0.7, (a.y + b.y) / 2 + 0.06, (a.z + b.z) / 2];
    const d = Math.hypot(sh.x - g[0], sh.y - g[1], sh.z - g[2]);
    return g.map((v, i) => v + ([sh.x, sh.y, sh.z][i] - v) * (0.06 / d));
  };
  return { ...body, shrugL: [0, (o.hinge ?? 0) * 0.0004], shrugR: [0, (o.hinge ?? 0) * 0.0004], handsIn: "world", handL: grip("L"), handR: grip("R"), elbowL: [1, -0.4, -0.2], elbowR: [-1, -0.4, -0.2] };
}

// ---------- standing hamstring stretch ----------
// Standing on the right leg, left heel on a step with the leg straight and the toes up; the
// hips stay put and the pelvis tips forward (hinge) with a flat back. Hands on the hips.
const HAM_STEP = { type: "step", pos: [FOOT_X, 0, 0.76], w: 0.42, d: 0.36, h: 0.3 };
const HAM_ROOT = [-0.04, STAND_Y - 0.012, 0];
const HAM_TOE = -60; // foot pitched toes-up on the heel
const HAM_HEEL = (() => {
  // Ankle spot that puts the heel on the step with the hip-to-ankle distance of a straight leg.
  const J = joints({ root: HAM_ROOT, footL: [FOOT_X, 0.4, 0.6], toeL: HAM_TOE });
  const hy = J.heelL.y - J.ankleL.y; // heel below the ankle
  const y = HAM_STEP.h - 0.009 - hy; // the foot shell sits ~1 cm above its heel point
  const dy = J.hipL.y - y, dx = FOOT_X - J.hipL.x;
  return [FOOT_X, y, J.hipL.z + Math.sqrt(0.866 ** 2 - dy * dy - dx * dx)];
})();
// step: 0 = both feet on the floor, 0.5 = foot lifted, 1 = heel on the step.
function hamstring({ step = 1, hinge = 0, breath = 0 }) {
  const lifted = [FOOT_X, 0.42, 0.34];
  const floor = [FOOT_X, ANKLE_Y, 0];
  const s = Math.min(1, step * 2), t = Math.max(0, step * 2 - 1);
  const footL = step <= 0.5 ? floor.map((v, i) => v + (lifted[i] - v) * s) : lifted.map((v, i) => v + (HAM_HEEL[i] - v) * t);
  return {
    root: [HAM_ROOT[0] * Math.min(1, step * 2), HAM_ROOT[1], 0],
    rot: [hinge, 0, 0],
    spine: [breath, 0, 0],
    neck: [-hinge * 0.25, 0],
    footR: [-FOOT_X, ANKLE_Y, 0],
    footL,
    toeL: step <= 0.5 ? -20 * s : -20 + (HAM_TOE + 20) * t,
    kneeL: [0.1, 1, 0.5],
    kneeR: [-0.1, 0, 1],
    ...ARMS.hips,
  };
}

// ---------- tree pose ----------
// Standing on the right leg. The left foot is an IK target: on the floor, lifted, then pressed
// into the inner right thigh above the knee, with the knee pole pointing out to the side.
// The foot follows the shin ("shin" mode), so its sole faces the standing thigh.
const TREE_FOOT = {
  floor: { at: [FOOT_X, ANKLE_Y, 0], pole: [0.15, 0, 1], ankle: 0 }, // ankle flattened in tree()
  lifted: { at: [0.05, 0.36, 0.1], pole: [0.8, 0, 0.7], ankle: 10 },
  thigh: { at: [-0.085, 0.775, 0.02], pole: [1, -0.15, 0.5], ankle: 5 },
};
// Hands (chest frame): palms together at the chest, in front of the face, overhead.
const TREE_HANDS = {
  chest: { L: [0.02, -0.14, 0.2], R: [-0.02, -0.14, 0.2], pole: [1, -0.6, 0] },
  face: { L: [0.03, 0.3, 0.33], R: [-0.03, 0.3, 0.33], pole: [1, -0.2, 0] },
  overhead: { L: [0.03, 0.46, 0.07], R: [-0.03, 0.46, 0.07], pole: [1, 0.3, 0] },
};
function tree({ shift = 1, foot = "thigh", hands = "chest", sway = 0 }) {
  const F = TREE_FOOT[foot], H = TREE_HANDS[hands];
  const p = {
    root: [-0.07 * shift + 0.008 * sway, STAND_Y - 0.01, 0],
    rot: [0, 0, sway * 0.8],
    spine: [0, -sway * 0.8, 0],
    turnout: 0, // the lifted foot follows its shin, so keep both feet pointing straight ahead
    footR: [-FOOT_X, ANKLE_Y, 0],
    footL: F.at,
    kneeL: F.pole,
    footModeL: "shin",
    ankleL: F.ankle,
    handsIn: "chest",
    handL: H.L,
    handR: H.R,
    elbowL: H.pole,
    elbowR: [-H.pole[0], H.pole[1], H.pole[2]],
  };
  if (foot === "floor") {
    // Flatten the foot that follows the shin. Both feet get the same ankle value so the
    // left/right swap at the side switch changes nothing.
    const flat = (Math.asin(joints(p).footFL.y) * 180) / Math.PI;
    p.ankleL = p.ankleR = flat;
  } else p.ankleR = 0;
  return p;
}

export default {
  thread: {
    clips: [
      {
        title: "Thread the needle",
        props: [mat(0.1)],
        highlight: ["upperBack", "shoulders"],
        camera: { view: [0.55, 0.45, 1], target: [0, 0.42, 0.15], dist: 4.0 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: threadPose({}), cue: "Hands under the shoulders, knees under the hips" },
          { t: 0.5, p: threadPose({}), cue: "Reach one arm under, shoulder toward the floor" },
          ...move(threadPose, { u: 0 }, { u: -1 }, 0.5, 2.3, { n: 3, after: "Breathe; let the shoulder sink" }),
          { t: 2.9, p: threadPose({ u: -1 }), cue: "Open the arm to the ceiling, eyes follow the hand" },
          ...move(threadPose, { u: -1 }, { u: 1 }, 2.9, 5.3, { n: 6, after: "Pause at the top" }),
          { t: 5.9, p: threadPose({ u: 1 }), cue: "Hand back down, then switch sides" },
          ...move(threadPose, { u: 1 }, { u: 0 }, 5.9, 7.299, { n: 3 }),
          { t: 7.3, p: mirrorPose(makePose(threadPose({}))), e: "hold" },
        ],
      },
    ],
  },

  tree: {
    clips: [
      {
        title: "Tree pose",
        props: [mat(0)],
        highlight: ["ankles", "glutes", "core"],
        camera: { view: [0.3, 0.12, 1], target: [0, 1.04, 0], dist: 4.7 },
        alternate: true,
        keys: [
          { t: 0, p: tree({ shift: 0, foot: "floor" }), cue: "Stand tall, palms together at your chest" },
          { t: 0.6, p: tree({ shift: 0, foot: "floor" }), cue: "Shift your weight onto one foot" },
          { t: 1.3, p: tree({ foot: "floor" }), cue: "Foot on the inner calf or thigh, never the knee" },
          { t: 1.9, p: tree({ foot: "lifted" }) },
          { t: 2.6, p: tree({}), cue: "Hands overhead; fix your gaze on one point" },
          { t: 3.2, p: tree({ hands: "face" }) },
          { t: 3.9, p: tree({ hands: "overhead" }), cue: "Hold and breathe" },
          { t: 4.9, p: tree({ hands: "overhead", sway: 1 }) },
          { t: 5.9, p: tree({ hands: "overhead", sway: -1 }) },
          { t: 6.7, p: tree({ hands: "overhead" }), cue: "Hands to the chest, foot down, switch sides" },
          { t: 7.3, p: tree({ hands: "face" }) },
          { t: 7.9, p: tree({}) },
          { t: 8.5, p: tree({ foot: "lifted" }) },
          { t: 9.1, p: tree({ foot: "floor" }) },
          { t: 9.7, p: tree({ shift: 0, foot: "floor" }) },
        ],
      },
    ],
  },

  hamstring: {
    clips: [
      {
        title: "Standing hamstring stretch",
        props: [HAM_STEP],
        highlight: ["hamstrings"],
        camera: { view: [1, 0.2, 0.3], target: [0, 0.85, 0.3], dist: 3.9 },
        alternate: true,
        keys: [
          { t: 0, p: hamstring({ step: 0 }), cue: "Face a step, hands on your hips" },
          { t: 0.4, p: hamstring({ step: 0 }), cue: "Heel on the step, leg straight, toes up" },
          { t: 1.1, p: hamstring({ step: 0.5 }) },
          { t: 1.8, p: hamstring({ step: 1 }) },
          { t: 2.2, p: hamstring({ step: 1 }), cue: "Hinge forward with a flat back" },
          { t: 4.0, p: hamstring({ hinge: 32 }), cue: "Hold where you feel the stretch" },
          { t: 5.8, p: hamstring({ hinge: 33, breath: 2 }), cue: "Come back up tall" },
          { t: 7.2, p: hamstring({ hinge: 0 }), cue: "Foot down, switch legs" },
          { t: 7.8, p: hamstring({ step: 0.5 }) },
          { t: 8.5, p: hamstring({ step: 0 }) },
        ],
      },
    ],
  },

  butterfly: {
    clips: [
      {
        title: "Butterfly stretch",
        props: [mat(0.1)],
        highlight: ["adductors", "hips"],
        camera: { view: [0.6, 0.5, 1], target: [0, 0.35, 0.15], dist: 3.2 },
        keys: [
          { t: 0, p: butterfly({}), cue: "Sit tall, soles together, knees falling out" },
          { t: 0.8, p: butterfly({}), cue: "Hinge forward from the hips, long spine" },
          { t: 3.0, p: butterfly({ hinge: 24 }), cue: "Breathe and let the knees sink" },
          { t: 4.6, p: butterfly({ hinge: 25, drop: 0.12, breath: 2 }) },
          { t: 5.6, p: butterfly({ hinge: 24, drop: 0.12 }), cue: "Roll back up to sitting tall" },
          { t: 7.6, p: butterfly({}) },
        ],
      },
    ],
  },

  couch: {
    clips: [
      {
        title: "Couch stretch",
        props: [{ type: "sofa", pos: [0, 0, SOFA_FACE - 0.425], w: 1.3 }, mat(-0.05, 1.1)],
        highlight: ["quads", "hips"],
        camera: { view: [1, 0.22, 0.3], target: [0, 0.55, -0.55], dist: 4.0 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: couch(COUCH_SET, 0.85), cue: "Rest your back shin against the sofa, other foot forward" },
          // 1 ms "hold" segment: switching sides is an instant cut, not a blend.
          { t: 0.001, p: couch(COUCH_SET, 0.85), e: "hold", cue: "Rest your back shin against the sofa, other foot forward" },
          { t: 0.6, p: couch(COUCH_SET, 0.85), cue: "Squeeze the back glute, tuck the pelvis" },
          { t: 2.6, p: couch(COUCH_UP, 0.45), cue: "Stay upright and breathe" },
          { t: 4.4, p: couch({ ...COUCH_UP, breath: 2 }, 0.45) },
          { t: 5.4, p: couch(COUCH_UP, 0.45), cue: "Ease out, then switch sides" },
          { t: 6.999, p: couch(COUCH_SET, 0.85) },
          { t: 7.0, p: mirrorPose(makePose(couch(COUCH_SET, 0.85))), e: "hold" },
        ],
      },
    ],
  },

  hipflexor: {
    clips: [
      {
        title: "Half-kneeling hip flexor stretch",
        props: [mat(0), CUSHION],
        highlight: ["hips", "quads"],
        camera: { view: [1, 0.22, 0.45], target: [0, 0.8, 0.02], dist: 4.3 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: hipFlexor(HF_START), cue: "Half-kneel, back knee on a cushion" },
          // 1 ms "hold" segment: switching sides is an instant cut, not a blend.
          { t: 0.001, p: hipFlexor(HF_START), e: "hold", cue: "Half-kneel, back knee on a cushion" },
          { t: 0.5, p: hipFlexor(HF_START), cue: "Tuck the pelvis, squeeze the back glute" },
          { t: 1.8, p: hipFlexor(HF_TUCK), cue: "Shift forward slightly" },
          { t: 3.1, p: hipFlexor(HF_SHIFT), cue: "Reach the same-side arm up" },
          { t: 4.4, p: hipFlexor({ ...HF_SHIFT, side: 8 }, 1), cue: "Hold and breathe" },
          { t: 5.9, p: hipFlexor({ ...HF_SHIFT, side: 8, breath: 2 }, 1), cue: "Release, then switch sides" },
          { t: 7.399, p: hipFlexor(HF_START) },
          { t: 7.4, p: mirrorPose(makePose(hipFlexor(HF_START))), e: "hold" },
        ],
      },
    ],
  },

  shin: {
    clips: [
      {
        title: "Kneeling shin stretch",
        props: [mat(-0.1)],
        highlight: ["shins", "ankles"],
        camera: { view: [1, 0.25, 0.4], target: [0, 0.62, -0.12], dist: 3.6 },
        keys: [
          { t: 0, p: shinPose({}), cue: "Kneel, tops of the feet flat on the mat" },
          { t: 0.5, p: shinPose({}), cue: "Sit back toward your heels" },
          ...move(shinPose, {}, SEIZA, 0.5, 2.9, { after: "Relax and breathe" }),
          { t: 4.1, p: shinPose({ ...SEIZA, breath: 2 }), cue: "More stretch: hands on the mat behind you" },
          ...move(shinPose, SEIZA, LEAN_BACK, 4.1, 5.6, { n: 3, after: "Lift the knees slightly" }),
          ...move(shinPose, LEAN_BACK, KNEES_UP, 5.6, 6.6, { n: 2, after: "Hold and breathe" }),
          { t: 7.8, p: shinPose(KNEES_UP), cue: "Knees down, sit up tall" },
          ...move(shinPose, KNEES_UP, SEIZA, 7.8, 9.4, { n: 3, after: "Back up to kneeling" }),
          ...move(shinPose, SEIZA, {}, 9.4, 11.2),
        ],
      },
    ],
  },

  bigtoe: {
    clips: [
      {
        title: "Big-toe stretch (toe sit)",
        props: [mat(0)],
        highlight: ["feet", "ankles"],
        camera: { view: [1, 0.25, 0.45], target: [0, 0.62, 0.08], dist: 3.6 },
        keys: [
          { t: 0, p: toeHandsDown({}), cue: "Kneel with your toes tucked under" },
          { t: 0.5, p: toeHandsDown({}), cue: "Support some of your weight with your hands on the floor" },
          ...move(toeHandsDown, {}, TOE_ON_HANDS, 0.5, 1.9, { n: 3, after: "Sit back gently toward your heels" }),
          ...move(toeHandsDown, TOE_ON_HANDS, TOE_SIT_BACK, 1.9, 4.1, { after: "As the stretch gets easier, lift your hands off the floor" }),
          ...move(toeHandsUp, { ...TOE_SIT_BACK, reach: 0 }, { sit: 54, lean: 4, reach: 1 }, 4.1, 5.9, { after: "Breathe; stay as long as it feels OK" }),
          { t: 7.3, p: toeHandsUp({ sit: 54, lean: 4, reach: 1, breath: 2 }), cue: "Rise back up to kneeling" },
          ...move(toeHandsUp, { sit: 54, lean: 4, reach: 1 }, { reach: 1 }, 7.3, 9.1),
        ],
      },
    ],
  },

  catcow: {
    clips: [
      {
        title: "Cat-cow",
        props: [mat(0.1)],
        highlight: ["back", "neck"],
        camera: { view: [1, 0.3, 0.25], target: [0, 0.38, 0.12], dist: 3.6 },
        keys: [
          { t: 0, p: quad(), cue: "Hands under the shoulders, knees under the hips" },
          { t: 0.4, p: quad(), cue: "Breathe out: round the back, tuck chin and tailbone" },
          { t: 2.6, p: quad(CAT) },
          { t: 3.1, p: quad(CAT), cue: "Breathe in: lift the chest and tailbone" },
          { t: 5.6, p: quad(COW) },
          { t: 6.1, p: quad(COW), cue: "Back to neutral; slow breaths" },
          { t: 7.3, p: quad() },
        ],
      },
    ],
  },

  cobra: {
    clips: [
      {
        title: "Cobra",
        props: [mat(-0.1, 2.0)],
        highlight: ["back", "chest"],
        camera: { view: [1, 0.2, 0.35], target: [0, 0.22, -0.05], dist: 4.3 },
        keys: [
          { t: 0, p: cobra(0), cue: "Face down, hands under the shoulders, elbows in" },
          { t: 0.6, p: cobra(0), cue: "Press up to lift the chest; hips stay down" },
          ...transition(cobra, 0, 48, 0.6, 2.6, "Neck long, gaze forward and down"),
          { t: 4.6, p: cobra(50), cue: "Lower slowly" },
          ...transition(cobra, 50, 0, 4.6, 6.6),
        ],
      },
    ],
  },
};
