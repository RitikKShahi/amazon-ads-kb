# /update

Re-run the full pipeline across all registered sources.

## Steps

1. **Load sources:** Read `state/sources.json` to get all registered URLs.

2. **For each source**, run the `/ingest` flow:
   a. Run `node scripts/hash_source.js check <url> <fixture-path>` via Bash.
   b. If `UNCHANGED`, skip this source and log it.
   c. If `CHANGED` or new, use the `extractor` subagent to pull claims, then the `merger` subagent to fold them into `knowledge/`.
   d. Run `node scripts/hash_source.js record <url> <fixture-path> <type> <official>` via Bash.

3. **Verify:** After processing all sources, run:
   - `node scripts/verify_integrity.js` to check for cross-file duplicates.
   - `./scripts/verify_rerun_safety.sh` to confirm the safe-to-re-run contract.

4. **Report:** Summarize what changed, what was skipped, and the final integrity status.

## Important

- Process sources sequentially, not in parallel.
- If a source fails (network error, API quota), log the error and continue to the next source.
- Do NOT re-extract from sources that hash as UNCHANGED.
