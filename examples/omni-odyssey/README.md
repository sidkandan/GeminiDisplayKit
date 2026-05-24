# OMNI-ODYSSEY

> **The lead demo.** A coherent, consequential illustrated adventure — narrated live by Gemini Flash, painted live by Nano Banana, with audience-conjured monsters woven in as encounters.

A self-contained game built with [Gemini Display Kit](../../README.md).

See [`TOOLS_USED.md`](TOOLS_USED.md) for the full Gemini-tools map.

## What players see

1. **Cinematic intro** (pre-generated Veo clip, 8s, muted-autoplay) opens the adventure
2. **Painted scene** + 3 glowing choice doors
3. **Pinch a door** → Flash narrates the consequence (~3s) + Nano Banana paints the new world (~16s)
4. **Audience monsters appear** as encounters every other beat (befriend / fight / flee, with real story consequences)

## Architecture

- **Flash narrates** each beat → returns JSON `{narration, choices[3], image_prompt, tag}`
- **Nano Banana paints** the new scene from the `image_prompt`
- A **worker queue** sequentially paints audience-submitted monsters (rate-limit-safe)
- A **bestiary** at `/conjure` shows everyone's submissions

## Routes

| Route | What it does |
|---|---|
| `GET /` | Glasses HUD (`display/index.html`) |
| `GET /conjure` | **Audience monster submission page** (mobile-friendly) |
| `GET /scene-data` | Light poll — current chapter, caption, choices |
| `GET /scene-image` | Current painted scene (raw JPEG bytes) |
| `GET /scene-video` | Veo opening cinematic (if pre-generated) |
| `POST /choose` | Player commits a choice — narrates + paints next beat |
| `POST /reset` | Restart the story (replays between demo runs) |
| `POST /director` | Optional: managed-agent re-imagines the choice set |
| `GET /monsters` | List all submitted monsters (for the bestiary UI) |
| `GET /monster-image?id=...` | A specific monster's portrait |

## Run

```bash
cd examples/omni-odyssey
cp .env.example .env       # set GEMINI_API_KEY
npm install
gdk dev
```

Then either:
- Open the bridge URL in a browser to see the HUD locally
- Scan the QR with a Pixel, install via Meta AI app, view on the glasses

To pre-warm the Veo cinematic + opening scene (so first paint is instant):

```bash
node ../../scripts/prewarm-odyssey.mjs
```

To seed the bestiary with PROMPT ARENA's 8 trained monsters (repainted in the storybook style):

```bash
SEED_TRAINED=1 gdk dev
```

That fires 8 Nano Banana calls in the background (~2 min total) as soon as the server boots.

## What's here

| File | Purpose |
|---|---|
| `omni.config.mjs` | Game definition — state, narrator, monster worker, all routes (~250 lines) |
| `display/index.html` | 600×600 HUD with gesture-free muted-autoplay cinematic intro |
| `display/conjure.html` | Audience monster submission page (mobile-friendly) |
| `display/director.html` | Optional judge-facing "Director's-View" trace console |
| `assets/intro.mp4` | Pre-generated 8s Veo cinematic *(generate via `../../scripts/prewarm-odyssey.mjs`)* |
| `assets/opening-scene.jpg` | Pre-generated opening scene *(same script)* |
| `TOOLS_USED.md` | Judge-facing Gemini-tools map |

## Provenance

The original orchestrator (~490 lines) was a standalone single-file prototype written earlier in the day. This version is ~250 lines — same gameplay, but the framework now owns the bridge / SSE / static / tunnel / QR / Buffer-aware response writer. Display HTML files (`index.html`, `conjure.html`, `director.html`) ported as-is. All authored on 2026-05-23 during the hackathon.
