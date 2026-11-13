import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { clearHealthStore, importHealthConnect, readHealthStore } from "../health-connect.js";

const sqlite = await import("node:sqlite").catch(() => null);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// One stored ZIP entry is enough to exercise the official export path.
function zip(name, data) {
  const file = Buffer.from(name, "utf8");
  const body = deflateRawSync(data);
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(file.length, 26);
  const localSize = local.length + file.length + body.length;

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(file.length, 28);
  central.writeUInt32LE(0, 42);
  const centralSize = central.length + file.length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(localSize, 16);

  return Buffer.concat([local, file, body, central, file, end]);
}

function makeDatabase(file) {
  const db = new sqlite.DatabaseSync(file);
  db.exec(`
    CREATE TABLE application_info_table (row_id INTEGER PRIMARY KEY, app_name TEXT, package_name TEXT);
    CREATE TABLE device_info_table (row_id INTEGER PRIMARY KEY, manufacturer TEXT, model TEXT);
    CREATE TABLE exercise_session_record_table (
      row_id INTEGER PRIMARY KEY, start_time INTEGER, start_zone_offset INTEGER,
      end_time INTEGER, end_zone_offset INTEGER, exercise_type INTEGER,
      title TEXT, notes TEXT, app_info_id INTEGER, device_info_id INTEGER
    );
    CREATE TABLE exercise_segments_table (
      row_id INTEGER PRIMARY KEY, parent_key INTEGER, segment_start_time INTEGER,
      segment_end_time INTEGER, segment_type INTEGER, repetitions_count INTEGER
    );
    CREATE TABLE heart_rate_record_table (
      row_id INTEGER PRIMARY KEY, start_time INTEGER, start_zone_offset INTEGER,
      end_time INTEGER, end_zone_offset INTEGER
    );
    CREATE TABLE heart_rate_record_series_table (
      row_id INTEGER PRIMARY KEY, parent_key INTEGER, epoch_millis INTEGER, beats_per_minute INTEGER
    );
    CREATE TABLE total_calories_burned_record_table (
      row_id INTEGER PRIMARY KEY, start_time INTEGER, start_zone_offset INTEGER,
      end_time INTEGER, end_zone_offset INTEGER, energy REAL
    );
    INSERT INTO application_info_table VALUES (1, 'Samsung Health', 'com.sec.android.app.shealth');
    INSERT INTO device_info_table VALUES (1, 'samsung', 'SM-S928B');
    INSERT INTO exercise_session_record_table VALUES (1, 1770000000000, 7200, 1770003600000, 7200, 51, 'Workout B', 'felt good', 1, 1);
    INSERT INTO exercise_segments_table VALUES (1, 1, 1770000000000, 1770000600000, 51, 10);
    INSERT INTO exercise_segments_table VALUES (2, 1, 1770000600000, 1770001200000, 51, 12);
    INSERT INTO heart_rate_record_table VALUES (1, 1770000000000, 7200, 1770003600000, 7200);
    INSERT INTO heart_rate_record_series_table VALUES (1, 1, 1770000000000, 120);
    INSERT INTO heart_rate_record_series_table VALUES (2, 1, 1770001800000, 150);
    INSERT INTO heart_rate_record_series_table VALUES (3, 1, 1770003500000, 140);
    INSERT INTO total_calories_burned_record_table VALUES (1, 1770000000000, 7200, 1770003600000, 7200, 300000);
  `);
  db.close();
}

test("a Health Connect database becomes read-only sessions with heart-rate values", { skip: !sqlite }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "health-connect-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "health_connect_export.db");
  makeDatabase(file);
  const result = await importHealthConnect(await readFile(file), { filename: "health_connect_export.db", dataDir: dir });
  assert.equal(result.imported, 1);
  assert.equal(result.replace, true);
  const [session] = result.sessions;
  assert.equal(session.date, "2026-02-02");
  assert.equal(session.type, 51);
  assert.equal(session.title, "Workout B");
  assert.equal(session.sourceApp, "Samsung Health");
  assert.equal(session.device, "samsung SM-S928B");
  assert.equal(session.minutes, 60);
  assert.equal(session.averageBpm, 137);
  assert.equal(session.maxBpm, 150);
  assert.equal(session.calories, 300);
  assert.equal(session.sets, 2);
  assert.equal(session.reps, 22);
  const stored = await readHealthStore(dir);
  assert.equal(stored.sessions.length, 1);
  await clearHealthStore(dir);
  assert.deepEqual((await readHealthStore(dir)).sessions, []);
});

test("the official ZIP export is unpacked and read", { skip: !sqlite }, async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "health-connect-zip-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "health_connect_export.db");
  makeDatabase(file);
  const archive = zip("health_connect_export.db", await readFile(file));
  const result = await importHealthConnect(archive, { filename: "Health Connect.zip", dataDir: dir });
  assert.equal(result.format, "zip");
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].title, "Workout B");
});

test("daily JSON exports add up instead of replacing older days", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "health-connect-json-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = { messages: [{ date: "2026-11-13", exercises: [{ exercise_type: "Strength Training", start_time: "2026-11-13T18:00:00+02:00", end_time: "2026-11-13T18:45:00+02:00", title: "Lift" }] }] };
  const second = { date: "2026-11-14", exercises: [{ exercise_type: "Walking", start_time: "2026-11-14T09:00:00+02:00", end_time: "2026-11-14T09:30:00+02:00" }] };
  const one = await importHealthConnect(Buffer.from(JSON.stringify(first)), { filename: "health_2026-11-13.json", dataDir: dir });
  assert.equal(one.sessions[0].startLocal, "18:00");
  const two = await importHealthConnect(Buffer.from(JSON.stringify(second)), { filename: "health_2026-11-14.json", dataDir: dir });
  assert.equal(two.sessions.length, 2);
  assert.deepEqual(two.sessions.map((session) => session.date), ["2026-11-14", "2026-11-13"]);
  assert.equal(two.sessions[1].activity, "Strength Training");
});

test("an unrelated file is refused with a useful message", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "health-connect-bad-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, "note.txt"), "hello");
  await assert.rejects(
    () => importHealthConnect(Buffer.from("hello"), { filename: "note.txt", dataDir: dir }),
    (err) => err.code === "unknown-file",
  );
});
