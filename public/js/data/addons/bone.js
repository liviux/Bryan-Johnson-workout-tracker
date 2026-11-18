// Optional add-on: Bryan's Bone Density & Impact Protocol (13 Apr 2026).
// High-impact ground-reaction shockwaves stimulate osteogenesis to maintain
// elite bone mineral density (Z-score +3.8 / 99th percentile across all ages).

export default {
  id: "bone",
  name: "Bone density protocol",
  short: "Bone",
  icon: "bolt",
  color: "amber",
  description: "Spend 3–4 minutes stimulating bone mineral density through high-impact ground-reaction loading. Includes heel drops & stomp drills, pogo hops and snap-down landings from Bryan's bone health protocol.",
  schedule: { mon: "daily", tue: "daily", wed: "daily", thu: "daily", fri: "daily", sat: "daily", sun: "optional" },
  variants: {
    daily: {
      name: "Bone density loading",
      mins: 4,
      note: "Bryan's protocol: mechanical shock signals osteoblasts to deposit minerals. Keep knees slightly soft to protect cartilage while the bone absorbs the force.",
      items: [
        {
          id: "bone-heeldrop",
          ex: "heeldrop",
          rx: ["1 × 20 drops", "1 × 30 drops", "2 × 30 drops", "2 × 50 drops"],
          bryan: "Bryan: mechanical shockwave",
        },
        {
          id: "bone-pogo",
          ex: "pogo",
          rx: ["1 × 20 s springy", "1 × 30 s springy", "2 × 30 s", "2 × 45 s"],
          bryan: "Bryan: hops 4–7×/week",
        },
        {
          id: "bone-jumps",
          ex: "jumps",
          label: "Snap-down landings / hops",
          rx: ["1 × 5 landings", "1 × 8 landings", "2 × 8 landings", "2 × 10 landings"],
          bryan: "Stick the landing",
        },
      ],
    },
  },
  metrics: [
    { id: "impact", type: "scale", min: 0, max: 10, label: "Joint comfort after impact work today", low: "comfortable", high: "ache" },
  ],
  periodic: [
    { id: "dexa", every: 180, label: "Consider a DEXA scan (every 6–12 months) to benchmark your T-score, Z-score and bone mineral density." },
  ],
  habits: [
    {
      h: "Mechanical shock for osteogenesis",
      d: "Bones remodel when subjected to high-rate mechanical loads. Heel drops, stomps, and hops generate 3–4× bodyweight ground-reaction forces.",
    },
    {
      h: "Bone building nutrition",
      d: "Ensure 1,000–1,200 mg calcium, 2,000 IU Vitamin D3, Vitamin K2 (to direct calcium into bones) and 1.2–2.0 g/kg protein.",
    },
    {
      h: "Wear a weighted vest for walks",
      d: "Bryan adds a weighted vest during Zone 2 walks and hikes to increase axial bone loading safely.",
    },
  ],
  checks: [
    "DEXA scan every 6 to 12 months to monitor bone mineral density at the lumbar spine, femoral neck and total hip.",
    "Progress jump height and landing intensity only when knees and ankles feel completely comfortable the next morning.",
  ],
};
