# Loomy handoff: finish the "film quality" upgrade

Written 2026-11-21 (EST evening) by the Claude session that built it, so another agent can finish the
work if this one runs out of usage. Everything named here is committed in this repo.

## Master prompt (paste this into a new Claude Code session on this repo)

> You are continuing work on Loomy (this repo, deployed to Cloudflare Pages from `main` of
> github.com/SankeerthMallesh/AiAnimator). Read `HANDOFF.md` fully first, then `git log --oneline -30`.
> Goal: make Loomy's 3D, Blocky and Cartoons tabs produce videos at the quality of the three
> hand-made films described in HANDOFF.md (code-drawn scenes made with the zach-d-films and
> cartoon-3d-short skill engines, ElevenLabs v3 narration with a delivery tag per line, word-timed
> captions, a scored soundtrack with sound effects). Work through the "Remaining work" list in order
> (L2, L3, L4, L5, then the editor items), one fix per commit with its ID in the message, never
> loosening a test. After each step: run `node tools/tests/unit/run.mjs`, the mocked full-video
> tests in `tools/tests` (see its README), render a few stills/clips of the new look and look at them
> yourself before calling it done. The user is in EST: give every time in EST. No paid services by
> default; never copy Roblox, Zack D. Films, toy-brick or other brands or IP into Loomy; credit the
> CC-BY Renderpeople models. Never ask for API keys in chat. Keep the user posted in short, plain
> messages and send them images or clips of the results. Ship each finished step to the live site
> by following "Deploying to Loomy" in HANDOFF.md (stamp versions, test, push to `main`, then confirm
> the new version stamp on https://loomy-app.pages.dev), and tell the user when it is live.

## What the user wants

"Make sure my tool does this": Loomy itself should make videos like the three films below, from a
typed topic, in the browser (the user's GPU renders fast; this sandbox has none, so renders here are
slow, about 5-15 s a frame).

## The three reference films (made by hand in this session)

| Tab | Film | Code | Voice |
|---|---|---|---|
| 3D | "Frozen lake" (icewater), 64 s | `explainer/js/z3d/films/icewater.js` (+ `-words.js`, `-time.js`) | ElevenLabs v3, Liam `TX3LPaxmHKxFdv7VOQHJ` |
| Blocky | "The Snow Fort", 62 s | `explainer/js/z3d/films/snowfort.js` (+ `-words.js`, `-time.js`) | Jessica `cgSgspJ2msm6clMCkdW9`, Kai = Will `bIHbv24MWmeRgasZH58o` |
| Cartoons | "The Bridge That Fell for a Song" (the cartoon-3d-short skill's own story), 67.5 s | `cartoon/js/c3d/cartoon3d.js` bundle, source `tools/c3d-src`, test page `tools/tests/c3d/index.html` | George `JBFqnCBsd6RMkjVDRZzb` |

- Test page for the z3d films: `tools/tests/z3d/film.html?film=icewater|snowfort[&msaa=0&ao=8]`
  (`window.still(t)`, `window.clip(start, len)`). `films/retime.js` stretches shots to a new voice take.
- Production scripts are in `tools/films/` (copied from the session scratchpad):
  - `filmrender.cjs <film> <outdir> <dur> [piece]`: resumable piecewise render (env `Q="&msaa=0&ao=8"` = 40 % faster, no visible loss).
  - `c3dfilm.cjs <outdir> 2025 150`: renders the cartoon bridge in 150-frame parts.
  - `filmstills.cjs`, `sheet.sh`: stills and contact sheets for checking framing.
  - `eleven_lines.py <out> <voice> <lines.txt> [settings]` (env `MODEL=eleven_v3`): records lines with word timings.
  - `layout3.py`: lays lines on a timeline (trailing-breath clamp). `place_voice3.py`: fits the cartoon lines into the picture's slots (shortens long pauses first).
  - `score.py icewater|snowfort voice.wav words.json out.wav`: the original score plus sound effects, built with the skill sound kit in `tools/films/skill-audio/` (MIT, from claude-animated-shorts). It expects that kit at `./cartoon-audio/audio` next to it and the films dir path inside; adjust the two paths at the top.
  - `assemble.sh <parts dir> <mix.wav> <dur> <out.mp4>`: concat + H.264 CRF 17 + AAC, faststart.
  - `voice/`: the v3 takes for all three films (mp3 + word json). Reuse them: the ElevenLabs free tier has 10,000 characters a month and about 3,300 were left on 2026-11-21.
- State when this was written: the three full renders were running in this session's scratchpad (lost if
  the session ends). If they are gone, re-render with the commands above (each takes a few hours here) and
  assemble with the soundtracks (re-make them with `score.py`; the cartoon one with `skill-audio/mix.py`
  after `place_voice3.py`, then polish the voice as in `shared/voicefx.js`).

## Done in Loomy (committed)

- **L1 voice** (`ea69696`): `shared/voicefx.js` (delivery tags, alignment to words, pause squeeze,
  polish chain, `finishLine`), both tabs' `tts.js` use v3 `/with-timestamps` (pcm_24000) with the user's
  key, the writer adds `delivery` per scene (`explainer/js/llm.js`) / `read` (`cartoon/js/script.js`),
  pipelines call `finishLine`. Server (`functions/api/[[path]].js`): `elevenAll` reads the whole script
  with v3 when `ELEVEN_KEY` is set (then Gemini, then Aura). Unit test `tools/tests/unit/l1-voice.test.mjs`.
  Not yet verified: one mocked full-video run (`tools/tests/cleanmaster.cjs`) timed out on a disabled
  button while three renders loaded the CPU; re-run it on an idle machine, and `clean3dmaster.cjs`.
  The site's `ELEVEN_KEY` Cloudflare secret is already set (`/api/config` says `voice: elevenlabs`).
- **Render speed** (`a8b0a41`): `createEngine({ perf: { msaa, aoSamples, shadowMax } })`.
- **L2 started** (`85b0962`, not wired in): `explainer/js/z3d/auto3d.js` (places, shot kinds, camera moves,
  effects, cast mapping, `planShots`, `buildShot`, `captionsFrom`) and `explainer/js/drawn.js`
  (`DrawnRenderer`: canvas/W/H/drawFrame/dispose + `ready` promise, same face as `Renderer`).

## Remaining work, in order

1. **L2 wire the 3D tab** (about 2-3 h):
   - `explainer/js/presets.js`: add style `'drawn-3d'` (label "3D people, drawn in code", `drawn: '3d'`,
     `character: true`, a zach-style direction) and make it the 3D default in `explainer/js/app.js` (line ~79,
     currently `'story-3d'`). AI-picture styles stay as options.
   - `explainer/js/llm.js` `writerPrompt`/`normalizeScript`: when `style.drawn`, ask per scene for
     `set` (auto3d `SETS`), `frame` (auto3d `SHOT_KINDS`; don't reuse `shot`, the mascot styles use it),
     `who` (character names), `act` (auto3d `POSE_NAMES`); keep `camera`, `effect`, `icon`, `delivery`.
     Map them onto what `planShots` reads (`sc.shot`, `sc.pose`) or change `planShots` to read `frame`/`act`.
   - `explainer/js/pipeline.js`: when `STYLES[style].drawn`, mark visuals/depth/motion as skipped
     ("Drawn in code, no pictures needed") and run only the voice job; `makeRenderer` returns
     `new DrawnRenderer(canvas, { timeline, script, kind, W: width, H: height })`; `render()` must
     `await renderer.ready` before `exportVideo`. The renderer test page needs `three` in the import map of
     `explainer/index.html` (it already maps `three` and `three/addons/` for z3d) and people GLBs in `explainer/people/`.
   - Then render stills from a mocked script and fix framing like the hand-made films (tall frames need
     the camera further back; check faces are not cropped, the night set is dark, effects show).
2. **L3 Blocky drawn**: `explainer/js/z3d/autoblocky.js` with the same exports as auto3d (`castFor`,
   `planShots`, `buildShot(spec, ctx)`, `captionsFrom` with 3-4 word groups and one `*key*` word) using
   `blocky.js` (`Avatar`, `LOOKS`, `FACES`, `makeWorld`, `roundBox`, `paintedMat`) and props like the snow
   fort film (fort, flag, shovel, plow, pile). The Blocky tab is `explainer/?style=blocky`.
3. **L4 sound**: port the film sound design to the browser (`explainer/js/audio.js` / `cartoon/js/audio.js`):
   per-section score (pluck, glock, vibes, pad, snare, timpani, cymbal) and an SFX cue library (whoosh,
   splash, bubbles, heartbeat, breath, crunch, thump, cheer, engine, beeps, scrape, boom, riser) placed from
   the shot plan, music ducked about 4 dB under speech, master about -14 LUFS. `tools/films/score.py` is the
   reference; `tools/tests/musiclevel.py` measures the music level.
4. **L5 Cartoons**: generalize the cartoon-3d-short engine (`tools/c3d-src`, esbuild bundle) into templated
   shots for the Cartoons tab; captions off by default with a switch.
5. Editor E2-E5 (text and captions, music and sound, speed/zoom/transitions, an Edit button on Loomy videos);
   see `editor/js/model.js`. TaleTok reference: the user never sent screenshots.

## Deploying to Loomy (the live site)

Deploying is automatic: **every push to `main` deploys** through `.github/workflows/deploy.yml`
(GitHub Actions runs `wrangler pages deploy` to the Cloudflare Pages project in the repo variable
`LOOMY_PROJECT`, i.e. https://loomy-app.pages.dev). The repo secrets (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`) are already set; the agent needs no Cloudflare login.

Steps for every change that should go live:

1. `python3 tools/stamp-version.py`: bumps the `?v=` stamps in every page's import map, so browsers
   load the new files. A new JS module only loads if it appears in the importing page's import map, and
   this script adds it. Run it after adding or changing any JS/CSS file.
2. Run the checks: `node tools/tests/unit/run.mjs` and the mocked tests in `tools/tests` (see README),
   plus `node --input-type=module --check < file.js` on edited modules.
3. Commit (one fix per commit), then push:
   `git remote set-url origin https://github.com/SankeerthMallesh/AiAnimator.git && git -c push.negotiate=true push -q origin main`
4. Wait about 1-2 minutes, then verify the live site. It is locked behind an access code, so use the
   saved cookie file `tools/tests/live.txt` (git-ignored; if missing, ask the user to export a
   `loomy_pass` cookie after entering an access code on the site, see `tools/tests/README.md`):
   - `curl -s -b tools/tests/live.txt https://loomy-app.pages.dev/explainer/ | grep -o 'v=2026[0-9]*' | head -1`
     must print the stamp you just made.
   - `curl -s -b tools/tests/live.txt https://loomy-app.pages.dev/api/config` shows which writer and voice
     the server uses (on 2026-11-21: `"writer":"groq","voice":"elevenlabs"`, so the site's `ELEVEN_KEY` is set).
   - Live end-to-end checks: `node tools/tests/livecheck.cjs`, `node tools/tests/livevid.cjs "topic" out.mp4`
     (they spend real AI allowance: respect the daily limits below).
5. If the live stamp does not change, the deploy workflow failed: check the run with the GitHub MCP
   tools (`actions_list` / `get_job_logs` for workflow `deploy.yml` on `SankeerthMallesh/AiAnimator`) and
   fix it, or re-run it with `actions_run_trigger` (`workflow_dispatch` is enabled).

Server-side secrets (Cloudflare Pages, Settings, Environment variables) are set by the user in the
Cloudflare dashboard, never by the agent and never pasted into chat: `ELEVEN_KEY` (set), `GEMINI_KEY`,
`GROQ_KEY`, optional `ELEVEN_MODEL` (default `eleven_v3`), `ELEVEN_VOICE_M` / `ELEVEN_VOICE_F`.
Changes in `functions/api/[[path]].js` deploy with the same push.

## Rules the user set

- One fix per commit, ID in the message; never loosen a check; commit trailer lines as in `git log`.
- Push with `git remote set-url origin https://github.com/SankeerthMallesh/AiAnimator.git` then
  `git -c push.negotiate=true push -q origin main` (the remote URL resets after restarts).
- Live AI limits: at most 3 live picture videos a day, at most 3 Gemini voice reads. No paid services by default.
- No Roblox / Zack D. Films / toy-brick names or branding in Loomy. Skill reference frames are style study only: never commit them.
- Times in EST. Plain, short messages; send images or clips so the user can see progress.
