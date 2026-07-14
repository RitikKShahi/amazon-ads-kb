---
name: citation
description: Use whenever writing a claim, a Citations section, or anything that will end up in knowledge/. Governs source integrity - the rule that keeps AI-generated content from becoming unsourced "fact".
---

# Citation rules

- Every claim in `knowledge/` must trace to a `source_url` that was
  actually fetched this run or a prior run (recorded in `state/sources.json`).
- Never write a claim whose only support is general knowledge/training data
  — if it wasn't in a fetched document, it doesn't go in the bundle. If you
  believe something is true but can't source it, leave it out and note the
  gap in your run summary instead.
- Paraphrase claims in your own words. Do not copy sentences verbatim from
  a source into a concept file, beyond a short (<15 word) quoted phrase
  when exact wording genuinely matters (e.g. an exact API parameter name or
  a precise legal/limit figure).
- Every concept's `# Citations` section must list every source in its
  frontmatter `sources` array — the two must never drift apart.
- If a source becomes unreachable on a later run, don't delete its
  citation — mark it `status: unreachable` in frontmatter and keep the
  claims it originally supported (they were true when sourced; note that
  the source could no longer be re-confirmed as of the current date).
