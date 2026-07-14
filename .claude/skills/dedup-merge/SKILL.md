---
name: dedup-merge
description: Use during the Merge stage whenever deciding if a claim belongs to an existing concept, whether two sources describe the same topic, or how to resolve conflicting facts.
---

# Dedup & Merge rules

## Is this the same concept?

Check in this order, stop at the first match:

1. **Exact concept ID match** (`concept_guess` equals an existing file
   path minus `.md`). Same concept.
2. **Known aliases** — maintain a small alias map in this skill as you
   discover them, e.g.:
   - `acos` / `advertising-cost-of-sale` / `ad-cost-of-sale` -> `metrics/acos`
   - `sp` / `sponsored-products` -> `ad-products/sponsored-products`
   If `concept_guess` matches an alias, use the canonical ID.
3. **Title/keyword overlap** — if `concept_guess` shares its main noun
   phrase with an existing concept's `title` or `tags` (e.g. "Sponsored
   Products bid strategy" vs an existing "Sponsored Products" concept),
   treat as the same concept unless the new claim is clearly a distinct
   sub-topic deserving its own file (use judgment; when in doubt, fold in
   rather than fragment — a slightly-too-broad concept file is easier to
   split later than five near-duplicate stubs are to merge).
4. **No match** -> new concept.

Document any alias you add and why, in your final run summary — this is
exactly the kind of judgment call the design doc should call out.

## Trust order when sources conflict

1. Official (`advertising.amazon.com`, official `amzn/*` GitHub repos) beats
   unofficial (blogs, unofficial SDKs).
2. Among sources of equal official-ness: more independent sources agreeing
   beats fewer. Note the count in `confidence`.
3. Never resolve a genuine conflict by picking one silently. Always leave a
   `## Note` in the body per the okf-format skill.
4. Recency is not automatically authoritative — an older official doc still
   beats a newer blog post. Only prefer newer-over-older when both sources
   are the same official-ness tier.

## Confidence levels (for frontmatter `confidence`)

- `high`: 2+ official sources agree, or 1 official + 2+ unofficial agreeing.
- `medium`: 1 official source only, or 2+ unofficial sources agreeing.
- `low`: single unofficial source, unconfirmed elsewhere.

## What counts as "changed" (for re-run safety)

A concept only needs rewriting if:
- A new source contributes a claim not already reflected in the concept, or
- An existing source's claim changed (different hash, different extracted
  claim text), or
- A conflict newly appears or newly resolves.

Re-confirming an unchanged claim from an unchanged source updates only that
source's `last_confirmed` date — not the concept `timestamp`, and does not
count as a content change for logging purposes beyond a single bookkeeping
note (or can be batched/skipped entirely — your call, document it).
