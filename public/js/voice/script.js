// Shared by the browser and local server. Speech follows the displayed dose.
import { personalize } from "../personalize.js";
import { EXERCISES } from "../data/exercises.js";
import { language, t } from "../i18n.js";

export const VOICES = [
  { id: "af_heart", sid: 3, name: "Heart", detail: "American woman · warm", lang: "en", engine: "kokoro" },
  { id: "af_bella", sid: 2, name: "Bella", detail: "American woman · bright", lang: "en", engine: "kokoro" },
  { id: "am_michael", sid: 16, name: "Michael", detail: "American man · clear", lang: "en", engine: "kokoro" },
  { id: "am_puck", sid: 18, name: "Puck", detail: "American man · light", lang: "en", engine: "kokoro" },
  { id: "bf_emma", sid: 21, name: "Emma", detail: "British woman · steady", lang: "en", engine: "kokoro" },
];

// Each translated language ships with its own native coach voice. English keeps
// the five recorded voices above; these are generated from the same plan text
// by the language-pack workflow. One native voice per language keeps the
// download size reasonable.
export const LANGUAGE_VOICES = [
  { id: "ro_alina", sid: null, name: "Alina", detail: "Romanian woman · warm", lang: "ro", engine: "edge", edge: "ro-RO-AlinaNeural" },
  { id: "de_katja", sid: null, name: "Katja", detail: "German woman · clear", lang: "de", engine: "edge", edge: "de-DE-KatjaNeural" },
  { id: "it_elsa", sid: null, name: "Elsa", detail: "Italian woman · warm", lang: "it", engine: "edge", edge: "it-IT-ElsaNeural" },
  { id: "fr_denise", sid: null, name: "Denise", detail: "French woman · warm", lang: "fr", engine: "edge", edge: "fr-FR-DeniseNeural" },
  { id: "es_elvira", sid: null, name: "Elvira", detail: "Spanish woman · warm", lang: "es", engine: "edge", edge: "es-ES-ElviraNeural" },
  { id: "zh_xiaoxiao", sid: null, name: "晓晓", detail: "Chinese woman · warm", lang: "zh", engine: "edge", edge: "zh-CN-XiaoxiaoNeural" },
  { id: "hi_swara", sid: null, name: "Swara", detail: "Hindi woman · warm", lang: "hi", engine: "edge", edge: "hi-IN-SwaraNeural" },
  { id: "ar_zariyah", sid: null, name: "Zariyah", detail: "Arabic woman · warm", lang: "ar", engine: "edge", edge: "ar-SA-ZariyahNeural" },
  { id: "bn_nabanita", sid: null, name: "Nabanita", detail: "Bengali woman · warm", lang: "bn", engine: "edge", edge: "bn-BD-NabanitaNeural" },
];

export const ALL_VOICES = [...VOICES, ...LANGUAGE_VOICES];
export const DEFAULT_VOICE = "af_heart";

export function voicesForLanguage(lang = "en") {
  return ALL_VOICES.filter((voice) => voice.lang === lang);
}

export function voiceById(id) {
  return ALL_VOICES.find((voice) => voice.id === id) || null;
}
export const PREVIEW = "Set two of three. Ten repetitions, with a slow, controlled movement on the way down.";
export const EFFORT = ["Leave five or more easy reps in reserve.", "Leave about four good reps in reserve.", "Leave two or three good reps in reserve.", "Leave one or two good reps in reserve on the main lifts."];
export const CLOCK = {
  ten: "Ten seconds left. Get ready for the next step.",
  workTen: "You have ten seconds left on this timer.",
  thirty: "You have thirty seconds left on this timer.",
  minute: "You have one minute left on this timer.",
  halfway: "You are halfway through this part of the workout.",
  restEnd: "Rest is over. Continue when you are ready.",
  done: "This timer is complete. You can log it now.",
  finish: "Your workout is complete. You can record how it felt in your notes.",
};

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
export function numberWords(value) {
  const [whole, decimal] = String(value).split(".");
  const n = Number(whole);
  let words = n < 20 ? ONES[n] : n < 100 ? `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}` : n < 1000 ? `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ""}` : n < 1000000 ? `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ""}` : whole;
  if (decimal) words += ` point ${[...decimal].map((d) => ONES[Number(d)]).join(" ")}`;
  return words;
}

export function speechText(text, profile) {
  if (language() !== "en") return translatedSpeechText(text, profile);
  return englishSpeechText(text, profile);
}

function englishSpeechText(text, profile) {
  const shared = (text || "")
    .replace(/(\d+)\s*×\s*\{kg:[^}]+\}/g, "$1 weights at the weight shown on screen")
    .replace(/\{kg:[^}]+\}/g, "the weight shown on screen")
    .replace(/\{hr:[^}]+\}/g, "your prescribed heart-rate range");
  return personalize(shared, profile)
    .replace(/\{[^}]*\}/g, "")
    // A pair of weights is equipment, never another set prescription.
    .replace(/(\d+)\s*×\s*([\d.]+(?:[–-][\d.]+)?\s*(?:kg|lb))\b/g, "$1 weights of $2 each")
    .replace(/(\d+)\s*×\s*(\d+(?:[–-]\d+)?)(\s*(?:s\b|sec\b|min\b))?/g, (_, sets, reps, unit) => `${sets} ${sets === "1" ? "set" : "sets"} of ${reps}${unit || " reps"}`)
    .replace(/\/(side|leg|arm)\b/g, " each $1")
    .replace(/\bkg\b/g, "kilograms").replace(/\blb\b/g, "pounds")
    .replace(/\bbpm\b/g, "beats per minute").replace(/\bcm\b/g, "centimeters")
    .replace(/(\d)\s*in\b/g, "$1 inches")
    .replace(/\bmin\b/g, "minutes").replace(/\b(?:s|sec)\b/g, "seconds")
    .replace(/\bDB\b/gi, "dumbbell").replace(/\bRDL\b/g, "Romanian deadlift")
    .replace(/\bCARs\b/g, "controlled joint circles").replace(/\bROM\b/g, "range of motion")
    .replace(/\bATG\b/g, "A T G")
    .replace(/(\d)[–-](?=\d)/g, "$1 to ")
    .replace(/(\d)°/g, "$1 degrees").replace(/%/g, " percent")
    .replace(/[≈~]/g, "about ").replace(/@/g, " at ").replace(/\+/g, ", then ")
    .replace(/×/g, " by ").replace(/→/g, ", then ").replace(/[·;()/]/g, ", ")
    .replace(/[—–]/g, ", ").replace(/\b\d+(?:\.\d+)?\b/g, numberWords)
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/(?:,\s*)+/g, ", ").trim().replace(/,\s*$/, "");
}

function translatedSpeechText(text, profile) {
  const shared = (text || "")
    .replace(/(\d+)\s*×\s*\{kg:[^}]+\}/g, (_, count) => t("{count} weights at the weight shown on screen", { count }))
    .replace(/\{kg:[^}]+\}/g, t("the weight shown on screen"))
    .replace(/\{hr:[^}]+\}/g, t("your prescribed heart-rate range"));
  return personalize(shared, profile)
    .replace(/\{[^}]*\}/g, "")
    .replace(/(\d+)\s*×\s*([\d.]+(?:[–-][\d.]+)?\s*(?:kg|lb))\b/g, (_, count, weight) => t("{count} weights of {weight} each", { count, weight }))
    .replace(/(\d+)\s*×\s*(\d+(?:[–-]\d+)?)(\s*(?:s\b|sec\b|min\b))?/g, (_, sets, reps, unit) => t("{sets} sets of {reps}{unit}", { sets, reps, unit: unit || ` ${t("reps")}` }))
    .replace(/\/(side|leg|arm)\b/g, (_, side) => ` ${t("each {side}", { side: t(side) })}`)
    .replace(/\breps?\b/gi, t("reps")).replace(/\bsets?\b/gi, t("sets"))
    .replace(/\bside\b/gi, t("side")).replace(/\barm\b/gi, t("arm")).replace(/\bleg\b/gi, t("leg"))
    .replace(/\bkg\b/g, t("kilograms")).replace(/\blb\b/g, t("pounds"))
    .replace(/\bbpm\b/g, t("beats per minute")).replace(/\bcm\b/g, t("centimeters"))
    .replace(/(\d)\s*in\b/g, (_, n) => t("{count} inches", { count: n }))
    .replace(/\bmin\b/g, t("minutes")).replace(/\b(?:s|sec)\b/g, t("seconds"))
    .replace(/\bDB\b/gi, t("dumbbell")).replace(/\bRDL\b/g, t("Romanian deadlift"))
    .replace(/\bCARs\b/g, t("controlled joint circles")).replace(/\bROM\b/g, t("range of motion"))
    .replace(/\bATG\b/g, "A T G")
    .replace(/(\d)[–-](?=\d)/g, (_, n) => t("{value} to ", { value: n }))
    .replace(/(\d)°/g, (_, n) => t("{count} degrees", { count: n })).replace(/%/g, ` ${t("percent")}`)
    .replace(/[≈~]/g, ` ${t("about")} `).replace(/@/g, ` ${t("using")} `).replace(/\+/g, `, ${t("then")} `)
    .replace(/×/g, ` ${t("by")} `).replace(/→/g, `, ${t("then")} `).replace(/[·;()/]/g, ", ")
    .replace(/[—–]/g, ", ")
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/(?:,\s*)+/g, ", ").trim().replace(/,\s*$/, "");
}

export function durationText(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (language() !== "en") {
    return [mins ? (mins === 1 ? t("1 minute") : t("{count} minutes", { count: mins })) : "", secs ? (secs === 1 ? t("1 second") : t("{count} seconds", { count: secs })) : ""].filter(Boolean).join(` ${t("and")} `);
  }
  return [mins ? `${numberWords(mins)} ${mins === 1 ? "minute" : "minutes"}` : "", secs ? `${numberWords(secs)} ${secs === 1 ? "second" : "seconds"}` : ""].filter(Boolean).join(" and ");
}

export function durationParts(seconds) {
  const mins = Math.floor(seconds / 60), secs = seconds % 60;
  if (language() !== "en") {
    return [mins ? (mins === 1 ? t("1 minute") : t("{count} minutes", { count: mins })) : "", mins && secs ? t("and") : "", secs ? (secs === 1 ? t("1 second") : t("{count} seconds", { count: secs })) : ""].filter(Boolean);
  }
  return [mins ? `${numberWords(mins)} ${mins === 1 ? "minute" : "minutes"}` : "", mins && secs ? "and" : "", secs ? `${numberWords(secs)} ${secs === 1 ? "second" : "seconds"}` : ""].filter(Boolean);
}

export function restLine(seconds) {
  return t("Rest for {duration}. Continue when you are ready.", { duration: durationText(seconds) });
}

function levelText(text, level) {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    if (/^At Returning and above/i.test(sentence)) return level >= 1;
    if (/^At New to training and Returning/i.test(sentence)) return level <= 1;
    if (/^At Returning\b/i.test(sentence)) return level === 1;
    if (/^At higher levels/i.test(sentence)) return level > 1;
    if (/^At Active\b/i.test(sentence)) return level === 2;
    if (/^(?:At )?Well trained\b/i.test(sentence)) return level === 3;
    const tag = sentence.match(/\((Returning|Active|Well trained)\):/);
    return !tag || ["", "Returning", "Active", "Well trained"][level] === tag[1];
  }).join(" ").replace(/^At (?:Returning and above|New to training and Returning|Returning|higher levels|Active|Well trained),?\s*/i, "").replace(/\((Returning|Active|Well trained)\):/g, ":");
}

// Keep clips short enough for the model and for the gap before a timer warning.
export function sentences(text) {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((s) => s.trim()).filter(Boolean)
    .flatMap((s) => s.length <= 280 ? [s] : s.split(/,\s+/)).filter(Boolean);
}

export function exerciseScript({ item, rx, profile, level, easier = false }) {
  const ex = EXERCISES[item.ex];
  const clean = (s) => speechText(levelText(s, level), profile);
  const name = speechText((item.label || ex.name).replace(/4\s*×\s*4/g, "four by four"), profile);
  const dose = speechText(rx, profile);
  const how = easier ? [] : (ex.how || []).map(clean).filter(Boolean).flatMap(sentences);
  const safety = [...new Set([...(ex.tips || []), ...(ex.how || [])].filter((s) => /\bstop\b|\bpain\b|dizziness|tingling/i.test(s)).map(clean).filter(Boolean).flatMap(sentences))];
  const match = /^(\d+)\s*×\s*(\d+(?:[–-]\d+)?)(\s*(?:s\b|min\b))?(\/(?:side|leg|arm))?/.exec(personalize(rx || "", profile));
  const setCount = match ? Number(match[1]) : null;
  const setDose = match ? speechText(`${match[2]}${match[3] || " reps"}${match[4] || ""}`, profile) : "";
  const sets = setCount ? Array.from({ length: setCount }, (_, index) => language() === "en" ? `Set ${numberWords(index + 1)} of ${numberWords(setCount)}. ${setDose}.` : `${t("Set {set} of {sets}.", { set: index + 1, sets: setCount })} ${setDose}.`) : [];
  const intro = `${name}. ${dose}.`;
  return { name, intro: intro.length <= 280 ? [intro] : sentences(intro), safety, how, sets, setCount };
}

export function phaseLine(phase, type = "intervals", profile) {
  const duration = durationText(phase.sec);
  if (phase.kind === "ready") return t("Get ready. Your timer will start in a few seconds.");
  if (type === "hold") return phase.kind === "rest" ? t("Change sides. Get into position for the other side.") : t("{label}. {duration}. Breathe steadily throughout the hold.", { label: phase.label, duration });
  const name = phase.ex ? `${speechText(EXERCISES[phase.ex].name, profile)}. ` : "";
  const hr = phase.sec > 30 && phase.sub ? `${speechText(phase.sub, profile)}.` : "";
  if (type === "countdown") return `${speechText(phase.label, profile)}. ${duration}. ${hr}`.trim();
  if (phase.kind === "rest") return `${t("Recover with easy marching.")} ${duration}. ${hr}`.trim();
  return `${name}${phase.round ? (language() === "en" ? `Round ${numberWords(phase.round)} of ${numberWords(phase.total)}. ` : `${t("Round {round} of {total}.", { round: phase.round, total: phase.total })} `) : ""}${duration}. ${hr}`.trim();
}

export function clockKey(seconds, left, kind) {
  if (left === 10 && seconds >= 30) return kind === "rest" ? "ten" : "workTen";
  if (left === 30 && seconds >= 60 && kind === "work") return "thirty";
  if (left === 60 && seconds >= 180 && kind === "work") return "minute";
  if (left === Math.round(seconds / 2) && seconds >= 120 && kind === "work") return "halfway";
  return null;
}
