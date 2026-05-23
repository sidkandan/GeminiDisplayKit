# Examples

Three games built with [Gemini Display Kit](../README.md) — each
demonstrates a different slice of the framework + a different
managed-agent pattern.

| Example | Demo role | Template | Headline agent pattern | Imported |
|---|---|---|---|---|
| [`omni-odyssey/`](omni-odyssey/) | **Lead live demo** | `adventure` | Director (mid-game choice re-imagination) | ✓ depends on framework |
| [`pulseblade/`](pulseblade/) | **Second live demo** | `rhythm` (Phase 3 template) | World-balancer (non-blocking director note) | ✓ depends on framework |
| [`prompt-arena/`](prompt-arena/) | **Bonus — not in live demo** | `arena` (Phase 3 template) | **Hatchery (code execution sandbox per entity)** | standalone (Python; not yet refactored) |

## Why three?

**OMNI-ODYSSEY + PulseBlade share the bridge / SSE / display SDK / tunnel /
QR** — that's the framework pitch in two demos. They use *different* Gemini
surfaces (Nano Banana vs. Lyria), *different* mechanics (choice-based vs.
rhythm-based), *different* managed-agent patterns (Director vs.
World-balancer). The fact that both fit in one CLI is the moat.

**PROMPT ARENA is the code-execution proof.** Open
[`prompt-arena/data/traces/m_emberton.json`](prompt-arena/data/traces/) and
scroll: real `code_execution_call` steps showing the Python the managed
agent wrote in its sandbox to tune its battle strategy, plus the
`code_execution_result` steps showing the stdout. That's the strongest
single evidence in the repo for "best USE of managed agents."

## How each example is structured

For Odyssey + PulseBlade (framework-dependent):

```
examples/<game>/
├── omni.config.mjs       # game definition (routes, display, onStart)
├── package.json          # depends on "gemini-display-kit": "file:../.."
├── display/              # 600×600 HUD
├── .env.example
└── README.md
```

For Prompt Arena (standalone Python, predates framework):

```
examples/prompt-arena/
├── BONUS-NOT-DEMOED.md   # why it's here, what it proves
├── engine/, hatchery/, tools/    # Python
├── server.py             # Flask UI on :5001
├── data/                 # monsters, strategies, captured traces
└── static/, templates/   # vanilla JS arena UI
```

## Run any of them

```bash
cd examples/<game>
cp ../../.env.example .env       # set GEMINI_API_KEY
npm install                       # (or .venv setup for prompt-arena)
gdk dev                          # (or .venv/bin/python server.py for prompt-arena)
```

See each `<game>/README.md` for specifics.
