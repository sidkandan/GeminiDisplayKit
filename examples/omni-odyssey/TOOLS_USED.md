# OMNI-ODYSSEY — Gemini API & Tools Used

> Adapted from the source `TOOLS_USED-OMNI-ODYSSEY.md` authored today on the
> Mac mini. Original line: "A live, AI-painted choose-your-path adventure on
> the Meta Ray-Ban Display. Built during the Google I/O hackathon
> (Cerebral Valley, 2026-05-23)."

**What it is:** A live, AI-painted choose-your-path adventure on Meta Ray-Ban Display. A Veo cinematic opens it; **Gemini 3.5 Flash** narrates a coherent, consequential story; **Nano Banana** paints every scene and every creature — including monsters the **audience conjures live** at `<tunnel>/conjure`.

**SDK:** `@google/genai` (JavaScript), wrapped by `gemini-display-kit/tools`. API key in a gitignored `.env` (`chmod 600`), loaded server-side only — never shipped to the client, the QR, or logs.

---

## Gemini capabilities — CORE (in the live experience)

| Capability | Model ID | Role in OMNI-ODYSSEY | Code (framework wrapper · call site) |
|---|---|---|---|
| **Image generation — Nano Banana** | `gemini-3.1-flash-image-preview` | Paints **every scene and every creature** from a text prompt — pure generation, no camera/analysis. ~16–20 s/image. | `tools.generateScene(prompt)` → `omni.config.mjs · narrate() · advanceOdyssey()` |
| **Text generation — Gemini 3.5 Flash (the story engine)** | `gemini-flash-latest` | Narrates a **coherent, consequential** branching story *with memory*: each choice's outcome is narrated (befriend → the creature joins you; later beats call back). ~2–4 s/beat. Returns strict JSON parsed by `firstJsonObject`. | `tools.generateText(prompt)` → `omni.config.mjs · narrate()` |
| **Video generation — Veo** | `veo-3.1-fast-generate-preview` | **Image→video opening cinematic** (animates the first scene; 8 s / 720p with native audio). Our **stand-in for Gemini Omni** (no public Omni API). Pre-generated via `scripts/prewarm-odyssey.mjs`. | `tools.generateCinematic(b64, mime, prompt, outPath)` → `scripts/prewarm-odyssey.mjs` |
| **Structured output (JSON)** | (Gemini 3.5 Flash) | Every beat returns strict JSON `{narration, choices[3], image_prompt, tag}`, parsed tolerantly → drives the HUD text, the choices, and the next image prompt. | `omni.config.mjs · narrate()` + `tools.firstJsonObject` |

---

## Wired / available — NOT in the live OMNI-ODYSSEY loop

- **Managed Agents — Antigravity** · `antigravity-preview-05-2026` via `tools.runManagedAgent({ ... })`. **Available via `POST /director`** for mid-game choice re-imagination (one-shot, latency-aware). The current per-turn narration uses **Flash** (~2–4s vs the agent's ~20s). The obvious "**best use of managed agents**" upgrade is re-pointing the Director at the per-turn loop with `threadKey: "director"` for persistent narrative memory across turns.
- **Lyria 3** (`lyria-3-clip-preview`) — wired in the framework (`tools.runLyriaClip`); used live in [`../pulseblade/`](../pulseblade/). Not yet routed into OMNI-ODYSSEY (scene-side scoring would be a natural addition).
- **Gemini TTS** (`gemini-3.1-flash-tts-preview`) — wired in the framework (`tools.generateTTS`); used in [`../prompt-arena/`](../prompt-arena/) for the sportscaster. Could narrate Odyssey beats as a voiceover — Phase 3.
- **Gemini multimodal Flash** (vision input) — the framework supports this via `tools.runManagedAgent({ imageContext })` and `tools.requestStructured({ imageContext })`; **deliberately not used** here (OMNI-ODYSSEY is generative, not an image-analyzer — see [`../../docs/anti-pattern-defense.md`](../../docs/anti-pattern-defense.md)).

---

## Audience participation — `/conjure`

`GET /conjure` serves the audience-submission page (`display/conjure.html`). The crowd:

1. **Describes a monster** in plain English (≤ 280 chars, optional "your name")
2. The server enqueues it; a single sequential **worker** paints it with Nano Banana (rate-limit-safe)
3. As it appears in the bestiary gallery, the **next available creature is woven into the live OMNI-ODYSSEY adventure** on the next beat — featured as an encounter (befriend / fight / flee, with real consequences)

The bestiary can be **seeded with PROMPT ARENA's 8 trained creatures** (set `SEED_TRAINED=1` env var) — they're "repainted" in the storybook style and treated as encounters alongside audience submissions.

## Pipeline (one line)

**Veo** opening cinematic → **[ Gemini 3.5 Flash narrates a beat → Nano Banana paints it ]** loop, steered by the Neural Band (swipe + pinch), with audience-conjured creatures (Nano Banana) woven in as encounters every other beat.

## Hardware surface

Meta Ray-Ban Display Web App (600×600, `display/index.html`), input via Neural Band (D-pad + pinch); served by `gdk dev` (Node bridge on `:8787` + a Cloudflare quick tunnel). No camera or microphone on the glasses surface (W3C Web App constraints) — all imagery is *generated*, never captured/analyzed.
