# Gemini API Tools Map — Prompt Arena

This document maps the Gemini API tools, endpoints, and models used by this codebase to their respective files and functions. It serves as judge-facing evidence for the **Best Use of Managed Agents** prize.

> **Correction note (added during submission cleanup):** The original draft of this table labeled the sprite generator as "Nano Banana." That is technically incorrect — the actual model used here is **Imagen 4** (`imagen-4.0-generate-001`). True Nano Banana is `gemini-3.1-flash-image-preview`, which is used by the parent framework's OMNI-ODYSSEY example for scene painting. The table below has been corrected.

| Gemini Tool / Capability | Endpoint / Model | File · Function | Description |
|---|---|---|---|
| **Managed Agents (Antigravity)** | `client.interactions.create` · Agent `antigravity-preview-05-2026` | `hatchery/hatch.py · train_monster` | Spawns a stateful, Google-hosted remote Linux sandbox per monster for training and tuning. |
| **Code Execution (Sandbox)** | Built-in agent tool | `hatchery/hatch.py · train_monster` | Managed agent writes Python (a tuning script that imports `battle_simulator.py`) and executes it in the sandbox to evaluate win rate. |
| **Structured Output (JSON)** | Schema-instructed prompt + `extract_json` parse | `hatchery/hatch.py · train_monster` | Agent emits the final strategy as JSON matching Schema 2 in `internal-archive/CONTRACTS.md`. |
| **Image Generation (Imagen 4)** | `client.models.generate_images` · Model `imagen-4.0-generate-001` | `tools_sprite.py · generate_sprite` | Dynamically generates an original pixel-art battle sprite for each monster. |
| **Text-to-Speech (TTS)** | `client.models.generate_content` · Model `gemini-3.1-flash-tts-preview` · Voice `Charon` | `tools_tts.py · generate_tts_file` | Generates the AI sportscaster: round intros + per-champion call. |
| **Thinking Level Control** | Model parameter | `hatchery/hatch.py` | Configures reasoning depth on training calls. |

## Where the "managed agents" claim is strongest

The captured `interaction.steps` for the three fully-trained monsters live at:

- `data/traces/m_aqualisk.json` (~50 KB)
- `data/traces/m_cindermaw.json` (~55 KB)
- `data/traces/m_emberton.json` (~105 KB)

Each trace contains the full agent loop including `function_call` / `function_result` steps (file reads, `list_files`), **`code_execution_call` steps with the actual Python the agent wrote**, and `code_execution_result` steps with sandbox stdout.

## Tools the parent framework also uses

The parent framework (`gdk`) wires several additional Gemini surfaces not exercised by Prompt Arena specifically:

- **Nano Banana (`gemini-3.1-flash-image-preview`)** — scene generation in OMNI-ODYSSEY (see `../omni-odyssey/`)
- **Veo (`veo-3.1-fast-generate-preview`)** — cinematic intros (see `../../src/tools/veo.mjs`)
- **Lyria 3 (`lyria-3-clip-preview`)** — backing tracks in PulseBlade (see `../pulseblade/`)
- **Flash structured output (`gemini-flash-latest`)** — level designer in PulseBlade
- **Multimodal Flash** — image-grounded hint giver pattern (see `../../docs/managed-agents.md` Pattern 4)
