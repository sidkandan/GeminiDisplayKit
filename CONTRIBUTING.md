# Contributing to Gemini Display Kit

Thanks for your interest. This project was built at a 24-hour hackathon
and is genuinely early — a lot of things are stubs or "Phase 3 — coming."
Contributions are welcome.

## Quick start for contributors

```bash
git clone https://github.com/sidkandan/GeminiDisplayKit
cd GeminiDisplayKit
npm install
cp .env.example .env       # set GEMINI_API_KEY

# Test the CLI works
node bin/gdk.mjs --help

# Run the framework smoke test
npm test
```

## Phase 3 wishlist (good first issues)

Each of these is a contained piece of work that would meaningfully
improve the framework:

- **`templates/rhythm/`** — extract the PulseBlade example into a reusable template
- **`templates/quest/`** — extract the Director + scavenger pattern into a reusable template
- **`templates/arena/`** — wrap Prompt Arena's Python engine via an `omni.config.mjs` that shells out
- **Refactor `examples/prompt-arena/` to depend on the framework** — see `examples/prompt-arena/BONUS-NOT-DEMOED.md`
- **`gdk capture --source dat|pixel|file`** — currently a stub; needs to shell out to operator-gated capture scripts
- **Unit tests for the bridge router** — `src/bridge/server.mjs` route matching has no test coverage
- **Hot-reload for `display/` files in `gdk dev`** — currently a manual refresh
- **TypeScript types** — JSDoc is in place but a `.d.ts` would be nice

## Project structure

See [`docs/architecture.md`](docs/architecture.md) for the full design.

```
src/
├── bridge/    HTTP + SSE + static + per-game routes
├── tools/     Wrappers for every Gemini surface used in glasses games
├── display/   Drop-in CSS/JS for the 600×600 HUD
├── commands/  One file per CLI subcommand
├── utils/     QR + tunnel helpers
├── cli.mjs    Dispatch + flag parser
└── index.mjs  Public SDK surface
```

## Pull request checklist

- [ ] Adds or updates docs in `docs/` if the change is user-facing
- [ ] Does not introduce any new dependencies without discussion
- [ ] Does not commit `.env`, `node_modules/`, `.venv/`, or any API keys
- [ ] Runs `bash scripts/scrub-for-publish.sh` clean (no API keys, no `/Users/` paths)
- [ ] `npm test` passes
- [ ] Updates `PROVENANCE.md` if you've added new files
- [ ] Adds yourself to `CONTRIBUTORS.md` if this is your first PR

## Code style

- Plain `.mjs` modules with JSDoc types
- No bundler, no transpiler
- Match the surrounding code's comment density and naming
- One concept per file; small files preferred

## Communication

Open a GitHub issue for any non-trivial change before sending a PR. We can
align on scope first, save you time.

## License

By contributing, you agree your contributions will be licensed under the
project's [MIT License](LICENSE).
