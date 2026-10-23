# Writing exercise animations

Every exercise has a looping 3D animation of a figure, drawn in the animation style
the user picks ([Animation styles](#animation-styles)). Animations are plain
JavaScript data in `public/js/anim/clips/*.js`, keyed by the exercise id used in
`public/js/data/exercises.js`. You describe a few key poses; the engine blends
between them, solves the knees and elbows, and draws props and dumbbells.

```
public/js/anim/
  rig.js        pose → joint positions (forward + inverse kinematics)
  poses.js      helpers for authoring poses (stand, squat, hinge, ground…)
  mannequin.js  the 3D figure and muscle highlighting
  props.js      wall, step, chair, slant board, mat, door frame + bar…
  stage.js      renderer, camera, clip player
  clips/*.js    the animations (one file per exercise category)
  styles/       other ways to draw the figure (see Animation styles below)
```

Preview your work at **`/dev/animations.html?ids=pushup,plank`** (or `?ids=all`).
It renders every keyframe side by side. Add `&view=side` to force a camera
angle, `&size=320` for bigger tiles and `&style=voxel` to draw them in an
animation style.

Use `&samples=8` to inspect evenly spaced times, including the motion between keys,
without rendering every authored pose. Run `npm test` for the animation checks:
all registered exercises and clips, sampled at 60 frames per second, with reachable
hand and foot targets and orthonormal hand/foot frames, plus skin, contact,
mirroring and loop regressions. Rendered skin is also checked against equipment,
including clearance between the head, pull-up bar and doorway beam.

The step-up clips use a low aerobic step, and Poliquin heel taps use a slant board on the floor. Both preserve the existing exercise ids and logged history.

Individual movement ids in `public/js/data/movements.js` reuse a single authored clip. Front-to-back and side-to-side leg swings have separate clips, as do two-leg and single-leg tibialis raises. Legacy combined ids remain available for saved logs and old links; workout and library screens use the individual ids. Interval groups select their demonstrations from the timed movement steps.

## Coordinates and units

- **+Y is up, the figure faces +Z, and its left side is +X.** The floor is `y = 0`.
- Positions are metres, angles are degrees.
- The figure is about 1.80 m tall. Standing, the pelvis centre is at `STAND_Y`
  (0.945 m), the shoulders at ~1.46 m and the top of the head at ~1.81 m.
- Key lengths (`DIM` in rig.js): thigh 0.44, shin 0.43, upper arm 0.29,
  forearm 0.26, ankle joint 0.075 above the sole, hips ±0.095 from the midline,
  shoulders ±0.185.

## A pose

A pose is a plain object. Anything you leave out takes the default from
`defaultPose()` in rig.js. The important fields:

| Field | Meaning |
|---|---|
| `root: [x, y, z]` | Pelvis centre, world space. |
| `rot: [pitch, yaw, roll]` | Pelvis orientation. Pitch + tips the body forward (90 = lying face down, head toward +Z; −90 = lying on the back, head toward −Z). Yaw + turns left. Roll + leans to the figure's right. |
| `spine: [flex, side, twist]` | Bend between pelvis and chest, spread over two joints. Flex + rounds forward, side + bends right, twist + turns the chest left. |
| `lumbar: [flex, side, twist]` | Optional lower-spine share of `spine`; the remainder goes to the upper back. Defaults to 40% of flexion, 25% of side bend and 15% of twist. |
| `neck: [pitch, yaw]`, `head: [nod, turn]` | Pitch/nod + looks down. |
| `tuck` | Chin-tuck glide of the head backwards (metres, ~0.03). |
| `shrugL/R: [up, forward]` | Shoulder elevation and protraction (metres, ~0.04). |
| `legL/R: [hipFlex, hipAbd, kneeFlex, plantar]` | Leg by angles (forward kinematics). Hip flexion + brings the thigh forward, abduction + moves it out to the side, knee flexion + bends the knee, plantar + points the toes. |
| `footL/R: [x, y, z]` | Leg by ankle target (inverse kinematics). Overrides `legL/R`. |
| `kneeL/R: [x, y, z]` | IK pole: the direction the knee should point (world). Default: forward and slightly out. |
| `toeL/R` | For IK feet on the floor: foot pitch, + = toes down/heel up (slant board, calf raise), − = toes up. |
| `turnout` | Feet angle outward (default 7°). |
| `footYawL/R` | Optional world yaw of a ground-oriented foot. Use it to keep a planted foot facing the same way while the pelvis turns. |
| `armL/R: [shFlex, shAbd, elbowFlex, extRot]` | Arm by angles. Flexion + raises the arm forward (180 = overhead), abduction + raises it to the side (90 = T-pose), elbow + bends, extRot + rotates the forearm outward. |
| `wristL/R: [flex, side, twist]` | Wrist flexion, side bend and forearm rotation, in degrees. Twisting turns the hand without moving the elbow. Use `hold.axis: "hand"` when the dumbbell should turn with the grip. |
| `palmL/R: [x, y, z]` | Optional world normal above a supported palm. `[0, 1, 0]` keeps it flat on the floor, with the fingers facing the body's yaw. Wrist IK targets still describe the wrist joint. |
| `fingersL/R: [x, y, z]` | Optional world finger direction with `palmL/R`. Use it for a palm on the forehead or another surface whose tangent differs from the body's forward direction. |
| `handL/R: [x, y, z]` | Arm by wrist target (IK). Overrides `armL/R`. |
| `handsIn` | Frame for hand targets and elbow poles: `"world"` (default), `"chest"` (origin at the base of the neck, moves with the torso) or `"pelvis"`. |
| `elbowL/R: [x, y, z]` | IK pole for the elbow, in the `handsIn` frame. Default: back, down and slightly out. |
| `footModeL/R`, `feetMode` | Foot orientation: `"ground"` (flat/pitched on the floor; default for IK feet) or `"shin"` (follows the shin, default for angle legs; plantarflexion from `legL[3]`, or `ankleL` for IK feet). Use `"shin"` for kneeling, lying, hanging and planks. |

**Use IK for anything that touches something** (feet on the floor or a step,
hands on the floor or a bar): targets stay exactly put while the body moves,
so nothing slides. **Use angles for limbs moving freely** (a swinging leg,
arms circling, a leg lifted behind you).

Keep the same representation for a limb in every key of a clip. Blending
from IK to angles snaps instead of animating.

The shoulder girdle follows overhead arm elevation in both FK and IK. Explicit
`shrugL/R` still adds the authored shoulder-blade movement. Hands expose
`handFrameL/R`, `handDirL/R` and `handRefL/R` to renderers, while `foreDirL/R`
continues to describe the forearm.

FK limbs also expose `upperArmFrameL/R`, `forearmFrameL/R`, `thighFrameL/R` and
`shinFrameL/R`. These preserve the authored twist when a limb passes overhead.
IK hands follow the elbow's hinge plane so a vertical forearm doesn't flip the palm.

## Helpers (`poses.js`)

```js
stand(o)            // standing tall, feet hip-width (IK), knees soft
squat(d, o)         // d = 0…1; o.feet = { x, y, z, toe } for raised or wider feet
hinge(d, o)         // hip hinge, d = 0…1 (RDL, swing)
legsTo(shin, thigh) // pelvis {y, z} for planted feet with given shin/thigh angles
hangArms(p, opts)   // wrists straight below the shoulders (world IK) — dumbbells at the sides
anchor(p, "toeL", [x, y, z], "yz") // move the figure so a joint lands on a point
ground(p, ["kneeL", "handL", ...]) // drop/raise the figure until the lowest joint touches the floor
translate(p, [dx, dy, dz])          // move root and world IK targets together
pinHands(p) / pinFeet(p)            // freeze wrists/ankles at their current world spot
joints(p)           // all joint positions for a pose (for measuring)
transition(build, from, to, start, end, cue) // eight rebuilt poses along a curved movement
ARMS.hips / goblet / chest / overhead / forward / tPose / relaxed / runL / runR
LEG.kneel / straight / sit90
```

`joints(p)` returns world positions named `pelvis, lumbar, thoracic, neckBase,
headJoint, head, shoulderL/R, elbowL/R, wristL/R, handL/R, hipL/R, kneeL/R,
ankleL/R, heelL/R, ballL/R, toeL/R` (and frames `Rp`, `Rc`). Use them to
place hands under shoulders, put props under feet, etc.

Typical patterns:

```js
// Lying on the back, knees bent 90/90, arms up:
ground({ rot: [-90, 0, 0], legL: [90, 4, 90, 10], legR: [90, 4, 90, 10], armL: [90, 6, 0, 0], armR: [90, 6, 0, 0] },
       ["pelvis", "thoracic", "head"]);

// Hands and knees:
ground({ rot: [78, 0, 0], legL: [78, 4, 90, 80], legR: [78, 4, 90, 80], armL: [78, 4, 0, 0], armR: [78, 4, 0, 0] },
       ["kneeL", "kneeR", "handL", "handR"]);

// Upright kneeling:
ground({ legL: LEG.kneel, legR: LEG.kneel }, ["kneeL", "kneeR"]);

// Plank on the toes, pivoting at the toes (then add IK hands on the floor):
anchor({ rot: [90 - 21, 0, 0], legL: [0, 4, 0, -22], legR: [0, 4, 0, -22] }, "toeL", [0, 0, -0.92], "yz");
```

## A clip

```js
export default {
  gobletsquat: {
    clips: [
      {
        title: "Heels-elevated goblet squat",
        props: [{ type: "slant", pos: [0, 0, 0.04], w: 0.56, d: 0.36, angle: 14 }],
        hold: { goblet: true },              // or { both: true }, { L: true, R: true, axis: "x" | "z" | "y" | "wx" | "wz" }
        bands: [{ a: [0, 1.6, 1.2], b: "handL", via: ["shoulderL"] }], // ends: world point or joint; optional via points route a band around the body
        highlight: ["quads", "glutes"],      // see GROUPS in mannequin.js
        camera: { view: "three", target: [0, 0.75, 0], dist: 3.5 },
        alternate: false,                    // true: plays the keys, then mirrored for the other side
        floorScroll: 0,                      // floor grid speed in tiles/s (1 tile = 0.64 m): <0 walking forward, >0 walking backward
        effects: [],                         // "string": a line pulling up from the head
        thumb: 3.6,                          // optional: time of the library thumbnail (default: the key furthest from the start pose)
        keys: [
          { t: 0,   p: gobletSquat(0), cue: "Heels on the board; 3 s down" }, // shows while moving to the next key
          { t: 3.0, p: gobletSquat(1), cue: "Pause at the bottom" },
          { t: 3.5, p: gobletSquat(1), cue: "Stand up" },
          { t: 4.7, p: gobletSquat(0), e: "out" }, // e: how this key is reached: inOut (default) | lin | in | out | hold
        ],
      },
    ],
  },
};
```

- The clip loops. If the last key differs from the first, the engine adds a
  return key automatically (`close: false` to disable, `closeTime` for its length).
- Several clips play in turn (twice each by default, `loops: n` to change). Use them
  for multi-move drills or two variants of one exercise. In the viewer, choose
  **Fixed** to stay on one movement or use the arrows to pick another.
- A key's `cue` shows under the animation from that key until the next key that
  has a cue, so put it on the key where the movement **starts**. A cue on the
  last key only shows if the engine adds a return key. Keep cues short and
  practical, and match the exercise's how-to text.
- `e` on a key sets the easing of the segment that **arrives** at that key.
  The default `inOut` eases velocity and acceleration to zero at either end.
  Use `smooth` for continuous cycles or densely authored arcs: monotone cubic
  interpolation joins their velocities, preserves constant contact coordinates
  and stays within each coordinate's authored range. `lin`, `in`, `out` and
  `hold` keep their explicit timing. Do not use `smooth` across an intentional cut.
- Freely moving FK arms follow the body by up to 45 ms within a segment. Endpoints,
  holds, fast cycle keys and hands with IK targets keep their authored timing.
- With `alternate: true` the mirrored side starts by blending from the first
  side's last pose into the mirrored second key. Start and end each side in a
  neutral pose. For lying poses (where that blend would swing the body over),
  make the first segment 0.001 s long so the switch is a clean cut.
- IK elbow and knee poles are blended linearly, so on long arcs (arms sweeping
  overhead) add in-between keys to keep the elbow where it belongs.
- **Camera**: `view` is `"front" | "side" | "three" | "back" | "top"` or a direction
  `[x, y, z]`; `target` is the point to look at; `dist` the distance. Make sure the
  whole movement stays in frame (check the extreme keyframes).
- **Highlight groups**: `quads, hamstrings, adductors, glutes, hips, calves, shins,
  ankles, feet, core, obliques, lowerBack, back, upperBack, chest, shoulders,
  rotatorCuff, biceps, triceps, arms, grip, neck, heart`.
- **Holds**: `goblet` rests the top head of one dumbbell in both palms (goblet squat,
  triceps extension). `both` puts both hands on one handle (swing, Jefferson curl).
  A per-side hold puts a dumbbell in that hand. `axis` is the handle direction.
- **Bands**: each pair in `bands` is one straight segment. Add `via` joint names or
  world points to route a band around the body, for example over each shoulder in
  the chest fly. Every segment uses the same band colour.

## Props

All props take `pos: [x, y, z]` (centre of the footprint on the floor) and
optional `rotY` (degrees).

| Type | Options |
|---|---|
| `wall` | `w`, `h` (semi-transparent so it never blocks the view) |
| `step` | `w`, `d`, `h` (default 0.62 × 0.34 × 0.18) |
| `box` | `w`, `d`, `h` (knee-height box/chair seat, default h 0.45) |
| `bench` | `w`, `d`, `h` (long, default 0.42 × 1.15 × 0.46) |
| `chair` | `h`, `back: false` |
| `sofa` | `w` (seat 0.42 high) |
| `slant` | `w`, `d`, `angle` (high edge at the back, −Z) |
| `mat` | `w`, `d` |
| `doorframe` | `w`, `h`, `bar: true`, `barH`, `barZ` |
| `door` | `w`, `anchorH`, `anchorX` (closed door with a band anchor) |
| `bar` | `w`, `h` (pull-up bar without a frame) |

## Quality checklist

- Feet and hands that should be planted don't slide (IK targets fixed across keys).
- Keep targets within limb length between keys too. Rebuild curved transitions from the body's current frame when a straight blend overreaches.
- Contacts touch the surface: no floating, no sinking (use `ground`/`anchor`).
- Check the rendered palms, fingertips, clothing and shoes too: joint centres alone don't show gaps or intersections.
- Knees and elbows bend the natural way (set poles when the default is wrong).
- One rep takes 3–6 s and follows the tempo in the how-to (e.g. "3 s down").
- One-sided exercises use `alternate: true` so both sides are shown.
- The camera shows the movement clearly: side view for forward/back motion,
  front view for side-to-side motion.

## Animation styles

The clips only describe poses; how the figure is drawn is up to its style. The
styles are listed in `public/js/anim-styles.js` (`ANIM_STYLES`) and apply to every
exercise (`STYLED_EXERCISES = "all"`; a list of exercise ids there limits them to
those, and the rest show the mannequin, `BASE_ANIM_STYLE`). Athlete is the default
(`DEFAULT_ANIM_STYLE`). The user picks one in Settings or from the floating switcher; the
choice is `profile.settings.animStyle`, set on `<html data-anim>`, and every stage
redraws when the `hp:anim` event fires.

```
public/js/anim/styles/
  index.js      loads a style's module the first time it's used
  kit.js        shared parts for three.js styles: rig, body, outlines, toon ramps, glow
  flat.js       shared parts for the flat styles: body pieces on screen, prop faces,
                dumbbell heads, lit regions, curves, depth, segments clipped at the
                camera, the horizon
  athlete.js  female.js  anime.js  lowpoly.js  cartoon.js  voxel.js  robot.js  glass.js
                                                                   three.js figures
  pictogram.js  blueprint.js  doodle.js  paper.js                    SVG
  ink.js  synthwave.js  stardust.js  googly.js  halftone.js
  linocut.js  orrery.js                                             2D canvas
  ascii.js                                                           text
```

Each style module exports `createFigure()`. The stage still samples the clip and
computes the joints (`rig.js`) every frame and passes them to
`figure.update(J, { still, id, title })` (a one-off frame for a thumbnail, the
exercise id and the clip's title), so every style plays every clip
exactly like the mannequin.

**A three.js style** returns a `group` the stage adds to its scene, plus
`setHighlight(groups)`, `setPulse(v)`, `setTheme(dark, colors)` and `dispose()`, and
optionally:

- `look` (or `look(dark)`): the lights around it, `{ hemi: [sky, ground, intensity],
  key: [colour, intensity], rim: [colour, intensity], tone: "none", exposure,
  floor: { color, grid, gridOpacity } }`. Anything left out keeps the mannequin's.
- `dressProp(mesh)`: restyles each prop mesh (the cartoon's toon props with outlines,
  the voxel's pixel texture). `propDresser(make, outline)` in `kit.js` builds one that
  keeps see-through materials (the wall) see-through and caches the new materials.

`kit.js` does most of the work. `createRig()` gives anchors that follow the body
(`pelvis`, `chest`, `head`, `handL`, `footR`, the joints…) to hang rigid parts on, and
`rig.seg(mesh, "thighL", { from, to })` for parts that stretch along a bone.
`buildBody(rig, { geo, mat, … })` puts the mannequin's shapes on it with your own
geometry and materials, as a smooth or a blob torso, with sleeves and shorts, and
tags every part with its region so `createHighlighter()` can light up muscle groups
(`GROUPS` in `mannequin.js`). Then add hair, faces or anything else to the anchors.

**A flat style** draws without three.js. It returns a `dom` element instead of a
group; the stage lays it over the 3D canvas (which stays underneath, see-through, so
dragging still turns the camera) and calls `figure.draw(view)` each frame. `view`
has the size, `project(point)` to CSS pixels (with depth), `scaleAt(point)` in
pixels per metre, the clip's props, the `camera` (position, world matrix and
inverse projection), so the camera buttons, zoom controls and dragging work as usual, `attachments`
(the held dumbbells as `{ c, axis, size }`, the bands and the string as
`[end, end]`, as the 3D scene has them this frame) and `interactive` (whether the
stage has view buttons in its top right). `flat.js` turns the joints into body
pieces sorted far to near and every prop into faces (`sceneFaces(view)`: boxes, the
slant's wedge and bars, each with its kind and light, the wall marked `ghost`), and
has `dumbbellHeads`, `litRegions` (the regions to light up, with `lit.heart` kept
apart for cardio), `isLit`, `depthOf`, `projectSegment` (cut where a line passes
behind the camera, for floor grids) and `horizonY`. `still` tells a style when a
frame is a one-off (a thumbnail) rather than playback, so trails, physics and
wobble start clean. It also needs `snapshot()`, a data URL of the last frame, for
thumbnails.

`Stage.snapshot()` is asynchronous: await it so the selected figure has finished loading before rendering the still. The developer keyframe page and thumbnail queue use this same path.

Athlete uses `styles/human.js` for its torso, neck, limbs, hands, face and trainers.
Each arm and leg is one skinned surface. An extra bone halfway between the upper
and lower limb rotations keeps elbows and knees from collapsing. Rounded shoulder
caps roll with the upper arms; the hips blend into the torso's frame. IK surfaces use
the hinge plane; FK surfaces use the authored frames, avoiding sudden twists near
an overhead reach. The head and neck share a shorter attachment without changing
the exercise skeleton's targets.

An extra forearm bone distributes pronation between the elbow and wrist, preserving
volume when the palms turn. Hanging exercises use fixed palm and finger frames
so the grip stays on the bar throughout the rep. Step-up push-off arcs are rebuilt
around the forefoot; side-plank poses solve the shoulder around the planted elbow
and rebuild the hip lift between keys.

Pull-up bars project in front of the door frame on brackets. The head rises behind
the rail with space in front of the doorway beam. Both 3D props and flat styles use
the same bracket dimensions. Wall contacts specify palm and finger directions;
supported hands flatten against any surface, including vertical walls.

Each hand is one skinned mesh with three joints per finger and an opposing thumb.
The palm extends over the wrist, fingers spread against the floor, and the grip
closes around a handle. Adjacent material groups are combined to limit draw calls.
The cobalt blue shirt and coral shorts have narrow hems and a waistband.
Clothing uses a small generated fabric texture and muscle highlighting uses the
existing materials. The face has a defined jaw, subtle cheek colouring and blue
eyes, using Bryan Johnson's portraits as reference. Features attach to the sculpted
face surface; the hair shell stays outside the skull and adds a swept front.
Trainers have coloured side panels, a separate tongue, heel tab and crossed laces.
Their contact sole stays aligned with the existing foot rig.

Breathing deforms the ribcage without moving planted contacts. The stage passes
`grip`, `gripAxis` and `breath` to `figure.update`: weights, goblet holds, bars and
band ends determine which hands close. Hand-oriented dumbbell handles run across
the palm. Blinking and breathing use clip time, so pausing and snapshots are repeatable.

Robot uses ordinary standard materials and the shared three.js rig. Paper cutouts uses SVG polygons with folds and small offset shadows. Halftone uses a cached canvas dot pattern and bold outlines. All three reuse the existing joints, props and held-equipment helpers.

Female athlete uses the same skinned torso, limbs, hands and trainers as Athlete,
with its own torso profile, face, tied-back hair and toon materials. The slimmer arms
keep their original joint lengths. Full-length leggings and a turquoise training top
follow the spine and limb bones. Blinking uses clip time, and the hands use the same
grip and support frames as Athlete. Equipment clearance checks cover both figures.

Stained glass uses vertex-coloured facets, brass wire seams and clear-coated
materials. It uses ordinary lighting without transmission or a refraction pass.
Its shoes follow the Athlete's contact profile with fewer facets, and its palms
flatten against supports. Linocut draws clipped gouge marks along the projected
limbs and ribs, with a cached grain pattern. Orrery uses shaded planet discs,
engraved rods and orbiting satellites. Both canvas styles draw props and held
equipment through `flat.js`; orbits, blinking and the rose window use clip time,
so paused frames and snapshots are repeatable.

To add a style: write its module, add it to `MODULES` in `styles/index.js` and to
`ANIM_STYLES` in `anim-styles.js`, and check it on every exercise with
`/dev/animations.html?ids=all&style=yours`.

Controlled vigorous cardio (`vigorous`) reuses the `zone2` step-up animation; its exercise instructions prescribe the harder pace.
