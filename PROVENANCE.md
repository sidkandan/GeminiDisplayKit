# PROVENANCE — what was built when

> **Why this file exists:** The Google I/O hackathon rules state, twice, that
> failure to clearly distinguish original work from existing work results in
> **immediate disqualification**. This document is the file-by-file ledger
> answering that question for every artifact in this repo.

**Project:** Gemini Flash Meta Displays (`gfmd`)
**Event:** Cerebral Valley / Google I/O Hackathon
**Event date:** 2026-05-23
**Team:** Sid Kandan (solo) + an AI build-swarm (see [`CONTRIBUTORS.md`](CONTRIBUTORS.md))

## Verification (for judges)

```bash
git log --reverse --format='%h %ci %s' | head -20
```

Every commit hash should carry an ISO timestamp that falls **within
hackathon hours on 2026-05-23**. The first commit is the bootstrap and
contains everything described as "NEW" below. Subsequent commits are the
build process.

## NEW work — authored during the event

Every file in the following directories was **written today** (2026-05-23)
during the hackathon. None of these files existed before the event started.

### Framework core (`src/`, `bin/`, `templates/`)

| Path | Lines | What it is |
|---|---:|---|
| `bin/gfmd.mjs` | 22 | CLI entry point |
| `src/cli.mjs` | 105 | Command dispatch + flag parser |
| `src/index.mjs` | 41 | Public SDK surface (`defineGame`, tools re-exports) |
| `src/bridge/server.mjs` | 240 | HTTP + SSE + static + per-game route mounting |
| `src/tools/client.mjs` | 23 | Cached lazy Gemini client |
| `src/tools/managed-agent.mjs` | 135 | `runManagedAgent` with per-surface `threadKey` |
| `src/tools/scene-gen.mjs` | 60 | Nano Banana wrapper |
| `src/tools/lyria.mjs` | 50 | Lyria 3 wrapper + prompt builder |
| `src/tools/tts.mjs` | 70 | Gemini TTS wrapper with PCM→WAV wrapping |
| `src/tools/veo.mjs` | 50 | Veo image-to-video wrapper with operation polling |
| `src/tools/structured.mjs` | 80 | Flash JSON-mode wrapper + first-JSON scanner |
| `src/tools/index.mjs` | 25 | Tools barrel module |
| `src/display/base.css` | 130 | 600×600 reset + glassmorphic primitives |
| `src/display/focus.js` | 80 | D-pad focus model with MutationObserver |
| `src/display/events.js` | 60 | SSE client + reconnect + inline-audio |
| `src/commands/create.mjs` | 80 | Template scaffolder with `{{NAME}}` substitution |
| `src/commands/dev.mjs` | 90 | Bridge + tunnel + QR orchestration |
| `src/commands/deploy.mjs` | 30 | Deeplink + QR mint for hosted URL |
| `src/commands/doctor.mjs` | 55 | ADB/Stella/entitlement preflight |
| `src/commands/capture.mjs` | 35 | Operator-gated capture (Phase 1 stub) |
| `src/commands/agent.mjs` | 30 | One-shot agent invocation |
| `src/utils/qr.mjs` | 55 | Terminal + PNG QR with terminal fallback |
| `src/utils/tunnel.mjs` | 60 | Cloudflared quick-tunnel spawner with log-tail URL detect |
| `templates/adventure/*` | ~250 | Complete working template (config + display + package.json + README) |
| `package.json`, `.gitignore`, `.env.example` | — | Standard project files |

### Documentation (`docs/`, top-level docs)

| Path | What it is |
|---|---|
| `README.md` | Project pitch + install + examples + CLI reference |
| `SUBMISSION.md` | Hackathon submission form mirror |
| `DEMO-RUNBOOK.md` | 3-min stage script + 1-min video cut + Q&A defense |
| `PROVENANCE.md` | **This file** |
| `CONTRIBUTORS.md` | Team + AI build-swarm breakdown |
| `LICENSE` | MIT |
| `NOTICE` | Third-party attributions |
| `CONTRIBUTING.md` | How to contribute |
| `CODE_OF_CONDUCT.md` | Standard Contributor Covenant |
| `SECURITY.md` | Vulnerability reporting |
| `docs/getting-started.md` | First-game-in-5-minutes |
| `docs/architecture.md` | Bridge ↔ display ↔ Gemini design rationale |
| `docs/managed-agents.md` | The four agent patterns with code samples |
| `docs/built-during-hackathon.md` | Provenance ledger (this file's companion) |
| `docs/anti-pattern-defense.md` | Why we are NOT a banned project |
| `docs/judges-guide.md` | Recommended file-viewing order |
| `docs/video-script.md` | Shot-by-shot 1-minute demo video |
| `docs/gemini-tools.md` | Catalog of every Gemini surface used |

### Operational scripts (`scripts/`)

| Path | What it is |
|---|---|
| `scripts/scrub-for-publish.sh` | Pre-push safety scan (keys, hardcoded paths) |
| `scripts/demo-day.sh` | Pre-demo preflight runner |
| `scripts/smoke.mjs` | CLI smoke test for `npm test` |
| `scripts/prewarm-odyssey.mjs` | Generate Veo cinematic + opening scene |

### Example games (`examples/`)

| Path | Origin | Authored | Framework dependency |
|---|---|---|---|
| `examples/omni-odyssey/` | Refactored from a 340-line standalone `orchestrator.mjs` prototyped earlier today in a separate workspace. The new version is ~110 lines because the framework now owns the bridge/SSE/tunnel/QR. | Today (2026-05-23) | Depends on `gfmd` via local `file:../..` |
| `examples/pulseblade/` | Refactored from a 500-line standalone `pulseblade-server.mjs` prototyped earlier today. The level designer library (`level.mjs`) and display files ported as-is; the bridge wrapper shrinks to ~100 lines because the framework owns the duplicated bits. | Today (2026-05-23) | Depends on `gfmd` via local `file:../..` |
| `examples/prompt-arena/` | Standalone Python project prototyped earlier today as a parallel hackathon attempt. Dropped in verbatim as a **bonus example** for the captured `code_execution_call` traces. **Does not currently depend on the framework** — runs on its own Flask server. See [`examples/prompt-arena/BONUS-NOT-DEMOED.md`](examples/prompt-arena/BONUS-NOT-DEMOED.md). | Today (2026-05-23) | Standalone (Python; Phase 3 will wrap it) |

## What's in `examples/prompt-arena/` specifically

Because it's a verbatim drop of a separate (today-authored) project, every
file there is also new-as-of-today. Notable artifacts:

- `engine/battle.py`, `engine/tournament.py` — deterministic JS-free battle engine
- `hatchery/hatch.py` — per-monster managed-agent training with code execution
- `tools_sprite.py` — Imagen 4 sprite generator (originally mislabeled Nano Banana in `TOOLS_USED.md`; corrected during cleanup)
- `tools_tts.py` — Gemini TTS sportscaster pipeline
- `server.py` — Flask UI on :5001
- `static/`, `templates/` — vanilla JS arena UI (animated bracket, HP bars, taunts)
- `data/monsters.json`, `data/strategies/*.json`, `data/tournament.json` — game data, all authored today
- `data/traces/m_{aqualisk,cindermaw,emberton}.json` — **captured `interaction.steps` traces, real artifacts from today's managed-agent runs**
- `static/sprites/*.png` — Imagen 4 outputs, generated today
- `static/audio/*.wav, *.mp3` — Gemini TTS outputs, generated today
- `internal-archive/` — AI-coordination briefs (Codex + Gemini Antigravity) used during today's parallel build

## REFERENCED — not our work

These are dependencies and references. They are **never claimed as our work**.

### npm runtime dependencies (declared in `package.json`)

| Package | License | Use |
|---|---|---|
| `@google/genai` (^2.6.0) | Apache-2.0 | Official Gemini SDK |
| `qrcode` (^1.5.4) | MIT | QR PNG + terminal rendering |

### External binaries (invoked, not bundled)

| Binary | License | Use |
|---|---|---|
| `cloudflared` | Apache-2.0 | Dev tunnel (`gfmd dev`) |
| `node` | MIT | Runtime |
| `adb` (Android SDK Platform Tools) | Apache-2.0 | Optional, used by `gfmd doctor` |

### Python dependencies (`examples/prompt-arena/`)

| Package | License | Use |
|---|---|---|
| `google-genai` | Apache-2.0 | Official Gemini SDK |
| `flask` | BSD-3-Clause | Web server |
| `python-dotenv` | BSD-3-Clause | `.env` loading |

### Documentation references (not vendored, not imported)

We **reference** the following Meta-published SDKs in `docs/architecture.md`
and the README as the canonical source for the 600×600 Web App + on-device
camera path conventions. We do not include or copy any code from them:

- `meta-quest/meta-wearables-webapp` — the Web App AI toolkit
- `meta-quest/meta-wearables-dat-android` — the DAT Android SDK

Our display SDK (`src/display/*`) implements the same conventions from
scratch.

## How the AI build-swarm credit works

Sid Kandan is the solo team member. The work was performed by Sid in
collaboration with three AI build agents acting as collaborators:

- **Codex CLI** — JavaScript engine + arena UI for Prompt Arena
- **Gemini Antigravity CLI** — managed-agent hatchery + image/TTS pipelines for Prompt Arena
- **Claude Opus 4.7** (this session) — framework refactor, repo cleanup, documentation

This is analogous to a solo dev using GitHub Copilot or Cursor — the human
owns the design, the AI helps write the code. See [`CONTRIBUTORS.md`](CONTRIBUTORS.md)
for the full breakdown.

## What is NOT in this repo (intentionally)

- No `.env` files (gitignored; would contain API keys)
- No `node_modules/` (installed at `npm install` time)
- No `.venv/` (installed at `python -m venv` + `pip install`)
- No `vendor/` Meta SDK clones (we reference them rather than bundle)
- No pre-existing project code (everything was authored on 2026-05-23)

If you find anything in the repo that doesn't fit one of the categories
above, please open an issue — we want this provenance to be airtight.
