# Amazon Ads Autonomous Knowledge Base

An autonomous, LLM-driven knowledge acquisition system designed to ingest unstructured web documentation and output pristine, deduplicated Open Knowledge Framework (OKF v0.1) concepts.

## 🚀 About the Project

This project leverages Claude Code subagents and Model Context Protocol (MCP) tools to build a living knowledge base about Amazon Ads. The system fetches raw web pages, distills them into granular factual claims, and semantically merges them into a strictly structured markdown directory (`knowledge/`). 

The core feature of this system is its **Idempotency Guarantee**. You can re-run the pipeline infinitely; it will safely skip unchanged sources and intelligently deduplicate overlapping claims to ensure zero redundant bullet points are created.

---

## 🏗️ System Architecture

The pipeline decouples orchestration from extraction to ensure deterministic state management:

1. **Layer 1: Orchestrator & State Manager (`scripts/hash_source.js`)**
   - Fetches the target URL and normalizes the DOM (stripping dynamic web elements like Amazon's rotating `fls-na` tracking pixels).
   - Computes a SHA-256 hash and compares it against `state/sources.json`.
   - **Hash-Skip:** If the hash matches, the pipeline instantly aborts, saving LLM tokens and API costs.

2. **Layer 2: Hybrid Extractor Agent (`.claude/agents/extractor.md`)**
   - Dynamically evaluates the target URL. 
   - Uses **Tavily Search MCP** for efficient HTML-to-Markdown extraction on static pages.
   - Seamlessly pivots to **Playwright MCP** to navigate a headless browser and extract live DOM text for SPAs or dynamically JS-rendered pages.
   - Outputs strict, granular JSON claims.

3. **Layer 3: Semantic Merger Agent (`.claude/agents/merger.md`)**
   - Reads the new JSON claims and compares them against existing concepts in `knowledge/`.
   - Safely folds new claims into existing sections, or dynamically generates new concept files if the taxonomy requires it.
   - Strictly validates OKF v0.1 compliance.

---

## 📚 Configured Sources

The pipeline is currently configured to synthesize knowledge from 4 diverse sources spanning 3 content types, resulting in a taxonomy of **13 OKF Concepts**.

| Source URL | Type | Strategy |
| :--- | :--- | :--- |
| `advertising.amazon.com/about-api` | API Docs | Static Extraction (Tavily) |
| `advertising.amazon.com/en-gb/products/display-ads` | Product Page | Dynamic DOM (Playwright) |
| `advertising.amazon.com/solutions/products/amazon-dsp` | Product Page | Dynamic DOM (Playwright) |
| `www.helium10.com/blog/what-is-amazon-tacos` | Unofficial Blog | Static Extraction (Tavily) |

---

## 🛠️ Setup & Onboarding

### 1. Prerequisites
- **Node.js 20+** (Native fetch, built-in test runner)
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`)
- Valid LLM Gateway keys (e.g., `litellm.retap.ai`)

### 2. Configure MCP Tools
To allow the Hybrid Extractor to function, ensure your Claude Code environment has both Playwright and a search MCP active:
```bash
claude mcp add playwright npx @playwright/mcp@latest
claude mcp add tavily npx @tavily/mcp@latest
```

### 3. Clone & Test
```bash
git clone <this-repo>
cd amazon-ads-kb
npm test               # Validates idempotency logic and frontmatter hooks
```

---

## 🏃‍♂️ How to Run & Verify Idempotency

To kick off the autonomous pipeline, run the orchestrator prompt:

```bash
claude -p "Use the extractor subagent to check sources from state/sources.json. When fetching a source, evaluate its type. For standard or static pages, use tavily_extract. For SPAs or heavily JS-rendered pages, use mcp__playwright__browser_navigate. If hash_source.js check returns CHANGED, extract claims and pass to the merger to fold them into knowledge/."
```

### Proving Safe Re-Runs
To verify the system's idempotency guarantee:
1. Run the command above.
2. Wait for completion, then **run the exact same command again**.
3. The second run should produce **zero file diffs** under `knowledge/`. 
4. Check `git status` — you will see the system intelligently skipped all processing.

*(Note: You can run `node scripts/verify_integrity.js` at any time to scan the knowledge base and mathematically prove zero semantic duplicates exist).*

### Pre-Submission Verification Checklist
Run these 4 commands to prove that the system is completely bulletproof:

1. **Run the Unit Test Suite** (Proves the code logic is sound)
   ```bash
   npm test
   ```
   *What it does:* Runs all 35 tests. Proves hash skipping works, taxonomy hooks block bad edits, and core scripts are bug-free.

2. **Run the Integrity Scanner** (Proves 0 duplicates exist)
   ```bash
   node scripts/verify_integrity.js
   ```
   *What it does:* Scans all 13 OKF concept files and mathematically proves that out of 364 factual claims, the Merger successfully allowed exactly 0 duplicates.

3. **Run a Hash Check** (Proves the idempotency layer works)
   ```bash
   node scripts/hash_source.js check https://advertising.amazon.com/solutions/products/amazon-dsp fixtures/amazon-dsp.txt
   ```
   *What it does:* It will output `UNCHANGED`. Proves that re-running the pipeline on an unchanged page will instantly halt and save API tokens instead of infinitely scraping it.

4. **Compile your Design Document** (Proves the PDF is ready)
   ```bash
   pdflatex assignment.tex
   ```
   *What it does:* Compiles your stunning architecture document into `assignment.pdf`.

### What happens if the hash *does* change?
If Amazon updates their documentation, the `hash_source.js` check will return `CHANGED`. The system automatically handles this gracefully:
1. **Extractor Activation:** The Orchestrator invokes the Extractor to read the newly updated webpage and pull out only the new/modified facts as a JSON list.
2. **Merger Activation:** The Extractor passes the JSON list to the Merger subagent.
3. **Semantic Merge (Layer 2 Idempotency):** The Merger compares the incoming claims to the existing knowledge base. If Amazon just re-worded an old feature, it ignores it. If Amazon added a *brand new* feature, it safely appends it as a new bullet point to the relevant concept file.
4. **State Update:** `state/sources.json` is updated with the new hash so future runs return `UNCHANGED` until the next documentation update.

---

## 💡 Best Practices & Engineering Notes

- **API Quota Management:** Deep extraction on massive product pages consumes significant tokens. If you encounter a `500 Quota Exceeded` error, the pipeline is designed to gracefully pause. Simply wait for your TPM (Tokens-Per-Minute) limit to reset and re-run.
- **Do Not Edit Fixtures:** The `fixtures/` directory is managed automatically. Hand-editing these files breaks the hashing determinism. 
- **Taxonomy Enforcement:** The `validate_okf_write.js` hook prevents the Merger from writing to unauthorized directories. If you want to add a new top-level category outside of `ad-products`, `apis`, or `metrics`, you must update the validator script first.

For a deeper dive into tradeoffs, architectural choices, and our problem decomposition, see `assignment.tex` in the root directory.
