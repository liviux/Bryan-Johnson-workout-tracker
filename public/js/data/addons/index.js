import { localized } from "../../i18n.js";
import { splitItems } from "../split-items.js";
// Optional add-ons shown after the main session (the posture block is the first).
// The user picks them in the first-run setup and can change them in Settings.
//
// To add your own: create a file like posture.js that exports
//   { id, name, short, description, color, schedule, variants, metrics?, periodic?, habits?, checks? }
// - schedule maps weekday keys (mon…sun) to a variant name, "optional", or nothing (not shown that day)
// - variants: { name, mins, note, items: [{ id, ex, label?, rx: [new, returning, active, trained] (training levels), bryan? }] }
// - items reference exercise ids from ../exercises.js (add new exercises there)
// then import it below and add it to ADDONS. Logging, auto-save and history work automatically.

import posture from "./posture.js";
import desk from "./desk.js";
import bone from "./bone.js";
import hang from "./hang.js";

const addons = [posture, desk, bone, hang];
for (const addon of addons) for (const variant of Object.values(addon.variants)) variant.items = splitItems(variant.items);

export const ADDONS = localized(addons);

export function getAddon(id) {
  return ADDONS.find((a) => a.id === id) || null;
}
