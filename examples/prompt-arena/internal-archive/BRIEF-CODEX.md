# BRIEF — Codex (%7): Battle Engine + Arena UI

**PIVOT:** Stop any prior-concept / codebase-explain work. We are building **PROMPT ARENA**: audience-coached **original** monsters, each trained by a Gemini Managed Agent, battling in a live single-elim bracket. Original creatures (no third-party IP).

**Read first:** `./CONTRACTS.md` and `./gamedata.json`. Your interface is fully specified there.

## Your scope — deterministic + UI. Make NO Gemini API calls (stay 100% reliable).
You **own**: `engine/`, `server.py`, `static/`, `templates/`.
You **consume (never write)**: `gamedata.json`, `data/monsters.json`, `data/strategies/<id>.json`, `static/sprites/<id>.png`, `static/audio/`.

## Deliverables
1. **`engine/battle.py`** — deterministic 1v1 battle. Inputs: two monsters + their strategy.json + gamedata. Output: a **battle_log** dict (Schema 3 in CONTRACTS). Implement the EXACT damage formula, effects, and turn rules from `gamedata.battle_rules`. **Seed RNG from `battle_id`** for reproducibility. 24-turn cap, HP% tiebreak.
2. **`engine/tournament.py`** — single-elim bracket over `data/monsters.json` (handle 2..16; pad byes). Writes **`data/tournament.json`** (Schema 4). CLI: `.venv/bin/python -m engine.tournament`.
3. **`server.py`** — RESKIN the existing file. Keep the `genai` client import + `serialize_steps()` (reused for the Hatchery trace panel). Endpoints: `GET /` (arena), `GET /submit` (form page), `POST /api/submit` (assign `m_<slug>` id, validate against Monster schema, append to `data/monsters.json`, dedupe), `GET /api/tournament` (serve `data/tournament.json`), `GET /api/monsters`, `GET /api/hatch_trace/<id>` (serve `data/traces/<id>.json` if present, else 404). Flask on `:5001`.
4. **`templates/index.html` + `static/app.js` + `static/index.css`** — RESKIN the existing dashboard into the **ARENA**:
   - Bracket view (8→4→2→1) that fills in as battles resolve.
   - Battle view per fight: each monster shows its **sprite** (`/static/sprites/<id>.png`; fallback = colored hexagon tinted by element), a big animated **HP bar**, the **move name** + a flashing **"SUPER EFFECTIVE!" / "resisted"** banner, and floating **taunt** bubbles (from `strategy.taunts`). Animate turn-by-turn from the battle_log.
   - **Round 1 = 2×2 grid** of simultaneous battles; **Final = center stage**, slower, dramatic.
   - A side **"HATCHERY"** panel that, given a monster, shows its agent `reasoning` + `self_test` + (if present) trace steps.
   - Dark, high-energy arena theme. **This is the face of the demo — make it look great.** Vanilla JS, no build step.
5. **`static/submit.html`** — mobile-friendly audience form (QR target): name, element (6), pick exactly 4 moves from gamedata, coaching textarea, catchphrase, your name → `POST /api/submit`.

## Run NOW — do not wait on Gemini
Default strategies already exist in `data/strategies/`. Run `.venv/bin/python -m engine.tournament` then `.venv/bin/python server.py` and get the full arena working on defaults immediately. Gemini overwrites strategies with trained ones later; your code must treat `source` as opaque.

Use `.venv/bin/python`. Report to pane **%6** via `send_message(to_pane="%6", ...)` when each deliverable lands or if blocked. **Do not run git — %6 owns commits.**
