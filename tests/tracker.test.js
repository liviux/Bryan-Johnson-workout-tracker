import assert from "node:assert/strict";
import test from "node:test";
import { editItem } from "../public/js/components/logger.js";
import { defaultProfile } from "../public/js/personalize.js";
import { markTrackerEnd, markTrackerStart, trackerWindowFor } from "../public/js/plan.js";
import { flushNow, state } from "../public/js/store.js";

test("manual logging records the hours the tracker was used", () => {
  state.mode = "local";
  state.profile = defaultProfile();
  state.days = {};
  const date = "2026-11-13";
  editItem(date, "main", { id: "tracker-pushup", ex: "pushup" }, (log) => {
    log.sets = [{ reps: 10 }];
    log.done = true;
  });
  const window = trackerWindowFor(date);
  assert.ok(window);
  assert.equal(window.estimated, false);
  assert.equal(window.source, "log");
  assert.ok(Date.parse(window.start) <= Date.parse(window.end));
  flushNow();
});

test("guided workouts keep an exact start and end", () => {
  state.mode = "local";
  state.profile = defaultProfile();
  state.days = {};
  const date = "2026-11-14";
  markTrackerStart(date, "guided");
  const started = trackerWindowFor(date);
  assert.equal(started.source, "guided");
  assert.equal(started.estimated, false);
  markTrackerEnd(date, "guided");
  const ended = trackerWindowFor(date);
  assert.equal(ended.source, "guided");
  assert.ok(Date.parse(ended.end) >= Date.parse(started.start));
  flushNow();
});

test("older logs estimate a window, while a Health Connect link alone does not", () => {
  state.mode = "local";
  state.profile = defaultProfile();
  const date = "2026-11-13";
  state.days = {
    [date]: {
      date,
      items: { old: { done: true, sets: [{ reps: 8 }] } },
      addons: {},
      updatedAt: "2026-11-13T19:00:00.000Z",
    },
  };
  const estimated = trackerWindowFor(date);
  assert.equal(estimated.estimated, true);
  assert.equal(estimated.end, "2026-11-13T19:00:00.000Z");
  assert.ok(Date.parse(estimated.start) < Date.parse(estimated.end));

  state.days[date] = {
    date,
    items: {},
    addons: {},
    healthConnect: { start: "2026-11-13T18:00:00.000Z", end: "2026-11-13T19:00:00.000Z" },
    updatedAt: "2026-11-13T19:00:00.000Z",
  };
  assert.equal(trackerWindowFor(date), null);
  flushNow();
});

test("a session is a full, partial or no match against the tracker time", async () => {
  globalThis.window ||= { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
  globalThis.document ||= { documentElement: { dataset: {}, style: {} } };
  const { healthMatch } = await import("../public/js/components/health-connect.js");
  const window = { start: "2026-11-13T18:00:00.000Z", end: "2026-11-13T19:00:00.000Z" };
  const session = (start, end) => ({ start, end });
  assert.equal(healthMatch(session("2026-11-13T18:10:00.000Z", "2026-11-13T18:40:00.000Z"), window).kind, "full");
  assert.equal(healthMatch(session("2026-11-13T17:45:00.000Z", "2026-11-13T18:20:00.000Z"), window).kind, "partial");
  assert.equal(healthMatch(session("2026-11-13T20:00:00.000Z", "2026-11-13T20:30:00.000Z"), window).kind, "none");
  assert.equal(healthMatch(session("2026-11-13T18:00:00.000Z", "2026-11-13T19:05:00.000Z"), window).kind, "full");
});
