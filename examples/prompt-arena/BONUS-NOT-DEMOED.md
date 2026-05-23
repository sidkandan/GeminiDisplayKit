# PROMPT ARENA — bonus example, NOT part of the live demo

> Why it's here: this is the strongest **managed-agent + code-execution** proof
> in the whole submission. The live demo spotlights OMNI-ODYSSEY and PulseBlade
> for time reasons, but judges digging into the "best USE of managed agents"
> prize claim should open this folder.

## What it is

8 audience-coachable monsters, each trained by its **own Gemini managed
agent** that **writes Python and runs it in a remote Linux sandbox** to
self-test a strategy. Then they fight in a single-elimination bracket
with sprites, AI sportscaster TTS, and a crowned champion.

All original creatures, original elements, original moves — no
third-party IP.

## Why it's the strongest managed-agent proof

Open `data/traces/m_emberton.json` (105KB of captured `interaction.steps`).
You'll see:

- `function_call` / `function_result` steps for `read_file`, `list_files`,
  `write_file`
- **`code_execution_call` steps** with the actual Python the agent wrote
  to test its strategy
- **`code_execution_result` steps** with the sandbox's stdout
- `thought` steps showing the agent reasoning over the results

This is server-side, persistent-state, code-executing agents — not one
completion. The trace is real and captured.

## Status (honest)

| Monster | Strategy source | Self-test wins | Trace captured |
|---|---|---|---|
| m_aqualisk | managed_agent | 6/10 | ✓ |
| m_cindermaw | managed_agent | 6/10 | ✓ |
| m_emberton | managed_agent | 6/10 | ✓ |
| m_gravelorn | default | 0/0 | — |
| m_quartzion | default | 0/0 | — |
| m_thornback | default | 0/0 | — |
| m_voltaic | default | 0/0 | — |
| m_zephyrus | default | 0/0 | — |

3 of 8 fully trained at submission time. The bracket runs to completion
regardless (defaults are deterministic heuristics).

## Run it (if you want to)

```bash
cd examples/prompt-arena
cp ../../.env.example .env       # set GEMINI_API_KEY
.venv/bin/python tools/make_defaults.py        # seed default strategies
.venv/bin/python -m engine.tournament          # build the bracket
.venv/bin/python server.py                     # arena UI at http://localhost:5001
```

To re-train the 5 remaining monsters:

```bash
.venv/bin/python hatchery/hatch.py --all --workers 3
```

## How this relates to the framework

This example **does NOT yet depend on `gemini-flash-meta-displays`** — it's a
Python project that predates the framework refactor. It runs standalone via
its own Flask server. The framework's role here is as a doc + provenance
anchor: this is the project that proved the **Hatchery** pattern documented
in `../../docs/managed-agents.md#pattern-2--hatchery-per-entity-with-code-execution`.

A future refactor (Phase 3) would have `omni.config.mjs` shell out to the
Python engine via a child process and proxy its routes through the
framework's bridge. Not required for the hackathon submission.

## Provenance

All Python, all sprites, all TTS audio, all monster designs — authored on
2026-05-23 during the hackathon. See the included `SUBMISSION.md` and
`DEMO-RUNBOOK.md` for the original project's standalone submission shape.
