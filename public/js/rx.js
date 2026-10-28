// Reads a dose in any of the ten app languages: "3 × 8–10", "5 minutes",
// "2 × 20 à 30 s", "৪০ মিনিট". Shared by the logger and the voice builder so
// translated prescriptions still set the same numbers and timers.

import { normalizeDigits } from "./util.js";

const EACH_SIDE = /fiecare (?:parte|picior|braț|brat)|jede[rmn]? (?:seite|bein|arm)|ogni (?:lato|gamba|braccio)|chaque (?:côté|cote|jambe|bras)|cada (?:lado|pierna|brazo)|每(?:侧|边|条腿|只手臂)|प्रत्येक (?:पक्ष|तरफ)|हर (?:तरफ|पक्ष)|كل (?:جانب|جهة)|প্রতিটি (?:পাশ|পা)|প্রতি (?:পাশে|পায়ে)/i;
const SEC = "(?:s|sec(?:ond)?s?|secund[aăe]|sekunden?|secondes?|secondi|segundos?|秒|सेकंड|सेकण्ड|ثانية|ثانيتان|ثواني|ثوانٍ|ثوان|সেকেন্ড|সে|ق)";
const MIN = "(?:min(?:ute)?s?|minut(?:e|en|ul)?|minuten?|minuti|minutos?|分钟|分|मिनट|دقيقة|دقيقتان|دقائق|মিনিট)";
const REP = "(?:reps?|repetitions?|repet[aă]ri|repeticiones?|ripetizioni?|répétitions?|wiederholungen?|次数|次|个|圈|बार|घेरे|घेरा|प्रतिनिधि|تكرار|مرات|دوائر|বার|রেপ|বৃত্ত)";
const RANGE = String.raw`(?:\s*[–-]\s*|\s*(?:à|la|bis|até|hasta|de|do|至|到|से|إلى|إلی|থেকে)\s*|\s+(?:a|to|al)\s+)`;
const WEIGHT = String.raw`\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:kg|kgs|lb|lbs|কেজি|পাউন্ড|公斤|पाउंड|كجم|رطل)`;

const SEC_RE = new RegExp(`^${SEC}$`, "i");
const MIN_RE = new RegExp(`^${MIN}$`, "i");
const END = String.raw`(?=\s|$|[,;.)/@+،؛，。；、！？]|[\u4e00-\u9fff])`;
const REPS_RE = new RegExp(`(\\d+)(?:${RANGE}(\\d+))?\\s*(?:টি|টা)?\\s*(?:de\\s+)?(${REP})`, "i");
const SECONDS_RE = new RegExp(`(\\d+)(?:${RANGE}(\\d+))?\\s*(${SEC})${END}`, "i");
const MINUTES_RE = new RegExp(`(\\d+)(?:${RANGE}(\\d+))?\\s*(${MIN})${END}`, "i");
const SET_RE = new RegExp(`(\\d+)\\s*[×x]\\s*[（(]?\\s*(\\d+)(?:${RANGE}(\\d+))?\\s*(${SEC}|${MIN})?${END}`, "i");

export function parseRx(rx) {
  const raw = normalizeDigits(rx || "");
  const t = raw
    .replace(new RegExp(WEIGHT, "gi"), " ")
    // Machine translations of "90 s" in German and Italian; keep the spoken
    // packs unchanged, but read the dose as seconds.
    .replace(/\b(\d+)er Jahre\b/gi, "$1 s")
    .replace(/\b(\d+) anni\b/gi, "$1 s")
    .replace(/\bcéntimos\b/gi, "s");
  const out = { sets: 1, explicitSets: false, reps: "", seconds: null, minutes: null, perSide: /\/(?:side|leg|arm|parte|seite|côté|cote|lado|braț|braz|picior|bein|पक्ष|तरफ|جانب|পাশে|পা)/i.test(raw) || EACH_SIDE.test(raw), unit: "" };
  const m = SET_RE.exec(t);
  if (m) {
    out.sets = Number(m[1]);
    out.explicitSets = true;
    const unit = m[4] || "";
    if (SEC_RE.test(unit)) out.seconds = Number(m[3] || m[2]);
    else if (MIN_RE.test(unit)) out.minutes = Number(m[2]);
    else out.reps = m[3] ? `${m[2]}–${m[3]}` : m[2];
  } else {
    const r = REPS_RE.exec(t);
    if (r) out.reps = r[2] ? `${r[1]}–${r[2]}` : r[1];
    const s = SECONDS_RE.exec(t);
    if (s) out.seconds = Number(s[2] || s[1]);
    const mi = MINUTES_RE.exec(t);
    if (mi) out.minutes = Number(mi[1]);
    // Arabic uses dual forms without a digit: "two minutes" / "two seconds".
    if (out.minutes == null && /دقيقتان|دقيقتين/.test(raw)) out.minutes = 2;
    if (out.minutes == null && /دقيقة واحدة/.test(raw)) out.minutes = 1;
    if (out.seconds == null && /ثانيتان|ثانيتين/.test(raw)) out.seconds = 2;
    if (/fatigue|erm[üu]dung|fatica|fatiga|epuizare|疲劳|थकान|تعب|ক্লান্তি/i.test(raw)) out.reps = "max";
    else if (!out.reps && out.seconds == null && out.minutes == null) {
      // "10/leg", "10 forward", "3 circles" and "10 breaths" are rep counts too.
      const lead = /^\s*(?:≈\s*)?(\d+)(?:[.,]\d+)?(?:\s*[–-]\s*(\d+))?/.exec(raw);
      if (lead) out.reps = lead[2] ? `${lead[1]}–${lead[2]}` : lead[1];
    }
  }
  if (/breaths?|at[ae]mz[üu]ge|respira(?:tions?|zioni|ciones?)|呼吸|सांस|أنفاس|শ্বাস/i.test(raw)) out.unit = "breaths";
  else if (/circles?|cercles?|kreise|cerchi|c[íi]rculos|圈|चक्र|घेरे|घेरा|دوائر|বৃত্ত/i.test(raw)) out.unit = "circles";
  return out;
}
