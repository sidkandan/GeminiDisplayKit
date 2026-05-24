#!/usr/bin/env bash
# scrub-for-publish.sh — pre-push safety scan.
#
# Run this BEFORE pushing the repo public. Exits non-zero (and prints what
# it found) if any of the following are present:
#   - API keys (Google AIza*, Anthropic sk-ant-*, OpenAI sk-*, AWS AKIA*,
#     GitHub PATs, Slack tokens, Stripe sk_/pk_)
#   - JWT-shaped tokens, Bearer auth headers, SSH/PEM private keys
#   - Hardcoded /Users/<anything> paths
#   - Tracked .env files / node_modules / OS junk / .claude/ state
#
# Usage:  bash scripts/scrub-for-publish.sh
#         (or:  npm run scrub)
#
# Exit codes:
#   0  clean
#   1  found something — DO NOT PUSH

set -uo pipefail
cd "$(dirname "$0")/.."

found=0

heading() {
  printf "\n=== %s ===\n" "$1"
}

# Shared content-scan helper. All file scans use the same exclusions so the
# script never lights up on something inside node_modules / .venv / .git.
scan_pattern() {
  local label="$1"
  local pattern="$2"
  heading "$label"
  local hits
  hits=$(grep -rIE "$pattern" \
    --exclude-dir=node_modules \
    --exclude-dir=.venv \
    --exclude-dir=.git \
    --exclude-dir=__pycache__ \
    --exclude='scrub-for-publish.sh' \
    . 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "$hits"
    found=1
  else
    echo "clean ✓"
  fi
}

# 1. Google AIza keys
scan_pattern "1. Google API keys (AIza* pattern)" 'AIza[0-9A-Za-z_-]{30,}'

# 1a. Anthropic keys
scan_pattern "1a. Anthropic keys (sk-ant-*)" 'sk-ant-[A-Za-z0-9_-]{30,}'

# 1b. OpenAI / generic sk- keys
scan_pattern "1b. OpenAI / sk-* keys" 'sk-(proj-)?[A-Za-z0-9]{30,}'

# 1c. AWS access keys
scan_pattern "1c. AWS access keys (AKIA*)" 'AKIA[0-9A-Z]{16}'

# 1d. GitHub personal access tokens
scan_pattern "1d. GitHub PATs (gh[pousr]_*)" 'gh[pousr]_[A-Za-z0-9]{36,}'

# 1e. Slack tokens
scan_pattern "1e. Slack tokens (xox[baprs]-*)" 'xox[baprs]-[A-Za-z0-9-]{10,}'

# 1f. Stripe keys
scan_pattern "1f. Stripe keys (sk_/pk_ live/test)" '(sk|pk)_(live|test)_[A-Za-z0-9]{20,}'

# 1g. JWT shape (three base64 segments separated by '.')
scan_pattern "1g. JWT-shaped tokens (eyJ*.eyJ*.*)" 'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}'

# 1h. SSH / PEM private keys
scan_pattern "1h. SSH/PEM private keys" 'BEGIN (OPENSSH |RSA |EC |DSA )?PRIVATE KEY'

# 1i. Authorization Bearer tokens
scan_pattern "1i. Bearer tokens" 'Bearer [A-Za-z0-9_./+=-]{20,}'

# 2. /Users/* paths
scan_pattern "2. Hardcoded /Users/* paths" '/Users/[a-zA-Z]+/'

# 3. .env files (tracked vs gitignored)
heading "3. .env files in git ls-files"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E '(^|/)\.env$' || true)
  if [[ -n "$tracked" ]]; then
    echo "$tracked"
    found=1
  else
    echo "no .env files tracked ✓"
  fi
else
  echo "(not a git repo yet — run after git init)"
fi

# 4. node_modules in tracked files
heading "4. node_modules in git ls-files"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E 'node_modules/' || true)
  if [[ -n "$tracked" ]]; then
    echo "$tracked" | head -10
    found=1
  else
    echo "no node_modules tracked ✓"
  fi
else
  echo "(not a git repo yet)"
fi

# 5. .DS_Store / OS junk
heading "5. .DS_Store / OS junk files in git ls-files"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E '\.(DS_Store|Trashes)$|Thumbs\.db' || true)
  if [[ -n "$tracked" ]]; then
    echo "$tracked"
    found=1
  else
    echo "no OS junk tracked ✓"
  fi
fi

# 6. .claude/ state (per-user)
heading "6. .claude/ tracked directories"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E '\.claude/' || true)
  if [[ -n "$tracked" ]]; then
    echo "$tracked"
    found=1
  else
    echo "no .claude/ tracked ✓"
  fi
fi

echo ""
if [[ $found -eq 0 ]]; then
  echo "✅ Repository is clean. Safe to push."
  exit 0
else
  echo "❌ Found issues above. Fix before pushing."
  exit 1
fi
