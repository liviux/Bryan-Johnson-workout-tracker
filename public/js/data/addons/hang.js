// Optional add-on: Dead hang & grip longevity protocol.
// Bryan measures grip strength as a primary biological age biomarker (scoring ~60 kg, top 5%).
// Hanging decompresses the intervertebral discs, stretches the shoulders, and builds grip resilience.

export default {
  id: "hang",
  name: "Dead hang & grip",
  short: "Grip",
  icon: "bar",
  color: "cyan",
  description: "Spend 2–4 minutes decompressing the spine and building elite grip strength. Includes passive hangs for disc hydration, active hangs for shoulder stability, and farmer's holds. Bryan's grip strength ranks in the top 5% for all ages.",
  schedule: { mon: "daily", tue: "daily", wed: "daily", thu: "daily", fri: "daily", sat: "daily", sun: "optional" },
  variants: {
    daily: {
      name: "Spinal decompression & grip",
      mins: 3,
      note: "Start with feet lightly supported if needed. Alternate between relaxing into a passive hang (spine decompression) and engaging the active hang (shoulders pulled down).",
      items: [
        {
          id: "hang-deadhang",
          ex: "deadhang",
          rx: ["2 × 15–20 s, feet supported", "2 × 30 s hold", "3 × 30–45 s hold", "3 × 60 s hold"],
          bryan: "Spine decompression & grip",
        },
        {
          id: "hang-farmer",
          ex: "farmer",
          label: "Dumbbell farmer’s hold",
          rx: ["1 × 20 s @ {kg:6-8}", "2 × 25 s @ {kg:8-12}", "2 × 35 s @ {kg:12-16}", "3 × 40 s @ {kg:16-24}"],
          bryan: "Bryan: grip biomarker ~60 kg",
        },
      ],
    },
  },
  metrics: [
    { id: "shoulder", type: "scale", min: 0, max: 10, label: "Shoulder & upper back openness after hanging", low: "tight", high: "open & free" },
  ],
  periodic: [
    { id: "gripcheck", every: 30, label: "Test your maximum dead hang time or handgrip dynamometer to benchmark against biological age percentiles." },
  ],
  habits: [
    {
      h: "Decompress after compressive lifts",
      d: "Hanging creates negative disc pressure and hydrates intervertebral discs after squats, presses and carries.",
    },
    {
      h: "Active vs passive hang",
      d: "Passive hang opens the ribcage and shoulders; active hang engages the lower traps and serratus for scapular health.",
    },
    {
      h: "Grip strength is a mortality biomarker",
      d: "Handgrip force strongly correlates with total-body muscle quality, cognitive resilience and lower all-cause mortality.",
    },
  ],
  checks: [
    "Aim to build toward an unbroken 60-second passive hang with steady nasal breathing.",
    "Check grip strength monthly using a dynamometer or your maximum hang duration.",
  ],
};
