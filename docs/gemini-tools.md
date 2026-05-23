# Gemini API tools — catalog

Every Gemini surface the framework wraps, with file paths and the model id
each wrapper calls by default. Use this as the cross-reference for
[`SUBMISSION.md`](../SUBMISSION.md)'s claim that "this hits every Gemini
surface a glasses game needs."

| Capability | Default model | Wrapper | Game-side example |
|---|---|---|---|
| **Managed Agents** (Antigravity) | `antigravity-preview-05-2026` (configurable via `MANAGED_AGENT_ID`) | [`src/tools/managed-agent.mjs`](../src/tools/managed-agent.mjs) — `runManagedAgent({ prompt, threadKey, ... })` | OMNI-ODYSSEY `/director` route, PulseBlade director note, all four patterns in [`docs/managed-agents.md`](managed-agents.md) |
| **Code Execution** (in agent sandbox) | Built-in agent tool | Via `runManagedAgent({ sources: [...] })` — pass extra `inline` source files for the sandbox to read/run | Prompt Arena hatchery — agent writes `tune_strategy.py`, runs it, reads stdout |
| **Nano Banana** (image gen) | `gemini-3.1-flash-image-preview` (configurable via `IMAGE_MODEL`) | [`src/tools/scene-gen.mjs`](../src/tools/scene-gen.mjs) — `generateScene(prompt)` | OMNI-ODYSSEY paints each new scene |
| **Lyria 3** (music gen) | `lyria-3-clip-preview` (configurable via `LYRIA_MODEL`) | [`src/tools/lyria.mjs`](../src/tools/lyria.mjs) — `runLyriaClip(prompt)` + `makeLyriaPrompt({ theme, bpm, difficulty })` | PulseBlade backing track |
| **Veo** (image-to-video, async) | `veo-3.1-fast-generate-preview` (configurable via `VEO_MODEL`) | [`src/tools/veo.mjs`](../src/tools/veo.mjs) — `generateCinematic(imageB64, mime, prompt, downloadPath)` | OMNI-ODYSSEY opening cinematic (pre-generated via `scripts/prewarm-odyssey.mjs`) |
| **Gemini TTS** | `gemini-3.1-flash-tts-preview` (configurable via `TTS_MODEL`) | [`src/tools/tts.mjs`](../src/tools/tts.mjs) — `generateTTS(text, { voice })` | Prompt Arena sportscaster (round intros + per-champion calls) |
| **Structured Output** (Flash JSON-mode) | `gemini-flash-latest` (configurable via `GEMINI_MODEL`) | [`src/tools/structured.mjs`](../src/tools/structured.mjs) — `requestStructured({ prompt, schema, imageContext })` | PulseBlade level designer |
| **Flash multimodal** (image + text input) | `gemini-flash-latest` | Same as Structured Output, with `imageContext: { data, mimeType }` | Documented in [`docs/managed-agents.md`](managed-agents.md) Pattern 4 (hint-giver) |
| **Imagen 4** (alternative image gen) | `imagen-4.0-generate-001` | Not yet a framework wrapper — used directly in `examples/prompt-arena/tools_sprite.py` | Prompt Arena monster sprites |

## Why two image generators?

| | Nano Banana (`gemini-3.1-flash-image-preview`) | Imagen 4 (`imagen-4.0-generate-001`) |
|---|---|---|
| API surface | `models.generateContent` with `responseModalities: ["IMAGE"]` | `models.generate_images` (dedicated endpoint) |
| Strength | Conversational + JSON-friendly; faster for game loops | Higher fidelity for marketing-quality stills |
| Latency | ~15–20s | ~10s |
| In the framework | `src/tools/scene-gen.mjs` (default for scene generation in adventure-class games) | `examples/prompt-arena/tools_sprite.py` (legacy from the standalone prototype) |

Phase 3 work: add an `src/tools/imagen.mjs` wrapper so future templates can pick.

## Why we don't expose Live API

Gemini Live API (`gemini-3.1-flash-live-preview`) is great for low-latency
voice/vision streaming, but glasses Web Apps **do not have access to the
camera or microphone API** on the page. Live API expects bidirectional
audio/video from the client, which the Web App surface can't provide
without a native Android DAT companion. That's a Phase 3 path
(`gfmd capture --source dat` once the DAT wrappers are vendored).

## Thinking-level control

Several wrappers accept a `thinking_level` parameter pass-through to
Gemini. We default to model-default. Prompt Arena's training calls use
`medium` thinking level (see `examples/prompt-arena/hatchery/hatch.py`).
The framework's `runManagedAgent` accepts arbitrary additional options
via the optional `options.tools` and `options.environment` overrides.

## Setting model IDs via env

Every model ID is overridable via `.env`. Defaults are in `.env.example`:

```
GEMINI_MODEL=gemini-flash-latest
IMAGE_MODEL=gemini-3.1-flash-image-preview
TTS_MODEL=gemini-3.1-flash-tts-preview
VEO_MODEL=veo-3.1-fast-generate-preview
LYRIA_MODEL=lyria-3-clip-preview
MANAGED_AGENT_ID=antigravity-preview-05-2026
```

When Google ships a new model ID, you should be able to swap it in a
single line without touching any source.
