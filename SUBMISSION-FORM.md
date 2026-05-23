# SUBMISSION-FORM — copy-paste-ready answers

> This file is the **field-by-field answer sheet** for the Cerebral Valley
> submission form at https://cerebralvalley.ai/e/google-io-hackathon/hackathon/submit
>
> Each section is the answer to a form field, ready to paste in.

---

## Project name

```
Gemini Display Kit for Meta Ray-Ban Display
```

*(AGY: substitute the chosen final name here when ready to submit.)*

## Repository URL

```
https://github.com/sidkandan/<REPO-NAME>
```

## Demo video URL (1 minute)

```
https://youtube.com/shorts/6Gl1k9jtep4
```

## Team

Sid Kandan (solo) — siddharth.kandan@gmail.com

## One-sentence pitch

> We built the missing Gemini SDK layer for Meta Ray-Ban Display: a public bridge, HUD framework, and managed-agent director system that turns Gemini Flash, Managed Agents, Nano Banana, Lyria, and Veo into playable, glanceable smart-glasses experiences.

## Project description (short — for a 250–500 character field)

> An open-source SDK + CLI for building Gemini-powered games on Meta Ray-Ban Display. Includes a secret-safe Node bridge, 600×600 HUD patterns, Neural Band/D-pad controls, QR/deeplink deployment, managed-agent endpoints, and two live demo games: OMNI-ODYSSEY (a generated illustrated adventure with audience-conjured monsters) and PulseBlade (a 360 wearable rhythm game). Not an image analyzer or chatbot — a reusable Gemini SDK layer for wearable AI experiences.

## Project description (long — for a 1000+ character field)

> Gemini Display Kit for Meta Ray-Ban Display is an open-source developer kit that makes Gemini API experiences work on Meta Ray-Ban Display Web Apps.
>
> Meta Display Web Apps are powerful but constrained: they are small 600×600 HTML/CSS/JS HUDs, controlled by Neural Band/D-pad input, and they do not directly expose camera or microphone APIs. Gemini has fast multimodal generation, managed agents, native image generation, music generation, and video generation, but a glasses app needs a safe bridge between those APIs and the on-glasses HUD. We built that bridge.
>
> The kit includes: a trusted Node bridge that keeps API keys server-side and routes Gemini Flash / Managed Agents / Lyria / Nano Banana / Veo calls; glasses-ready 600×600 Web App surfaces with D-pad/Neural Band controls; OMNI-ODYSSEY (a generated choose-your-path adventure where Gemini Flash narrates, Nano Banana paints scenes, audience-conjured monsters are woven in as encounters, and Veo provides the opening cinematic); PulseBlade (a generated 360 wearable rhythm game); managed-agent instructions and a MetaDisplay HUD skill that encode platform constraints; QR/deeplink deployment tooling; smoke tests and runbooks.
>
> It is deliberately NOT a banned image analyzer, basic RAG, Streamlit app, chatbot, advisor, or screener. It is a hardware-integrated Gemini SDK kit plus original wearable experiences that demonstrate how new Gemini APIs can become real smart-glasses interactions.

## "Does your project use managed agents? Explain how." (for the managed-agents prize field)

> Yes. Gemini Display Kit for Meta Ray-Ban Display uses Gemini Managed Agents as the **director layer** for wearable Gemini experiences — not as a chatbot, but as runtime architecture.
>
> Our server-side bridge calls the Gemini Interactions API through `@google/genai` with `agent: "antigravity-preview-05-2026"` and a remote sandbox. The sandbox is seeded with our `.agents/AGENTS.md` instructions and MetaDisplay HUD constraints, so the agent knows the glasses app is a 600×600 display-only Web App, controlled by Neural Band/D-pad input, with secrets kept off-device.
>
> Three concrete uses:
>
> 1. **Wearable game director.** In PulseBlade, Gemini Flash generates a sparse 360 rhythm level and Lyria generates the backing track; a managed agent reviews the level as a game director and returns a balancing note, a live-demo talking point, and a risk guardrail. The agent supervises a generated wearable game loop, not labels an image.
>
> 2. **World-state and quest director.** In OMNI-ODYSSEY, the optional `/director` route lets a managed agent re-imagine the choice set based on the journey so far, with persistent thread state via `threadKey`. The agent emits a judge-visible trace with `interactionId` and `environmentId`.
>
> 3. **Captured `code_execution_call` traces** at `examples/prompt-arena/data/traces/m_emberton.json` (~105KB) show a managed agent **writing Python and running it in a remote sandbox** to tune a battle strategy — server-side code execution, persisted state, not one completion.
>
> Architecture is intentional: Gemini Flash / Nano Banana / Lyria / Veo handle direct generation (low latency); Managed Agents handle planning, continuity, orchestration, and quality control (higher latency, higher value). See `docs/managed-agents.md` for the full pattern catalog.

## "What did you build during the hackathon?" (provenance field)

> 100% built during the Google I/O Hackathon, 2026-05-23. The framework — `src/`, `bin/`, `templates/`, `docs/` — was written today. The three example games (OMNI-ODYSSEY, PulseBlade, PROMPT ARENA) were prototyped today, then refactored to depend on the framework.
>
> Original work:
> - Gemini-to-MetaDisplay bridge (`src/bridge/server.mjs`) — HTTP + SSE + static + per-game route mounting + Buffer-aware response writer
> - Reusable wrappers for every Gemini surface — `runManagedAgent` (with `threadKey` to fix cross-surface contamination), `generateScene` (Nano Banana), `generateText` (Flash narration), `runLyriaClip`, `generateTTS`, `generateCinematic` (Veo), `requestStructured` (Flash JSON-mode)
> - Display SDK — 600×600 reset CSS, D-pad focus model with MutationObserver, SSE client with auto-reconnect + inline-audio playback
> - CLI — `gfmd create | dev | deploy | doctor | capture | agent run`
> - Templates — `adventure` (full working)
> - Three example games — OMNI-ODYSSEY (narrative engine + audience-conjure), PulseBlade (rhythm game with pose tracking + layered audio), PROMPT ARENA (8-monster bracket with captured code-execution traces)
> - Operational scripts — pre-publish scrub, demo-day preflight, smoke test, Odyssey prewarm
> - 13 documentation files including PROVENANCE.md (file-by-file ledger), anti-pattern defense, judges' guide, video script, Gemini tools catalog, MacBook Pro runbook
>
> Non-original code (NOT claimed as ours):
> - `@google/genai` npm package (Apache-2.0) — official Gemini SDK
> - `qrcode` npm package (MIT)
> - `cloudflared` (external binary)
> - References to Meta-published Web App + DAT Android SDKs (not vendored, not imported — we implement the same conventions from scratch in `src/display/`)
>
> Per-file ledger: [`PROVENANCE.md`](PROVENANCE.md). Verification: `git log --reverse --format='%h %ci %s' | head` — first commit timestamp falls within hackathon hours on 2026-05-23.

## Categories / prize tracks

- **Best Use of Managed Agents** ($5,000) — primary target
- **Overall** (1st/2nd/3rd) — secondary target

---

# Reference URLs cited in our pitch

Use these when judges ask "is that model real / available?"

- **Gemini Managed Agents overview:** https://ai.google.dev/gemini-api/docs/agents
- **Managed Agents quickstart:** https://ai.google.dev/gemini-api/docs/managed-agents-quickstart
- **Gemini API quickstart:** https://ai.google.dev/gemini-api/docs/quickstart
- **Gemini 3.5 / Interactions API:** https://ai.google.dev/gemini-api/docs/interactions/whats-new-gemini-3.5
- **Nano Banana (image generation):** https://ai.google.dev/gemini-api/docs/image-generation
- **Veo (video generation):** https://ai.google.dev/gemini-api/docs/video
- **Lyria (music generation):** https://ai.google.dev/gemini-api/docs/music-generation
- **Gemini API cookbook:** https://github.com/google-gemini/cookbook
- **Managed Agents blog post:** https://blog.google/innovation-and-ai/technology/developers-tools/managed-agents-gemini-api/
