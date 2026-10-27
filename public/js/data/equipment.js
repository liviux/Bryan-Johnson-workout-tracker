// Optional personal inventory and compact home equipment recommendations.
import { localized } from "../i18n.js";
import { EQUIPMENT } from "./program.js";

export const EQUIPMENT_CATEGORIES = localized(["Strength", "Mobility & floor work", "Cardio & monitoring", "Massage", "Other"]);

export const RECOMMENDED_EQUIPMENT = localized([
  ...[...EQUIPMENT.have, ...EQUIPMENT.add].map((g) => ({
    type: g.icon, name: g.i, description: g.d,
    category: ["mat", "slant", "step"].includes(g.icon) ? "Mobility & floor work" : "Strength",
  })),
  { type: "handles", name: "Push-up handles", category: "Strength", description: "Optional for your existing push-ups. Using handles does not add exercises or sets to the plan." },
  { type: "gripper", name: "Adjustable hand gripper", category: "Strength", description: "Optional. Carries and hangs already train grip, so this plan has no extra gripper sets." },
  { type: "rope", name: "Skipping rope", category: "Cardio & monitoring", description: "Optional. The plan does not add rope drills or extra cardio if you own one." },
  { type: "hr", name: "Heart-rate chest strap", category: "Cardio & monitoring", description: "Check your heart rate in your strap's compatible app, then enter it here. The strap does not connect to this app." },
  { type: "massagegun", name: "Massage gun", category: "Massage", description: "Optional for comfort and recovery. It is outside Bryan's exercise prescription. Follow the manual." },
  { type: "footmassager", name: "Foot massager", category: "Massage", description: "Optional for comfort. It is outside Bryan's exercise prescription. Follow the manual." },
]);

export function equipmentUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
