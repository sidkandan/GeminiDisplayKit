# BRIEF — Gemini AGY (%8): The Hatchery + "ALL Gemini Tools" Showcase

**PIVOT:** Earlier brainstorm concepts are off the table. New project: **PROMPT ARENA** — each monster is trained by its **own Gemini Managed Agent**, then battles in a bracket. Your work is the AI core; **this is what wins the Managed Agents prize.**

**Read first:** `./CONTRACTS.md` and `./gamedata.json`.
**Salvage:** the current `server.py` already has a working Interactions API call + `serialize_steps()` — reuse that exact pattern.
**Env:** `GEMINI_API_KEY` is in `.env` and the shell. Use **`.venv/bin/python`** (has `google-genai 2.6.0`).

## Your scope
You **own**: `hatchery/` (`hatch.py`, `.agents/AGENTS.md`, `.agents/skills/battle-tactician/SKILL.md`), `tools_sprite.py`, `tools_tts.py`, `TOOLS_USED.md`.
You **write**: `data/strategies/<id>.json` (trained), `data/traces/<id>.json` (captured steps), `static/sprites/<id>.png`, `static/audio/*.mp3`.
You **consume**: `gamedata.json`, `data/monsters.json`.

## Step 0 — prove the key works FIRST
Run one tiny `client.interactions.create(agent="antigravity-preview-05-2026", input="reply OK", environment="remote")`. Print the env id + output. Report success/failure to **%6** immediately. If the managed-agents API is unavailable, say so — we keep default strategies as the fallback and you focus on sprites/TTS.

## Deliverables — use the RECOMMENDED Gemini tools (breadth is the point)
1. **`hatchery/hatch.py`** — for each monster in `data/monsters.json`:
   - Build a per-monster **`.agents/AGENTS.md`** from its `coaching` + the battle rules, and a **`.agents/skills/battle-tactician/SKILL.md`**.
   - Create/run a **MANAGED AGENT** (`agent="antigravity-preview-05-2026"`, `environment="remote"`). Instruct it, **in its sandbox**, to: (a) take the type chart + moves from `gamedata.json` (pass inline), (b) derive a strategy from its coaching, (c) **write Python and RUN a self-test simulation (code execution)** of that strategy vs a random opponent over ~10 trials and tune it, (d) emit the final strategy as **structured JSON exactly matching Schema 2** (include `self_test` results + `reasoning`, `source:"managed_agent"`).
   - Pull the strategy + capture `interaction.steps` → `data/strategies/<id>.json` and `data/traces/<id>.json`.
   - Run monsters **in parallel** (thread pool). Per-monster `try/except`: on any failure, **leave the existing default strategy untouched**. CLI: `--all`, `--id <id>`.
   - Tools hit here: **Managed Agents + Code Execution + Structured Output** (+ **Function Calling** if you expose a `simulate(move, opponent)` tool to the agent — encouraged).
2. **`tools_sprite.py`** — generate an **original** sprite per monster from name + element via Gemini **image generation (Nano Banana)**. Save `static/sprites/<id>.png` (square; simple/transparent bg). Tool: **Image Generation**.
3. **`tools_tts.py`** — generate short **"AI sportscaster"** commentary lines (round intros + a champion call) via Gemini **TTS**. Save to `static/audio/`. Tool: **Text-to-Speech**.
4. **(stretch)** monster lore via **Google Search grounding**; speak-your-monster via **Live API**.
5. **`TOOLS_USED.md`** — a table mapping each Gemini tool/endpoint → `file:function` where it's used. Judge-facing evidence for the prize. Keep it accurate.

## Rules
- `strategy.json` MUST validate against Schema 2 (Codex's engine reads it). Set `"source":"managed_agent"`.
- Use `thinking_level` deliberately (e.g. medium/high for training) and note it in TOOLS_USED.md.
- Report to pane **%6** via `send_message(to_pane="%6", ...)` on Step-0 result, first trained monster, and completion/blockers. **Do not run git — %6 owns commits.**
