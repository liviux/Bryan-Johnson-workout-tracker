# Guided voice coach

Proposal only. Nothing in this document is built yet. It is here so the engine, the voices, and the cue script can be chosen before any code changes.

The app already speaks during interval timers, through the browser's built-in `speechSynthesis` (`public/js/components/timer.js`). That voice depends on the operating system, often sounds synthetic, and says nothing in the guided workout. Guided mode (`public/js/views/guided.js`) shows one exercise at a time, with the dose for the current training level, the set logger, and a collapsed "How to do it". The rest timer after a set is silent. This proposal replaces that gap with one local coach: the same voice for intervals and for the guided session, speaking the dose the level actually calls for, the clock, the transition, and the how-to while you rest.

Speech stays on this computer. No account, no per-character service, no audio uploaded. If the model is missing, the workout still runs, and the old browser voice remains as a fallback.

## What has to be decided

1. **Engine.** Kokoro-82M is the recommended default. Qwen3-TTS is the better coach voice if a GPU is acceptable. Chatterbox-Nano is the expressive CPU alternative. The comparison is below.
2. **How much it talks.** Recommended: cues always (name, dose, set, clock, transition), and the how-to only during rest, with its own switch. Someone who already knows the movements can keep the counts and turn the teaching off.
3. **Install.** Recommended: do not make the voice a required `npm install`. Download the library and the weights on first use, into a gitignored folder. `npm start` keeps working if that download never happens.

A yes on those three is enough to build. The cue script does not change between engines.

## What people are actually using

Checked on 19 October 2026, against recent posts and write-ups. Closed services (ElevenLabs and the rest) are out: they are not local, and they are not free to ship in this app.

The names that keep coming up for local, open-weight speech are Kokoro, Chatterbox, and Qwen3-TTS.

- **TTS Arena, 10 October 2026** (as reported by [Yaps' licence roundup](https://www.yaps.ai/blog/best-local-tts-models)): Chatterbox is the highest clearly open-weight model on the board, Elo 1481 ± 19 from 1.8k votes. Kokoro v1.0 sits next to it at 1478 ± 22 from 1.0k votes, inside the error margin, and is marked retired on that board. ElevenLabs Eleven v3 is just above them at 1501. For open weights, those two are tied for "sounds human" in blind votes.
- **Artificial Analysis voice board, 9 October 2026** (as reported by [Cartesia's licence comparison](https://www.cartesia.ai/learn/open-source-tts)): Kokoro 82M scores 1064, level with NVIDIA Magpie, under Apache 2.0. Chatterbox's English model scores 1026, MIT. Fish Audio S2 Pro scores higher (1116) and is not licensed for this public app.
- **Reddit, 23 June 2026.** [r/TextToSpeech](https://www.reddit.com/r/TextToSpeech/comments/1udgi9s/open_source_tts_comparison_kokoro_82m_vs/) and [r/selfhosted](https://www.reddit.com/r/selfhosted/comments/1udg5vz/tested_3_openweight_text_to_speech_models_on_cpu) ran Kokoro, Supertonic 3, and Inflect-Nano on CPU only. Kokoro was the natural one. On a 4-core Xeon the ONNX build managed about 1.8× real time (a 10-second clip in about 5 seconds). Supertonic 3 was faster and a step less warm, under OpenRAIL-M. Inflect-Nano was tiny, fast, and robotic, and it stops at about 15 seconds.
- **Reddit, 27 June 2026.** [r/LocalLLM](https://www.reddit.com/r/LocalLLM/comments/1uh2xyh/what_is_the_best_opensource_tts_model_right_now/) sorted models by size. The short version from that thread: Kokoro or Supertonic under ~120M, Chatterbox-Nano as the one a commenter would actually pick in that range, Qwen3-TTS between ~120M and 800M, VoxCPM2 if you can afford ~2B. Another comment called CosyVoice 3 capable and painful to install.
- **X, this month.** On 17 October 2026, [@bebinoy](https://x.com/bebinoy/status/2111431839164555448) described a local Mac stack: Kokoro for speech, then Qwen3-TTS when a 10-second clone is needed. On 15 October, [@jasonjias](https://x.com/jasonjias/status/2110805676729700815) called Kokoro lightweight because it is not autoregressive, and uses the Heart voice as the default. On 14 October, [@_Abides_](https://x.com/_Abides_/status/2110200615418946037) disliked Kokoro and pointed at Pocket TTS and Chatterbox, with Fish Speech or Orpheus only if the machine can take them. The split on X matches the boards: Kokoro for small and local, Chatterbox or Qwen when you want more performance out of the voice.
- **Older, still the integration that matters.** On 7 February 2025, [@xenovacom](https://x.com/xenovacom/status/1887883185494565006) showed Kokoro v1 running in the browser through `kokoro-js` and WebGPU. That library also runs in Node on CPU. A May 2026 benchmark on an Apple Silicon Mac ([kokoro#320](https://github.com/hexgrad/kokoro/pull/320)) generated a short line in about 440 ms, roughly 6× real time, with the model using about 2 GB of memory once loaded. Cold load was about 3.5 seconds.

Left out on purpose:

| Model | Why it is not one of the three |
|---|---|
| Fish Audio S2 Pro | Strong listening scores. The Fish Audio Research License does not allow this public MIT app to ship it. Large, and it wants a GPU. |
| Supertonic 3 | Fast on CPU, and popular in the June Reddit tests. OpenRAIL-M restricts commercial use. Awkward to depend on from a public MIT repo. |
| Piper | Runs anywhere. The voices sound like the previous generation. GPL engine, and each voice has its own data licence. |
| XTTS v2 | Coqui shut down. The licence is non-commercial. |
| VibeVoice | Long-form, research licence. Wrong tool for one-line cues. |
| Pocket TTS | About 100M, CPU, mentioned on X. Too small a public voice roster for five distinct coach types, and less of a paper trail than the three below. |
| Inflect-Nano | Apache 2.0 and tiny. The same Reddit tests called it buzzy, and it caps a clip at about 15 seconds, which cuts off a how-to step. |
| CosyVoice 3, Orpheus, Dia | Capable, and Orpheus/Dia are Apache 2.0. They are 1B–3B class. Same GPU problem as Qwen, with less of a plain-language "make it a coach" control than Qwen's Voice Design. |
| The browser voice we have now | Stays as the fallback. It is not the coach. |

## The three engines

All three are open weights you can run offline. All three can supply more than five voices. They differ in whether the energy is in the voice, and in what this Node app has to take on to run them.

### 1. Kokoro-82M — recommended

[hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache 2.0. 82 million parameters. The JavaScript port is [`kokoro-js`](https://www.npmjs.com/package/kokoro-js), model id `onnx-community/Kokoro-82M-v1.0-ONNX`. Quantized q8 weights are about 90 MB. It runs on CPU in Node (`device: "cpu"`) or in the browser (`wasm` / `webgpu`).

**Why it fits this app.** The server is Node with no Python, and the phone is only a client (`HOST=0.0.0.0 npm start`). Kokoro can speak on the machine that already runs `npm start`, and the phone just plays the audio. That is the right split: a phone should not be asked to run a speech model in the middle of a set. Apache 2.0 sits cleanly next to this repo's MIT licence, as long as the Apache notice stays with the weights. Blind scores put it level with Chatterbox. The June CPU test and the May Mac benchmark both say a normal computer can keep up, if short cues are prepared ahead of the moment they are needed (see [Timing](#timing)).

**Voices.** The official [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) lists 54 presets: American and British English, plus Japanese, Mandarin, Spanish, French, Hindi, Italian, and Brazilian Portuguese. American English is 11 female and 9 male. British English is 4 female and 4 male. The model's own grades, not a marketing page, should decide what Settings offers. English voices graded C+ or better already cover the request:

| Id | Who | Grade in VOICES.md | Role in the picker |
|---|---|---|---|
| `af_heart` | American female | A, the best in the set | Default. Warm, the one people on X actually name. |
| `af_bella` | American female | A−, marked expressive | Brighter of the two women. |
| `af_nicole` | American female | B−, marked for headphones | Softer, closer, for a quiet room. |
| `bf_emma` | British female | B− | A different accent, not just another American voice. |
| `am_michael` | American male | C+ | Clearest of the better-graded men. |
| `am_fenrir` | American male | C+ | A second male, heavier than Michael. |
| `am_puck` | American male | C+ | Lighter male. A rankings site tags him upbeat; Kokoro itself does not. |

That is seven, male and female, with accent and tone as the "other types". Voices graded lower (several American men sit at D or below, including `am_adam`) stay out of the picker. A speed argument exists in `kokoro-js`. A brisk setting around 1.05 to 1.12 is the honest way to get a more energetic delivery. There is no prompt for "sound like a coach".

**Where it is weak.** It will not match a directed performance. Heart sounds like a calm narrator who can be sped up a little, not like someone calling a class. No voice cloning, which is a virtue here: we do not need a consent flow. No emotion tags. The first load costs a few seconds and then about 2 GB of RAM on the Mac benchmark; voice-off must not pay that, so the model loads on the first spoken line, not at server boot. `kokoro-js` pulls `onnxruntime-node` through Transformers.js. That package publishes prebuilt CPU binaries for Linux x64 and arm64, Windows x64 and arm64, and macOS x64 and arm64, and it is large. Two copies of it in one process have been reported to crash Node, so this app should not also depend on a second Transformers build. Treat the voice library as optional, installed into its own folder on first use, and confirm `npm install` of the main app still succeeds with the voice folder absent.

### 2. Qwen3-TTS — the energetic coach, if a GPU is acceptable

[QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), released 22 January 2026, Apache 2.0. Alibaba's Qwen team. Two sizes, 0.6B and 1.7B, and three checkpoints: CustomVoice (fixed speakers), VoiceDesign (a voice from a written description), and Base (clone from about 3 seconds). The [README](https://github.com/QwenLM/Qwen3-TTS) quotes 97 ms to the first audio packet on their own streaming setup. That number is a lab result on a GPU, not a promise for a laptop CPU.

**Why it is on the list.** It is the model that can be told how to perform. CustomVoice's 1.7B checkpoint takes an instruction such as "Energetic and encouraging, like a fitness coach. Clear, brisk, not shouting." VoiceDesign goes further: "A bright woman in her thirties, American, short sentences, warm but driven, the voice of a coach in a small room." That is the energetic fitness voice, and it is also how you get types that are not just male or female labels: an older steady coach, a calm mobility guide, a bright caller, a low quiet one. X and the January launch ([@Ali_TongyiLab](https://x.com/Ali_TongyiLab/status/2014329134395081169), [@akshay_pachaar](https://x.com/akshay_pachaar/status/2015403657278423408)) treated voice design as the feature. Reddit's June size guide puts it in the band above Kokoro when quality and control matter more than install size.

**Voices, open weights only.** CustomVoice ships nine speakers. The hosted Qwen API has many more names; those are not in the weights we would run.

| Speaker | Description from the model card | Native language |
|---|---|---|
| Ryan | Dynamic male, strong rhythmic drive | English |
| Aiden | Sunny American male, clear midrange | English |
| Vivian | Bright, slightly edgy young woman | Chinese |
| Serena | Warm, gentle young woman | Chinese |
| Uncle_Fu | Low, mellow, seasoned man | Chinese |
| Dylan | Young Beijing man | Chinese (Beijing) |
| Eric | Lively Chengdu man | Chinese (Sichuan) |
| Ono_Anna | Playful, light woman | Japanese |
| Sohee | Warm, emotional woman | Korean |

For an English workout, Ryan and Aiden are the native English men. Vivian, Serena, Ono_Anna, and Sohee can speak English; the card says each speaker is best in their native language, so an English woman should be checked by ear before she is offered, or created with VoiceDesign and then reused. VoiceDesign is 1.7B only. The 0.6B CustomVoice checkpoint ignores style instructions. Five types, if this engine is chosen:

1. Ryan, with a coach instruction (energetic male).
2. Aiden, with a calmer instruction (friendly male).
3. A VoiceDesign woman: bright, energetic, American coach.
4. A VoiceDesign woman: warm and slower, for mobility and stretches.
5. Uncle_Fu, or a VoiceDesign low older voice, for a steadier guide.
6. Optional: a VoiceDesign voice described without a gendered brief, so the fifth "type" is a tone rather than another binary label.

Designed voices should be created once, saved as speaker prompts or reference clips in a gitignored cache, and reused. Redesigning on every line would change the person mid-workout.

**Where it is weak for this project.** The official quick start is Python 3.12, PyTorch, CUDA, and FlashAttention. An independent write-up updated 30 September 2026 ([KloudiHub](https://news.kloudihub.com/qwen3-tts-deep-dive-design/)) measured about 3.9 GB of VRAM for the 1.7B model and said CPU is usable for batch jobs with 16 GB of RAM and too slow for live speech. Weights are about 2.5 GB (0.6B) or 4.5 GB (1.7B), plus a 0.7 GB tokenizer. That is a new runtime next to `server.js`: a Python sidecar this app does not have today, started only if this engine is chosen. There is a community GGUF port (`qwentts.cpp`) for CPU, Metal, and Vulkan; it is not the official path and would need its own trial before we trusted it. On a machine without a GPU, pre-rendering a whole session at the start is the only way the cues arrive on time, and a slow CPU can make "start workout" wait. This app's documented install is Node 18 and `npm start`, including a systemd unit on a home Linux box. Qwen is the right pick when that box has an NVIDIA GPU, or when sounding like a coach matters more than a one-command install.

### 3. Chatterbox-Nano — expressive, CPU, and a watermark

[Resemble AI's Chatterbox family](https://github.com/resemble-ai/chatterbox), MIT. The [Nano model card](https://huggingface.co/ResembleAI/chatterbox-nano) is the one that belongs on this list: 110M parameters, English, the same paralinguistic tags as Turbo (`[laugh]`, `[chuckle]`, `[sigh]`, `[gasp]`, and others), and the vendor's figure of about 3× real time on an 8-core CPU. Turbo is 350M, English, faster on a GPU, and wants more memory. Multilingual is 500M and 23 languages. MIT is the simplest licence of the three. TTS Arena on 10 October 2026 had Chatterbox a hair above Kokoro. The original model also has an exaggeration control, from flat to theatrical. Reddit's June thread is where Nano gets recommended over Kokoro by people who have tried both in the small-model range.

**Voices.** The model does not ship a graded roster the way Kokoro does. One default voice, plus zero-shot cloning from a short reference clip (the Nano card says about 10 seconds; Turbo's materials say about 5). Community servers pass around named wav files (Abigail, Adrian, and so on). Those files are someone else's recordings. This repo should not ship them. Five types then means five references we have the right to use:

1. The built-in default.
2. to 5. Clips recorded for this app, or generated once by another local model and saved: energetic woman, energetic man, calm woman, calm man, and one steadier or older guide.

Cloning a real person's voice is opt-in, with their permission, and off by default. A fitness app does not need to clone the user.

**Where it is weak.** Python and PyTorch again, even though Nano then runs on CPU. Every file is watermarked with Resemble's PerTh watermark. They describe it as imperceptible and persistent through mp3 compression. For a private workout that is a mild oddity, not a blocker, and it should be said in Settings ("clips carry an inaudible watermark"). The fun tags are mostly wrong in a session: a coach should not laugh, cough, or gasp. A single breath before "go" is the only tag worth trying, and only after listening. Exaggeration high enough to feel "energetic" can tip into acting. Nano's 3× real-time figure is the vendor's, on 8 cores; the Kokoro numbers above are independent tests on other machines, so this proposal does not claim one is faster. English only, which matches the app today.

## Recommendation

Build against **Kokoro-82M**, spoken from the Node server, with the phone only playing audio.

The reason is the machine this app already runs on. A guided cue that arrives late is worse than no cue. Kokoro on CPU, with the next exercise prepared while the current one is happening, meets that bar without Python, without a GPU, and without a research licence. The voice will be human and consistent. It will not be the most fired-up of the three. Speed and the brighter presets (Bella, Puck) are the energy it can offer.

Choose **Qwen3-TTS 1.7B** instead if you want the coach to sound energetic because you told it to, and you have a GPU with about 8 GB free (or you are willing to trial the GGUF port and reject it if the cues lag). The cue script in the next section stays the same. Only the engine adapter changes.

Choose **Chatterbox-Nano** if you want expression and a MIT licence on CPU, and you accept a Python sidecar plus the watermark. It does not beat Kokoro on "five voices included", because the extra voices are clips we would still have to produce.

The settings screen should not offer three engines on day one. One engine, a voice list, a preview button. Swapping engines later is an adapter, not a rewrite, if the script builder never imports the model.

## The coach, independent of the engine

A pure function, `public/js/voice/script.js`, turns the workout into lines. No audio. Tests can lock the words without listening. The player (`public/js/voice/player.js`) queues those lines, drops any line that is not ready, and stops the moment you pause, skip, exit, turn the voice off, or start a video.

The words come from data the app already has:

- The exercise name, category, equipment, `how` steps, `tips`, and `easier` (`public/js/data/exercises.js`).
- The dose for this level, `rx` as `[New, Returning, Active, Well trained]`, already chosen by `rxFor` (`public/js/plan.js`). A level whose dose is `"—"` never appears in the guided steps.
- Today's override, if you tapped "Something hurts or too hard?" (`rxOverride`, `easier` on the log).
- `parseRx` in `public/js/components/logger.js`, which already pulls sets, reps, seconds, minutes, and per-side out of a dose.
- The level's effort line (`LEVEL_PLANS` in `public/js/data/program.js`).
- Heart-rate zones and the personalised `{hr:…}` / `{kg:…}` text (`personalize.js`).
- The rest length in Settings (`restSec`, default 75 seconds) and the interval phases already in `timer.js`.
- The next guided step, including a block change and the move into an add-on.

`parseRx` is for the logger's blanks. It drops the coaching words, and it can misread a dose that mixes a count with a weight. After personalisation, `"2 min holding 2 × {kg:8-10}"` becomes something like `"2 min holding 2 × 8–10 kg"`, and a naive "number × number" read thinks that is 2 sets of 8. The speaker uses `parseRx` for sets, reps, and per-side, then speaks the leftover clause itself: "down to a chair", "3 s down", "hands on a table or a wall", "heaviest dumbbell". If the parse is unsure, it speaks a cleaned sentence (× as "sets of", @ as "at", /side as "each side") and never speaks a `{kg:…}` token. Numbers are words: "ten seconds", "one minute", "eight to ten", in the units the profile uses.

Bryan's long note on the exercise is a citation. The coach does not read it. The short "Bryan: …" chip stays on screen.

### On a new exercise

Said once, when the guided step opens. Going back to an exercise you already heard gets one short line ("Back to the goblet squat"), not the full introduction.

Using Monday's real doses:

- New to training, goblet squat (`2 × 8 @ {kg:10-14}, down to a chair, 3 s down`): "Goblet squat. Strength, exercise 4 of 18. 2 sets of 8, about 10 to 14 kilograms. Down to a chair. Three seconds on the way down."
- Active, same lift (`3 × 8–10 @ {kg:14-20}`): "Goblet squat. 3 sets of 8 to 10, about 14 to 20 kilograms."
- Active, one-arm row (`3 × 10/side @ {kg:18-20}`): "One-arm row. 3 sets of 10 each side, about 18 to 20 kilograms. Right side first, then the left." The log still has one row per set. The voice does not invent extra sets. It only says that each set covers both sides. "Right" and "left" are labels, not a guess about the dominant hand. The hold timer already says "First side" and "Other side"; match that when the timer, not the dose, is what switches sides.
- New to training, kettlebell swing (`—`): not in the step list, so it is never spoken.
- Well trained, push-up (`3 × 12–15, 3 s down, or feet raised`): "Push-up. 3 sets of 12 to 15. Three seconds down, or feet raised."

Then one form line: the first `how` step, cut to a sentence, unless the first `tips` entry is a stop-or-pain warning. A pain warning wins, and it is said every time that exercise opens. At New to training, if `easier` exists, one sentence of it. If today's log already has an easier choice, speak that dose and that note, not the level's normal dose.

Once per strength block, not once per exercise, add the level's effort in short form. Active is "Leave 2 or 3 reps in the tank." Well trained on a main lift is "Leave 1 or 2 reps." Accessories that go close to fatigue are named as such only when the dose says so. The full level essay stays on the Plan page.

Equipment is one line when it is not bodyweight: "A dumbbell in each hand."

Tempo ("3 s down", "slow") is spoken on set 1 only, then dropped so it does not nag.

### During the set

The logger records reps after the set. The voice does not count reps the animation happens to be playing, and it does not count reps you have not logged. An optional "count with me" can come later; it is not part of this pass.

At the start of a set: "Set 2 of 3. 8 to 10 reps." On a hold or a timed carry, the existing hold timer already runs. The voice names the side and then lets the clock talk.

### The clock

The interval timer already says get-ready, work, recover, halfway, 30 seconds, and 10 seconds on the recovery. Keep those, in the new voice, and fill the holes a longer block needs.

| Moment | When | Line |
|---|---|---|
| Get ready | Opening countdown of 5 seconds or more | "Get ready." |
| Work starts | Every work phase | "Work. Interval 3 of 8." Plus the duration if it is over 30 seconds: "Four minutes." |
| Heart rate | With the work or recover line, when the phase has a target | The zone in words, from `ZONES`, plus the beats. Zone 2: "You should still be able to talk in full sentences. About 120 to 140 beats." Hard: "A few words is enough." |
| Halfway | Work of 2 minutes or more | "Halfway." |
| One minute | Work or Zone 2 of 3 minutes or more | "One minute left." |
| 30 seconds | Work of 1 minute or more | "Thirty seconds." |
| 10 seconds | Any phase of 30 seconds or more, including the long work and the rest between sets | "Ten seconds." On a rest that leads into another set: "Ten seconds. Next set." |
| Side switch | Hold timer's switch phase | "Other side." |
| Block rest | Between interval blocks | "Walk. Breathe. The next block starts in three minutes." |
| Done | Timer finishes | "Intervals done." One line. |

Beeps stay. They are the last three seconds. The voice does not also count "three, two, one" on every interval; the beeps are clearer under breathing. The voice does count down only if tests show the beeps are too easy to miss. That is a follow-up, not the default.

Phrases that repeat all session ("Rest", "Halfway", "Ten seconds") get two or three wordings so it does not become a sample. Safety lines and numbers do not vary.

### Rest, and the how-to

`startRest` runs from the logger on Today as well as inside the guided workout. Teaching speaks only while guided mode is open. Logging a set on Today stays quiet, apart from the beep it already has.

Default rest is 75 seconds. The plan's strength note says 60–90. The voice uses the timer you actually started.

Order, and it stops early rather than talking over the last 10 seconds:

1. "Rest. About a minute." (or the real length)
2. How-to steps not yet spoken for this exercise, one step at a time.
3. One tip, if a step is not waiting.
4. On the last set's rest, the next exercise: name, dose, and the first form line. "Next is the one-arm row. 3 sets of 10 each side."
5. If the how-to is finished and there is no next exercise to preview, stop. Silence is better than reading Bryan's paragraph or repeating a step.

A step that will not finish before the 10-second warning is not started. The next rest of the same exercise continues at the next step, rather than starting over. A rest under 20 seconds gets the "Rest" line and nothing else. If you press play on a demo video, speech stops and does not resume mid-sentence. If you are typing in a set field, the queue waits.

A block change is its own line, ahead of the next exercise name: "Warm-up is done. Strength is next." Moving into an add-on: "Main session done. Posture is next." Skip: "Skipped. Next is the row." Exit and voice-off cancel anything still queued.

### End of the workout

"Workout complete." If the level check is ready, it can offer the questions one at a time, because those questions are already on the finish screen. It does not read the move-up essay. You still change level yourself.

### What this deliberately does not say

- Rep-by-rep counting, unless a later setting asks for it.
- The progression rule ("two sessions at the top") on every set. The on-screen suggestion already covers next time. One mention, on the last set of a main lift, is enough if we want it at all: "Same weight next time if the top reps stay clean." Easy to cut if it nags.
- Hydration reminders, praise, streaks, "let's crush this".
- Heart-rate alarms. The app does not read a strap. It can only say the target.
- Anything while voice is off, while a video is playing, or while the model has not produced the line yet.

## Timing

A cue that lands after the moment is a bug. The rule is: if the audio is not ready, skip the line.

Prepare, do not improvise, for the lines we can know in advance:

- When a voice is picked, or when a guided workout opens, generate the fixed vocabulary: "ten seconds", "thirty seconds", "one minute", "halfway", "rest", "other side", "get ready", "work", "recover", and the set counts through 5.
- When an exercise opens, generate its introduction, its how-to steps, and its per-set lines. The user is getting into position. A how-to step is one or two sentences. By the time the first rest starts, those lines exist.
- The 10-second and 1-minute lines are in the vocabulary, so they never wait on the model.

Kokoro's Mac benchmark (about 440 ms for a short line, about 6× real time) makes this comfortable. The Xeon test (about 1.8× real time) still works, because the line is built during the set, not at the bell. Qwen on a GPU can speak live and still use the same cache. Qwen on a CPU should not be asked to speak live.

Cache key: engine, model version, voice id, speed, and the exact text. Memory for the session, and a gitignored disk cache so the next workout does not rebuild Monday's how-to. Not inside `data/`, so a backup of your logs does not fill up with wavs. The cache can be deleted at any time.

The speak route is not a public text-to-speech server. It accepts the app's own lines, with a length cap. The app already has no login; this does not add a new open proxy.

## Settings

Extend the current voice switch. Old profiles keep working: `voiceCoach: true` still means the interval coach is on.

- **Voice coach:** Off, Cues, or Cues and coaching. Cues cover the name, the dose, the set, the clock, and the transition. Coaching adds the how-to on rests. Default for a new profile: Cues and coaching, once a local voice is installed. Until then, the browser voice does the cues it already does, and the how-to stays off, because the browser voice reading six steps is the experience we are trying to leave.
- **Voice:** the curated list for the chosen engine, with a preview that says one fixed line: "Set 2 of 3. Ten reps. Slow on the way down."
- **Pace:** Steady or Brisk. Brisk is the energetic end of whatever the engine allows (Kokoro speed, Qwen instruction, Chatterbox exaggeration). The how-to always uses Steady, so teaching does not sound rushed.
- **Local voice:** a download button that states the size before it starts (about 100 MB for Kokoro q8, a few gigabytes for Qwen). After that, offline, and the same person on the laptop and on the phone.

Spoken lines follow the same plain style as the rest of the app. Short sentences. No slogans.

## What to build, in order

Each step is usable on its own. None of them bumps a major version. Shipping the feature is a minor version: new behaviour, old logs still load, voice-off still works. This proposal changes nothing in the app, so it does not take a version bump or a changelog entry. The implementation does, in the same commit as the feature, per `AGENTS.md`.

1. **Script and tests.** `public/js/voice/script.js` and `tests/voice-script.test.js`. Cover Monday strength at all four levels, a per-side dose, a `"—"` dose, a tempo clause, a pain tip, an easier override, a rest budget that refuses to start a step it cannot finish, and the 60 / 30 / 10 clock. No model yet. This is the piece to read in the implementation review, because a wrong sentence is a wrong coach.
2. **Player and fallback.** One queue. Cancel on pause, skip, exit, voice-off, and video play. `speak()` in `timer.js` goes through it, so intervals and guided mode cannot talk at the same time in two different systems. Browser `speechSynthesis` remains when the local engine is absent.
3. **Kokoro in Node, optional.** Lazy load. A local route returns audio for a prepared line. Settings lists the seven voices and can preview them. Confirm the native ONNX binary installs on Linux, Windows, and macOS, and that a failed install does not break `npm start`. Weights and the disk cache are gitignored.
4. **Wire the guided workout.** `guided.js` asks for the introduction on each new step, the short line on Back, the skip line, the block-change line, and the finish line. The rest timer notifies the coach only while guided mode is open. The interval, hold, and Zone 2 timers use the clock table above.
5. **Phone pass.** Start a guided session on a phone on the same Wi-Fi, with the server doing the speech. Check that the first tap unlocks audio, that a 10-second cue arrives on time, that a video silences the coach, and that exit stops it. Also check Today: logging a set must not start the how-to.

Out of this pass: rep counting, a second engine in the UI, voice cloning, reading Bryan's notes, and any change to the doses themselves.

## How we know it is right

- The script tests pass on the real dose strings, including the ones `parseRx` only half understands.
- In the browser, a guided strength block says the level's dose, says "ten seconds" before the rest ends, reads the next how-to step on the following rest instead of repeating the first, and stops when a video plays.
- An interval block still announces work, recovery, the heart-rate target, halfway, and thirty seconds, in the selected voice.
- Voice off, and a missing model, both leave the workout fully usable.
- A phone on the LAN hears the server's voice and does not try to run the model.
- Today, outside guided mode, does not narrate.
