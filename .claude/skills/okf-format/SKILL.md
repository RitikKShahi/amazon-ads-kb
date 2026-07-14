---
name: okf-format
description: Use whenever writing or updating any file under knowledge/. Defines the exact OKF v0.1 structure this project targets - frontmatter fields, reserved filenames, index/log conventions, and body layout.
---

# OKF Format for this project

Every file under `knowledge/` is an OKF v0.1 concept doc. Per spec, only
`type` is strictly required, but this project always sets the full set
below for consistency and provenance tracking.

## Frontmatter template

```yaml
---
type: Reference
title: Short human title
description: One sentence, what this concept is
tags: [amazon-ads, relevant-subtag]
timestamp: 2026-07-14T00:00:00Z   # last time this concept's content changed
sources:
  - url: https://advertising.amazon.com/...
    official: true
    first_seen: 2026-07-10
    last_confirmed: 2026-07-14
  - url: https://some-blog.com/...
    official: false
    first_seen: 2026-07-12
    last_confirmed: 2026-07-12
confidence: high   # high = 2+ official sources agree; medium = 1 official
                    # or 2+ unofficial agreeing; low = single unofficial source
---
```

Rules:
- `timestamp` only changes when the concept's *content* changes, not on
  every run that merely re-confirms it (bump `last_confirmed` on the
  relevant source entry instead).
- `sources` grows as more sources confirm/contribute; never remove a
  source entry, even if that source later goes offline — mark it instead
  (add `status: unreachable` under that entry) rather than deleting.

## Body layout

```markdown
# <Title>

<1-3 sentence summary in your own words.>

# Details

<Paraphrased facts, organized as prose or bullet points. If sources
disagree, say so explicitly here — don't average or silently pick one.>

## Note (only if sources conflict)

Sources disagree on X: <official source> states Y, while <unofficial
source> states Z. Treating <official source> as authoritative.

# Citations

- [<short source name>](<url>) — official/unofficial, last confirmed <date>
```

## Reserved filenames

- `knowledge/index.md` — one per directory level that has concepts in it.
  Lists concepts in that directory with one-line descriptions, links to
  subdirectory indexes. No frontmatter except `okf_version: "0.1"` at the
  bundle root index only.
- `knowledge/log.md` — single file at bundle root. Newest entries first.
  One entry per concept changed per run:
  ```markdown
  ## 2026-07-14
  - Updated `metrics/acos.md`: added TACOS comparison from <source>
  - Created `ad-products/sponsored-brands.md`
  ```

## Concept IDs = file paths

The concept ID is the file path minus `.md`, e.g. `metrics/acos` for
`knowledge/metrics/acos.md`. This is the dedup key — before creating a new
file, check whether the concept already exists under this or a very
similar ID.

## Cross-links

Use bundle-relative markdown links between concepts, e.g.
`[ACOS](/metrics/acos.md)`, whenever a concept body naturally references
another one.
