# PulseBlade

> An original wearable rhythm game. Gemini Flash designs the level, Lyria 3 generates the backing track, a managed-agent director publishes a judge-visible balancing note.

A self-contained game built with [Gemini Flash Meta Displays](../../README.md).
This is the **second demo** in the hackathon submission, complementing
[OMNI-ODYSSEY](../omni-odyssey/).

## Why this example exists

PulseBlade demonstrates a different slice of the framework than OMNI-ODYSSEY:

| | OMNI-ODYSSEY | PulseBlade |
|---|---|---|
| Image gen | Nano Banana | — |
| Audio gen | — | **Lyria 3 backing track** |
| Structured output | — | **Flash JSON-mode** level designer |
| Managed agent | Director (one-shot quest arc) | Director (non-blocking balancing note) |
| Player input | D-pad / pinch | 4-direction swipe, timed to beats |

Both run on the same bridge / SSE / display SDK / tunnel + QR. **That's the framework pitch.**

## What's here

| File | Purpose |
|---|---|
| `omni.config.mjs` | Game definition: routes (`/api/pulseblade/start`, `/api/pulseblade/latest`) + agent director |
| `level.mjs` | Level normalizer + fallback level builder + Lyria prompt builder |
| `display/index.html` | 600×600 HUD shell (canvas, score, combo, status) |
| `display/app.js` | The rhythm engine — canvas drawing, hit detection, head-tracking math |
| `display/styles.css` | Game-side styling |

## Run

```bash
cd examples/pulseblade
cp ../../.env.example .env       # then set GEMINI_API_KEY
npm install
gfmd dev
```

Then POST to `/api/pulseblade/start` (or use the in-HUD Start button) to compose a new level + track.

## Built today (provenance)

- `level.mjs` and `display/` files originally lived at `GoogleIO/services/omni-bridge/pulseblade-level.mjs` and `GoogleIO/apps/display-webapp/pulseblade.{html,js,css}` — all authored today in the original workspace.
- `omni.config.mjs` is a thin (~100-line) wrapper over the framework primitives that replaces the original `pulseblade-server.mjs` (~500 lines of duplicated bridge code). The framework now owns everything that file was doing manually.
