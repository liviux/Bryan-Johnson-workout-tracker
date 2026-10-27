import { MOVEMENTS } from "./movements.js";

// Every exercise in the plan.
//
//   name, cat         display name and library category
//   log               how it is tracked: "load" (reps + kg), "reps", "hold" (seconds),
//                     "carry" (seconds + kg), "cardio" (minutes + heart rate),
//                     "intervals" (rounds + peak heart rate), "check" (done/not done),
//                     "none" (information only)
//   equipment         icons shown on the exercise (see components/icons.js)
//   muscles           what it trains (also highlighted on the 3D figure)
//   classic           true = not one of Bryan's exercises (shown with a "classic" badge)
//   bryan             what Bryan does / says about it
//   how, tips, easier technique notes
//   bryanVideos       [{ k: key in videos.js, s: start second, n: note }]
//   videos            demo videos by other coaches ({ t: title, u: url, s: start second })
//   clipVideos        per-movement video sets synced with multi-clip 3D animations:
//                     [{ title, bryanVideos?, videos }]
//
// Text may contain personalisation tokens: {hr:60-70} → heart-rate range for the
// user's max heart rate, {kg:4-6} → load scaled to the user, {cm:30} → length in
// the user's units. See personalize.js.

export const CATEGORIES = [
  "Warm-up & balance",
  "Power",
  "Legs & knees",
  "Upper body",
  "Core & stability",
  "Cardio (indoor)",
  "Mobility & stretching",
  "Posture",
];

export const EXERCISES = {
  backwalk: {
    name: "Backward walk (sled substitute)",
    cat: "Warm-up & balance",
    log: "check",
    equipment: ["dumbbell"],
    muscles: ["quads", "calves"],
    bryan: "Bryan opens his workouts with a backward sled drag (about 2 min in his 2023 routine, still first in his 2025 warm-up with Dr. Andy Galpin). It works the knees and quads using the Knees-Over-Toes approach.",
    how: [
      "Walk backward for 2 min along a clear stretch of hallway or living room. Turn around when you reach the wall.",
      "Take short steps, landing on the ball of your foot before lowering the heel.",
      "Keep the knees bent so they travel forward over the toes, and push the floor away in front of you.",
      "At Returning and above, hold a dumbbell in each hand, or loop a band around your waist with its anchor in front of you. The band should pull you forward, like a sled.",
    ],
    tips: ["You should feel the front of your thighs working. Stop if you feel pain inside the knee."],
    bryanVideos: [
      { k: "w23", s: 96, n: "backward sled" },
      { k: "galpin", s: 1948, n: "heavy sled burst" },
    ],
    videos: [
      { t: "Backward walk for knee strength", u: "https://www.youtube.com/watch?v=6EhaDP7WKG0", s: 0 },
      {
        t: "Sled pull alternative (Knees Over Toes style)",
        u: "https://www.youtube.com/watch?v=6zcj8dNolrA",
        s: 12,
      },
    ],
    clipVideos: [
      {
        title: "Backward walk",
        bryanVideos: [{ k: "w23", s: 96, n: "backward sled" }],
        videos: [
          { t: "Backward walk for knee strength", u: "https://www.youtube.com/watch?v=6EhaDP7WKG0", s: 0 },
          { t: "Walk backward for knee and back health", u: "https://www.youtube.com/watch?v=HLdGJaPrjZ8", s: 18 },
        ],
      },
      {
        title: "Backward walk with dumbbells (Phase 2+)",
        bryanVideos: [
          { k: "galpin", s: 1948, n: "heavy sled burst" },
          { k: "w23", s: 96, n: "backward sled" },
        ],
        videos: [
          {
            t: "Sled pull alternative (Knees Over Toes style)",
            u: "https://www.youtube.com/watch?v=6zcj8dNolrA",
            s: 12,
          },
          { t: "Backward walking progression", u: "https://www.youtube.com/watch?v=kQvm1_KQ2Jg", s: 45 },
        ],
      },
    ],
  },
  dynamic: {
    name: "Dynamic series",
    cat: "Warm-up & balance",
    log: "check",
    equipment: ["wall"],
    muscles: ["hips", "shoulders"],
    bryan: "Bryan’s official warm-up uses arm circles, leg swings, high knees and lateral lunges. Hip CARs and the lunge with twist come from his mobility day and his 2025 warm-up with Dr. Andy Galpin.",
    how: [
      "Arm circles: 10 forward, 10 back.",
      "Leg swings: 10 front-to-back and 10 side-to-side per leg, one hand on a wall.",
      "High knees on the spot: 20 s, light and quiet.",
      "Lateral lunges: 5 per side, sitting the hips back.",
      "Hip CARs: 3 slow circles per leg each way (knee up, open out, rotate back, lower).",
      "Lunge with twist: 5 per side, turning your chest toward the front knee.",
    ],
    videos: [
      { t: "Arm circles warm-up", u: "https://www.youtube.com/watch?v=UVMEnIaY8aU", s: 0 },
      { t: "Leg swings", u: "https://www.youtube.com/watch?v=difYoBtZi2s", s: 3 },
      { t: "High knees on the spot", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
      { t: "Lateral lunge", u: "https://www.youtube.com/watch?v=apsp_uuXZTU", s: 3 },
      { t: "Standing hip CARs", u: "https://www.youtube.com/watch?v=vybS-uVNrqA", s: 4 },
      { t: "Lunge with twist", u: "https://www.youtube.com/watch?v=peb887Bc0-Q", s: 2 },
    ],
    clipVideos: [
      {
        title: "Arm circles",
        videos: [
          { t: "Arm circles exercise", u: "https://www.youtube.com/watch?v=UVMEnIaY8aU", s: 0 },
          { t: "Standing warm-up arm circles", u: "https://www.youtube.com/watch?v=mwDgFY86zck", s: 0 },
        ],
      },
      {
        title: "Leg swings",
        videos: [
          { t: "How to do leg swings", u: "https://www.youtube.com/watch?v=difYoBtZi2s", s: 3 },
          {
            t: "Front-to-back and side-to-side leg swings",
            u: "https://www.youtube.com/watch?v=RdL35MpuoQs",
            s: 12,
          },
          { t: "Active warm-up leg swings", u: "https://www.youtube.com/watch?v=naW8u72lOzI", s: 6 },
        ],
      },
      {
        title: "High knees on the spot",
        videos: [
          { t: "How to do high knees", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
          { t: "High knee warm-up drill", u: "https://www.youtube.com/watch?v=ymdS7tM0zws", s: 2 },
        ],
      },
      {
        title: "Lateral lunges",
        videos: [
          { t: "How to do lateral lunges (side lunges)", u: "https://www.youtube.com/watch?v=apsp_uuXZTU", s: 3 },
          { t: "Lateral lunge form and cues", u: "https://www.youtube.com/watch?v=vwK7vZNQwUI", s: 22 },
        ],
      },
      {
        title: "Hip CARs",
        videos: [
          { t: "Standing hip CARs explained", u: "https://www.youtube.com/watch?v=PO1of6rKX3Q", s: 3 },
          {
            t: "Standing hip CARs (controlled articular rotations)",
            u: "https://www.youtube.com/watch?v=vybS-uVNrqA",
            s: 4,
          },
          { t: "Wall-supported standing hip CARs", u: "https://www.youtube.com/watch?v=C4MDREc9ERg", s: 0 },
        ],
      },
      {
        title: "Lunge with twist",
        videos: [
          { t: "Lunge with twist", u: "https://www.youtube.com/watch?v=peb887Bc0-Q", s: 2 },
          { t: "Walking lunge with twist tutorial", u: "https://www.youtube.com/watch?v=7yrkGWJHSP0", s: 3 },
          { t: "Lunge with torso rotation", u: "https://www.youtube.com/watch?v=KDelmDbh4Ms", s: 5 },
        ],
      },
    ],
  },
  pogo: {
    name: "Pogo hops",
    cat: "Warm-up & balance",
    log: "reps",
    equipment: ["mat"],
    muscles: ["calves", "ankles"],
    bryan: "Bryan’s Bone Density protocol (Apr 2026) puts jumping and hopping into the warm-up 4–7 times a week. He mentions stiff tendons and Achilles risk in his 2026 dunk training notes. This plan gives the tendons a small daily dose of work.",
    how: [
      "Stand tall, feet hip-width, hands on hips, on a mat.",
      "Bounce on the balls of your feet with almost straight knees. Let your heels touch the floor lightly.",
      "Keep each bounce quick, quiet and springy. Build height later.",
    ],
    easier: "For less noise, do fast heel raises without leaving the floor.",
    videos: [
      { t: "Stationary pogo jumps (progression)", u: "https://www.youtube.com/watch?v=jj-0qlVuM3w", s: 8 },
      { t: "Pogo hops", u: "https://www.youtube.com/watch?v=7SIfCcfP4g0", s: 10 },
    ],
  },
  heeldrop: {
    name: "Heel drops & stomp drills",
    cat: "Power",
    log: "reps",
    equipment: ["mat"],
    muscles: ["calves", "quads", "glutes"],
    bryan: "Bryan’s Bone Density protocol (Apr 2026): high ground-reaction shockwaves stimulate osteoblast mineral deposition to maintain 99th percentile bone density.",
    how: [
      "Stand tall with feet hip-width apart on a firm surface or thin mat.",
      "Rise smoothly onto the balls of your feet, lifting heels 3–5 cm.",
      "Drop your full body weight firmly down onto your heels with knees slightly soft (do not lock them).",
      "Feel the mechanical vibration pulse up through the shins, femur neck and lumbar spine.",
      "Perform rhythmic, controlled drops: 20–30 reps for beginners, up to 50 for trained.",
    ],
    easier: "Hold onto a wall or sturdy chair for balance, or reduce heel lift to 1–2 cm.",
    tips: [
      "Keep knees unlocked: soft knees allow the bone to absorb osteogenic impact without straining the joint cartilage.",
    ],
    videos: [
      { t: "Heel drop exercise for bone density", u: "https://www.youtube.com/watch?v=tZ8gy_V6bxM", s: 18 },
      { t: "Heel drop and foot stomp exercises", u: "https://www.youtube.com/watch?v=kMbajq1u-Us", s: 58 },
    ],
    clipVideos: [
      {
        title: "Heel drops",
        videos: [
          { t: "Heel drop exercise for bone density", u: "https://www.youtube.com/watch?v=tZ8gy_V6bxM", s: 18 },
          { t: "How to do heel drops for osteoporosis", u: "https://www.youtube.com/watch?v=d3FVrOVuQtM", s: 42 },
        ],
      },
      {
        title: "Stomp drills",
        videos: [
          { t: "Foot stomp exercise for strengthening bone", u: "https://www.youtube.com/watch?v=kMbajq1u-Us", s: 58 },
          { t: "Bone-building stomp drill", u: "https://www.youtube.com/watch?v=Hpg5COs6LNA", s: 24 },
        ],
      },
    ],
  },
  balance: {
    name: "Single-leg balance",
    cat: "Warm-up & balance",
    log: "hold",
    equipment: ["wall"],
    muscles: ["ankles", "glutes", "core"],
    bryan: "Balance is one of Bryan’s five exercise pillars (his May 2026 video). His free biological-age check uses a one-leg stand with eyes closed. Being able to stand on one leg for 10 s is linked with lower all-cause mortality.",
    how: [
      "Stand on one leg next to a wall, hands on hips, other foot off the floor.",
      "Hold for the time your level prescribes, then progress to eyes closed.",
      "Stop the clock when the foot shifts, a hand leaves the hip or the raised foot touches down.",
      "Once a month, record your best eyes-closed time per leg.",
    ],
    bryanVideos: [
      { k: "pillars", s: 719, n: "10 s balance test" },
      { k: "galpin", s: 1547, n: "balance drill" },
    ],
    videos: [
      { t: "Eyes-closed single-leg balance", u: "https://www.youtube.com/watch?v=cDnTke5lZPA", s: 5 },
      { t: "Single-leg stance basics", u: "https://www.youtube.com/watch?v=HTVVv4ESgms", s: 6 },
    ],
  },
  jumps: {
    name: "Jumps: snap-down → squat jump → countermovement jump",
    cat: "Power",
    log: "reps",
    equipment: ["mat"],
    muscles: ["quads", "glutes", "calves"],
    bryan: "Bryan has been training to dunk at 49 since July 2026, using heavy lifts with jumps between sets. He says he needs more fast-twitch fibres and faster force development, and warns about Achilles risk from landing forces. Learn to land before working on height.",
    how: [
      "Snap-down (Returning): rise onto your toes with arms up, then drop fast into a quarter squat, arms back. Freeze 2 s.",
      "Squat jump (Active): from a half squat, jump as high as you can; land softly in the same spot and hold 2 s.",
      "Countermovement jump (Well trained): quick dip with an arm swing, then a max-height jump; stick the landing.",
      "Land with your knees over your toes, without letting them cave in. Rest fully between reps and give each one your best effort.",
    ],
    tips: ["Wear shoes and land on a mat. Stop the set if your landings get loud."],
    easier: "Quiet version: explosive squat to calf raise without leaving the floor.",
    bryanVideos: [{ k: "galpin", s: 2537, n: "jump to overhead throw" }],
    videos: [
      { t: "Snap-downs: introduction to landings", u: "https://www.youtube.com/watch?v=4BkMWe3au9w", s: 4 },
      { t: "Squat jump with stable landing", u: "https://www.youtube.com/watch?v=d0p-3x84nj0", s: 10 },
      { t: "Countermovement jump (CMJ)", u: "https://www.youtube.com/watch?v=m7-AV0mikkI", s: 2 },
    ],
    clipVideos: [
      {
        title: "Snap-down (phase 1)",
        videos: [
          { t: "Snap-downs: introduction to landings", u: "https://www.youtube.com/watch?v=4BkMWe3au9w", s: 4 },
          { t: "Snap-down plyometric landing drill", u: "https://www.youtube.com/watch?v=0fadxQR0g0c", s: 0 },
          { t: "Snap-down mechanics", u: "https://www.youtube.com/watch?v=x1nBhDLUUi0", s: 15 },
        ],
      },
      {
        title: "Squat jump (phase 2)",
        videos: [
          { t: "How to jump squat", u: "https://www.youtube.com/watch?v=BRfxI2Es2lE", s: 0 },
          { t: "Squat jump with stable landing", u: "https://www.youtube.com/watch?v=d0p-3x84nj0", s: 10 },
          { t: "How to land properly", u: "https://www.youtube.com/watch?v=ORF7BS3ewQo", s: 18 },
        ],
      },
      {
        title: "Countermovement jump (phase 3)",
        bryanVideos: [{ k: "galpin", s: 2537, n: "jump to overhead throw" }],
        videos: [
          { t: "Countermovement jump (CMJ)", u: "https://www.youtube.com/watch?v=m7-AV0mikkI", s: 2 },
          { t: "How to countermovement jump", u: "https://www.youtube.com/watch?v=09yR5a4u-6A", s: 0 },
        ],
      },
    ],
  },
  powerskip: {
    name: "Stationary power skips",
    cat: "Power",
    log: "reps",
    equipment: [],
    muscles: ["glutes", "calves", "hips"],
    bryan: "Power skips are in the speed and power block of Bryan’s 2025 session with Dr. Andy Galpin (2 × 5). Indoors you do them on the spot.",
    how: [
      "Skip on the spot, driving one knee up hard and the opposite arm high.",
      "Push against the floor to lift yourself straight up.",
      "Land softly, then move into the next skip. Do 5 per leg.",
    ],
    easier: "For less noise, drive the knee up quickly with a calf raise, keeping the supporting foot on the floor.",
    bryanVideos: [{ k: "galpin", s: 2188 }],
    videos: [
      { t: "Alternating stationary power skips", u: "https://www.youtube.com/watch?v=_J-HVW83W9Y", s: 5 },
      { t: "Power skips tutorial", u: "https://www.youtube.com/watch?v=Hec1yEEOPYU", s: 15 },
    ],
  },
  heidens: {
    name: "Heidens (skater bounds)",
    cat: "Power",
    log: "reps",
    equipment: [],
    muscles: ["glutes", "adductors", "ankles"],
    bryan: "Bryan’s 2025 Galpin session includes these in the speed and power block (2 × 5). You need about 2 m of clear floor to move sideways.",
    how: [
      "Stand on your right leg, knee slightly bent.",
      "Bound sideways to the left and land on the left leg only.",
      "Stick the landing for 1–2 s: hips back, knee over the toes.",
      "Bound back. Build distance before adding speed.",
    ],
    easier: "For an easier, quieter version, step sideways onto one leg and hold without hopping.",
    bryanVideos: [{ k: "galpin", s: 2447 }],
    videos: [
      { t: "How to lateral bound", u: "https://www.youtube.com/watch?v=niEGdFUQ6sY", s: 5 },
      { t: "Lateral bound (Heiden)", u: "https://www.youtube.com/watch?v=Hc9_FQgIeeg", s: 10 },
    ],
  },
  woodchop: {
    name: "Rotational power: band woodchop",
    cat: "Power",
    log: "reps",
    equipment: ["band", "door"],
    muscles: ["obliques", "core", "shoulders"],
    bryan: "Bryan’s 2025 session has a rotational power slot (2 × 5), and his Bone Density protocol lists medicine-ball throws. Use a fast band chop at home.",
    how: [
      "Anchor a band high on the hinge side of a closed door; stand side-on, an arm’s length away.",
      "Grab with both hands, arms long, and pull diagonally down across your body to the opposite hip.",
      "Turn from your hips and pivot your back foot. Let the turn drive the movement through your arms.",
      "Pull down quickly, then return over 2–3 s. Do the same number of reps on both sides.",
    ],
    easier: "At easier levels, move slowly until you learn the movement.",
    bryanVideos: [
      { k: "galpin", s: 3415, n: "woodchopper" },
      { k: "galpin", s: 2263, n: "rotational throw" },
    ],
    videos: [
      { t: "Band woodchop", u: "https://www.youtube.com/watch?v=73Zyu5g3GQg", s: 2 },
      { t: "Attaching a band to a door safely", u: "https://www.youtube.com/watch?v=fXncsqemFcQ", s: 18 },
    ],
  },
  gobletsquat: {
    name: "Heels-elevated goblet squat (slant-board squat)",
    cat: "Legs & knees",
    log: "load",
    equipment: ["dumbbell", "slant"],
    muscles: ["quads", "glutes"],
    bryan: "Squats open Day 1 of Bryan’s official protocol (3 × 10–15). His own version is on a slant board: 3 × 10–15 in 2023, a slant-board goblet squat for 2 × 5–8 in his 2025 Galpin session.",
    how: [
      "Heels on a slant board or on two small plates or books, feet hip-width.",
      "Hold one dumbbell vertically against your chest.",
      "Sit straight down to full depth with your torso upright. Let your knees travel well past your toes.",
      "Lower over 3 s, then push up to standing.",
    ],
    tips: ["Elbows inside the knees at the bottom.", "Use a full range of motion before adding weight."],
    bryanVideos: [{ k: "w23", s: 866 }, { k: "galpin", s: 2784 }],
    videos: [
      { t: "Heels-elevated goblet squat", u: "https://www.youtube.com/watch?v=nfTnWMX4U3I", s: 21 },
      { t: "Slant-board goblet squat", u: "https://www.youtube.com/watch?v=L19fSqANw8c", s: 3 },
    ],
  },
  poliquin: {
    name: "Poliquin step-up",
    cat: "Legs & knees",
    log: "load",
    equipment: ["step", "slant"],
    muscles: ["quads"],
    bryan: "Bryan does 3 × 10 per leg, learned from Ben Patrick, the Knees-Over-Toes coach working with him on his 2026 dunk project. It builds the inner quad (VMO) and knee resilience.",
    how: [
      "Start on a slant board on the floor, working heel elevated, with the other leg reaching forward. The board alone gives a small heel tap; do not balance a large board on a narrow aerobic step.",
      "Lower the other heel slowly to the floor in front by bending the working knee far over the toes.",
      "Tap the heel lightly, then straighten the working knee to come up.",
      "Hips level; don’t push off the floor leg.",
    ],
    bryanVideos: [{ k: "w23", s: 835 }],
    videos: [
      {
        t: "How to perform a Poliquin (Patrick) step-up",
        u: "https://www.youtube.com/watch?v=HwFbp7irGwg",
        s: 15,
      },
      {
        t: "Knees Over Toes progression: Poliquin step",
        u: "https://www.youtube.com/shorts/WPQnPm-Hl-w",
        s: 0,
      },
    ],
  },
  atg: {
    name: "ATG split squat",
    cat: "Legs & knees",
    log: "load",
    equipment: ["mat", "chair"],
    muscles: ["quads", "hips"],
    bryan: "In Bryan’s routine at 3 × 10. This Knees-Over-Toes exercise combines a deep bend of the front knee with a stretch of the back hip flexor.",
    how: [
      "Long split stance, front foot flat, back knee on a cushion to start.",
      "Slide forward until your hamstring covers your calf and the front knee is well past the toes; front heel stays down.",
      "Keep the back leg long to stretch the hip flexor.",
      "Keep a chair beside you for balance at first; add dumbbells later. The animation shows the hands-free version.",
    ],
    bryanVideos: [{ k: "w23", s: 880 }],
    videos: [
      {
        t: "Knees Over Toes: ATG split squat how-to",
        u: "https://www.youtube.com/watch?v=dm3QVGhqItA",
        s: 20,
      },
      {
        t: "Split squat: beginner-to-advanced progression",
        u: "https://www.youtube.com/shorts/9I06taRrGyI",
        s: 0,
      },
    ],
  },
  nordic: {
    name: "Nordic hamstring curl",
    cat: "Legs & knees",
    log: "reps",
    equipment: ["mat", "anchor"],
    muscles: ["hamstrings"],
    bryan: "Bryan did 1 × 10 in 2023. His 2025 Galpin session includes Nordic curls in the strength block. They protect against hamstring strains.",
    how: [
      "Kneel on a folded mat and hook your heels under a heavy sofa or bed, or use a door Nordic strap.",
      "Keep your body straight from knees to head and squeeze your glutes.",
      "Lower forward as slowly as you can and catch yourself with your hands, like a push-up.",
      "At Returning, push back up with your hands. At higher levels, pull yourself back with your hamstrings.",
    ],
    easier: "Lowering only, over a small range.",
    bryanVideos: [{ k: "w23", s: 904 }, { k: "galpin", s: 3164 }],
    videos: [
      { t: "Nordic curl at home", u: "https://www.youtube.com/watch?v=ie7yQ5k5ZyU", s: 35 },
      { t: "Nordic curl progression", u: "https://www.youtube.com/watch?v=LWfqK8-w1J4", s: 327 },
    ],
  },
  revnordic: {
    name: "Reverse Nordic",
    cat: "Legs & knees",
    log: "reps",
    equipment: ["mat"],
    muscles: ["quads", "hips"],
    bryan: "Bryan: 1 × 10. Strengthens the quads at long length and stretches the hip flexors.",
    how: [
      "Kneel upright on a mat, knees hip-width.",
      "Squeeze the glutes so you form one straight line from knees to head.",
      "Lean back as far as you can control, then return.",
      "Start with a small range of motion and increase it each week.",
    ],
    bryanVideos: [{ k: "w23", s: 940 }],
    videos: [
      { t: "Reverse Nordic (beginner to advanced)", u: "https://www.youtube.com/watch?v=BnlPIJ3d-ck", s: 30 },
      {
        t: "How to perform and progress reverse Nordics",
        u: "https://www.youtube.com/shorts/uJSCxJh-tec",
        s: 0,
      },
    ],
  },
  tibraise: {
    name: "Tibialis raise (wall)",
    cat: "Legs & knees",
    log: "reps",
    equipment: ["wall"],
    muscles: ["shins"],
    bryan: "Bryan does tibialis raises (1 × 25, single-leg in his list). His 2026 dunk notes mention limited ankle dorsiflexion. This exercise works on that movement.",
    how: [
      "Lean your back and hips on a wall, feet 30–60 cm in front, legs straight.",
      "Lift your toes and the fronts of your feet as high as possible.",
      "Pause 1 s, lower slowly.",
      "Feet farther from the wall make it harder; progress to one leg.",
    ],
    bryanVideos: [{ k: "w23", s: 963 }],
    videos: [
      { t: "Wall tibialis raise", u: "https://www.youtube.com/watch?v=O8ZcXfwFuqs", s: 5 },
      { t: "Knees Over Toes wall shin raises", u: "https://www.youtube.com/watch?v=t3JPQkBMjuU", s: 10 },
    ],
  },
  calf: {
    name: "Calf raises: seated + single-leg",
    cat: "Legs & knees",
    log: "load",
    equipment: ["dumbbell", "chair", "step"],
    muscles: ["calves"],
    bryan: "Bryan: seated calf raises 1 × 25. The standing single-leg version adds Achilles preparation for jumping, his own 2026 concern.",
    how: [
      "Seated: sit on a chair, balls of the feet on a book or plate, dumbbells on your knees. Raise the heels high, pause, lower to a full stretch.",
      "Standing single-leg: one foot on a step, hand on a wall. 2 s up, 2 s down, full range.",
    ],
    bryanVideos: [
      { k: "w23", s: 827, n: "seated calf raises" },
      { k: "galpin", s: 3727, n: "standing calf raises" },
    ],
    videos: [
      { t: "Seated dumbbell calf raise", u: "https://www.youtube.com/watch?v=4-slnRXcGDc", s: 4 },
      { t: "Single-leg calf raise", u: "https://www.youtube.com/watch?v=_rKgZMP1X5o", s: 5 },
    ],
    clipVideos: [
      {
        title: "Seated dumbbell calf raise",
        bryanVideos: [{ k: "w23", s: 827, n: "seated calf raises" }],
        videos: [
          { t: "Seated dumbbell calf raise", u: "https://www.youtube.com/watch?v=4-slnRXcGDc", s: 4 },
          { t: "How to do a dumbbell seated calf raise", u: "https://www.youtube.com/watch?v=fFWpWJy8ybU", s: 12 },
          { t: "Seated calf raise form", u: "https://www.youtube.com/watch?v=3ZRe_QpvRPg", s: 0 },
        ],
      },
      {
        title: "Single-leg calf raise on a step",
        bryanVideos: [{ k: "galpin", s: 3727, n: "standing calf raises" }],
        videos: [
          { t: "Single-leg calf raise", u: "https://www.youtube.com/watch?v=_rKgZMP1X5o", s: 5 },
          { t: "Single-leg calf raise (HSS)", u: "https://www.youtube.com/watch?v=qPd73snQfUs", s: 5 },
          { t: "Single-leg calf raise over a step", u: "https://www.youtube.com/watch?v=ZSa8XCt6VLQ", s: 0 },
        ],
      },
    ],
  },
  rdl: {
    name: "Dumbbell Romanian deadlift",
    cat: "Legs & knees",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["hamstrings", "glutes", "lowerBack"],
    bryan: "Bryan’s 2026 dunk training is built on heavy pulls (a 385 lb, about 175 kg, PR on 4 Sep 2026, followed straight away by jumps), and his bone protocol names deadlifts. The dumbbell Romanian deadlift provides the heavy hip-hinge work in this plan.",
    how: [
      "Hold the dumbbells in front of your thighs with your knees slightly bent.",
      "Push the hips back with a flat back, dumbbells sliding close to the legs.",
      "Stop at a strong hamstring stretch, around mid-shin.",
      "Drive the hips forward to stand tall.",
    ],
    tips: [
      "Well trained contrast: 20–30 s after each set, do 3 max countermovement jumps, the way Bryan pairs his heavy pulls with jumps.",
    ],
    videos: [
      { t: "Dumbbell RDL technique for beginners", u: "https://www.youtube.com/watch?v=hQgFixeXdZo", s: 21 },
      { t: "Dumbbell RDL at home", u: "https://www.youtube.com/watch?v=dNQucsVf90I", s: 12 },
    ],
  },
  swing: {
    name: "Dumbbell swing",
    cat: "Legs & knees",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["glutes", "hamstrings", "core"],
    bryan: "Kettlebell swings are in Day 1 of Bryan’s official protocol (3 × 30 s) and in the power training of his bone protocol.",
    how: [
      "Use one dumbbell with a secure two-handed grip, feet a bit wider than the hips. With an adjustable kit, use swings only if its manual permits dynamic use and all fasteners are locked.",
      "Hinge back so the dumbbell passes between your thighs.",
      "Snap the hips forward to float it to chest height; arms stay relaxed.",
      "Drive the movement by snapping your hips forward. Avoid squatting or lifting the weight with your arms. If the kit is not rated for swings, use the farmer’s carry already in this session; Bryan’s template allows either.",
    ],
    videos: [
      { t: "How to: dumbbell swing", u: "https://www.youtube.com/watch?v=Y30kFfgW-bY", s: 10 },
      { t: "Hip hinge: preparation for the swing", u: "https://www.youtube.com/watch?v=aXnMzbV0vMs", s: 15 },
    ],
  },
  lunge: {
    name: "Reverse lunge",
    cat: "Legs & knees",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["quads", "glutes"],
    bryan: "Lunges open the Friday strength session in Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026) and Day 5 of his official protocol (3 × 10–12).",
    how: [
      "Stand tall, dumbbells at your sides (bodyweight first).",
      "Step one foot back and lower until the back knee nearly touches the floor.",
      "Front knee may travel over the toes; torso tall.",
      "Push through the front foot to return. Alternate legs or finish one side first.",
    ],
    videos: [
      {
        t: "Dumbbell reverse lunges: tutorial and tips",
        u: "https://www.youtube.com/watch?v=MyqQRJ2lW7Q",
        s: 10,
      },
      { t: "Dumbbell reverse lunge tutorial", u: "https://www.youtube.com/watch?v=MpfeGnBFEo8", s: 2 },
    ],
  },
  stepup: {
    name: "Step-up (low step, drive)",
    cat: "Legs & knees",
    log: "load",
    equipment: ["step", "dumbbell"],
    muscles: ["quads", "glutes"],
    bryan: "Bryan’s Friday session in his newest weekly template (exercise newsletter, 4 Oct 2026) includes step-ups at 3 × 10 per leg. His bone protocol also uses box step-ups for power training.",
    how: [
      "Use a stable aerobic step or stair, starting at its lowest secure height. A low step is the home adaptation of Bryan’s step-up.",
      "Place your whole foot on the step. Push through that leg until you stand tall.",
      "Don’t push off the back foot.",
      "Lower slowly. Drive up under control; do not jump onto an aerobic step or stack loose risers or furniture.",
    ],
    videos: [
      { t: "How to do a dumbbell step-up", u: "https://www.youtube.com/watch?v=DxUNi119Qzs", s: 0 },
      { t: "Choosing the box height", u: "https://www.youtube.com/watch?v=xYQsyViNwi4", s: 15 },
    ],
    clipVideos: [
      {
        title: "Step-up onto a low aerobic step",
        videos: [
          { t: "Bodyweight step-up", u: "https://www.youtube.com/watch?v=wfhXnLILqdk", s: 0 },
          { t: "Choosing the box height", u: "https://www.youtube.com/watch?v=xYQsyViNwi4", s: 15 },
          { t: "Step-up technique and common mistakes", u: "https://www.youtube.com/watch?v=WCFCdxzFBa4", s: 18 },
        ],
      },
      {
        title: "Step-up holding dumbbells",
        videos: [
          { t: "How to do a dumbbell step-up", u: "https://www.youtube.com/watch?v=DxUNi119Qzs", s: 0 },
          { t: "Dumbbell step-up demonstration", u: "https://www.youtube.com/watch?v=9ZknEYboBOQ", s: 3 },
          { t: "Dumbbell step-ups guide", u: "https://www.youtube.com/watch?v=7AtIjR-QqVA", s: 6 },
        ],
      },
    ],
  },
  chinup: {
    name: "Chin-ups and pull-ups",
    cat: "Upper body",
    log: "load",
    equipment: ["bar", "band"],
    muscles: ["back", "biceps", "grip"],
    bryan: "Bryan does both. His 2025 Galpin session includes them in the strength block at 2 × 5–8. His official beginner list uses assisted pull-ups.",
    how: [
      "Pull-up: palms away, slightly wider than shoulders. Chin-up: palms facing you, shoulder-width.",
      "Start from a full hang; pull your chest to the bar, elbows driving down toward the ribs.",
      "Lower in 2–3 s to a full hang.",
      "If you cannot do 5 clean reps, use a band for assistance, or jump up and lower over 5 s (negatives).",
    ],
    bryanVideos: [
      { k: "w23", s: 1007, n: "pull-ups" },
      { k: "w23", s: 1033, n: "chin-ups" },
      { k: "galpin", s: 3024, n: "reverse pull-ups" },
    ],
    videos: [
      { t: "Band-assisted pull-ups: 0 to 10", u: "https://www.youtube.com/watch?v=Dx6DNiOklZI", s: 212 },
      { t: "How to do a negative pull-up", u: "https://www.youtube.com/watch?v=gbPURTSxQLY", s: 8 },
    ],
    clipVideos: [
      {
        title: "Pull-up (palms away)",
        bryanVideos: [{ k: "w23", s: 1007, n: "pull-ups" }],
        videos: [
          { t: "How to do pull-ups", u: "https://www.youtube.com/watch?v=PHdHnZcbsB8", s: 0 },
          { t: "Band-assisted pull-ups: setup and reps", u: "https://www.youtube.com/watch?v=Dx6DNiOklZI", s: 212 },
          { t: "How to do a negative pull-up", u: "https://www.youtube.com/watch?v=gbPURTSxQLY", s: 8 },
        ],
      },
      {
        title: "Chin-up (palms facing you)",
        bryanVideos: [
          { k: "w23", s: 1033, n: "chin-ups" },
          { k: "galpin", s: 3024, n: "reverse pull-ups" },
        ],
        videos: [
          { t: "Proper chin-up form", u: "https://www.youtube.com/watch?v=mRy9m2Q9_1I", s: 5 },
          { t: "Chin-up technique guide", u: "https://www.youtube.com/watch?v=e1YSApl-QcM", s: 24 },
        ],
      },
    ],
  },
  pushup: {
    name: "Push-ups",
    cat: "Upper body",
    log: "reps",
    equipment: ["mat"],
    muscles: ["chest", "triceps", "shoulders"],
    bryan: "Day 1 of Bryan’s official protocol and his newest template: 3 × 8–12.",
    how: [
      "Hands under the shoulders, body in one line (squeeze glutes and abs).",
      "Elbows about 45° from the body.",
      "Lower until the chest is a fist above the floor, then press to full lockout.",
      "Too hard: hands on a sofa or bench. Too easy: 3 s down, or feet raised.",
    ],
    bryanVideos: [{ k: "galpin", s: 3594, n: "spiderman push-ups" }],
    videos: [
      { t: "How to do a push-up correctly", u: "https://www.youtube.com/watch?v=k2YnU7UFAaE", s: 18 },
      { t: "Push-up form", u: "https://www.youtube.com/watch?v=s1X8e4JFdbE", s: 91 },
    ],
  },
  row: {
    name: "One-arm dumbbell row",
    cat: "Upper body",
    log: "load",
    equipment: ["dumbbell", "bench"],
    muscles: ["back", "biceps"],
    bryan: "Day 1 of Bryan’s official protocol (3 × 10–12). In the Galpin session he does a harder version balancing on one leg; keep both feet down for now.",
    how: [
      "Rest one hand and one knee on a chair or bed. Keep your back flat and let the dumbbell hang.",
      "Pull the dumbbell toward your hip, elbow close to the body.",
      "Squeeze for 1 s, then lower to a full stretch.",
      "Keep your torso still.",
    ],
    bryanVideos: [
      { k: "galpin", s: 2898, n: "single-arm bent row" },
      { k: "galpin", s: 3791, n: "chest-supported row" },
    ],
    videos: [
      { t: "One-arm dumbbell row", u: "https://www.youtube.com/watch?v=Qx2f4YwJAu4", s: 8 },
      { t: "One-arm dumbbell row on a bench", u: "https://www.youtube.com/watch?v=PgpQ4-jHiq4", s: 10 },
    ],
  },
  ohpress: {
    name: "Standing dumbbell overhead press",
    cat: "Upper body",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["shoulders", "triceps"],
    bryan: "In the Friday session of Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026) and Day 5 of his official protocol (3 × 10–12).",
    how: [
      "Stand tall, dumbbells at shoulder height, palms facing each other, elbows slightly forward.",
      "Brace abs and glutes; press straight up until the arms are straight.",
      "Head moves slightly back to let the dumbbells pass, then forward under them.",
      "Lower in 2 s. Don’t lean back.",
    ],
    bryanVideos: [{ k: "galpin", s: 3054, n: "1-arm overhead press" }],
    videos: [
      {
        t: "Standing dumbbell overhead press: 3 steps",
        u: "https://www.youtube.com/watch?v=bj53-0DYKFo",
        s: 6,
      },
      { t: "Dumbbell overhead press: how to", u: "https://www.youtube.com/watch?v=Did01dFR3Lk", s: 4 },
    ],
  },
  floorpress: {
    name: "Dumbbell floor press",
    cat: "Upper body",
    log: "load",
    equipment: ["dumbbell", "mat"],
    muscles: ["chest", "triceps"],
    bryan: "The chest press in the Friday session of Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026) and Day 5 of his official protocol (3 × 10–12). The floor replaces the bench.",
    how: [
      "Lie on your back, knees bent, a dumbbell in each hand beside your chest.",
      "Elbows about 45° from the body.",
      "Press up until the arms are straight; lower until the upper arms touch the floor lightly.",
      "Pause on the floor for 1 s without bouncing.",
    ],
    bryanVideos: [{ k: "galpin", s: 3345, n: "hollow dumbbell press" }],
    videos: [
      { t: "How to do a dumbbell floor press", u: "https://www.youtube.com/watch?v=T0Y3OBF1bNI", s: 8 },
      {
        t: "Dumbbell floor press: correct technique",
        u: "https://www.youtube.com/watch?v=-cpfMqSGxvg",
        s: 10,
      },
    ],
  },
  triceps: {
    name: "Overhead dumbbell triceps extension",
    cat: "Upper body",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["triceps"],
    bryan: "Bryan: 1 × 25 with a 10 lb (≈4.5 kg) dumbbell, holding 1 s at the top.",
    how: [
      "Hold one dumbbell with both hands overhead, elbows pointing forward.",
      "Lower it behind your head, upper arms still.",
      "Extend fully and hold 1 s at the top.",
      "Ribs down; don’t arch the lower back.",
    ],
    bryanVideos: [{ k: "w23", s: 198 }],
    videos: [
      { t: "Two-arm overhead triceps extension", u: "https://www.youtube.com/watch?v=IJ6J7EKprsc", s: 6 },
      { t: "Dumbbell overhead triceps extension", u: "https://www.youtube.com/watch?v=xbNm9fRoUTw", s: 3 },
    ],
  },
  curl: {
    name: "Dumbbell biceps curl",
    cat: "Upper body",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["biceps"],
    bryan: "Biceps curls are on Bryan’s exercise list.",
    how: [
      "Stand tall, elbows pinned at your sides.",
      "Curl up while turning the palms up; squeeze at the top.",
      "Lower over 2–3 s and keep your body still.",
    ],
    bryanVideos: [
      { k: "w23", s: 1042 },
      { k: "galpin", s: 3688, n: "incline curls" },
    ],
    videos: [{ t: "How to do a dumbbell biceps curl", u: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo", s: 5 }],
  },
  fly: {
    name: "Band butterfly",
    cat: "Upper body",
    log: "reps",
    equipment: ["band", "door"],
    muscles: ["chest"],
    bryan: "Bryan does “butterfly pulls” with a resistance band, 1 × 15. Most write-ups describe it as a band chest fly; watch his clip to copy his exact version.",
    how: [
      "Anchor a band at chest height behind you (door hinge side) or wrap it around your upper back.",
      "Arms out, elbows slightly bent.",
      "Bring the hands together in front of the chest as if hugging a tree; squeeze 1 s.",
      "Return slowly.",
    ],
    bryanVideos: [{ k: "w23", s: 244 }],
    videos: [
      { t: "Standing chest fly with a band", u: "https://www.youtube.com/watch?v=8zayKW1skQg", s: 10 },
      { t: "Mid-door anchored chest fly", u: "https://www.youtube.com/watch?v=7l8HfDNXY6E", s: 25 },
    ],
  },
  farmer: {
    name: "Farmer’s carry",
    cat: "Upper body",
    log: "carry",
    equipment: ["dumbbell"],
    muscles: ["grip", "core", "upperBack"],
    bryan: "Farmer’s walks are in Day 1 of Bryan’s official protocol (3 × 30 s), and in Sep 2025 he posted that grip strength predicts longevity better than being jacked.",
    how: [
      "Hold a heavy dumbbell in each hand and stand tall using the string cue. Keep your shoulders down and back.",
      "Walk around the room with slow, steady steps for 30–40 s.",
      "Don’t let the dumbbells bang your legs or the shoulders roll forward.",
    ],
    videos: [
      {
        t: "Dumbbell farmer’s walk: form and mistakes",
        u: "https://www.youtube.com/watch?v=62v48abT5-Y",
        s: 7,
      },
      { t: "How to do a farmer’s walk", u: "https://www.youtube.com/watch?v=8OtwXwrJizk", s: 4 },
    ],
  },
  deadhang: {
    name: "Dead hang (passive & active)",
    cat: "Upper body",
    log: "hold",
    equipment: ["bar"],
    muscles: ["forearms", "back", "shoulders"],
    bryan: "Bryan measures grip strength as a primary longevity biomarker (scoring ~60 kg, top 5% of all ages). Hanging decompresses the spine and builds forearm grip endurance.",
    how: [
      "Grip the pull-up bar with an overhand grip, slightly wider than shoulder-width.",
      "Allow your body to hang freely: let gravity gently stretch your shoulders and decompress the spine (passive hang).",
      "To switch to active hang, pull your shoulder blades down and slightly back away from your ears without bending your elbows.",
      "Breathe slowly and rhythmically; hold for the target duration without swinging.",
    ],
    easier: "Keep your toes lightly resting on the floor or a step to support 20–30% of your body weight.",
    tips: [
      "Decompress after spinal loading exercises like squats, RDLs and heavy carries.",
      "Build up cumulative time: 2–3 sets of 20–30 s is great for beginners; advance toward 60 s continuous.",
    ],
    videos: [
      { t: "Passive vs active hang tutorial", u: "https://www.youtube.com/watch?v=ny4AVinFBmI", s: 18 },
      { t: "How to do an active hang", u: "https://www.youtube.com/watch?v=0_YZc2yuKkE", s: 2 },
    ],
    clipVideos: [
      {
        title: "Passive dead hang",
        videos: [
          { t: "Passive dead hang tutorial", u: "https://www.youtube.com/watch?v=ny4AVinFBmI", s: 18 },
          { t: "Passive vs active hang key differences", u: "https://www.youtube.com/watch?v=7DcNQ_bDaME", s: 3 },
          { t: "Build hanging from zero (beginner progression)", u: "https://www.youtube.com/watch?v=no_ZdiJsLu4", s: 20 },
        ],
      },
      {
        title: "Active dead hang",
        videos: [
          { t: "How to do an active hang", u: "https://www.youtube.com/watch?v=0_YZc2yuKkE", s: 2 },
          { t: "Active hang technique and scapular pull", u: "https://www.youtube.com/watch?v=ny4AVinFBmI", s: 95 },
          { t: "Dead hang vs active hang explained", u: "https://www.youtube.com/watch?v=GwMTIwfOPQE", s: 30 },
        ],
      },
    ],
  },
  legraise: {
    name: "Hanging knee / leg raise",
    cat: "Core & stability",
    log: "reps",
    equipment: ["bar"],
    muscles: ["core"],
    bryan: "Bryan: leg raises 1 × 50 on a captain’s chair. Your pull-up bar replaces the station.",
    how: [
      "Hang from the bar with the shoulders pulled slightly down (active hang).",
      "Raise the knees toward the chest (easier levels), later straight legs to hip height or higher.",
      "Curl the pelvis up at the top; no swinging.",
      "Lower slowly. Collect the reps in as few sets as you can.",
    ],
    easier: "Lying leg raises on the floor.",
    bryanVideos: [{ k: "w23", s: 703 }],
    videos: [
      { t: "Hanging knee raise / leg lift", u: "https://www.youtube.com/watch?v=KhPTiWP6lB4", s: 12 },
      { t: "Hanging leg raise progressions", u: "https://www.youtube.com/watch?v=EYe6dc_i4L0", s: 69 },
    ],
    clipVideos: [
      {
        title: "Hanging knee raise",
        videos: [
          { t: "Hanging knee raise tutorial", u: "https://www.youtube.com/watch?v=l7OroezzX9k", s: 3 },
          { t: "Hanging knee raise / leg lift", u: "https://www.youtube.com/watch?v=KhPTiWP6lB4", s: 12 },
          { t: "Hanging knee raise progression", u: "https://www.youtube.com/watch?v=EYe6dc_i4L0", s: 233 },
        ],
      },
      {
        title: "Hanging straight-leg raise",
        bryanVideos: [{ k: "w23", s: 703 }],
        videos: [
          { t: "How to perform hanging straight-leg raises", u: "https://www.youtube.com/watch?v=2n4UqRIJyk4", s: 0 },
          { t: "Hanging leg raise technique", u: "https://www.youtube.com/watch?v=EYe6dc_i4L0", s: 69 },
          { t: "Hanging leg raise tutorial", u: "https://www.youtube.com/watch?v=_jLskVdzS4o", s: 5 },
        ],
      },
    ],
  },
  backext: {
    name: "Floor back extension",
    cat: "Core & stability",
    log: "load",
    equipment: ["mat"],
    muscles: ["lowerBack", "glutes"],
    bryan: "Bryan: back extensions 1 × 25 on a 45° bench holding a 20 kg plate. This is the floor version.",
    how: [
      "Lie face down, hands lightly at your temples or arms along your sides.",
      "Squeeze your glutes, then lift your chest a few centimetres.",
      "Hold 1–2 s and lower slowly. Look at the floor so the neck stays long.",
    ],
    tips: ["Progress with slower reps, then hold a light dumbbell at your chest."],
    bryanVideos: [{ k: "w23", s: 432 }],
    videos: [
      { t: "Prone floor back extension", u: "https://www.youtube.com/watch?v=UAr1x4W4VLc", s: 6 },
      { t: "Superman exercise tutorial", u: "https://www.youtube.com/watch?v=z6PJMT2y8GQ", s: 5 },
    ],
  },
  sidebend: {
    name: "Dumbbell side bend",
    cat: "Core & stability",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["obliques"],
    bryan: "Bryan trains obliques for 1 × 25: on the hyperextension bench in 2023, as oblique side bends in his 2025 conditioning block.",
    how: [
      "One dumbbell in one hand, the other hand on your waist.",
      "Bend straight to the side, without twisting or leaning forward.",
      "Squeeze the opposite side to return upright. Finish all reps, then switch sides.",
    ],
    bryanVideos: [
      { k: "w23", s: 457 },
      { k: "galpin", s: 3637, n: "oblique side bends" },
    ],
    videos: [
      {
        t: "How to do dumbbell side bends correctly",
        u: "https://www.youtube.com/watch?v=SAc_r42va6g",
        s: 8,
      },
    ],
  },
  pallof: {
    name: "Band Pallof press",
    cat: "Core & stability",
    log: "reps",
    equipment: ["band", "door"],
    muscles: ["core", "obliques"],
    bryan: "Bryan does the Pallof press in his 2025 session with Dr. Andy Galpin. It trains the trunk to resist twisting.",
    how: [
      "Anchor a band at chest height on the hinge side of a closed door; stand side-on, a step away.",
      "Hold the band at your sternum with both hands, knees soft.",
      "Press the hands straight out and hold 2 s without letting the band turn you.",
      "Bring your hands back slowly. Do the same number of reps on both sides.",
    ],
    bryanVideos: [{ k: "galpin", s: 2824 }],
    videos: [
      { t: "How to do a Pallof press", u: "https://www.youtube.com/watch?v=LA6Uc5yIV1c", s: 65 },
      { t: "Standing band Pallof press", u: "https://www.youtube.com/watch?v=AH_QZLm_0-s", s: 5 },
    ],
  },
  plank: {
    name: "Plank",
    cat: "Core & stability",
    log: "hold",
    equipment: ["mat"],
    muscles: ["core"],
    bryan: "Planks are in Day 1 of Bryan’s official protocol (3 × 20–30 s).",
    how: [
      "Forearms on the floor, elbows under the shoulders.",
      "Body straight; squeeze the glutes and brace the abs.",
      "Look at the floor and breathe normally.",
    ],
    videos: [{ t: "Perfect plank: fix common mistakes", u: "https://www.youtube.com/watch?v=rzHRA7S96_E", s: 12 }],
  },
  sideplank: {
    name: "Side plank",
    cat: "Core & stability",
    log: "hold",
    equipment: ["mat"],
    muscles: ["obliques", "core"],
    bryan: "In the Friday session of Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026) and Day 5 of his official protocol (20–30 s per side).",
    how: [
      "On one forearm, elbow under the shoulder, feet stacked (bend your knees if that feels easier).",
      "Lift the hips into a straight line and hold.",
    ],
    videos: [{ t: "Side plank: form and 5 progressions", u: "https://www.youtube.com/watch?v=0M-erHBl48U", s: 15 }],
  },
  slrdl: {
    name: "Single-leg RDL / toe touch",
    cat: "Core & stability",
    log: "reps",
    equipment: ["wall"],
    muscles: ["hamstrings", "glutes", "ankles"],
    bryan: "Bryan’s official protocol includes both versions in its stability exercises: the single-leg RDL and single-leg toe touch.",
    how: [
      "Stand on one leg, knee soft, other leg straight behind you with the toe just off the floor.",
      "Hinge forward, reaching the opposite hand toward the standing foot; the back leg rises as a counterweight.",
      "Hips stay square to the floor. Stand back up by squeezing the glute.",
      "Keep a wall within reach at first; the animation shows the hands-free version.",
    ],
    videos: [
      {
        t: "Single-leg toe touches for balance (beginners)",
        u: "https://www.youtube.com/watch?v=dUJf1IuITAo",
        s: 5,
      },
      { t: "Bodyweight single-leg RDL", u: "https://www.youtube.com/watch?v=DPFnfAUCvTA", s: 5 },
    ],
    clipVideos: [
      {
        title: "Single-leg toe touch",
        videos: [
          {
            t: "Single-leg toe touches for balance (beginners)",
            u: "https://www.youtube.com/watch?v=dUJf1IuITAo",
            s: 5,
          },
          { t: "Single-leg toe touch demonstration", u: "https://www.youtube.com/watch?v=oBU22OqbIag", s: 3 },
        ],
      },
      {
        title: "Single-leg RDL",
        videos: [
          { t: "Bodyweight single-leg RDL", u: "https://www.youtube.com/watch?v=DPFnfAUCvTA", s: 5 },
          {
            t: "Bodyweight single-leg Romanian deadlift demo",
            u: "https://www.youtube.com/watch?v=JQZqPsmeesc",
            s: 2,
          },
          { t: "Single-leg deadlift bodyweight", u: "https://www.youtube.com/watch?v=SHY8-2cErd0", s: 3 },
        ],
      },
    ],
  },
  birddog: {
    name: "Bird dog",
    cat: "Core & stability",
    log: "reps",
    equipment: ["mat"],
    muscles: ["core", "lowerBack"],
    bryan: "One of the stability exercises in Bryan’s official protocol.",
    how: [
      "On hands and knees, hands under the shoulders, knees under the hips, back flat.",
      "Reach one arm forward and the opposite leg back until both are level with the body.",
      "Hold for 2 s without tilting your hips, then return and switch sides.",
    ],
    videos: [
      { t: "How to do a bird dog", u: "https://www.youtube.com/watch?v=KA0ekfSePrQ", s: 15 },
      { t: "Bird dog: mistakes and variations", u: "https://www.youtube.com/watch?v=dDMvch2Z9yY", s: 18 },
    ],
  },
  deadbug: {
    name: "Dead bug",
    cat: "Core & stability",
    log: "reps",
    equipment: ["mat"],
    muscles: ["core"],
    bryan: "One of the stability exercises in Bryan’s official protocol.",
    how: [
      "Lie on your back, arms pointing at the ceiling, hips and knees bent at 90°.",
      "Press the lower back gently into the floor and keep it there.",
      "Slowly lower one arm overhead and the opposite leg toward the floor, then return.",
      "Alternate sides; move slowly and breathe out as you extend.",
    ],
    videos: [
      { t: "How to do the dead bug correctly", u: "https://www.youtube.com/watch?v=-gRN_JyVTLY", s: 124 },
      { t: "Core exercise: dead bug", u: "https://www.youtube.com/watch?v=g_BYB0R-4Ws", s: 10 },
    ],
  },
  shouldertap: {
    name: "Plank shoulder taps",
    cat: "Core & stability",
    log: "reps",
    equipment: ["mat"],
    muscles: ["core", "shoulders"],
    bryan: "One of the stability exercises in Bryan’s official protocol.",
    how: [
      "High plank, hands under the shoulders, feet a bit wider than the hips.",
      "Lift one hand and tap the opposite shoulder without the hips rocking.",
      "Alternate slowly. Wider feet make it easier.",
    ],
    videos: [
      {
        t: "Plank shoulder taps: core stability and control",
        u: "https://www.youtube.com/watch?v=NV55raYCP0E",
        s: 4,
      },
      { t: "Pure plank: shoulder taps", u: "https://www.youtube.com/watch?v=88RyDleXGi8", s: 3 },
      {
        t: "How to properly do a plank with shoulder taps",
        u: "https://www.youtube.com/watch?v=gKA5LBy7WAI",
        s: 12,
      },
    ],
  },
  jefferson: {
    name: "Jefferson curl",
    cat: "Core & stability",
    log: "load",
    equipment: ["step", "dumbbell"],
    muscles: ["back", "hamstrings"],
    bryan: "Part of the flexibility set in Bryan’s 2025 session, next to the big-toe, couch and butterfly stretches.",
    how: [
      "Stand on a step, legs straight, with a light weight (none at New to training).",
      "Tuck your chin and roll down one vertebra at a time toward your toes.",
      "Hang 2–3 s, then roll up from the bottom, head last.",
      "Move slowly and keep the weight light. Do not try to lift heavy on this exercise.",
    ],
    videos: [
      { t: "Jefferson curl progressions", u: "https://www.youtube.com/watch?v=CscPML4QWfU", s: 570 },
      { t: "The Jefferson curl explained", u: "https://www.youtube.com/watch?v=ZWaI1jrtzOk", s: 15 },
    ],
  },
  shortint: {
    name: "Short intervals (20 s bursts)",
    cat: "Cardio (indoor)",
    log: "intervals",
    equipment: ["step"],
    muscles: ["heart", "quads"],
    bryan: "Tuesday in Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026): 8 rounds of 20 s efforts with 40 s rest for beginners, then moderate cardio. Day 2 of his official protocol uses 20 s all-out with 20 s rest. These bursts are where most of your near-max minutes come from.",
    how: [
      "Pick one or two moves from “Indoor interval moves”.",
      "Work hard for 20 s, then march gently during the rest. Record the number of rounds.",
      "At New to training and Returning, keep the pace brisk and below all-out effort. At Active, work hard. At Well trained, use all-out effort.",
    ],
    bryanVideos: [
      { k: "w23", s: 1063, n: "HIIT intervals" },
      { k: "pillars", s: 467, n: "high-intensity cardio" },
    ],
    videos: [
      { t: "Fast high knees (20 s hard burst)", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
      { t: "Marching in place (recovery interval)", u: "https://www.youtube.com/watch?v=Ac8M_Osjy6s", s: 0 },
    ],
    clipVideos: [
      {
        title: "20 s hard: fast high knees",
        bryanVideos: [
          { k: "w23", s: 1063, n: "HIIT intervals" },
          { k: "pillars", s: 467, n: "high-intensity cardio" },
        ],
        videos: [
          { t: "How to do high knees", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
          { t: "Alternating step-up hops (hard burst option)", u: "https://www.youtube.com/watch?v=TGtwCyVqfvM", s: 4 },
        ],
      },
      {
        title: "Easy: march on the spot",
        videos: [
          { t: "Marching in place", u: "https://www.youtube.com/watch?v=Ac8M_Osjy6s", s: 0 },
          {
            t: "Marching in place (physical therapist demo)",
            u: "https://www.youtube.com/watch?v=u1gmWFvEluM",
            s: 15,
          },
        ],
      },
    ],
  },
  norwegian: {
    name: "Norwegian 4×4",
    cat: "Cardio (indoor)",
    log: "intervals",
    equipment: ["step"],
    muscles: ["heart", "quads"],
    bryan: "Thursday in Bryan’s newest weekly template (exercise newsletter, 4 Oct 2026): 4 rounds of 4 min at 85–95% of max heart rate with 3 min at 60–70% between, at a hard, controlled pace below an all-out sprint, starting with 2–3 rounds if four is too much. Bryan’s own variant (X, Dec 2024) is 4 min all-out with 4 min rest.",
    how: [
      "Warm up gently for 10 min, building to about {hr:71}.",
      "4 min hard: reach {hr:85-95} and hold an even pace you could repeat four times.",
      "3 min easy: march or step slowly ({hr:60-70}). Keep moving.",
      "Repeat, then 5 min easy. Indoors, change the move every minute so the legs don’t fail before the heart and lungs.",
    ],
    tips: ["If round 4 falls apart, start slower next time. Don’t sprint the first minute."],
    bryanVideos: [
      { k: "pillars", s: 467, n: "4×4 protocol" },
      { k: "galpin", s: 3941, n: "4 min HIIT" },
    ],
    videos: [
      { t: "4×4 timing and heart rates explained", u: "https://www.youtube.com/watch?v=EirgwA1FXUs", s: 40 },
      { t: "Alternating step-ups (minute 1)", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
    ],
    clipVideos: [
      {
        title: "4×4 hard, minute 1: fast step-ups",
        bryanVideos: [
          { k: "pillars", s: 467, n: "4×4 protocol" },
          { k: "galpin", s: 3941, n: "4 min HIIT" },
        ],
        videos: [
          { t: "Alternating step-ups", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
          { t: "4×4 timing and heart rates explained", u: "https://www.youtube.com/watch?v=EirgwA1FXUs", s: 40 },
        ],
      },
      {
        title: "Minute 2: high knees",
        videos: [
          { t: "How to do high knees", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
          { t: "High knee cardio drill", u: "https://www.youtube.com/watch?v=ymdS7tM0zws", s: 2 },
        ],
      },
      {
        title: "Minute 3: jumping jacks",
        videos: [
          { t: "How to do jumping jacks", u: "https://www.youtube.com/watch?v=ttVmvj88Zwc", s: 0 },
          { t: "Low-impact step jacks (quiet option)", u: "https://www.youtube.com/watch?v=qhy7VjMqsck", s: 2 },
        ],
      },
      {
        title: "Minute 4: mountain climbers",
        videos: [
          { t: "How to do mountain climbers", u: "https://www.youtube.com/watch?v=kLh-uczlPLg", s: 0 },
          {
            t: "Mountain climbers: 3 steps to proper form",
            u: "https://www.youtube.com/watch?v=gW-q50V6Z_0",
            s: 8,
          },
        ],
      },
    ],
  },
  indoorhiit: {
    name: "Indoor interval moves",
    cat: "Cardio (indoor)",
    log: "none",
    equipment: ["step", "mat"],
    muscles: ["heart"],
    bryan: "Bryan’s published options for bodyweight HIIT: jumping jacks, high knees, mountain climbers, burpees without the push-up, jump squats, plus marching and bodyweight squats for beginners.",
    how: [
      "Fast step-ups on a stair or step are the quietest option and easiest to sustain for 4 minutes.",
      "High knees on the spot, driving the arms.",
      "Mountain climbers, hips level.",
      "Jumping jacks, or side-step jacks for a quiet version.",
      "Burpees without push-up (step back and forward for a quiet version).",
    ],
    tips: ["For the 4×4, rotate step-ups → high knees → jacks → climbers, one minute each."],
    videos: [
      { t: "Alternating step-ups", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
      { t: "High knees", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
      {
        t: "Mountain climbers: 3 steps to proper form",
        u: "https://www.youtube.com/watch?v=gW-q50V6Z_0",
        s: 8,
      },
      { t: "Jumping jacks", u: "https://www.youtube.com/watch?v=ttVmvj88Zwc", s: 0 },
      { t: "No-push-up burpee", u: "https://www.youtube.com/watch?v=CqJ947Bj2Zg", s: 4 },
    ],
    clipVideos: [
      {
        title: "Fast step-ups",
        videos: [
          { t: "Alternating step-ups", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
          { t: "Alternating step-up hops", u: "https://www.youtube.com/watch?v=TGtwCyVqfvM", s: 4 },
        ],
      },
      {
        title: "High knees",
        videos: [
          { t: "How to do high knees", u: "https://www.youtube.com/watch?v=sTvekaq6vOU", s: 0 },
          { t: "High knee exercise and warm-up", u: "https://www.youtube.com/watch?v=ymdS7tM0zws", s: 2 },
        ],
      },
      {
        title: "Mountain climbers",
        videos: [
          { t: "How to do mountain climbers", u: "https://www.youtube.com/watch?v=kLh-uczlPLg", s: 0 },
          {
            t: "Mountain climbers: 3 steps to proper form",
            u: "https://www.youtube.com/watch?v=gW-q50V6Z_0",
            s: 8,
          },
        ],
      },
      {
        title: "Jumping jacks",
        videos: [
          { t: "How to do jumping jacks", u: "https://www.youtube.com/watch?v=ttVmvj88Zwc", s: 0 },
          { t: "Jumping jack proper form (NASM)", u: "https://www.youtube.com/watch?v=uLVt6u15L98", s: 0 },
          { t: "Low-impact step jacks (quiet option)", u: "https://www.youtube.com/watch?v=qhy7VjMqsck", s: 2 },
        ],
      },
      {
        title: "Burpee without push-up",
        videos: [
          { t: "No-push-up burpee", u: "https://www.youtube.com/watch?v=CqJ947Bj2Zg", s: 4 },
          { t: "No-push-up burpee demo", u: "https://www.youtube.com/watch?v=HfV1UBKzQTo", s: 0 },
          { t: "Squat thrust (burpee without push-up)", u: "https://www.youtube.com/watch?v=QOk0tYKehFw", s: 0 },
        ],
      },
    ],
  },
  vigorous: {
    name: "Controlled vigorous cardio (indoors)",
    cat: "Cardio (indoor)",
    log: "cardio",
    intensity: "hard",
    equipment: ["step"],
    muscles: ["heart", "quads"],
    bryan: "Bryan targets at least 75 min of high-intensity cardio a week, with only about 10 min near maximum effort. This home block supplies controlled vigorous minutes alongside his Tuesday bursts and Thursday 4×4; its duration is set for this home plan and differs from the sessions in his sample week.",
    how: [
      "Warm up first. Use continuous low-step step-ups, fast marching, high knees or step jacks, changing the move before local muscle fatigue spoils your form.",
      "Follow your level’s heart-rate target, roughly {hr:80-90} at the higher levels. You should be breathing hard and able to say only a few words. Hold an even pace without sprinting.",
      "Log only the minutes at the prescribed effort. Pause or slow down when needed; easy recovery does not count as vigorous time.",
      "Finish with the scheduled Zone 2 or cool-down. Use the quiet versions of the indoor interval moves when needed.",
    ],
    tips: ["Keep the effort controlled. Save near-max efforts for the short bursts and the ends of the 4×4 rounds."],
    bryanVideos: [{ k: "pillars", s: 467, n: "high-intensity cardio" }],
    videos: [
      { t: "Alternating step-ups", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
      { t: "Low-impact step jacks", u: "https://www.youtube.com/watch?v=qhy7VjMqsck", s: 2 },
    ],
  },
  zone2: {
    name: "Zone 2 cardio (indoors)",
    cat: "Cardio (indoor)",
    log: "cardio",
    equipment: ["step"],
    muscles: ["heart"],
    bryan: "Bryan’s protocol: at least 150 min a week of moderate activity (Zone 2) during which you can hold a conversation.",
    how: [
      "Heart rate {hr:60-70} (60–70% of max). You can speak in full sentences.",
      "Main indoor option: continuous step-ups on a stable low aerobic step, switching the lead leg every minute. March instead if stepping raises your effort too much.",
      "Mix in brisk marching with arm swings or side steps. A skipping rope is an optional home alternative only while you can still talk comfortably; slow down or march if it pushes you above Zone 2.",
      "Music, a podcast or a series helps; Bryan rotates music, books and podcasts too.",
    ],
    tips: ["When you get the chance, a brisk walk, hike or bike ride outside counts the same."],
    bryanVideos: [{ k: "pillars", s: 362, n: "low-intensity cardio" }],
    videos: [
      { t: "Continuous alternating step-ups", u: "https://www.youtube.com/watch?v=RbRFci8p1m8", s: 5 },
      { t: "Basic step cardio (low-impact step workout)", u: "https://www.youtube.com/watch?v=A0dUuUTe4jQ", s: 35 },
      { t: "Brisk marching in place", u: "https://www.youtube.com/watch?v=u1gmWFvEluM", s: 15 },
    ],
  },
  couch: {
    name: "Couch stretch",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat", "sofa"],
    muscles: ["quads", "hips"],
    bryan: "On Bryan’s stretch list (about 30 s per side) and in his 2025 flexibility set. Stretches the muscles tightened by hours of sitting.",
    how: [
      "Kneel with your back knee against a sofa or wall, shin running up it.",
      "Other foot forward in a lunge.",
      "Squeeze the back glute and tuck the pelvis; stay upright.",
    ],
    bryanVideos: [{ k: "w23", s: 510 }],
    videos: [
      { t: "Couch stretch progressions", u: "https://www.youtube.com/watch?v=WKo4APrwfXQ", s: 50 },
      { t: "How to do a couch stretch", u: "https://www.youtube.com/watch?v=nTJaGnjUkTY", s: 3 },
    ],
  },
  shin: {
    name: "Kneeling shin stretch",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["shins"],
    bryan: "On Bryan’s stretch list (about 30 s).",
    how: [
      "Kneel with the tops of your feet flat on the mat.",
      "Sit back toward your heels.",
      "For more stretch, lift the knees slightly with your hands.",
    ],
    bryanVideos: [{ k: "w23", s: 606 }],
    videos: [
      { t: "Kneeling shin stretch tutorial", u: "https://www.youtube.com/watch?v=OffABI3UJEM", s: 8 },
      { t: "Kneeling tibialis stretch", u: "https://www.youtube.com/watch?v=wLnYZRHLhnY", s: 15 },
    ],
  },
  hipflexor: {
    name: "Half-kneeling hip flexor stretch",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["hips"],
    bryan: "On Bryan’s stretch list (30 s per side).",
    how: [
      "Half-kneel with the back knee on a cushion.",
      "Tuck the pelvis and squeeze the back glute first.",
      "Shift forward slightly and reach the same-side arm up.",
    ],
    bryanVideos: [{ k: "w23", s: 645 }],
    videos: [
      {
        t: "Half-kneeling hip flexor stretch with pelvic tilt",
        u: "https://www.youtube.com/watch?v=KiTGo4L4Bgg",
        s: 4,
      },
    ],
  },
  bigtoe: {
    name: "Big-toe stretch (toe sit)",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["feet"],
    bryan: "In the flexibility set of Bryan’s 2025 session (5 × 30 s block).",
    how: [
      "Kneel with your toes tucked under.",
      "Sit back gently toward the heels; take weight on your hands to adjust.",
      "Build tolerance slowly.",
    ],
    bryanVideos: [{ k: "pillars", s: 639, n: "mobility & flexibility" }],
    videos: [
      { t: "Kneeling toes and plantar fascia stretch (toe sit)", u: "https://www.youtube.com/watch?v=6qD9U_MRTC8", s: 0 },
      { t: "Big-toe extension mobility", u: "https://www.youtube.com/watch?v=yVrPFPUecgk", s: 5 },
    ],
  },
  butterfly: {
    name: "Butterfly stretch (cobbler’s pose)",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["adductors", "hips"],
    bryan: "In Bryan’s 2025 flexibility set, and cobbler’s pose is in his official beginner yoga block.",
    how: [
      "Sit tall, soles of the feet together, knees falling out.",
      "Hinge forward from the hips with a long spine.",
    ],
    bryanVideos: [{ k: "pillars", s: 639, n: "mobility & flexibility" }],
    videos: [{ t: "Seated butterfly stretch", u: "https://www.youtube.com/watch?v=4xweyzS7Rno", s: 4 }],
  },
  hamstring: {
    name: "Hamstring stretch",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["step"],
    muscles: ["hamstrings"],
    bryan: "On Bryan’s stretch list (30–60 s hold).",
    how: [
      "Rest your heel on a step or chair with your leg straight and toes up.",
      "Hinge forward with a flat back until you feel the stretch.",
    ],
    bryanVideos: [{ k: "w23", s: 363 }, { k: "galpin", s: 3146 }],
    videos: [
      { t: "Standing hamstring stretch on a step or chair", u: "https://www.youtube.com/watch?v=pP2CojTFq3k", s: 5 },
      { t: "Standing hamstring stretch", u: "https://www.youtube.com/watch?v=LVY692zJK0A", s: 8 },
    ],
  },
  catcow: {
    name: "Cat-cow",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["back"],
    bryan: "First pose of the beginner yoga block in Bryan’s official protocol.",
    how: [
      "On hands and knees, hands under the shoulders.",
      "Breathe out: round the back, tuck chin and tailbone.",
      "Breathe in slowly as you lift your chest and tailbone.",
    ],
    bryanVideos: [{ k: "galpin", s: 3221, n: "cats & dogs" }],
    videos: [{ t: "Cat-cow with good form", u: "https://www.youtube.com/watch?v=KT6Fk7FWYfM", s: 8 }],
  },
  cobra: {
    name: "Cobra",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["back", "chest"],
    bryan: "In Bryan’s official beginner yoga block. Opens the chest and upper back that desk work rounds forward.",
    how: [
      "Lie face down, hands under the shoulders, elbows in.",
      "Press up to lift the chest; hips stay on the floor.",
      "Keep your neck long and look forward and down.",
    ],
    videos: [
      { t: "Cobra pose for beginners", u: "https://www.youtube.com/watch?v=fNW64R1zJsU", s: 12 },
      { t: "How to do cobra safely", u: "https://www.youtube.com/watch?v=gPCns6PkF84", s: 10 },
    ],
  },
  tree: {
    name: "Tree pose",
    cat: "Mobility & stretching",
    log: "hold",
    equipment: [],
    muscles: ["ankles", "glutes"],
    bryan: "In Bryan’s official beginner yoga block (balance).",
    how: [
      "Stand on one leg; place the other foot on the inner calf or thigh, never on the knee.",
      "Hands at the chest or overhead; fix your gaze on one point.",
    ],
    bryanVideos: [{ k: "pillars", s: 719, n: "single-leg balance" }],
    videos: [{ t: "How to do tree pose", u: "https://www.youtube.com/watch?v=UkUIBDHolKk", s: 25 }],
  },
  thread: {
    name: "Thread the needle",
    cat: "Mobility & stretching",
    log: "check",
    equipment: ["mat"],
    muscles: ["upperBack"],
    bryan: "In the dynamic stretching of Bryan’s official mobility day.",
    how: [
      "Start on your hands and knees.",
      "Reach one arm under your body to the opposite side, shoulder toward the floor.",
      "Then open it up to the ceiling, eyes following the hand.",
    ],
    videos: [
      { t: "Thoracic rotation: thread the needle", u: "https://www.youtube.com/watch?v=aOFdI2oTTxU", s: 8 },
    ],
  },
  string: {
    name: "String reset",
    cat: "Posture",
    log: "check",
    equipment: [],
    muscles: ["neck", "upperBack"],
    bryan: "Habit 1 of Bryan’s posture guide: imagine a string going up through your spine and head, pulled straight up.",
    how: [
      "Stand or sit with the feet grounded.",
      "Imagine the string lifting the crown of your head: chin level, neck long.",
      "Let the shoulders settle down and back without forcing them.",
      "Take 3 slow breaths. Repeat every time you sit down at your desk.",
    ],
    bryanVideos: [{ k: "posture", s: 104 }, { k: "coach", s: 513 }],
    videos: [],
  },
  chintuck: {
    name: "Chin tucks",
    cat: "Posture",
    log: "reps",
    equipment: [],
    muscles: ["neck"],
    classic: true,
    bryan: "A standard physiotherapy drill for forward head posture. It is an extra in this posture block and is not one of Bryan’s exercises.",
    how: [
      "Sit or stand tall, eyes level.",
      "Glide your head straight back, making a slight double chin. Don’t nod down.",
      "Hold 3 s, release slowly.",
    ],
    tips: ["Rest your back against a wall to help you feel the right direction."],
    videos: [
      {
        t: "Physical therapist: how to do chin tucks",
        u: "https://www.youtube.com/watch?v=ekJzJTnd43s",
        s: 15,
      },
      { t: "Chin tuck for neck pain and posture", u: "https://www.youtube.com/watch?v=qtcBiYF7yuQ", s: 18 },
    ],
  },
  wallslide: {
    name: "Wall slides",
    cat: "Posture",
    log: "reps",
    equipment: ["wall"],
    muscles: ["upperBack", "shoulders"],
    bryan: "Part of the dynamic stretching in Bryan’s official mobility day. It trains your shoulder blades to move up and back instead of forward.",
    how: [
      "Head, upper back and buttocks on a wall, feet a small step out.",
      "Forearms on the wall in a W shape.",
      "Slide the arms up into a Y keeping contact, then pull the elbows down toward the ribs.",
      "Slow reps; ribs stay down.",
    ],
    videos: [
      { t: "Scapular wall slides", u: "https://www.youtube.com/watch?v=BiREOSisYWU", s: 6 },
      {
        t: "Wall slides for thoracic mobility and posture",
        u: "https://www.youtube.com/watch?v=ti_FUZZz_7k",
        s: 10,
      },
    ],
  },
  pullapart: {
    name: "Band pull-apart",
    cat: "Posture",
    log: "reps",
    equipment: ["band"],
    muscles: ["upperBack", "shoulders"],
    bryan: "Bryan: 1 × 15.",
    how: [
      "Hold a light band at shoulder height, arms straight, hands shoulder-width.",
      "Pull the band apart at chest height by squeezing the shoulder blades together.",
      "Shoulders stay down, away from the ears; pause 1 s.",
    ],
    bryanVideos: [{ k: "w23", s: 278 }],
    videos: [
      { t: "Band pull-apart tutorial", u: "https://www.youtube.com/watch?v=Zxp9IORjjK4", s: 5 },
      { t: "How to do band pull-aparts", u: "https://www.youtube.com/watch?v=smSSXITNpCI", s: 10 },
    ],
  },
  facepull: {
    name: "Band face pull",
    cat: "Posture",
    log: "reps",
    equipment: ["band", "door"],
    muscles: ["upperBack", "rotatorCuff"],
    bryan: "Bryan: 1 × 15–25. He stresses good posture and a full range of motion.",
    how: [
      "Anchor the band at face height on the hinge side of a closed door.",
      "Pull toward your eyes with elbows high and hands splitting apart.",
      "Finish with thumbs pointing back and shoulder blades squeezed; hold 1 s.",
      "Return slowly and stay tall.",
    ],
    bryanVideos: [{ k: "w23", s: 217 }],
    videos: [
      { t: "Band face pull with a door anchor", u: "https://www.youtube.com/shorts/Q77ORURfeYc", s: 0 },
      { t: "Face pulls with a door anchor", u: "https://www.youtube.com/watch?v=Fe37Ll4VDfI", s: 8 },
    ],
  },
  extrot: {
    name: "Shoulder external rotation",
    cat: "Posture",
    log: "load",
    equipment: ["dumbbell", "mat"],
    muscles: ["rotatorCuff"],
    bryan: "“External rotation” is in the posture part of Bryan’s routine, right after band pull-aparts. It strengthens the rotator cuff that holds the shoulders back.",
    how: [
      "Stand with one foot on a stable chair or bench and rest the elbow of the working arm on the inside of that knee, elbow bent 90°; or lie on your side with the elbow pinned to the ribs.",
      "Hold a light dumbbell ({kg:1-4}) and rotate the forearm up and back as far as is comfortable.",
      "Lower slowly in 2–3 s. Keep the shoulder blade back and down.",
    ],
    bryanVideos: [{ k: "w23", s: 302 }],
    videos: [
      {
        t: "Dumbbell external rotation with the elbow on the knee",
        u: "https://www.youtube.com/watch?v=7hfjcXtXi0w",
        s: 15,
      },
      { t: "Side-lying dumbbell external rotation", u: "https://www.youtube.com/watch?v=3XLT7kpMzcM", s: 12 },
    ],
    clipVideos: [
      {
        title: "Elbow-on-knee external rotation",
        bryanVideos: [{ k: "w23", s: 302 }],
        videos: [
          { t: "Elbow-on-knee shoulder external rotation", u: "https://www.youtube.com/watch?v=mbdDt0c9bZY", s: 0 },
          {
            t: "Dumbbell external rotation with the elbow on the knee",
            u: "https://www.youtube.com/watch?v=7hfjcXtXi0w",
            s: 15,
          },
        ],
      },
      {
        title: "Side-lying external rotation",
        videos: [
          { t: "Side-lying dumbbell external rotation", u: "https://www.youtube.com/watch?v=brwBvldn4gw", s: 0 },
          { t: "Side-lying external rotation form tutorial", u: "https://www.youtube.com/watch?v=3XLT7kpMzcM", s: 12 },
        ],
      },
    ],
  },
  neck: {
    name: "Neck: forehead resistance",
    cat: "Posture",
    log: "check",
    equipment: [],
    muscles: ["neck"],
    bryan: "Bryan’s physical-therapist exercise #2. Official wording (2026): “With a hand on your forehead, resist the pressure of your hand pushing your head back. When doing this, be very patient.” He does it to fatigue twice a week.",
    how: [
      "Sit or stand tall (string cue), chin slightly tucked so the back of the neck is long.",
      "Put a hand on your forehead and push gently backward.",
      "Resist with your neck. Either hold still, or let the hand win slowly over 3–5 s, moving the head back up to about 30°, then return.",
      "Daily: 3–5 × 10 s holds at 30–50% effort; your level sets the number. Wednesday and Saturday: 1 set to fatigue.",
    ],
    tips: [
      "Bryan calls this technical and was taught it for his own diagnosed condition. Stay gentle, and stop if you get dizziness, tingling or a headache.",
      "His 2023 version: neck long, chin down, light hand pressure on top of the head, lift the chin about 30° and lower, until fatigue.",
    ],
    bryanVideos: [{ k: "posture", s: 212 }, { k: "w23", s: 165 }, { k: "coach", s: 634 }],
    videos: [
      { t: "Isometric cervical flexion (forehead hold)", u: "https://www.youtube.com/watch?v=aF6txnLeC04", s: 0 },
      {
        t: "Controlled neck flexion against hand resistance",
        u: "https://www.youtube.com/watch?v=WnKcq1Uh8m4",
        s: 5,
      },
    ],
    clipVideos: [
      {
        title: "Forehead resistance: hold",
        bryanVideos: [
          { k: "posture", s: 212, n: "forehead resistance" },
          { k: "coach", s: 634, n: "posture coach demo" },
        ],
        videos: [
          { t: "Isometric cervical flexion (forehead hold)", u: "https://www.youtube.com/watch?v=aF6txnLeC04", s: 0 },
          {
            t: "Isometric cervical flexion for neck strengthening",
            u: "https://www.youtube.com/watch?v=4rK-m6GvNCk",
            s: 8,
          },
        ],
      },
      {
        title: "Forehead resistance: slow",
        bryanVideos: [
          { k: "w23", s: 165, n: "2023 dynamic version" },
          { k: "posture", s: 212, n: "2026 version" },
        ],
        videos: [
          {
            t: "Controlled neck flexion against hand resistance",
            u: "https://www.youtube.com/watch?v=WnKcq1Uh8m4",
            s: 5,
          },
        ],
      },
    ],
  },
  levator: {
    name: "Shoulders up and out (levator shrug)",
    cat: "Posture",
    log: "load",
    equipment: ["dumbbell"],
    muscles: ["neck", "upperBack", "shoulders"],
    bryan: "Bryan’s physical-therapist exercise #1. Official wording (2026): “With weights in your hands, bring your shoulders up and out. Keep your elbows back. Do 1 set to fatigue 2 times a week.” He uses about 9 kg (20 lb); his posture coach’s patients usually start near 3.5 kg (8 lb).",
    how: [
      "Stand tall with a light dumbbell in each hand, neck long, shoulders set back and down first.",
      "Bend the elbows slightly and keep them pulled back, slightly behind the body.",
      "Lift the shoulders up and out in a small arc, toward the ears and slightly forward.",
      "Pause for 1 s at the top, then lower slowly. Start light while you learn it; Bryan says the technique took him time.",
    ],
    bryanVideos: [{ k: "posture", s: 158 }, { k: "w23", s: 140 }, { k: "coach", s: 703 }],
    videos: [],
  },
  doorway: {
    name: "Doorway chest stretch",
    cat: "Posture",
    log: "check",
    equipment: ["door"],
    muscles: ["chest", "shoulders"],
    classic: true,
    bryan: "A standard stretch for tight chest muscles that pull the shoulders forward. It is an extra in this posture block and is not one of Bryan’s exercises.",
    how: [
      "Forearms on the door frame, elbows at shoulder height and bent 90°.",
      "Step one foot through and lean gently until you feel the stretch across the chest.",
      "Keep your ribs down without arching your lower back. Stop if you feel pinching in the shoulder.",
    ],
    videos: [
      {
        t: "Physical therapy tip: doorway pec stretch",
        u: "https://www.youtube.com/watch?v=069o76BafTk",
        s: 10,
      },
      { t: "Doorway pec and shoulder stretch", u: "https://www.youtube.com/watch?v=Dmm8_S23I74", s: 12 },
    ],
  },
};

// Keep the old ids readable for saved logs and bookmarks.
for (const [id, movement] of Object.entries(MOVEMENTS)) {
  const { source, clip, part, ...details } = movement;
  const original = EXERCISES[source];
  const videos = original.clipVideos?.[clip] || original;
  EXERCISES[id] = { ...original, ...details, group: original.name, hidden: false, videos: videos.videos, bryanVideos: videos.bryanVideos || [], clipVideos: undefined };
  original.hidden = true;
}
for (const id of ["dynamic", "shortint", "norwegian", "indoorhiit"]) EXERCISES[id].hidden = true;
for (const ex of Object.values(EXERCISES)) if (ex.hidden) ex.routine = true;
