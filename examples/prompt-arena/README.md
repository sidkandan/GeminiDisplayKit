# PROMPT ARENA

> **📌 This is a bonus example inside [Gemini Flash Meta Displays](../../README.md).**
> Not part of the live hackathon demo. See [`BONUS-NOT-DEMOED.md`](./BONUS-NOT-DEMOED.md) for why it's in the repo.

**Built live at the Google I/O Hackathon (Cerebral Valley) — 2026-05-23. 100% new work, written during the event.**

Invent an **original** monster and coach it in plain English. Each monster is trained by its **own Gemini Managed Agent** in a remote Linux sandbox — the agent reads the type chart, derives a strategy from your coaching, and **writes and runs a self-test battle simulation (code execution)** to tune itself, then emits a structured strategy. All monsters then fight in a live single-elimination bracket with sprites, an AI sportscaster, and a champion crowned at the end.

> Plain-English coaching from strangers, compiled by managed agents into self-tested strategies that compete live.

## Gemini tools used (corrected)

Managed Agents (Antigravity) · Code Execution · Structured Output (JSON) · **Image Generation via Imagen 4** (originally mislabeled as Nano Banana; see [`TOOLS_USED.md`](./TOOLS_USED.md) for the correction) · Text-to-Speech (live commentary) · Thinking levels.

Full map in [`TOOLS_USED.md`](./TOOLS_USED.md).

## Run

```bash
.venv/bin/python tools/make_defaults.py        # seed fallback strategies
.venv/bin/python hatchery/hatch.py --all       # train monsters via managed agents (overwrites strategies)
.venv/bin/python -m engine.tournament          # run the bracket -> data/tournament.json
.venv/bin/python server.py                     # arena UI at http://localhost:5001
```

Original creatures and elements — no third-party intellectual property is used.

## Where the managed-agents prize evidence lives

Open any of these three files and scroll to see real captured `interaction.steps` arrays including `code_execution_call` (with the actual Python the agent wrote) and `code_execution_result` (with the sandbox stdout):

- [`data/traces/m_aqualisk.json`](./data/traces/m_aqualisk.json) (~50 KB)
- [`data/traces/m_cindermaw.json`](./data/traces/m_cindermaw.json) (~55 KB)
- [`data/traces/m_emberton.json`](./data/traces/m_emberton.json) (~105 KB)

## Honest training status

3 of 8 monsters are fully trained by managed agents (the three with traces above). The other 5 fall back to heuristic default strategies — the bracket runs to completion regardless. See [`BONUS-NOT-DEMOED.md`](./BONUS-NOT-DEMOED.md) for the full table and the trade-off discussion.

## Historical project docs

The legacy standalone-project docs live in [`internal-archive/`](./internal-archive/) — these were AI-coordination briefs (Codex + Gemini Antigravity) from when this was a separate single-project hackathon attempt earlier today, before the pivot to the framework approach.
