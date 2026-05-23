# Gemini Display Kit — Cerebral Valley / Google I/O Hackathon submission

**Project name:** Gemini Display Kit (`gdk`)

**Tagline:** A CLI + SDK that turns Gemini 3.5 Flash, managed agents, Nano Banana, Lyria, and Veo into game-ready primitives for Meta Ray-Ban Display. Two live-demo games + one bonus example included.

**Repo (public):** https://github.com/sidkandan/GeminiDisplayKit

**Demo video (1-minute):** https://youtube.com/shorts/6Gl1k9jtep4

**Live demo:** On stage — `npx gdk create` → glasses HUD in under 90 seconds. See [`DEMO-RUNBOOK.md`](DEMO-RUNBOOK.md) and [`docs/video-script.md`](docs/video-script.md). Two live-demo examples reachable via QR.

## What it is

Gemini Display Kit is the framework that didn't exist for Meta Ray-Ban Display. Smart-glasses Web Apps are HTML/CSS/JS in a 600×600 viewport, navigated by D-pad/Neural Band keys, with **no camera or microphone API on the page itself**. Every team trying to build something good on them currently re-implements the same stack: a bridge server holding the Gemini key, an SSE pattern to push results to the glasses, a deep-link install flow, Cloudflare-tunneled public HTTPS, wrappers for every Gemini surface, and an operator-gated camera-side capture path.

Gemini Display Kit packages that stack as a CLI + SDK. Three commands take you from `npx gdk create` to scanning a QR with your phone and seeing your game on the lenses. The framework ships wrappers for every Gemini surface a glasses game needs — Flash multimodal, managed agents (with thread-keyed conversations), Nano Banana image gen, Lyria 3 music gen, Veo image-to-video for cinematic moments, TTS for in-game audio, structured-output for game-design tasks.

Working games ship in `examples/` as proof of the framework:

| Example | Demo role | Mechanic | Headline Gemini surfaces |
|---|---|---|---|
| **OMNI-ODYSSEY** | Lead live demo | Pick a door → Nano Banana paints the next world | Nano Banana (image), Veo (cinematic), Managed agent (director) |
| **PulseBlade** | Second live demo | Original wearable rhythm game; Flash designs the level, Lyria scores | Flash structured output, Lyria 3, Managed agent (director note) |
| **PROMPT ARENA** *(bonus — not live-demoed)* | Managed-agents code-execution proof | 8 monsters, each trained by its own sandboxed agent | Managed agents + **code execution**, Imagen 4, Gemini TTS |

## Why managed agents (not just API calls)

Gemini Display Kit treats managed agents as the **creative spine** of every game, not a chat box. Four distinct use patterns, each implemented as a one-line `runManagedAgent({...})` call with a `threadKey` for per-surface conversation state. Captured `interaction.steps` traces (including `code_execution_call` / `code_execution_result`) are rendered in the UI as evidence.

| Pattern | Where it lives | Where to look |
|---|---|---|
| **Director** | OMNI-ODYSSEY (lead demo) | `examples/omni-odyssey/omni.config.mjs` — `POST /director` route |
| **World-balancer** | PulseBlade (second demo) | `examples/pulseblade/omni.config.mjs` — non-blocking `tools.runManagedAgent` after level compose |
| **Hatchery (code execution)** | PROMPT ARENA (bonus) | `examples/prompt-arena/hatchery/hatch.py` + captured traces at `examples/prompt-arena/data/traces/m_emberton.json` |
| **Hint-giver (image-grounded)** | Pattern documented; no example shipped | `docs/managed-agents.md` Pattern 4 |

See [`docs/managed-agents.md`](docs/managed-agents.md) for the full catalog with code samples.

## Built 100% during the hackathon (2026-05-23)

**Public repo. First commit timestamped at event start.** The framework itself — `src/`, `bin/`, `templates/`, `docs/` — was written today. The example games were prototyped today, then refactored to depend on the framework as the day progressed.

**Per-file provenance ledger:** [`PROVENANCE.md`](PROVENANCE.md)

The only non-original code is:
- The `@google/genai` npm package (Apache-2.0)
- `qrcode` npm package (MIT)
- `cloudflared` (invoked as an external process)

See [`NOTICE`](NOTICE) for full attributions and [`docs/built-during-hackathon.md`](docs/built-during-hackathon.md) for the granular ledger of what was authored when.

## Anti-pattern guard

We checked Gemini Display Kit against the hackathon's banned-project list — see [`docs/anti-pattern-defense.md`](docs/anti-pattern-defense.md) for the full defense:

| Banned pattern | Position |
|---|---|
| AI Mental Health Advisor | N/A — entertainment / games |
| Basic RAG Applications | N/A — no retrieval anywhere |
| Streamlit Applications | N/A — Node + plain HTML/JS only |
| **Image Analyzers** | **Deliberately avoided.** Framework is provider-agnostic infrastructure; games are *generative* (Nano Banana paints, Lyria composes, managed agents direct). The optional Hint-giver pattern uses images as game-mechanic input to a managed agent, not as a service-of-analysis. See `docs/anti-pattern-defense.md`. |
| AI Education Chatbot | N/A |
| AI Job Application Screener | N/A |
| AI Nutrition Coach | N/A |
| Personality Analyzers | N/A — no personal inference anywhere |
| Medical advice | N/A — entertainment only; system instructions explicitly forbid health/medical inference where images of people might appear |

## Team

Sid Kandan (solo). Built with a heterogeneous AI build-swarm (Codex + Gemini Antigravity CLI + Claude Opus) orchestrated live.

See [`CONTRIBUTORS.md`](CONTRIBUTORS.md) for the team breakdown.
