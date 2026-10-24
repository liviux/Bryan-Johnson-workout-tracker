// Pose → joint positions for the 3D mannequin.
//
// World axes: +Y up, the figure faces +Z, and its LEFT side is +X.
// Units: metres for positions, degrees for angles.
//
// A pose describes the pelvis (position + orientation), the spine and head as
// joint angles, and each limb either as forward-kinematics angles (legL/armL…)
// or as an inverse-kinematics target for the ankle/wrist (footL/handL…).
// IK keeps hands and feet exactly where you put them (on the floor, on a bar),
// so authoring a squat is "move the pelvis down and back"; the knees follow.

import * as THREE from "three";

const D2R = Math.PI / 180;

// Body proportions of a ~1.80 m figure.
export const DIM = {
  ankleH: 0.075, // ankle joint above the sole
  heel: 0.06, // ankle → back of heel
  toe: 0.19, // ankle → tip of toes
  shin: 0.43,
  thigh: 0.44,
  hipX: 0.095, // hip joint offset from the pelvis centre
  lumbar: 0.1, // pelvis centre → lumbar joint
  thoracic: 0.22, // lumbar → thoracic joint
  chest: 0.24, // thoracic → base of the neck
  shoulderX: 0.185,
  shoulderY: -0.045,
  shoulderZ: -0.01,
  neck: 0.09,
  headUp: 0.1,
  headFwd: 0.02,
  upperArm: 0.29,
  forearm: 0.26,
  hand: 0.085,
};

// Standing pelvis height: sole → ankle → shin → thigh.
export const STAND_Y = DIM.ankleH + DIM.shin + DIM.thigh;

export function defaultPose() {
  return {
    root: [0, STAND_Y, 0], // pelvis centre, world
    rot: [0, 0, 0], // pelvis pitch (+ tips forward), yaw (+ turns left), roll (+ leans right)
    spine: [0, 0, 0], // flexion (+ forward), side bend (+ right), twist (+ left); spread over 2 joints
    lumbar: null, // optional lower-spine share; the rest of spine is applied at the chest
    neck: [0, 0], // pitch (+ chin down), yaw
    head: [0, 0], // nod (+ down), turn
    tuck: 0, // chin-tuck glide backwards, metres
    shrugL: [0, 0], // shoulder elevation, protraction (metres)
    shrugR: [0, 0],
    // Legs: FK angles [hip flexion, hip abduction, knee flexion, ankle plantarflexion]
    legL: [0, 3, 0, 0],
    legR: [0, 3, 0, 0],
    // or IK: ankle target (world). When set, overrides legL/legR.
    footL: null,
    footR: null,
    kneeL: null, // optional IK pole direction (world); default forward + slightly out
    kneeR: null,
    toeL: 0, // foot pitch vs. the floor when IK'd: + toes down (heel up), − toes up
    toeR: 0,
    footYawL: null, // optional world yaw for a planted foot while the pelvis turns
    footYawR: null,
    turnout: 7, // feet point slightly outward (deg)
    // Arms: FK angles [shoulder flexion, shoulder abduction, elbow flexion, shoulder external rotation]
    armL: [0, 7, 10, 0],
    armR: [0, 7, 10, 0],
    wristL: [0, 0, 0], // wrist flexion, side bend, forearm rotation (degrees)
    wristR: [0, 0, 0],
    palmL: null, // world normal above a supported palm; keeps the fingers on its surface
    palmR: null,
    fingersL: null, // optional world finger direction when a palm orientation is specified
    fingersR: null,
    // or IK: wrist target. Frame given by handsIn: "world" | "chest" | "pelvis".
    handL: null,
    handR: null,
    elbowL: null, // optional IK pole direction in the same frame as the hands
    elbowR: null,
    handsIn: "world",
    // Foot orientation: "ground" (flat or pitched on the floor, default for IK feet) or
    // "shin" (follows the shin, default for FK legs). footModeL/R override one side.
    feetMode: null,
    footModeL: null,
    footModeR: null,
    ankleL: 10, // plantarflexion for IK feet in "shin" mode (FK legs use legL[3])
    ankleR: 10,
  };
}

// ---------- small math helpers ----------

function rotMat(x, y, z, order) {
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x * D2R, y * D2R, z * D2R, order));
}
function apply(m, x, y, z) {
  return new THREE.Vector3(x, y, z).applyMatrix4(m);
}
function dirOf(m, x, y, z) {
  return new THREE.Vector3(x, y, z).transformDirection(m);
}

// Two-bone IK. Returns the middle joint and the (reach-clamped) end point.
export function solveTwoBone(start, target, a, b, poleDir) {
  const d = new THREE.Vector3().subVectors(target, start);
  let len = d.length();
  const dir = len > 1e-6 ? d.clone().divideScalar(len) : new THREE.Vector3(0, -1, 0);
  len = Math.min(Math.max(len, Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const end = start.clone().addScaledVector(dir, len);
  const x = (a * a - b * b + len * len) / (2 * len);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const p = poleDir.clone().addScaledVector(dir, -poleDir.dot(dir));
  if (p.lengthSq() < 1e-8) {
    p.set(0, 0, 1).addScaledVector(dir, -dir.z);
    if (p.lengthSq() < 1e-8) p.set(1, 0, 0);
  }
  p.normalize();
  const mid = start.clone().addScaledVector(dir, x).addScaledVector(p, h);
  return { mid, end };
}

// ---------- pose → joints ----------

export function computeJoints(pose) {
  const P = pose;
  const J = {};
  const Rp = rotMat(P.rot[0], P.rot[1], P.rot[2], "YXZ");
  const pelvis = new THREE.Vector3(...P.root);
  J.pelvis = pelvis;
  J.Rp = Rp;

  // Most twisting and side bending comes from the upper back.
  const lower = P.lumbar || [P.spine[0] * 0.4, P.spine[1] * 0.25, P.spine[2] * 0.15];
  const upper = P.spine.map((v, i) => v - lower[i]);
  J.lumbar = pelvis.clone().add(apply(Rp, 0, DIM.lumbar, 0));
  const R1 = Rp.clone().multiply(rotMat(lower[0], lower[2], lower[1], "XZY"));
  J.thoracic = J.lumbar.clone().add(apply(R1, 0, DIM.thoracic, 0));
  const Rc = R1.clone().multiply(rotMat(upper[0], upper[2], upper[1], "XZY"));
  J.neckBase = J.thoracic.clone().add(apply(Rc, 0, DIM.chest, 0));
  J.R1 = R1;
  J.Rc = Rc;

  // Head
  const Rn = Rc.clone().multiply(rotMat(P.neck[0], P.neck[1], 0, "XYZ"));
  J.headJoint = J.neckBase.clone().add(apply(Rc, 0, 0, -P.tuck)).add(apply(Rn, 0, DIM.neck, 0));
  const Rh = Rn.clone().multiply(rotMat(P.head[0], P.head[1], 0, "XYZ"));
  J.head = J.headJoint.clone().add(apply(Rh, 0, DIM.headUp, DIM.headFwd));
  J.Rh = Rh;

  // Hips
  J.hipL = pelvis.clone().add(apply(Rp, DIM.hipX, 0, 0));
  J.hipR = pelvis.clone().add(apply(Rp, -DIM.hipX, 0, 0));

  for (const side of ["L", "R"]) {
    const s = side === "L" ? 1 : -1;
    const hip = J["hip" + side];
    const ik = P["foot" + side];
    let knee, ankle, shinFrame = null;
    if (ik) {
      const pole = P["knee" + side] ? new THREE.Vector3(...P["knee" + side]).normalize() : dirOf(Rp, 0.12 * s, 0, 1).normalize();
      const r = solveTwoBone(hip, new THREE.Vector3(...ik), DIM.thigh, DIM.shin, pole);
      knee = r.mid;
      ankle = r.end;
    } else {
      const [flex, abd, kneeFlex] = P["leg" + side];
      const Rt = Rp.clone().multiply(rotMat(-flex, 0, abd * s, "XZY"));
      J["thighFrame" + side] = Rt;
      knee = hip.clone().add(apply(Rt, 0, -DIM.thigh, 0));
      shinFrame = Rt.clone().multiply(rotMat(kneeFlex, 0, 0, "XYZ"));
      J["shinFrame" + side] = shinFrame;
      ankle = knee.clone().add(apply(shinFrame, 0, -DIM.shin, 0));
    }
    J["knee" + side] = knee;
    J["ankle" + side] = ankle;

    // Foot frame: f = toward the toes, u = top of the foot.
    // "ground": flat (or pitched by toeL/R) on the floor. "shin": follows the shin,
    // plantarflexed by legL[3] (FK) or ankleL (IK) — for kneeling, lying, hanging.
    let f, u;
    const mode = P["footMode" + side] || P.feetMode || (ik ? "ground" : "shin");
    if (mode === "shin") {
      const plantar = (ik ? P["ankle" + side] : P["leg" + side][3]) * D2R;
      const up0 = new THREE.Vector3().subVectors(knee, ankle).normalize();
      const lat = apply(Rp, 1, 0, 0);
      lat.addScaledVector(up0, -lat.dot(up0));
      if (lat.lengthSq() < 1e-6) lat.set(1, 0, 0).addScaledVector(up0, -up0.x);
      lat.normalize();
      const fwd0 = new THREE.Vector3().crossVectors(lat, up0).normalize();
      f = fwd0.clone().multiplyScalar(Math.cos(plantar)).addScaledVector(up0, -Math.sin(plantar));
      u = fwd0.clone().multiplyScalar(Math.sin(plantar)).addScaledVector(up0, Math.cos(plantar));
    } else {
      const yaw = (P["footYaw" + side] ?? P.rot[1] + P.turnout * s) * D2R;
      const flat = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const a = P["toe" + side] * D2R;
      f = flat.clone().multiplyScalar(Math.cos(a)).add(new THREE.Vector3(0, -Math.sin(a), 0)).normalize();
      u = flat.clone().multiplyScalar(Math.sin(a)).add(new THREE.Vector3(0, Math.cos(a), 0)).normalize();
    }
    J["footF" + side] = f;
    J["footU" + side] = u;
    J["heel" + side] = ankle.clone().addScaledVector(f, -DIM.heel).addScaledVector(u, -DIM.ankleH);
    J["toe" + side] = ankle.clone().addScaledVector(f, DIM.toe).addScaledVector(u, -DIM.ankleH * 0.55);
    J["ball" + side] = ankle.clone().addScaledVector(f, DIM.toe * 0.72).addScaledVector(u, -DIM.ankleH);
  }

  // Shoulders and arms
  const handFrame = P.handsIn === "chest" ? { R: Rc, o: J.neckBase } : P.handsIn === "pelvis" ? { R: Rp, o: pelvis } : null;
  for (const side of ["L", "R"]) {
    const s = side === "L" ? 1 : -1;
    const shrug = P["shrug" + side];
    const shoulder = J.neckBase.clone().add(apply(Rc, DIM.shoulderX * s, DIM.shoulderY + shrug[0], DIM.shoulderZ + shrug[1]));
    const ik = P["hand" + side];
    const target = ik ? (handFrame ? apply(handFrame.R, ...ik).add(handFrame.o) : new THREE.Vector3(...ik)) : null;
    const arm = P["arm" + side];
    const raised = target
      ? THREE.MathUtils.clamp(target.clone().sub(shoulder).normalize().dot(dirOf(Rc, 0, 1, 0)), 0, 1)
      : Math.max(0, -Math.cos(arm[0] * D2R) * Math.cos(arm[1] * D2R));
    // The shoulder blade rotates up with an overhead reach, rather than a fixed ball joint.
    shoulder.add(apply(Rc, -s * 0.012 * raised, 0.025 * raised, 0));
    J["shoulder" + side] = shoulder;
    let elbow, wrist, foreRef, pole = null;
    if (ik) {
      // Default elbow direction: back, down and slightly out, relative to the chest.
      const poleIn = P["elbow" + side];
      if (handFrame) {
        pole = poleIn ? dirOf(handFrame.R, ...poleIn) : dirOf(Rc, 0.35 * s, -0.4, -0.85);
      } else {
        pole = poleIn ? new THREE.Vector3(...poleIn).normalize() : dirOf(Rc, 0.35 * s, -0.4, -0.85);
      }
      const r = solveTwoBone(shoulder, target, DIM.upperArm, DIM.forearm, pole);
      elbow = r.mid;
      wrist = r.end;
      foreRef = shoulder.clone().sub(elbow); // the elbow's hinge plane stays stable through vertical reaches
    } else {
      const [flex, abd, elbowFlex, extRot] = P["arm" + side];
      const Ru = Rc.clone().multiply(rotMat(-flex, extRot * s, abd * s, "XZY"));
      elbow = shoulder.clone().add(apply(Ru, 0, -DIM.upperArm, 0));
      const Rf = Ru.clone().multiply(rotMat(-elbowFlex, 0, 0, "XYZ"));
      J["upperArmFrame" + side] = Ru;
      J["forearmFrame" + side] = Rf;
      wrist = elbow.clone().add(apply(Rf, 0, -DIM.forearm, 0));
      foreRef = dirOf(Rf, 0, 0, 1);
    }
    J["elbow" + side] = elbow;
    J["wrist" + side] = wrist;
    const fore = new THREE.Vector3().subVectors(wrist, elbow).normalize();
    let ref = foreRef || dirOf(Rc, 0, 0, 1);
    ref.addScaledVector(fore, -ref.dot(fore));
    if (ref.lengthSq() < 1e-6) {
      // A clamped-straight IK arm loses the elbow's hinge plane. Fall back to
      // the elbow pole's perpendicular part, then the chest, so grips keep a
      // coherent axis instead of an arbitrary flip.
      let alt = pole ? pole.clone() : dirOf(Rc, 0, 1, 0);
      ref = alt.addScaledVector(fore, -alt.dot(fore));
      if (ref.lengthSq() < 1e-6) {
        alt = dirOf(Rc, 0, 1, 0);
        ref = alt.addScaledVector(fore, -alt.dot(fore));
      }
    }
    ref.normalize();
    const lateral = new THREE.Vector3().crossVectors(fore, ref).normalize();
    const wr = P["wrist" + side];
    const frame = new THREE.Matrix4().makeBasis(lateral, fore, ref).multiply(rotMat(wr[0], wr[2] * s, wr[1] * s, "YXZ"));
    const palm = P["palm" + side] ? new THREE.Vector3(...P["palm" + side]).normalize() : null;
    if (palm) {
      const fingers = P["fingers" + side] ? new THREE.Vector3(...P["fingers" + side]) : new THREE.Vector3(Math.sin(P.rot[1] * D2R), 0, Math.cos(P.rot[1] * D2R));
      fingers.addScaledVector(palm, -fingers.dot(palm));
      if (fingers.lengthSq() < 1e-6) fingers.copy(fore).addScaledVector(palm, -fore.dot(palm));
      fingers.normalize();
      frame.makeBasis(new THREE.Vector3().crossVectors(fingers, palm).normalize(), fingers, palm);
    }
    J["handFrame" + side] = frame;
    J["handDir" + side] = dirOf(frame, 0, 1, 0);
    J["handRef" + side] = dirOf(frame, 0, 0, 1);
    J["hand" + side] = wrist.clone().addScaledVector(J["handDir" + side], DIM.hand * 0.55);
    if (palm) J["hand" + side].addScaledVector(palm, -0.018);
    if (palm) J["palm" + side] = palm;
    J["foreDir" + side] = fore;
  }
  return J;
}

// ---------- pose utilities ----------

// Deep-merge a partial pose over the default pose (arrays are replaced, not merged).
export function makePose(partial = {}) {
  const p = defaultPose();
  for (const [k, v] of Object.entries(partial)) p[k] = Array.isArray(v) ? v.slice() : v;
  return p;
}

// Linear blend of two poses. Numbers and number arrays interpolate; anything else switches at t = 1.
export function lerpPose(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === "number" && typeof vb === "number") out[k] = va + (vb - va) * t;
    else if (Array.isArray(va) && Array.isArray(vb) && va.length === vb.length) out[k] = va.map((x, i) => x + (vb[i] - x) * t);
    else out[k] = t < 1 ? (va !== undefined ? va : vb) : vb !== undefined ? vb : va;
  }
  return out;
}

// Left ↔ right mirror of a pose (for one-sided exercises).
export function mirrorPose(p) {
  const m = { ...p };
  const flipX = (v) => (v ? [-v[0], v[1], v[2]] : v);
  const swap = (a, b, fn = (x) => x) => {
    m[a] = fn(p[b]);
    m[b] = fn(p[a]);
  };
  m.root = flipX(p.root);
  m.rot = [p.rot[0], -p.rot[1], -p.rot[2]];
  m.spine = [p.spine[0], -p.spine[1], -p.spine[2]];
  m.lumbar = p.lumbar ? [p.lumbar[0], -p.lumbar[1], -p.lumbar[2]] : null;
  m.neck = [p.neck[0], -p.neck[1]];
  m.head = [p.head[0], -p.head[1]];
  swap("legL", "legR");
  swap("armL", "armR");
  swap("wristL", "wristR");
  swap("palmL", "palmR", flipX);
  swap("fingersL", "fingersR", flipX);
  swap("shrugL", "shrugR");
  swap("toeL", "toeR");
  swap("footYawL", "footYawR", (v) => v == null ? v : -v);
  swap("ankleL", "ankleR");
  swap("footModeL", "footModeR");
  swap("footL", "footR", flipX);
  swap("kneeL", "kneeR", flipX);
  // Chest/pelvis frames mirror with the body, so hand targets in any frame just flip X.
  swap("handL", "handR", flipX);
  swap("elbowL", "elbowR", flipX);
  return m;
}
