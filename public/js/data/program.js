import { localized } from "../i18n.js";
import { splitItems } from "./split-items.js";

// The weekly program: the six training days and their doses per training level.
// rx and mins arrays are [New to training, Returning, Active, Well trained] (the
// order of LEVELS in personalize.js); "—" means skip it at that level.
// Item ids are stable keys for your logs; change them only with care.
// Separate Zone 2 top-ups preserve the implied durations of older logs.

export const PROGRAM = localized({
  name: "Home program inspired by Bryan Johnson",
  version: "v2 · October 2026",
  summary: "Train strength on Monday, Wednesday and Friday, do short intervals on Tuesday and the Norwegian 4×4 on Thursday, then mixed cardio on Saturday. Rest on Sunday. Zone 2 and controlled vigorous blocks build toward Bryan Johnson's weekly cardio targets. His public protocol is adapted here for bodyweight, adjustable dumbbells, a pull-up bar and bands.",
});

// What each training level means for the workouts, in the same order as LEVELS in
// personalize.js. Your level alone decides the doses; change it in Settings.
export const LEVEL_PLANS = localized([
  {
    id: "new",
    effort: "Effort 4–5 out of 10: stop each set with 5 or more easy reps left.",
    points: [
      "Start with 1–2 sets. Use a chair or wall for support, or a smaller range of motion, while you learn the positions.",
      "No jumps, swings, power skips or Nordics yet; hops stay tiny.",
      "Tuesday: 4 brisk 20 s bursts. Thursday: 2 rounds of 2 min brisk, well below all-out.",
      "60 min of scheduled Zone 2 a week across five days. Intervals stay brisk, below vigorous effort. Mild muscle soreness is normal; joint pain is not.",
    ],
    moveUp: "Move up to Returning after about 3 weeks (around 18 sessions) when every session feels comfortable and nothing hurts the next day.",
    readiness: {
      weeks: 3,
      sessions: 18,
      next: "returning",
      questions: [
        { id: "comfortable", label: "Every session felt comfortable", detail: "You finished each one without needing to stop early." },
        { id: "no-pain", label: "Nothing hurt the next day", detail: "No joint pain or soreness that lasted past the day after." },
      ],
    },
  },
  {
    id: "returning",
    effort: "Effort 5–6 out of 10: stop each set with about 4 good reps left.",
    points: [
      "2 sets on main lifts, 1 set on Bryan’s high-rep accessories. Relearn the positions.",
      "Practise landings with snap-downs before starting jumps. For Nordics, do only the slow lowering part.",
      "Tuesday: brisk 20 s bursts with long recoveries. Thursday: 2 controlled rounds of 3 min, building to 3 rounds.",
      "90 min of scheduled Zone 2 and about 26 min of vigorous work a week. Some muscle soreness is expected; joint pain is not. Still sore after 48 hours? Repeat sessions before moving up.",
    ],
    moveUp: "Move up to Active after about 2 weeks (around 12 sessions) when you reach the top of every rep range with clean form and soreness is gone within a day.",
    readiness: {
      weeks: 2,
      sessions: 12,
      next: "active",
      questions: [
        { id: "top-range", label: "You reached the top of every rep range", detail: "On every set, with clean form." },
        { id: "recovered", label: "Soreness was gone within a day", detail: "No soreness still there the next day." },
      ],
    },
  },
  {
    id: "active",
    effort: "Effort about 7 out of 10: 2–3 reps left in each set.",
    points: [
      "Do 3 sets for most strength exercises. Start jumping and hold each landing steady.",
      "Tuesday: 8 × 20 s hard. Thursday: 3 rounds of 4 min, then 4.",
      "At least 120 min of scheduled Zone 2 and about 51 min of hard cardio a week; controlled vigorous blocks on Tuesday, Thursday and Saturday.",
    ],
    moveUp: "Move up to Well trained after about 4 weeks (around 24 sessions) when 4 rounds of the 4×4 stay controlled and your weights keep going up.",
    readiness: {
      weeks: 4,
      sessions: 24,
      next: "trained",
      questions: [
        { id: "four-by-four", label: "Four rounds of the 4×4 stayed controlled", detail: "You held the pace in the last round." },
        { id: "progressing", label: "Your weights kept going up", detail: "The main lifts kept moving forward." },
      ],
    },
  },
  {
    id: "trained",
    effort: "Effort 8 out of 10 on the main lifts (1–2 reps left); Bryan’s 1 × 25-style accessories go close to fatigue.",
    points: [
      "Use Galpin-style heavy work for the main lifts and follow Friday’s RDL sets with jumps.",
      "Tuesday: two blocks of 8 × 20 s all-out. Thursday: the full Norwegian 4×4 at {hr:85-95}.",
      "150 min of scheduled Zone 2 and about 75 min of hard cardio a week, including 18 controlled vigorous minutes on Tue/Thu/Sat. A weighted vest is optional for Zone 2.",
    ],
    moveUp: "Keep adding weight using the rules below. After illness, injury or a long break, step down a level for a while.",
  },
]);

export const RULES = localized([
  "Add weight only when you hit the top of the rep range on every set with clean form, two sessions in a row: about +{kg:1-2} per dumbbell for upper body, +{kg:2-4} for legs. Bryan’s protocol stresses progressive overload: increase the load gradually.",
  "Bryan puts injury prevention first. If a joint hurts, open the exercise and switch to its easier version.",
  "The 4×4 is hard but controlled. If you can’t hold the pace in the last round, start slower next time.",
  "During a week of poor sleep, stress or sickness, repeat sessions or step down a level for a while.",
  "If you have been inactive for a while, are over 50 or have any heart condition, get a basic check-up (blood pressure, resting ECG) before your first all-out intervals.",
]);

// Heart-rate zones as % of max heart rate; bpm are computed from the user's profile.
export const ZONES = localized([
  { zone: "Zone 1", pct: [50, 60], feel: "Very easy: warm-ups, easy walking" },
  { zone: "Zone 2", pct: [60, 70], feel: "You can speak in full sentences: Bryan’s 150 min/week" },
  { zone: "Zone 3", pct: [70, 80], feel: "Short phrases only" },
  { zone: "Zone 4", pct: [80, 90], feel: "Hard; a few words" },
  {
    zone: "Zone 5",
    pct: [90, 100],
    feel: "You cannot talk: the end of 20 s bursts and each 4×4 round",
  },
]);

export const DAYS = localized([
  {
    key: "mon",
    name: "Monday",
    short: "Mon",
    tag: "Lift A",
    title: "Strength A · Squat, push, pull + knees",
    focus: "Day 1 of Bryan’s template (squat, push-up, row, swing, plank) with his Knees-Over-Toes step-up, tibialis and calf work, and a few jumps from his 2026 training.",
    blocks: [
      {
        name: "Warm-up",
        mins: [8, 9, 9, 10],
        note: "Start with a few minutes of easy movement, then dynamic exercises, as in Bryan’s official warm-up. Hops and balance come from his bone protocol and five exercise pillars.",
        items: [
          {
            id: "mon-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "1–2 min, bodyweight, slow",
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "mon-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series, slow", "≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "mon-warm-up-pogo",
            ex: "pogo",
            rx: ["1 × 10, very low", "2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "mon-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 20 s/leg, hand near a wall",
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Jumps",
        mins: [0, 3, 4, 4],
        note: "Give each jump your best effort and rest 45–60 s. Stop the set if landings get loud.",
        items: [
          {
            id: "mon-jumps-jumps",
            ex: "jumps",
            label: "Jumps",
            rx: [
              "—",
              "Snap-downs 2 × 5",
              "Squat jumps 3 × 3, stick each landing",
              "Countermovement jumps 3 × 3, stick each landing",
            ],
            bryan: "Bryan 2026: jumps for fast-twitch power",
          },
        ],
      },
      {
        name: "Strength",
        mins: [18, 22, 28, 30],
        note: "Rest 60–90 s between sets. Pair push-ups with rows to save time.",
        items: [
          {
            id: "mon-strength-gobletsquat",
            ex: "gobletsquat",
            rx: [
              "2 × 8 @ {kg:10-14}, down to a chair, 3 s down",
              "2 × 10 @ {kg:10-14}, 3 s down",
              "3 × 8–10 @ {kg:14-20}",
              "3 × 6–8, heaviest dumbbell, 3 s down",
            ],
            bryan: "Official 3 × 10–15; Bryan 2 × 5–8",
          },
          {
            id: "mon-strength-pushup",
            ex: "pushup",
            rx: ["2 × 6–8, hands on a table or a wall", "3 × 8–10, hands raised if needed", "3 × 10–12", "3 × 12–15, 3 s down, or feet raised"],
            bryan: "Official: 3 × 8–12",
          },
          {
            id: "mon-strength-row",
            ex: "row",
            rx: ["2 × 10/side @ {kg:14-16}", "2 × 10/side @ {kg:14-16}", "3 × 10/side @ {kg:18-20}", "3 × 8–10/side, heaviest dumbbell"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "mon-strength-poliquin",
            ex: "poliquin",
            rx: [
              "1 × 8/leg, slant board on floor",
              "2 × 10/leg, slant board on floor",
              "3 × 10/leg",
              "3 × 10/leg, slant board, optionally holding 2 × {kg:6-8}",
            ],
            bryan: "Bryan: 3 × 10/leg",
          },
          {
            id: "mon-strength-swing",
            ex: "swing",
            rx: ["—", "2 × 10 @ {kg:12-16}", "3 × 12 @ {kg:16-20}", "3 × 15 @ {kg:20-24}"],
            bryan: "Official: 3 × 30 s",
          },
        ],
      },
      {
        name: "Core & knees",
        mins: [5, 6, 8, 8],
        note: "Move from one exercise to the next with little rest.",
        items: [
          {
            id: "mon-core-knees-tibraise",
            ex: "tibraise",
            rx: ["1 × 12–15", "1 × 15–20", "1 × 25", "1 × 25 + 1 × 10/leg single-leg"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "mon-core-knees-calf",
            ex: "calf",
            label: "Seated dumbbell calf raise",
            rx: ["1 × 12 @ 2 × {kg:10}", "1 × 15 @ 2 × {kg:10}", "1 × 20 @ 2 × {kg:14}", "1 × 25 @ 2 × {kg:16-20}"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "mon-core-knees-plank",
            ex: "plank",
            rx: ["2 × 15–20 s, knees down is fine", "2 × 20–30 s", "3 × 30 s", "3 × 45 s"],
            bryan: "Official: 3 × 20–30 s",
          },
          {
            id: "mon-core-knees-legraise",
            ex: "legraise",
            rx: [
              "2 × 5 knee raises, small range",
              "2 × 8 knee raises",
              "2 × 12 knee raises",
              "Straight legs: 30–50 reps in as few sets as possible",
            ],
            bryan: "Bryan: 1 × 50",
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [5, 10, 15, 25],
        items: [
          {
            id: "mon-zone-2-zone2",
            ex: "zone2",
            label: "Step-ups or marching at {hr:60-70}",
            rx: ["—", "—", "8 min", "10 min"],
            bryan: "Official Day 1 adds 25 min",
          },
          {
            id: "mon-zone-2-topup",
            ex: "zone2",
            label: "Scheduled Zone 2 · additional minutes",
            rx: ["5 min @ {hr:60-70}", "10 min @ {hr:60-70}", "7 min @ {hr:60-70}", "15 min @ {hr:60-70}"],
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "mon-cool-down-couch", ex: "couch", rx: ["30 s/side, gentle", "30 s/side", "30 s/side", "45 s/side"] },
          { id: "mon-cool-down-shin", ex: "shin", rx: ["20–30 s", "30 s", "30 s", "30 s"] },
        ],
      },
    ],
  },
  {
    key: "tue",
    name: "Tuesday",
    short: "Tue",
    tag: "Bursts",
    title: "Intervals 1 · 20-second bursts + Zone 2 + back & core",
    focus: "Follow Bryan’s Tuesday template with short, hard bursts and steady Zone 2. Finish with his back and oblique exercises and the Pallof press from his Galpin session.",
    blocks: [
      {
        name: "Warm-up",
        mins: [8, 9, 9, 10],
        note: "Start with a few minutes of easy movement, then dynamic exercises, as in Bryan’s official warm-up. Hops and balance come from his bone protocol and five exercise pillars.",
        items: [
          {
            id: "tue-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "1–2 min, bodyweight, slow",
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "tue-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series, slow", "≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "tue-warm-up-pogo",
            ex: "pogo",
            rx: ["1 × 10, very low", "2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "tue-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 20 s/leg, hand near a wall",
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Short intervals",
        mins: [5, 7, 9, 14],
        note: "Choose from the indoor interval moves. Each has a quieter version.",
        items: [
          {
            id: "tue-short-intervals-shortint",
            ex: "shortint",
            rx: [
              "4 × (20 s brisk / 40 s easy)",
              "6 × (20 s brisk / 40 s easy)",
              "8 × (20 s hard / 40 s easy)",
              "2 × [8 × (20 s all-out / 20 s easy)], 3 min easy between",
            ],
            bryan: "Newest template: 8 × 20 s",
            timer: [
              [{ label: "4 rounds", rounds: 4, work: 20, rest: 40, workHr: [70, 80] }],
              [{ label: "6 rounds", rounds: 6, work: 20, rest: 40 }],
              [{ label: "8 rounds", rounds: 8, work: 20, rest: 40 }],
              [{ label: "2 blocks of 8", blocks: 2, rounds: 8, work: 20, rest: 20, blockRest: 180 }],
            ],
          },
          {
            id: "tue-short-intervals-indoorhiit",
            ex: "indoorhiit",
            label: "Moves: step-ups, high knees, climbers, jacks, burpees",
            rx: ["Pick 1, the quiet version", "Pick 1–2", "Pick 2", "Pick 2–3"],
          },
        ],
      },
      {
        name: "Controlled vigorous cardio",
        mins: [0, 6, 12, 18],
        note: "This block builds toward Bryan’s 75 min/week of vigorous cardio. Keep the effort controlled and below all-out. Log only vigorous minutes; allow extra time for recoveries.",
        items: [
          {
            id: "tue-vigorous-cardio",
            ex: "vigorous",
            rx: ["—", "6 min @ {hr:80-85}", "12 min @ {hr:80-90}", "18 min @ {hr:80-90}"],
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [15, 20, 25, 30],
        items: [
          {
            id: "tue-zone-2-zone2",
            ex: "zone2",
            rx: ["15 min @ {hr:60-70}", "20 min @ {hr:60-70}", "25–30 min", "30 min"],
            bryan: "Bryan: 150 min/week",
          },
        ],
      },
      {
        name: "Back & core",
        mins: [5, 6, 8, 9],
        items: [
          {
            id: "tue-back-core-backext",
            ex: "backext",
            rx: ["1 × 10, 2 s hold at top", "1 × 12, 2 s hold at top", "1 × 20", "1 × 25, holding {kg:5-10} when easy"],
            bryan: "Bryan: 1 × 25 + 20 kg plate",
          },
          {
            id: "tue-back-core-sidebend",
            ex: "sidebend",
            rx: ["1 × 10/side @ {kg:10-12}", "1 × 12/side @ {kg:10-12}", "1 × 20/side", "1 × 25/side @ {kg:16-20}"],
            bryan: "Bryan: 1 × 25",
          },
          {
            id: "tue-back-core-pallof",
            ex: "pallof",
            rx: ["2 × 6/side, 2 s hold", "2 × 8/side, 2 s hold", "2 × 10/side", "2 × 12/side, 3 s hold"],
            bryan: "Bryan 2025 (Galpin)",
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "tue-cool-down-hipflexor", ex: "hipflexor", rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"] },
          { id: "tue-cool-down-hamstring", ex: "hamstring", rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"] },
        ],
      },
    ],
  },
  {
    key: "wed",
    name: "Wednesday",
    short: "Wed",
    tag: "Lift B",
    title: "Strength B · Pull, knees & mobility",
    focus: "Bryan’s mobility and strength exercises, including pulling, Knees-Over-Toes work and high-rep arm work, followed by Zone 2 toward his weekly target. This is the first of two posture strength days.",
    blocks: [
      {
        name: "Dynamic mobility",
        mins: 10,
        note: "Bryan’s official list: arm circles, wall slides, thread the needle, hip CARs.",
        items: [
          { id: "wed-dynamic-mobility-backwalk", ex: "backwalk", rx: ["2 min", "2 min", "2 min", "2 min"] },
          {
            id: "wed-dynamic-mobility-dynamic",
            ex: "dynamic",
            label: "Arm circles + hip CARs",
            rx: ["2 min", "2 min", "2 min", "2 min"],
          },
          { id: "wed-dynamic-mobility-wallslide", ex: "wallslide", rx: ["1 × 8", "1 × 10", "1 × 10", "1 × 10"] },
          { id: "wed-dynamic-mobility-thread", ex: "thread", rx: ["5/side", "5/side", "5/side", "5/side"] },
          { id: "wed-dynamic-mobility-pogo", ex: "pogo", rx: ["1 × 10, very low", "2 × 10", "2 × 20", "2 × 20"] },
        ],
      },
      {
        name: "Strength",
        mins: [20, 24, 28, 30],
        note: "Rest 60–90 s between sets for the first three exercises, then 30–45 s for the rest.",
        items: [
          {
            id: "wed-strength-chinup",
            ex: "chinup",
            label: "Pull-ups (palms away)",
            rx: ["3 × 10–20 s dead hang, or 2 × 3 band-assisted", "3 × 3–5 band-assisted or 5 s negatives", "3 × 5–6", "3 × 6–8; add a loaded backpack at 3 × 8"],
            bryan: "Bryan 2025: 2 × 5–8",
          },
          {
            id: "wed-strength-atg",
            ex: "atg",
            rx: ["2 × 5/leg, part range, hand on a chair", "2 × 6/leg, hand on a chair", "3 × 8/leg, full depth", "3 × 8–10/leg holding 2 × {kg:8-14}"],
            bryan: "Bryan: 3 × 10",
          },
          {
            id: "wed-strength-nordic",
            ex: "nordic",
            rx: ["—", "2 × 3–4 slow lowers", "2 × 4–6", "2 × 5–8"],
            bryan: "Bryan: 1 × 10 → 2 × 5–8",
          },
          {
            id: "wed-strength-revnordic",
            ex: "revnordic",
            rx: ["1 × 5, small range", "1 × 6, small range", "1 × 8–10", "1 × 10, full range"],
            bryan: "Bryan: 1 × 10",
          },
          {
            id: "wed-strength-triceps",
            ex: "triceps",
            rx: ["1 × 12 @ {kg:4}", "1 × 15 @ {kg:4}", "1 × 20 @ {kg:4.5}", "1 × 25 @ {kg:4.5-6}, 1 s hold at top"],
            bryan: "Bryan: 1 × 25 @ 4.5 kg",
          },
          {
            id: "wed-strength-curl",
            ex: "curl",
            rx: ["1 × 10 @ {kg:6-8}", "1 × 12 @ {kg:6-8}", "1 × 15 @ {kg:8}", "1 × 15–20 @ {kg:8-10}"],
            bryan: "On Bryan’s list",
          },
          {
            id: "wed-strength-fly",
            ex: "fly",
            rx: ["1 × 12, light band", "1 × 15, light band", "1 × 15", "1 × 15, 1 s squeeze"],
            bryan: "Bryan: 1 × 15",
          },
          {
            id: "wed-strength-farmer",
            ex: "farmer",
            rx: ["2 × 20 s @ 2 × {kg:12-16}", "2 × 30 s @ 2 × {kg:12-16}", "3 × 30 s @ 2 × {kg:18-20}", "3 × 40 s, heaviest pair"],
            bryan: "Official: 3 × 30 s",
          },
        ],
      },
      {
        name: "Beginner yoga & balance",
        mins: 10,
        note: "Bryan’s official yoga block includes cat-cow, cobbler’s pose, tree pose and cobra. Stay longer when you have time; his version lasts 15 min.",
        items: [
          {
            id: "wed-beginner-yoga-balance-catcow",
            ex: "catcow",
            rx: ["10 breaths", "10 breaths", "10 breaths", "10 breaths"],
          },
          { id: "wed-beginner-yoga-balance-butterfly", ex: "butterfly", rx: ["45 s", "60 s", "90 s", "90 s"] },
          {
            id: "wed-beginner-yoga-balance-tree",
            ex: "tree",
            rx: ["2 × 20 s/side, hand near a wall", "2 × 30 s/side", "2 × 30 s/side", "2 × 30 s/side, eyes closed"],
          },
          {
            id: "wed-beginner-yoga-balance-balance",
            ex: "balance",
            rx: [
              "2 × 20 s/leg, hand near a wall",
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
          { id: "wed-beginner-yoga-balance-cobra", ex: "cobra", rx: ["3 × 10 s", "3 × 15 s", "3 × 20 s", "3 × 20 s"] },
        ],
      },
      {
        name: "Zone 2",
        mins: [5, 10, 15, 25],
        note: "This cardio counts toward Bryan’s 150 min/week target. Outdoor activity is optional.",
        items: [{ id: "wed-zone-2-zone2", ex: "zone2", rx: ["5 min @ {hr:60-70}", "10 min @ {hr:60-70}", "15 min @ {hr:60-70}", "25 min @ {hr:60-70}"] }],
      },
      {
        name: "Static stretching",
        mins: 5,
        items: [
          { id: "wed-static-stretching-couch", ex: "couch", rx: ["30 s/side", "45 s/side", "45 s/side", "45 s/side"] },
          {
            id: "wed-static-stretching-hamstring",
            ex: "hamstring",
            rx: ["30 s/side", "45 s/side", "45 s/side", "45 s/side"],
          },
          { id: "wed-static-stretching-bigtoe", ex: "bigtoe", rx: ["20–30 s", "30 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "thu",
    name: "Thursday",
    short: "Thu",
    tag: "4×4",
    title: "Intervals 2 · Norwegian 4×4 + stability",
    focus: "Do Bryan’s Thursday Norwegian 4×4 indoors, then the stability exercises from his official protocol.",
    blocks: [
      {
        name: "Warm-up",
        mins: 10,
        items: [
          {
            id: "thu-warm-up-zone2",
            ex: "zone2",
            label: "Easy step-ups or marching, building to {hr:~71}",
            intensity: "light",
            rx: ["8 min", "8 min", "8 min", "8 min"],
          },
          {
            id: "thu-warm-up-dynamic",
            ex: "dynamic",
            label: "Leg swings + hip CARs",
            rx: ["2 min", "2 min", "2 min", "2 min"],
          },
        ],
      },
      {
        name: "Norwegian 4×4",
        mins: [12, 15, 25, 25],
        note: "Keep a hard, controlled pace. Change the indoor move every minute.",
        items: [
          {
            id: "thu-norwegian-4-4-norwegian",
            ex: "norwegian",
            rx: [
              "2 × (2 min brisk @ {hr:75-80} / 3 min easy)",
              "2 rounds, then 3, of (3 min @ {hr:80-85} / 3 min easy)",
              "3 × (4 min / 3 min), then 4 × (4 min / 3 min) @ {hr:82-91}",
              "4 × (4 min @ {hr:85-95} / 3 min @ {hr:60-70})",
            ],
            bryan: "Newest template: Thursday",
            timer: [
              [{ label: "2 rounds", rounds: 2, work: 120, rest: 180, workHr: [75, 80], restHr: [60, 70] }],
              [
                {
                  label: "2 rounds",
                  rounds: 2,
                  work: 180,
                  rest: 180,
                  workHr: [80, 85],
                  restHr: [60, 70],
                },
                {
                  label: "3 rounds",
                  rounds: 3,
                  work: 180,
                  rest: 180,
                  workHr: [80, 85],
                  restHr: [60, 70],
                },
              ],
              [
                {
                  label: "3 rounds",
                  rounds: 3,
                  work: 240,
                  rest: 180,
                  workHr: [82, 91],
                  restHr: [60, 70],
                },
                {
                  label: "4 rounds",
                  rounds: 4,
                  work: 240,
                  rest: 180,
                  workHr: [82, 91],
                  restHr: [60, 70],
                },
              ],
              [{ label: "4 rounds", rounds: 4, work: 240, rest: 180, workHr: [85, 95], restHr: [60, 70] }],
            ],
          },
          {
            id: "thu-norwegian-4-4-indoorhiit",
            ex: "indoorhiit",
            label: "Moves: step-ups → high knees → jacks → climbers",
            rx: ["1 min each, the quiet versions", "1 min each, repeat", "1 min each, repeat", "1 min each, repeat"],
          },
        ],
      },
      {
        name: "Controlled vigorous cardio",
        mins: [0, 6, 12, 18],
        note: "This block builds toward Bryan’s 75 min/week of vigorous cardio. Keep the effort controlled and below all-out. Log only vigorous minutes; allow extra time for recoveries.",
        items: [
          {
            id: "thu-vigorous-cardio",
            ex: "vigorous",
            rx: ["—", "6 min @ {hr:80-85}", "12 min @ {hr:80-90}", "18 min @ {hr:80-90}"],
          },
        ],
      },
      {
        name: "Cool-down",
        mins: 5,
        items: [
          {
            id: "thu-cool-down-zone2",
            ex: "zone2",
            label: "Easy marching",
            intensity: "light",
            rx: ["5 min", "5 min", "5 min", "5 min"],
          },
        ],
      },
      {
        name: "Stability",
        mins: [9, 11, 13, 14],
        note: "Stability exercises from Bryan’s official protocol.",
        items: [
          {
            id: "thu-stability-slrdl",
            ex: "slrdl",
            rx: ["2 × 5/leg, hand on a wall, small range", "2 × 6/leg, hand on a wall", "2 × 8/leg", "2 × 10/leg, slow"],
          },
          {
            id: "thu-stability-birddog",
            ex: "birddog",
            rx: ["2 × 5/side, 2 s hold", "2 × 6/side, 2 s hold", "2 × 8/side", "2 × 10/side"],
          },
          { id: "thu-stability-deadbug", ex: "deadbug", rx: ["2 × 5/side", "2 × 6/side", "2 × 8/side", "2 × 10/side"] },
          {
            id: "thu-stability-shouldertap",
            ex: "shouldertap",
            rx: ["2 × 6/side, from the knees", "2 × 8/side, wide feet", "2 × 10/side", "2 × 12/side"],
          },
          { id: "thu-stability-shin", ex: "shin", rx: ["30 s", "45 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "fri",
    name: "Friday",
    short: "Fri",
    tag: "Lift C",
    title: "Strength C · Power, lunge, press + tendons",
    focus: "Bryan’s Friday template: lunges, overhead press, chest press, step-ups and side planks. Start with power work in Galpin’s order, then use Bryan’s 2026 pairing of heavy hip hinges followed by jumps.",
    blocks: [
      {
        name: "Warm-up",
        mins: [8, 9, 9, 10],
        note: "Start with a few minutes of easy movement, then dynamic exercises, as in Bryan’s official warm-up. Hops and balance come from his bone protocol and five exercise pillars.",
        items: [
          {
            id: "fri-warm-up-backwalk",
            ex: "backwalk",
            rx: [
              "1–2 min, bodyweight, slow",
              "2 min, bodyweight",
              "2 min holding 2 × {kg:8-10}",
              "2–3 min holding 2 × {kg:12-16} or band-resisted",
            ],
            bryan: "Bryan: backward sled ≈2 min",
          },
          { id: "fri-warm-up-dynamic", ex: "dynamic", rx: ["≈4 min, full series, slow", "≈4 min, full series", "≈4 min", "≈4 min"] },
          {
            id: "fri-warm-up-pogo",
            ex: "pogo",
            rx: ["1 × 10, very low", "2 × 10, low", "2 × 20", "3 × 20"],
            bryan: "Bone protocol: hops 4–7×/wk",
          },
          {
            id: "fri-warm-up-balance",
            ex: "balance",
            rx: [
              "2 × 20 s/leg, hand near a wall",
              "2 × 30 s/leg, eyes open",
              "2 × 30 s/leg, eyes closed",
              "2 × 30 s/leg, eyes closed on a folded mat",
            ],
          },
        ],
      },
      {
        name: "Speed & power",
        mins: [4, 5, 7, 8],
        note: "Give each rep your best effort and rest 30–60 s. Keep every rep controlled.",
        items: [
          {
            id: "fri-speed-power-powerskip",
            ex: "powerskip",
            rx: ["—", "—", "2 × 5/leg", "2 × 5/leg"],
            bryan: "Bryan 2025: 2 × 5",
          },
          {
            id: "fri-speed-power-heidens",
            ex: "heidens",
            rx: ["2 × 4/side, step and stick, no hop", "2 × 5/side, step and stick, no hop", "2 × 4/side, stick", "2 × 5/side, stick"],
            bryan: "Bryan 2025: 2 × 5",
          },
          {
            id: "fri-speed-power-woodchop",
            ex: "woodchop",
            rx: ["2 × 6/side, slow", "2 × 8/side, controlled", "2 × 5/side, fast", "3 × 5/side, max speed"],
            bryan: "Bryan 2025: rotational power",
          },
        ],
      },
      {
        name: "Strength",
        mins: [22, 24, 30, 33],
        note: "Pair floor press with chin-ups and the overhead press with step-ups; rest about 60 s after each pair.",
        items: [
          {
            id: "fri-strength-rdl",
            ex: "rdl",
            rx: [
              "2 × 8 @ 2 × {kg:12-16}",
              "2 × 10 @ 2 × {kg:12-16}",
              "3 × 8 @ 2 × {kg:18-22}",
              "3 × 6–8, heaviest pair; 20–30 s after each set, 3 countermovement jumps",
            ],
            bryan: "Bryan 2026: heavy pull → jumps",
          },
          {
            id: "fri-strength-lunge",
            ex: "lunge",
            rx: ["2 × 6/leg, hand on a chair", "2 × 8/leg, bodyweight", "3 × 10/leg @ 2 × {kg:8-10}", "3 × 10–12/leg @ 2 × {kg:12-16}"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-floorpress",
            ex: "floorpress",
            rx: ["2 × 8 @ 2 × {kg:10-12}", "2 × 10 @ 2 × {kg:10-12}", "3 × 10 @ 2 × {kg:14-16}", "3 × 8–10, heaviest pair"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-chinup",
            ex: "chinup",
            label: "Chin-ups (palms facing you)",
            rx: ["2 × 10–20 s dead hang", "2 × 3–5 band-assisted", "3 × 5", "3 × 6–8"],
            bryan: "Bryan does both grips",
          },
          {
            id: "fri-strength-ohpress",
            ex: "ohpress",
            rx: ["2 × 8 @ 2 × {kg:6-8}", "2 × 10 @ 2 × {kg:6-8}", "3 × 10 @ 2 × {kg:8-12}", "3 × 8–10 @ 2 × {kg:12-16}"],
            bryan: "Official: 3 × 10–12",
          },
          {
            id: "fri-strength-stepup",
            ex: "stepup",
            rx: ["2 × 6/leg, lowest stable step", "2 × 6/leg, low step", "2 × 8/leg, low step", "3 × 8/leg holding 2 × {kg:8-12}, low step, controlled drive"],
            bryan: "Official: 3 × 10/leg",
          },
        ],
      },
      {
        name: "Side plank & tendons",
        mins: [6, 7, 8, 9],
        items: [
          {
            id: "fri-side-plank-tendons-sideplank",
            ex: "sideplank",
            rx: ["2 × 15 s/side, knees down", "2 × 20 s/side, knees down is fine", "2 × 30 s/side", "2 × 45 s/side"],
            bryan: "Official: 20–30 s/side",
          },
          {
            id: "fri-side-plank-tendons-jefferson",
            ex: "jefferson",
            rx: ["2 × 5, no weight, on the floor, small range", "2 × 5, no weight, on the floor", "2 × 5 @ {kg:2-4} on a step", "2 × 5 @ {kg:4-10} on a step"],
            bryan: "Bryan 2025: flexibility set",
          },
          {
            id: "fri-side-plank-tendons-calf",
            ex: "calf",
            label: "Single-leg calf raise, slow",
            rx: ["1 × 8/leg, hand on a wall", "1 × 10/leg", "1 × 12/leg", "1 × 15/leg"],
          },
          { id: "fri-side-plank-tendons-tibraise", ex: "tibraise", rx: ["1 × 12", "1 × 15", "1 × 20", "1 × 25"] },
        ],
      },
      {
        name: "Zone 2",
        mins: [5, 10, 20, 30],
        note: "This cardio counts toward Bryan’s 150 min/week target. Outdoor activity is optional.",
        items: [{ id: "fri-zone-2-zone2", ex: "zone2", rx: ["5 min @ {hr:60-70}", "10 min @ {hr:60-70}", "20 min @ {hr:60-70}", "30 min @ {hr:60-70}"] }],
      },
      {
        name: "Cool-down",
        mins: 3,
        items: [
          { id: "fri-cool-down-hipflexor", ex: "hipflexor", rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"] },
          { id: "fri-cool-down-butterfly", ex: "butterfly", rx: ["30 s", "30 s", "45 s", "45 s"] },
        ],
      },
    ],
  },
  {
    key: "sat",
    name: "Saturday",
    short: "Sat",
    tag: "Zone 2",
    title: "Cardio + long stretch",
    focus: "Bryan spends weekends hiking, biking, climbing or playing pickleball at an easy pace. Your indoor session combines controlled vigorous cardio at your level, a long Zone 2 block and 20 min of stretching. This is the second posture strength day.",
    note: "When you feel like going outside, swap the Zone 2 block for a brisk walk, hike or bike ride of the same length or longer.",
    blocks: [
      {
        name: "Warm-up",
        mins: 5,
        items: [
          {
            id: "sat-warm-up-dynamic",
            ex: "dynamic",
            label: "Marching, leg swings, hip CARs",
            rx: ["5 min", "5 min", "5 min", "5 min"],
          },
        ],
      },
      {
        name: "Controlled vigorous cardio",
        mins: [0, 6, 12, 18],
        note: "This block builds toward Bryan’s 75 min/week of vigorous cardio. Keep the effort controlled and below all-out. Log only vigorous minutes; allow extra time for recoveries.",
        items: [
          {
            id: "sat-vigorous-cardio",
            ex: "vigorous",
            rx: ["—", "6 min @ {hr:80-85}", "12 min @ {hr:80-90}", "18 min @ {hr:80-90}"],
          },
        ],
      },
      {
        name: "Zone 2",
        mins: [30, 40, 45, 40],
        items: [
          {
            id: "sat-zone-2-zone2",
            ex: "zone2",
            rx: ["20 min @ {hr:60-70}", "25 min @ {hr:60-70}", "30–35 min", "40 min; weighted vest optional"],
            bryan: "Bryan: 150 min/week",
          },
          {
            id: "sat-zone-2-topup",
            ex: "zone2",
            label: "Scheduled Zone 2 · additional minutes",
            rx: ["10 min @ {hr:60-70}", "15 min @ {hr:60-70}", "15 min @ {hr:60-70}", "—"],
          },
        ],
      },
      {
        name: "Long stretch",
        mins: 20,
        note: "Bryan’s official light day: 20–30 min of gentle yoga or stretching.",
        items: [
          { id: "sat-long-stretch-catcow", ex: "catcow", rx: ["10 breaths", "10 breaths", "10 breaths", "10 breaths"] },
          { id: "sat-long-stretch-thread", ex: "thread", rx: ["5/side", "5/side", "5/side", "5/side"] },
          { id: "sat-long-stretch-couch", ex: "couch", rx: ["45 s/side", "60 s/side", "60 s/side", "60 s/side"] },
          {
            id: "sat-long-stretch-hipflexor",
            ex: "hipflexor",
            rx: ["30 s/side", "45 s/side", "45 s/side", "45 s/side"],
          },
          {
            id: "sat-long-stretch-hamstring",
            ex: "hamstring",
            rx: ["30 s/side", "45 s/side", "45 s/side", "45 s/side"],
          },
          { id: "sat-long-stretch-butterfly", ex: "butterfly", rx: ["45 s", "60 s", "60 s", "60 s"] },
          { id: "sat-long-stretch-shin", ex: "shin", rx: ["30 s", "45 s", "45 s", "45 s"] },
          { id: "sat-long-stretch-bigtoe", ex: "bigtoe", rx: ["20–30 s", "30 s", "45 s", "45 s"] },
          { id: "sat-long-stretch-cobra", ex: "cobra", rx: ["3 × 10 s", "3 × 20 s", "3 × 20 s", "3 × 20 s"] },
        ],
      },
    ],
  },
  {
    key: "sun",
    name: "Sunday",
    short: "Sun",
    tag: "Rest",
    title: "Rest",
    focus: "No training. Keep the posture habits; the daily posture block and an easy walk are optional.",
    blocks: [],
  },
]);

for (const day of DAYS) for (const block of day.blocks) {
  for (const item of block.items) {
    if (["mon-strength-pushup", "mon-strength-row"].includes(item.id)) { item.pair = "push-row"; item.group = "Alternate push-ups and rows, one set each"; }
    if (["fri-strength-floorpress", "fri-strength-chinup"].includes(item.id)) { item.pair = "press-pull"; item.group = "Alternate floor press and bar work, one set each"; }
    if (["fri-strength-ohpress", "fri-strength-stepup"].includes(item.id)) { item.pair = "press-step"; item.group = "Alternate overhead press and step-ups, one set each"; }
  }
  block.items = splitItems(block.items);
  const hinge = block.items.find((it) => it.id === "fri-strength-rdl");
  if (hinge) {
    hinge.rx[3] = "3 × 6–8, heaviest pair";
    hinge.pair = [null, null, null, "hinge-jump"];
    hinge.group = "Romanian deadlift · at Well trained, follow each set with jumps";
    block.items.splice(block.items.indexOf(hinge) + 1, 0, { id: "fri-strength-rdl-jumps", ex: "cmjump", rx: ["—", "—", "—", "3 × 3, wait 20–30 s after each deadlift set"], pair: hinge.pair, group: hinge.group, legacyId: hinge.id });
  }
}

export const TARGETS = localized([
  ["ok", "150 min of scheduled Zone 2 a week at {hr:60-70}, without relying on extra walks or outdoor activity. The easy 4×4 recoveries can add another 9 min when kept in Zone 2."],
  ["ok", "About 75 min of hard cardio: 54 min of controlled vigorous work on Tue/Thu/Sat, 16 work minutes in Thursday’s 4×4 and 5 min 20 s of Tuesday’s bursts. Easy recoveries, warm-ups, jumps and strength sets are not credited as hard cardio."],
  ["ok", "Only about 10 of the hard minutes are intended near max: Tuesday’s bursts and the ends of the 4×4 rounds. The added vigorous blocks stay controlled."],
  ["ok", "Strength Mon/Wed/Fri, short intervals Tue and Norwegian 4×4 Thu follow Bryan’s template. Saturday adds controlled vigorous work to the indoor Zone 2 session to meet his weekly totals."],
  ["ok", "Hops in 4 warm-ups and power work twice a week (bone protocol: 4–7 and 2)."],
  ["ok", "Balance or stability on 5 days, stretching every day, posture every day with his two physical-therapist exercises to fatigue twice a week."],
]);

// icon, ex (an exercise whose animation shows the item) and use (how it's used in
// that exercise) are for the setup screen.
export const EQUIPMENT = localized({
  have: [
    {
      i: "Adjustable dumbbells",
      d: "Ideally up to 20–24 kg each, so the RDL, goblet squat and carries keep progressing.",
      icon: "dumbbell",
      ex: "ohpress",
      use: "hold one in each hand and press from your shoulders until your arms are straight.",
    },
    {
      i: "Doorway pull-up bar",
      d: "Pull-ups, chin-ups, hanging leg raises.",
      icon: "bar",
      ex: "chinup",
      use: "hang from the bar in a door frame and pull your chest up to it.",
    },
  ],
  add: [
    {
      i: "Resistance bands + door anchor",
      d: "Light, medium and heavy. Face pulls, pull-aparts, butterfly, Pallof press, woodchop and pull-up assistance.",
      icon: "band",
      ex: "facepull",
      use: "the band is anchored in the door at face height; pull it apart towards your ears.",
    },
    {
      i: "Exercise mat",
      d: "For kneeling work, stretches and quieter landings.",
      icon: "mat",
      ex: "pushup",
      use: "place your hands on the mat. Use it for planks, floor work and stretches too.",
    },
    {
      i: "Slant board or 2 small plates",
      d: "A foldable slant board (about 40 × 40 cm) or 2.5–5 kg plates under the heels: squats and Poliquin step-ups.",
      icon: "slant",
      ex: "gobletsquat",
      use: "heels up on the slant board so the knees can travel far forward.",
    },
    {
      i: "Adjustable aerobic step",
      d: "A stable low step for cardio, strength step-ups and calf raises. Start at the lowest secure height. Progress with control or dumbbells; never stack furniture.",
      icon: "step",
      ex: "stepup",
      use: "drive up onto a low stable step, with bodyweight or dumbbells.",
    },
    {
      i: "Nordic anchor",
      d: "A heavy sofa or bed you can hook your heels under, or a door Nordic strap.",
      icon: "anchor",
      ex: "nordic",
      use: "heels hooked under a sofa or strap while you lower yourself slowly.",
    },
  ],
  optional: [
    { i: "Jump rope", d: "Only if your ceiling and neighbours allow it." },
    { i: "Weighted vest", d: "For Zone 2 at Well trained (Bryan’s bone protocol).", icon: "vest" },
  ],
});

export const SWAPS = localized([
  ["Backward sled drag", "Backward walk indoors, then holding dumbbells or band-resisted"],
  ["Sled push-pull (power)", "Stationary power skips, skater bounds"],
  ["Slant-board goblet squat", "Heels-elevated goblet squat on a slant board or plates"],
  ["Poliquin step-up on a slant", "Slant board on the floor, short heel tap; use a higher stable platform only when ready"],
  ["Box step-up", "Low aerobic step; progress with control and load within its rated capacity"],
  ["Leg extension / reverse Nordic bench", "Reverse Nordic on a mat"],
  ["Nordic bench", "Heels under a sofa or a door strap"],
  ["Tib bar, IsoTib", "Wall tibialis raises"],
  ["Seated calf machine", "Seated dumbbell calf raise + single-leg calf raise on a step"],
  ["45° back extension with plate", "Floor back extension"],
  ["Obliques on the hyperextension", "Dumbbell side bends"],
  ["Captain’s chair leg raises", "Hanging knee and leg raises on the bar"],
  ["Cable face pulls, Pallof press", "Band versions on a door anchor"],
  ["Bench press", "Dumbbell floor press"],
  ["Heavy deadlift (2026 dunk training)", "Heavy dumbbell Romanian deadlift + jumps"],
  ["Kettlebell swing", "Dumbbell swing"],
  ["Medicine-ball rotational throws", "Fast band woodchop"],
  [
    "Bike, elliptical or running intervals",
    "Step-ups, high knees, jacks, mountain climbers, burpees without push-up",
  ],
  [
    "Weekend hike, bike or pickleball",
    "Indoor controlled vigorous cardio + Zone 2 + long stretch on Saturday; outdoor swaps are optional",
  ],
]);

export const TIMELINE = localized([
  {
    d: "14 Oct 2026",
    t: "Bryan’s Workout Protocol: direct published update",
    s: "The official workout page lists strength on Monday, Wednesday and Friday, short intervals on Tuesday and the Norwegian 4×4 on Thursday, plus weekend activity and recovery. This home plan adjusts doses to your level and uses compact equipment. Buying extra gear does not add exercises or sets.",
    date: "2026-10-14",
    links: [
      {
        t: "Workout protocol",
        u: "https://blueprint.bryanjohnson.com/blogs/news/exercise-and-fitness-protocol-for-longevity"
      }
    ]
  },
  {
    d: "Jul 2023",
    t: "Daily workout protocol",
    s: "About 25 exercises in 45–60 min: backward sled, posture work, Knees-Over-Toes leg work, high-rep accessories (1 × 25), 10-min HIIT three times a week.",
    date: "2023-07",
    links: [
      {
        t: "Full workout video",
        u: "https://www.youtube.com/watch?v=sYyVi-H-ozI"
      },
      {
        t: "Daily workout post",
        u: "https://x.com/bryan_johnson/status/1683855033425866755"
      }
    ]
  },
  {
    d: "Oct 2024",
    t: "Posture thread",
    s: "He said an MRI showed his posture was restricting blood flow out of his brain. Five habits plus two physical-therapist exercises, done to fatigue twice a week.",
    date: "2024-10-10",
    links: [
      {
        t: "Five posture habits",
        u: "https://x.com/bryan_johnson/status/1844454193572216969"
      },
      {
        t: "PT exercise clips",
        u: "https://x.com/bryan_johnson/status/1844454212333076616"
      }
    ]
  },
  {
    d: "Dec 2024",
    t: "Official exercise protocol + 4×4",
    s: "A 7-day longevity plan (strength days, interval days, a mobility day, Norwegian 4×4, a light day). On X: 4 min all-out, 4 min rest, four times.",
    date: "2024-12-23",
    links: [
      {
        t: "His 4×4 intervals",
        u: "https://x.com/bryan_johnson/status/1871278967984185599"
      }
    ]
  },
  {
    d: "2025",
    t: "Session rebuilt with Dr. Andy Galpin",
    s: "Warm-up, then speed and power (2 × 5), strength (2 × 5–8), posture, conditioning and flexibility (5 × 30 s). In Feb 2025, he reported a VO2 max personal best of 64.29.",
    date: "2025-02-19",
    links: [
      {
        t: "Session with Andy Galpin",
        u: "https://www.youtube.com/watch?v=QhL4VBHRBJY"
      },
      {
        t: "VO₂ max result",
        u: "https://x.com/bryan_johnson/status/1892287231521673528"
      }
    ]
  },
  {
    d: "Jan 2026",
    t: "Updated protocol",
    s: "6 h a week: 3 strength + 3 cardio sessions, 150 min Zone 2, 75 min vigorous, plus flexibility, balance and mobility. At minimum, 20 min a day.",
    date: "2026-01-23",
    links: [
      {
        t: "Official protocol",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bryan-johnsons-protocol"
      }
    ]
  },
  {
    d: "Mar–Apr 2026",
    t: "Posture guide, morning routine, bone density, squat breaks",
    s: "Posture guide updated. His day: 90 min of cardio, strength, balance and stretching, HIIT twice a week, active weekends. Bone protocol: jumping in warm-ups 4–7×/week, power training 2×/week. 9 Apr: 10 squats every 45 min of sitting.",
    date: "2026-04-22",
    links: [
      {
        t: "Posture guide",
        u: "https://blueprint.bryanjohnson.com/blogs/news/youre-likely-reading-this-with-poor-posture"
      },
      {
        t: "Morning routine",
        u: "https://blueprint.bryanjohnson.com/blogs/news/morning-routine"
      },
      {
        t: "Bone protocol",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bone-health-protocol"
      },
      {
        t: "Squat breaks",
        u: "https://x.com/bryan_johnson/status/2042049389880045815"
      }
    ]
  },
  {
    d: "May 2026",
    t: "“Everyone Is Wrong About Exercise”",
    s: "His five pillars: strength, Zone 2, high-intensity cardio, mobility & flexibility, balance.",
    date: "2026-05-26",
    links: [
      {
        t: "Five pillars video",
        u: "https://www.youtube.com/watch?v=JNuORofHhrk"
      }
    ]
  },
  {
    d: "Jul–Sep 2026",
    t: "Training to dunk at 49",
    s: "Front squat 245 lb (1 Sep) and deadlift 385 lb (4 Sep) PRs, with jumps between sets, coached in the Knees-Over-Toes style. His own weak points: little fast-twitch muscle, slow force development, stiff tendons, limited ankle dorsiflexion, Achilles risk.",
    date: "2026-09-11",
    links: [
      {
        t: "Dunk training targets",
        u: "https://x.com/bryan_johnson/status/2081071661466689637"
      },
      {
        t: "Front squat",
        u: "https://x.com/bryan_johnson/status/2094836868747759751"
      },
      {
        t: "Jumps between sets",
        u: "https://x.com/bryan_johnson/status/2096020664268583215"
      },
      {
        t: "Training with Ben Patrick",
        u: "https://x.com/bryan_johnson/status/2098458369208332556"
      }
    ]
  },
  {
    d: "Sep 2026",
    t: "4 protocols after 40",
    s: "Blueprint’s guidance after 40: strength train 2–3 times a week, cover the major muscle groups with compound movements and gradually increase reps or load. Start with bodyweight if new.",
    date: "2026-09-23",
    links: [
      {
        t: "4 Protocols to Follow After 40",
        u: "https://blueprint.bryanjohnson.com/blogs/news/4-protocols-to-follow-after-40",
        date: "2026-09-23"
      },
      {
        t: "Official exercise guidance",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bryan-johnsons-protocol"
      }
    ]
  },
  {
    d: "4 Oct 2026",
    t: "Newest weekly template (exercise newsletter)",
    s: "Strength Mon/Wed/Fri with progressive overload, short intervals Tue, Norwegian 4×4 Thu (start with 2–3 rounds, hard but controlled), easy outdoor or social activity Sat, recovery Sun. At least 150 min Zone 2 and 75 min hard cardio, about 10 of them near max.",
    date: "2026-10-04",
    links: [
      {
        t: "Archived exercise newsletter",
        u: "https://milled.com/blueprint.bryanjohnson.com/my-exercise-protocol-iDTE0JjdPa191ocK"
      },
      {
        t: "Published weekly routine",
        u: "https://blueprint.bryanjohnson.com/blogs/news/exercise-and-fitness-protocol-for-longevity"
      }
    ]
  }
]);

export const TAKEAWAYS = localized([
  "The week follows Bryan’s newest template: strength on Monday, Wednesday and Friday, short intervals on Tuesday, the Norwegian 4×4 on Thursday, mixed cardio on Saturday and rest on Sunday. All sessions are indoors. Scheduled cardio increases by level toward 150 min of Zone 2 and 75 min of hard work, without relying on extra activity.",
  "Strength days take the template’s basics (squat, push-up, row, swing, lunge, presses, step-up, carry, planks) and add his signature Knees-Over-Toes and high-rep posture work.",
  "From his 2026 training: hops in every warm-up, a few jumps, a heavy hinge followed by jumps, and ankle and Achilles work, because he named those as his own weak points.",
  "Balance and the stability exercises from his official protocol run through the week. Every session ends with flexibility work.",
  "Posture uses his 5 habits, his 10-squat tip and his posture exercises, plus chin tucks and a doorway stretch as classic extras.",
]);

export const SOURCES = localized([
  {
    g: "Bryan Johnson: official pages",
    items: [
      {
        t: "Bryan Johnson’s Workout Protocol",
        u: "https://blueprint.bryanjohnson.com/blogs/news/exercise-and-fitness-protocol-for-longevity",
        date: "2026-10-14"
      },
      {
        t: "My Exercise Protocol · archived newsletter",
        u: "https://milled.com/blueprint.bryanjohnson.com/my-exercise-protocol-iDTE0JjdPa191ocK",
        date: "2026-10-04"
      },
      {
        t: "Bryan Johnson’s Protocol",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bryan-johnsons-protocol",
        date: "2026-01-23"
      },
      {
        t: "Don’t Die protocol site",
        u: "https://protocol.bryanjohnson.com/"
      },
      {
        t: "My Morning Routine",
        u: "https://blueprint.bryanjohnson.com/blogs/news/morning-routine",
        date: "2026-04-22"
      },
      {
        t: "Bone Density for Longevity",
        u: "https://blueprint.bryanjohnson.com/blogs/news/bone-health-protocol",
        date: "2026-04-13"
      },
      {
        t: "How to Fix Your Posture: 5 Habits",
        u: "https://blueprint.bryanjohnson.com/blogs/news/youre-likely-reading-this-with-poor-posture",
        date: "2026-03-01"
      },
      {
        t: "Is Sitting Really That Bad for You?",
        u: "https://blueprint.bryanjohnson.com/blogs/news/is-sitting-really-that-bad-for-you",
        date: "2026-04-27"
      },
      {
        t: "Test Your Biological Age for $0 (balance test)",
        u: "https://blueprint.bryanjohnson.com/blogs/news/test-your-biological-age-for-0",
        date: "2025-10-27"
      },
      {
        t: "4 Protocols to Follow After 40",
        u: "https://blueprint.bryanjohnson.com/blogs/news/4-protocols-to-follow-after-40",
        date: "2026-09-23"
      }
    ]
  },
  {
    g: "Bryan Johnson: videos",
    items: [
      {
        t: "Everyone Is Wrong About Exercise",
        u: "https://www.youtube.com/watch?v=JNuORofHhrk",
        date: "2026-05-26"
      },
      {
        t: "Exercise Scientist Dismantles My Longevity Workout, with Dr. Andy Galpin",
        u: "https://www.youtube.com/watch?v=QhL4VBHRBJY"
      },
      {
        t: "My Complete Anti-Aging Workout",
        u: "https://www.youtube.com/watch?v=sYyVi-H-ozI",
        date: "2023-07"
      },
      {
        t: "How I Fixed My Terrible Posture – 5 Habits",
        u: "https://www.youtube.com/watch?v=in9ubCilsT8",
        date: "2023-06"
      },
      {
        t: "A 20-Minute Call with My Posture Coach",
        u: "https://www.youtube.com/watch?v=cYGlj8Ryij8"
      },
      {
        t: "My posture nearly killed me. Here’s why…",
        u: "https://www.youtube.com/watch?v=k5nexY_nHI8"
      }
    ]
  },
  {
    g: "Bryan Johnson: posts on X",
    items: [
      {
        t: "My daily workout protocol",
        u: "https://x.com/bryan_johnson/status/1683855033425866755",
        date: "2023-07-25"
      },
      {
        t: "Posture thread: five habits",
        u: "https://x.com/bryan_johnson/status/1844454193572216969",
        date: "2024-10-10"
      },
      {
        t: "Posture thread: the two PT exercises",
        u: "https://x.com/bryan_johnson/status/1844454212333076616",
        date: "2024-10-10"
      },
      {
        t: "4×4 HIIT",
        u: "https://x.com/bryan_johnson/status/1871278967984185599",
        date: "2024-12-23"
      },
      {
        t: "VO2 max 64.29",
        u: "https://x.com/bryan_johnson/status/1892287231521673528",
        date: "2025-02-19"
      },
      {
        t: "Rotating sitting and standing",
        u: "https://x.com/bryan_johnson/status/1939806415649935751",
        date: "2025-06-30"
      },
      {
        t: "Grip strength predicts longevity",
        u: "https://x.com/bryan_johnson/status/1965204330145087854",
        date: "2025-09-09"
      },
      {
        t: "10 squats every 45 minutes of sitting",
        u: "https://x.com/bryan_johnson/status/2042049389880045815",
        date: "2026-04-09"
      },
      {
        t: "Training to dunk: the targets",
        u: "https://x.com/bryan_johnson/status/2081071661466689637",
        date: "2026-07-25"
      },
      {
        t: "Training to dunk: what’s good, what’s bad",
        u: "https://x.com/bryan_johnson/status/2083240664209474046",
        date: "2026-07-31"
      },
      {
        t: "365 lb for 2 reps",
        u: "https://x.com/bryan_johnson/status/2093391998229402099",
        date: "2026-08-28"
      },
      {
        t: "Front squat PR",
        u: "https://x.com/bryan_johnson/status/2094836868747759751",
        date: "2026-09-01"
      },
      {
        t: "A jump in between sets",
        u: "https://x.com/bryan_johnson/status/2096020664268583215",
        date: "2026-09-04"
      },
      {
        t: "Jefferson, Ben Patrick and the dunk",
        u: "https://x.com/bryan_johnson/status/2098458369208332556",
        date: "2026-09-11"
      }
    ]
  },
  {
    g: "People who studied his training",
    items: [
      {
        t: "Dr. Andy Galpin on the 2025 session (Biomolecular Athlete)",
        u: "https://www.biomolecularathlete.com/content/bryan-johnson-exercise-scientist-dismantles-my-longevity-workout"
      },
      {
        t: "Nucleus: breakdown of his session (warm-up, power, strength, posture, conditioning, flexibility)",
        u: "https://mynucleus.com/blog/bryan-johnson-workout-routine"
      },
      {
        t: "Generation Iron: the 2023 routine with sets and reps",
        u: "https://generationiron.com/bryan-johnson-workout/"
      },
      {
        t: "NAD: Bryan Johnson’s guide to fixing terrible posture",
        u: "https://www.nad.com/news/bryan-johnsons-free-guide-to-fixing-terrible-posture"
      },
      {
        t: "BodyBuildingBros: Bryan’s five pillars of exercise",
        u: "https://www.bodybuildingbros.com/news/bryan-johnson-reveals-the-five-pillars-of-exercise-for-longevity/"
      },
      {
        t: "Will Wayland: How I’d train Bryan Johnson to vertical jump",
        u: "https://x.com/WSWayland/article/2100144371341443159",
        date: "2026-09"
      }
    ]
  }
]);
