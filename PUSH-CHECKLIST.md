# PUSH-CHECKLIST — for AGY in PANE1

> **Hand-off doc.** This repo is initialized locally, committed cleanly,
> and ready to be pushed to GitHub as a **public** repo for the hackathon
> submission. Sid will dispatch this to AGY (Gemini Antigravity CLI) in
> pane `%1` to perform the final push.

## Pre-push state (as of last local commit)

- Local repo at `/Users/sid/AICLI/Projects/Hackathon/GoogleIO/Gemini3.5FlashDisplays`
- Two commits on `main`:
  - `e7109b1` — Initial commit — Gemini Flash Meta Displays
  - `488a46a` — docs: add 1-minute YouTube demo video link to README + SUBMISSION
- 151 files staged → committed (every text file in the repo)
- `BeatSaberDisplay.mp4` (68 MB) is **gitignored** (`*.mp4` rule); stays on disk locally, not in the repo
- `npm test` passes (10/10) — `node scripts/smoke.mjs`
- `bash scripts/scrub-for-publish.sh` clean — no API keys, no `/Users/*` paths, no tracked `.env`

## Step 1 — Verify locally (AGY: please run all of these and confirm clean)

```bash
cd /Users/sid/AICLI/Projects/Hackathon/GoogleIO/Gemini3.5FlashDisplays

# 1a — Confirm git state
git log --oneline
git status                    # MUST report "nothing to commit, working tree clean"
                              # (BeatSaberDisplay.mp4 should be invisible — gitignored)

# 1b — Confirm scrub
bash scripts/scrub-for-publish.sh
# Expect: "✅ Repository is clean. Safe to push."

# 1c — Confirm smoke
node scripts/smoke.mjs
# Expect: "10 passed, 0 failed"

# 1d — Sanity: nothing sensitive
git ls-files | grep -iE '\.env$|node_modules|\.DS_Store|\.claude/|BeatSaberDisplay' && echo "✗ STOP — sensitive file tracked" || echo "✓ clean"
```

If any of those fail, **STOP and report** to Sid before proceeding.

## Step 2 — Create the public GitHub repo

The repo URL in `package.json` and `README.md` is already set to
`https://github.com/sidkandan/GeminiFlashMetaDisplays` — match that name
exactly so links don't break.

```bash
gh repo create sidkandan/GeminiFlashMetaDisplays \
  --public \
  --description "Gemini-powered SDK + CLI for building games on Meta Ray-Ban Display. Built at the Google I/O Hackathon 2026-05-23." \
  --homepage "https://youtube.com/shorts/6Gl1k9jtep4" \
  --source . \
  --remote origin \
  --push
```

If `gh` isn't authenticated, `gh auth login` first.

If the name is taken (the user previously had a repo named `prompt-arena`
under the same account; this name should be free), pick `GeminiFlashMetaDisplays`
exactly — don't shorten — so the docs links resolve.

## Step 3 — Verify the public repo

```bash
# Should report "PUBLIC"
gh repo view sidkandan/GeminiFlashMetaDisplays --json visibility,url

# Open in browser and visually confirm:
#  - README renders properly
#  - YouTube link at the top works
#  - PROVENANCE.md is at the root
#  - examples/ tree is visible
gh repo view sidkandan/GeminiFlashMetaDisplays --web
```

## Step 4 — Sanity check from a clean clone (recommended)

Confirm a fresh judge clone will work:

```bash
TMPDIR=$(mktemp -d) && cd "$TMPDIR" && \
git clone https://github.com/sidkandan/GeminiFlashMetaDisplays.git && \
cd GeminiFlashMetaDisplays && \
ls -la && \
node bin/gfmd.mjs --version
```

Expected:
- Clone succeeds
- All top-level docs visible (`README.md`, `PROVENANCE.md`, `SUBMISSION.md`, `DEMO-RUNBOOK.md`, `LICENSE`, `NOTICE`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`)
- `examples/` contains `omni-odyssey/`, `pulseblade/`, `prompt-arena/`
- `examples/prompt-arena/data/traces/` contains the 3 captured trace JSON files (the managed-agents prize evidence)
- `node bin/gfmd.mjs --version` prints `0.1.0`

## Step 5 — Submit to the hackathon

After the public repo is live and verified:

1. Go to https://cerebralvalley.ai/e/google-io-hackathon/hackathon/submit
2. Project name: `Gemini Flash Meta Displays`
3. Repository URL: `https://github.com/sidkandan/GeminiFlashMetaDisplays`
4. Demo video URL: `https://youtube.com/shorts/6Gl1k9jtep4`
5. Team: Sid Kandan (solo)
6. Categories: Best Use of Managed Agents (primary), Overall (secondary)

Refer to [`SUBMISSION.md`](SUBMISSION.md) for the full form contents.

## Step 6 — Report back

Once pushed and submitted, **dispatch confirmation back to Sid** via:

```
tmux-comm send_message → target pane Sid is in,
including:
  - Public GitHub URL: https://github.com/sidkandan/GeminiFlashMetaDisplays
  - First commit SHA: e7109b1 (timestamp 2026-05-23, evening)
  - Submission confirmation #: (whatever Cerebral Valley returns)
```

## Things NOT to do

- ❌ Do not amend or rewrite history before pushing — the commit
  timestamps are the hackathon-rules provenance evidence
- ❌ Do not push `BeatSaberDisplay.mp4` (it's gitignored — keep it that way)
- ❌ Do not add anything from `examples/prompt-arena/.env` (the file doesn't
  exist in the repo; only `.env.example` does)
- ❌ Do not change the repo name from `GeminiFlashMetaDisplays` — docs link to it
- ❌ Do not set the repo to private — hackathon rules require public
- ❌ Do not push from a clean clone — push from the **prepared local repo**
  at `/Users/sid/AICLI/Projects/Hackathon/GoogleIO/Gemini3.5FlashDisplays`
  (it already has the curated commits)

## If something goes wrong

Stop and report to Sid in pane the user is working in. Don't try to
"fix it forward" — the submission is high-stakes and a clean push from
this prepared state is more important than speed.

Common failure modes:
- `gh repo create` says the name is taken → ask Sid for the correct name
- `git push` is rejected because the remote already has commits → STOP, do not force-push
- Smoke or scrub reports issues → STOP, surface to Sid

## After successful push

Add this entry to a new commit (so the public repo records the push event):

```bash
# Add a tiny update: in SUBMISSION.md the repo URL line becomes a live link
# (it already says https://github.com/sidkandan/GeminiFlashMetaDisplays — should already be correct)

# Then push the new commit (no-op if no changes)
git push
```

That's it. The repo is then live and submission-ready.
