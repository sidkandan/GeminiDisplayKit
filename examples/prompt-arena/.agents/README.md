# `.agents/` — populated at training time

This directory is **populated per-monster at training time** by
`hatchery/hatch.py`. Each run writes:

- `AGENTS.md` — the system instructions sent to the managed agent for the current monster
- `skills/battle-tactician/SKILL.md` — the skill description and example tuning script

These files are overwritten per monster. The on-disk copy will reflect
**whichever monster was trained last**.

The agent itself receives per-monster content via the inline `env_config`
sources in `hatchery/hatch.py:train_monster` — what's on disk locally is
informational only.
