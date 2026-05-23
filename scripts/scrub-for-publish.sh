#!/usr/bin/env bash
# scrub-for-publish.sh — pre-push safety scan.
#
# Run this BEFORE pushing the repo public. Exits non-zero (and prints what
# it found) if any of the following are present:
#   - API keys (AIza... pattern)
#   - Hardcoded /Users/<anything> paths
#   - Tracked .env files
#   - Tracked node_modules/ entries
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

# 1. API keys
heading "1. API keys (AIza* pattern)"
hits=$(grep -rE 'AIza[0-9A-Za-z_-]{30,}' \
  --exclude-dir=node_modules \
  --exclude-dir=.venv \
  --exclude-dir=.git \
  --exclude-dir=__pycache__ \
  . 2>/dev/null || true)
if [[ -n "$hits" ]]; then
  echo "$hits"
  found=1
else
  echo "clean ✓"
fi

# 2. /Users/* paths
heading "2. Hardcoded /Users/* paths"
hits=$(grep -rE '/Users/[a-zA-Z]+/' \
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
