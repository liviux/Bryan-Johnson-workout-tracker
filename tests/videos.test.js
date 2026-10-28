import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../public/js/data/exercises.js";
import { videoChannelDate, videoGroupsFor, videosFor } from "../public/js/components/video.js";

const isShort = (video) =>
  /youtube\.com\/shorts\//.test(video.url || "") ||
  (video.end != null && video.end > (video.start || 0) && video.end - (video.start || 0) <= 45);

test("every visible exercise has three demo videos, one short, and Bryan first when present", () => {
  for (const [id, ex] of Object.entries(EXERCISES)) {
    if (ex.hidden) continue;
    const videos = videosFor(ex);
    const demos = videos.filter((video) => video.kind === "demo");
    assert.equal(demos.length, 3, `${id} needs exactly three demo videos`);
    assert(demos.some(isShort), `${id} needs one short demo`);
    const bryan = videos.filter((video) => video.kind === "bryan");
    if (bryan.length) {
      assert.equal(videos[0].kind, "bryan", `${id} must start with Bryan's video`);
      assert.equal(videos.length, 3 + bryan.length, `${id} must keep every Bryan video and three demos`);
    }
  }
});

test("split exercises keep three demos in every movement group", () => {
  for (const [id, ex] of Object.entries(EXERCISES)) {
    if (!ex.clipVideos) continue;
    for (const group of videoGroupsFor(ex)) {
      const demos = group.videos.filter((video) => video.kind === "demo");
      assert.equal(demos.length, 3, `${id}: ${group.title} needs three demo videos`);
      assert(demos.some(isShort), `${id}: ${group.title} needs one short demo`);
    }
  }
});

test("video bylines never depend on an absent metadata entry", () => {
  for (const ex of Object.values(EXERCISES)) {
    for (const video of videosFor(ex)) {
      const byline = videoChannelDate(video);
      assert.ok(byline.channel || byline.date, `${ex.name}: ${video.title} has no channel or date`);
    }
  }
});
