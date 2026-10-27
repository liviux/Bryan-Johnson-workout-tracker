import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LANGUAGES, useCatalogue } from "../public/js/i18n.js";
import { voicesForLanguage } from "../public/js/voice/script.js";
import { readBundle } from "../voice/bundles.js";
import { buildSharedVoicePack } from "../voice/service.js";

const dir = fileURLToPath(new URL("../voice/packs/", import.meta.url));

for (const language of LANGUAGES.filter((entry) => entry.id !== "en")) {
  test(`${language.name}: published clips match every translated instruction`, async () => {
    const catalogue = (await import(`../public/js/locales/${language.id}.js`)).default;
    useCatalogue(language.id, catalogue);
    const voice = voicesForLanguage(language.id)[0];
    const metadata = await readBundle(voice.id, dir);
    assert.equal(metadata.ext, "mp3");
    assert.equal(metadata.mime, "audio/mpeg");
    const expected = new Map(buildSharedVoicePack(voice.id).map((entry) => [entry.id, entry.text]));
    assert.deepEqual(metadata.clips.map((clip) => clip.id).sort(), [...expected.keys()].sort(), "Rebuild the language pack after editing spoken content");
    assert.deepEqual((await readdir(path.join(dir, voice.id))).sort(), metadata.clips.map((clip) => `${clip.id}.mp3.gz`).sort());
    for (let start = 0; start < metadata.clips.length; start += 32) {
      await Promise.all(metadata.clips.slice(start, start + 32).map(async (clip) => {
        assert.equal(clip.text, expected.get(clip.id), "Shared audio must use only the public script");
        assert.equal((await stat(path.join(dir, voice.id, `${clip.id}.mp3.gz`))).size, clip.bytes);
      }));
    }
  });
}
