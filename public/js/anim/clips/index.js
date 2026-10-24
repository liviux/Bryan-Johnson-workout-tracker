import { makePose, mirrorPose } from "../rig.js";
import { MOVEMENTS } from "../../data/movements.js";
// Registry of all exercise animations, keyed by exercise id.
import warmup from "./warmup.js";
import power from "./power.js";
import legs from "./legs.js";
import upper from "./upper.js";
import core from "./core.js";
import stability from "./stability.js";
import cardio, { vigorous as vigorousClip } from "./cardio.js";
import mobility from "./mobility.js";
import posture from "./posture.js";

const ALL = { ...warmup, ...power, ...legs, ...upper, ...core, ...stability, ...cardio, ...mobility, ...posture };
ALL.vigorous = vigorousClip;
for (const [id, movement] of Object.entries(MOVEMENTS)) {
  let clip = { ...ALL[movement.source].clips[movement.clip], title: movement.name };
  if (movement.part === "front" || movement.part === "side") {
    const start = movement.part === "front" ? 0 : 4;
    const end = movement.part === "front" ? 4 : 7.8;
    const setup = clip.keys[0].p;
    const keys = clip.keys.filter((k) => k.t >= start && k.t <= end).map((k) => ({ ...k, t: k.t - start, cue: undefined }));
    keys[0].p = setup;
    keys[0].cue = movement.name + ": finish this side, then switch legs";
    const finish = keys.at(-1).t + 0.6;
    keys.push({ t: finish, p: setup, cue: "Switch legs" }, { t: finish + 0.001, p: mirrorPose(makePose(setup)), e: "hold" });
    clip = { ...clip, close: false, keys };
  }
  if (movement.part === "single") {
    const keys = clip.keys.map((key) => ({ ...key, p: { ...key.p, footR: [key.p.footR[0], 0.25, key.p.footR[2] - 0.08], toeR: 0 } }));
    keys[0].cue = "One heel on the floor, other foot raised; lift the working toes";
    keys.push({ t: keys.at(-1).t + 0.001, p: mirrorPose(makePose(keys[0].p)), e: "hold", cue: "Switch legs" });
    clip = { ...clip, alternate: true, close: false, keys };
  }
  ALL[id] = { clips: [clip] };
}

export function getAnimation(id) {
  return ALL[id] || null;
}

export function animationIds() {
  return Object.keys(ALL);
}
