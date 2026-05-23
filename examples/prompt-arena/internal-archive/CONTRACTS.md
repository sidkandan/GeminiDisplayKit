# PROMPT ARENA — Shared Contracts (SINGLE SOURCE OF TRUTH)

Two builders work in parallel against this interface and must not collide:
- **Codex (%7)** — deterministic engine + Arena UI. Owns: `engine/`, `server.py`, `static/`, `templates/`. NO Gemini API calls.
- **Gemini AGY (%8)** — the Hatchery + Gemini-tools showcase. Owns: `hatchery/`, `tools_sprite.py`, `tools_tts.py`, `TOOLS_USED.md`, `.agents/`.
- **Opus (%6)** — owns this file, `gamedata.json`, `data/monsters.json`, `git`, integration (`run_demo.py`), README, demo.

Concept: audience invents an **original** monster (name + element + 4 moves + plain-English coaching). Each monster is trained by its **own Gemini Managed Agent** in a sandbox (self-tests via code execution), then they battle in a single-elim bracket. Original creatures only — **no third-party IP**.

## Data flow (one writer per artifact)
```
data/monsters.json ──► hatchery/hatch.py (Gemini: managed agent + sandbox self-test)
                           │
                           ├─► data/strategies/<id>.json   (trained; default fallback pre-seeded by Opus)
                           ├─► data/traces/<id>.json        (captured interaction.steps for the UI montage)
                           ├─► static/sprites/<id>.png      (Nano Banana image gen)
                           └─► static/audio/*.mp3           (TTS commentary)
                           │
data/monsters.json + data/strategies/* ──► engine/tournament.py (Codex) ──► data/tournament.json
                                                                                │
                                                  server.py + static/ + templates/ (Codex) animates it
```
**Decoupling rule:** the engine/UI run on whatever strategies exist. Default strategies are pre-generated, so Codex never waits on Gemini. Gemini overwrites them with `source:"managed_agent"`.

## Schema 1 — Monster (`data/monsters.json` → `{"monsters":[...]}`; also the POST /api/submit body)
```json
{"id":"m_aqualisk","name":"Aqualisk","element":"aqua",
 "moves":["tidal_crush","aqua_jet","focus","mend"],
 "coaching":"Aggressive type-hunter. Open strongest super-effective move...",
 "catchphrase":"Ride the tide!","coach_name":"Sid"}
```
- `element` ∈ gamedata.elements. `moves` = exactly 4 ids from gamedata.moves. `id` = `m_<slug(name)>` (server assigns on submit; dedupe).

## Schema 2 — Strategy (`data/strategies/<id>.json`) — Gemini writes, Codex reads
```json
{"id":"m_aqualisk","name":"Aqualisk","element":"aqua",
 "opening_move":"tidal_crush",
 "move_weights":{"tidal_crush":1.0,"aqua_jet":0.7,"focus":0.5,"mend":0.4},
 "switch_to_defense_below":0.35,
 "defense_move":"mend",
 "aggression":0.85,
 "prefer_super_effective":true,
 "taunts":{"open":"Ride the tide!","super_effective":"Down you go!","low_hp":"Not done!","win":"Flawless."},
 "self_test":{"trials":10,"wins":7},
 "reasoning":"Coaching emphasizes aggression + type advantage; weights favor high-power super-effective moves...",
 "source":"managed_agent"}
```
- Engine move-choice each turn (deterministic, seeded): if `hp% < switch_to_defense_below` and `defense_move` available → use it; else among legal moves pick by `move_weights`, boosted when `prefer_super_effective` and the move is super-effective vs the current opponent; `aggression` biases toward high-power. Ties broken by seeded RNG. `opening_move` used turn 1 if legal.
- `taunts` shown in the UI. `self_test`/`reasoning` shown in the Hatchery panel (proof the agent trained).

## Schema 3 — Battle log (one per battle; array inside `data/tournament.json`) — Codex writes
```json
{"battle_id":"b_semi_1","round":"Semifinal","seed":12345,
 "a":{"id":"m_aqualisk","name":"Aqualisk","element":"aqua"},
 "b":{"id":"m_cindermaw","name":"Cindermaw","element":"pyro"},
 "turns":[
   {"n":1,"actor":"a","move":"tidal_crush","element":"aqua","target":"b",
    "raw":80,"type_mult":2.0,"damage":154,"effectiveness":"super",
    "a_hp":100,"b_hp":0,"taunt":"Down you go!","note":""}
 ],
 "winner":"a","mvp_move":"tidal_crush"}
```
- `effectiveness` ∈ {"super"(≥2),"normal"(1),"resisted"(≤0.5),"heal","buff"}.

## Schema 4 — Tournament (`data/tournament.json`) — Codex writes
```json
{"created":"<iso>","bracket":[["m_a","m_b"],["m_c","m_d"]],
 "battles":[ <battle_log>, ... ],
 "rounds":{"Quarterfinal":[...ids...],"Semifinal":[...],"Final":[...]},
 "champion":{"id":"m_aqualisk","name":"Aqualisk","coach_name":"Sid"}}
```

## Battle math — implement EXACTLY from `gamedata.json` → `battle_rules`
HP 100. `type_mult = type_chart[move.element][defender.element]` (neutral move = 1.0).
`damage = round(power * type_mult * jitter * focus_mult)` then `* 0.5` if defender bulwark active.
`jitter` = seeded uniform(0.88,1.0). Effects: heal_30, defense_up (one-shot 0.5x next incoming), attack_up (one-shot 1.5x next attack), recoil_10. Turn cap 24 → higher HP% wins, then seeded coin. **RNG seeded from `battle_id`** so every battle is reproducible (critical: the on-stage demo replays a known-good `tournament.json`).

## "ALL Gemini tools" — required coverage (Gemini %8 → document in TOOLS_USED.md)
| Tool | Where |
|---|---|
| Managed Agents (Antigravity, `interactions.create`) | one agent per monster trains in a remote sandbox |
| Code Execution | agent writes+runs a self-test battle sim to tune its strategy |
| Structured Output (JSON) | strategy.json emitted by the agent |
| Function Calling | (recommended) expose a `simulate(move,opp)` tool to the agent |
| Image Generation (Nano Banana) | monster sprites → static/sprites/<id>.png |
| Text-to-Speech | live "AI sportscaster" commentary → static/audio/ |
| Google Search grounding | (stretch) monster lore/bio |
| Live API (voice) | (stretch) speak-your-monster input |
| Thinking levels | strategy depth control on the training call |

## Coordination
- Report progress with `send_message(to_pane="%6", ...)` on first success + completion + any blocker. **Do not run git — %6 owns commits.**
- Use `.venv/bin/python` (has google-genai 2.6.0). Key is in `.env` (gitignored) and the shell env.
