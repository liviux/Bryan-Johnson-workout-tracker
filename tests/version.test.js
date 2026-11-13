import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("a running server reports the installed version after an update", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "workout-version-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await copyFile(new URL("../server.js", import.meta.url), path.join(root, "server.mjs"));
  await copyFile(new URL("../health-connect.js", import.meta.url), path.join(root, "health-connect.js"));
  await mkdir(path.join(root, "public"));
  const release = async (version) => {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ version }));
    await writeFile(path.join(root, "CHANGELOG.md"), `# Changelog\n\n## [${version}] - 2026-10-18\n`);
  };
  await release("1.21.1");
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, [path.join(root, "server.mjs")], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: path.join(root, "data") }, stdio: "ignore",
  });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  t.after(async () => { child.kill(); await exited; });
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url + "/api/info")).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.ok(ready, "test server did not start");
  assert.equal((await (await fetch(url + "/api/info")).json()).version, "1.21.1");
  await release("1.24.4");
  const info = await fetch(url + "/api/info");
  assert.equal(info.headers.get("cache-control"), "no-store");
  assert.equal((await info.json()).version, "1.24.4");
  assert.match(await (await fetch(url + "/api/changelog")).text(), /\[1\.24\.4\]/);
  assert.equal((await (await fetch(url + "/api/export")).json()).version, "1.24.4");
});
