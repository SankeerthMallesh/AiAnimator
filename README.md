# Storyforge Studio

Type any idea (an explainer, a story, a promo, a list) and get a finished, narrated, captioned, animated **MP4** with a 3D camera. No sign-up, no keys, and nothing to install. It's free and runs entirely in the browser, so it works on cheap laptops and you and your friends can use it from a link. It never posts anything anywhere: you download the MP4 and upload it yourself.

## What it does

| Step | How | Cost |
|---|---|---|
| Script | A free LLM writes a hook-first script with a shot list (Pollinations, no key; or a free Gemini, Groq or OpenRouter key) | free |
| Fact-check | A second AI pass looks for myths, wrong dates and anachronisms and fixes them. Its notes are shown to you | free |
| Visuals | One AI image per scene (FLUX via Pollinations, or Hugging Face). Recurring characters keep the same description in every shot | free |
| Voice | **Kokoro** text-to-speech runs on your own computer (an ~90 MB model, downloaded once). A cloud voice is the fallback | free |
| Music & SFX | An original score, whooshes and impacts are generated live, so there's nothing to license | free |
| 3D camera | An AI depth model (Depth Anything V2, in your browser) turns every image into a 3D scene: dolly, truck, crane, orbit and dolly-zoom moves with real parallax, depth of field and haze | free |
| Animation | Floating dust and light rays, film grade, 6 transition types, word-by-word pop captions, labels, grain, vignette | free |
| Export | Hardware video encoding (WebCodecs) to an H.264 MP4. Frames: 9:16, 16:9, 1:1 or 4:5. 720p, 1080p or 1440p at 24, 30 or 60 fps. Pace: chill, normal or fast | free |

Everything after the script stays editable. You can rewrite narration, change an image prompt, regenerate or upload your own picture for any scene, change the camera move, add your own music, preview it, then render again. Only the parts you changed get regenerated.

## Use it

- **Online:** open the deployed link (see below) in **Chrome or Edge** (best), or Firefox. Safari works but exports more slowly.
- **Locally:** run `python3 -m http.server` in this folder, then open `http://localhost:8000/`. It must be served over http(s); opening the file directly won't work.

Optional free keys (Settings) make it faster and smarter. Keys are stored only in your browser:
- Gemini: https://aistudio.google.com/apikey (best scripts)
- Groq: https://console.groq.com/keys
- Pollinations: https://enter.pollinations.ai (fewer rate limits on images)
- Hugging Face: https://huggingface.co/settings/tokens
- ElevenLabs (paid voices, optional): https://elevenlabs.io/app/settings/api-keys. The free built-in Kokoro voice stays the default.

## Share it with friends (free hosting)

It's a static site with no server, so each person's browser does its own work and there are no shared bills or quotas.

- **GitHub Pages:** go to repo **Settings → Pages → Source: GitHub Actions**. `.github/workflows/pages.yml` then publishes it at `https://sankeerthmallesh.github.io/Animation-Ai/` on every push to `main`.
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop to get a link in seconds.
- Cloudflare Pages and Vercel also work: point them at this repository with no build command.

## Speed

Out of the box it now exports **720p at 24 fps with the flat camera** and defaults to 30-second videos, because that's what renders fastest on ordinary laptops. For the full look, open Settings and set *Default quality* to 1080p, *3D camera* to On and tick *Cinematic atmosphere*.

What makes a video finish sooner:

- The fact-check runs **while** images and voice are generated. If it corrects a line, only that scene's image and voice are redone.
- Every network request has a deadline (45–60 s), so one stalled free-tier request is retried instead of freezing the whole video.
- 720p exports use compact images (576×1024 for 9:16): about 45% fewer pixels to generate.
- Cloud voice lines are generated 3 at a time.
- Free keys matter most: a **Groq** key makes the script near-instant, and a **Pollinations** key lifts the image rate limit (4 images at once instead of 3, fewer 429 back-offs).

Shorter videos are the biggest lever: time scales with the number of scenes, so a 30 s video has about half the images, voice lines and frames of a 60 s one.

## Tips for great videos

- Be specific: "How Eratosthenes measured Earth with a stick and a well in 240 BC" beats "earth round".
- 45–60 s Shorts with the **Cinematic 3D** style and **Bold pop** captions give the classic explainer-Short look.
- Read the fact-check notes and skim the script before you upload. AI can still be wrong.
- On an old laptop, choose **720p** in Settings for faster renders.

## Files

```
  index.html, css/app.css   UI
  js/app.js                 UI controller
  js/pipeline.js            script → facts → visuals + voice → mix → render
  js/llm.js                 free LLM providers, prompts, fact-check
  js/images.js              free image providers + retries
  js/tts.js, tts-worker.js  Kokoro voice in a background thread
  js/audio.js               timeline, generated music, SFX, mixing
  js/renderer.js            animation engine (camera, captions, atmosphere)
  js/gl3d.js                WebGL 3D depth camera
  js/depth.js, depth-worker.js  in-browser AI depth maps
  js/encoder.js             WebCodecs + MP4 muxing (MediaRecorder fallback)
  vendor/                   mp4-muxer (MIT), kokoro-js, transformers.js (Apache-2.0)
```

## Updating the site

After changing anything in `css/` or `js/`, run `python3 tools/stamp-version.py` before you push. It gives every file a new version number so visitors' browsers load the new code at once instead of mixing it with old cached copies, which can break the page.
