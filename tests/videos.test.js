import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../public/js/data/exercises.js";
import { videoChannelDate, videoGroupsFor, videosFor, renderVideos } from "../public/js/components/video.js";

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

test("video bylines include video duration before channel name and upload date", () => {
  for (const ex of Object.values(EXERCISES)) {
    for (const video of videosFor(ex)) {
      if (!video.id) continue;
      const byline = videoChannelDate(video);
      assert.equal(typeof byline.length, "number", `${ex.name}: ${video.title} has no numeric length`);
      assert.ok(byline.length > 0, `${ex.name}: ${video.title} length must be > 0`);
    }
  }

  const container = { innerHTML: "", addEventListener() {}, removeEventListener() {} };
  renderVideos(container, videosFor(EXERCISES.gobletsquat));
  const bylineHtml = container.innerHTML.slice(container.innerHTML.indexOf('class="video-byline"'));
  const runtimeIndex = bylineHtml.indexOf('class="video-runtime"');
  const channelIndex = bylineHtml.indexOf('<b>');
  const dateIndex = bylineHtml.indexOf('Uploaded');
  assert.ok(runtimeIndex !== -1, "Runtime must appear in video byline");
  assert.ok(runtimeIndex < channelIndex, "Duration must appear before channel name");
  assert.ok(channelIndex < dateIndex, "Channel name must appear before upload date");

  const tabSubMatches = [...container.innerHTML.matchAll(/<small class="video-tab-sub">([^<]+)<\/small>/g)].map((m) => m[1]);
  assert.ok(tabSubMatches.length > 0, "Video picker tabs must have sub-labels");
  for (const sub of tabSubMatches) {
    const parts = sub.split(" · ");
    assert.ok(/^\d+:\d{2}(?::\d{2})?$/.test(parts[0]), `Tab sub-label duration must be formatted runtime, got "${parts[0]}" in "${sub}"`);
    assert.ok(parts.length >= 2, `Tab sub-label must include duration and channel/date: "${sub}"`);
  }
});
