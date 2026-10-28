# Local voice coach

Implemented from [proposal PR #1 and its discussion](https://github.com/liviux/Bryan-Johnson-workout-website/pull/1). The coach uses Kokoro-82M through the optional, pinned `sherpa-onnx-node@1.13.8` runtime. There is one selected voice at a time: Heart, Bella, Michael, Puck or Emma in English, or the native voice for the selected language.

## Why this runtime

The reviews agreed on Kokoro for a CPU server with several English voices. One review identified Sherpa as a smaller runtime for the same model. Both runtimes were installed and tested on this Linux x64 Xeon environment:

| Check | Sherpa 1.13.8 | kokoro-js 1.2.1 |
|---|---:|---:|
| Installed npm packages | 32 MB | 737 MB |
| Process memory after one cue | 307 MB | 414 MB |
| Cold model load in this test | 7.2 s | 16.3 s |
| Generation of the same short sentence | 24.6 s | 37.9 s |

These are measurements from this environment, without GPU acceleration. They are not latency promises for another computer. A second Sherpa check while other tests ran took 11 seconds to load and 29 seconds to generate. The slow cold generation makes preparation and caching necessary. Serving the cached WAV through the local API took about 26 milliseconds in a separate check.

The model is [Kokoro v1.0 int8 packaged by Sherpa](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html), with a pinned archive SHA-256. The 132 MB archive expands to about 183 MB; the Linux native runtime adds 32 MB. The main app has no new mandatory dependency. Python, CUDA, a second engine, voice cloning and rep counting are outside this feature.

## Included recordings and rebuilding

The app plays shared Kokoro recordings without installing or running a speech model. **Turn coaching on** unpacks the default Heart voice once. Every other voice stays in its compressed pack until you press **Download locally**; the download shows clip-by-clip progress and saves that voice for later. Opening Settings or selecting a voice before the first activation saves no playback cache. Recordings work offline on the server and are shared by PC, tablet and phone browsers.

Each compressed clip in `voice/packs/<voice>/` is one short recording. English packs use `wav.gz` from Kokoro; translated packs use `mp3.gz` from native Microsoft Edge neural voices. The ID includes the voice and exact spoken text. `<voice>.json` records the file sizes and SHA-256 checksums. Form tips are split by sentence, and timer durations use reusable minute and second phrases. A sentence edit creates only the affected clip in each voice; existing recordings keep their filenames and bytes. Obsolete recordings are removed from the current pack when it is rebuilt.

The **Build shared coach voices** workflow builds all five English voices from plan content only. **Build translated coach voices** does the same for Romanian, German, Italian, French, Spanish, Chinese, Hindi, Arabic and Bengali. Neither workflow reads `data/` or local pack manifests. They reuse existing recordings and generate only missing clip IDs. To update the shared audio, run the workflows in GitHub Actions, replace each voice folder and its JSON index in `voice/packs/` with the corresponding build artifact, check them and commit the changed clips and manifests with the usual version bump and changelog. `AGENTS.md` requires this when spoken content changes.

For a local English build, run `npm run voice:install` once, then `node voice/build-packs.js af_heart` (or another voice ID). The installer has its own pinned package and lockfile in `voice/`, verifies the model archive and runs a native smoke test. Linux needs `tar` with bzip2 support. For a translated build, run `node voice/language-entries.js de de_katja > entries.json`, then `python3 voice/build-language-audio.py entries.json` and `node voice/finish-language-pack.js entries.json` (requires `edge-tts`). No model downloads happen during ordinary `npm install` or playback of included audio. The optional legacy installer in the app supports checkouts without shared recordings.

Native inference runs in a child process with two CPU threads. A model failure cannot take down workout saves. Kokoro and Sherpa are Apache-2.0 projects; their licences remain with the installed model and packages. Voice references: [Kokoro voice card](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [Sherpa Node addon](https://github.com/k2-fsa/sherpa-onnx/tree/master/nodejs-addon-examples).

## Script and playback

Each voice request carries its voice ID, and the service loads that voice's language catalogue before building clip text or IDs. A translated voice therefore prepares its own recordings rather than English ones. Pace is a browser playback rate (1.06 for Brisk); both paces share the same recordings.

`public/js/voice/script.js` is shared by Node and the browser. It reads the prescribed dose rather than the logger's `parseRx` heuristic. A pair of dumbbells remains equipment; minute prescriptions do not become sets. Tempo, per-side wording, ranges and technique clauses stay in the dose. Speech refers to the weights and heart-rate targets on screen, keeping personal profile values out of shared recordings. The server accepts known exercise IDs, enum choices and bounded numeric values. There is no endpoint accepting arbitrary speech text.

Each shared pack covers all four levels, both unit systems, add-ons and easier alternatives. Personal weights and heart rates stay on screen. Changing personal details does not require different recordings.

Exercise introductions include the name and dose. Relevant stop and pain instructions are repeated on entry. Repeated paired exercises get the set number. During guided rests, one form sentence is offered at steady pace when its decoded duration fits before the last ten seconds. Typing cancels teaching but keeps clock cues available. A sufficiently long final rest can preview the next movement. Logging on Today does not start rest coaching.

Interval, hold and cardio timers use the same player. Holds say first side and other side; recovery and cardio say their exact duration. Long phases can announce halfway, one minute, thirty seconds and ten seconds. Beeps keep the final three seconds. Timer preparation has a **Start without waiting** button.

The browser fetches and decodes clips ahead of playback. Clock cues interrupt teaching and never wait for a network fetch or synthesis. A late cue is skipped. Back, Skip, Done, next, exit, timer pause/stop, video selection/play and voice-off cancel speech. The browser's old `speechSynthesis` path has been removed, so there is no mid-session change to an operating-system voice.

Radio ducking follows actual playback, including previews: volume is multiplied by 0.12 while speaking and restored on finish, cancellation or failure. Changing volume while ducked updates the underlying preference. The mute flag is independent. On browsers that lock media volume, the radio is temporarily muted during speech instead. This fallback still needs a listening check on physical devices.

## Persistent playback cache

`voice/cache.js` records opt-in and preparation progress under `.voice/packs/`. First activation copies the default Heart recordings into `.voice/audio/`. Other voices are copied only when you press **Download locally**; each requested clip is unpacked from `voice/packs/`, checked by compressed size and SHA-256 hash, and written to the local cache. Files are written atomically. A failed copy keeps finished audio for retry; unfinished packs resume after a server restart.

The default Heart pack is protected from eviction. Downloaded voices stay protected too. The 256 MB cleanup limit applies only to other generated clips, including assembled timer phrases. Both paces share the same recording: Brisk uses browser playback rate 1.06, while teaching stays at 1. Browser buffers and prepared server cue IDs have bounds. Everything stays outside `data/`; personal logs and backups are unchanged.

## Verification

The automated checks cover all plan and add-on prescriptions at every level in metric and imperial, difficult dose strings, easier choices, safety cues, side changes, clock thresholds, request validation, cache-key changes, cancellation while decoding, clock priority and voice independent of beeps. Pack checks compare every published English and translated library with the current spoken script, so content edits require updated recordings. An incremental-build check verifies that changing one sentence leaves unrelated audio untouched. Cache checks cover explicit opt-in, failures and restart recovery. An isolated server test activates included recordings and assembles a custom timer without a native runtime. Browser checks cover Settings, preparation progress, voice switching, automatic coaching after reload, radio volume restoration, rest interactions, mobile layout and interval pause/stop.

Physical iOS/Android audio permissions, locked-screen playback, subjective voice quality and native installation on Windows/macOS have not been verified. Browser timers can be throttled in the background; keep the workout visible for timed guidance.
