// Optional add-on: the daily posture block (tech neck, forward shoulders).
// Same tracking as the main session. See addons/index.js for how add-ons work.

export default {
  id: "posture",
  name: "Posture correction",
  short: "Posture",
  icon: "posture",
  color: "violet",
  description: "Spend 8–10 minutes after each session on tech neck and forward shoulders. Use Bryan's string cue, band pull-aparts, face pulls and external rotation, plus his two physical-therapist exercises twice a week. Chin tucks and a doorway stretch are included as extras.",
  // Which variant to show on each day ("optional" = shown, but not expected).
  schedule: { mon: "daily", tue: "daily", wed: "strength", thu: "daily", fri: "daily", sat: "strength", sun: "optional" },
  variants: {
    daily: {
      name: "Daily posture block",
      mins: 8,
      note: "Keep the effort gentle and focus on form before adding weight. Chin tucks and the doorway stretch are standard exercises outside Bryan's routine.",
      items: [
        { id: "posture-string", ex: "string", rx: ["30 s", "30 s", "30 s", "30 s"] },
        {
          id: "posture-chintuck",
          ex: "chintuck",
          rx: ["1 × 6, 3 s hold", "1 × 8, 3 s hold", "2 × 8, 3 s hold", "2 × 10, 3 s hold"],
          bryan: "Classic (not Bryan)",
        },
        { id: "posture-wallslide", ex: "wallslide", rx: ["1 × 8 slow", "1 × 10 slow", "1 × 10 slow", "1 × 12 slow"] },
        {
          id: "posture-pullapart",
          ex: "pullapart",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20"],
          bryan: "Bryan: 1 × 15",
        },
        {
          id: "posture-facepull",
          ex: "facepull",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20–25"],
          bryan: "Bryan: 1 × 15–25",
        },
        {
          id: "posture-extrot",
          ex: "extrot",
          rx: ["1 × 10/arm @ {kg:1-2}", "1 × 10/arm @ {kg:1-2}", "1 × 12/arm @ {kg:2-3}", "1 × 15/arm @ {kg:3-4}"],
          bryan: "In Bryan’s routine",
        },
        {
          id: "posture-neck-gentle",
          ex: "neck",
          label: "Neck: forehead resistance, gentle",
          rx: ["3 × 10 s holds", "5 × 10 s holds", "5 × 10 s holds", "5 × 10 s holds"],
        },
        {
          id: "posture-doorway",
          ex: "doorway",
          rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"],
          bryan: "Classic (not Bryan)",
        },
      ],
    },
    strength: {
      name: "Posture strength block",
      mins: 10,
      note: "Do Bryan's two physical-therapist exercises to fatigue today. He does them twice a week.",
      items: [
        { id: "posture-string", ex: "string", rx: ["30 s", "30 s", "30 s", "30 s"] },
        {
          id: "posture-chintuck",
          ex: "chintuck",
          rx: ["1 × 6, 3 s hold", "1 × 8, 3 s hold", "2 × 8, 3 s hold", "2 × 10, 3 s hold"],
          bryan: "Classic (not Bryan)",
        },
        { id: "posture-wallslide", ex: "wallslide", rx: ["1 × 8 slow", "1 × 10 slow", "1 × 10 slow", "1 × 12 slow"] },
        {
          id: "posture-pullapart",
          ex: "pullapart",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20"],
          bryan: "Bryan: 1 × 15",
        },
        {
          id: "posture-facepull",
          ex: "facepull",
          rx: ["1 × 12, lightest band", "1 × 15", "1 × 15–20", "1 × 20–25"],
          bryan: "Bryan: 1 × 15–25",
        },
        {
          id: "posture-extrot",
          ex: "extrot",
          rx: ["1 × 10/arm @ {kg:1-2}", "1 × 10/arm @ {kg:1-2}", "1 × 12/arm @ {kg:2-3}", "1 × 15/arm @ {kg:3-4}"],
          bryan: "In Bryan’s routine",
        },
        {
          id: "posture-doorway",
          ex: "doorway",
          rx: ["30 s/side", "30 s/side", "30 s/side", "45 s/side"],
          bryan: "Classic (not Bryan)",
        },
        {
          id: "posture-levator",
          ex: "levator",
          rx: [
            "1 × 10 @ 2 × {kg:3.5-4}, stop well before fatigue",
            "1 set to fatigue @ 2 × {kg:3.5-4}",
            "1 set to fatigue @ 2 × {kg:5-6}",
            "1 set to fatigue @ 2 × {kg:6-9}",
          ],
          bryan: "Bryan: 1 set to fatigue, 2×/wk",
        },
        {
          id: "posture-neck-fatigue",
          ex: "neck",
          label: "Neck: forehead resistance to fatigue",
          rx: ["1 × 5 slow holds, stop well before fatigue", "1 set to fatigue, slow and patient", "1 set to fatigue", "1 set to fatigue"],
          bryan: "Bryan: to fatigue, 2×/wk",
        },
      ],
    },
  },
  // Extra things tracked once per day for this add-on.
  metrics: [
    { id: "stiffness", type: "scale", min: 0, max: 10, label: "Neck and upper back stiffness today", low: "none", high: "very stiff" },
  ],
  // Reminders that come back every N days.
  periodic: [
    { id: "photo", every: 14, label: "Take a side photo in the same spot. Is your ear over your shoulder?" },
    { id: "wall", every: 14, label: "Stand with your heels 5 cm from the wall. Can the back of your head touch it while your eyes stay level?" },
  ],
  habits: [
  {
    h: "String cue",
    d: "When you sit down or stand up, imagine a string lifting the crown of your head.",
  },
  {
    h: "Phone at eye level",
    d: "Bryan calls the phone the worst trigger for bad posture. Hold it at eye level and put the top of your monitor at eye level too.",
  },
  {
    h: "Move every 30 minutes",
    d: "Get up for 2–3 minutes every 30 minutes. Switch between sitting and standing, as Bryan does at his desk. An under-desk treadmill works well for these breaks.",
  },
  {
    h: "10 squats every ~45 minutes",
    d: "Bryan shared this tip in April 2026 for days spent sitting. In the study he cited, squat breaks improved blood sugar more than one 30-minute walk. He stressed taking breaks from sitting.",
  },
  {
    h: "Two strength exercises, twice a week",
    d: "On Wednesday and Saturday, do shoulders up and out and neck forehead resistance, 1 set each to fatigue.",
  },
  {
    h: "Expect soreness",
    d: "Bryan’s guide says holding good posture uses muscles that may feel sore at first. Sharp pain, tingling or headaches are reasons to stop and get checked.",
  },
],
  checks: [
  "Every 2 weeks, take a relaxed side photo in the same spot. Check that your ear sits over your shoulder.",
  "Wall check: heels about 5 cm from a wall, buttocks and shoulder blades touching. The back of your head should reach the wall with your eyes level, without straining.",
  "Each evening, rate neck and upper back stiffness from 0 to 10.",
  "When your photo and wall check look right and stiffness stays at 2 or below for 4 weeks, switch to maintenance. Keep the two strength exercises twice a week and the daily habits, as Bryan does. Reduce the daily block to 2–3 times a week.",
],
};
