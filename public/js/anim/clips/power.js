// Animations for the power exercises: jumps, power skips, skater bounds and the band woodchop.
import { lerpPose, makePose, mirrorPose } from "../rig.js";
import { ANKLE_Y, D2R, DIM, STAND_Y, joints, legsTo, translate, transition } from "../poses.js";

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
// so a leg that also lands on the floor (IK) can swing with natural joint angles.
function legIK(p, side, [flex, abd, knee]) {
  const J = joints({ ...p, ["foot" + side]: null, ["leg" + side]: [flex, abd, knee, 0] });
  const hip = J["hip" + side], kn = J["knee" + side], an = J["ankle" + side];
  const pole = kn.clone().sub(hip.clone().lerp(an, 0.5)).normalize();
  return { ["foot" + side]: [an.x, an.y, an.z], ["knee" + side]: [pole.x, pole.y, pole.z] };
}

// In-air keys between a take-off and a landing pose: the body blends from one to the other while
// the root and feet follow a parabola `h` high, with continuous motion through the intermediate keys.
function flight(from, to, t0, dur, h, n = 12) {
  const a = makePose(from), b = makePose(to);
  const keys = [];
  for (let i = 1; i < n; i++) {
    const s = i / n;
    keys.push({ t: t0 + dur * s, p: translate(lerpPose(a, b, s), [0, 4 * h * s * (1 - s), 0]), e: "smooth" });
  }
  keys.push({ t: t0 + dur, p: to, e: "smooth" });
  return keys;
}

// ---------- jumps ----------

const JUMP_X = 0.12; // ankles hip-width
const JUMP_TURN = 10; // toes slightly out

// Both feet planted (flat or on the toes), pelvis from the shin/thigh angles of a squat.
function jumpFeet(pitch = 0, lift = 0) {
  return {
    turnout: JUMP_TURN,
    footL: tiptoe([JUMP_X, ANKLE_Y + lift, 0], pitch, JUMP_TURN),
    footR: tiptoe([-JUMP_X, ANKLE_Y + lift, 0], pitch, -JUMP_TURN),
    toeL: pitch,
    toeR: pitch,
  };
}
const ARM_POS = {
  down: { armL: [4, 8, 12, 0], armR: [4, 8, 12, 0] },
  up: { armL: [172, 14, 6, 0], armR: [172, 14, 6, 0] },
  swingUp: { armL: [135, 12, 10, 0], armR: [135, 12, 10, 0] },
  back: { armL: [-48, 12, 14, 0], armR: [-48, 12, 14, 0] },
  low: { armL: [22, 12, 12, 0], armR: [22, 12, 12, 0] }, // passing the hips on the way up
  front: { armL: [90, 12, 18, 0], armR: [90, 12, 18, 0] },
};

// Standing tall, optionally up on the toes.
function tall(arms, pitch = 0) {
  const f = jumpFeet(pitch);
  const rise = f.footL[1] - ANKLE_Y;
  return { root: [0, STAND_Y - 0.004 + rise, 0.03 + rise * 0.4], rot: [2, 0, 0], neck: [-2, 0], ...f, ...ARM_POS[arms] };
}
// Feet flat, knees over the toes: shin and thigh angles (deg from vertical), torso leaning with the thighs.
function crouch(shin, thigh, arms, lean = 0.62) {
  const { y, z } = legsTo(shin, thigh);
  return { root: [0, y, z], rot: [thigh * lean, 0, 0], spine: [4, 0, 0], neck: [-thigh * 0.4, 0], wristL: [arms === "back" ? -8 : 4, 0, 0], wristR: [arms === "back" ? -8 : 4, 0, 0], ...jumpFeet(0), ...ARM_POS[arms] };
}
// Airborne: the take-off pose lifted by h, toes pointed.
function airborne(h, arms, pitch = 42) {
  return translate({ ...tall(arms, pitch), rot: [0, 0, 0] }, [0, h, 0]);
}

// ---------- power skips ----------

// One skip: hop on the stance leg while the other knee drives up and the opposite arm goes high.
// Built for a left-knee drive off the right foot; the mirror gives the other side.
function skip(stage) {
  const stance = [-0.11, ANKLE_Y, 0]; // right foot, flat
  const base = { rot: [4, 0, 0], neck: [-4, 0] };
  const arms = (lead) => ({ armR: [lead, 10, 95, 0], armL: [-0.4 * lead, 10, 85, 0] }); // right arm leads the left knee
  switch (stage) {
    case "land": { // landing on the left foot from the previous skip, right knee still up
      const p = { ...base, root: [0.02, 0.9, 0.02], footL: tiptoe([0.11, ANKLE_Y, 0], 18, 7), toeL: 18, kneeL: [0.12, 0, 1], armL: [100, 10, 95, 0], armR: [-40, 10, 85, 0] };
      return { ...p, ...legIK(p, "R", [72, 4, 100]), toeR: 15 };
    }
    case "step": // right foot steps down, left foot about to leave the floor
      return { ...base, root: [0, 0.885, 0.02], footR: tiptoe(stance, 15, -7), toeR: 15, kneeR: [-0.12, 0, 1], footL: tiptoe([0.11, ANKLE_Y, 0], 38, 7), toeL: 38, kneeL: [0.12, 0, 1], armL: [30, 10, 85, 0], armR: [10, 10, 85, 0] };
    case "push": { // right leg extends, left knee drives, right arm swings high
      const p = { ...base, root: [-0.01, 0.995, 0.03], footR: tiptoe(stance, 42, -7), toeR: 42, kneeR: [-0.12, 0, 1], ...arms(95) };
      return { ...p, ...legIK(p, "L", [62, 4, 95]), toeL: 10 };
    }
    default: { // "air": top of the skip
      const p = { ...base, root: [-0.01, 1.13, 0.03], footR: tiptoe([-0.11, ANKLE_Y + 0.135, 0.0], 40, -7), toeR: 40, kneeR: [-0.12, 0, 1], ...arms(118) };
      return { ...p, ...legIK(p, "L", [96, 4, 100]), toeL: 5 };
    }
  }
}
const SKIP_LAND = skip("land");

// ---------- Heidens (skater bounds) ----------

// Stuck on the right leg at x = −BOUND/2: hips back, knee over the toes, the free leg tucked behind.
// The arms have swung across toward the right (the way the body was travelling).
const BOUND = 1.0;
function skater(stage) {
  const xR = -BOUND / 2;
  switch (stage) {
    case "stick": {
      const { y, z } = legsTo(18, 48);
      const p = { root: [xR + 0.075, y, z], rot: [36, 0, -4], spine: [8, -6, -10], neck: [-20, 0], footR: [xR, ANKLE_Y, 0], kneeR: [0.05, 0, 1], toeR: 0, armL: [70, -22, 40, 0], armR: [-50, 12, 20, 0] };
      return { ...p, ...legIK(p, "L", [62, -14, 92]), toeL: 25 };
    }
    case "load": {
      const { y, z } = legsTo(24, 58);
      const p = { root: [xR + 0.06, y, z], rot: [42, 0, -2], spine: [8, -3, -4], neck: [-24, 0], footR: [xR, ANKLE_Y, 0], kneeR: [0.05, 0, 1], toeR: 0, armL: [35, -5, 30, 0], armR: [-10, 15, 20, 0] };
      return { ...p, ...legIK(p, "L", [72, -4, 100]), toeL: 25 };
    }
    case "push": { // right leg drives the body to the left, left leg reaching
      const p = { root: [xR + 0.29, 0.9, -0.08], rot: [24, 0, -14], spine: [6, 4, 8], neck: [-12, 0], footR: tiptoe([xR, ANKLE_Y, 0], 30, -7), kneeR: [0.2, 0, 1], toeR: 30, armL: [-40, 14, 25, 0], armR: [65, -22, 35, 0] };
      return { ...p, ...legIK(p, "L", [32, 40, 32]), toeL: 15 };
    }
    default: { // "land": left foot touches down, right leg trailing
      const xL = BOUND / 2;
      const p = { root: [xL - 0.15, 0.86, -0.07], rot: [26, 0, 10], spine: [6, -4, 6], neck: [-12, 0], footL: tiptoe([xL, ANKLE_Y, 0], 14, 7), kneeL: [0.25, 0, 1], toeL: 14, armL: [-45, 12, 22, 0], armR: [68, -22, 38, 0] };
      return { ...p, ...legIK(p, "R", [30, 24, 55]), toeR: 20 };
    }
  }
}
const SKATE_STICK = skater("stick");

// ---------- band woodchop ----------

// Band anchored high on a closed door to the figure's left, the door turned a little toward the
// viewer so it reads as a door. The anchor sits mid-width: the mirrored half negates the door's
// rotation, which would move an off-centre anchorX to the far edge while the band end stays put.
const DOOR = { type: "door", pos: [1.0, 0, 0.2], rotY: -65, w: 0.86, anchorH: 1.9, anchorX: 0 };
const ANCHOR = [DOOR.pos[0] + 0.04 * Math.sin(DOOR.rotY * D2R), DOOR.anchorH, DOOR.pos[2] + 0.04 * Math.cos(DOOR.rotY * D2R)];
const CHOP_R = [-0.2, ANKLE_Y, 0]; // planted right foot (ankle)
const CHOP_BALL_L = [0.2, BALL_PT[0]]; // ball of the pivoting left foot (x, z), level with the right one

// High-to-low chop, u = 0 (arms long toward the anchor, up and left) … 1 (hands at the right hip).
// Hands are held in the chest frame at arm's length and well in front of the chest, so the band
// crosses in front of the body rather than through it. Feet stay in "ground" mode: turnout = hip
// yaw keeps the right foot pointing ahead, which turns the left foot twice as far as the hips: out
// toward the anchor at the start, pivoted on its ball (heel up) toward the chop at the end.
// `ready` is the square stance between sides, handle at the chest.
function chop(u, ready = false) {
  const mix = (a, b) => (ready ? 0 : a + (b - a) * u);
  const yaw = mix(18, -28);
  const lift = Math.sin(Math.PI * u);
  const cx = ready ? 0 : mix(0.07, -0.08);
  const cy = ready ? -0.02 : mix(0.33, -0.25);
  const cz = (ready ? 0.34 : mix(0.32, 0.40)) + (ready ? 0 : 0.06 * lift);
  const heel = 32 * u * u * (ready ? 0 : 1);
  const footYaw = 2 * yaw;
  const flatL = [CHOP_BALL_L[0] - BALL_PT[0] * Math.sin(footYaw * D2R), ANKLE_Y, CHOP_BALL_L[1] - BALL_PT[0] * Math.cos(footYaw * D2R)];
  return {
    root: [mix(0.05, -0.06), ready ? 0.93 : mix(0.92, 0.87), mix(0, 0.02)],
    rot: [mix(2, 10), yaw, 0],
    spine: [mix(-4, 14), mix(-8, 6), mix(42, -24)],
    neck: [mix(-10, 6), 0],
    turnout: yaw,
    footR: CHOP_R,
    toeR: 0,
    footL: tiptoe(flatL, heel, footYaw),
    toeL: heel,
    handsIn: "chest",
    handL: [cx + 0.03, cy, cz],
    handR: [cx - 0.03, cy, cz],
    elbowL: [0.55, -0.8, -0.35],
    elbowR: [-0.55, -0.8, -0.35],
  };
}

export default {
  jumps: {
    // Take-offs are split in two keys (arms start swinging while the legs push), which keeps the
    // hands below ~8 m/s like a real arm swing.
    clips: [
      {
        title: "Snap-down (phase 1)",
        highlight: ["quads", "glutes", "calves"],
        camera: { view: [0.8, 0.22, 0.75], target: [0, 1.05, 0], dist: 4.7 },
        keys: [
          { t: 0, p: tall("down"), cue: "Rise onto your toes, arms up" },
          { t: 0.9, p: tall("up", 30) },
          { t: 1.3, p: tall("up", 30), cue: "Drop fast into a quarter squat, arms back" },
          { t: 1.65, p: crouch(20, 46, "back"), e: "smooth", cue: "Hold the landing for 2 s, knees over your toes" },
          { t: 3.65, p: crouch(20, 46, "back"), cue: "Stand up and reset" },
          { t: 4.8, p: tall("down") },
        ],
      },
      {
        title: "Squat jump (phase 2)",
        highlight: ["quads", "glutes", "calves"],
        camera: { view: [0.8, 0.22, 0.75], target: [0, 1.22, 0], dist: 5.7 },
        keys: [
          { t: 0, p: tall("down"), cue: "Sink into a half squat" },
          { t: 1.0, p: crouch(28, 66, "back"), cue: "Pause in the half squat" },
          { t: 2.0, p: crouch(28, 66, "back"), cue: "Jump as high as you can" },
          { t: 2.22, p: crouch(14, 32, "low"), e: "in" },
          { t: 2.42, p: tall("swingUp", 42), e: "lin" },
          { t: 2.67, p: airborne(0.3, "up"), e: "out", cue: "Land softly in the same spot" },
          { t: 2.92, p: tall("swingUp", 34), e: "in" },
          { t: 3.17, p: crouch(26, 58, "front"), e: "out", cue: "Hold 2 s, knees over the toes" },
          { t: 5.17, p: crouch(26, 58, "front"), cue: "Stand up; full rest between jumps" },
          { t: 6.2, p: tall("down") },
        ],
      },
      {
        title: "Countermovement jump (phase 3)",
        highlight: ["quads", "glutes", "calves"],
        camera: { view: [0.8, 0.22, 0.75], target: [0, 1.28, 0], dist: 6.0 },
        keys: [
          { t: 0, p: tall("down"), cue: "Stand tall, arms relaxed" },
          { t: 0.4, p: tall("down"), cue: "Quick dip with an arm swing…" },
          { t: 0.75, p: crouch(24, 56, "back"), cue: "…then a max-height jump" },
          { t: 0.92, p: crouch(12, 28, "low"), e: "in" },
          { t: 1.1, p: tall("swingUp", 42), e: "out" },
          { t: 1.4, p: airborne(0.38, "up"), e: "out", cue: "Stick the landing" },
          { t: 1.7, p: tall("swingUp", 34), e: "in" },
          { t: 1.95, p: crouch(24, 54, "front"), e: "out", cue: "Hold: knees track over the toes" },
          { t: 3.45, p: crouch(24, 54, "front"), cue: "Stand up; full rest between jumps" },
          { t: 4.5, p: tall("down") },
        ],
      },
    ],
  },

  powerskip: {
    clips: [
      {
        title: "Stationary power skips",
        highlight: ["calves", "glutes", "hips"],
        camera: { view: [0.85, 0.22, 0.7], target: [0, 1.1, 0], dist: 4.9 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: SKIP_LAND, cue: "Knee up hard, opposite arm high; push the floor away" },
          { t: 0.17, p: skip("step") },
          { t: 0.31, p: skip("push"), e: "in" },
          { t: 0.5, p: skip("air"), e: "out" },
          { t: 0.68, p: mirrorPose(makePose(SKIP_LAND)), e: "in" },
        ],
      },
    ],
  },

  heidens: {
    clips: [
      {
        title: "Heidens (skater bounds)",
        highlight: ["glutes", "quads", "adductors"],
        camera: { view: "front", target: [0, 0.8, 0], dist: 4.4 },
        alternate: true,
        close: false,
        keys: [
          { t: 0, p: SKATE_STICK, cue: "Hold the landing for 1 to 2 s: hips back, knee over your toes" },
          { t: 1.2, p: SKATE_STICK, cue: "Bound sideways, land on the other leg only" },
          { t: 1.45, p: skater("load") },
          { t: 1.7, p: skater("push"), e: "inOut" },
          ...flight(skater("push"), skater("land"), 1.7, 0.36, 0.14),
          // the next segment is the hold on the other leg (mirrored half)
          { t: 2.36, p: mirrorPose(makePose(SKATE_STICK)), e: "out", cue: "Hold the landing for 1 to 2 s: hips back, knee over your toes" },
        ],
      },
    ],
  },

  woodchop: {
    clips: [
      {
        title: "Band woodchop",
        props: [DOOR],
        bands: [{ a: ANCHOR, b: "handL" }, { a: "handL", b: "handR" }],
        highlight: ["obliques", "core", "shoulders"],
        camera: { view: [0, 0.22, 1], target: [0, 1.0, 0.1], dist: 5.0 },
        alternate: true,
        keys: [
          { t: 0, p: chop(0, true), cue: "Side-on to the door, band in front; handle at your chest" },
          { t: 0.3, p: chop(0, true) },
          { t: 1.0, p: chop(0), cue: "Arms long toward the anchor" },
          { t: 1.3, p: chop(0), cue: "Chop fast across, turn the hips, pivot the back foot" },
          ...transition(chop, 0, 1, 1.3, 1.75),
          { t: 2.0, p: chop(1), cue: "Return slowly, 2–3 s" },
          { t: 2.8, p: chop(0.67), e: "in" },
          { t: 3.6, p: chop(0.33), e: "lin" },
          { t: 4.4, p: chop(0), e: "out" },
          { t: 5.1, p: chop(0, true), cue: "Repeat the same number of reps on the other side" },
        ],
      },
    ],
  },
};
