# ⚠️ ARCHIVED — see [../../SUBMISSION.md](../../SUBMISSION.md)

> This was the standalone-project pitch from earlier in the day, before Prompt Arena became a bonus example inside the parent framework. The actual hackathon submission is `Gemini Display Kit` — see the repository root `SUBMISSION.md` and `README.md`.

> The rest of this file is preserved for provenance.

---

# PROMPT ARENA — Cerebral Valley / Google I/O Hackathon submission

**Project name:** PROMPT ARENA

**Tagline:** Invent a monster, coach it in plain English, and watch it battle — every creature is trained by its own Gemini managed agent.

**Repo (public):** https://github.com/sidkandan/prompt-arena
**Demo:** local Flask app at `http://localhost:5001` (`.venv/bin/python run_demo.py --serve-only`); 1-minute video per DEMO-RUNBOOK.md.

## What it is
Anyone invents an original monster — a name, an element, four moves — and coaches it in plain English ("stay aggressive, exploit type advantages, heal below 35% HP"). That coaching is the *only* thing that differentiates monsters. Each monster is then handed to its **own Gemini managed agent**, which spins up a **remote Linux sandbox**, reads the type chart, derives a strategy from the coaching, and **writes and runs a self-test battle simulation (code execution)** to tune itself before emitting a **structured JSON strategy**. All monsters then fight in a live single-elimination bracket with generated sprites, an AI sportscaster, and a crowned champion.

> The pitch in one line: plain-English coaching from strangers, compiled by managed agents into self-tested code that competes live.

## Why managed agents (not just an API call)
Every monster is a **managed agent** with its **own persistent remote sandbox**. It doesn't return a single completion — it **executes code** (a self-test simulation) and produces **artifacts** (its strategy + a captured reasoning/tool-call trace we render in the UI). The arena is the legible, fun face of a general pattern: **fleets of individually-steered autonomous agents.**

## Gemini tools used (see TOOLS_USED.md for file:function map)
- **Managed Agents (Antigravity, `interactions.create`)** — one agent per monster, training in a remote sandbox
- **Code Execution** — each agent runs a self-test simulation to tune its strategy
- **Structured Output (JSON)** — strategies emitted in a strict schema
- **Function Calling** — move/simulation tooling exposed to the agent
- **Image Generation (Nano Banana)** — original sprite per monster
- **Text-to-Speech** — live "AI sportscaster" commentary
- **Thinking levels** — strategy-depth control on training calls
- (stretch) **Google Search grounding** for monster lore

## Built 100% during the hackathon (2026-05-23)
Fresh public repo, first commit timestamped at the start of the event. New work this session: the deterministic battle engine + tournament, the managed-agent hatchery (per-monster agents, sandbox self-test, structured strategies, captured traces), the Nano Banana sprite + TTS commentary pipelines, and the live arena UI + audience submission form. Original creatures and elements — **no third-party intellectual property.**

## Team
Sid Kandan (solo). Built with a heterogeneous AI build-swarm (Codex + Gemini Antigravity CLI) orchestrated live.
