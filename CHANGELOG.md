# Changelog

## [1.42.2] - 2026-10-28

### Changed
- Only the default **Heart** voice is prepared locally. Every other voice shows **Download locally** in Voice coach and is copied to your computer only when you ask for it.
- The download button shows clip-by-clip progress while the voice is written, and downloaded voices stay available after a restart.
- The voice cache message explains what is local and what still needs downloading.

### Fixed
- Changing language now also selects that language’s default coach voice, instead of leaving the previous language’s voice selected.
- Voice downloads no longer start automatically for every language; only Heart is prepared on its own.
- The default and downloaded voice caches complete reliably and show progress.

## [1.42.1] - 2026-10-28

### Changed
- Only the default **Heart** voice is cached on your computer. Every other voice plays directly from the included compressed packs, one clip at a time, so changing language no longer unpacks a whole voice into `.voice/`.
- The **Prepare default voice** button replaces the old per-voice download, and the voice cache message explains which voice is local.

### Removed
- Video durations from the video byline. The available metadata source was incomplete and the feature is withdrawn.

### Fixed
- Changing language now also selects that language’s default coach voice, instead of leaving the previous language’s voice selected.
- The default voice cache keeps counting and finishes reliably; old non-default voice caches are cleared on startup.
- The app no longer starts a full translated-voice download when you switch language.

## [1.42.0] - 2026-10-28

### Added
- Guided workouts now keep the session blocks together. A small group name under the top progress bar and in the step list shows where you are, and add-ons use their own colour.
- Each video shows its length before the channel and upload date.
- Voice coach has a **Download voice** button for any included voice that is not ready, with clip-by-clip progress. Downloading also starts automatically when coaching is already on, and Preview waits until the voice is ready.

### Changed
- The language picker sits between **During workouts** and **Voice coach** in Settings.
- **Coaching** and **Pace** sit on one line.
- **How to** and **Videos** on Today now show the same selected style as **Note**.
- The small **Bryan** hint beside Videos is much smaller.

### Fixed
- Translated voices keep polling while their cache is prepared, so the download no longer appears stuck at 0.
- Voice cache progress counts the clips already unpacked instead of jumping backwards or staying at zero.

## [1.41.0] - 2026-10-28

### Added
- Three demonstration videos for every exercise: two technique videos and one short, focused clip. When Bryan has a video it still opens first and stays the default.
- A band picker on band exercises, with the six FitBeast colours and their resistance ranges, plus a custom value. It sits on the same row as reps and weight.
- Bold separators between the set inputs on Today and in guided workouts.
- A small **Bryan** hint beside the Videos tab when the exercise has a Bryan video.

### Changed
- Short clips are labelled **Short** in the video list.
- The language picker sits above Voice coach in Settings.

### Fixed
- Daily readiness buttons now update the day and show the scaled level.
- Romanian and the other translated coach voices prepare the right language, and **Download local voice** no longer starts an unrelated English model.
- Changing **Pace** or **Coaching** in Voice coach now saves the new choice.
- A playing video stops when you switch to another exercise or another guided tab.
- Translated workout doses set the same timers and defaults as English.
- Backup import, extra-activity removal, level-down and desk-break messages, and the Next time suggestion work again.
- Equipment categories stay visible after changing language, balance days still count, and themed block colours keep their kind.
- The inline timer stops when you leave an exercise.
- The Poliquin heel tap meets the floor again.

## [1.40.0] - 2026-10-28

### Added
- Setup now starts with the language picker, so the rest of setup is in your language.
- The language picker in Settings sits above Voice coach and lists each language by its native name.

### Changed
- Reviewed all ten languages across setup, Today, guided workouts, movement lists, timers, Radio, Coach, Activity, Exercises, Plan, Settings and dialogs. Missing labels are translated, and exercise, movement, add-on and radio names follow the chosen language.
- Replaced machine translations that were wrong or read like dictionary entries, including Play, Back, Camera, Skip, workout sets, holds, rounds and level names.
- Rebuilt the translated coach recordings for the corrected wording.
- Dates under videos use your language's format.
- The interface, instructions and coach audio follow the language chosen in setup.

### Fixed
- Elements below the guided animation now translate, including movement order, rounds, block recovery, details and optional replacements.
- Dose text such as "2 s hold", "eyes open" and "per side" now translates.
- Changing language during setup keeps the details you already entered.
- Text added after a page is drawn, including tooltips and labels, now translates too.

## [1.39.0] - 2026-10-27

### Added
- Ten languages in Settings: English, Romanian, German, Italian, French, Spanish, Simplified Chinese, Hindi, Arabic and Bengali. The interface, exercise names, instructions, plan notes, add-ons and coach audio follow the chosen language.
- Native coach recordings for every translated language, built by a new GitHub Actions workflow. English keeps its five recorded voices; each other language has one native voice.
- Right-to-left layout for Arabic, including navigation, cards and form rows.

### Changed
- The app remembers the language in your profile, and dates and numbers use that language's format.

## [1.38.4] - 2026-10-27

### Changed
- Guided timers run in the same row as the value, in place of the timer button, and no longer push the form down.
- Today uses the same inline timer instead of opening a separate timer window. The Timer button beside Minutes and intervals is a little larger.
- **Add set** stays at the end of the last set row, and the timer and remove buttons line up across every row.
- On Today, How to and Videos sit back in the Note row, and the Bryan note stays with the other chips. The exercise panel still fills the screen height.
- Videos in guided mode scroll with the panel instead of staying pinned over the list below.

### Fixed
- Timer start, pause, resume, next and stop work again after the inline timer change.
- Opening guided tools or choosing a video no longer moves the scroll position or focus.

## [1.38.3] - 2026-10-27

### Changed
- Guided timers start from the timer button beside each editable value instead of a separate Start card. They still never start by themselves.
- Minutes and interval timers sit beside their numbers on Today too.
- The running timer is one slim line with Pause, Next and Stop; long text such as a Zone 2 range sits below it.
- **Add set** is a labelled button at the end of the last set row. Set cards stay narrow and extra sets scroll inside their box.
- Note, How to and Videos sit directly below the exercise name and stay pinned while the guided panel scrolls. Next time sits at the bottom, below the coach status.
- The Today exercise panel fills the height of the screen. How to and Videos sit in a pinned row, and the Bryan note sits at the right of the dose row.

### Fixed
- Opening guided tools or choosing a video no longer moves the scroll position or focus. The video player stays above the list.

## [1.38.2] - 2026-10-27

### Changed
- Guided timed exercises show a compact **Start timer** card instead of starting on their own. Only one timer sits in the right panel, and stopping or logging it brings the Start card back for the next set.
- The running timer is a slim line with the time, phase and progress bar, so long text such as a Zone 2 heart-rate range sits below it instead of over it.
- Set cards are narrower than the panel and keep the set name, field name and value on one line. **Add set** sits at the end of the last set row, and per-set timer icons are gone in guided mode.

### Fixed
- Choosing a video keeps the player at the top of the panel instead of jumping to the bottom.

## [1.38.1] - 2026-10-27

### Changed
- Guided timed exercises now open with the timer already running in the right panel; Pause, Next and Stop sit beside it, and the old timer button is only a restart.
- Set rows put the set name, field name and value on one compact line, with narrow inputs. Extra sets scroll inside a capped box instead of stretching the panel.
- Minutes, reps, heart-rate and interval fields use inline labels and smaller inputs.

### Fixed
- The guided Note, How to and Videos row stays pinned to the top, and the video player now opens above the list instead of jumping to the bottom.

## [1.38.0] - 2026-10-27

### Added
- Guided workouts fill each exercise with your level's reps, seconds, minutes or rounds, so **Done, next** records the plan even when you leave the fields alone.
- Checked exercises now have a value to log too: seconds, minutes, breaths or reps, with the plan's default where there is one.
- The guided side panel groups Note, How to do it and Videos on one row, and timed work gets a compact timer in the panel with Pause, Next and Stop.
- The guided bottom bar shows the total workout time and the time spent on the current step.

### Changed
- "Something hurts or too hard?" now sits inside the exercise note, collapsed with it, instead of taking its own row.
- The guided logger is more compact: a tighter set table, smaller inputs and a smaller field for a single number of minutes.

### Fixed
- **Plan change:** Single-leg balance and the forehead-resistance hold no longer state a fixed time or count that differs from your level; their animation cues now point to the time or holds your level prescribes.

## [1.37.0] - 2026-10-27

### Added
- **Reset workout history** in Settings → Your data clears every logged day while keeping your profile, equipment, settings and add-ons.

## [1.36.6] - 2026-10-23

### Fixed
- Every exercise animation was re-audited against the plan; this pass reworks the woodchop: the band wraps over the shoulder instead of through the body, the back foot pivots, and the hands finish at the hip.
- Dumbbells stay in the hands through whole reps: the goblet squat cups the weight at the chest, the swing passes between the thighs with relaxed arms, and reverse lunges, step-ups and calf raises hang level at the sides.
- Rows keep the elbow beside the ribs with a neutral grip, and standing presses keep palms facing in from rack to lockout.
- Pull bars close tightly on the hands with straight arms in hangs and leg raises; forearm planks put the elbows under the shoulders on a mat.
- Wall-supported drills keep the supporting hand planted the whole time (leg swings and standing hip CARs), and hip CARs circle both directions as the steps describe.
- Resting contacts land where they should: the Nordic catch, butterfly seat and instep grips, cobra hands under the shoulders, couch stretch shin on the sofa, side bend hand on the waist, tree foot against the thigh and kneeling cushion on the floor.
- The neck hold demos a full 10-second hold, external rotation sweeps up-and-back, heel drops land with soft knees, jumps land on a mat at quarter-squat depth, climbers rest the forefoot and the Pallof press closes both fists.
- Grips no longer pop through their rotation mid-rep; handles turn through the shortest step instead.

### Changed
- **Plan change:** Side-to-side leg swings say "Stand tall with one hand on the wall" (the animation stands square, not side-on).
- Vigorous cardio shows its own fast-pace demo with matching coach cues instead of the Zone 2 "talking pace" lines; the marching-on-the-spot cue no longer mentions round counting.
- Coach audio rebuilt for all five voices for the side-swing sentence; 1,355 recordings per voice are reused.

## [1.36.5] - 2026-10-23

### Fixed
- Hands stay connected to the palm and grip dumbbells and bands naturally throughout every animation.
- Fixed dumbbells and bands passing through the body in goblet squats, swings, rows, presses, lunges, woodchops, chest flies and seated calf raises.
- Hanging exercises now use straight arms and hang clear of the floor; side-to-side leg swings pass in front of the standing leg.
- Corrected contacts and movement for dead hangs, hanging leg raises, shoulder taps, Nordic curls, dead bugs, push-ups, tree pose, wall slides, hip CARs and single-leg calf raises.
- Cues now match the shown hold times, setup positions and direction of travel.

### Changed
- **Plan change:** Clarified the setup notes for ATG split squats, single-leg toe touches, band pull-aparts, standing external rotation, side planks and side-to-side leg swings.

## [1.36.4] - 2026-10-23

### Fixed
- The Sunday toggle no longer shifts the repeat cycle; it only hides the add-on on Sundays.

### Changed
- Removed the redundant "Every 1 day" repeat option; Daily covers it.

## [1.36.3] - 2026-10-23

### Fixed
- Add-on repeats appear on their exact cycle days again; every 3 days no longer shows the add-on daily.

### Changed
- Each add-on repeat shows its next due date in Settings.

## [1.36.2] - 2026-10-23

### Fixed
- Add-on repeats now count from the last completed or skipped day and stay available until done, instead of appearing only on exact cycle days.

## [1.36.1] - 2026-10-23

### Changed
- Add-on repeat and Sunday controls sit on one compact line in Settings.

## [1.36.0] - 2026-10-23

### Added
- Each add-on has its own repeat setting: daily or every 1–7 days, with or without Sunday.

## [1.35.6] - 2026-10-23

### Changed
- Settings shows name, age, weight and height on one line, with the name field largest, and sex beside units.

## [1.35.5] - 2026-10-20

### Changed
- Document screenshot rules: default animation first, varied styles after, and updates only for substantial visual changes.

## [1.35.4] - 2026-10-20

### Changed
- README voice and radio details start collapsed, with no screenshots in the voice section.
- Opening screenshots show different animation styles, starting with the default Athlete.

## [1.35.3] - 2026-10-20

### Changed
- Today groups Done, Something hurts? and Note into one compact action row; notes open underneath.

## [1.35.2] - 2026-10-20

### Fixed
- Guided navigation leaves completion unchanged; the progress bar reflects completed steps only.
- Use the bottom Skip and Done buttons to record guided exercise status; logging values alone no longer marks exercises done.
- Today’s exercise panel follows the list, scrolls independently and returns to the animation when you select another exercise.
- Coach-audio loading messages appear below the guided controls without moving them.

## [1.35.1] - 2026-10-20

### Fixed
- Hover along the guided progress bar to preview exercises, then click a position to jump directly to that step.

## [1.35.0] - 2026-10-20

### Added
- Hover over or tap the guided step counter to jump directly to any workout step.

### Fixed
- Interval timer demonstrations animate during the ready countdown and each work and recovery phase.
- Pausing an interval timer also pauses its demonstration.

## [1.34.3] - 2026-10-20

### Fixed
- Guided intervals show every round in order beneath the demonstration, including recovery breaks.
- Short-interval choices explain that the optional alternate movement is used every other work burst.

## [1.34.2] - 2026-10-20

### Fixed
- Guided workouts group repeated interval movements so long routines fit on screen.
- The full exercise demonstration stays visible while viewing longer instructions on desktop.

## [1.34.1] - 2026-10-20

### Added
- Shared recordings for all five voices, covering every level, add-ons, easier alternatives and timer choices.

### Changed
- Turning coaching on copies the included audio instead of generating a voice pack locally; speech can play while the rest copies.
- Recordings are saved per short clip; changing a sentence rebuilds only affected clips and keeps the rest.
- Shared voice builds reuse existing recordings and skip the speech model when nothing needs recording.

## [1.34.0] - 2026-10-20

### Added
- A repeatable GitHub build creates shared audio packs for all five voices and all four training levels.

### Changed
- Shared coaching refers to weights and heart-rate targets on screen, keeping personal profile values out of the audio.
- Timer durations reuse recorded fragments, so custom times do not need a new recording.

## [1.33.0] - 2026-10-20

### Added
- The first coaching activation prepares a saved voice pack for your week, form tips and timer options.
- Coach shows cache progress and an estimated wait; selecting another voice prepares its pack too.

### Changed
- Saved voice packs survive server restarts and stay available when switching voices.
- Both speaking paces share cached audio, and repeated interval cues reuse the same clips.

### Fixed
- Ready voice packs play from saved files without waiting for speech generation.
- No workout voice pack is generated before you first turn coaching on.

## [1.32.2] - 2026-10-20

### Fixed
- The Coach popup now shows when audio is preparing, explains the first-use wait and clears the message when speech is ready.

## [1.32.1] - 2026-10-20

### Added
- Permanent version link right above the save status in the sidebar that opens the changelog.

## [1.32.0] - 2026-10-20

### Added
- Optional local Kokoro voice coach with five English voices, previews, pace and coaching controls.
- Guided exercise doses, set announcements, form cues during rest and spoken interval, hold and cardio timers.
- A Coach popup beside Radio, with a one-time model download and offline speech afterwards.

### Changed
- Radio gets much quieter while the coach speaks, then returns to your chosen volume.
- Radio mute is now inside the Radio popup.
- Replaced the operating-system speech voice with the selected local voice.

### Fixed
- Turning timer beeps off no longer silences voice coaching.
- Timer voice controls now save their setting, and moving between guided exercises clears the previous rest timer.
- Logging hold seconds can start the automatic rest timer, just like logging reps.

## [1.31.0] - 2026-10-20

### Added
- Collapse individual add-ons on Today by clicking their headers. They start expanded, with progress still visible when collapsed.

## [1.30.0] - 2026-10-20

### Added
- Individual library entries with instructions, videos and a focused demonstration for each movement.

### Changed
- **Plan change:** Combined warm-ups and exercise variations now appear as separate movements. Guided pairs alternate one set at a time, keeping the existing doses.
- Interval groups list each movement and recovery in round order, with the timer showing the current movement.
- Older combined workout logs remain readable without rewriting saved data.

## [1.29.1] - 2026-10-19

### Fixed
- Corrected body, hand, foot and equipment contacts and smoothed exercise motion across animation styles.

## [1.29.0] - 2026-10-19

### Added
- Eight more workout radio stations from Radio Paradise, KEXP, The Current, Fréquence 3 and Rinse FM, grouped as High energy, Upbeat and Chill. FIP Electro is still the default.

## [1.28.0] - 2026-10-19

### Added
- A quick mute button beside Radio in guided workouts. It mutes the stream without changing the volume and lights up while the sound is off.

## [1.27.0] - 2026-10-19

### Added
- Radio in guided workouts: pick from 11 FIP stations, set the volume, and use previous/next controls. FIP Electro is the default, and your station and volume are remembered.

## [1.26.4] - 2026-10-19

### Fixed
- Side-bend hands stay on the waist, limbs and necks stay connected in three styles, and Blueprint labels clear the figure and equipment.

## [1.26.3] - 2026-10-19

### Fixed
- Hands stay clear of the body in hops, grip bars cleanly and stay connected, and remain spaced during woodchops.

## [1.26.2] - 2026-10-19

### Fixed
- Replaced the overlapping Athlete preview in the animation styles screenshot.

## [1.26.1] - 2026-10-19

### Changed
- Reshaped Athlete's face with softer contours, larger curved eyes with irises and eyelashes, and fuller side-parted hair around the temples, ears and nape.

## [1.26.0] - 2026-10-18

### Added
- Stained glass, a 3D figure with jewel panes, brass seams and a rose window in its chest.
- Linocut, a carved print animation with textured paper, gouged ink lines and a vermilion sun.
- Orrery, an illustrated clockwork figure with planet joints, orbiting moons and a solar heart.
- All three styles work across every exercise in Settings and the live style switcher.

## [1.25.0] - 2026-10-18

### Added
- Female athlete, a 3D cartoon style for every exercise, available in Settings and the live style switcher.

## [1.24.4] - 2026-10-18

### Changed
- Athlete wears a cobalt blue shirt, coral shorts and redesigned white trainers with blue panels and laces.
- Reshaped the face using Bryan Johnson's portraits as reference, with a defined jaw, straighter nose, blue eyes and swept dark hair.
- Rounded the shoulders and refined the skin tones and clothing seams.
- Palm rotation spreads along the forearm, keeping the wrist's shape during curls and chin-ups.

### Fixed
- Hands stay within reach during burpees, toe stretches, butterfly stretches, rows, Jefferson curls and couch stretches.
- Hanging exercises keep the hands on the bar, with the palms facing the right way for pull-ups and chin-ups.
- Pull-ups keep the head and chest clear of the bar and doorway beam.
- Wall-supported movements keep the palms flat, and seated calf raises sit above the chair seat.
- Removed hand twists when a reach passes through vertical, including floor presses and band woodchops.
- Step-ups roll onto the forefoot without sinking into the floor; side planks keep the elbow and foot planted as the hips move.
- Settings refreshes the installed version when opened; the server no longer keeps an old version after an update.

## [1.24.3] - 2026-10-18

### Changed
- Rebuilt the default Athlete with fuller proportions, a shorter neck, a sculpted face and hair, textured clothes and trainers.
- Elbows, knees, wrists and fingers bend through continuous skin, with softer lighting and muscle highlights.
- Jumping jacks carry through each hop and soften the landing; mountain climbers change direction smoothly.

### Fixed
- Closed the gaps between palms and forearms and improved how fingers wrap around equipment.
- Removed wrist flips in side planks and burpees, and corrected the reaching hand in thread-the-needle.
- The pull-up demonstration clears the bar; kneeling and seated demonstrations keep their hands and body on their supports.
- Kept the palm on the forehead during neck resistance and widened views that clipped hands or feet.

## [1.24.2] - 2026-10-17

### Changed
- Athlete has a torso that bends continuously, articulated fingers, a more detailed face, breathing and blinking.
- Hands grip weights, bars and bands, relax when free, and flatten during floor exercises.
- Free arms follow through slightly after the body, and muscle highlights are softer on Athlete.

### Fixed
- High knees and marching lift off and land without a sudden foot jump.
- Floor exercises keep palms parallel to the floor as the body moves.

## [1.24.1] - 2026-10-17

### Changed
- Refined all 65 exercise animations with coordinated shoulders and spine, smoother transitions and more detailed movement paths.
- Walking and cardio show weight shifts, torso counter-rotation and changing elbow bends; curls turn the hands and dumbbells together.

### Fixed
- Push-up hands reach the floor, shoulder taps keep the toes planted, and bird dog keeps its supporting hand and knee still.
- Single-leg hinges keep the reaching hand within arm length, and elbow-on-knee rotation rests the elbow on the knee.

## [1.24.0] - 2026-10-17

### Added
- Every video now shows its channel name and upload date both below the video player and underneath its title in the video list.

### Changed
- Switching between movements or videos automatically moves the 3D animation from `Auto` to `Fixed` so the selected movement and video list stay locked in place.

## [1.23.1] - 2026-10-17

### Changed
- Movement pickers and video lists now stack vertically at full width instead of scrolling horizontally.

## [1.23.0] - 2026-10-17

### Added
- A `Where to look: min X sec Y` timestamp banner appears above every video so you always know where the exercise starts, even if a player resets or can't embed at a timestamp.
- Exercises with multiple movements (such as the dynamic warm-up, jumps, calf raises, pull-ups & chin-ups, dead hangs, heel drops & stomps, knee & leg raises, single-leg RDL & toe touch, external rotation, neck resistance and interval moves) now have 1–5 videos per movement that switch automatically as the 3D animation changes movement.
- Separate 3D animation clips for passive vs active dead hangs, heel drops vs stomp drills, single-leg toe touch vs single-leg RDL, and elbow-on-knee vs side-lying external rotation.

### Changed
- Video embeds start at the exact second where the exercise is demonstrated, with Bryan's clips listed first, and pressing Play pauses animation auto-switching so your video isn't interrupted.
- Replaced long multi-exercise workout videos and mismatched or unavailable clips with short videos focused on the specific exercise.

## [1.22.3] - 2026-10-17

### Fixed
- The README's main weekly targets, Activity and Progress images now show Returning, with the duplicate examples removed.

## [1.22.2] - 2026-10-17

### Changed
- The README includes Activity and Progress screenshots using the Returning plan and sample logs.

## [1.22.1] - 2026-10-17

### Fixed
- Desk breaks appears after the other add-ons on Today and remains available throughout the day.
- The README's main screenshot shows the exercise animation after it has loaded.

## [1.22.0] - 2026-10-17

### Added
- Change your training level directly on the Plan page; a thick border marks your current level.

### Changed
- Settings shows the manual level picker first, with the level check collapsed below it.
- Level checks follow your theme and sit inside Notes & observations on Today.
- Weekly targets compare your level and Bryan's full week in one card.
- The Plan page combines Bryan's weekly targets and home exercise choices.
- Activity keeps all four tabs on one line and stacks the three weekly progress charts.
- Benchmark score fields are wider, with Save on the right.
- Latest changes puts the full changelog link beside its title and close button.
- Equipment uses its checkbox without the repeated "I have this" label.

### Fixed
- Enabled desk breaks stay visible above the workout on Today.
- Latest changes opens at the top instead of scrolling to Read more.

## [1.21.1] - 2026-10-17

### Changed
- Latest changes in Settings moves the full changelog button to the top linking to GitHub.
- Latest changes displays the 20 most recent releases with a Read more button at the bottom to load the next 20 until all changes are shown.

## [1.21.0] - 2026-10-17

### Added
- **Longevity benchmarks & fitness age**: A dedicated Benchmarks view in Activity tracking the 8 core zero-blood physical biomarkers from Bryan Johnson's published battery (continuous push-ups, handgrip strength, dead hang, eyes-closed balance, sit-and-rise, VO2 Max, sit & reach, and heart-rate recovery drop), with ratings and monthly or quarterly cadence.
- **Daily readiness check & "Don't Die" session scaling**: Check in before your session on Today. If feeling tired or sore, scale today's session volume to a lower level with one tap to protect joints and prevent injury without altering your permanent program level.

## [1.20.0] - 2026-10-17

### Added
- **Plan change:** Added two optional Blueprint micro-routine add-ons in Settings: **Bone density protocol** (heel drops & stomp drills, pogo hops, and landing drills from Bryan's bone health guide) and **Dead hang & grip** (passive and active bar hangs and farmer's holds for spinal decompression and grip longevity).
- New exercises **Heel drops & stomp drills** and **Dead hang (passive & active)** with how-to guides, Bryan's notes, video links and 3D animations across all 17 styles.
- An in-workout audio coach for interval training: spoken cues for work intervals, recovery blocks, heart-rate target reminders, 30-second warnings, and a voice toggle in the interval timer and Settings.

## [1.19.0] - 2026-10-17

### Added
- The level check now shows a **Level check ready** chip in the day header when both checks are done, and explains what the next level changes before moving up.
- The level check shows the plan's weeks alongside the session count.
- The next-time suggestion shows progress toward the two-session rule ("1 of 2 sessions at the top") and starts the count fresh after a level change.
- Desk breaks has **Not now, 5 min** to snooze a due break without logging it.
- Desk breaks can send optional browser notifications while the app tab is in the background (off by default).

### Changed
- Desk countdowns pause while a workout is under way and resume afterwards.

## [1.18.0] - 2026-10-17

### Added
- Desk breaks is now its own add-on, off until you enable it, with a normal card below the posture block on Today.
- A second weekly scoreboard: one against the targets for your level, one against Bryan's full Well trained week.

### Changed
- The level check now appears at the end of Today and at the end of a guided workout, with a progress ring, short explanations for each check and a clearer style. It also lives in Settings and no longer appears in Progress.
- Both weekly scoreboards moved to the end of This week.
- Ticking a level-check box updates quietly, without redrawing the page.

### Fixed
- Guided workouts no longer error if the last step is clicked again.

## [1.17.1] - 2026-10-17

### Changed
- Today puts Swap session before Skip day and styles the session picker for each theme.

## [1.17.0] - 2026-10-17

### Added
- A next-time suggestion on every strength exercise (repeat, add weight after two sessions at the top of the rep range, or add a rep) with a button to fill it in.
- A level check in Progress using the plan's move-up checkpoints, a prompt when they are met, and a step-down reminder after a long break.
- Bryan's weekly targets card in Activity → This week: strength, Zone 2, hard cardio, jumps, balance, mobility and posture.
- A "Something hurts or too hard?" option on every exercise: the easier version already in the plan, the previous level's dose, or skipping it today. Progression pauses until you repeat the session.
- Desk mode in the posture block: stand-and-move and 10-squat reminders with a daily count and streak.

### Changed
- Today shows a weekly-targets chip that links to the scoreboard, and Settings links to the level check.

## [1.16.1] - 2026-10-17

### Fixed
- Missed-workout and skipped-day notices keep their text readable on phones, with action buttons below the message.

## [1.16.0] - 2026-10-17

### Changed
- Theme cards show real Today screenshots with a different exercise and animation style for each theme.
- App wording is clearer across setup, workouts, exercise instructions, tracking and Settings.
- Latest changes shows the newest 20 releases and marks workout updates with a red Plan changed badge and highlighted details.
- Plan change history now lives in Settings instead of the Plan page.

### Removed
- Duplicate Plan and Activity shortcuts from Settings.

## [1.15.0] - 2026-10-16

### Added
- **Plan change:** Scheduled Zone 2 and controlled vigorous cardio scale by level toward Bryan’s weekly targets of 150 minutes of Zone 2 and 75 minutes of hard cardio.
- Vigorous cardio has its own instructions, animation, minute logger and timer.

### Changed
- **Plan change:** Well trained includes all target cardio without extra walks; keeping the strength work makes sessions 72 to 93 minutes.
- The plan, weekly durations and readable guide explain the added cardio and gradual lower-level doses.

### Fixed
- Cardio totals exclude easy warm-ups, cool-downs and brisk beginner intervals from hard work.
- Logging zero cardio minutes no longer substitutes the planned duration.

## [1.14.0] - 2026-10-16

### Added
- Activity groups This week, History and Progress into one navigation item with three tabs.
- Grouped progress intervals include This week, Last week, This month, Last month and Since beginning.

### Changed
- Desktop and mobile navigation now have five destinations; existing page bookmarks still work.
- Progress shows exact interval dates and applies them to all charts, tables and summary totals.
- Weekly averages follow the selected interval, and long-term chart labels stay readable.

## [1.13.1] - 2026-10-16

### Fixed
- Today automatically shows the first exercise animation inline on phones and tablets in every theme.
- The selected animation stays visible when resizing between desktop and mobile layouts.
- Mobile bottom navigation includes all seven pages, with direct Plan and Settings links.

## [1.13.0] - 2026-10-16

### Added
- Studio and Journal themes with new desktop and mobile layouts.
- Robot, Paper cutouts and Halftone animation styles for every exercise.
- Equipment, muscle and source filters, more sorting options and search in the exercise library.
- Custom rest timer values and more than 30 extra activities.

### Changed
- Compact effort, energy and extra activity controls on Today.
- Training levels in pairs, a fitted weekly table and clearer heart-rate estimates.
- Dated sources and linked training updates, ordered newest first where dates are known.
- Equipment is collapsed by default in Settings and the README.
- Settings links to the GitHub repository and the full changelog on GitHub.

### Fixed
- Weekly totals show hours instead of function source that stretched the page.
- Developer keyframe previews wait for the animation figure before taking snapshots.

## [1.12.0] - 2026-10-16

### Added
- Optional equipment names, links and ownership in setup and Settings, with custom items, a Massage category and a skip option.

### Changed
- **Plan change:** Step-ups use a low aerobic step; Poliquin heel taps start on a slant board on the floor, with matching animations.
- Checked the plan against Bryan’s workout protocol updated on 14 October 2026.

### Removed
- Liquid chrome and its automatic previews, which could freeze browsers; saved preferences switch to Athlete.

## [1.11.5] - 2026-10-15

### Changed
- Theme and animation screenshots stay visible in the README while technical details remain collapsed.

## [1.11.4] - 2026-10-15

### Changed
- Made the README easier for beginners, with advanced and technical details collapsed by default.

## [1.11.3] - 2026-10-15

### Changed
- README theme screenshots now show six different animation styles, with each pairing named.

## [1.11.2] - 2026-10-15

### Fixed
- Today now opens the first exercise automatically in the Course theme.

## [1.11.1] - 2026-10-15

### Changed
- Liquid chrome now appears last in the animation style pickers.

## [1.11.0] - 2026-10-15

### Added
- Settings shows the app version and opens the five latest release notes.

## [1.10.3] - 2026-10-15

### Fixed
- Keep the selected exercise animation visible when switching between Course and other themes.

## [1.10.2] - 2026-10-15

### Fixed
- Today now scrolls as one page across themes, without a separate scrollbar inside the exercise panel.

## [1.10.1] - 2026-10-15

### Fixed
- Settings stays responsive on open by loading animation previews only when they are near the screen.

## [1.10.0] - 2026-10-15

### Added
- Zoom controls and 2× speed for exercise animations, with a Fixed mode for multi-movement animations.

### Changed
- Removed the live rep counter from animations.
- Restyled the session swap button to match the selected theme.

## [1.9.0] - 2026-10-15

### Added
- Linux users can start the app automatically at boot with the included systemd unit.
- Tailscale HTTPS setup instructions for private access from other tailnet devices.

All notable changes to this project are listed here, newest first.
Versions follow [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`).

## [1.8.0] - 2026-10-15

### Added
- **All fifteen animation styles now work on every exercise** (all 62), not just Zone 2, with each exercise's props (wall, door, step, box, mat, sofa, chair, bench, doorframe and bar), dumbbells, bands and the string drawn in the style's own way.
- **Settings → Animation style**: pick which exercise the preview and the style cards show.

### Changed
- Every exercise now shows your chosen style (Athlete unless you picked another). Pick Mannequin to get the original grey figure back everywhere.
- In every style the muscles the exercise works light up, and the beating heart appears only on cardio.
- Blueprint's title block names the exercise, and it dimensions steps and boxes only when there is one. Doodle has jokes for each kind of exercise and tallies the reps as they're counted; its speech bubble no longer covers the figure.
- **Try styles live** opens today's session, or the exercise in the preview on a phone or a rest day.
- The Animation style section is no longer marked as a test.

## [1.7.1] - 2026-10-15

### Fixed
- On Today, scrolling down now scrolls the exercise panel on the right first, then the page.

## [1.7.0] - 2026-10-15

### Added
- **Six new animation styles drawn without three.js**, still on Zone 2 only:
  - **Liquid chrome**: a mirror-finish body that flows like poured metal, ray-marched in one WebGL shader, with reflections, soft shadows and gold on the worked muscles.
  - **Synthwave**: neon tubes on a scrolling magenta grid under a striped sunset, mirrored on a wet floor.
  - **Blueprint**: an engineering drawing with live knee, hip and elbow angles, hatched muscles and the step dimensioned.
  - **Stardust**: about 1,800 particles in deep space that trail light as the body moves.
  - **Doodle** (funny): a wobbly biro stick figure on notebook paper, with highlighter, sweat, tally marks for reps and a speech bubble with opinions.
  - **Googly** (funny): a fuzzy monster in huge trainers whose googly eyes run on real physics.
- The style cards in Settings are grouped into 3D scenes and styles drawn without three.js, each with a badge for how it's drawn (and which ones are funny).
- On a phone, the floating style switcher shows ‹ name › instead of fifteen numbers.

### Changed
- **Athlete is now the default style and comes first**; Mannequin is number 2. If you already picked a style, you keep it. Every exercise without styles still shows the mannequin.

## [1.6.0] - 2026-10-15

### Added
- **Animation styles (a test)**: nine ways to draw the exercise animation, for now only on Zone 2 ("Easy step-ups or marching"); every other exercise keeps the mannequin. Mannequin, Athlete (semi-realistic), Anime (cel-shaded), Low poly, Cartoon (ink outlines) and Voxel are three.js scenes; Pictogram (SVG), Ink brush (2D canvas) and ASCII (text) are drawn without three.js. All of them play the same movement.
- **Settings → Animation style**: a live preview of Zone 2, a card with a still of each style, and **Try styles live**, which opens Zone 2 with a numbered switcher at the top of the screen, like the theme switcher. Both switchers can be open at once.
- `/dev/animations.html` takes `&style=` to draw the keyframes in an animation style.

## [1.5.0] - 2026-10-15

### Changed
- **Plan change:** Your training level alone now sets the workouts. Each of the four levels (New to training, Returning, Active, Well trained) has its own sets, reps, intervals and Zone 2 minutes; nothing moves on by itself. Your weight, sex and age still scale the suggested weights.
- Choosing the level in Settings now uses the same chips as setup, with what the level means and when to move up or step down.
- Today, This week, the guided workout, Progress, the exercise pages and The plan show your level instead of a phase; The plan and each exercise compare all four levels.
- Days you already logged keep the level they were done at.
- Your data keeps working: if you were past Re-entry, your level is set to match what you were doing (Build → Active, Blueprint → Well trained), and older logged days show the matching level.

### Added
- **Plan change:** A new, gentler set of workouts for New to training: supported or smaller-range moves, 1 to 2 sets, no jumps, swings or Nordics, shorter intervals and Zone 2.

### Removed
- **Plan change:** Phases (Re-entry, Build, Blueprint), their automatic advance after 12 and 24 sessions, the phase lock and the starting-phase setting.

## [1.4.0] - 2026-10-15

### Added
- **Try themes live** in Settings → Appearance: opens Today with a small switcher floating at the top of the screen, one letter per theme (A Original to G Course). Hover a letter to see its name, keep using any page while you compare, and close it with × (or Escape). It stays open across pages and reloads until you close it.

## [1.3.0] - 2026-10-15

### Added
- Setup has a new **Accessories** step: what you need at home (dumbbells, pull-up bar, bands, mat, slant board, step or box, Nordic anchor), each shown in a 3D example exercise.
- **Plan change:** Changing your training level in Settings now switches you to that level's workouts: weights rescale and your phase restarts from the level's starting point.

### Changed
- **Plan change:** Setup no longer asks you to pick a starting phase: your training level decides it. "Well trained" now starts in Blueprint (was Build).
- The four training levels sit on one row in setup (two rows on a phone), with a note that you can change your level any time.
- New default values in setup (age 30, 70 kg, 170 cm, "Prefer not to say", New to training, 20 kg heaviest dumbbell) instead of one person's details.

## [1.2.0] - 2026-10-15

### Added
- Six new themes besides the original look, each with its own layout, type and colours: Chapters and Dark room (after the taste-skill design guide), Pulse and Lab (after ui-ux-pro-max), Olympia and Course (after impeccable).
- A theme step in the first-run setup, and a theme picker in Settings → Appearance; the look changes as you click.
- Olympia colours the header, hero and 3D floor by the kind of session you're viewing; Course opens an exercise in place under its row.
- The 3D scenes and exercise thumbnails take the theme's colours.
- `docs/THEMES.md`: how the themes work and how to add one.

### Changed
- Switching light/dark in Settings now also recolours an open 3D scene straight away.
- Setup has a new Theme step right after Welcome.

### Fixed
- The server reported version 1.0.0 (in `/api/info` and server exports) whatever the release; it now reads the version from `package.json`.

## [1.0.2] - 2026-10-15

### Changed
- `AGENTS.md`: agents no longer create git tags or GitHub releases; they only bump the version and update this changelog.

## [1.0.1] - 2026-10-15

### Added
- `AGENTS.md`: the rules every AI agent working on this repo must follow (versioning, changelog and releases, committing straight to `main`).
- This changelog.

## [1.0.0] - 2026-10-15

### Added
- First version of Home Protocol: a local, Bryan Johnson–inspired six-day home workout planner and tracker, with 3D exercise animations, video demos, auto-saved tracking, progress charts and an optional posture add-on.
- The initial plan follows Bryan's 4 October 2026 weekly template, with every session indoors.
- Strength includes lunges, overhead and floor presses, step-ups, swings and carries alongside his signature exercises.
- Stability includes single-leg RDLs and toe touches, bird dogs, dead bugs, plank shoulder taps and the Pallof press from his Galpin session.
- Exercise videos link to the moment Bryan demonstrates each move, where available, including his May 2026 video.
- The posture add-on includes shoulder external rotation and his squat-break tip, plus chin tucks and a doorway stretch labelled as extra exercises.
- Thursday's 4×4 intervals start with 2 to 3 rounds at a hard but controlled pace.
