import assert from "node:assert/strict";
import test from "node:test";
import { DoubleSide, Matrix4, Quaternion, Raycaster, Sphere, Vector3 } from "three";
import { EXERCISES } from "../public/js/data/exercises.js";
import { animationIds, getAnimation } from "../public/js/anim/clips/index.js";
import { computeJoints, DIM, makePose, mirrorPose } from "../public/js/anim/rig.js";
import { prepareClip, sampleClip } from "../public/js/anim/stage.js";
import { createFigure } from "../public/js/anim/styles/athlete.js";
import { createFigure as createFemaleFigure } from "../public/js/anim/styles/female.js";
import { createFigure as createLowpolyFigure } from "../public/js/anim/styles/lowpoly.js";
import { createHand } from "../public/js/anim/styles/human.js";
import { createMaterials, createProp } from "../public/js/anim/props.js";
import { MeshStandardMaterial } from "three";

const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} differs from ${b}`);

test("every exercise and movement has fixed bone lengths, valid frames and reachable IK contacts throughout playback", () => {
  assert.deepEqual(animationIds().sort(), Object.keys(EXERCISES).sort());
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    assert.ok(clip.duration > 0, `${id}: empty movement`);
    clip.keys.forEach((key, i) => { if (i) assert.ok(key.t > clip.keys[i - 1].t, `${id}: key order`); });
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const pose = sampleClip(clip, t).pose;
      const J = computeJoints(pose);
      const label = `${id}: ${clip.title} at ${t.toFixed(3)}`;
      for (const v of Object.values(J)) if (v.isVector3) assert.ok(Number.isFinite(v.lengthSq()), label);
      for (const s of ["L", "R"]) {
        for (const [a, b, length] of [["hip", "knee", DIM.thigh], ["knee", "ankle", DIM.shin], ["shoulder", "elbow", DIM.upperArm], ["elbow", "wrist", DIM.forearm]]) {
          near(J[a + s].distanceTo(J[b + s]), length);
        }
        if (pose["foot" + s]) assert.ok(J["ankle" + s].distanceTo(new Vector3(...pose["foot" + s])) < 0.004, label + ": foot out of reach");
        if (pose["hand" + s]) {
          const target = new Vector3(...pose["hand" + s]);
          if (pose.handsIn === "chest") target.applyMatrix4(J.Rc).add(J.neckBase);
          else if (pose.handsIn === "pelvis") target.applyMatrix4(J.Rp).add(J.pelvis);
          assert.ok(J["wrist" + s].distanceTo(target) < 0.004, label + ": hand out of reach");
        }
        for (const [a, b] of [["handDir", "handRef"], ["footF", "footU"]]) {
          near(J[a + s].length(), 1); near(J[b + s].length(), 1);
          near(J[a + s].dot(J[b + s]), 0);
        }
      }
    }
  }
});

test("leg swings cover both planes while the stance foot and wall hand stay planted", () => {
  const raw = getAnimation("dynamic").clips.find((movement) => movement.title === "Leg swings"), clip = prepareClip(raw);
  const handRelease = raw.keys.at(-3).t;
  let minFlex = Infinity, maxFlex = -Infinity, minAbduction = Infinity, maxAbduction = -Infinity;
  const planted = {};
  for (let t = 0; t < clip.duration; t += 1 / 60) {
    const { pose, mirrored } = sampleClip(clip, t), J = computeJoints(pose);
    const free = pose["leg" + (mirrored ? "R" : "L")];
    minFlex = Math.min(minFlex, free[0]); maxFlex = Math.max(maxFlex, free[0]);
    minAbduction = Math.min(minAbduction, free[1]); maxAbduction = Math.max(maxAbduction, free[1]);
    const side = mirrored ? "L" : "R", start = mirrored ? clip.half : 0;
    if (t < start + 0.5 || t >= start + clip.half) continue;
    planted[side] ||= { ankle: J["ankle" + side].clone(), wrist: J["wrist" + side].clone() };
    assert.ok(J["ankle" + side].distanceTo(planted[side].ankle) < 0.003, `${side} stance foot slid at ${t.toFixed(3)}s`);
    if (t < start + handRelease) assert.ok(J["wrist" + side].distanceTo(planted[side].wrist) < 0.003, `${side} wall hand moved at ${t.toFixed(3)}s`);
  }
  assert.ok(maxFlex - minFlex > 70, "front-to-back hip flexion arc is missing");
  assert.ok(maxAbduction - minAbduction > 50, "side-to-side hip abduction arc is missing");
  assert.deepEqual(Object.keys(planted).sort(), ["L", "R"]);
});

test("side-to-side leg swings cross in front of the standing leg", () => {
  const clip = prepareClip(getAnimation("legswingside").clips[0]);
  let crossings = 0;
  for (let t = 0; t < clip.duration; t += 1 / 60) {
    const { pose, mirrored } = sampleClip(clip, t), side = mirrored ? "R" : "L", other = side === "L" ? "R" : "L";
    if (pose["leg" + side][1] > -10) continue;
    const J = computeJoints(pose);
    assert.ok(J["knee" + side].z > J["knee" + other].z + 0.05, `the ${side} thigh passes through the standing leg at ${t.toFixed(3)}s`);
    assert.ok(J["ankle" + side].z > J["ankle" + other].z + 0.01, `the ${side} foot passes through the standing leg at ${t.toFixed(3)}s`);
    crossings++;
  }
  assert.ok(crossings > 0);
});

test("dead hangs and leg raises use straight arms and leave the floor clear", () => {
  for (const id of ["deadhang", "legraise"]) {
    const clip = prepareClip(getAnimation(id).clips[0]), J = computeJoints(sampleClip(clip, 0).pose);
    for (const side of ["L", "R"]) {
      const bend = 180 - J["shoulder" + side].clone().sub(J["elbow" + side]).angleTo(J["wrist" + side].clone().sub(J["elbow" + side])) * 180 / Math.PI;
      assert.ok(bend < 12, `${id}: ${side} elbow is bent ${bend.toFixed(1)}° in the full hang`);
      assert.ok(J["toe" + side].y > 0.08, `${id}: ${side} foot is on the floor`);
    }
  }
});

test("pogo, heel-drop, and stomp palms stay just outside the torso through each movement", () => {
  const clips = ["pogo", "heeldrop"].flatMap((id) => getAnimation(id).clips);
  const ray = new Raycaster(), point = new Vector3();
  ray.near = 0.0001; ray.far = 0.04;
  for (const [style, create] of [["Athlete", createFigure], ["Female", createFemaleFigure]]) {
    const figure = create(), torso = figure.group.getObjectByName("human-torso");
    for (const material of Array.isArray(torso.material) ? torso.material : [torso.material]) material.side = DoubleSide;
    for (const raw of clips) {
      const clip = prepareClip(raw), times = new Set(clip.keys.map((key) => key.t));
      for (let i = 1; i < clip.keys.length; i++) times.add((clip.keys[i - 1].t + clip.keys[i].t) / 2);
      for (const t of times) {
        figure.update(computeJoints(sampleClip(clip, t).pose)); figure.group.updateMatrixWorld(true);
        for (const side of ["L", "R"]) {
          const hand = figure.group.getObjectByName("human-hand-skin" + side), inward = new Vector3(side === "L" ? -1 : 1, 0, 0);
          for (let row = 0; row < 8; row++) {
            const palm = hand.getVertexPosition(row * 25 + 6, point).applyMatrix4(hand.matrixWorld);
            ray.set(palm, inward);
            const contact = ray.intersectObject(torso, false)[0];
            assert.ok(contact && contact.distance > 0.001, `${style} ${raw.title} ${side} palm row ${row} crossed or lifted from the torso at ${t.toFixed(3)}s`);
          }
        }
      }
    }
    figure.dispose();
  }
});

test("mountain climbers tuck the foot forward while keeping knee flare under 8 cm", () => {
  for (const id of ["norwegian", "indoorhiit"]) {
    const raw = getAnimation(id).clips.find((movement) => /mountain climbers/i.test(movement.title));
    assert.ok(raw, `${id}: mountain climber clip missing`);
    const clip = prepareClip(raw);
    for (const [t, side] of [[0, "L"], [0.333, "R"]]) {
      const pose = sampleClip(clip, t).pose, J = computeJoints(pose), knee = J["knee" + side];
      assert.ok(pose["foot" + side][2] >= 0.09, `${id}: tucked foot does not reach forward`);
      assert.ok(Math.abs(knee.x - J["hip" + side].x) < 0.08, `${id}: tucked knee flares wide`);
      assert.ok(knee.distanceTo(J.neckBase) < 0.25, `${id}: knee no longer reaches the chest`);
    }
  }
});

test("mountain climber tuck limits thigh entry into the torso in both human styles", () => {
  const raw = getAnimation("norwegian").clips.find((movement) => /mountain climbers/i.test(movement.title));
  const pose = sampleClip(prepareClip(raw), 0.333).pose, J = computeJoints(pose), point = new Vector3();
  const ray = new Raycaster(), direction = new Vector3(1, 0.000173, 0.000271).normalize();
  ray.near = 0.003; ray.far = 2;
  for (const [style, create, maximumHits] of [["Athlete", createFigure, 115], ["Female", createFemaleFigure, 90]]) {
    const figure = create(), torso = figure.group.getObjectByName("human-torso");
    for (const material of Array.isArray(torso.material) ? torso.material : [torso.material]) material.side = DoubleSide;
    torso.geometry.boundingSphere = new Sphere(new Vector3(0, 0.25, 0), 4);
    figure.update(J); figure.group.updateMatrixWorld(true);
    const thigh = figure.group.getObjectByName("human-legR"); thigh.skeleton.update();
    let hits = 0;
    for (let i = 0; i < thigh.geometry.attributes.position.count; i++) {
      const y = thigh.geometry.attributes.position.getY(i);
      if (y <= -0.44 || y >= -0.10) continue;
      thigh.getVertexPosition(i, point).applyMatrix4(thigh.matrixWorld);
      ray.set(point, direction);
      const exits = ray.intersectObject(torso, false).filter((hit, index, all) =>
        hit.point.x > point.x + 0.003 && all.findIndex((other) => Math.abs(other.point.x - hit.point.x) < 0.001) === index,
      );
      if (exits.length % 2) hits++;
    }
    assert.ok(hits <= maximumHits, `${style}: ${hits} mid-thigh vertices entered the torso`);
    figure.dispose();
  }
});

test("chin-ups turn the palms inward and forearm rotation preserves the wrist's volume", () => {
  const pull = computeJoints(sampleClip(prepareClip(getAnimation("chinup").clips[0]), 0).pose);
  const chin = computeJoints(sampleClip(prepareClip(getAnimation("chinup").clips[1]), 0).pose);
  for (const s of ["L", "R"]) {
    assert.ok(pull["handRef" + s].z > 0.8);
    assert.ok(chin["handRef" + s].z < -0.8);
  }
  for (const raw of ["chinup", "legraise", "deadhang"].flatMap((id) => getAnimation(id).clips)) {
    const clip = prepareClip(raw), first = computeJoints(sampleClip(clip, 0).pose);
    for (let t = 0; t < clip.duration; t += 1 / 30) {
      const J = computeJoints(sampleClip(clip, t).pose);
      for (const s of ["L", "R"]) near(J["hand" + s].distanceTo(first["hand" + s]), 0);
    }
  }
  const figure = createFigure(), J = computeJoints(makePose({ wristL: [0, 0, 180], wristR: [0, 0, 180] }));
  figure.update(J); figure.group.updateMatrixWorld(true);
  for (const s of ["L", "R"]) {
    const mesh = figure.group.getObjectByName("human-arm" + s), bones = mesh.skeleton.bones;
    const upper = bones[2].getWorldQuaternion(new Quaternion()), middle = bones[5].getWorldQuaternion(new Quaternion()), end = bones[3].getWorldQuaternion(new Quaternion());
    assert.ok(upper.angleTo(middle) > 1 && middle.angleTo(end) > 1);
    const axis = J["foreDir" + s], p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.37 && p.getY(i) > -0.5) {
      const v = mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld).sub(J["elbow" + s]);
      v.addScaledVector(axis, -v.dot(axis));
      assert.ok(v.length() > 0.014, "forearm collapsed while turning the palm");
    }
  }
  figure.dispose();
});

test("gripped palm caps clear the bar in every hanging animation", () => {
  for (const [style, create] of [["Athlete", createFigure], ["Female athlete", createFemaleFigure]]) {
    const figure = create(), materials = createMaterials(false), v = new Vector3(), local = new Vector3();
    for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
      if (!raw.props?.some((spec) => spec.bar)) continue;
      const props = raw.props.map((spec) => createProp(spec, materials)), bars = [];
      for (const prop of props) prop.traverse((o) => {
        if (o.isMesh && o.geometry.type === "CylinderGeometry" && o.material === materials.metal) bars.push(o);
      });
      assert.equal(bars.length, 1, `${id}: expected one pull-up bar`);
      const bar = bars[0], radius = bar.geometry.parameters.radiusTop;
      bar.updateMatrixWorld(true);
      const inverse = new Matrix4().copy(bar.matrixWorld).invert(), clip = prepareClip(raw), end = clip.half ?? clip.duration;
      for (let phase = 0; phase < 8; phase++) {
        const t = end * phase / 8, J = computeJoints(sampleClip(clip, t).pose);
        figure.update(J, { grip: { L: true, R: true } }); figure.group.updateMatrixWorld(true);
        for (const side of ["L", "R"]) {
          const hand = figure.group.getObjectByName("human-hand-skin" + side), indices = hand.geometry.attributes.skinIndex;
          let checked = 0;
          for (let i = 0; i < indices.count; i++) {
            if (indices.getX(i) || indices.getY(i) || indices.getZ(i) || indices.getW(i)) continue;
            hand.getVertexPosition(i, v).applyMatrix4(hand.matrixWorld);
            local.copy(v).applyMatrix4(inverse);
            if (Math.abs(local.y) > bar.geometry.parameters.height / 2) continue;
            assert.ok(Math.hypot(local.x, local.z) >= radius - 0.001, `${style} ${id}: palm enters the bar at ${t.toFixed(3)}s`);
            checked++;
          }
          assert.ok(checked, `${style} ${id}: palm vertices were not checked`);
        }
      }
      for (const prop of props) prop.traverse((o) => o.geometry?.dispose());
    }
    figure.dispose(); Object.values(materials).forEach((m) => m.dispose());
  }
});

test("step-ups roll onto the forefoot without sinking their soles or adding a pause to the loop", () => {
  const figure = createFigure(), v = new Vector3();
  for (const id of ["norwegian", "zone2"]) {
    const raw = getAnimation(id).clips[0], clip = prepareClip(raw);
    near(clip.duration, raw.keys.at(-1).t * 2);
    assert.ok(clip.cyclic);
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      figure.update(computeJoints(sampleClip(clip, t).pose)); figure.group.updateMatrixWorld(true);
      for (const s of ["L", "R"]) figure.group.getObjectByName("foot" + s).traverse((mesh) => {
        if (!mesh.isMesh) return;
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
          assert.ok(v.y > -0.006, id + ": trainer sole crossed the floor");
        }
      });
    }
  }
  const burpee = getAnimation("indoorhiit").clips[4];
  near(prepareClip(burpee).duration, burpee.keys.at(-1).t);
  figure.dispose();
});

test("Lowpoly shoes stay above the floor and palms clear every pull-up bar", () => {
  const figure = createLowpolyFigure(), materials = createMaterials(false), v = new Vector3(), local = new Vector3();
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    const times = new Set(clip.keys.map((key) => key.t));
    for (let i = 1; i < clip.keys.length; i++) times.add((clip.keys[i - 1].t + clip.keys[i].t) / 2);
    for (const t of times) {
      const J = computeJoints(sampleClip(clip, t).pose);
      figure.update(J, { grip: { L: raw.props?.some((spec) => spec.bar), R: raw.props?.some((spec) => spec.bar) } });
      figure.group.updateMatrixWorld(true);
      for (const side of ["L", "R"]) for (const part of ["foot", "sole"]) {
        const anchor = figure.group.getObjectByName("foot" + side);
        const shoe = anchor.children[part === "foot" ? 0 : 1];
        const positions = shoe.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          shoe.getVertexPosition(i, v).applyMatrix4(shoe.matrixWorld);
          assert.ok(v.y >= -0.001, `${id}: Lowpoly ${part}${side} crossed the floor at ${t.toFixed(3)}s`);
        }
      }
    }
    if (!raw.props?.some((spec) => spec.bar)) continue;
    const end = clip.half ?? clip.duration;
    const props = raw.props.map((spec) => createProp(spec, materials)), bars = [];
    for (const prop of props) prop.traverse((o) => {
      if (o.isMesh && o.geometry.type === "CylinderGeometry" && o.material === materials.metal) bars.push(o);
    });
    assert.equal(bars.length, 1, `${id}: expected one pull-up bar`);
    const bar = bars[0];
    bar.updateMatrixWorld(true);
    const inverse = new Matrix4().copy(bar.matrixWorld).invert();
    for (let phase = 0; phase < 8; phase++) {
      const t = end * phase / 8, J = computeJoints(sampleClip(clip, t).pose);
      figure.update(J, { grip: { L: true, R: true } }); figure.group.updateMatrixWorld(true);
      for (const side of ["L", "R"]) {
        const hand = figure.group.getObjectByName("hand" + side).children[0], positions = hand.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          hand.getVertexPosition(i, v).applyMatrix4(hand.matrixWorld);
          local.copy(v).applyMatrix4(inverse);
          if (Math.abs(local.y) > bar.geometry.parameters.height / 2) continue;
          assert.ok(Math.hypot(local.x, local.z) >= bar.geometry.parameters.radiusTop - 0.001, `${id}: Lowpoly palm entered the bar at ${t.toFixed(3)}s`);
        }
      }
    }
    for (const prop of props) prop.traverse((o) => o.geometry?.dispose());
  }
  figure.dispose(); Object.values(materials).forEach((m) => m.dispose());
});

test("side-plank hips move around a planted elbow and ankle", () => {
  const clip = prepareClip(getAnimation("sideplank").clips[0]), first = computeJoints(sampleClip(clip, 0).pose);
  for (let t = 0; t < clip.half; t += 1 / 60) {
    const J = computeJoints(sampleClip(clip, t).pose);
    assert.ok(J.elbowR.distanceTo(first.elbowR) < 0.003, "supporting elbow moved off the mat");
    assert.ok(J.ankleR.distanceTo(first.ankleR) < 0.001, "supporting foot slid");
  }
});

test("duplicate setup keys in alternate clips cut cleanly to the mirrored side", () => {
  const rounded = (pose) => JSON.stringify(pose, (_, value) => typeof value === "number" ? Math.round(value * 1e5) / 1e5 : value);
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    if (!raw.alternate || raw.keys[1]?.t > 0.0011 || JSON.stringify(raw.keys[0]?.p) !== JSON.stringify(raw.keys[1]?.p)) continue;
    const clip = prepareClip(raw), before = clip.keys.find((key) => key.t === clip.half).pose;
    const afterTime = clip.half + raw.keys[1].t;
    const after = clip.keys.find((key) => key.t === afterTime).pose;
    assert.equal(rounded(sampleClip(clip, clip.half + raw.keys[1].t / 2).pose), rounded(before), `${raw.title}: blended across the side switch`);
    assert.equal(rounded(sampleClip(clip, afterTime + 1e-6).pose), rounded(after), `${raw.title}: missed the mirrored pose`);
  }
});

test("alternate setup poses and their mirrored props switch at the same boundary", () => {
  const rounded = (pose) => JSON.stringify(pose, (_, value) => typeof value === "number" ? Math.round(value * 1e5) / 1e5 : value);
  const checked = new Set();
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    if (!raw.alternate || raw.close !== false || !(raw.props?.length || raw.hold || raw.bands?.length || raw.title === "Hip CARs")) continue;
    const clip = prepareClip(raw), initial = makePose(raw.keys[0].p), target = mirrorPose(initial);
    if (rounded(makePose(raw.keys.at(-1).p)) !== rounded(target)) continue;
    const cut = sampleClip(clip, clip.half);
    assert.equal(cut.mirrored, true, `${raw.title}: props did not mirror at the cut`);
    assert.equal(rounded(cut.pose), rounded(target), `${raw.title}: figure did not mirror with its props`);
    checked.add(`${id}/${raw.title}`);
  }
  for (const id of ["sideplank/Side plank", "shouldertap/Plank shoulder taps", "sidebend/Dumbbell side bend", "pallof/Band Pallof press", "thread/Thread the needle", "couch/Couch stretch", "hipflexor/Half-kneeling hip flexor stretch", "dynamic/Hip CARs"]) {
    assert.ok(checked.has(id), `${id}: setup and equipment do not switch together`);
  }
});

test("every alternate clip reaches its mirrored setup pose at the exact side switch", () => {
  const points = ["head", "neckBase", "thoracic", "lumbar", "pelvis", ...["L", "R"].flatMap((side) =>
    ["shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle"].map((joint) => joint + side))];
  let checked = 0;
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    if (!raw.alternate) continue;
    const clip = prepareClip(raw), cut = sampleClip(clip, clip.half);
    assert.equal(cut.mirrored, true, `${id}/${raw.title}: side flag missed the cut`);
    const actual = computeJoints(cut.pose), expected = computeJoints(mirrorPose(clip.keys[0].pose));
    for (const point of points) assert.ok(actual[point].distanceTo(expected[point]) < 0.01, `${id}/${raw.title}: ${point} jumps at ${clip.half}s`);
    checked++;
  }
  assert.ok(checked > 0);
});

test("the swept hair covers the skull without skin breaking through the crown", () => {
  const figure = createFigure();
  figure.update(computeJoints(makePose())); figure.group.updateMatrixWorld(true);
  const head = figure.group.getObjectByName("human-head"), face = figure.group.getObjectByName("human-face"), hair = figure.group.getObjectByName("human-hair");
  for (const polar of [15, 30, 40]) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const theta = polar * Math.PI / 180;
    const dir = new Vector3(Math.sin(theta) * Math.cos(a), Math.cos(theta), Math.sin(theta) * Math.sin(a));
    const origin = dir.clone().multiplyScalar(0.4).applyMatrix4(head.matrixWorld);
    const ray = new Raycaster(origin, dir.transformDirection(head.matrixWorld).negate());
    const skinHit = ray.intersectObject(face)[0], hairHit = ray.intersectObject(hair)[0];
    assert.ok(skinHit && hairHit && hairHit.distance < skinHit.distance - 0.001, "hair intersects the skull");
  }
  figure.dispose();
});

for (const [style, create] of [["Athlete", createFigure], ["Female athlete", createFemaleFigure]]) {
  test(`${style}'s rendered skin clears the doorway, walls, seats and other equipment throughout each movement`, () => {
    const figure = create(), materials = createMaterials(false), meshes = [], head = new Set(), v = new Vector3(), local = new Vector3();
    figure.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    figure.group.getObjectByName("head").traverse((o) => head.add(o));
    for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
      if (!raw.props?.length) continue;
      const props = raw.props.map((spec) => createProp(spec, materials)), solids = [];
      for (const prop of props) {
        prop.updateMatrixWorld(true);
        prop.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.computeBoundingBox();
          solids.push({ mesh: o, box: o.geometry.boundingBox, inverse: new Matrix4().copy(o.matrixWorld).invert() });
        });
      }
      const clip = prepareClip(raw);
      const hanging = raw.props.some((p) => p.bar || p.type === "bar");
      // The other half reflects both the figure and its props, preserving the same clearances.
      const end = clip.half ?? clip.duration;
      for (let t = 0; t < end; t += 0.125) {
        const J = computeJoints(sampleClip(clip, t).pose);
        const grip = hanging ? { L: true, R: true } : {};
        figure.update(J, { t, grip }); figure.group.updateMatrixWorld(true);
        for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i += 8) {
          mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
          for (const solid of solids) {
            local.copy(v).applyMatrix4(solid.inverse);
            const { box, mesh: prop } = solid;
            if (!box.containsPoint(local)) continue;
            let depth = Math.min(local.x - box.min.x, box.max.x - local.x, local.y - box.min.y,
              box.max.y - local.y, local.z - box.min.z, box.max.z - local.z);
            if (prop.geometry.type === "CylinderGeometry") {
              if (mesh.name.startsWith("human-hand")) continue; // Fingers wrap around the rail.
              depth = Math.min(depth, prop.geometry.parameters.radiusTop - Math.hypot(local.x, local.z));
            } else if (prop.geometry.type === "ExtrudeGeometry") {
              const slope = box.max.y / (box.max.z - box.min.z);
              depth = Math.min(depth, (slope * (box.max.z - local.z) - local.y) / Math.hypot(1, slope));
            }
            const tolerance = hanging && head.has(mesh) ? 0.001 : 0.013;
            assert.ok(depth < tolerance, `${id}: ${mesh.name} penetrates equipment at ${t.toFixed(3)}`);
          }
        }
      }
      for (const prop of props) prop.traverse((o) => o.geometry?.dispose());
    }
    figure.dispose(); Object.values(materials).forEach((m) => m.dispose());
  });
}

test("new spine, wrist and foot orientation controls mirror with the whole skeleton", () => {
  const p = makePose({ root: [0.1, 0.88, 0.03], rot: [12, 22, 5], spine: [18, 7, 25], lumbar: [5, 2, 3], armL: [155, 12, 28, 8], wristL: [15, 8, 55], wristR: [-5, -8, -12], footL: [0.15, 0.1, 0.1], footYawL: 15 });
  const J = computeJoints(p), M = computeJoints(mirrorPose(p));
  for (const [name, v] of Object.entries(J)) if (v.isVector3) {
    const other = name.endsWith("L") ? name.slice(0, -1) + "R" : name.endsWith("R") ? name.slice(0, -1) + "L" : name;
    near(v.x, -M[other].x); near(v.y, M[other].y); near(v.z, M[other].z);
  }
  assert.deepEqual(mirrorPose(mirrorPose(p)), p);
});

test("continuous curves preserve planted coordinates, never overshoot, and join smoothly at the loop", () => {
  const clip = prepareClip({ keys: [0, 1, 0, -1, 0].map((x, t) => ({ t, e: "smooth", p: { root: [x, 0.9, 0], footL: [0.12, 0.075, 0] } })) });
  for (let t = 0; t < 4; t += 0.005) {
    const p = sampleClip(clip, t).pose;
    assert.ok(p.root[0] >= -1 && p.root[0] <= 1);
    assert.deepEqual(p.footL, [0.12, 0.075, 0]);
  }
  const dt = 1e-4;
  const left = (sampleClip(clip, 4 - dt).pose.root[0] - sampleClip(clip, 4 - 2 * dt).pose.root[0]) / dt;
  const right = (sampleClip(clip, 2 * dt).pose.root[0] - sampleClip(clip, dt).pose.root[0]) / dt;
  near(left, right, 0.001);
});

test("push-up hands stay on the floor and bird dog keeps its supporting hand and knee still", () => {
  const push = prepareClip(getAnimation("pushup").clips[0]);
  for (let t = 0; t < push.duration; t += 1 / 60) {
    const p = sampleClip(push, t).pose, J = computeJoints(p);
    for (const s of ["L", "R"]) near(J["wrist" + s].distanceTo(new Vector3(...p["hand" + s])), 0, 0.001);
  }
  const bird = prepareClip(getAnimation("birddog").clips[0]);
  const start = computeJoints(sampleClip(bird, 0).pose);
  for (let t = 0; t < bird.half; t += 1 / 60) {
    const J = computeJoints(sampleClip(bird, t).pose);
    near(J.wristR.distanceTo(start.wristR), 0, 0.001);
    near(J.kneeL.distanceTo(start.kneeL), 0, 0.001);
  }
});

test("shoulder taps keep the toes planted and external rotation keeps the elbow on the knee", () => {
  const tap = prepareClip(getAnimation("shouldertap").clips[0]);
  for (let t = 0; t < tap.duration; t += 1 / 60) {
    const J = computeJoints(sampleClip(tap, t).pose);
    near(J.toeL.y, 0.018, 0.001); near(J.toeR.y, 0.018, 0.001);
  }
  const rotation = prepareClip(getAnimation("extrot").clips[0]);
  for (let t = 0; t < rotation.half; t += 1 / 60) {
    const J = computeJoints(sampleClip(rotation, t).pose);
    assert.ok(J.elbowL.distanceTo(J.kneeL.clone().add({ x: 0, y: 0.065, z: 0 })) < 0.005);
  }
});

test("curl grips turn continuously and cardio keeps hands down with knees clear of the floor", () => {
  const curl = prepareClip(getAnimation("curl").clips[0]);
  let previous = computeJoints(sampleClip(curl, 0).pose).handRefL;
  for (let t = 1 / 60; t < curl.duration; t += 1 / 60) {
    const next = computeJoints(sampleClip(curl, t).pose).handRefL;
    assert.ok(previous.dot(next) > 0.98, "wrist flipped during the curl");
    previous = next;
  }
  for (const ci of [2, 4]) {
    const clip = prepareClip(getAnimation("indoorhiit").clips[ci]);
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const p = sampleClip(clip, t).pose, J = computeJoints(p);
      assert.ok(Math.min(J.kneeL.y, J.kneeR.y) > 0.05, "knee crossed the floor");
      if (p.handL?.[1] === 0.035) near(J.wristL.distanceTo(new Vector3(...p.handL)), 0, 0.001);
    }
  }
});

test("sampling is repeatable, leaves authored poses unchanged, and supports reverse playback", () => {
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const before = JSON.stringify(raw), clip = prepareClip(raw);
    assert.deepEqual(sampleClip(clip, -0.25), sampleClip(clip, clip.duration - 0.25));
    assert.deepEqual(sampleClip(clip, 0.25), sampleClip(clip, 0.25));
    assert.equal(JSON.stringify(raw), before);
  }
});

test("supported palms lie flat and mirror without moving the wrists", () => {
  for (const id of ["pushup", "shouldertap", "plank", "birddog", "catcow", "cobra", "thread"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    for (let t = 0; t < clip.duration; t += 1 / 30) {
      const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
      for (const side of ["L", "R"]) if (pose["palm" + side]) {
        near(J["handDir" + side].dot(J["palm" + side]), 0);
        near(J["handRef" + side].dot(J["palm" + side]), 1);
        if (pose["hand" + side]?.[1] < 0.15) assert.ok(J["wrist" + side].distanceTo(new Vector3(...pose["hand" + side])) < 0.004, `${id}: palm out of reach`);
      }
      const mirrored = computeJoints(mirrorPose(pose));
      if (J.palmL) near(J.handL.y, mirrored.handR.y);
    }
  }
});

test("Athlete's connected skin stays finite and follows every joint through every movement", () => {
  const figure = createFigure();
  const torso = figure.group.getObjectByName("human-torso");
  assert.ok(torso.isSkinnedMesh);
  const skins = [], meshes = [];
  figure.group.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); if (o.isMesh) meshes.push(o); });
  assert.equal(skins.length, 8);
  for (const skin of skins) {
    const weights = skin.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) near(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i), 1, 1e-6);
  }
  for (const id of animationIds()) for (const raw of getAnimation(id).clips) {
    const clip = prepareClip(raw);
    for (const phase of [0.1, 0.5, 0.9]) {
      const J = computeJoints(sampleClip(clip, clip.duration * phase).pose);
      figure.update(J, { t: clip.duration * phase, breath: phase });
      figure.group.updateMatrixWorld(true);
      for (const mesh of meshes) {
        if (mesh.isSkinnedMesh) {
          mesh.skeleton.update();
          assert.ok([...mesh.skeleton.boneMatrices].every(Number.isFinite), id + ": skin transform");
        }
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 8) {
          const v = mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld);
          assert.ok(Number.isFinite(v.lengthSq()), id + ": skin vertex");
          assert.ok(v.y >= -0.015, id + ": " + mesh.name + " penetrates the floor");
        }
      }
      for (const s of ["L", "R"]) for (const kind of ["arm", "leg"]) {
        const bones = figure.group.getObjectByName("human-" + kind + s).skeleton.bones;
        near(bones[1].getWorldPosition(new Vector3()).distanceTo(J[(kind === "arm" ? "elbow" : "knee") + s]), 0);
        near(bones[3].getWorldPosition(new Vector3()).distanceTo(J[(kind === "arm" ? "wrist" : "ankle") + s]), 0);
      }
    }
  }
  const neutral = computeJoints(makePose());
  figure.update(neutral, { breath: 0 });
  const before = torso.geometry.attributes.position.array.slice();
  figure.update(neutral, { breath: 1 });
  assert.ok(torso.geometry.attributes.position.array.some((v, i) => v !== before[i]));
  near(figure.group.getObjectByName("handL").position.distanceTo(neutral.handL), 0);
  figure.update(neutral, { t: 3.1 });
  assert.ok(figure.group.getObjectByName("human-eyeL").scale.y < 0.1);
  figure.update(neutral, { t: 0 });
  near(figure.group.getObjectByName("human-eyeL").scale.y, 1);
  figure.group.updateMatrixWorld(true);
  const head = figure.group.getObjectByName("head").position;
  const headJoint = head.clone().sub(new Vector3(0, DIM.headUp, DIM.headFwd).applyMatrix4(neutral.Rh));
  near(headJoint.distanceTo(neutral.neckBase), DIM.neck * 0.72);
  near(figure.group.getObjectByName("human-neck").skeleton.bones[1].getWorldPosition(new Vector3()).distanceTo(headJoint), 0);
  figure.dispose();
});

test("human hands open flat and close each finger around a grip deterministically", () => {
  const material = new MeshStandardMaterial(), hand = createHand(material, "L");
  const rotations = () => {
    const values = [];
    hand.group.traverse((o) => { if (o.isGroup || o.isBone) values.push(o.rotation.x, o.rotation.y, o.rotation.z); });
    return values;
  };
  hand.update(false, true);
  const flat = rotations();
  hand.update(true, false, new Vector3(-1, 0, 0));
  assert.ok(rotations().some((v, i) => Math.abs(v - flat[i]) > 0.5));
  near(hand.group.rotation.y, 0);
  hand.update(false, true);
  assert.deepEqual(rotations(), flat);
  const right = createHand(material, "R");
  right.update(false, true);
  const centers = (group) => {
    group.updateMatrixWorld(true);
    const points = [];
    group.traverse((o) => { if (o.isBone) points.push(o.getWorldPosition(new Vector3())); });
    return points;
  };
  const leftPoints = centers(hand.group), rightPoints = centers(right.group);
  for (let i = 0; i < leftPoints.length; i++) {
    near(leftPoints[i].x, -rightPoints[i].x); near(leftPoints[i].y, rightPoints[i].y); near(leftPoints[i].z, rightPoints[i].z);
  }
  for (const h of [hand, right]) h.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSkinnedMesh) o.skeleton.dispose(); });
  material.dispose();
});

test("high knees lift off and land without a foot-position jump", () => {
  for (const [id, ci, phase] of [["shortint", 0, 0.4], ["shortint", 1, 0.6], ["dynamic", 2, 0.5]]) {
    const clip = prepareClip(getAnimation(id).clips[ci]);
    for (const t of [clip.duration * phase, clip.duration]) {
      const a = computeJoints(sampleClip(clip, t - 0.002).pose);
      const b = computeJoints(sampleClip(clip, t + 0.002).pose);
      assert.ok(a.ankleL.distanceTo(b.ankleL) < 0.01, `${id}: foot jumped across the contact boundary`);
    }
  }
});

test("free arms follow the body without delaying a planted hand or an authored endpoint", () => {
  const clip = prepareClip({ keys: [
    { t: 0, p: { armL: [0, 8, 10, 0], handR: [-0.2, 0.035, 0.3] } },
    { t: 1, e: "lin", p: { armL: [90, 8, 10, 0], handR: [-0.2, 0.035, 0.3] } },
  ] });
  const mid = sampleClip(clip, 0.5).pose;
  assert.ok(mid.armL[0] > 40 && mid.armL[0] < 45);
  assert.deepEqual(mid.handR, [-0.2, 0.035, 0.3]);
  near(sampleClip(clip, 1).pose.armL[0], 90);
  near(sampleClip(clip, 0).pose.armL[0], 0);
});

test("hands cover the wrist and plant their surfaces on the floor in kneeling and plank movements", () => {
  const figure = createFigure(), v = new Vector3();
  for (const id of ["pushup", "sideplank", "nordic", "shin", "bigtoe", "birddog"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    for (let t = 0; t < clip.duration; t += 0.1) {
      const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
      figure.update(J); figure.group.updateMatrixWorld(true);
      for (const s of ["L", "R"]) {
        const skin = figure.group.getObjectByName("human-hand-skin" + s);
        let proximal = Infinity, low = Infinity;
        for (let i = 0; i < skin.geometry.attributes.position.count; i++) {
          skin.getVertexPosition(i, v).applyMatrix4(skin.matrixWorld);
          low = Math.min(low, v.y);
          proximal = Math.min(proximal, v.sub(J["wrist" + s]).dot(J["handDir" + s]));
        }
        assert.ok(proximal < -0.005, id + ": palm begins beyond the wrist");
        if (pose["hand" + s]?.[1] <= 0.05 && J["palm" + s]?.y > 0.99) {
          const plane = pose["hand" + s][1] - 0.035;
          near(J["wrist" + s].distanceTo(new Vector3(...pose["hand" + s])), 0, 0.001);
          assert.ok(low >= plane - 0.007 && low <= plane + 0.005, id + ": hand surface misses the floor");
        }
      }
    }
  }
  figure.dispose();
});

test("hands and skin keep their twist through vertical reaches and changes in direction", () => {
  const figure = createFigure();
  for (const id of ["chinup", "doorway", "woodchop", "floorpress", "jefferson", "tree"]) {
    const clip = prepareClip(getAnimation(id).clips[0]);
    let previous;
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const J = computeJoints(sampleClip(clip, t).pose);
      figure.update(J); figure.group.updateMatrixWorld(true);
      const current = ["L", "R"].flatMap((s) => [0, 2, 5].map((i) => figure.group.getObjectByName("human-arm" + s).skeleton.bones[i].getWorldQuaternion(new Quaternion()))
        .concat(new Quaternion().setFromRotationMatrix(J["handFrame" + s])));
      if (previous) current.forEach((q, i) => assert.ok(q.angleTo(previous[i]) < 0.35, id + ": skin flipped around the bone"));
      previous = current;
    }
  }
  figure.dispose();
});

test("side planks and burpees turn their wrists continuously, and thread-the-needle opens the reaching hand", () => {
  for (const [id, ci] of [["sideplank", 0], ["indoorhiit", 4]]) {
    const clip = prepareClip(getAnimation(id).clips[ci]);
    let previous;
    for (let t = 0; t < clip.duration; t += 1 / 60) {
      const J = computeJoints(sampleClip(clip, t).pose);
      if (previous) for (const s of ["L", "R"]) {
        if (J["wrist" + s].distanceTo(previous["wrist" + s]) < 0.05) assert.ok(J["handRef" + s].dot(previous["handRef" + s]) > 0.95, id + ": palm flipped");
      }
      previous = J;
    }
  }
  const thread = prepareClip(getAnimation("thread").clips[0]);
  const J = computeJoints(sampleClip(thread, 5.3).pose);
  assert.ok(J.handDirR.dot(J.foreDirR) > 0.95, "raised hand is bent back at the wrist");
});

test("pull-ups clear the bar and jumping jacks travel through the airborne part of each hop", () => {
  const figure = createFigure();
  for (const raw of getAnimation("chinup").clips) {
    const J = computeJoints(sampleClip(prepareClip(raw), 2).pose);
    figure.update(J); figure.group.updateMatrixWorld(true);
    const face = figure.group.getObjectByName("human-face"), p = face.geometry.attributes.position;
    let chin = Infinity;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.105 && p.getZ(i) > 0.04) {
      chin = Math.min(chin, face.getVertexPosition(i, new Vector3()).applyMatrix4(face.matrixWorld).y);
    }
    assert.ok(Number.isFinite(chin) && chin > raw.props[0].barH + 0.005, "chin does not clear the bar");
  }
  figure.dispose();
  const clip = prepareClip(getAnimation("indoorhiit").clips[3]);
  const dt = 0.001, t = clip.duration / 4;
  const a = computeJoints(sampleClip(clip, t - dt).pose), b = computeJoints(sampleClip(clip, t + dt).pose);
  assert.ok(Math.abs(b.ankleL.x - a.ankleL.x) / (2 * dt) > 0.5, "jump pauses in midair");
  assert.ok(a.toeL.y > 0.02, "airborne foot touches the floor");
});

test("forehead resistance keeps the palm and fingers aligned with the tilting head", () => {
  const clip = prepareClip(getAnimation("neck").clips[1]);
  for (let t = 1.2; t <= 8; t += 0.05) {
    const pose = sampleClip(clip, t).pose, J = computeJoints(pose);
    const up = new Vector3(0, 1, 0).transformDirection(J.Rh), forward = new Vector3(0, 0, 1).transformDirection(J.Rh);
    assert.ok(J.handDirL.dot(up) > 0.999 && J.handRefL.dot(forward) > 0.999);
    const target = new Vector3(0, 0.025, 0.114).applyMatrix4(J.Rh).add(J.head);
    assert.ok(J.handL.distanceTo(target) < 0.004, "palm left the forehead");
    const M = computeJoints(mirrorPose(pose));
    near(J.handDirL.x, -M.handDirR.x); near(J.handDirL.y, M.handDirR.y); near(J.handRefL.z, M.handRefR.z);
  }
});
