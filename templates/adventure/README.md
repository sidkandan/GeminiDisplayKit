# {{NAME}}

An on-glasses fantasy adventure built with [gdk](https://github.com/sidkandan/GeminiDisplayKit).

**Mechanic:** Pick one of three doors. A managed agent + Nano Banana paint the next world. Repeat.

## Run

```bash
cp .env.example .env       # set GEMINI_API_KEY
npm install
npx gdk dev
```

Scan the printed QR with your Pixel, install via Meta AI → Add Web App, open on glasses.

## What this project contains

| File | What it is |
|---|---|
| `omni.config.mjs` | Game definition — name, display dir, route handlers |
| `display/index.html` | 600×600 HUD markup |
| `display/styles.css` | Scene-specific styling |
| `display/app.js` | Choice navigation + SSE state |

## What the framework provides

- HTTP + SSE server (`gemini-display-kit/bridge`)
- Gemini tool wrappers (`gemini-display-kit/tools` — `generateScene`, `runManagedAgent`, etc.)
- Cloudflare tunnel + QR generation (`gdk dev`)
- Display SDK primitives (`gemini-display-kit/display/{base.css,focus.js,events.js}`)

## Extending

The two route handlers in `omni.config.mjs` (`POST /choose` and `POST /director`)
show the two use patterns this template demonstrates:
1. **Direct Nano Banana** — fire-and-forget Gemini call, broadcast result through SSE
2. **Managed agent director** — one-shot agent with a `threadKey` for follow-ups

Add new routes the same way. The bridge mounts them automatically.
