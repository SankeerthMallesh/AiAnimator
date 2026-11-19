# Loomy

One free tool with three sections, switched from the top bar: **Cartoons** makes cartoon shorts, **3D** makes 3D-style explainer shorts, **Board** is a pinboard for planning ideas. Links: `/` (Cartoons), `/#3d`, `/#board`. Each section also works on its own at `/cartoon/`, `/explainer/` and `/board/`.

Type a topic. Get a finished vertical cartoon short (MP4). No sign-up and no API key. It runs in the browser, so a cheap laptop is enough, and it never posts anything anywhere.

The picture is drawn in code, in the hand-drawn family of a simple cartoon explainer: round white heads, thick black outlines, dot eyes, stick limbs, a costume that fits the topic. Two to four characters walk, point, sit, jump, hand over props and lip-flap. Sets and props (rails, shop, train, heart, rocket, and others) are drawn the same way. An AI picture is only an optional background plate. If it is late, blocked, or refused, the drawn set is used and the film still finishes.

## What it does

| Step | How | Cost |
|---|---|---|
| Script | Free Pollinations text (no key). A free Gemini, Groq or OpenRouter key is faster and more accurate | free |
| Fact-check | A second pass looks for myths and wrong dates. Truncated JSON is repaired instead of failing the film | free |
| Cast and sets | Drawn and animated on a canvas. Works with zero AI images | free |
| Background plate | Optional. One or two scenery images, 20 second cap, then the drawn set. Every image is safety-checked first | free |
| Voice | Kokoro, in the browser (about 90 MB, once). If it cannot load, captions and music carry the film | free |
| Music and effects | Generated in the browser: score, whoosh, pop, boing, cash register, engine | free |
| Export | WebCodecs to H.264 MP4, with AAC when the browser offers it. 9:16, 16:9, 1:1, 4:5. 15 seconds to 3 minutes. Chill, normal or fast | free |

There is no free AI video model. Motion is the cartoon cast, not a generated clip.

## Use it

- **Cloudflare Pages (recommended):** see "Host on Cloudflare" below.
- **GitHub Pages:** also works from `main` at https://sankeerthmallesh.github.io/AiAnimator/ .
- **Locally:** `python3 -m http.server` in this folder, then open `http://localhost:8000/`. Chrome or Edge is the best export path.

Optional keys live only in this browser (Settings):

- Gemini: https://aistudio.google.com/apikey — model `gemini-flash-lite-latest`
- Groq, OpenRouter, a Pollinations secret key (`sk_…`, not `pk_…`), Hugging Face

The free text model is a small reasoning model. Requests send `reasoning_effort: "low"`. Answers are short, so scripts stay compact and a cut-off answer is salvaged.

## Host on Cloudflare

The folder is the site. `functions/api/` adds optional Google sign-in with sync (Cloudflare Pages Functions + a free D1 database).

```
bash tools/deploy-cloudflare.sh
```

The first run signs you in to Cloudflare, picks a free `*.pages.dev` name, asks for an optional Google Client ID, and creates the `loomy-db` database. Later runs upload the latest version. Short links: `/3d` opens the 3D section and `/plan` opens the Board.

## Access codes (optional lock)

Make Loomy private: every browser needs a code once, then stays unlocked until the code expires. Codes are made only on your computer from a secret in `~/.loomy-access-secret`; Cloudflare checks them without a list.

```
bash tools/access-code.sh forever   # a code that never expires (the first run turns the lock on)
bash tools/access-code.sh 30        # a code for a friend that works for 30 days
bash tools/access-code.sh reset     # cancel every code, then make a new one
```

## Google sign-in (optional)

Signed out, everything is saved in the browser as before. Signed in, the video libraries, settings and boards sync to the account, so they follow you to other devices. API keys typed into Settings never leave the device. "Delete my synced data" in the account menu removes everything stored for that account.

To turn it on, make a free Google OAuth Client ID:

1. Open https://console.cloud.google.com/auth/overview and create a project (for example "Loomy"). Click **Get started**: app name Loomy, your email, audience **External**, then **Create**.
2. **Audience**: click **Publish app** so anyone can sign in. Name, email and profile picture need no Google review.
3. **Clients** → **Create client** → **Web application**. Under **Authorized JavaScript origins** add your site, for example `https://loomy-app.pages.dev`. Click **Create** and copy the Client ID.
4. Run the deploy script and paste the Client ID when it asks.

## Honest limits

- The free image service allows a short burst, then about one image every 45 seconds, and it has drawn unclothed figures for body prompts. Plates are scenery-only, rejected at a safety score of 0.35 or above, and the film does not wait on them.
- Body topics use clothed characters and simple organ props (a heart, lungs, a stomach). No nudity and no gore is drawn.
- Fact-checking reduces mistakes. It does not make the script infallible. Read the lines before you upload.
- A 30 second short is the comfortable length on a low-end laptop: script, one voice model download, then an encode that is faster than real time.

## Files

```
index.html                 Loomy: top bar with the three sections
cartoon/                   Cartoons section
  js/cast.js               character rig
  js/props.js              props and sets
  js/stage.js              scene language, camera, captions
  js/script.js             storyboard JSON, repair, defaults
  js/pipeline.js           script → facts → plates + voice → mix → mp4
  js/llm.js                free writers and the fact-check
  js/audio.js, js/tts.js   music, effects, Kokoro voice
  js/encoder.js            WebCodecs MP4, MediaRecorder fallback
explainer/                 3D section (AI pictures with depth)
board/                     Board section (notes, yarn, share links)
vendor/                    shared libraries
```

## Updating the site

After changing any CSS or JS file, run `python3 tools/stamp-version.py` before you push. Visitors otherwise keep a cached mix of old and new files.
