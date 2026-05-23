# PUSH-CHECKLIST — for AGY in PANE1

> **Hand-off doc.** This repo is initialized locally, committed cleanly,
> and ready to be pushed to GitHub as a **public** repo for the hackathon
> submission. Sid will dispatch this to AGY (Gemini Antigravity CLI) in
> pane `%1` to perform the final push.
>
> **Setup:** Sid will give AGY the absolute path to the prepared repo via
> chat. Set `REPO_DIR=<that path>` before running the commands below,
> or `cd` there first and use `.` for any path reference.

---

## ⭐ Step 0 — PICK A CREATIVE REPO NAME

**Sid's directive:** The GitHub repo name should be **creative and involve all three concepts**:

1. **Gemini Flash** (the model family that powers fast generation)
2. **Managed Agents** (the headline new Gemini capability)
3. **Heads-Up Display (HUD)** (the Meta Ray-Ban Display surface we target)

Internal placeholder is `GeminiDisplayKit`. **You decide the final name.** Pick something memorable, short, pronounceable. The repo URL will be `https://github.com/sidkandan/<YOUR-NAME>`.

Brainstorming seeds (you can riff on these or invent fresh):

- `AgentLens` · `AgentHUD` · `AgentFlash`
- `FlashHUD` · `FlashLens` · `FlashGlass`
- `HUDFleet` · `HUDForge` · `HUDCanvas`
- `OmniLens` · `OmniHUD` · `OmniAgent`
- `BlinkAgent` · `Flicker` · `Glimpse`
- something using "Specs," "Frame," "Lens," "Eyeline," "Glint," "Aurora"

After choosing:

```bash
# Replace the URL in docs that reference the GitHub repo
NAME="<your-chosen-name>"   # e.g., NAME="AgentLens"
cd $REPO_DIR

# Update README.md, SUBMISSION.md, SUBMISSION-FORM.md, package.json, PUSH-CHECKLIST.md
sed -i '' "s|sidkandan/GeminiDisplayKit|sidkandan/$NAME|g" \
  README.md SUBMISSION.md SUBMISSION-FORM.md package.json PUSH-CHECKLIST.md \
  examples/omni-odyssey/README.md examples/pulseblade/README.md \
  templates/adventure/README.md examples/prompt-arena/README.md \
  docs/*.md CONTRIBUTORS.md CONTRIBUTING.md

# Verify nothing missed
grep -rE 'GeminiDisplayKit' --exclude-dir=node_modules --exclude-dir=.git . | head

# Optional: also rename the npm package name (low-impact since we use it via file:// locally)
# Leave `gdk` as the CLI binary name regardless.

# Commit the rename
git add -A
git commit -m "chore: pick public repo name — $NAME"
```

If you want to keep `gemini-display-kit` as the npm package name and just use the new name as the GitHub repo URL, that's also fine — the npm name doesn't have to match the GitHub repo.

---

## Pre-push state (as of last local commit)

- Local repo at `$REPO_DIR`
- 6+ commits on `main` (check with `git log --oneline`)
- First commit `e7109b1` is the bootstrap with everything; subsequent commits are doc updates + mini-sync + this rename
- `BeatSaberDisplay.mp4` (68 MB) is **gitignored** (`*.mp4` rule); stays on disk locally, not in the repo
- `npm test` passes (10/10) — `node scripts/smoke.mjs`
- `bash scripts/scrub-for-publish.sh` clean — no API keys, no `/Users/*` paths, no tracked `.env`

## Step 1 — Verify locally (AGY: please run all of these and confirm clean)

```bash
cd $REPO_DIR

# 1a — Confirm git state
git log --oneline
git status                    # MUST report "nothing to commit, working tree clean"

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

```bash
NAME="<your-chosen-name>"   # the one from Step 0

gh repo create sidkandan/$NAME \
  --public \
  --description "A Gemini-powered SDK + CLI for building managed-agent games on Meta Ray-Ban Display HUDs. Built at the Google I/O Hackathon 2026-05-23." \
  --homepage "https://youtube.com/shorts/6Gl1k9jtep4" \
  --source . \
  --remote origin \
  --push
```

If `gh` isn't authenticated, `gh auth login` first.

If the name is taken, pick the next-best one and update the docs sed pass.

## Step 3 — Verify the public repo

```bash
# Should report "PUBLIC"
gh repo view sidkandan/$NAME --json visibility,url

# Open in browser and visually confirm:
#  - README renders properly
#  - YouTube link at the top works
#  - PROVENANCE.md is at the root
#  - SUBMISSION-FORM.md has the form-ready text
#  - examples/ tree is visible
gh repo view sidkandan/$NAME --web
```

## Step 4 — Sanity check from a clean clone (recommended)

```bash
TMPDIR=$(mktemp -d) && cd "$TMPDIR" && \
git clone https://github.com/sidkandan/$NAME.git && \
cd $NAME && \
ls -la && \
node bin/gdk.mjs --version
```

Expected:
- Clone succeeds
- All top-level docs visible
- `examples/` contains `omni-odyssey/`, `pulseblade/`, `prompt-arena/`
- `examples/prompt-arena/data/traces/` contains the 3 captured trace JSON files (the managed-agents prize evidence)
- `node bin/gdk.mjs --version` prints `0.1.0`

## Step 5 — Submit to the hackathon

After the public repo is live and verified:

1. Go to https://cerebralvalley.ai/e/google-io-hackathon/hackathon/submit
2. **Use the field-ready text in [`SUBMISSION-FORM.md`](SUBMISSION-FORM.md) — copy-paste each section verbatim.**
3. Project name: from your Step 0 choice
4. Repository URL: `https://github.com/sidkandan/$NAME`
5. Demo video URL: `https://youtube.com/shorts/6Gl1k9jtep4`
6. Team: Sid Kandan (solo)
7. Categories: Best Use of Managed Agents (primary), Overall (secondary)

The submission form likely has fields for:
- Project name ← from your Step 0
- One-sentence pitch ← `SUBMISSION-FORM.md` "One-sentence pitch"
- Project description (short/long) ← `SUBMISSION-FORM.md` short/long versions
- "Does your project use managed agents?" ← `SUBMISSION-FORM.md` has the full answer
- "What did you build during the hackathon?" ← `SUBMISSION-FORM.md` has it
- Repo URL + demo video URL

## Step 6 — Report back

Once pushed and submitted, **send a reply via tmux-comm** to whichever pane Sid is in, including:

```
- ✅ Repo created: https://github.com/sidkandan/<name>
- ✅ Public: confirmed via `gh repo view --json visibility`
- ✅ Clean clone test: passed
- ✅ Submitted at: <Cerebral Valley confirmation timestamp>
- 📺 Demo video link: https://youtube.com/shorts/6Gl1k9jtep4
- 🪪 First commit SHA: e7109b1 (timestamp 2026-05-23)
- 🎯 Chosen creative name: <NAME> — short rationale
```

## Things NOT to do

- ❌ Do not amend or rewrite history before pushing — commit timestamps are the hackathon-rules provenance evidence
- ❌ Do not push `BeatSaberDisplay.mp4` (it's gitignored — keep it that way)
- ❌ Do not add anything from any `.env` (no `.env` files should exist in the repo; only `.env.example`)
- ❌ Do not set the repo to private — hackathon rules require public
- ❌ Do not push from a clean clone — push from the **prepared local repo** at `$REPO_DIR` (it has the curated commits)
- ❌ Do not skip the Step 0 rename — the URLs in the docs need to match the actual GitHub URL

## If something goes wrong

Stop and report to Sid via tmux-comm. Don't try to "fix it forward" — the submission is high-stakes and a clean push from this prepared state is more important than speed.

Common failure modes:
- `gh repo create` says the name is taken → pick another, redo the sed rename
- `git push` is rejected because the remote already has commits → STOP, do not force-push
- Smoke or scrub reports issues → STOP, surface to Sid

## After successful push (optional polish)

If you've time, one final commit with the canonical repo URL fully baked in:

```bash
git add -A && git commit -m "docs: lock in canonical repo URL post-push" --allow-empty
git push
```
