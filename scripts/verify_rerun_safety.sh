#!/usr/bin/env bash
# scripts/verify_rerun_safety.sh
# 
# Usage:
#   ./scripts/verify_rerun_safety.sh
# 
# Purpose:
# Run this script around a manual `claude -p` invocation to verify the safe-to-re-run contract.
# It checks if any knowledge/ files were modified during a no-op pipeline run.
#
# Instructions for manual use:
# 1. Run this script: `./scripts/verify_rerun_safety.sh`
# 2. Open a second terminal window.
# 3. In the second terminal, run your pipeline:
#    claude -p "Run the pipeline: use scout to discover sources from state/seed_sources.json, extractor to pull claims from any changed source, and merger to publish updates to knowledge/."
# 4. Wait for the pipeline to finish in the second terminal.
# 5. Come back to this script's terminal and press Enter to compare the git status.

echo "Checking initial git status of knowledge/..."
git status --porcelain knowledge/ > /tmp/knowledge_status_before.txt
cat /tmp/knowledge_status_before.txt

echo ""
echo "Now open another terminal and run your pipeline:"
echo '  claude -p "Run the pipeline: use scout to discover sources from state/seed_sources.json, extractor to pull claims from any changed source, and merger to publish updates to knowledge/."'
echo ""
echo "Press Enter when the pipeline finishes to check for file diffs..."
read -r

echo "Checking final git status of knowledge/..."
git status --porcelain knowledge/ > /tmp/knowledge_status_after.txt
cat /tmp/knowledge_status_after.txt

echo ""
if cmp -s /tmp/knowledge_status_before.txt /tmp/knowledge_status_after.txt; then
    echo "SUCCESS: No unexpected file changes in knowledge/."
else
    echo "FAILURE: knowledge/ files were modified during what should have been a no-op run!"
    echo "Diff:"
    diff /tmp/knowledge_status_before.txt /tmp/knowledge_status_after.txt
fi
