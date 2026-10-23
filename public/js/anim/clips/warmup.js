// Animations for the warm-up & balance exercises.
import { ANKLE_Y, ARMS, D2R, DIM, FOOT_X, STAND_Y, ground, joints, stand, transition } from "../poses.js";
import { makePose, mirrorPose } from "../rig.js";

// ---------- helpers ----------

const BALL = DIM.toe * 0.72; // ankle → ball of the foot, along the sole

// Ankle target for a foot that rises onto its toes by `pitch`° (heel up) without sliding.
// `flat` is where the ankle sits with the foot flat; yaw is the direction the foot points.
// The rigid foot pivots on its ball up to ~32°, then on the toe tip, so the toes never dip into the floor.
const BALL_PT = [BALL, -DIM.ankleH]; // [along the sole, up] from the ankle
const TOE_PT = [DIM.toe, -DIM.ankleH * 0.55];
const TOE_SWITCH = Math.atan2(TOE_PT[1] - BALL_PT[1], TOE_PT[0] - BALL_PT[0]); // ball and toe tip level
const footPt = ([lf, lu], a) => [lf * Math.cos(a) + lu * Math.sin(a), -lf * Math.sin(a) + lu * Math.cos(a)];
function tiptoe([x, y, z], pitch, yaw = 0) {
  const a = pitch * D2R;
  let pivot = BALL_PT, pt = BALL_PT; // pivot position relative to the flat ankle, and which foot point it is
  if (a > TOE_SWITCH) {
    const b = footPt(BALL_PT, TOE_SWITCH), t = footPt(TOE_PT, TOE_SWITCH);
    pivot = [BALL_PT[0] - b[0] + t[0], BALL_PT[1] - b[1] + t[1]];
    pt = TOE_PT;
  }
  const o = footPt(pt, a);
  const fwd = pivot[0] - o[0], up = pivot[1] - o[1];
  return [x + fwd * Math.sin(yaw * D2R), y + up, z + fwd * Math.cos(yaw * D2R)];
}

// Samples a periodic pose function into continuous curves; the last key repeats the first
// so the loop closes without an extra blend.
function cycle(fn, period, n, cue) {
  n *= 4;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push({ t: (period * i) / n, p: fn(i / n), e: "smooth" });
  keys[0].cue = cue;
  keys.push({ t: period, p: keys[0].p, e: "smooth" });
  return keys;
}

// IK ankle target + knee pole that reproduce a leg given as angles [hipFlex, hipAbd, kneeFlex] at pose p.
// Lets a leg that also stands on the floor (IK) swing freely with natural joint angles.
function legIK(p, side, [flex, abd, knee]) {
  const J = joints({ ...p, ["foot" + side]: null, ["leg" + side]: [flex, abd, knee, 0] });
  const hip = J["hip" + side], kn = J["knee" + side], an = J["ankle" + side];
  const pole = kn.clone().sub(hip.clone().lerp(an, 0.5)).normalize();
  return { ["foot" + side]: [an.x, an.y, an.z], ["knee" + side]: [pole.x, pole.y, pole.z] };
}

// World IK wrist target + elbow pole that reproduce an arm given as angles [flex, abd, elbow] at pose p,
// so an arm that sometimes holds on to something keeps one representation in every key.
function armIK(p, side, [flex, abd, elbow]) {
  const J = joints({ ...p, ["hand" + side]: null, ["arm" + side]: [flex, abd, elbow, 0] });
  const sh = J["shoulder" + side], el = J["elbow" + side], wr = J["wrist" + side];
  const pole = el.clone().sub(sh.clone().lerp(wr, 0.5)).normalize();
  return { ["hand" + side]: [wr.x, wr.y, wr.z], ["elbow" + side]: [pole.x, pole.y, pole.z] };
}

// ---------- single-leg balance ----------

// Standing on the right leg; the left knee lifts in front.
function oneLeg(sway = 0, eyes = 0) {
  return {
    root: [-0.05 + sway * 0.01, STAND_Y - 0.004, 0],
    rot: [0, 0, sway * 1.2],
    spine: [0, -sway * 1.2, 0],
    footR: [-FOOT_X, ANKLE_Y, 0],
    footL: [FOOT_X - 0.02, 0.44, 0.14],
    toeL: 28,
    ...ARMS.hips,
    head: [eyes, 0],
  };
}

// ---------- backward walk ----------

// One stride of walking backward, phase 0…1. Each foot lands behind the body on its ball,
// the heel follows, and the flat foot then travels forward under the bent knee at floor speed
// ("push the floor away") until it lifts in front and swings back for the next step.
// Stride time (s), stance share, landing ankle z, stance travel (m), swing height (m).
// Each clip plays 4 strides; a 0.288 m stance travel moves the floor exactly 3 grid tiles (0.64 m)
// per clip, so the grid doesn't jump when the clip changes.
const BW = { T: 1.3, duty: 0.6, land: -0.2, len: 0.288, lift: 0.07, loops: 4 };
const BW_SPEED = BW.len / (BW.duty * BW.T); // m/s of the floor under the stance foot
// Positive floorScroll moves the grid toward the figure's front, which reads as walking backward.
const BW_SCROLL = BW_SPEED / 0.64;

function backFoot(ph, s) {
  const x = FOOT_X * s;
  if (ph <= BW.duty) {
    const pitch = Math.max(0, 22 * (1 - ph / 0.2)); // ball first, heel follows
    const flat = [x, ANKLE_Y, BW.land + (BW.len * ph) / BW.duty];
    return { pos: tiptoe(flat, pitch, 7 * s), toe: pitch };
  }
  const u = (ph - BW.duty) / (1 - BW.duty);
  const pitch = 22 * Math.sin((Math.PI / 2) * u); // toes reach back for the next landing
  const flat = [x, ANKLE_Y + BW.lift * Math.sin(Math.PI * u), BW.land + (BW.len * (1 + Math.cos(Math.PI * u))) / 2];
  return { pos: tiptoe(flat, pitch, 7 * s), toe: pitch };
}

function backwalk(ph, { dumbbells = false } = {}) {
  const L = backFoot(ph % 1, 1);
  const R = backFoot((ph + 0.5) % 1, -1);
  const bob = 0.006 * Math.cos(4 * Math.PI * (ph - 0.3)); // highest in mid single support
  const sway = 0.012 * Math.cos(2 * Math.PI * (ph - 0.3)); // over the stance foot
  const swing = Math.sin(2 * Math.PI * (ph - 0.35)); // right arm forward as the left foot leads
  const arms = dumbbells
    ? { armL: [12 - 4 * swing, 9, 8, 0], armR: [12 + 4 * swing, 9, 8, 0] } // hanging straight down (chest leans 12°)
    : { armL: [-16 * swing, 8, 32, 0], armR: [16 * swing, 8, 32, 0] };
  return {
    root: [sway, 0.885 + bob, 0],
    rot: [6, 3 * swing, 0.8 * swing],
    spine: [6, -0.8 * swing, -5 * swing],
    neck: [-8, 0],
    footL: L.pos,
    footYawL: 7,
    footYawR: -7,
    toeL: L.toe,
    footR: R.pos,
    toeR: R.toe,
    ...arms,
  };
}

// ---------- pogo hops ----------

// Feet hip-width, hands on hips. Most of the spring comes from the ankles; knees stay almost straight.
const HIP_HANDS = { ...ARMS.hips, handL: [0.17, 0.05, 0.03], handR: [-0.17, 0.05, 0.03] };
function pogo(stage) {
  const feet = (pitch, lift) => ({
    footL: tiptoe([FOOT_X, ANKLE_Y + lift, 0], pitch, 7),
    footR: tiptoe([-FOOT_X, ANKLE_Y + lift, 0], pitch, -7),
    toeL: pitch,
    toeR: pitch,
  });
  const base = { ...HIP_HANDS, rot: [3, 0, 0], neck: [-3, 0] };
  if (stage === "bottom") return { ...base, root: [0, 0.934, 0.0], ...feet(0, 0) }; // heels kiss the floor
  if (stage === "push") return { ...base, root: [0, 0.997, 0.045], ...feet(30, 0) }; // on the balls, legs long
  return { ...base, root: [0, 1.05, 0.045], ...feet(32, 0.05) }; // flight, toes pointed
}

// ---------- dynamic series ----------

// Arm circles: arms out to the sides; f walks around the circle
// (0 low, −90 back, −180 high, −270 front), so a falling f draws forward circles.
function armCircle(f) {
  const follow = Math.sin(f * D2R);
  return { ...stand(), spine: [1.2 * follow, 0, 0], armL: [f, 58, 6 + 3 * follow, 0], armR: [f, 58, 6 + 3 * follow, 0], wristL: [4 * follow, 0, 0], wristR: [4 * follow, 0, 0], neck: [-2 - follow, 0] };
}

// Leg swings: right hand on a wall; flexion and abduction make smooth arcs in either plane.
// Both hands are IK targets in every key, so the mirrored half (other hand on the wall) blends smoothly.
const SWING_WALL = { type: "wall", pos: [-0.665, 0, -0.1], rotY: 90, w: 0.8, h: 2.1 };
function legSwing(flex, knee, { hand = true, abduction = 3 } = {}) {
  const legs = {
    root: [0, STAND_Y, 0],
    neck: [-3, 0],
    legR: [0, 3, 1, 0],
    legL: [flex, abduction, knee, knee > 1 ? (flex < 10 ? -10 : 6) : 0], // toes up as the foot brushes past the floor
  };
  const p = { ...ground(legs, ["heelR", "ballR"]), handsIn: "world" };
  const rest = armIK(p, "R", [0, 14, 25]), J = joints({ ...p, ...rest });
  const right = hand
    ? { handR: [-0.602, 1.3, 0.1], elbowR: [-0.3, -1, -0.3], palmR: [1, 0, 0], fingersR: [0, 1, 0] }
    : { ...rest, palmR: J.handRefR.toArray(), fingersR: J.handDirR.toArray() };
  return { ...p, ...armIK(p, "L", [-flex * 0.3, 14, 25]), ...right }; // free arm: small counter-swing
}

// High knees, light and quiet: a quick march on the balls of the feet, knees to hip height.
// Phase 0…1; the left foot is down for 0…0.5 and its knee peaks at 0.75.
function highKnee(ph) {
  const p = {
    root: [0, 0.95 + 0.01 * Math.cos(4 * Math.PI * (ph - 0.25)), 0.02],
    rot: [2, 3 * Math.sin(2 * Math.PI * ph), 0],
    spine: [0, 0, -5 * Math.sin(2 * Math.PI * ph)],
    neck: [-3, 0],
    footYawL: 7,
    footYawR: -7,
  };
  for (const [side, s, off] of [["L", 1, 0], ["R", -1, 0.5]]) {
    const q = (ph + off) % 1;
    if (q <= 0.5) {
      Object.assign(p, { ["foot" + side]: tiptoe([FOOT_X * s, ANKLE_Y, 0], 12, 7 * s), ["toe" + side]: 12, ["knee" + side]: [0.12 * s, 0, 1] });
    } else {
      const u = Math.sin(Math.PI * ((q - 0.5) / 0.5)); // 0 → 1 (knee at hip height) → 0
      const swing = legIK(p, side, [92 * u, 5, 20 + 75 * u]);
      const contact = tiptoe([FOOT_X * s, ANKLE_Y, 0], 12, 7 * s);
      const blend = u * u * (3 - 2 * u);
      p["foot" + side] = contact.map((v, i) => v + (swing["foot" + side][i] - v) * blend);
      p["knee" + side] = [0.12 * s, 0, 1].map((v, i) => v + (swing["knee" + side][i] - v) * blend);
      p["toe" + side] = 12 + 16 * blend;
    }
  }
  const drive = Math.sin(2 * Math.PI * (ph - 0.5)); // right arm forward while the left knee is up
  p.armL = [12 - 42 * drive, 8, 85 + 15 * drive, 0]; // forward arm bends more
  p.armR = [12 + 42 * drive, 8, 85 - 15 * drive, 0];
  return p;
}

// Lateral lunge from a wide stance: d = 0 (centre) … 1 (sitting back over the left foot, right leg long).
function lateralLunge(d) {
  return {
    root: [0.2 * d, 0.84 - 0.16 * d, -0.12 * d],
    rot: [36 * d, 0, 0],
    spine: [6 * d, 0, 0],
    neck: [-18 * d, 0],
    turnout: 18,
    footL: [0.5, ANKLE_Y, 0],
    footR: [-0.5, ANKLE_Y, 0],
    kneeL: [0.45, 0, 1],
    kneeR: [-0.45, 0, 1],
    ...ARMS.prayer,
  };
}

// Hip CARs: standing on the right leg, one hand on a wall for support, the left knee draws
// a slow circle: up, out, back, down. Angles for the moving thigh [flex, abduction, knee],
// turned into an IK target so the leg can start on the floor.
const CAR_WALL = { type: "wall", pos: [-0.75, 0, 0.08], rotY: 90, w: 1.25, h: 2.1 };
const CAR_HAND = [-0.685, 1.27, 0.12];
function hipCar(leg) {
  const p = { root: [-0.035, STAND_Y - 0.008, 0], rot: [0, 0, 1.5], neck: [-2, 0], footR: [-FOOT_X, ANKLE_Y, 0], kneeR: [-0.12, 0, 1], ...ARMS.hips };
  const body = !leg ? { ...p, footL: [FOOT_X, ANKLE_Y, 0], kneeL: [0.12, 0, 1], toeL: 0 } : { ...p, ...legIK(p, "L", leg), toeL: 15 };
  // Keep the hip hand where ARMS.hips put it, and put the other palm flat on the wall.
  const J = joints(body);
  return {
    ...body,
    handsIn: "world",
    handL: J.wristL.toArray(),
    elbowL: [1, 0, -0.3],
    handR: CAR_HAND,
    elbowR: [-1, -0.8, -0.2],
    palmR: [1, 0, 0],
    fingersR: [0, 1, 0],
  };
}

// Lunge with twist: the left foot steps forward into a lunge, then the chest turns toward the front knee.
// Arms reach forward from the chest, so they turn with it.
const LUNGE_FRONT = [0.13, ANKLE_Y, 0.8];
function lungeTwist(stage, twist = 0) {
  const arms = { handsIn: "chest", handL: [0.04, -0.13, 0.48], handR: [-0.04, -0.13, 0.48], elbowL: [0.6, -1, 0], elbowR: [-0.6, -1, 0] };
  const back = (pitch) => ({ footR: tiptoe([-FOOT_X, ANKLE_Y, 0], pitch, -7), toeR: pitch, kneeR: [0, -1, 0.35] });
  const body = { spine: [0, 0, twist], neck: [-2, twist * 0.2], head: [0, twist * 0.25], ...arms };
  switch (stage) {
    case "stand":
      return { ...stand(), ...body, ...back(0), kneeL: [0.12, 0, 1], toeL: 0 };
    case "lift": // left knee rises, foot travels forward
      return { root: [0, STAND_Y - 0.01, 0.07], ...body, ...back(0), footL: [0.12, 0.24, 0.36], kneeL: [0.12, 0, 1], toeL: 12 };
    case "land": // front foot down, weight moving forward
      return { root: [0, 0.82, 0.38], rot: [4, 0, 0], ...body, ...back(25), footL: LUNGE_FRONT, kneeL: [0.12, 0, 1], toeL: 0 };
    default: // "bottom": back knee hovering above the floor, front thigh about level
      return { root: [0, 0.56, 0.4], rot: [2, 0, 0], ...body, ...back(55), footL: LUNGE_FRONT, kneeL: [0.12, 0, 1], toeL: 0 };
  }
}

export default {
  balance: {
    clips: [
      {
        title: "Single-leg balance",
        props: [{ type: "wall", pos: [-0.74, 0, 0.05], rotY: 90, w: 1.2, h: 2.1 }],
        highlight: ["ankles", "glutes", "core"],
        camera: { view: "front", target: [0, 0.96, 0], dist: 3.95 },
        alternate: true,
        keys: [
          { t: 0, p: stand(ARMS.hips), cue: "Hands on hips, a wall beside you; lift one foot" },
          { t: 0.8, p: oneLeg(0), cue: "Hold for 30 s; close your eyes once this feels easy" },
          { t: 2.2, p: oneLeg(1) },
          { t: 3.6, p: oneLeg(-1) },
          { t: 4.6, p: oneLeg(0), cue: "Lower the foot" },
          { t: 5.4, p: stand(ARMS.hips), cue: "Switch legs" },
        ],
      },
    ],
  },

  backwalk: {
    clips: [
      {
        title: "Backward walk",
        highlight: ["quads", "calves"],
        camera: { view: [1, 0.2, 0.32], target: [0, 0.85, 0], dist: 3.7 },
        floorScroll: BW_SCROLL,
        loops: BW.loops,
        keys: cycle((ph) => backwalk(ph), BW.T, 10, "Short steps back: ball of the foot first, heel follows"),
      },
      {
        title: "Backward walk with dumbbells (Phase 2+)",
        hold: { L: true, R: true, axis: "z" },
        highlight: ["quads", "calves", "grip"],
        camera: { view: [1, 0.2, 0.32], target: [0, 0.85, 0], dist: 3.7 },
        floorScroll: BW_SCROLL,
        loops: BW.loops,
        keys: cycle((ph) => backwalk(ph, { dumbbells: true }), BW.T, 10, "Knees bent and over the toes; push the floor away"),
      },
    ],
  },

  dynamic: {
    clips: [
      {
        title: "Arm circles",
        highlight: ["shoulders", "rotatorCuff"],
        camera: { view: "three", target: [0, 1.0, 0], dist: 4.4 },
        keys: [
          { t: 0, p: armCircle(0), cue: "Arm circles: 10 forward, arms long" },
          { t: 0.5, p: armCircle(120), e: "in" },
          { t: 0.83, p: armCircle(240), e: "lin" },
          { t: 1.17, p: armCircle(360), e: "lin" },
          { t: 1.5, p: armCircle(480), e: "lin" },
          { t: 1.83, p: armCircle(600), e: "lin" },
          { t: 2.33, p: armCircle(720), e: "out", cue: "Then 10 backward" },
          { t: 2.83, p: armCircle(600), e: "in" },
          { t: 3.17, p: armCircle(480), e: "lin" },
          { t: 3.5, p: armCircle(360), e: "lin" },
          { t: 3.83, p: armCircle(240), e: "lin" },
          { t: 4.17, p: armCircle(120), e: "lin" },
          { t: 4.67, p: armCircle(0), e: "out" },
        ],
      },
      {
        title: "Leg swings",
        props: [SWING_WALL],
        highlight: ["hips", "hamstrings"],
        camera: { view: [0.85, 0.22, 0.75], target: [0, 0.85, 0.1], dist: 4.0 },
        alternate: true,
        loops: 1,
        close: false,
        keys: [
          { t: 0, p: legSwing(0, 1, { hand: false }) },
          { t: 0.5, p: legSwing(0, 9), e: "smooth", cue: "One hand on a wall, stand tall; swing front to back" },
          { t: 1.0, p: legSwing(-26, 18), e: "smooth" },
          { t: 1.4, p: legSwing(0, 22), e: "smooth" },
          { t: 1.8, p: legSwing(62, 6), e: "smooth" },
          { t: 2.2, p: legSwing(0, 22), e: "smooth" },
          { t: 2.6, p: legSwing(-26, 18), e: "smooth" },
          { t: 3.0, p: legSwing(0, 22), e: "smooth" },
          { t: 3.4, p: legSwing(62, 6), e: "smooth" },
          { t: 4.0, p: legSwing(0, 9), cue: "Then swing the leg side to side, keep your hips square" },
          { t: 4.4, p: legSwing(0, 9, { abduction: 33 }), e: "smooth" },
          { t: 4.8, p: legSwing(0, 9), e: "smooth" },
          { t: 5.2, p: legSwing(16, 18, { abduction: -20 }), e: "smooth" },
          { t: 5.6, p: legSwing(0, 9), e: "smooth" },
          { t: 6.0, p: legSwing(0, 9, { abduction: 33 }), e: "smooth" },
          { t: 6.4, p: legSwing(0, 9), e: "smooth" },
          { t: 6.8, p: legSwing(16, 18, { abduction: -20 }), e: "smooth" },
          { t: 7.2, p: legSwing(0, 9), e: "smooth" },
          { t: 7.8, p: legSwing(0, 1, { hand: false }), cue: "Switch legs" },
          { t: 7.801, p: mirrorPose(makePose(legSwing(0, 1, { hand: false }))), e: "hold" },
        ],
      },
      {
        title: "High knees on the spot",
        highlight: ["hips", "quads", "calves"],
        camera: { view: [0.85, 0.2, 0.7], target: [0, 0.95, 0.1], dist: 4.1 },
        loops: 5,
        keys: cycle(highKnee, 0.8, 8, "High knees for 20 s: light, quiet feet"),
      },
      {
        title: "Lateral lunges",
        highlight: ["adductors", "glutes", "quads"],
        camera: { view: "front", target: [0, 0.78, 0], dist: 4.1 },
        alternate: true,
        loops: 1,
        keys: [
          { t: 0, p: lateralLunge(0), cue: "Wide stance; sit the hips back over one foot" },
          ...transition(lateralLunge, 0, 1, 0, 1.4, "Other leg long, knee over the toes"),
          { t: 1.9, p: lateralLunge(1), cue: "Push back to the middle" },
          ...transition(lateralLunge, 1, 0, 1.9, 2.9, "Now the other side; 5 per side"),
        ],
      },
      {
        title: "Hip CARs",
        props: [CAR_WALL],
        highlight: ["hips", "glutes"],
        camera: { view: [0.9, 0.3, 0.8], target: [0, 0.85, 0], dist: 3.9 },
        alternate: true,
        close: false,
        loops: 1,
        keys: [
          { t: 0, p: hipCar(null), cue: "One hand on the wall, pelvis still: knee up…" },
          { t: 1.0, p: hipCar([95, 5, 95]), e: "in", cue: "…open it out to the side…" },
          { t: 1.8, p: hipCar([85, 40, 95]), e: "lin" },
          { t: 2.6, p: hipCar([55, 70, 95]), e: "lin", cue: "…rotate it back…" },
          { t: 3.4, p: hipCar([10, 55, 95]), e: "lin" },
          { t: 4.2, p: hipCar([-15, 20, 95]), e: "lin", cue: "…and lower" },
          { t: 5.199, p: hipCar(null), e: "out", cue: "Other leg; 3 slow circles each way" },
          { t: 5.2, p: mirrorPose(makePose(hipCar(null))), e: "hold" },
        ],
      },
      {
        title: "Lunge with twist",
        highlight: ["quads", "glutes", "obliques"],
        camera: { view: [1, 0.25, 0.5], target: [0, 0.78, 0.35], dist: 4.2 },
        alternate: true,
        loops: 1,
        keys: [
          { t: 0, p: lungeTwist("stand"), cue: "Arms forward, step into a lunge" },
          { t: 0.45, p: lungeTwist("lift") },
          { t: 0.9, p: lungeTwist("land") },
          { t: 1.8, p: lungeTwist("bottom"), cue: "Turn your chest toward the front knee" },
          { t: 2.8, p: lungeTwist("bottom", 45) },
          { t: 3.3, p: lungeTwist("bottom", 45), cue: "Back to centre" },
          { t: 4.1, p: lungeTwist("bottom"), cue: "Push back to standing" },
          { t: 4.9, p: lungeTwist("land") },
          { t: 5.35, p: lungeTwist("lift") },
          { t: 5.8, p: lungeTwist("stand"), cue: "Other leg; 5 per side" },
        ],
      },
    ],
  },

  pogo: {
    clips: [
      {
        title: "Pogo hops",
        highlight: ["calves", "ankles"],
        camera: { view: [1, 0.18, 0.55], target: [0, 0.92, 0], dist: 4.1 },
        keys: [
          { t: 0, p: pogo("bottom"), cue: "Bounce quickly on the balls of your feet, letting your heels touch lightly" },
          { t: 0.11, p: pogo("push"), e: "in" },
          { t: 0.22, p: pogo("air"), e: "out" },
          { t: 0.33, p: pogo("push"), e: "in" },
          { t: 0.44, p: pogo("bottom"), e: "out" },
        ],
      },
    ],
  },

  heeldrop: {
    clips: [
      {
        title: "Heel drops",
        highlight: ["calves", "quads", "hips"],
        camera: { view: [1, 0.18, 0.55], target: [0, 0.92, 0], dist: 4.1 },
        keys: [
          { t: 0, p: pogo("bottom"), cue: "Stand tall, feet hip-width" },
          { t: 0.6, p: pogo("push"), cue: "Rise onto the balls of your feet" },
          { t: 1.2, p: pogo("push") },
          { t: 1.35, p: pogo("bottom"), cue: "Drop firmly onto your heels with soft knees" },
          { t: 2.0, p: pogo("bottom") },
        ],
      },
      {
        title: "Stomp drills",
        highlight: ["calves", "quads", "glutes"],
        camera: { view: [0.85, 0.2, 0.7], target: [0, 0.92, 0], dist: 4.1 },
        alternate: true,
        keys: [
          { t: 0, p: stand(HIP_HANDS), cue: "Lift one foot to mid-shin height" },
          { t: 0.55, p: { root: [-0.035, STAND_Y - 0.004, 0], footR: [-FOOT_X, ANKLE_Y, 0], footL: [FOOT_X, 0.34, 0.08], toeL: 8, ...HIP_HANDS } },
          { t: 0.75, p: { root: [-0.035, STAND_Y - 0.004, 0], footR: [-FOOT_X, ANKLE_Y, 0], footL: [FOOT_X, 0.34, 0.08], toeL: 8, ...HIP_HANDS }, cue: "Stomp the whole foot firmly into the floor, knee soft" },
          { t: 0.92, p: { root: [0.02, STAND_Y - 0.032, 0.02], rot: [3, 0, 0], footR: [-FOOT_X, ANKLE_Y, 0], footL: [FOOT_X, ANKLE_Y, 0], ...HIP_HANDS }, e: "in" },
          { t: 1.5, p: stand(HIP_HANDS), cue: "Switch legs" },
        ],
      },
    ],
  },
};
