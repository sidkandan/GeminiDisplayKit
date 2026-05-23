# Contributors

## Team

**Sid Kandan** — solo human contributor.

- GitHub: [@sidkandan](https://github.com/sidkandan)
- Email: siddharth.kandan@gmail.com
- Role at the event: solo team (per hackathon rules allowing solo participation)

## AI build-swarm collaborators

The work in this repository was performed by Sid in collaboration with
three AI agents acting as code collaborators. This is analogous to a solo
developer using GitHub Copilot, Cursor, or an LLM-based pair programmer
— the human owns the design, scope, prompts, and acceptance; the AI
helps draft and refine code.

| Agent | Role |
|---|---|
| **Codex CLI** (OpenAI) | Initial drafts of the Prompt Arena deterministic battle engine + arena UI |
| **Gemini Antigravity CLI** (Google) | Prompt Arena managed-agent hatchery + Imagen sprite pipeline + Gemini TTS pipeline |
| **Claude Opus 4.7** (Anthropic) | Framework refactor (`src/`, `bin/`, `templates/`), repository cleanup, documentation, this submission preparation |

The decision to use a heterogeneous AI build-swarm (rather than a single
AI assistant) was itself part of the experiment: each agent has different
strengths, and orchestrating them is exactly the kind of pattern the
framework is built to support.

## Acknowledgements

- The Google Gemini team for the Managed Agents API, Nano Banana, Lyria 3, Veo, and Gemini Flash
- The Cerebral Valley team for hosting the hackathon
- Meta's Wearables team for the Display Web Apps surface and the published [Webapp AI toolkit](https://github.com/meta-quest/meta-wearables-webapp) + [DAT Android SDK](https://github.com/meta-quest/meta-wearables-dat-android) that document the platform conventions this framework targets

## How to contribute after the hackathon

See [`CONTRIBUTING.md`](CONTRIBUTING.md).
