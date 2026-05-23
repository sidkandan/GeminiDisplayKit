# Gemini Flash Meta Displays — Architecture

## The split

```
   Meta Ray-Ban Display                       Your laptop / cloud
   ┌────────────────────┐                    ┌──────────────────────────┐
   │ 600×600 Web App    │  ◀── SSE /events ──│ Bridge (Node)            │
   │  - HTML/CSS/JS     │                    │  - HTTP server           │
   │  - D-pad navigated │  ── POST /...  ──▶ │  - SSE bus               │
   │  - SSE client      │                    │  - static file serve     │
   └────────────────────┘                    │  - per-game route mount  │
            ▲                                │  - GEMINI_API_KEY        │
            │                                └──────────────────────────┘
            │                                          │
   ┌────────┴───────────┐                              │
   │ Pixel / Meta AI    │                              ▼
   │  - install via QR  │                    ┌──────────────────────────┐
   │  - opens the app   │                    │ Gemini API               │
   │    on the glasses  │                    │  - Flash multimodal      │
   └────────────────────┘                    │  - Managed agents        │
                                             │  - Nano Banana / Lyria   │
                                             │  - Veo / TTS             │
                                             └──────────────────────────┘
```

## Why the bridge?

Meta Display Web Apps are plain HTML/CSS/JS with W3C APIs. They have no
camera, no microphone, no ability to safely hold an API key. The bridge is
the trusted component that:

- Holds `GEMINI_API_KEY` server-side
- Calls Gemini / managed agents / image gen / video gen on the game's behalf
- Pushes results to the display over SSE (one persistent connection per glasses session)
- Serves the 600×600 HTML/CSS/JS surface as static assets
- Mounts game-specific routes for player actions

## Why SSE, not WebSocket?

The Display Web App runtime hasn't been confirmed to allow WebSocket
upgrades through the Meta AI proxy. SSE is plain HTTP — works everywhere,
auto-reconnects on the client side, one direction (server → client) which
matches game state push.

For player → server messages, regular POST requests are fine — they're
infrequent (one per D-pad commit) and don't need streaming.

## Why Cloudflare quick-tunnels for dev?

The glasses require public HTTPS to load your Web App. localhost doesn't
reach them. Cloudflare's quick-tunnel (`cloudflared tunnel --url …`)
gives you a free `https://*.trycloudflare.com` URL with zero setup —
perfect for dev. For production, point a stable named tunnel (or any
Node-hosting platform) at your bridge and use `gfmd deploy` to mint a
QR that doesn't rotate.

## How a game defines itself

A game is one file: `omni.config.mjs`. It exports a `defineGame({ name,
display, routes, onStart })` object. The CLI's `gfmd dev` loads it,
hands it to `startBridge`, and the bridge does the rest.

This is the same pattern Next.js uses with `next.config.js` and React Router
uses with route files — the framework provides infrastructure, the project
provides a configuration object.

## Why managed agents are first-class

The headline new capability in the Gemini API is managed agents — server-
hosted, stateful, tool-using agents with code execution. They're a perfect
fit for game design:

- **Director**: design quest arcs offline, surface real reasoning to the UI
- **Hatchery**: per-entity self-training with code execution sandboxes
- **World-balancer**: non-blocking adjustments to game state
- **Hint-giver**: image-grounded help

`src/tools/managed-agent.mjs` makes all four patterns a one-line call.
`threadKey` solves the per-surface conversation-state problem that bit the
prototypes.

See [managed-agents.md](managed-agents.md) for the full pattern catalog.

## Why the display SDK is so small

Meta Display Web Apps must be plain HTML/CSS/JS — no bundlers, no React,
no framework runtime. The display SDK is three files totaling under 200
lines:

- `base.css` — drop-in 600×600 reset + glassmorphic primitives
- `focus.js` — D-pad focus model (arrow keys + Enter)
- `events.js` — SSE client + auto-reconnect + inline-audio playback

A game can use these by `<link>`-ing them, or skip them entirely if it
wants to roll its own. They're sugar, not a framework.

## State + concurrency

The bridge is a single Node process. Game state lives in module-level
variables in `omni.config.mjs`. For the single-tunnel/single-judge demo
model glasses currently support, that's fine. For multi-user games, swap
in Redis / SQLite / your storage of choice — the framework doesn't dictate.

The one common pitfall: agent threads. The prototypes had a single global
`lastInteractionId` and saw cross-contamination when multiple surfaces
called the same agent. `runManagedAgent({ threadKey: "..." })` solves
this — each thread gets its own previous-interaction chain.
