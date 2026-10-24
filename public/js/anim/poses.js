// Building blocks for authoring exercise animations.
// Every helper returns a *partial* pose (see rig.js defaultPose for all fields);
// combine them with plain object spread: { ...stand(), armL: [...] }.

import { computeJoints, DIM, makePose, STAND_Y } from "./rig.js";

export const D2R = Math.PI / 180;
export const FOOT_X = 0.11; // ankle offset from the midline in a hip-width stance
export const ANKLE_Y = DIM.ankleH; // ankle height with the foot flat on the floor
export const ARM = DIM.upperArm + DIM.forearm;
export { STAND_Y, DIM };

// Contact radii, so "touching the floor" means the surface, not the joint centre.
const RADIUS = {
  toeL: 0.004, toeR: 0.004, heelL: 0.004, heelR: 0.004, ballL: 0.004, ballR: 0.004,
  kneeL: 0.05, kneeR: 0.05, elbowL: 0.036, elbowR: 0.036, handL: 0.022, handR: 0.022,
  wristL: 0.03, wristR: 0.03, head: 0.112, pelvis: 0.1, shoulderL: 0.058, shoulderR: 0.058,
  ankleL: 0.036, ankleR: 0.036, thoracic: 0.11, lumbar: 0.1, neckBase: 0.1,
};

export const joints = (p) => computeJoints(makePose(p));
const v3 = (v) => [v.x, v.y, v.z];

// Rebuild a curved movement between its endpoints, keeping authored joint/contact geometry.
export function transition(build, from, to, start, end, cue = "") {
  const n = 8;
  return Array.from({ length: n }, (_, i) => {
    const u = (i + 1) / n;
    const eased = u * u * u * (10 + u * (-15 + 6 * u));
    return { t: start + (end - start) * u, p: build(from + (to - from) * eased), e: "smooth", ...(i === n - 1 && cue ? { cue } : {}) };
  });
}

// Hip (pelvis) height and depth for a bilateral stance with planted feet.
// shin: forward tilt of the shins from vertical (knees travel over the toes)
// thigh: thigh angle from vertical (90 = parallel to the floor)
export function legsTo(shin, thigh, { ankleZ = 0, ankleY = ANKLE_Y } = {}) {
  const s = shin * D2R;
  const t = thigh * D2R;
  const kneeY = ankleY + DIM.shin * Math.cos(s);
  const kneeZ = ankleZ + DIM.shin * Math.sin(s);
  return { y: kneeY + DIM.thigh * Math.cos(t), z: kneeZ - DIM.thigh * Math.sin(t) };
}

// Standing tall, feet hip-width and planted, knees soft, arms hanging.
export function stand(o = {}) {
  return {
    root: [0, STAND_Y - 0.002, 0],
    footL: [FOOT_X, ANKLE_Y, 0],
    footR: [-FOOT_X, ANKLE_Y, 0],
    ...o,
  };
}

// Bilateral squat, d = 0 (standing) … 1 (deep, knees well past the toes).
// feet: { y: ankle height, z: ankle depth, toe: foot pitch, x: half stance width }
export function squat(d, o = {}) {
  const { feet = {}, ...rest } = o;
  const ay = feet.y ?? ANKLE_Y;
  const az = feet.z ?? 0;
  const fx = feet.x ?? 0.14;
  const { y, z } = legsTo(40 * d, 106 * d, { ankleY: ay, ankleZ: az });
  return {
    root: [0, y - 0.002, z],
    footL: [fx, ay, az],
    footR: [-fx, ay, az],
    toeL: feet.toe ?? 0,
    toeR: feet.toe ?? 0,
    turnout: 14,
    kneeL: [0.3, 0, 1],
    kneeR: [-0.3, 0, 1],
    rot: [30 * d, 0, 0],
    spine: [3 * d, 0, 0],
    neck: [-12 * d, 0],
    ...rest,
  };
}

// Hip hinge (RDL, swing), d = 0 … 1 (torso about 65° forward, hips pushed back).
export function hinge(d, o = {}) {
  const { y, z } = legsTo(7 * d, 20 * d);
  return stand({ root: [0, y - 0.002, z], rot: [66 * d, 0, 0], spine: [-2 * d, 0, 0], neck: [-8 * d, 0], ...o });
}

// Moves the whole figure so joint `name` sits at `target` (only on the given axes).
export function anchor(p, name, target, axes = "xyz") {
  const J = joints(p);
  const at = J[name];
  const r = [...(p.root || [0, STAND_Y, 0])];
  const off = [target[0] - at.x, target[1] - at.y, target[2] - at.z];
  const shift = [axes.includes("x") ? off[0] : 0, axes.includes("y") ? off[1] : 0, axes.includes("z") ? off[2] : 0];
  return translate({ ...p, root: r }, shift);
}

// Moves the root and every world-space IK target by `d`.
export function translate(p, d) {
  const add = (v) => (v ? [v[0] + d[0], v[1] + d[1], v[2] + d[2]] : v);
  const out = { ...p, root: add(p.root || [0, STAND_Y, 0]) };
  for (const k of ["footL", "footR"]) if (p[k]) out[k] = add(p[k]);
  if (!p.handsIn || p.handsIn === "world") for (const k of ["handL", "handR"]) if (p[k]) out[k] = add(p[k]);
  return out;
}

// Lowers/raises the figure until the lowest of the listed joints touches y = floor.
// Moves only the root (and world IK targets), so use it with FK limbs.
export function ground(p, names, floor = 0, { moveTargets = false } = {}) {
  const J = joints(p);
  let low = Infinity;
  for (const n of names) low = Math.min(low, J[n].y - (RADIUS[n] ?? 0));
  const dy = floor - low;
  if (moveTargets) return translate(p, [0, dy, 0]);
  const r = p.root || [0, STAND_Y, 0];
  return { ...p, root: [r[0], r[1] + dy, r[2]] };
}

// Hands hanging straight down from the shoulders (holding dumbbells, hinging, carrying).
export function hangArms(p, { fwd = 0.02, out = 0.0, drop = 0.985, inward = 0 } = {}) {
  const J = joints(p);
  return {
    ...p,
    handsIn: "world",
    handL: [J.shoulderL.x + out - inward, J.shoulderL.y - ARM * drop, J.shoulderL.z + fwd],
    handR: [J.shoulderR.x - out + inward, J.shoulderR.y - ARM * drop, J.shoulderR.z + fwd],
    elbowL: p.elbowL || [0.25, 0, -1],
    elbowR: p.elbowR || [-0.25, 0, -1],
  };
}

// Hands fixed in world space at the current wrist positions of pose p (freeze them).
export function pinHands(p, which = "LR") {
  const J = joints(p);
  const out = { ...p, handsIn: "world" };
  if (which.includes("L")) out.handL = v3(J.wristL);
  if (which.includes("R")) out.handR = v3(J.wristR);
  return out;
}

// Feet fixed in world space at the current ankle positions of pose p.
export function pinFeet(p, which = "LR") {
  const J = joints(p);
  const out = { ...p };
  if (which.includes("L")) out.footL = v3(J.ankleL);
  if (which.includes("R")) out.footR = v3(J.ankleR);
  return out;
}

// Common arm placements (IK in the chest frame unless noted).
export const ARMS = {
  hips: { handsIn: "pelvis", handL: [0.185, 0.06, 0.03], handR: [-0.185, 0.06, 0.03], elbowL: [1, 0, -0.3], elbowR: [-1, 0, -0.3], palmL: [-1, 0, 0], palmR: [1, 0, 0], fingersL: [0, -1, 0], fingersR: [0, -1, 0] },
  goblet: { handsIn: "chest", handL: [0.056, -0.21, 0.20], handR: [-0.056, -0.21, 0.20], elbowL: [0.3, -1, 0.2], elbowR: [-0.3, -1, 0.2] },
  chest: { handsIn: "chest", handL: [0.05, -0.12, 0.13], handR: [-0.05, -0.12, 0.13], elbowL: [0.6, -1, 0], elbowR: [-0.6, -1, 0] },
  prayer: { handsIn: "chest", handL: [0.02, -0.14, 0.2], handR: [-0.02, -0.14, 0.2], elbowL: [1, -0.6, 0], elbowR: [-1, -0.6, 0] },
  overhead: { armL: [175, 12, 5, 0], armR: [175, 12, 5, 0] },
  forward: { armL: [90, 8, 5, 0], armR: [90, 8, 5, 0] },
  tPose: { armL: [0, 90, 5, 0], armR: [0, 90, 5, 0] },
  relaxed: { armL: [0, 7, 10, 0], armR: [0, 7, 10, 0] },
  runL: { armL: [-35, 8, 80, 0], armR: [45, 8, 80, 0] }, // left arm back, right arm forward
  runR: { armL: [45, 8, 80, 0], armR: [-35, 8, 80, 0] },
};

// Straight-ish FK leg helpers: [hip flexion, abduction, knee flexion, ankle plantarflexion]
export const LEG = {
  straight: [0, 3, 0, 0],
  kneel: [0, 3, 90, 80], // thigh down, shin back along the floor, top of the foot down
  sit90: [90, 6, 90, 0],
};
