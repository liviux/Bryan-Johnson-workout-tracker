// Read-only Health Connect import.
//
// Health Connect is an Android data store with no cloud API. This module reads
// the two files people can get from it or from an exporter app:
//   - the official "Health Connect.zip" (a ZIP holding health_connect_export.db)
//   - a JSON export with exercise sessions (for example the open-source
//     HealthConnect Export app's daily JSON)
//
// Nothing here writes to Health Connect. The parsed sessions are kept in
// data/health-connect.json so Today and Activity can compare them with the log.

import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const STORE_VERSION = 1;
const MAX_DB_BYTES = 384 * 1024 * 1024;
const MAX_SESSIONS = 6000;

// The export database uses an older internal sequence of exercise type ids.
// They differ from the public Android SDK constants, so keep this table next to
// the parser rather than deriving it at runtime.
export const EXERCISE_TYPES = {
  0: "Unknown",
  2: "Badminton",
  4: "Running",
  5: "Basketball",
  8: "Biking",
  10: "Boxing",
  11: "Calisthenics",
  13: "Cricket",
  14: "Dancing",
  16: "Fencing",
  17: "Football (American)",
  18: "Football (Australian)",
  20: "Golf",
  22: "Gymnastics",
  23: "Handball",
  24: "High-intensity interval",
  25: "Hiking",
  26: "Ice Hockey",
  27: "Ice Skating",
  29: "Martial Arts",
  31: "Paddling",
  32: "Paragliding",
  33: "Elliptical",
  34: "Treadmill",
  35: "Rock Climbing",
  36: "Roller Hockey",
  37: "Rowing",
  38: "Rugby",
  39: "Running",
  40: "Sailing",
  42: "Scuba Diving",
  43: "Skating",
  44: "Skiing",
  45: "Snowboarding",
  46: "Snowshoeing",
  47: "Soccer",
  48: "Softball",
  49: "Squash",
  50: "Stair Climbing",
  51: "Strength Training",
  52: "Stretching",
  53: "Walking",
  54: "Surfing",
  55: "Swimming (Open Water)",
  56: "Swimming (Pool)",
  57: "Table Tennis",
  58: "Weight Training",
  59: "Volleyball",
  60: "Dynamic Workout",
  61: "Water Polo",
  62: "Wheelchair",
  63: "Yoga",
};

const TYPE_BY_NAME = new Map(Object.entries(EXERCISE_TYPES).map(([id, name]) => [name.toLowerCase(), Number(id)]));

const exerciseTableNames = ["exercise_session_record_table", "exercise_session_table", "ExerciseSessionRecord", "exercise_session_record"];
const appTableNames = ["application_info_table", "application_info"];
const deviceTableNames = ["device_info_table", "device_info"];
const segmentTableNames = ["exercise_segments_table", "exercise_segment_table", "exercise_segments"];
const heartRateTableNames = ["heart_rate_record_table", "heart_rate_record"];
const heartRateSeriesNames = ["heart_rate_record_series_table", "heart_rate_record_series"];
const calorieTableNames = ["total_calories_burned_record_table", "total_calories_burned_record"];
const distanceTableNames = ["distance_record_table", "distance_record"];

function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function number(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasZipMagic(buffer) {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05) && (buffer[3] === 0x04 || buffer[3] === 0x06);
}

function isSqlite(buffer) {
  return buffer.length >= 16 && buffer.subarray(0, 16).toString("utf8") === "SQLite format 3\u0000";
}

// Minimal ZIP reader for the one database inside a Health Connect export.
// It supports stored and deflated entries; Health Connect uses deflate.
export function unzipDatabase(buffer) {
  if (!hasZipMagic(buffer)) throw httpError(400, "not-zip", "This is not a Health Connect ZIP file.");
  if (buffer.length < 22) throw httpError(400, "bad-zip", "The ZIP is too short.");
  const min = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw httpError(400, "bad-zip", "The ZIP has no central directory.");
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  let p = centralOffset;
  let found = null;
  for (let index = 0; index < entries; index++) {
    if (p + 46 > buffer.length || buffer.readUInt32LE(p) !== 0x02014b50) throw httpError(400, "bad-zip", "The ZIP directory is damaged.");
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const uncompressedSize = buffer.readUInt32LE(p + 24);
    const nameLength = buffer.readUInt16LE(p + 28);
    const extraLength = buffer.readUInt16LE(p + 30);
    const commentLength = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.subarray(p + 46, p + 46 + nameLength).toString("utf8");
    if (!found && /\.(?:db|sqlite|sqlite3)$/i.test(name)) {
      if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) throw httpError(413, "zip64", "This ZIP is too large to read.");
      if (uncompressedSize > MAX_DB_BYTES) throw httpError(413, "db-too-large", "The database inside this ZIP is too large.");
      const local = localOffset;
      if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) throw httpError(400, "bad-zip", "The ZIP entry is damaged.");
      const localName = buffer.readUInt16LE(local + 26);
      const localExtra = buffer.readUInt16LE(local + 28);
      const start = local + 30 + localName + localExtra;
      const data = buffer.subarray(start, start + compressedSize);
      let db;
      if (method === 0) db = data;
      else if (method === 8) db = inflateRawSync(data, { maxOutputLength: MAX_DB_BYTES });
      else throw httpError(400, "bad-zip", "The ZIP uses an unsupported compression method.");
      if (!isSqlite(db)) throw httpError(400, "not-db", "The file inside the ZIP is not the Health Connect database.");
      found = db;
    }
    p += 46 + nameLength + extraLength + commentLength;
  }
  if (!found) throw httpError(400, "no-db", "No database was found inside the ZIP. Export it again from Health Connect.");
  return found;
}

function tableName(tables, names) {
  return names.find((name) => tables.has(name)) || null;
}

function columnsFor(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map((row) => row.name));
}

function pick(row, names) {
  for (const name of names) if (row[name] != null) return row[name];
  return null;
}

function localDate(startMs, offsetSeconds, fallback = null) {
  if (startMs != null) return new Date(startMs + (Number(offsetSeconds) || 0) * 1000).toISOString().slice(0, 10);
  return fallback;
}

function localTime(startMs, offsetSeconds) {
  if (startMs == null) return "";
  return new Date(startMs + (Number(offsetSeconds) || 0) * 1000).toISOString().slice(11, 16);
}

function clockFromIso(value) {
  const match = /T(\d{2}:\d{2})/.exec(String(value || ""));
  return match ? match[1] : null;
}

function idFor(session) {
  return [session.date, session.start, session.end, session.type, session.title || ""].join("|");
}

function minutesBetween(start, end) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 60000)) : 0;
}

function cleanSession(session) {
  const startDate = session.start ? new Date(session.start) : null;
  const endDate = session.end ? new Date(session.end) : null;
  if (startDate && Number.isNaN(startDate.getTime())) return null;
  if (endDate && Number.isNaN(endDate.getTime())) return null;
  const start = startDate ? startDate.toISOString() : null;
  const end = endDate ? endDate.toISOString() : start;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(session.date || "") ? session.date : start ? start.slice(0, 10) : null;
  if (!date || !start) return null;
  const out = {
    id: session.id || idFor({ ...session, start, end, date }),
    date,
    start,
    end,
    startLocal: session.startLocal || start.slice(11, 16),
    endLocal: session.endLocal || (end ? end.slice(11, 16) : ""),
    minutes: session.minutes != null ? Math.max(0, Math.round(Number(session.minutes))) : minutesBetween(start, end),
    type: Number.isFinite(Number(session.type)) ? Number(session.type) : 0,
    activity: session.activity || EXERCISE_TYPES[Number(session.type)] || "Unknown",
    title: String(session.title || "").slice(0, 300),
    notes: String(session.notes || "").slice(0, 2000),
    sourceApp: String(session.sourceApp || "").slice(0, 200),
    device: String(session.device || "").slice(0, 200),
  };
  for (const key of ["averageBpm", "minBpm", "maxBpm", "calories", "distanceM", "sets", "reps"]) {
    if (session[key] != null && Number.isFinite(Number(session[key]))) out[key] = Number(session[key]);
  }
  return out;
}

function sessionSort(a, b) {
  return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
}

function matches(hitStart, hitEnd, start, end) {
  return hitEnd > start && hitStart < end;
}

async function readSqlite(buffer, dataDir) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch {
    throw httpError(501, "unsupported-node", "Reading the Health Connect database needs Node.js 22.13 or newer. Update Node, or import a JSON export instead.");
  }
  const tempDir = path.join(dataDir, ".tmp");
  await mkdir(tempDir, { recursive: true });
  const file = path.join(tempDir, `health-connect-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  await writeFile(file, buffer);
  let db;
  try {
    db = new DatabaseSync(file);
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => String(row.name)));
    const exerciseTable = tableName(tables, exerciseTableNames);
    if (!exerciseTable) throw httpError(400, "not-health-connect", "This database has no Health Connect exercise sessions.");
    const sessionColumns = columnsFor(db, exerciseTable);
    const select = ["row_id", "start_time", "end_time", "start_zone_offset", "end_zone_offset", "exercise_type", "title", "notes", "app_info_id", "device_info_id", "local_date"].filter((name) => sessionColumns.has(name));
    const rows = db.prepare(`SELECT ${select.map((name) => JSON.stringify(name)).join(", ")} FROM ${JSON.stringify(exerciseTable)} ORDER BY start_time`).all();
    if (!rows.length) return [];

    const appTable = tableName(tables, appTableNames);
    const apps = new Map();
    if (appTable) {
      const appColumns = columnsFor(db, appTable);
      const id = ["row_id", "id"].find((name) => appColumns.has(name));
      const name = ["app_name", "display_name", "package_name"].find((name) => appColumns.has(name));
      if (id && name) for (const row of db.prepare(`SELECT ${JSON.stringify(id)}, ${JSON.stringify(name)} FROM ${JSON.stringify(appTable)}`).all()) apps.set(String(row[id]), String(row[name] || ""));
    }
    const deviceTable = tableName(tables, deviceTableNames);
    const devices = new Map();
    if (deviceTable) {
      const deviceColumns = columnsFor(db, deviceTable);
      const id = ["row_id", "id"].find((name) => deviceColumns.has(name));
      const manufacturer = deviceColumns.has("manufacturer") ? "manufacturer" : null;
      const model = deviceColumns.has("model") ? "model" : null;
      if (id) for (const row of db.prepare(`SELECT ${[id, manufacturer, model].filter(Boolean).map((name) => JSON.stringify(name)).join(", ")} FROM ${JSON.stringify(deviceTable)}`).all()) devices.set(String(row[id]), [row.manufacturer, row.model].filter(Boolean).join(" "));
    }

    const sessions = rows.map((row) => {
      const startMs = number(pick(row, ["start_time"]));
      const endMs = number(pick(row, ["end_time"]));
      const offset = number(pick(row, ["start_zone_offset"])) || 0;
      const type = number(pick(row, ["exercise_type"])) || 0;
      return {
        id: `hc-${row.row_id}`,
        date: localDate(startMs, offset, row.local_date ? new Date(Number(row.local_date) * 86400000).toISOString().slice(0, 10) : null),
        start: startMs != null ? new Date(startMs).toISOString() : null,
        end: endMs != null ? new Date(endMs).toISOString() : null,
        startLocal: localTime(startMs, offset),
        endLocal: localTime(endMs, offset),
        minutes: startMs != null && endMs != null ? Math.max(0, Math.round((endMs - startMs) / 60000)) : 0,
        type,
        activity: EXERCISE_TYPES[type] || `Type ${type}`,
        title: String(pick(row, ["title"]) || "").slice(0, 300),
        notes: String(pick(row, ["notes"]) || "").slice(0, 2000),
        sourceApp: apps.get(String(pick(row, ["app_info_id"]))) || "",
        device: devices.get(String(pick(row, ["device_info_id"]))) || "",
      };
    }).filter((session) => session.date && session.start);

    // Segment rows, when the writing app provides them. They give the number
    // of sets/reps recorded in the fitness app without changing the log.
    const segmentTable = tableName(tables, segmentTableNames);
    if (segmentTable) {
      const segmentColumns = columnsFor(db, segmentTable);
      if (segmentColumns.has("parent_key")) {
        const reps = segmentColumns.has("repetitions_count") ? ", repetitions_count" : "";
        const segments = db.prepare(`SELECT parent_key${reps} FROM ${JSON.stringify(segmentTable)}`).all();
        const byParent = new Map();
        for (const row of segments) {
          const reps = Number(row.repetitions_count) || 0;
          if (reps <= 0) continue;
          const list = byParent.get(String(row.parent_key)) || { sets: 0, reps: 0 };
          list.sets += 1;
          list.reps += reps;
          byParent.set(String(row.parent_key), list);
        }
        for (const session of sessions) {
          const count = byParent.get(String(session.id.replace(/^hc-/, "")));
          if (count) { session.sets = count.sets; if (count.reps) session.reps = count.reps; }
        }
      }
    }

    // Heart-rate values for the synced session. Query only the heart-rate
    // records that overlap an exercise session, then fold their samples in.
    const hrTable = tableName(tables, heartRateTableNames);
    const hrSeries = tableName(tables, heartRateSeriesNames);
    if (hrTable && hrSeries) {
      let from = Infinity;
      let to = -Infinity;
      for (const session of sessions) {
        const start = Date.parse(session.start);
        const end = Date.parse(session.end);
        if (Number.isFinite(start)) from = Math.min(from, start);
        if (Number.isFinite(end)) to = Math.max(to, end);
      }
      if (Number.isFinite(from) && Number.isFinite(to)) {
        const records = db.prepare(`SELECT row_id, start_time, end_time FROM ${JSON.stringify(hrTable)} WHERE end_time >= ? AND start_time <= ?`).all(from, to);
        const relevant = new Set(records.map((row) => String(row.row_id)));
        const series = [];
        const ids = [...relevant];
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          const placeholders = chunk.map(() => "?").join(",");
          series.push(...db.prepare(`SELECT parent_key, epoch_millis, beats_per_minute FROM ${JSON.stringify(hrSeries)} WHERE parent_key IN (${placeholders})`).all(...chunk));
        }
        const points = new Map();
        for (const row of series) {
          const key = String(row.parent_key);
          if (!relevant.has(key)) continue;
          const list = points.get(key) || [];
          list.push([Number(row.epoch_millis), Number(row.beats_per_minute)]);
          points.set(key, list);
        }
        for (const session of sessions) {
          const start = Date.parse(session.start);
          const end = Date.parse(session.end);
          const values = [];
          for (const record of records) {
            const rStart = Number(record.start_time);
            const rEnd = Number(record.end_time);
            if (!matches(rStart, rEnd, start, end)) continue;
            for (const [at, bpm] of points.get(String(record.row_id)) || []) {
              if (at >= start && at <= end && Number.isFinite(bpm) && bpm > 0) values.push(bpm);
            }
          }
          if (values.length) {
            let total = 0;
            let low = Infinity;
            let high = -Infinity;
            for (const bpm of values) {
              total += bpm;
              low = Math.min(low, bpm);
              high = Math.max(high, bpm);
            }
            session.averageBpm = Math.round(total / values.length);
            session.minBpm = Math.round(low);
            session.maxBpm = Math.round(high);
          }
        }
      }
    }

    // Calories and distance are interval records. Credits are split by overlap
    // so a workout that shares a record does not count the whole hour.
    const calorieTable = tableName(tables, calorieTableNames);
    if (calorieTable) {
      const cols = columnsFor(db, calorieTable);
      if (cols.has("start_time") && cols.has("end_time") && cols.has("energy")) {
        const records = db.prepare(`SELECT start_time, end_time, energy FROM ${JSON.stringify(calorieTable)}`).all();
        for (const session of sessions) {
          const start = Date.parse(session.start);
          const end = Date.parse(session.end);
          let total = 0;
          for (const record of records) {
            const rStart = Number(record.start_time);
            const rEnd = Number(record.end_time);
            if (!matches(rStart, rEnd, start, end)) continue;
            const overlap = Math.max(0, Math.min(end, rEnd) - Math.max(start, rStart));
            const length = Math.max(1, rEnd - rStart);
            total += (Number(record.energy) || 0) * (overlap / length);
          }
          if (total > 0) session.calories = Math.round(total / 1000);
        }
      }
    }
    const distanceTable = tableName(tables, distanceTableNames);
    if (distanceTable) {
      const cols = columnsFor(db, distanceTable);
      if (cols.has("start_time") && cols.has("end_time") && cols.has("distance")) {
        const records = db.prepare(`SELECT start_time, end_time, distance FROM ${JSON.stringify(distanceTable)}`).all();
        for (const session of sessions) {
          const start = Date.parse(session.start);
          const end = Date.parse(session.end);
          let total = 0;
          for (const record of records) {
            const rStart = Number(record.start_time);
            const rEnd = Number(record.end_time);
            if (!matches(rStart, rEnd, start, end)) continue;
            const overlap = Math.max(0, Math.min(end, rEnd) - Math.max(start, rStart));
            const length = Math.max(1, rEnd - rStart);
            total += (Number(record.distance) || 0) * (overlap / length);
          }
          if (total > 0) session.distanceM = Math.round(total);
        }
      }
    }
    return sessions;
  } finally {
    try { db?.close(); } catch {}
    await unlink(file).catch(() => {});
  }
}

function typeFromName(name) {
  const text = String(name || "").trim().toLowerCase();
  return TYPE_BY_NAME.get(text) ?? [...TYPE_BY_NAME.entries()].find(([key]) => key.includes(text) || text.includes(key))?.[1] ?? 0;
}

function jsonSessions(payload) {
  const out = [];
  const visit = (record, fallbackDate = null) => {
    if (!record || typeof record !== "object") return;
    if (Array.isArray(record.exercises)) {
      for (const exercise of record.exercises) visit(exercise, record.date || fallbackDate);
      return;
    }
    const start = record.start_time || record.start || record.startTime;
    const end = record.end_time || record.end || record.endTime;
    const minutes = record.duration_minutes ?? record.durationMinutes ?? record.minutes;
    const started = start ? new Date(start) : null;
    const ended = end ? new Date(end) : started && minutes != null ? new Date(started.getTime() + Number(minutes) * 60000) : null;
    const date = record.date || fallbackDate || (/^\d{4}-\d{2}-\d{2}/.exec(String(start))?.[0]) || (started && !Number.isNaN(started.getTime()) ? started.toISOString().slice(0, 10) : null);
    if (!started || Number.isNaN(started.getTime()) || !date) return;
    const typeName = record.exercise_type || record.exerciseType || record.activity || record.typeName;
    const type = Number.isFinite(Number(record.type)) && record.type !== null ? Number(record.type) : typeFromName(typeName);
    out.push(cleanSession({
      ...record,
      id: record.id || undefined,
      date,
      start: started.toISOString(),
      end: ended && !Number.isNaN(ended.getTime()) ? ended.toISOString() : started.toISOString(),
      startLocal: clockFromIso(start),
      endLocal: clockFromIso(end),
      minutes: minutes != null ? Number(minutes) : Math.round((((ended && !Number.isNaN(ended.getTime()) ? ended : started) - started) / 60000)),
      type,
      activity: record.activity || typeName || EXERCISE_TYPES[type] || "Unknown",
      title: record.title || record.name || "",
      notes: record.notes || "",
      sourceApp: record.sourceApp || record.source_app || record.app || "",
      device: record.device || "",
      averageBpm: record.averageBpm ?? record.avg_bpm ?? null,
      minBpm: record.minBpm ?? record.min_bpm ?? null,
      maxBpm: record.maxBpm ?? record.max_bpm ?? null,
      calories: record.calories ?? null,
      distanceM: record.distanceM ?? record.distance_m ?? null,
      sets: record.sets ?? null,
      reps: record.reps ?? null,
    }));
  };
  if (Array.isArray(payload)) for (const record of payload) visit(record);
  else if (Array.isArray(payload?.messages)) for (const record of payload.messages) visit(record);
  else if (Array.isArray(payload?.sessions)) for (const record of payload.sessions) visit(record);
  else if (payload && typeof payload === "object") visit(payload);
  return out.filter(Boolean);
}

function storeFile(dataDir) {
  return path.join(dataDir, "health-connect.json");
}

export async function readHealthStore(dataDir) {
  try {
    const store = JSON.parse(await readFile(storeFile(dataDir), "utf8"));
    if (!store || !Array.isArray(store.sessions)) return { version: STORE_VERSION, sessions: [] };
    return { ...store, version: STORE_VERSION, sessions: store.sessions.filter((session) => session && session.date && session.start) };
  } catch (err) {
    if (err.code === "ENOENT" || err instanceof SyntaxError) return { version: STORE_VERSION, sessions: [] };
    throw err;
  }
}

async function writeHealthStore(dataDir, store) {
  await mkdir(dataDir, { recursive: true });
  const file = storeFile(dataDir);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(store, null, 2) + "\n", "utf8");
  await rename(temp, file);
}

function mergeSessions(existing, incoming) {
  const byId = new Map(existing.map((session) => [session.id, session]));
  for (const session of incoming) byId.set(session.id, session);
  return [...byId.values()].sort((a, b) => sessionSort(b, a)).slice(0, MAX_SESSIONS);
}

export async function importHealthConnect(buffer, { filename = "", dataDir }) {
  if (!buffer || !buffer.length) throw httpError(400, "empty", "The file is empty.");
  const trimmed = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  let sessions = [];
  let format = "json";
  let replace = false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let payload;
    try {
      payload = JSON.parse(buffer.toString("utf8"));
    } catch {
      throw httpError(400, "invalid-json", "This JSON file could not be read.");
    }
    sessions = jsonSessions(payload);
    format = "json";
    replace = false;
    if (!sessions.length) throw httpError(400, "no-sessions", "No exercise sessions were found in this JSON file.");
  } else if (hasZipMagic(buffer)) {
    const db = unzipDatabase(buffer);
    sessions = await readSqlite(db, dataDir);
    format = "zip";
    replace = true;
    if (!sessions.length) throw httpError(400, "no-sessions", "No exercise sessions were found in this Health Connect export.");
  } else if (isSqlite(buffer)) {
    sessions = await readSqlite(buffer, dataDir);
    format = "db";
    replace = true;
    if (!sessions.length) throw httpError(400, "no-sessions", "No exercise sessions were found in this Health Connect export.");
  } else {
    throw httpError(400, "unknown-file", "Choose the Health Connect .zip or .db export, or a JSON export.");
  }
  const existing = replace ? [] : (await readHealthStore(dataDir)).sessions;
  const store = {
    version: STORE_VERSION,
    syncedAt: new Date().toISOString(),
    fileName: String(filename || "").slice(0, 300),
    format,
    replace,
    sessions: mergeSessions(existing, sessions),
  };
  await writeHealthStore(dataDir, store);
  return { ...store, imported: sessions.length };
}

export async function clearHealthStore(dataDir) {
  await unlink(storeFile(dataDir)).catch((err) => {
    if (err.code !== "ENOENT") throw err;
  });
}
