# /ingest <url>

Process a single source URL through the full pipeline.

## Steps

1. **Fetch & Hash:** Run `node scripts/hash_source.js check $ARGUMENTS <fixture-path>` via Bash.
   - Derive a fixture path from the URL slug (e.g. `fixtures/<slug>.txt`).
   - If no fixture exists yet, this is a new source — proceed to step 2.
   - If the hash returns `UNCHANGED`, stop here and report "Source unchanged, skipping."

2. **Extract:** Use the `extractor` subagent on the URL.
   - For static pages, use `tavily_extract`.
   - For SPAs or JS-rendered pages, use Playwright MCP.
   - Save the raw content to `fixtures/<slug>.txt`.
   - Output a JSON claim list.

3. **Merge:** Use the `merger` subagent to fold the claims into `knowledge/`.
   - Follow dedup-merge and okf-format skills.
   - Report what was added, skipped, or enhanced.

4. **Record:** Run `node scripts/hash_source.js record <url> <fixture-path> <type> <official>` via Bash.

5. **Verify:** Run `node scripts/verify_integrity.js` and report the result.
