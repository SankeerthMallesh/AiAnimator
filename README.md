# Storyforge

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

- **Online:** after this branch is merged, GitHub Pages serves it from `main` at https://sankeerthmallesh.github.io/AiAnimator/ . A branch preview is not available without changing repository settings.
- **Locally:** `python3 -m http.server` in this folder, then open `http://localhost:8000/`. Chrome or Edge is the best export path.

Optional keys live only in this browser (Settings):

- Gemini: https://aistudio.google.com/apikey — model `gemini-flash-lite-latest`
- Groq, OpenRouter, a Pollinations secret key (`sk_…`, not `pk_…`), Hugging Face

The free text model is a small reasoning model. Requests send `reasoning_effort: "low"`. Answers are short, so scripts stay compact and a cut-off answer is salvaged.

## Honest limits

- The free image service allows a short burst, then about one image every 45 seconds, and it has drawn unclothed figures for body prompts. Plates are scenery-only, rejected at a safety score of 0.35 or above, and the film does not wait on them.
- Body topics use clothed characters and simple organ props (a heart, lungs, a stomach). No nudity and no gore is drawn.
- Fact-checking reduces mistakes. It does not make the script infallible. Read the lines before you upload.
- A 30 second short is the comfortable length on a low-end laptop: script, one voice model download, then an encode that is faster than real time.

## Files

```
index.html, css/app.css    editor: preview, timeline, steps
js/cast.js                 character rig
js/props.js                props and sets
js/stage.js                scene language, camera, captions
js/script.js               storyboard JSON, repair, defaults
js/pipeline.js             script → facts → plates + voice → mix → mp4
js/llm.js                  free writers and the fact-check
js/images.js               optional background plates
js/audio.js                music and action sound effects
js/tts.js                  Kokoro
js/safety.js               in-browser image safety check
js/encoder.js              WebCodecs MP4, MediaRecorder fallback
```

## Updating the site

After changing anything in `css/` or `js/`, run `python3 tools/stamp-version.py` before you push. Visitors otherwise keep a cached mix of old and new files.
