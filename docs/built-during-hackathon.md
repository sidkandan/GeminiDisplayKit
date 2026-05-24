# Provenance ledger — built during the Google I/O Hackathon, 2026-05-23

This document exists to satisfy the hackathon rule:

> Your demo must only highlight the specific features, code, and functionality
> that your team built during the hackathon. Judges must be able to clearly
> identify what was created during the event.

Everything listed under **NEW** below was written in this codebase on 2026-05-23
between hackathon start and submission. Everything listed under **REFERENCED** is
not our work and is either invoked as a dependency or vendored unmodified for
integration purposes.

---

## NEW — framework (`src/`, `bin/`, `templates/`)

Authored during the event:

### Bridge
- `src/bridge/server.mjs` — HTTP + SSE + static + per-game route mounting
- `src/utils/qr.mjs` — terminal + PNG QR rendering with terminal fallback
- `src/utils/tunnel.mjs` — Cloudflare quick-tunnel spawner with log-tail URL detection

### Tool wrappers
- `src/tools/client.mjs` — cached Gemini client with clear missing-key error
- `src/tools/managed-agent.mjs` — `runManagedAgent` with `threadKey` (fixes cross-contamination), trace extraction, image-grounded variant
- `src/tools/scene-gen.mjs` — Nano Banana `generateScene` + `scenePrompt` style helper
- `src/tools/lyria.mjs` — `runLyriaClip` + `makeLyriaPrompt` builder
- `src/tools/tts.mjs` — `generateTTS` with PCM-to-WAV header wrap
- `src/tools/veo.mjs` — `generateCinematic` with operation polling
- `src/tools/structured.mjs` — `requestStructured` for Flash JSON-mode + `firstJsonObject` scanner

### Display SDK
- `src/display/base.css` — drop-in 600×600 reset + glassmorphic primitives
- `src/display/focus.js` — D-pad / Neural Band focus model (no deps)
- `src/display/events.js` — SSE client with auto-reconnect + inline-audio playback

### CLI
- `bin/gdk.mjs` — entry point
- `src/cli.mjs` — dispatch + flag parser
- `src/index.mjs` — public SDK surface (`defineGame`, re-exports)
- `src/commands/create.mjs` — scaffold a project from a template
- `src/commands/dev.mjs` — bridge + tunnel + QR orchestration
- `src/commands/deploy.mjs` — mint deep-link + QR for a hosted URL
- `src/commands/doctor.mjs` — pre-flight device checks
- `src/commands/capture.mjs` — operator-gated capture (Phase 1 stub)
- `src/commands/agent.mjs` — one-shot agent invocation

### Templates
- `templates/adventure/` — Nano Banana adventure (full)
- `templates/arena/` — *Phase 3 — derived from PROMPT ARENA example*
- `templates/scanner/` — *Phase 3 (deferred — PALETTE QUEST was deliberately not imported to stay clear of the image-analyzer anti-pattern)*
- `templates/rhythm/` — *Phase 3 — derived from PulseBlade example*
- `templates/quest/` — *Phase 3 — derived from OMNI-ODYSSEY orchestrator pattern*

### Docs
- `README.md`, `DEMO-RUNBOOK.md`, `SUBMISSION.md`, `NOTICE`, `LICENSE`
- `docs/getting-started.md`, `docs/architecture.md`, `docs/managed-agents.md`
- `docs/built-during-hackathon.md` (this file)

---

## NEW — example games (`examples/`)

These three games were prototyped earlier in the day in separate local
workspaces, then refactored later in the day to depend on `gdk`. All
authored on 2026-05-23.

- `examples/omni-odyssey/` — Nano Banana adventure, refactored to depend on the framework. The original 340-line `orchestrator.mjs` shrinks to a 110-line `omni.config.mjs` because the framework now owns the bridge/SSE/tunnel/QR. Display HTML ported as-is.
- `examples/pulseblade/` — original wearable rhythm game. Flash designs the level (structured output), Lyria scores the backing track, a managed-agent director publishes a balancing note. The original `pulseblade-server.mjs` (~500 lines of duplicated bridge code) becomes a ~100-line `omni.config.mjs`. `level.mjs` and display files ported as-is.
- `examples/prompt-arena/` — bonus folder: the standalone Python managed-agent monster tournament, dropped in verbatim from its earlier-in-the-day prototype workspace. Sensitive `.env` excluded; per-project `.claude/` state removed. Marked as bonus in `BONUS-NOT-DEMOED.md` — not part of the live demo but the strongest single piece of `code_execution_call` evidence in the repo (captured at `examples/prompt-arena/data/traces/`).

**Status as of Phase 2 (the import push):** all three examples present. Two
fully depend on the framework (Odyssey + PulseBlade). Prompt Arena still runs
standalone on its own Flask server (deferred refactor — not blocking for the
hackathon submission).

---

## REFERENCED — vendored, not modified

These are NOT our work. They live under `vendor/` (if vendored) for offline
reference. Original copyrights and licenses apply. See `NOTICE`.

- `vendor/meta-wearables-webapp/` — Meta-published Web App AI toolkit (the
  canonical reference for the 600×600 Web App surface)
- `vendor/meta-wearables-dat-android/` — Meta-published DAT Android SDK
  (canonical reference for the on-device camera path)

We do not import or copy code from these; the display SDK in `src/display/`
implements the same conventions documented there (600×600, D-pad keys, plain
HTML/CSS/JS).

---

## REFERENCED — runtime dependencies

Declared in `package.json`, installed at `npm install` time.

- `@google/genai` (Apache-2.0) — the official Gemini SDK
- `qrcode` (MIT) — used for QR PNG generation (optional; terminal fallback if absent)
- `cloudflared` — invoked as an external binary; users install separately

---

## How to verify

```bash
git log --reverse --format='%h %ci %s' | head
```

The first commit hash + ISO timestamp should fall within the official hackathon
hours on 2026-05-23. Every commit afterward is part of the build process.

The `vendor/` directory, if present, will have been added in one commit clearly
labeled `vendor: clone meta-wearables-* for reference (unmodified)`.
