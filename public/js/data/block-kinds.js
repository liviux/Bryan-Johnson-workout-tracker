// What kind of work a block is, for the themes that colour by kind. Read from
// the English source name once, then stored on the block as `kind`, because the
// displayed name is translated.
const BLOCK_KINDS = [
  [/warm|dynamic/i, "warm"],
  [/jump|speed|power|interval|4×4|4x4/i, "power"],
  [/strength/i, "strength"],
  [/core|plank|tendon|stabil|balance|knee|back/i, "core"],
  [/zone|cardio/i, "cardio"],
  [/stretch|cool|yoga|mobil/i, "stretch"],
];

export function blockKindFromName(name) {
  const hit = BLOCK_KINDS.find(([re]) => re.test(name || ""));
  return hit ? hit[1] : "other";
}
