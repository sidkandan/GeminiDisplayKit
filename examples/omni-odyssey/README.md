# OMNI-ODYSSEY

> The lead demo. Pick a door → Nano Banana paints the next world. With a pre-generated Veo cinematic intro.

A self-contained game built with [Gemini Flash Meta Displays](../../README.md).
This is the **lead example** spotlighted in the hackathon demo.

## What's here

| File | Purpose |
|---|---|
| `omni.config.mjs` | Game definition: state, routes, lifecycle. ~110 lines total. |
| `display/index.html` | 600×600 HUD with gesture-gated cinematic intro |
| `display/director.html` | Optional judge-facing "Director's-View" console (live agent trace) |
| `assets/intro.mp4` | Pre-generated 8s Veo cinematic with native audio *(generate per Phase 2 plan)* |
| `assets/opening-scene.jpg` | Pre-generated opening scene *(generate per Phase 2 plan)* |

## What the framework provides

- HTTP + SSE + static serving (`gfmd dev`)
- `generateScene` (Nano Banana) — text → painted scene
- `runManagedAgent` (with `threadKey` for the Director thread)
- Cloudflare tunnel + install QR

## Run

```bash
cd examples/omni-odyssey
cp ../../.env.example .env       # then set GEMINI_API_KEY
npm install
gfmd dev
```

The first time the HUD loads, you'll see the opening scene immediately (loaded from `assets/opening-scene.jpg`). When the player commits a choice, Nano Banana paints the next world (~16s).

## How the live demo runs

1. Boot `gfmd dev` (terminal shows: bridge URL, tunnel URL, install QR)
2. Scan QR on Pixel → Meta AI → Add Web App → Add
3. Open OmniOdyssey on the glasses
4. **Pinch / Enter** to play the cinematic intro (Veo, 8s, with audio)
5. Cinematic ends → first painted scene + 3 doors
6. **Pinch a door** → "the agents are painting your world…" → new scene + new choices
7. Repeat until you cut

## Pre-generating assets

The Veo cinematic and opening scene should be generated once before stage time
so the demo is cold-start safe. From the framework root:

```bash
gfmd agent run --prompt "..."          # warm-up; tests the API key
node scripts/prewarm-odyssey.mjs        # generates assets/opening-scene.jpg + assets/intro.mp4
```

*(prewarm script lives in scripts/ in the framework root; covered by Phase 2 polish.)*

## Built today (provenance)

Original orchestrator (~340 lines, prototyped earlier today) lived at
`GoogleIO/apps/omni-quest/orchestrator.mjs`. This version is ~110 lines
because the framework now owns everything else. The display HTML
(`display/index.html`) is the same `scene.html` from the prototype —
all 145 lines authored today.
