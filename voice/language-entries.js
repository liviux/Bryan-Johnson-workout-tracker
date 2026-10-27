// Print every spoken clip for one language voice, as JSON, for the Edge TTS
// builder. Usage: node voice/language-entries.js de de_katja > entries.json
import { useCatalogue } from "../public/js/i18n.js";
import { voiceById } from "../public/js/voice/script.js";
import { buildSharedVoicePack } from "./service.js";

const [language, voiceId] = process.argv.slice(2);
const voice = voiceById(voiceId);
if (!language || !voice || voice.lang !== language || voice.engine !== "edge") {
  console.error("Usage: node voice/language-entries.js <language> <edge-voice-id>");
  process.exit(1);
}
const locale = (await import(`../public/js/locales/${language}.js`)).default;
useCatalogue(language, locale);
const entries = buildSharedVoicePack(voiceId).map((entry) => ({ id: entry.id, text: entry.text }));
process.stdout.write(JSON.stringify({ language, voice: voiceId, edge: voice.edge, entries }, null, 2) + "\n");
