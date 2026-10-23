// Athlete's skin and clothing deform around the shared exercise skeleton.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DIM } from "../rig.js";

// Elliptical cross-sections: height, half-width, half-depth, forward and lateral offsets.
function surface(profile, skin, material = () => 0, radial = 32) {
  const positions = [], uv = [], indices = [], skinIndices = [], weights = [];
  for (const [i, [y, width, depth, z = 0, x = 0]] of profile.entries()) {
    const [a, b, blend] = skin(y);
    for (let j = 0; j <= radial; j++) {
      const angle = j / radial * Math.PI * 2;
      positions.push(x + width * Math.cos(angle), y, z + depth * Math.sin(angle));
      uv.push(j / radial, i / (profile.length - 1));
      skinIndices.push(a, b, 0, 0); weights.push(1 - blend, blend, 0, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (let i = 0; i < profile.length - 1; i++) {
    const start = indices.length;
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const mat = material(profile[i][0]), previous = geometry.groups.at(-1);
    if (previous?.materialIndex === mat) previous.count += indices.length - start;
    else geometry.addGroup(start, indices.length - start, mat);
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal, n = new THREE.Vector3(), other = new THREE.Vector3();
  for (let i = 0; i < profile.length; i++) {
    const a = i * (radial + 1), b = a + radial;
    n.fromBufferAttribute(normals, a).add(other.fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry;
}

function skinned(geometry, materials, bones, name) {
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(bones[0]);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  return mesh;
}

export function createTorso(materials, profile = [
    [-0.12, 0.065, 0.06], [-0.1, 0.114, 0.085], [-0.07, 0.145, 0.105],
    [-0.03, 0.163, 0.114], [0.02, 0.162, 0.112], [0.045, 0.158, 0.109], [0.065, 0.153, 0.106],
    [0.11, 0.144, 0.1], [0.16, 0.141, 0.098], [0.21, 0.146, 0.103],
    [0.26, 0.156, 0.11], [0.31, 0.169, 0.117], [0.36, 0.181, 0.122],
    [0.41, 0.185, 0.124], [0.455, 0.182, 0.12], [0.49, 0.17, 0.108],
    [0.515, 0.145, 0.097], [0.535, 0.125, 0.084], [0.55, 0.1, 0.071],
    [0.56, 0.071, 0.055], [0.565, 0.054, 0.05], [0.57, 0.053, 0.049],
  ]) {
  const sections = profile.map(([y, width, depth]) => {
    const forward = 0.008 * THREE.MathUtils.smoothstep(y, 0.12, 0.3) * (1 - THREE.MathUtils.smoothstep(y, 0.48, 0.56));
    return [y, width, depth - forward, forward];
  });
  const geometry = surface(sections, (y) => {
    const upper = y >= 0.22;
    return [upper ? 1 : 0, upper ? 2 : 1, THREE.MathUtils.smoothstep(y, upper ? 0.22 : 0.04, upper ? 0.42 : 0.22)];
  }, (y) => y < 0.045 ? 0 : y < 0.065 ? 4 : y < 0.26 ? 1 : y < 0.565 ? 2 : 3, 48);
  const cloth = geometry.attributes.position;
  for (let i = 0; i < cloth.count; i++) {
    const x = cloth.getX(i), y = cloth.getY(i), z = cloth.getZ(i);
    const chest = Math.exp(-(((Math.abs(x) - 0.085) / 0.06) ** 2) - (((y - 0.41) / 0.065) ** 2));
    const fold = 0.0012 * Math.sin(y * 210 + Math.abs(x) * 30) * Math.exp(-(((y - 0.13) / 0.065) ** 2));
    if (y > 0.065 && z > 0) cloth.setZ(i, z + chest * 0.004 + fold);
  }
  geometry.computeVertexNormals();
  const positions = geometry.attributes.position.array.slice();
  const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  bones[0].add(bones[1]); bones[1].add(bones[2]);
  bones[1].position.y = DIM.lumbar; bones[2].position.y = DIM.thoracic;
  const mesh = skinned(geometry, materials, bones, "human-torso");
  const lower = new THREE.Quaternion(), chest = new THREE.Quaternion();
  return {
    mesh,
    update(J, breath = 0) {
      bones[0].position.copy(J.pelvis);
      bones[0].quaternion.setFromRotationMatrix(J.Rp);
      lower.setFromRotationMatrix(J.R1); chest.setFromRotationMatrix(J.Rc);
      bones[1].quaternion.copy(bones[0].quaternion).invert().multiply(lower);
      bones[2].quaternion.copy(lower).invert().multiply(chest);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = positions[i * 3 + 1];
        const rib = Math.exp(-(((y - 0.4) / 0.12) ** 2)) * breath;
        const z = positions[i * 3 + 2];
        p.setXYZ(i, positions[i * 3] * (1 + 0.009 * rib), y, z > 0 ? z * (1 + 0.023 * rib) : z);
      }
      p.needsUpdate = true;
    },
  };
}

export function createNeck(material) {
  const bones = [new THREE.Bone(), new THREE.Bone()];
  bones[0].add(bones[1]); bones[1].position.y = 0.065;
  const geometry = surface([
    [-0.025, 0.059, 0.053], [0, 0.052, 0.048], [0.025, 0.047, 0.045],
    [0.05, 0.044, 0.043], [0.075, 0.046, 0.046], [0.1, 0.05, 0.05],
  ], (y) => [0, 1, THREE.MathUtils.smoothstep(y, 0, 0.08)]);
  const mesh = skinned(geometry, material, bones, "human-neck");
  const chest = new THREE.Quaternion(), head = new THREE.Quaternion(), inverse = new THREE.Matrix4();
  const joint = new THREE.Vector3();
  return {
    mesh,
    update(J) {
      chest.setFromRotationMatrix(J.Rc); head.setFromRotationMatrix(J.Rh);
      bones[0].position.copy(J.neckBase); bones[0].quaternion.copy(chest);
      // Shorten only Athlete's visible neck; authored head angles and contacts stay intact.
      joint.subVectors(J.headJoint, J.neckBase).multiplyScalar(0.72);
      bones[1].position.copy(joint).applyMatrix4(inverse.copy(J.Rc).invert());
      bones[1].quaternion.copy(chest).invert().multiply(head);
    },
  };
}

// A single surface through each elbow/knee, with a bisector bone to retain joint volume.
export function createLimb(materials, kind, side) {
  const arm = kind === "arm", a = arm ? DIM.upperArm : DIM.thigh, b = arm ? DIM.forearm : DIM.shin;
  const profile = arm ? [
    [-0.043, 0.002, 0.002], [-0.04, 0.025, 0.024], [-0.032, 0.043, 0.039], [-0.018, 0.057, 0.052],
    [0, 0.062, 0.058], [0.035, 0.064, 0.059], [0.075, 0.063, 0.056],
    [0.115, 0.059, 0.052], [0.14, 0.057, 0.05], [0.145, 0.056, 0.049],
    [0.149, 0.05, 0.044], [0.18, 0.049, 0.045], [0.22, 0.042, 0.04],
    [0.26, 0.035, 0.034], [0.29, 0.033, 0.032], [0.315, 0.035, 0.034],
    [0.35, 0.04, 0.038], [0.39, 0.039, 0.035], [0.43, 0.034, 0.03],
    [0.48, 0.028, 0.024], [0.52, 0.024, 0.02], [0.55, 0.023, 0.019], [0.562, 0.022, 0.018],
  ] : [
    [-0.065, 0.015, 0.02], [-0.04, 0.064, 0.075], [0, 0.088, 0.094],
    [0.055, 0.096, 0.099], [0.11, 0.095, 0.098], [0.17, 0.091, 0.091],
    [0.215, 0.087, 0.085], [0.22, 0.086, 0.084], [0.225, 0.077, 0.075],
    [0.27, 0.073, 0.071], [0.33, 0.063, 0.063], [0.38, 0.054, 0.057],
    [0.42, 0.05, 0.053], [0.44, 0.05, 0.051], [0.47, 0.047, 0.048],
    [0.51, 0.049, 0.053], [0.56, 0.055, 0.061, -0.005], [0.61, 0.056, 0.064, -0.008],
    [0.67, 0.05, 0.057, -0.006], [0.73, 0.041, 0.045, -0.003],
    [0.79, 0.032, 0.034], [0.8, 0.033, 0.035], [0.84, 0.03, 0.031], [0.88, 0.029, 0.03],
  ];
  const geometry = surface(profile.map(([s, w, d, z]) => [-s, w, d, z]).reverse(), (y) => {
    const s = -y, r = arm ? 0.035 : 0.045;
    if (s < 0.065) return arm ? [0, 0, 0] : [4, 0, THREE.MathUtils.smoothstep(s, -0.005, 0.065)];
    if (s < a) return [0, 1, THREE.MathUtils.smoothstep(s, a - r, a)];
    if (s < a + r) return [1, 2, THREE.MathUtils.smoothstep(s, a, a + r)];
    if (arm) return s < a + b * 0.55
      ? [2, 5, THREE.MathUtils.smoothstep(s, a + r, a + b * 0.55)]
      : [5, 3, THREE.MathUtils.smoothstep(s, a + b * 0.55, a + b)];
    return [2, 3, THREE.MathUtils.smoothstep(s, a + b - 0.035, a + b + 0.025)];
  }, (y) => arm ? -y <= 0.14 ? 0 : -y <= 0.145 ? 3 : -y < a ? 1 : 2 : -y <= 0.215 ? 0 : -y <= 0.225 ? 4 : -y < a ? 1 : -y < 0.79 ? 2 : 3);
  const bones = Array.from({ length: arm ? 6 : 5 }, () => new THREE.Bone());
  bones[0].add(bones[1]); bones[1].add(bones[2]);
  if (arm) {
    bones[2].add(bones[5]); bones[5].add(bones[3]);
    bones[5].position.y = -b * 0.55; bones[3].position.y = -b * 0.45;
  } else { bones[2].add(bones[3]); bones[3].position.y = -b; }
  bones[0].add(bones[4]);
  bones[1].position.y = -a;
  const mesh = skinned(geometry, materials, bones, "human-" + kind + side);
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), qm = new THREE.Quaternion(), qe = new THREE.Quaternion(), body = new THREE.Quaternion();
  const y = new THREE.Vector3(), z = new THREE.Vector3(), x = new THREE.Vector3(), frame = new THREE.Matrix4();
  const plane = new THREE.Vector3(), first = new THREE.Vector3(), second = new THREE.Vector3();
  const roll = new THREE.Quaternion(), twist = new THREE.Quaternion();
  const rotation = (top, bottom, R, q) => {
    y.subVectors(top, bottom).normalize(); x.copy(plane);
    if (x.lengthSq() < 1e-10) x.setFromMatrixColumn(R, 0).addScaledVector(y, -y.dot(x));
    x.normalize(); z.crossVectors(x, y).normalize();
    return q.setFromRotationMatrix(frame.makeBasis(x, y, z));
  };
  return {
    mesh,
    update(J) {
      const top = J[(arm ? "shoulder" : "hip") + side], mid = J[(arm ? "elbow" : "knee") + side], end = J[(arm ? "wrist" : "ankle") + side];
      plane.crossVectors(first.subVectors(mid, top), second.subVectors(end, mid));
      if (arm) plane.negate();
      const upper = J[(arm ? "upperArmFrame" : "thighFrame") + side], lower = J[(arm ? "forearmFrame" : "shinFrame") + side];
      if (upper) q0.setFromRotationMatrix(upper); else rotation(top, mid, arm ? J.Rc : J.Rp, q0);
      if (lower) q1.setFromRotationMatrix(lower); else rotation(mid, end, arm ? J.Rc : J.Rp, q1);
      qm.copy(q0).slerp(q1, 0.5);
      if (arm) {
        y.copy(J["handDir" + side]).negate(); z.copy(J["handRef" + side]);
        x.crossVectors(y, z).normalize(); qe.setFromRotationMatrix(frame.makeBasis(x, y, z));
      } else {
        y.copy(J["footU" + side]); z.copy(J["footF" + side]);
        x.crossVectors(y, z).normalize(); qe.setFromRotationMatrix(frame.makeBasis(x, y, z));
      }
      bones[0].position.copy(top); bones[0].quaternion.copy(q0);
      bones[4].quaternion.copy(q0).invert().multiply(body.setFromRotationMatrix(arm ? J.Rc : J.Rp));
      bones[1].quaternion.copy(q0).invert().multiply(qm);
      bones[2].quaternion.copy(qm).invert().multiply(q1);
      if (arm) {
        // Pronation rolls through the forearm instead of squeezing a half-turn into the wrist.
        y.set(0, 1, 0).applyQuaternion(q1); z.copy(J["handRef" + side]).addScaledVector(y, -z.dot(y));
        if (z.lengthSq() < 1e-6) z.set(0, 0, 1).applyQuaternion(q1);
        z.normalize(); x.crossVectors(y, z).normalize();
        twist.setFromRotationMatrix(frame.makeBasis(x, y, z)); roll.copy(q1).slerp(twist, 0.55);
        bones[5].quaternion.copy(q1).invert().multiply(roll);
        bones[3].quaternion.copy(roll).invert().multiply(qe);
      } else bones[3].quaternion.copy(q1).invert().multiply(qe);
    },
  };
}

export function createHand(material, side) {
  const group = new THREE.Group(); group.name = "human-hand" + side;
  const s = side === "L" ? 1 : -1;
  const bones = [new THREE.Bone()], pieces = [];
  // The palm runs back over the wrist so it covers the forearm's end when the
  // wrist bends, and stays wide right up to the knuckles so every finger grows
  // out of the palm instead of meeting it at a point.
  pieces.push(surface([
    [-0.061, 0.02, 0.017], [-0.047, 0.024, 0.02], [-0.035, 0.028, 0.02],
    [-0.03, 0.036, 0.019], [-0.01, 0.039, 0.018], [0.008, 0.041, 0.017],
    [0.024, 0.042, 0.016], [0.036, 0.043, 0.015], [0.044, 0.042, 0.014],
    [0.05, 0.04, 0.012], [0.051, 0.001, 0.001],
  ], () => [0, 0, 0], undefined, 24));
  const fingers = [];
  const fingerRoot = 0.05;
  for (const [i, length] of [0.071, 0.079, 0.074, 0.06].entries()) {
    const indices = [], joints = [];
    let parent = bones[0];
    for (let j = 0; j < 3; j++) {
      const joint = new THREE.Bone();
      joint.name = "human-finger" + side + "-" + i + "-" + j;
      joint.position.set(j === 0 ? (1.5 - i) * 0.017 * s : 0, j === 0 ? fingerRoot : length * [0.45, 0.32][j - 1], 0);
      parent.add(joint); indices.push(bones.length); bones.push(joint); joints.push(joint); parent = joint;
    }
    const radius = [0.008, 0.0085, 0.008, 0.007][i];
    const profile = [-0.008, 0, 0.14, 0.34, 0.45, 0.56, 0.68, 0.77, 0.87, 0.96, 1].map((u) => [
      u * length, radius * (u > 0.96 ? 0.2 : 1 - 0.37 * Math.max(0, u)), radius * (u > 0.96 ? 0.2 : 0.92 - 0.31 * Math.max(0, u)),
    ]);
    const geometry = surface(profile, (y) => y < length * 0.56
      ? [indices[0], indices[1], THREE.MathUtils.smoothstep(y, length * 0.34, length * 0.56)]
      : [indices[1], indices[2], THREE.MathUtils.smoothstep(y, length * 0.68, length * 0.87)], undefined, 12);
    geometry.translate((1.5 - i) * 0.017 * s, fingerRoot, 0);
    pieces.push(geometry); fingers.push(joints);
  }
  const thumb = new THREE.Bone(), thumbTip = new THREE.Bone();
  thumb.name = "human-thumb" + side;
  thumb.position.set(0.03 * s, -0.012, 0.002); thumb.rotation.z = -0.85 * s;
  thumbTip.position.y = 0.032; thumb.add(thumbTip); bones[0].add(thumb);
  const thumbIndex = bones.length; bones.push(thumb, thumbTip);
  bones[0].updateMatrixWorld(true);
  const thumbGeo = surface([
    [-0.012, 0.02, 0.017], [0, 0.018, 0.016], [0.018, 0.014, 0.012],
    [0.032, 0.011, 0.01], [0.047, 0.009, 0.008], [0.059, 0.007, 0.007], [0.064, 0.002, 0.002],
  ], (y) => [thumbIndex, thumbIndex + 1, THREE.MathUtils.smoothstep(y, 0.025, 0.04)], undefined, 12);
  thumbGeo.applyMatrix4(thumb.matrixWorld); pieces.push(thumbGeo);
  const geometry = mergeGeometries(pieces); pieces.forEach((g) => g.dispose());
  const mesh = skinned(geometry, material, bones, "human-hand-skin" + side);
  group.add(mesh);
  return {
    group,
    update(grip = false, flat = false, axis = null) {
      mesh.position.set(0, grip ? -0.01 : 0, grip ? 0.014 : 0);
      group.rotation.y = axis && Math.hypot(axis.x, axis.z) > 1e-4 ? Math.atan2(-axis.z, axis.x) : 0;
      if (group.rotation.y > Math.PI / 2) group.rotation.y -= Math.PI;
      if (group.rotation.y < -Math.PI / 2) group.rotation.y += Math.PI;
      for (const [i, joints] of fingers.entries()) for (const [j, joint] of joints.entries()) {
        joint.rotation.x = -(grip ? [1.5, 1.45, 0.9][j] : ([0.12, 0.22, 0.16][j] + i * 0.025) * (1 - flat) + 0.004 * flat);
        if (j === 0) {
          joint.rotation.z = (i - 1.5) * (0.012 + 0.033 * flat) * s;
          joint.position.z = -0.008 * flat;
        }
      }
      thumb.rotation.x = grip ? -0.85 : -0.18 * (1 - flat);
      thumb.rotation.y = (grip ? 0.45 : 0) * s;
      thumb.rotation.z = (grip ? -0.52 : -0.85) * s;
      thumbTip.rotation.x = grip ? -1.15 : -0.12 * (1 - flat);
    },
  };
}

export function createHead(materials) {
  const group = new THREE.Group(); group.name = "human-head";
  const curve = new THREE.CatmullRomCurve3([
    [-0.108, 0.005, 0.006], [-0.106, 0.02, 0.024], [-0.093, 0.044, 0.052],
    [-0.071, 0.055, 0.066], [-0.045, 0.066, 0.079], [-0.012, 0.076, 0.09],
    [0.024, 0.08, 0.095], [0.064, 0.079, 0.094], [0.098, 0.069, 0.082],
    [0.118, 0.046, 0.055], [0.129, 0.003, 0.004],
  ].map(([y, w, d]) => new THREE.Vector3(w, y, d)));
  const jaw = (y) => -0.004 + 0.026 * Math.exp(-(((y + 0.092) / 0.044) ** 2));
  const geometry = surface(
    curve.getPoints(72).map((v) => [v.y, Math.max(0.002, v.x), Math.max(0.003, v.z), 0]),
    () => [0, 0, 0], undefined, 112,
  );
  const p = geometry.attributes.position, skinColors = [];
  const bump = (x, y, cx, cy, w, h) => Math.exp(-(((x - cx) / w) ** 2) - (((y - cy) / h) ** 2));
  const sculpt = (x, y, z) => {
    const ax = Math.abs(x), front = Math.min(1, Math.max(0, z) / 0.048) ** 2.1;
    const bridgeT = THREE.MathUtils.clamp((0.02 - y) / 0.044, 0, 1);
    const bridgeEnv = THREE.MathUtils.smoothstep(y, -0.038, -0.022) * (1 - THREE.MathUtils.smoothstep(y, 0.012, 0.028));
    const bridgeW = 0.0115 + 0.0055 * bridgeT;
    const noseBridge = (0.0025 + 0.012 * bridgeT) * bridgeEnv * Math.exp(-((x / bridgeW) ** 2));
    const noseTip = 0.0044 * bump(x, y, 0, -0.023, 0.0125, 0.012);
    const columella = 0.0045 * bump(x, y, 0, -0.033, 0.009, 0.008);
    const alar = 0.0032 * bump(ax, y, 0.011, -0.027, 0.008, 0.008);
    const brow = 0.0028 * bump(ax, y, 0.028, 0.027, 0.026, 0.01) + 0.0014 * bump(x, y, 0, 0.024, 0.015, 0.01);
    const sockets = 0.0028 * bump(ax, y, 0.0305, 0.009, 0.021, 0.013);
    const cheeks = 0.0045 * bump(ax, y, 0.044, -0.01, 0.028, 0.025);
    const maxilla = 0.0076 * bump(x, y, 0, -0.049, 0.034, 0.023) - 0.0009 * bump(x, y, 0, -0.039, 0.005, 0.007);
    const labiomental = -0.0026 * bump(x, y, 0, -0.071, 0.024, 0.0085);
    const chin = 0.0058 * bump(x, y, 0, -0.089, 0.024, 0.015);
    return z + front * (noseBridge + noseTip + columella + alar + brow + cheeks + maxilla + labiomental + chin - sockets);
  };
  const section = new THREE.Vector3();
  const skullAt = (y) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const t = (lo + hi) / 2;
      if (curve.getPoint(t, section).y < y) lo = t; else hi = t;
    }
    return curve.getPoint((lo + hi) / 2, section);
  };
  const baseZAt = (y, zRaw) => {
    const frontShare = THREE.MathUtils.smoothstep(zRaw, -0.015, 0.018);
    const neckBack = -0.013 * THREE.MathUtils.smoothstep(-y, 0.035, 0.092) * (1 - frontShare);
    return zRaw + jaw(y) * frontShare + neckBack;
  };
  const faceDepth = (x, y) => {
    skullAt(y);
    const zRaw = section.z * Math.sqrt(Math.max(0, 1 - (x / section.x) ** 2));
    return sculpt(x, y, baseZAt(y, zRaw));
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), zRaw = p.getZ(i), ax = Math.abs(x);
    const zBase = baseZAt(y, zRaw);
    const blush = zRaw > 0 ? (bump(ax, y, 0.045, -0.014, 0.026, 0.022) + 0.35 * bump(x, y, 0, -0.023, 0.015, 0.012)) * 0.04 : 0;
    const socketShade = zRaw > 0 ? bump(ax, y, 0.03, 0.01, 0.019, 0.012) * 0.024 : 0;
    skinColors.push(1 - socketShade * 0.5, 1 - blush - socketShade * 0.75, 1 - blush * 1.1 - socketShade * 0.9);
    const sculptedZ = zRaw > 0 ? sculpt(x, y, zBase) : zBase;
    const jawTaper = 1 - 0.1 * THREE.MathUtils.smoothstep(-y, 0.045, 0.1) * THREE.MathUtils.smoothstep(sculptedZ, 0.0, 0.06);
    p.setXYZ(i, x * jawTaper, y, sculptedZ);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(skinColors, 3));
  const faceMaterial = materials.skin.clone(); faceMaterial.vertexColors = true;
  const face = new THREE.Mesh(geometry, faceMaterial); face.name = "human-face"; group.add(face);

  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const add = (parent, material, scale, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.set(...scale); mesh.position.set(...position); mesh.rotation.set(...rotation);
    parent.add(mesh); return mesh;
  };
  const feature = (parent, points, material, radius, scaleZ = 1) => {
    const path = new THREE.CatmullRomCurve3(points.map((pt) => new THREE.Vector3(...pt)));
    const geo = new THREE.TubeGeometry(path, 24, radius, 8, false), vertices = geo.attributes.position;
    for (let i = 0; i <= 24; i++) {
      const centre = path.getPointAt(i / 24), taper = 0.28 + 0.72 * Math.sin(Math.PI * i / 24) ** 0.45;
      for (let j = 0; j <= 8; j++) {
        const k = i * 9 + j;
        vertices.setXYZ(k, centre.x + (vertices.getX(k) - centre.x) * taper,
          centre.y + (vertices.getY(k) - centre.y) * taper,
          centre.z + (vertices.getZ(k) - centre.z) * taper * scaleZ);
      }
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    parent.add(mesh); return mesh;
  };

  // Smooth, natural human lips with a soft parting line.
  const lipPositions = [], lipIndices = [], lipColors = [];
  for (let row = 0; row <= 12; row++) for (let j = 0; j <= 36; j++) {
    const u = j / 18 - 1, v = row / 6 - 1, width = Math.sqrt(Math.max(0, 1 - u * u));
    const x = u * 0.022;
    const cupidsBow = v > 0 ? 1 - 0.14 * Math.exp(-((u / 0.16) ** 2)) + 0.08 * Math.exp(-(((Math.abs(u) - 0.22) / 0.16) ** 2)) : 1;
    const seam = -0.055 + 0.0018 * u * u;
    const thickness = v > 0 ? 0.0043 * cupidsBow : 0.0055;
    const y = seam + v * width * thickness;
    const pillow = Math.cos(v * Math.PI * 0.5) * width * 0.0014;
    lipPositions.push(x, y, faceDepth(x, y) + pillow + 0.00015);
    const blend = (1 - Math.abs(v) ** 2) * (1 - Math.abs(u) ** 3) * 0.76;
    const color = materials.skin.color.clone().lerp(materials.lip.color, blend);
    const parting = Math.exp(-((v / 0.13) ** 2)) * (1 - u * u) * 0.22;
    color.multiplyScalar(1 - parting);
    lipColors.push(color.r, color.g, color.b);
    if (row && j < 36) { const a = row * 37 + j, b = a - 37; lipIndices.push(b, b + 1, a, a, b + 1, a + 1); }
  }
  const lipGeo = new THREE.BufferGeometry();
  lipGeo.setAttribute("position", new THREE.Float32BufferAttribute(lipPositions, 3)); lipGeo.setIndex(lipIndices);
  lipGeo.setAttribute("color", new THREE.Float32BufferAttribute(lipColors, 3)); lipGeo.computeVertexNormals();
  const lipMaterial = materials.skin.clone(); lipMaterial.color.set(0xffffff); lipMaterial.vertexColors = true;
  group.add(new THREE.Mesh(lipGeo, lipMaterial));

  const eyeSpark = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lashMat = materials.dark.clone();
  const creaseMat = materials.brow.clone(); creaseMat.color.lerp(materials.skin.color, 0.58);
  const earInnerMat = materials.skin.clone(); earInnerMat.color.multiplyScalar(0.84);
  const irisOuter = new THREE.Color(0x21384a), irisMid = new THREE.Color(0x46799e), irisInner = new THREE.Color(0x699ec2), irisCollar = new THREE.Color(0x88b5cf);

  const eyes = [];
  for (const s of [1, -1]) {
    add(group, materials.skin, [0.01, 0.024, 0.0135], [0.0805 * s, -0.01, -0.013], [0.08, -0.18 * s, -0.05 * s]);
    add(group, earInnerMat, [0.0042, 0.014, 0.0075], [0.0845 * s, -0.01, -0.012], [0.08, -0.18 * s, -0.05 * s]);
    add(group, materials.nostril, [0.0027, 0.0011, 0.0019], [0.0065 * s, -0.0315, faceDepth(0.0065 * s, -0.0315) - 0.0014], [0.42, 0, -0.2 * s]);

    const eye = new THREE.Group(); eye.name = "human-eye" + (s === 1 ? "L" : "R");
    const cx = 0.0305 * s, cy = 0.0095, rx = 0.0142, ry = 0.0065;
    eye.position.set(cx, cy, 0); group.add(eye);
    const lidBounds = (x) => {
      const u = THREE.MathUtils.clamp(x / rx, -1, 1), sX = u * s;
      const env = Math.sin(Math.acos(u)), soft = 1 - u * u;
      const tilt = 0.0008 * sX;
      const top = tilt + ry * (0.98 * env + 0.08 * soft * (1 - 0.28 * sX));
      const bot = tilt - ry * (0.86 * env - 0.04 * soft * sX);
      return [bot, top];
    };
    const eyeSurfaceZ = (x, y) => {
      const dome = 0.0021 * Math.max(0, 1 - (x / (rx * 1.08)) ** 2 - (y / (ry * 1.25)) ** 2);
      const base = Math.max(faceDepth(cx + x, cy + y), faceDepth(cx + x, cy) - 0.0004);
      return base + 0.00085 + dome;
    };

    const white = [], whiteColors = [], indices = [], wCol = new THREE.Color();
    for (let ring = 0; ring <= 5; ring++) for (let j = 0; j <= 36; j++) {
      const u = ring / 5, angle = j / 36 * Math.PI * 2;
      const x = rx * Math.cos(angle) * u;
      const [bot, top] = lidBounds(x);
      const mid = (top + bot) * 0.5, half = (top - bot) * 0.5;
      const y = mid * u + half * Math.sin(angle) * u;
      white.push(x, y, eyeSurfaceZ(x, y));
      const caruncle = u > 0.65 && x * s < -rx * 0.62 ? THREE.MathUtils.smoothstep(-x * s, rx * 0.62, rx * 0.95) : 0;
      const edgeShade = 0.93 + 0.07 * (1 - u ** 2.2) - 0.05 * Math.max(0, Math.sin(angle)) * u;
      wCol.setRGB(edgeShade, edgeShade * (1 - 0.18 * caruncle), edgeShade * (1 - 0.24 * caruncle));
      whiteColors.push(wCol.r, wCol.g, wCol.b);
      if (ring && j < 36) { const a = ring * 37 + j, b = a - 37; indices.push(b, a, b + 1, a, a + 1, b + 1); }
    }
    const eyeGeo = new THREE.BufferGeometry();
    eyeGeo.setAttribute("position", new THREE.Float32BufferAttribute(white, 3));
    eyeGeo.setAttribute("color", new THREE.Float32BufferAttribute(whiteColors, 3));
    eyeGeo.setIndex(indices); eyeGeo.computeVertexNormals();
    eye.add(new THREE.Mesh(eyeGeo, materials.eye));

    const ix = -0.0005 * s, iy = 0.0009, rIris = 0.0065;
    const irisPos = [], irisCol = [], irisIdx = [], cTmp = new THREE.Color();
    for (let ring = 0; ring <= 6; ring++) for (let j = 0; j <= 36; j++) {
      const u = ring / 6, angle = j / 36 * Math.PI * 2;
      const rawX = ix + rIris * Math.cos(angle) * u, rawY = iy + rIris * Math.sin(angle) * u;
      const x = THREE.MathUtils.clamp(rawX, -rx * 0.92, rx * 0.92);
      const [bot, top] = lidBounds(x);
      const y = THREE.MathUtils.clamp(rawY, bot + 0.0001, top);
      irisPos.push(x, y, eyeSurfaceZ(x, y) + 0.00026);
      if (u < 0.38) {
        cTmp.setHex(0x141619);
      } else if (u < 0.55) {
        cTmp.copy(irisInner).lerp(irisCollar, (u - 0.38) / 0.17);
      } else if (u < 0.84) {
        const fiber = 0.5 + 0.5 * Math.sin(angle * 18);
        cTmp.copy(irisMid).lerp(irisInner, (1 - (u - 0.55) / 0.29) * (0.65 + 0.35 * fiber));
      } else {
        cTmp.copy(irisMid).lerp(irisOuter, (u - 0.84) / 0.16);
      }
      const lidShadow = 1 - 0.22 * THREE.MathUtils.smoothstep(y, iy + 0.0012, top);
      irisCol.push(cTmp.r * lidShadow, cTmp.g * lidShadow, cTmp.b * lidShadow);
      if (ring && j < 36) { const a = ring * 37 + j, b = a - 37; irisIdx.push(b, a, b + 1, a, a + 1, b + 1); }
    }
    const irisGeo = new THREE.BufferGeometry();
    irisGeo.setAttribute("position", new THREE.Float32BufferAttribute(irisPos, 3));
    irisGeo.setAttribute("color", new THREE.Float32BufferAttribute(irisCol, 3));
    irisGeo.setIndex(irisIdx); irisGeo.computeVertexNormals();
    eye.add(new THREE.Mesh(irisGeo, materials.iris));

    const hx = ix - 0.0015, hy = iy + 0.0014, rHi = 0.001;
    const hiPos = [hx, hy, eyeSurfaceZ(hx, hy) + 0.0005], hiIdx = [];
    for (let j = 0; j <= 16; j++) {
      const a = j / 16 * Math.PI * 2, px = hx + rHi * Math.cos(a), py = hy + rHi * Math.sin(a);
      hiPos.push(px, py, eyeSurfaceZ(px, py) + 0.00048);
      if (j < 16) hiIdx.push(0, j + 1, j + 2);
    }
    const hiGeo = new THREE.BufferGeometry();
    hiGeo.setAttribute("position", new THREE.Float32BufferAttribute(hiPos, 3));
    hiGeo.setIndex(hiIdx);
    eye.add(new THREE.Mesh(hiGeo, eyeSpark));

    const upperLid = Array.from({ length: 13 }, (_, j) => {
      const x = rx * Math.cos(j / 12 * Math.PI), [, top] = lidBounds(x);
      return [x, top, eyeSurfaceZ(x, top) + 0.00025];
    });
    const lowerLid = Array.from({ length: 13 }, (_, j) => {
      const x = rx * Math.cos(j / 12 * Math.PI), [bot] = lidBounds(x);
      return [x, bot, eyeSurfaceZ(x, bot) + 0.0001];
    });
    feature(eye, upperLid, lashMat, 0.00105, 0.75);
    feature(eye, lowerLid, materials.skin, 0.0006, 0.75);
    const crease = Array.from({ length: 11 }, (_, j) => {
      const u = -0.86 + 1.72 * (j / 10), x = rx * u, [, top] = lidBounds(x);
      const y = top + 0.0026 * (1 - 0.25 * u * u);
      return [x, y, faceDepth(cx + x, cy + y) + 0.0003];
    });
    feature(group, crease.map(([x, y, z]) => [cx + x, cy + y, z]), creaseMat, 0.00042, 0.6);
    eyes.push(eye);

    feature(group, [[0.011, 0.0225], [0.022, 0.0258], [0.035, 0.0265], [0.046, 0.024], [0.0515, 0.021]]
      .map(([x, y]) => [x * s, y, faceDepth(x * s, y) + 0.0008]), materials.brow, 0.0021, 0.65);
  }

  // Volumetric side-parted hair mapped directly onto the skull profile.
  const hairRings = 36, hairSegs = 80;
  const hairPos = [], hairCol = [], hairIdx = [];
  const hairlineY = (a) => {
    const zDir = Math.sin(a), xDir = Math.cos(a);
    const forehead = THREE.MathUtils.smoothstep(zDir, 0.22, 0.68);
    // Natural masculine M-contour at the temples + side-part sweep and soft front waves.
    const templePeak = 0.007 * Math.exp(-(((Math.abs(xDir) - 0.58) / 0.22) ** 2)) * forehead;
    const partNotch = 0.004 * Math.exp(-(((xDir - 0.42) / 0.16) ** 2)) * forehead;
    const frontWave = (-0.0045 * Math.sin(xDir * 2.2 + 0.35) + 0.0018 * Math.sin(a * 9) + 0.001 * Math.cos(a * 17)) * forehead;
    const burnTab = -0.021 * Math.exp(-(((zDir - 0.06) / 0.09) ** 2));
    const earArch = 0.011 * Math.exp(-(((zDir + 0.15) / 0.12) ** 2));
    const nape = -0.064 * THREE.MathUtils.smoothstep(-zDir, 0.2, 0.82);
    return 0.012 + 0.047 * forehead + templePeak + partNotch + frontWave + burnTab + earArch + nape;
  };
  for (let r = 0; r <= hairRings; r++) {
    const tuck = r === hairRings;
    const u = tuck ? 1 : r / (hairRings - 1);
    for (let j = 0; j <= hairSegs; j++) {
      const a = j / hairSegs * Math.PI * 2;
      const zDir = Math.sin(a), xDir = Math.cos(a);
      const front = Math.max(0, zDir), back = Math.max(0, -zDir), side = Math.abs(xDir);
      const line = hairlineY(a);
      const yBase = THREE.MathUtils.lerp(0.129, line, u ** 1.15);
      const sk = skullAt(THREE.MathUtils.clamp(yBase, -0.106, 0.129));
      const sx = sk.x * xDir;
      const sz = baseZAt(yBase, sk.z * zDir);
      const faceSurfaceZ = zDir > 0 ? sculpt(sx, yBase, sz) : sz;
      const baseZ = zDir > 0 ? Math.max(sz, faceSurfaceZ) : sz;
      const radialEnv = Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5);
      const edgeTaper = tuck ? 0.04 : (1 - u ** 3.2) * radialEnv;
      const strand = Math.sin(a * 32 + u * 14);
      const lock = Math.sin(a * 11 - u * 8 + 0.6) * Math.sin(Math.PI * u);
      const partGroove = -0.0025 * Math.exp(-(((xDir - 0.42) / 0.12) ** 2)) * front * Math.sin(Math.PI * u);
      const partSweep = (0.0065 + 0.0045 * Math.tanh((-xDir + 0.28) * 2.4)) * front * Math.sin(Math.PI * u * 0.92) * (1 - u ** 2.2) + partGroove;
      const crownLift = (1 - u ** 1.6) * 0.009 + partSweep + 0.0018 * lock * (1 - 0.35 * u);
      const minClearance = tuck ? 0.0003 : 0.0024 * radialEnv;
      const thickW = minClearance + (0.0082 * side + 0.0052 * (1 - side)) * edgeTaper + (0.0012 * lock + 0.0007 * strand) * edgeTaper;
      const thickD = minClearance + (0.0085 * front + 0.008 * back + 0.0055 * side) * edgeTaper + (0.0014 * lock + 0.0008 * strand) * edgeTaper;
      const outX = sx + xDir * thickW;
      const outY = yBase + (tuck ? -0.0004 : crownLift);
      const outZ = baseZ + zDir * (thickD + (front > 0 && !tuck ? partSweep * 0.35 : 0));
      hairPos.push(outX, outY, outZ);
      const highlight = 0.8 + 0.14 * (1 - u * 0.65) + 0.09 * strand + 0.08 * lock - (tuck ? 0.2 : 0);
      hairCol.push(highlight * 1.06, highlight * 0.98, highlight * 0.9);
      if (r && j < hairSegs) {
        const idxA = r * (hairSegs + 1) + j, idxB = idxA - (hairSegs + 1);
        hairIdx.push(idxB, idxB + 1, idxA, idxA, idxB + 1, idxA + 1);
      }
    }
  }
  const hairGeo = new THREE.BufferGeometry();
  hairGeo.setAttribute("position", new THREE.Float32BufferAttribute(hairPos, 3));
  hairGeo.setAttribute("color", new THREE.Float32BufferAttribute(hairCol, 3));
  hairGeo.setIndex(hairIdx);
  hairGeo.computeVertexNormals();
  const hNormals = hairGeo.attributes.normal, hn = new THREE.Vector3(), hOther = new THREE.Vector3();
  for (let r = 0; r <= hairRings; r++) {
    const a = r * (hairSegs + 1), b = a + hairSegs;
    hn.fromBufferAttribute(hNormals, a).add(hOther.fromBufferAttribute(hNormals, b)).normalize();
    hNormals.setXYZ(a, hn.x, hn.y, hn.z); hNormals.setXYZ(b, hn.x, hn.y, hn.z);
  }
  const hair = new THREE.Mesh(hairGeo, materials.hair); hair.name = "human-hair"; group.add(hair);
  group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return {
    group,
    update(t) {
      const blink = Math.exp(-(((t % 4.7 - 3.1) / 0.075) ** 2));
      for (const eye of eyes) eye.scale.y = 1 - 0.95 * blink;
    },
  };
}

export function createShoe(materials) {
  const group = new THREE.Group(); group.name = "human-trainer";
  const geometry = surface([
    [-0.075, 0.001, 0.001, 0.052], [-0.075, 0.044, 0.085, 0.052], [-0.071, 0.049, 0.099, 0.052],
    [-0.059, 0.051, 0.115, 0.058], [-0.043, 0.05, 0.128, 0.062],
    [-0.032, 0.047, 0.111, 0.055], [-0.014, 0.039, 0.078, 0.028],
    [0, 0.032, 0.045, -0.002], [0.014, 0.029, 0.033, -0.007],
  ], () => [0, 0, 0], (y) => y < -0.071 ? 0 : y < -0.053 ? 1 : 2);
  const p = geometry.attributes.position, colors = [], color = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = Math.abs(p.getX(i)), y = p.getY(i), z = p.getZ(i);
    const side = x > 0.024 && y > -0.053;
    const stripe = Math.abs(z - (y + 0.025) * 0.7 - 0.024) < 0.014;
    color.setHex(side && stripe ? 0x3267ef : side && z < -0.021 ? 0x7e99c7 : 0xffffff);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const shoe = new THREE.Mesh(geometry, materials); shoe.name = "trainer-upper";
  shoe.castShadow = shoe.receiveShadow = true; group.add(shoe);
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.035, 4, 12), materials[3]);
  tongue.name = "trainer-tongue"; tongue.scale.z = 0.22;
  tongue.rotation.x = 1.86; tongue.position.set(0, -0.003, 0.04); group.add(tongue);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.005), materials[3]);
  tab.name = "trainer-heel-tab"; tab.position.set(0, 0.004, -0.041); group.add(tab);
  const points = [];
  for (let i = 0; i < 4; i++) {
    const z = 0.025 + i * 0.015, y = 0.008 - i * 0.0045;
    points.push(new THREE.Vector3(-0.022, y, z), new THREE.Vector3(0.022, y, z + 0.007));
    points.push(new THREE.Vector3(0.022, y, z), new THREE.Vector3(-0.022, y, z + 0.007));
  }
  const laces = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xf7faff }));
  group.add(laces);
  return group;
}
