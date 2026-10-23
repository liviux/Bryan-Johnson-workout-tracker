// Animations for the indoor cardio exercises: intervals, the Norwegian 4×4, interval moves and Zone 2.
import { lerpPose, makePose, mirrorPose } from "../rig.js";
import { ANKLE_Y, D2R, DIM, FOOT_X, anchor, hangArms, joints, legsTo, translate, transition } from "../poses.js";

// ---------- helpers ----------

const BALL_PT = [DIM.toe * 0.72, -DIM.ankleH]; // ball of the foot [along the sole, up] from the ankle
const TOE_PT = [DIM.toe, -DIM.ankleH * 0.55]; // toe tip
const TOE_SWITCH = Math.atan2(TOE_PT[1] - BALL_PT[1], TOE_PT[0] - BALL_PT[0]); // pitch where both touch
const footPt = ([lf, lu], a) => [lf * Math.cos(a) + lu * Math.sin(a), -lf * Math.sin(a) + lu * Math.cos(a)];

// Ankle target for a foot that rises onto its toes by `pitch`° (heel up) without sliding.
// `flat` is the ankle with the foot flat; yaw is the way the foot points. The rigid foot pivots
// on its ball up to ~32°, then on the toe tip, so the toes never dip into the floor.
function tiptoe([x, y, z], pitch, yaw = 0) {
  const a = pitch * D2R;
  let pivot = BALL_PT, pt = BALL_PT;
  if (a > TOE_SWITCH) {
    const b = footPt(BALL_PT, TOE_SWITCH), t = footPt(TOE_PT, TOE_SWITCH);
    pivot = [BALL_PT[0] - b[0] + t[0], BALL_PT[1] - b[1] + t[1]];
    pt = TOE_PT;
  }
  const o = footPt(pt, a);
  const fwd = pivot[0] - o[0], up = pivot[1] - o[1];
  return [x + fwd * Math.sin(yaw * D2R), y + up, z + fwd * Math.cos(yaw * D2R)];
}

// IK ankle target + knee pole reproducing a leg given as angles [hipFlex, hipAbd, kneeFlex] at pose p,
// so a leg that also stands on the floor (IK) can swing with natural joint angles.
function legIK(p, side, [flex, abd, knee]) {
  const J = joints({ ...p, ["foot" + side]: null, ["leg" + side]: [flex, abd, knee, 0] });
  const hip = J["hip" + side], kn = J["knee" + side], an = J["ankle" + side];
  const pole = kn.clone().sub(hip.clone().lerp(an, 0.5)).normalize();
  return { ["foot" + side]: [an.x, an.y, an.z], ["knee" + side]: [pole.x, pole.y, pole.z] };
}

// Samples a periodic pose function into evenly spaced linear keys; the last key repeats the first.
function cycle(fn, period, n, cue) {
  n *= 4;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push({ t: (period * i) / n, p: fn(i / n), e: "smooth" });
  keys[0].cue = cue;
  keys.push({ t: period, p: keys[0].p, e: "smooth" });
  return keys;
}

// ---------- high knees and marching on the spot ----------

// Phase 0…1 of a stride; the left foot lands at 0 and is down for `duty` of the stride.
const HIGH_KNEES = { T: 0.64, duty: 0.4, hip: 0.95, bob: 0.02, high: 0.45, lean: 3, knee: 95, bend: 100, bend0: 45, heel: 10, roll: 16, swingToe: 22, arm0: 15, arm: 48, elbow: 88 };
const MARCH = { T: 1.1, duty: 0.6, hip: 0.935, bob: 0.007, high: 0.3, lean: 0, knee: 55, bend: 70, bend0: 25, heel: 0, roll: 14, swingToe: 10, arm0: 4, arm: 22, elbow: 32 };
function onTheSpot(ph, o) {
  const p = {
    root: [0.012 * Math.cos(2 * Math.PI * ph), o.hip + o.bob * Math.cos(4 * Math.PI * (ph - o.high)), 0.02],
    rot: [o.lean, 3 * Math.sin(2 * Math.PI * ph), Math.cos(2 * Math.PI * ph)],
    spine: [2, -Math.cos(2 * Math.PI * ph), -5 * Math.sin(2 * Math.PI * ph)],
    neck: [-o.lean - 2, 0],
    footYawL: 7,
    footYawR: -7,
  };
  for (const [side, s, off] of [["L", 1, 0], ["R", -1, 0.5]]) {
    const q = (ph + off) % 1;
    if (q <= o.duty + 1e-6) {
      // on the floor: lands on the ball, heel kisses down mid-stance, pushes off the toes
      const pitch = o.heel + o.roll * Math.abs(Math.cos((Math.PI * q) / o.duty));
      Object.assign(p, { ["foot" + side]: tiptoe([FOOT_X * s, ANKLE_Y, 0], pitch, 7 * s), ["toe" + side]: pitch, ["knee" + side]: [0.12 * s, 0, 1] });
    } else {
      const w = Math.sin((Math.PI * (q - o.duty)) / (1 - o.duty)); // 0 → 1 (knee highest) → 0
      const swing = legIK(p, side, [o.knee * w, 5, o.bend * w + o.bend0 * (1 - w)]);
      const contact = tiptoe([FOOT_X * s, ANKLE_Y, 0], o.heel + o.roll, 7 * s);
      const blend = w * w * (3 - 2 * w);
      p["foot" + side] = contact.map((v, i) => v + (swing["foot" + side][i] - v) * blend);
      p["knee" + side] = [0.12 * s, 0, 1].map((v, i) => v + (swing["knee" + side][i] - v) * blend);
      p["toe" + side] = o.heel + o.roll + (o.swingToe - o.heel - o.roll) * blend;
    }
  }
  const peak = o.duty + (1 - o.duty) / 2; // left knee highest
  const sw = Math.sin(2 * Math.PI * (ph - peak + 0.25)); // +1: right arm forward, left arm back
  p.armL = [o.arm0 - o.arm * sw, 8, o.elbow - 9 * sw, 0];
  p.armR = [o.arm0 + o.arm * sw, 8, o.elbow + 9 * sw, 0];
  return p;
}
const highKneeKeys = (cue) => cycle((ph) => onTheSpot(ph, HIGH_KNEES), HIGH_KNEES.T, 10, cue);

// ---------- step-ups ----------

const STEP = { type: "step", pos: [0, 0, 0.4], w: 0.62, d: 0.34, h: 0.18 };
const ON = { y: STEP.h + ANKLE_Y, z: 0.36 }; // ankle on top of the step
// Phases of one step-up cycle led by the left foot: up, up, down, down.
// Each: pelvis, left/right foot ("on" the step, "push" off the toes, [height, depth, pitch] in the air,
// or null on the floor), arm swing (+1 right arm forward) and trunk lean. Feet lift straight up
// before travelling, so they clear the step's edge.
const STEP_PHASES = [
  { root: [0, 0.94, 0], L: null, R: null, arm: 0 },
  { root: [0, 0.935, 0.04], L: [0.34, 0.07, -8], R: null, arm: 0.9 },
  { root: [0, 0.93, 0.12], L: "on", R: null, arm: 0.7, lean: 10 },
  { root: [0, 0.98, 0.23], L: "on", R: "push", arm: 0, lean: 10 }, // drive up, right heel lifts
  { root: [0, 1.07, 0.3], L: "on", R: [0.34, 0.03, -6], arm: -0.9, lean: 6 },
  { root: [0, 1.115, 0.36], L: "on", R: "on", arm: -0.2 }, // tall on the step
  { root: [0, 1.04, 0.27], L: [0.31, 0.03, -4], R: "on", arm: 0.6, lean: 4 }, // left foot back down
  { root: [0, 0.925, 0.12], L: null, R: "on", arm: 0.3, lean: 4 },
  { root: [0, 0.94, 0.05], L: null, R: [0.31, 0.03, -4], arm: -0.6 },
];
function stepPose(ph, { arm = 30, elbow = 40 } = {}) {
  const foot = (spec, s) => {
    if (spec === "on") return { pos: [FOOT_X * s, ON.y, ON.z], toe: 0 };
    if (spec === "push") return { pos: tiptoe([FOOT_X * s, ANKLE_Y, 0], 30, 7 * s), toe: 30 };
    if (spec) return { pos: [FOOT_X * s, spec[0], spec[1]], toe: spec[2] }; // in the air: [height, depth, pitch]
    return { pos: [FOOT_X * s, ANKLE_Y, 0], toe: 0 };
  };
  const L = foot(ph.L, 1), R = foot(ph.R, -1);
  return {
    root: [ph.root[0] + 0.022 * (Number(ph.L === "on") - Number(ph.R === "on")), ph.root[1], ph.root[2]],
    rot: [ph.lean ?? 3, 2 * ph.arm, 0],
    spine: [0, 0, -4 * ph.arm],
    neck: [-(ph.lean ?? 3), 0],
    footL: L.pos, toeL: L.toe, kneeL: [0.12, 0, 1],
    footR: R.pos, toeR: R.toe, kneeR: [-0.12, 0, 1],
    footYawL: 7,
    footYawR: -7,
    armL: [6 - arm * ph.arm, 8, elbow - 5 * ph.arm, 0],
    armR: [6 + arm * ph.arm, 8, elbow + 5 * ph.arm, 0],
  };
}
// One left-led cycle, `dt` seconds per phase (also the closing step back to the start); with
// alternate: true the next cycle leads with the right leg.
function stepClip(dt, cues, style) {
  const phases = [...STEP_PHASES, STEP_PHASES[0]];
  const keys = [{ t: 0, p: stepPose(phases[0], style), e: "smooth", cue: cues[0] }];
  for (let i = 1; i < phases.length; i++) {
    const a = stepPose(phases[i - 1], style), b = stepPose(phases[i], style);
    const floor = ["L", "R"].filter((s) => [phases[i - 1][s], phases[i][s]].every((v) => v == null || v === "push"));
    const roll = floor.some((s) => a["toe" + s] !== b["toe" + s]);
    const n = roll ? 8 : 1;
    for (let j = 1; j <= n; j++) {
      const p = j === n ? b : lerpPose(a, b, j / n);
      if (roll) for (const s of floor) p["foot" + s] = tiptoe([FOOT_X * (s === "L" ? 1 : -1), ANKLE_Y, 0], p["toe" + s], s === "L" ? 7 : -7);
      keys.push({ t: (i - 1 + j / n) * dt, p, e: "smooth", cue: j === n ? cues[i] : undefined });
    }
  }
  return { closeTime: dt, keys };
}

// ---------- jumping jacks ----------

function jack(ph) {
  const outward = ph < 0.5, u = (ph * 2) % 1;
  const flight = Math.min(1, Math.max(0, (u - 0.12) / 0.76));
  const sweep = flight * flight * (3 - 2 * flight);
  const open = outward ? sweep : 1 - sweep;
  const arms = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
  const hop = 4 * flight * (1 - flight), air = 0.075 * hop;
  const x = 0.09 + 0.27 * open;
  const pitch = 10 + 16 * hop;
  return {
    root: [0, 0.94 - 0.045 * open + air - 0.018 * (1 - hop), 0.03],
    rot: [3, 0, 0],
    neck: [-3, 0],
    footL: tiptoe([x, ANKLE_Y + air, 0], pitch, 7),
    footR: tiptoe([-x, ANKLE_Y + air, 0], pitch, -7),
    toeL: pitch,
    toeR: pitch,
    kneeL: [0.35, 0, 1],
    kneeR: [-0.35, 0, 1],
    shrugL: [0.008 * arms, 0],
    shrugR: [0.008 * arms, 0],
    armL: [6, 10 + 160 * arms, 14 - 7 * arms, -12 * arms],
    armR: [6, 10 + 160 * arms, 14 - 7 * arms, -12 * arms],
  };
}

// ---------- straight-arm plank: mountain climbers and burpees ----------

// Body straight from heels to head, pivoting on the toes (built like the push-up, 20° up from the floor).
const PLANK = anchor({ rot: [74, 0, 0], legL: [0, 4, 0, -22], legR: [0, 4, 0, -22], neck: [-6, 0], palmL: [0, 1, 0], palmR: [0, 1, 0] }, "toeL", [0, 0, -0.92], "yz");
const PLANK_J = joints(PLANK);
const PLANK_TOE = Math.asin(-PLANK_J.footFL.y) / D2R; // the plank's toes as a floor pitch
const HAND_Y = 0.035; // palm flat on the floor, with the wrist extended
const ARM_POLES = { elbowL: [0.7, 0.3, -0.6], elbowR: [-0.7, 0.3, -0.6] };
const v3 = (v, dz = 0) => [v.x, v.y, v.z + dz];

// Mountain climbers: the knees drive in under the chest in turn, hips level and a touch higher than
// in a strict plank (the knee sits 0.44 m from the hip, so it needs that height to pass under the hip
// without touching the floor). Hands and shoulders stay where the plank put them.
// Each foot: "back" (toes on the floor, leg long), "in" (knee under the chest, toes off the floor),
// "out" (on its way back, nearly long) or "up" (on its way in, knee lifting).
const CLIMB_BODY = anchor({ rot: [86, 0, 0], neck: [-8, 0] }, "neckBase", v3(PLANK_J.neckBase), "xyz");
const CLIMB_BACK = (() => {
  const hip = joints(CLIMB_BODY).hipL;
  const y = PLANK_J.ankleL.y, dx = PLANK_J.ankleL.x - hip.x;
  return [PLANK_J.ankleL.x, y, hip.z - Math.sqrt(0.86 ** 2 - (hip.y - y) ** 2 - dx * dx)]; // leg almost straight
})();
const CLIMB_FEET = {
  back: (s) => ({ pos: [CLIMB_BACK[0] * s, CLIMB_BACK[1], CLIMB_BACK[2]], toe: PLANK_TOE, knee: [0.1 * s, -1, 0.15] }),
  in: (s) => ({ pos: [0.12 * s, 0.24, 0.1], toe: 62, knee: [0.15 * s, -0.2, 1] }),
  out: (s) => ({ pos: [0.14 * s, 0.24, -0.82], toe: 45, knee: [0.1 * s, -1, 0.3] }),
  up: (s) => ({ pos: [0.13 * s, 0.26, -0.42], toe: 55, knee: [0.05 * s, -0.5, 1] }),
};
function climber(l, r) {
  const L = CLIMB_FEET[l](1), R = CLIMB_FEET[r](-1);
  return {
    root: CLIMB_BODY.root,
    rot: CLIMB_BODY.rot,
    neck: CLIMB_BODY.neck,
    palmL: [0, 1, 0],
    palmR: [0, 1, 0],
    footL: L.pos, toeL: L.toe, kneeL: L.knee,
    footR: R.pos, toeR: R.toe, kneeR: R.knee,
    handsIn: "world",
    handL: [0.2, HAND_Y, PLANK_J.shoulderL.z + 0.02],
    handR: [-0.2, HAND_Y, PLANK_J.shoulderR.z + 0.02],
    ...ARM_POLES,
  };
}
const CLIMB = climber("in", "back"); // left knee in, right leg long

// Burpee: the hands land 0.38 m in front of the feet and stay there; the plank is slid to match.
const B_HANDS = { L: [0.2, HAND_Y, 0.38], R: [-0.2, HAND_Y, 0.38] };
const B_SHIFT = B_HANDS.L[2] - (PLANK_J.shoulderL.z + 0.02);
const B_FEET = (pitch) => ({
  footL: tiptoe([0.12, ANKLE_Y, 0], pitch, 7), footR: tiptoe([-0.12, ANKLE_Y, 0], pitch, -7), toeL: pitch, toeR: pitch,
  kneeL: [0.3, 0, 1], kneeR: [-0.3, 0, 1], // knees out over the toes
});
// Mid-jump: shoulders over the hands (as in the plank), trunk nearly level so the hips ride high.
const B_KICK = anchor({ rot: [96, 0, 0], neck: [-16, 0] }, "neckBase", v3(PLANK_J.neckBase, B_SHIFT), "xyz");
function burpee(stage) {
  const hands = { handsIn: "world", handL: B_HANDS.L, handR: B_HANDS.R, palmL: [0, 1, 0], palmR: [0, 1, 0], ...ARM_POLES };
  switch (stage) {
    case "stand": {
      const p = hangArms({ root: [0, 0.94, 0.02], ...B_FEET(0) }, { fwd: 0.04 });
      const J = joints(p);
      return { ...p, palmL: v3(J.handRefL), palmR: v3(J.handRefR) };
    }
    case "squat": { // hips down, hands to the floor in front of the feet
      const { y, z } = legsTo(40, 100);
      return { root: [0, y, z], rot: [60, 0, 0], spine: [10, 0, 0], neck: [-25, 0], ...B_FEET(0), ...hands };
    }
    case "kick": // weight on the hands, hips high, feet flying back
      return { ...B_KICK, footL: [0.13, 0.27, -0.76], footR: [-0.13, 0.27, -0.76], toeL: 45, toeR: 45, kneeL: [0.1, -0.5, 1], kneeR: [-0.1, -0.5, 1], ...hands };
    default: // "plank"
      return {
        ...translate(PLANK, [0, 0, B_SHIFT]),
        footL: v3(PLANK_J.ankleL, B_SHIFT), footR: v3(PLANK_J.ankleR, B_SHIFT), toeL: PLANK_TOE, toeR: PLANK_TOE,
        kneeL: [0.1, -1, 0.3], kneeR: [-0.1, -1, 0.3],
        ...hands,
      };
  }
}

function burpeeLower(d) {
  const a = makePose(burpee("stand")), b = makePose(burpee("squat"));
  if (d === 0) return a;
  if (d === 1) return b;
  const p = lerpPose(a, b, d), A = joints(a), B = joints(b), J = joints(p);
  // Follow the shoulders while folding down; world-space blending overreaches mid-squat.
  for (const side of ["L", "R"]) {
    const from = A["wrist" + side].clone().sub(A["shoulder" + side]);
    const to = B["wrist" + side].clone().sub(B["shoulder" + side]);
    p["hand" + side] = from.lerp(to, d).add(J["shoulder" + side]).toArray();
  }
  return p;
}

// Shared clips (several exercises use the same moves).
const CAM = {
  spot: { view: [0.85, 0.2, 0.7], target: [0, 0.95, 0.1], dist: 4.2 },
  step: { view: [1, 0.25, 0.55], target: [0, 1.0, 0.18], dist: 4.4 },
  jacks: { view: [0.3, 0.2, 1], target: [0, 1.05, 0], dist: 4.6 },
  plank: { view: [1, 0.42, 0.3], target: [0, 0.32, -0.2], dist: 4.0 },
  burpee: { view: [1, 0.3, 0.35], target: [0, 0.72, -0.25], dist: 4.6 },
};
function fastStepClip(title, cue) {
  return {
    title,
    props: [STEP],
    highlight: ["heart", "quads", "glutes"],
    camera: CAM.step,
    alternate: true,
    ...stepClip(0.16, [cue], { arm: 38, elbow: 80 }),
  };
}
function highKneesClip(title, cue) {
  return { title, highlight: ["heart", "hips", "quads"], camera: CAM.spot, loops: 6, keys: highKneeKeys(cue) };
}
function jacksClip(title, cue) {
  return {
    title,
    highlight: ["heart", "calves", "shoulders"],
    camera: CAM.jacks,
    loops: 4,
    keys: cycle(jack, 0.9, 12, cue),
  };
}
function climbersClip(title, cue) {
  return {
    title,
    highlight: ["heart", "core", "hips"],
    camera: CAM.plank,
    alternate: true,
    close: false,
    loops: 5,
    keys: [
      { t: 0, p: CLIMB, cue },
      { t: 0.17, p: climber("out", "up"), e: "smooth" },
      { t: 0.34, p: mirrorPose(makePose(CLIMB)), e: "smooth" },
    ],
  };
}

export default {
  shortint: {
    clips: [
      highKneesClip("20 s hard: fast high knees", "20 s hard: fast high knees, drive the arms"),
      {
        title: "Easy: march on the spot",
        highlight: ["heart"],
        camera: CAM.spot,
        loops: 3,
        keys: cycle((ph) => onTheSpot(ph, MARCH), MARCH.T, 10, "March gently during the rest; count each round"),
      },
    ],
  },

  norwegian: {
    clips: [
      fastStepClip("4×4 hard, minute 1: fast step-ups", "4 min hard at 85–95% of max HR; new move each minute"),
      highKneesClip("Minute 2: high knees", "Minute 2: high knees at a pace you can repeat for all 4 rounds"),
      jacksClip("Minute 3: jumping jacks", "Minute 3: jumping jacks; hard but controlled"),
      climbersClip("Minute 4: mountain climbers", "Minute 4: climbers, then 3 min easy marching"),
    ],
  },

  indoorhiit: {
    clips: [
      fastStepClip("Fast step-ups", "Keep going with fast, quiet step-ups"),
      highKneesClip("High knees", "High knees on the spot, drive the arms"),
      climbersClip("Mountain climbers", "Mountain climbers: hips level, knees to the chest"),
      jacksClip("Jumping jacks", "Jumping jacks; side-step jacks for a quiet version"),
      {
        title: "Burpee without push-up",
        highlight: ["heart", "quads", "core"],
        camera: CAM.burpee,
        keys: [
          { t: 0, p: burpee("stand"), cue: "Squat down, hands to the floor" },
          ...transition(burpeeLower, 0, 1, 0, 0.6, "Jump back to a plank (or step back)"),
          { t: 0.82, p: burpee("kick"), e: "smooth" },
          { t: 1.02, p: burpee("plank"), e: "smooth" },
          { t: 1.3, p: burpee("plank"), cue: "No push-up: jump the feet back in" },
          { t: 1.5, p: burpee("kick"), e: "smooth" },
          { t: 1.72, p: burpee("squat"), e: "smooth", cue: "Stand up tall" },
          ...transition(burpeeLower, 1, 0, 1.72, 2.4),
        ],
      },
    ],
  },

  zone2: {
    clips: [
      {
        title: "Zone 2 step-ups",
        props: [STEP],
        highlight: ["heart", "quads", "glutes"],
        camera: CAM.step,
        alternate: true,
        ...stepClip(0.27, ["Steady step-ups on a 15–20 cm step, talking pace", null, null, null, null, "Up, up, down, down; alternate the lead leg"], { arm: 18, elbow: 28 }),
      },
    ],
  },
};
