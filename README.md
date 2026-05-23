# Gemini Flash Meta Displays

**A Gemini-powered SDK + CLI for building games on Meta Ray-Ban Display.**

Ship a smart-glasses game in minutes — one command scaffolds a 600×600 HUD, a Gemini bridge with **managed agents / Nano Banana / Lyria / Veo / Flash multimodal** wired in, a Cloudflare tunnel, and the `fb-viewapp://` install QR your phone needs to load it on the glasses.

> **Built live at the Google I/O Hackathon — Cerebral Valley, 2026-05-23.** 100% new work, written during the event. Three working games included as examples. See [`docs/built-during-hackathon.md`](docs/built-during-hackathon.md) for the provenance ledger.

---

## 60-second pitch

Meta Ray-Ban Display just opened up. The Web Apps surface is HTML/CSS/JS in a 600×600 viewport, driven by D-pad/Neural Band keys, with no camera/mic on the page. To build anything good on it you have to assemble: a bridge server that holds your Gemini key, an SSE pattern that pushes results to the glasses, a deep-link install flow, a way to mint cinematic clips with Veo without blocking the loop, a way to use managed agents as game directors — and a Cloudflare tunnel because the glasses need public HTTPS.

That stack took us a day of plumbing. **Gemini Flash Meta Displays is that stack, packaged.** Three commands take you from `npx gfmd create` to scanning a QR with your phone and seeing your game on the lenses.

```bash
npx gfmd create my-game --template adventure
cd my-game
gfmd dev           # localhost + cloudflared tunnel + auto-QR on console
gfmd deploy        # public HTTPS URL + `fb-viewapp://` deep-link QR
```

That's it. The boilerplate that the framework writes for you includes:

- **Bridge** (`src/bridge/server.mjs`) — Node HTTP + SSE + static + Gemini routing, with per-game route handlers
- **Display SDK** (`src/display/`) — 600×600 reset CSS, D-pad focus model, SSE client with auto-reconnect
- **Tool wrappers** (`src/tools/`) — `runManagedAgent`, `generateScene` (Nano Banana), `runLyriaClip`, `generateTTS`, `generateCinematic` (Veo), `requestStructured` (Flash JSON-mode)
- **CLI** (`bin/gfmd.mjs`) — `create`, `dev`, `deploy`, `doctor`, `capture`

## Games we built with it

| Example | Demo role | Mechanic | Gemini surfaces |
|---|---|---|---|
| **[OMNI-ODYSSEY](examples/omni-odyssey/)** | **Lead live demo** | Pick a door → Nano Banana paints the next world | Nano Banana (image), Veo (cinematic), Managed agent (director) |
| **[PulseBlade](examples/pulseblade/)** | **Second live demo** | Original wearable rhythm game; Flash designs the level, Lyria scores the track | Flash structured output (level designer), Lyria 3 (backing track), Managed agent (director note) |
| **[PROMPT ARENA](examples/prompt-arena/)** *(bonus — not live-demoed)* | Managed-agents code-execution proof | 8 monsters, each trained by its own agent that writes & runs Python in a sandbox | **Managed agents + code execution** (per-entity hatchery), Imagen (sprites), TTS (sportscaster), Structured output |

Each is a self-contained project that depends only on `gfmd`. Open any one and you can read top to bottom how a Display Web App is structured. Clone, drop in your `GEMINI_API_KEY`, run `gfmd dev`, scan the QR. You're on the glasses in two minutes.

## Why "managed agents are the spine"

Managed agents are the headline new capability in the Gemini API. We treat them as the **creative core** of every template, not a chat box. Four distinct use patterns, each in a template:

| Pattern | Template | Example | What the agent actually does |
|---|---|---|---|
| **Director** | `adventure` | OMNI-ODYSSEY (lead demo) | Designs new choice sets mid-game. ONE call per turn, `trace[]` streams to a Director's-View console. |
| **Hatchery** | `arena` | PROMPT ARENA *(bonus folder)* | One agent per entity. Each agent reads game rules, derives a strategy, **writes Python and runs it in its remote sandbox** to self-test, emits a structured strategy. *Captured `code_execution_call` traces in `examples/prompt-arena/data/traces/`.* |
| **World-balancer** | `rhythm` | PulseBlade (second demo) | Non-blocking call after a level is composed — agent returns a balancing note + live-demo talking point. |
| **Hint-giver** | `quest` | *(pattern documented in [docs/managed-agents.md](docs/managed-agents.md#pattern-4--hint-giver))* | Image-grounded turn-side agent: looks at the last frame, returns a ≤15-word hint. |

A judge asking *"how is this managed agents, not just API calls?"* gets four pre-built answers in this repo — each with a captured trace they can scroll through in the UI.

## Install & quickstart

**Requirements:** Node 18+, a Pixel/Android phone for QR scanning, Meta Ray-Ban Display + Meta AI app, `cloudflared` (`brew install cloudflared`), `GEMINI_API_KEY` from AI Studio.

```bash
# 1. Scaffold
npx gfmd create my-game --template adventure
cd my-game
cp .env.example .env
# edit .env — set GEMINI_API_KEY

# 2. Dev — boots the bridge on :8787 and a quick Cloudflare tunnel, prints the QR
gfmd dev

# 3. Add to glasses
#    - Scan the printed QR with your Pixel camera
#    - Meta AI app → "Add Web App" sheet → Add
#    - Open the app on the glasses

# 4. (optional) Health check the device path before live demo day
gfmd doctor
```

`gfmd dev` outputs:

```
[bridge]   http://127.0.0.1:8787/
[tunnel]   https://random-words.trycloudflare.com/
[deeplink] fb-viewapp://web_app_deep_link?appName=MyGame&appUrl=...
[qr]       printed below (also saved to artifacts/install-qr.png)

████ ███ ██████ ████ ...
```

## Documentation

- [Getting started](docs/getting-started.md) — what a project looks like, the `omni.config.mjs` shape
- [Architecture](docs/architecture.md) — the bridge↔display SSE pattern, why it splits this way
- [Managed agents](docs/managed-agents.md) — the four use patterns + a glossary
- [Gemini tool catalog](docs/gemini-tools.md) — every wrapper, with the underlying model id
- [Deploying to glasses](docs/deploying.md) — Cloudflare tunnel, deep-link, install QR, gotchas
- [Built during the hackathon](docs/built-during-hackathon.md) — provenance ledger (what's new vs vendored)

## CLI reference

| Command | What it does |
|---|---|
| `gfmd create <name> --template <t>` | Scaffold a new project from a template (`adventure` — others coming) |
| `gfmd dev` | Boot the bridge + Cloudflare quick-tunnel, print install QR, hot-reload display files |
| `gfmd deploy` | Mint a stable deep-link + QR; optionally hand off to a hosting target |
| `gfmd doctor` | Probe Pixel ADB state, Stella version, CameraAccess entitlement (Pixel/glasses path) |
| `gfmd capture --source dat\|pixel` | Operator-gated frame capture from glasses/phone for testing your bridge |
| `gfmd agent run` | One-shot managed-agent invocation from the terminal — useful for testing prompts |

## Provenance

**100% built during the Google I/O Hackathon, 2026-05-23.** The framework was written today. The example games were prototyped today (Prompt Arena, OMNI-ODYSSEY, PulseBlade), then refactored to depend on the framework. See [`PROVENANCE.md`](PROVENANCE.md) for the per-file ledger and [`NOTICE`](NOTICE) for third-party attributions.

First commit timestamped at event start; commit log is the receipts. See [`docs/built-during-hackathon.md`](docs/built-during-hackathon.md) for the per-file ledger.

## Team

Sid Kandan (solo). Built with a heterogeneous AI build-swarm (Codex + Gemini Antigravity CLI + Claude) orchestrated live.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
