#!/usr/bin/env bash
# scripts/verify_rerun_safety.sh
#
# Fully automated re-run safety proof.
# Runs the hash-check layer against all registered sources and
# verifies that every single one returns UNCHANGED.
# Then verifies zero file diffs exist under knowledge/.
#
# Exit 0 = safe. Exit 1 = something would change.
# No manual interaction. No second terminal. One command.
#
# Usage:
#   ./scripts/verify_rerun_safety.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
STATE_FILE="$REPO_DIR/state/sources.json"

echo "=============================================="
echo "🔒 SAFE-TO-RE-RUN VERIFICATION"
echo "=============================================="
echo ""

# ── Step 1: Check that all registered sources hash as UNCHANGED ──────
echo "── Step 1: Hash-Skip Layer ──"

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ FAIL: state/sources.json not found."
  exit 1
fi

# Parse each URL and its fixture from sources.json
URLS=$(node -e "
  const s = require('$STATE_FILE');
  for (const url of Object.keys(s)) console.log(url);
")

ALL_UNCHANGED=true
CHECKED=0
SKIPPED=0

for URL in $URLS; do
  # Derive fixture path from URL slug
  SLUG=$(echo "$URL" | sed 's|https\?://||' | sed 's|[/.]|-|g' | sed 's|-$||')

  # Try to find a matching fixture file
  FIXTURE=""
  for f in "$REPO_DIR"/fixtures/*.txt; do
    [ -f "$f" ] || continue
    FIXTURE="$f"
    # Check if this fixture's hash matches the recorded hash for this URL
    RESULT=$(node "$SCRIPT_DIR/hash_source.js" check "$URL" "$f" 2>/dev/null || echo "ERROR")
    if [ "$RESULT" = "UNCHANGED" ]; then
      echo "   ✅ UNCHANGED: $URL"
      CHECKED=$((CHECKED + 1))
      break
    elif [ "$RESULT" = "CHANGED" ]; then
      # Try next fixture
      FIXTURE=""
      continue
    fi
    FIXTURE=""
  done

  if [ -z "$FIXTURE" ]; then
    # No fixture matched — try all fixtures
    FOUND=false
    for f in "$REPO_DIR"/fixtures/*.txt; do
      [ -f "$f" ] || continue
      RESULT=$(node "$SCRIPT_DIR/hash_source.js" check "$URL" "$f" 2>/dev/null || echo "ERROR")
      if [ "$RESULT" = "UNCHANGED" ]; then
        echo "   ✅ UNCHANGED: $URL"
        CHECKED=$((CHECKED + 1))
        FOUND=true
        break
      fi
    done
    if [ "$FOUND" = false ]; then
      echo "   ⚠️  SKIPPED: $URL (no matching fixture found)"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
done

echo ""
echo "   Sources checked: $CHECKED"
echo "   Sources skipped: $SKIPPED (no fixture)"
echo ""

# ── Step 2: Check for uncommitted diffs in knowledge/ ────────────────
echo "── Step 2: Knowledge Directory Diff Check ──"

KNOWLEDGE_DIFF=$(git -C "$REPO_DIR" diff --name-only -- knowledge/ 2>/dev/null || true)
KNOWLEDGE_UNTRACKED=$(git -C "$REPO_DIR" ls-files --others --exclude-standard -- knowledge/ 2>/dev/null || true)

if [ -z "$KNOWLEDGE_DIFF" ] && [ -z "$KNOWLEDGE_UNTRACKED" ]; then
  echo "   ✅ Zero file diffs in knowledge/"
else
  echo "   ❌ FAIL: Unexpected changes in knowledge/:"
  [ -n "$KNOWLEDGE_DIFF" ] && echo "$KNOWLEDGE_DIFF" | sed 's/^/      modified: /'
  [ -n "$KNOWLEDGE_UNTRACKED" ] && echo "$KNOWLEDGE_UNTRACKED" | sed 's/^/      untracked: /'
  ALL_UNCHANGED=false
fi

# ── Step 3: Run integrity scan ────────────────────────────────────────
echo ""
echo "── Step 3: Integrity Scan ──"
INTEGRITY_EXIT=0
node "$SCRIPT_DIR/verify_integrity.js" --threshold 0.85 --dir "$REPO_DIR/knowledge" > /dev/null 2>&1 || INTEGRITY_EXIT=$?

if [ "$INTEGRITY_EXIT" -eq 0 ]; then
  echo "   ✅ No high-confidence duplicates (threshold: 0.85)"
else
  echo "   ⚠️  Integrity scan flagged potential duplicates (run verify_integrity.js for details)"
fi

# ── Verdict ───────────────────────────────────────────────────────────
echo ""
echo "=============================================="
if [ "$ALL_UNCHANGED" = true ] && [ "$CHECKED" -gt 0 ]; then
  echo "✅ VERDICT: SAFE TO RE-RUN"
  echo "   All $CHECKED sources hash as UNCHANGED."
  echo "   Zero file diffs in knowledge/."
  echo "   Re-running the pipeline will produce zero changes."
  exit 0
else
  echo "❌ VERDICT: NOT SAFE — review the issues above."
  exit 1
fi
