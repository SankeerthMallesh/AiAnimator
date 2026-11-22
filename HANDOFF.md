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

## Keep-going prompt (paste after the master prompt, for hands-off work)

> Work on your own without waiting for me. Right after you read HANDOFF.md, set up a check-in
> for yourself: use the scheduled-task tools (`create_trigger`, bound to this same session,
> recurring every 2 hours, written in EST with CRON_TZ=America/New_York) with the prompt "Continue
> the Loomy work from HANDOFF.md where you left off: check background renders and tests, do the
> next step, commit, deploy if it is finished, and send me a short update with images or clips."
> Tell me once that it is set up. On every check-in: carry on with the next unfinished step, send
> me finished files with SendUserFile (status "proactive" so it reaches my phone) and a 2-3 line
> update in EST. If you hit a usage limit or a long render, schedule a one-time wake-up with
> `send_later` for when it should be done and stop for now; when you wake, pick up from the
> repo and HANDOFF.md (update HANDOFF.md as you finish steps so any session can resume). Keep
> long renders in background jobs and resume them, never restart finished pieces. When all the
> remaining work is done and live, delete your scheduled tasks and send me a final summary.

## Automatic check-ins (stopped 2026-11-22: the list is done)

A scheduled task named **"Loomy keep going"** (`trig_01CKtm7fnptK4aLUbNEpMpPQ`) wakes the cloud session
`session_01HYd8vcMBU6u8sYFgZBDMLc` ("LoomyDashboard") every 2 hours at :22 EST
(`CRON_TZ=America/New_York 22 */2 * * *`, first run 2026-11-22 12:22 AM EST). Each check-in fetches and
merges `main`, does the next unfinished step from this file, tests, deploys, updates this file and sends
the user a short update. It deletes itself when nothing is left. **Do not create a second one**; if you
take over in another session, check `list_triggers` first. To stop it, the user says "stop the check-ins"
in that session, or delete it with `delete_trigger`.

## Test run of 2026-11-22 (finished about 4:30 AM EST)

1. Stress test (`node fuzz.cjs 1000 10`, page tools/tests/fuzz/): 1,000 random writer outputs per tab, 0 failures after
   fixes T1a, T1b, T1c (junk scenes, blank captions, Cartoons crash on a blank scene).
2. Full mocked videos (`drawnmaster.cjs`, `cartoonmaster.cjs`): 15 of 15 passed (5 per tab). Fixes from watching them:
   N1 (night scenes too dark), C1 (Cartoons "fast.." captions).
3. Real videos on the live site (`livetab.cjs`): all three tabs made a video with no errors. Fixes: A1 (Auto gave the
   old picture look to "what happens to your body if you fall into ice water"; now drawn people), V2 (the server says
   why ElevenLabs failed, in X-Loomy-Note).
   Finding: the site's ELEVEN_KEY account is out of characters (`401 quota_exceeded`), so the live voice falls back to
   Gemini until that account resets or the user swaps the Cloudflare secret. Not a code bug.
   Not re-checked live after A1: the user allows 3 Gemini voice reads a day and the three live videos used them.
The automatic 2-hourly check-in ("Loomy keep going") was deleted when this run finished: nothing is left on the list.

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
  Test status: in `tools/tests/cleanmaster.cjs` (Cartoons, mocked AI) the script, fact-check, voice and
  sound steps all passed with the L1 code, but the first render was still going after the test's 600 s
  limit, because three film renders were using all 4 CPU cores. That run never reached its later
  checks. Re-run `cleanmaster.cjs` and `clean3dmaster.cjs` on an idle machine to confirm.
  The site's `ELEVEN_KEY` Cloudflare secret is already set (`/api/config` says `voice: elevenlabs`).
- **Render speed** (`a8b0a41`): `createEngine({ perf: { msaa, aoSamples, shadowMax } })`.
- **L2 started** (`85b0962`, not wired in): `explainer/js/z3d/auto3d.js` (places, shot kinds, camera moves,
  effects, cast mapping, `planShots`, `buildShot`, `captionsFrom`) and `explainer/js/drawn.js`
  (`DrawnRenderer`: canvas/W/H/drawFrame/dispose + `ready` promise, same face as `Renderer`).

## Done on 2026-11-22 (live: pushed to `main` and deployed 2026-11-21 9:01 PM EST, commit 8f7c8e1)

Each step is one commit with its ID. Unit tests: `node tools/tests/unit/run.mjs` (165 pass).

- **V1** Cartoons keeps a voice when Kokoro cannot download (site narrator, then cloud), like the 3D tab.
- **L2** 3D tab: new default look `drawn-3d` (presets.js); the writer asks `set`/`frame`/`who`/`act` per
  scene (words in `z3d/vocab.js`); the pipeline skips pictures/depth/clips and renders with `DrawnRenderer`.
  Shot plan and caption rules moved to `z3d/plan.js` / `z3d/captions.js` (no three.js). Tall-frame
  framing, night, glow and icon fixes from rendered stills. Test page `tools/tests/z3d/drawn.html`
  (`?kind=3d|blocky&script=drawn-3d.json`, `window.still(t)`, `window.plan()`).
- **L3** Blocky tab: `z3d/autoblocky.js` + `z3d/blockyprops.js` (The Snow Fort's props, shared with the
  film); new default look `drawn-blocky` (Blocky direction + shot words); 3-4 word captions, one key word.
- **L4** `shared/filmsound.js`: sectioned score (intro/build/tension/payoff/outro from the shot plan) and
  a cue sheet (whoosh, riser, thump, breath, boom, crunch/steps, cheer, beeps, engine, scrape, wind,
  heartbeat, splash, bubbles, zaps) mixed by both tabs' `mixSoundtrack(..., { cues })`. The music level
  rules are unchanged (17.5 dB under the voice, -13.5 LUFS master).
- **E2-E4** Edit: text boxes (own lane), captions tied to source time, music track (duck, fades), per-part
  speed/zoom/transition/volume. **E5** "Edit this video" on finished 3D/Blocky/Cartoons videos
  (`shared/handoff.js`, IndexedDB + BroadcastChannel). Tests: `tools/tests/editore2e2.cjs`, `editore2e.cjs`.
- **L5** Cartoons: look `town3d` ("3D cartoon town, drawn in code",
  the composer default; painted sets stay) renders with the cartoon-3d engine's new template layer
  (`tools/c3d-src/src/tmpl.ts`, `World.updateTemplate`, `createTemplated` in driver.ts; rebuild with
  `cd tools/c3d-src && npm install && npm run build`). Places: the bridge deck, the riverbank, the park and
  an aerial over the town, seen from the film's own camera sides (no house blocks the lens). Captions off
  by default (More, "Captions on the 3D cartoon town"). `cartoon/js/town.js` maps scenes to shots.
  Test page `tools/tests/c3d/tmpl.html?shots=c3d-tmpl.json`; end to end `tools/tests/townmaster.cjs`.
  The bridge film renders pixel-identical after the engine refactor (checked on 6 frames).
- End-to-end tests for the drawn looks: `tools/tests/drawnmaster.cjs 3d|blocky` (720p 24 fps, mocked AI).

## Loomy 1.0 (2026-11-22)

Everything above, plus (one commit each, all on `main`):
- **Fixes after live use**: the pulse effect was a red disc on the chest (now rings beside the head);
  the 3D cartoon town crashed a user's PC (now lighter: MSAA 2, 2048 shadow map, drawings capped at
  1080 px; it frees its WebGL context; the preview's engine is freed before an export; frames are
  paced) and Cartoons opens on painted sets again (the town is opt-in, marked heavy).
- **Auto look** (3D tab default): `pickLook` in presets.js: drawn 3D people for stories, AI pictures for
  things, places, history, space and the body.
- **H1 hook stack** (`shared/hooks.js`): cold open on the teaser scene (0.9 s), headline from the
  writer's `hookText`, a flash on the cut, a riser and boom. All looks.
- **O1 3D objects** (`z3d/things.js`, 26 things; actions hold/show/drop/grow/spin/break; shot kind
  `object`; pose `show`), in 3D and Blocky; the writer picks `thing` and `do`.
- **1.0 look**: one accent gradient (theme.css), hero glow, "Made with Loomy" frames
  (`shared/showcase/`), feature pills, a What's-new card (index.html, once per browser).
- **LF1 long form**: up to 15 min in chapters (3D/Blocky `writeLongScript`, Cartoons parts), chapter
  title cards, one-click long-form starters, lower bitrate for long exports. Styles are original
  (cartoon history, game-world story, long 3D explainer): no channel or game names in Loomy.
Tests added: h1-hooks, o1-things, l2b-auto-look, l4b-film-sound-nodes (unit); longmaster.cjs,
autolook.cjs, townmaster.cjs, drawnmaster.cjs (SCRIPT=drawn-things.json), editore2e2.cjs (page).

## Loomy 1.1 (2026-11-22, on the dev branch until the user says deploy)

- **U1 upload kit** (`shared/upload.js`): hashtags are lowercase (`#hello`), and the YouTube title is
  short and compact (3-7 words, under 45 characters asked of the writer; `compactTitle` drops filler
  openings and long tails and caps it at 56). All tabs.
- **CUT1 cut parts out** (`shared/cuts.js`, `shared/cutter.js`, `shared/mp4read.js`): a bar under the
  player on the export page of the 3D, Blocky and Cartoons tabs. It shows the sound as soon as the
  export starts (cuts can be marked while it runs; a click there plays 2 s of the sound). Drag a part,
  or Start/End at the player's time, then "Cut it out"; "Find long pauses" marks voice lags. The player
  skips cut parts at once. "Save the cut video" decodes the finished MP4 (WebCodecs, our own small
  MP4 reader) and re-encodes the kept frames with the soundtrack cut to match (soft joins), always
  from the full video, so saving again loses nothing. Download and the editor hand-off use the cut
  video (words moved to match). Tests: v11-cuts, v11-upload-kit (unit); cutmaster.cjs (page).
- **T1 thumbnails** (`shared/thumbnail.js`): in each tab's Upload kit once the video is made. Frames
  from the finished video at the best moments (`pickMoments`: reactions, impacts, objects in use;
  never the first 3 s, where the headline sits), colour boosted and dark frames lifted, 2-4 huge
  words (the writer's new `thumbText`, else `hookText`, else the title) with a black outline and one
  yellow word. Layouts Split / Big text / Label; Wide 1280x720 or Tall 1080x1920 (zoomed so the
  video's captions fall outside); "Use the player's frame" takes any moment. JPEG under 2 MB.
  Tests: v11-thumbnail (unit); cutmaster.cjs checks it too.

## Loomy 1.2 and 1.3 (2026-11-22, deployed together as 1.3)

- **OBJ-C1 objects in Cartoons** (`cartoon/js/cast.js` `Cast.held`/`Cast.USES`, `stage.js`
  `sampleActor`, `script.js` `USE_WORDS`): show (arm up, glow), drop (falls, dust, stays), grow, spin,
  break (shake, comic burst, four pieces, gone). The writer may send them as actions on the thing in
  "hold"; a line that says so ("it shattered", "she dropped the coin") adds one. Painted-sets look only.
- **AUTO-C1 Auto look** (`cartoon/js/presets.js` `autoLook`): the Cartoons default. The 3D town when
  `townFits(topic)` and `strongGraphics()`, else painted sets; a toast says which and why.
- **CH1 chapters** (`shared/upload.js` `chapterLines`/`withChapters`): long videos get "Chapters" with
  0:00 lines in the description (3+ chapters of 10 s+, else none); kept in step with cuts (`mapForward`).
- **TIGHT1 auto-tighten** (`cutter.ready(..., { tighten, protect })`): after each export the long
  voice pauses are cut and saved at once, chapter cards protected; "Back to the full video" undoes it;
  the setting `autoTighten` (More panel) turns it off.
Loomy 1.3 (same day; the user named it): everything above plus the reference style below.
- **STYLE1-4, from the user's reference screenshots** (a lit 3D cartoon short about astronauts; the
  channel is not named in Loomy): STYLE1 crew outfits in `cartoon/js/cast.js` (jumpsuit with collar,
  flag and mission patches and a name tag; lab coat), headset, officer cap, hair bun, faces sleepy and
  nervous (sweat drop), ring-eyed shock and a toothy smug grin; `Script.normalize` dresses space crews
  and scientists when the writer gives no outfit and never dresses two people alike. STYLE2
  `shared/glare.js`: bloom, sparkles on small lights, grade (in the stage's finish layer), dust;
  setting `glow`. STYLE3 dutch tilts in `Stage.shot`. STYLE4 NARRATOR VOICE in both writers.
Tests: v12-cartoon-objects, v12-auto-look, v12-chapters, v12-style-cast, v12-narrator (unit).

## Remaining work

- Not checked from the sandbox: the live site itself (its host is blocked here) and a real 10-15 min
  render (hours on this CPU; minutes on a GPU). Ask the user to make one long video per tab.
- Ideas: more town places, objects for the Cartoons tab, a chapter list in the YouTube description.

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
