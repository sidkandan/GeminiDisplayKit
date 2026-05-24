# Judges' guide — what to look at, in what order

> Welcome. You have ~5 minutes per project. Here's the optimal path
> through this repository.

## If you have 60 seconds

Read [`README.md`](../README.md) front matter (lines 1–25). That's the
pitch and the example table.

## If you have 3 minutes

1. [`README.md`](../README.md) — pitch, install commands, examples table, managed-agent table
2. [`SUBMISSION.md`](../SUBMISSION.md) — the submission form mirror
3. Open [`examples/prompt-arena/data/traces/m_emberton.json`](../examples/prompt-arena/data/traces/m_emberton.json) in your editor and scroll for 15 seconds — that's a real captured managed-agent run including `code_execution_call` and `code_execution_result` steps

## If you have 5 minutes

Add to the above:

4. [`docs/managed-agents.md`](managed-agents.md) — the four agent patterns, with code samples
5. [`templates/adventure/omni.config.mjs`](../templates/adventure/omni.config.mjs) — what a complete game looks like as a 90-line file
6. [`src/tools/managed-agent.mjs`](../src/tools/managed-agent.mjs) — the wrapper that makes managed agents a one-liner

## If you want to audit provenance ("did they really build this today?")

1. [`PROVENANCE.md`](../PROVENANCE.md) — file-by-file ledger
2. `git log --reverse --format='%h %ci %s' | head -20` — confirm timestamps
3. [`docs/built-during-hackathon.md`](built-during-hackathon.md) — companion ledger with more detail

## If you're judging "best USE of managed agents" ($5,000 prize)

This is the strongest claim in the repo. The headline evidence:

1. [`docs/managed-agents.md`](managed-agents.md) — four distinct use patterns: Director, Hatchery, World-balancer, Hint-giver. Each documented with code, each one a one-line `runManagedAgent` call with a `threadKey` for per-surface conversation state.
2. [`examples/prompt-arena/data/traces/m_emberton.json`](../examples/prompt-arena/data/traces/m_emberton.json) — a captured `interaction.steps` array (~105 KB) including `code_execution_call` (the actual Python the agent wrote) and `code_execution_result` (sandbox stdout). **This is the literal "managed agents doing real work" evidence.**
3. [`src/tools/managed-agent.mjs`](../src/tools/managed-agent.mjs) — the wrapper. Note the `threadState` Map that fixes the cross-surface contamination bug that bit the original prototypes (when a single global `lastInteractionId` was used).
4. [`examples/omni-odyssey/omni.config.mjs`](../examples/omni-odyssey/omni.config.mjs) — `POST /director` route shows the Director pattern in 15 lines.
5. [`examples/pulseblade/omni.config.mjs`](../examples/pulseblade/omni.config.mjs) — `tools.runManagedAgent(...).then(...)` shows the World-balancer (non-blocking) pattern.

## If you're worried about anti-patterns ("is this an image analyzer?")

Read [`docs/anti-pattern-defense.md`](anti-pattern-defense.md). It addresses every item on the banned list explicitly.

## How to run any example yourself (5 minutes per example, if you have a key)

```bash
# Clone
git clone https://github.com/sidkandan/GeminiDisplayKit
cd GeminiDisplayKit
npm install

# Pick an example
cd examples/omni-odyssey
cp ../../.env.example .env
# Edit .env: set GEMINI_API_KEY (get one at https://aistudio.google.com/)
npm install
npx gdk dev

# Then either:
#   - Open the bridge URL in a browser to see the HUD locally
#   - Or scan the printed QR with a Pixel, install via Meta AI app, view on glasses
```

## What we want to be judged on

In order of weight:

1. **Live demo (45%):** Watch the 3-minute live walkthrough. The `gdk create → dev → glasses` flow is the hero moment.
2. **Creativity (35%):** No equivalent framework exists for this platform. The framework primitive + the four managed-agent patterns + the QR install flow is novel.
3. **Impact (20%):** Developer-tools have multiplier impact. Meta Display is a brand-new platform; first-mover frameworks tend to define how the platform is built on.

## Rubric mapping

| Criterion | Weight | What you need to see | Our strongest evidence |
|---|---|---|---|
| **Live Demo** | 45% | It runs live and is more than a mockup | `gdk dev` boots bridge + tunnel + QR in <10s in front of you; OMNI-ODYSSEY narrates + paints with audience-conjured monsters; PulseBlade plays on real Meta Display hardware |
| **Creativity** | 35% | Not another chatbot/RAG/image-analyzer | First-of-its-kind framework for Meta Display Web Apps; four distinct managed-agent use patterns (Director, Hatchery with code execution, World-balancer, Hint-giver); audience-conjure mechanic; cross-example monster wire-up (PROMPT ARENA → OMNI-ODYSSEY bestiary) |
| **Impact Potential** | 20% | It can matter after the hackathon | Reusable public Gemini SDK path for Meta Display Web Apps; documented MacBook Pro runbook; templates make next developer's first game a 5-minute task |
| **Best Use of Managed Agents** | $5k bonus | Managed Agents are central and visible | `runManagedAgent` with `threadKey` (fixes cross-surface contamination); captured `code_execution_call` traces at `examples/prompt-arena/data/traces/m_emberton.json`; four patterns documented in `docs/managed-agents.md`; `interactionId` + `environmentId` surfaced as proof |

## What we do NOT want to be judged on

- The PaletteQuest prototype (deliberately not imported — see anti-pattern defense for why)
- The visual polish of Prompt Arena's Flask UI — it's a bonus example, not the headline demo

## Contacting the team

Sid Kandan — **siddharth.kandan@gmail.com** — solo team. Available for
follow-up Q&A or to dig into any specific implementation choice.
