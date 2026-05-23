#!/usr/bin/env bash
# demo-day.sh — preflight for the live demo.
#
# Run this 10 minutes before your demo slot. Checks every external
# dependency, validates each .env, smoke-tests the CLI, and reports
# which examples are ready to demo.
#
# Usage:  bash scripts/demo-day.sh
#         (or:  npm run preflight)

set -uo pipefail
cd "$(dirname "$0")/.."

ok=0
warn=0
fail=0

check() {
  local label="$1"
  local cmd="$2"
  printf "%-50s " "$label"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✓"
    ok=$((ok+1))
  else
    echo "✗"
    fail=$((fail+1))
  fi
}

warn_if() {
  local label="$1"
  local cmd="$2"
  printf "%-50s " "$label"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✓"
    ok=$((ok+1))
  else
    echo "(warning)"
    warn=$((warn+1))
  fi
}

echo "=== Host environment ==="
check "node 18+ installed"                          "[[ $(node -v | tr -d 'v.' | cut -c1-2) -ge 18 ]]"
check "npm installed"                               "command -v npm"
check "cloudflared installed"                       "command -v cloudflared"
warn_if "adb installed (for gfmd doctor / capture)" "command -v adb"
warn_if "python3 installed (for prompt-arena)"      "command -v python3"

echo ""
echo "=== Framework smoke ==="
check "node bin/gfmd.mjs --help works"              "node bin/gfmd.mjs --help"
check "node bin/gfmd.mjs --version works"           "node bin/gfmd.mjs --version"

echo ""
echo "=== Example: omni-odyssey ==="
check ".env present (with GEMINI_API_KEY)"          "[[ -s examples/omni-odyssey/.env ]] && grep -q '^GEMINI_API_KEY=.\\+' examples/omni-odyssey/.env"
check "node_modules installed"                      "[[ -d examples/omni-odyssey/node_modules ]]"
warn_if "assets/intro.mp4 pre-generated (Veo)"      "[[ -s examples/omni-odyssey/assets/intro.mp4 ]]"
warn_if "assets/opening-scene.jpg pre-generated"    "[[ -s examples/omni-odyssey/assets/opening-scene.jpg ]]"

echo ""
echo "=== Example: pulseblade ==="
check ".env present"                                "[[ -s examples/pulseblade/.env ]] && grep -q '^GEMINI_API_KEY=.\\+' examples/pulseblade/.env"
check "node_modules installed"                      "[[ -d examples/pulseblade/node_modules ]]"

echo ""
echo "=== Bonus: prompt-arena ==="
check ".env present"                                "[[ -s examples/prompt-arena/.env ]] && grep -q '^GEMINI_API_KEY=.\\+' examples/prompt-arena/.env"
warn_if ".venv present"                             "[[ -d examples/prompt-arena/.venv ]]"
warn_if "data/tournament.json exists (pre-warmed)"  "[[ -s examples/prompt-arena/data/tournament.json ]]"
check "data/traces/m_emberton.json present"         "[[ -s examples/prompt-arena/data/traces/m_emberton.json ]]"

echo ""
echo "=== Phone / glasses (manual check) ==="
echo "  - Pixel paired with Display glasses?           [ ]"
echo "  - Meta AI app open and signed in?              [ ]"
echo "  - Glasses on, displaying ambient HUD?          [ ]"
echo "  - Browser zoom on laptop set to 125%?          [ ]"

echo ""
echo "=== Summary ==="
echo "✓ ok:    $ok"
echo "! warn:  $warn"
echo "✗ fail:  $fail"

if [[ $fail -gt 0 ]]; then
  echo ""
  echo "❌ Fix the ✗ items before demo."
  exit 1
fi

if [[ $warn -gt 0 ]]; then
  echo ""
  echo "⚠️  Demo can proceed; the ! items are nice-to-haves (faster first-paint, etc.)"
fi

echo ""
echo "✅ Demo path is ready."
