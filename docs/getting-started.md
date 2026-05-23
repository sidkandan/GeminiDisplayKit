# Getting started with Gemini Flash Meta Displays

## Install

```bash
npm install -g gfmd    # or use `npx gfmd …` without installing
```

Requirements:
- Node 18+
- A Pixel/Android phone (for QR scanning + Meta AI app)
- Meta Ray-Ban Display in dev mode, paired with the Meta AI app
- `cloudflared` (`brew install cloudflared` on macOS)
- `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/)

## Your first game

```bash
gfmd create my-game --template adventure
cd my-game
cp .env.example .env       # paste your GEMINI_API_KEY
npm install
gfmd dev
```

You'll see something like:

```
[bridge]    http://127.0.0.1:8787/
[display]   ./my-game/display
[routes]    GET /scene-data, GET /scene-image, POST /choose, POST /director
[tunnel]    https://amber-river-zephyr.trycloudflare.com
[deeplink]  fb-viewapp://web_app_deep_link?appName=my-game&appUrl=...
[qr]        saved to artifacts/install-qr.png

████ ███ ██ █████ ████ ...
█  █ █ █  █  █     █  █
████ ███ ██ █████ ████ ...

Scan with the Pixel camera → Meta AI → "Add Web App" → Add
```

Point your phone at the QR. Meta AI app opens with an "Add Web App" sheet.
Tap Add. The app appears in the Meta AI → Display Glasses → App connections
list. Open it from there.

Your game is live on the glasses. **Pinch / Enter** to commit a choice;
**swipe ◀ ▶** (or arrow keys when testing in browser) to move between doors.

## Anatomy of a game project

```
my-game/
├── omni.config.mjs        # the game definition
├── package.json
├── .env                   # your GEMINI_API_KEY (gitignored)
├── .env.example
└── display/
    ├── index.html         # 600×600 HUD markup
    ├── styles.css
    └── app.js             # SSE client + game-side state
```

That's it. The framework runs everything around this.

## The `omni.config.mjs` contract

```js
import { defineGame } from "gemini-flash-meta-displays";
import { runManagedAgent, generateScene } from "gemini-flash-meta-displays/tools";

export default defineGame({
  name: "MyGame",                  // shown in the Meta AI install sheet
  display: "./display",            // relative to the config file
  port: 8787,                      // optional override

  // One-time hook after bridge boots, before first request
  async onStart({ hud }) {
    hud.broadcast({ type: "status", state: "ready", ts: Date.now() });
  },

  // Each key is "METHOD /path" with optional :params
  routes: {
    "POST /api/think": async ({ body, hud, tools }) => {
      const r = await tools.runManagedAgent({
        prompt: body.question,
        threadKey: "main",            // maintain conversation across calls
      });
      hud.broadcast({ type: "agent", text: r.text, trace: r.trace });
      return { ok: true };
    },
  },
});
```

The handler context exposes:

| name | what it is |
|---|---|
| `body` | parsed JSON request body (or `{}`) |
| `url` | the request URL (`URL` object) |
| `params` | `:param` placeholders matched from the route |
| `hud.broadcast(payload)` | push to all SSE-connected display clients |
| `tools` | every wrapper from `gemini-flash-meta-displays/tools` |
| `method`, `headers` | as named |

Return any plain object — it's serialized as the HTTP response.
Return a `Buffer` to send raw bytes. Return `{ __status: 4xx, ... }` to
override the status code.

## Going to production

`gfmd dev` uses a cloudflared **quick-tunnel** whose URL rotates every
restart. For a stable URL, deploy your bridge to anywhere Node runs (Cloud
Run, Fly, Vercel, a paid Cloudflare named tunnel) and use:

```bash
gfmd deploy --url https://my-stable.example/ --name MyGame
```

That writes a PNG QR (`artifacts/install-qr.png`) you can print and re-use.
