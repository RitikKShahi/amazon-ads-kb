# Design Document — Amazon Ads Knowledge Base

> An LLM-powered pipeline that reads the web, extracts facts, and builds a living knowledge base.

## System Architecture

```
  Web Sources ──→ Hash Scout ──→ Extractor ──→ Merger ──→ Knowledge Base
  (Amazon/Blogs)  (hash_source.js)  (Tavily/Playwright)  (Semantic Dedup)  (OKF Markdown)
                       │                                       ↑
                       └── UNCHANGED → Skip! ─────────────────┘
```

The pipeline has three stages, like an assembly line:

**Step 1. The Hash Scout** fetches the web page and creates a digital fingerprint (SHA-256 hash). If the fingerprint matches what we saw last time, the pipeline *immediately stops*. No wasted API calls. No duplicate data.

**Step 2. The Extractor Agent** (an LLM) reads the raw text and distills it into clean, atomic factual claims formatted as JSON. It *reasons* about what is a real fact vs. marketing fluff.

**Step 3. The Merger Agent** (another LLM) takes those claims, compares them *semantically* against the existing knowledge base, and only writes genuinely new information. It *reasons* about whether two sentences mean the same thing.

---

## Claude Code, MCP Tools & Scripts

### Why Claude Code?
Claude Code acts as the **orchestration engine**. It hosts our multi-agent system, manages MCP tool connections, and provides the subagent framework that splits "fetching" from "reasoning" from "writing."

### MCP Integration
The Extractor agent chooses its own scraping strategy via MCP:

| MCP Tool | When It's Used | Why |
|:---|:---|:---|
| Tavily Search | Static pages, blogs | Fast, token-efficient Markdown |
| Playwright | SPAs, JS-rendered pages | Real headless browser, full DOM |

### Scripts (Deterministic) vs. Agents (Reasoning)

| | Scripts (Deterministic) | Agents (LLM Reasoning) |
|:---|:---|:---|
| **Purpose** | State management, validation, hashing | Understanding text, deduplication |
| **Examples** | `hash_source.js`, `validate_okf_write.js`, `merge_logic.js` | Extractor, Merger |
| **Guarantee** | Always produces the same output | Uses judgment to handle ambiguity |

> **Key Design Principle:** Scripts handle determinism. Agents handle intelligence. We never let an LLM manage state or file hashes. But we also never ask a script to decide if two sentences mean the same thing.

---

## Repository Structure

```
amazon-ads-kb/
├── .claude/
│   ├── agents/                  # Subagent prompts (extractor, merger, scout)
│   ├── commands/                # Slash commands (/ingest, /update)
│   └── settings.json            # Tool permissions & pre-write hooks
├── .mcp.json                    # Auto-registers Playwright + Tavily on clone
├── scripts/
│   ├── hash_source.js           # Change detection via SHA-256 hashing
│   ├── merge_logic.js           # Testable merge rules (concept matching, trust)
│   ├── validate_okf_write.js    # Taxonomy enforcement gate
│   ├── verify_integrity.js      # Cross-file semantic duplicate scanner
│   └── verify_rerun_safety.sh   # One-command safe-to-re-run proof
├── state/
│   ├── seed_sources.json        # Starting URLs
│   └── sources.json             # Hash registry (the system's memory)
├── knowledge/                   # The OKF knowledge base (the deliverable)
├── fixtures/                    # Cached raw page snapshots for hashing
└── tests/                       # 63 tests covering all deterministic logic
```

**Script Roles:**
- **`hash_source.js`** — Strips Amazon's tracking pixels, computes stable hashes, decides if extraction should proceed.
- **`merge_logic.js`** — Encodes the merger's testable rules: concept resolution (exact → alias → keyword → new), trust resolution (official beats unofficial), and duplicate claim detection via Jaccard similarity.
- **`validate_okf_write.js`** — Pre-write hook that blocks writes to unauthorized directories and rejects files missing OKF frontmatter.
- **`verify_integrity.js`** — Scans all concept files for cross-file semantic duplicates. Uses Jaccard similarity on tokenized claims. Exits with code 1 when issues are found.
- **`verify_rerun_safety.sh`** — Fully automated: checks all source hashes, verifies zero knowledge/ diffs, runs integrity scan. One command, no manual interaction.

---

## The Problem We Solved: Amazon's Dynamic Tracking Pixels

During testing, our pipeline entered an infinite extraction loop. Every time we fetched the same Amazon page, the hash was different — even though the actual content hadn't changed.

**Root Cause:** Amazon injects invisible `fls-na` tracking pixels with rotating session IDs into every page response. The raw Markdown hash was never identical twice.

**Our Fix:** A regex sanitizer in `hash_source.js` strips all `fls-na` tracking pixels *before* computing the hash.

**The Honest Gap:** Our regex works for Amazon domains. A production system would need a more robust library like Mozilla Readability for universal DOM sanitization.

---

## Proof of Safe Re-Runs (Idempotency)

The pipeline guarantees safe re-runs via two layers. To verify, run:

```bash
./scripts/verify_rerun_safety.sh
```

### Layer 1: Hash-Skipping

If a source's text has not changed, the pipeline stops before invoking the LLM.

```
$ node scripts/hash_source.js check \
    https://advertising.amazon.com/about-api fixtures/about-api.txt
UNCHANGED

$ node scripts/hash_source.js check \
    https://advertising.amazon.com/en-gb/products/display-ads fixtures/display-ads.txt
UNCHANGED

$ node scripts/hash_source.js check \
    https://advertising.amazon.com/solutions/products/amazon-dsp fixtures/amazon-dsp.txt
UNCHANGED

$ node scripts/hash_source.js check \
    https://www.helium10.com/blog/what-is-amazon-tacos fixtures/what-is-amazon-tacos.txt
UNCHANGED
```

### Layer 2: Semantic Merge-Safety

Even if a source *does* change, the Merger compares incoming claims against existing knowledge and only writes genuinely new information.

The merge rules are encoded in `scripts/merge_logic.js` and tested in `tests/merge_logic.test.js`:
- Same fact, different words → detected as duplicate (Jaccard similarity)
- Official source contradicts unofficial → official wins
- Two official sources disagree → both kept with a `## Note`

### Integrity Verification

```bash
$ node scripts/verify_integrity.js
```

This scans all 13 concept files for cross-file semantic duplicates. At threshold 0.85, the scanner identifies high-confidence overlaps that should be reviewed.

---

## Final Output: The Knowledge Base

6 sources of varying types (Web, GitHub, PDF) were processed into a knowledge base containing **15 OKF v0.1 concept files** across 4 taxonomy categories, totaling **322 content claims**.

| Category | Concepts | Claims |
|:---|:---|---:|
| `ad-products/` | device-ads, display-ads, dsp, platform-unification, sponsored-display, sponsored-products | 233 |
| `apis/` | access-and-auth, ads-api, advanced-tools, documentation, testing | 48 |
| `metrics/` | acos, roas, tacos | 38 |
| `strategy/` | holiday-2026 | 3 |
| **Total** | **15 concepts** | **322** |

### Sources

| Source URL | Type | Strategy |
|:---|:---|:---|
| `advertising.amazon.com/about-api` | Web (API Docs) | Tavily (Static) |
| `advertising.amazon.com/en-gb/products/display-ads` | Web (Product) | Playwright (Dynamic) |
| `advertising.amazon.com/solutions/products/amazon-dsp` | Web (Product) | Playwright (Dynamic) |
| `helium10.com/blog/what-is-amazon-tacos` | Web (Blog) | Tavily (Static) |
| `github.com/amzn/ads-advanced-tools-docs` | GitHub Repo | Tavily (Markdown) |
| `local/docs/amazon-ads-holiday-2026.pdf` | PDF Document | local markitdown |

---

## Honest Notes on What's Missing

- **Cross-file duplicates exist.** The integrity scanner finds ~10 semantic overlaps at threshold 0.65 (e.g. "Cost-Per-Click" appearing in both `display-ads.md` and `sponsored-display.md`). These are conceptual overlaps in Amazon's own documentation, not bugs in the merger — but a production system would need a consolidation pass.
- **Orchestrator is LLM-driven.** The `/update` slash command drives the pipeline, but the sequencing still relies on Claude Code's judgment. A hardcoded `orchestrator.js` script would be more deterministic.
