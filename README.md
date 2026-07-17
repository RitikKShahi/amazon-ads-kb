# Amazon Ads Autonomous Knowledge Base

An autonomous, LLM-driven knowledge acquisition system designed to ingest unstructured web documentation and output pristine, deduplicated Open Knowledge Framework (OKF v0.1) concepts.

For full details on the system architecture, design decisions, and deduplication guarantees, please see the [Design Document](DESIGN.md).

## 🛠️ Setup & Onboarding

### 1. Prerequisites
- **Node.js 20+** (Native fetch, built-in test runner)
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`)
- Valid LLM Gateway keys (e.g., `litellm.retap.ai`)
- Tavily API Key for search extraction

### 2. Clone & Configure
The repository contains an `.mcp.json` file which automatically configures the necessary Model Context Protocol (MCP) servers for you (Playwright and Tavily).

```bash
# Clone the repository
git clone <this-repo>
cd amazon-ads-kb

# Export your Tavily API key (required by the Tavily MCP server)
export TAVILY_API_KEY="tvly-your-key-here"

# Confirm MCP servers are active
claude mcp list
```

### 3. Run Tests
Validate the deterministic hash logic, taxonomy enforcement hooks, and semantic deduplication rules:
```bash
npm test
```

---

## 🏃‍♂️ Running the Pipeline (Manual Orchestration)

The pipeline is driven by Claude Code slash commands that orchestrate the subagents (`scout`, `extractor`, `merger`).

### Process all configured sources
To run the full end-to-end pipeline across all sources listed in `state/sources.json`:

```bash
claude /update
```

### Process a single source
To test the pipeline on a specific URL:

```bash
claude /ingest "https://advertising.amazon.com/about-api"
```

---

## 🔒 Verifying Safe Re-Runs

The system guarantees idempotency. If a source hasn't changed, it won't be re-processed. To prove this to yourself:

1. Run the pipeline once via `claude /update`.
2. Run our automated rerun-safety proof script:
   ```bash
   ./scripts/verify_rerun_safety.sh
   ```
   This script programmatically confirms that all source hashes are unchanged, and that there are zero file diffs in the `knowledge/` directory.

*(Note: The integrity of the knowledge base is verified by `node scripts/verify_integrity.js`, which scans for cross-file semantic duplicates.)*
