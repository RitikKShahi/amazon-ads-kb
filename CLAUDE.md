# amazon-ads-kb

An autonomous knowledge acquisition system. It discovers, extracts, validates,
merges, and publishes knowledge about Amazon Ads (ad products, APIs, metrics,
terminology) as an OKF v0.1 knowledge bundle in `knowledge/`.

## Scope

In scope: Amazon Ads advertising products (Sponsored Products/Brands/Display,
DSP), the Amazon Ads API (auth, profiles, campaigns, reports), common PPC
metrics/terminology (ACOS, TACOS, ROAS, etc.), and tooling around it (SDKs,
MCP servers).

Out of scope: Amazon Seller Central operations unrelated to advertising,
Amazon retail/product-catalog details, anything not sourced from a fetched
document (no invented facts).

## Pipeline

Discover -> Extract -> Validate -> Merge -> Publish. See
`.claude/agents/` for the subagent handling each fuzzy stage, and
`.claude/skills/` for the rules every subagent must follow regardless of
which source it's looking at.

1. **Discover** (`scout` agent): find candidate sources — either from
   `state/seed_sources.json` or via search — and decide which are worth
   fetching this run.
2. **Extract** (`extractor` agent): pull discrete, sourced claims out of one
   fetched document. Never invents a claim; every claim carries the source
   URL it came from.
3. **Validate**: schema/frontmatter correctness is enforced by the
   `pre-write-validate` hook (deterministic, non-negotiable). Contradiction
   handling (two sources disagree) is the `merger` agent's judgment call,
   governed by `.claude/skills/dedup-merge`.
4. **Merge** (`merger` agent): decide which existing concept (if any) a new
   claim belongs to, fold it in, or create a new concept file. Never creates
   a duplicate concept for a topic that already has a file.
5. **Publish**: writing concept files, regenerating `index.md`, and
   appending to `log.md` follows the templates in
   `.claude/skills/okf-format`. This step is mechanical once Merge has
   decided the target concept and content.

## Safe-to-re-run contract

- Every fetched source is hashed (normalized content) and compared against
  `state/sources.json`. Unchanged sources are skipped before extraction.
- Only concepts touched by a changed/new source get re-merged and rewritten.
  Untouched concepts are left byte-for-byte alone.
- Every write is logged in `knowledge/log.md` (dated) and
  `state/run_log.jsonl` (machine-readable).
- Running the same inputs twice in a row must produce zero file diffs on the
  second run (other than log/state bookkeeping).

## Ground rules for every agent

- Never write a claim without a source URL attached.
- Never fabricate or guess at facts not present in a fetched document.
- Prefer official sources (`advertising.amazon.com`, `amzn/*` GitHub) over
  unofficial ones when they conflict; when both are official or both
  unofficial, keep both and note the disagreement in the concept body —
  don't silently pick one.
- One concept = one topic. If unsure whether something is a new topic or
  belongs to an existing concept, check `knowledge/index.md` first.
