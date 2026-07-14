# amazon-ads-kb

An autonomous knowledge acquisition system for Amazon Ads, built as a
Claude Code project. Discovers sources, extracts facts, validates them,
merges duplicates, and publishes an OKF v0.1 knowledge bundle.

## Setup

```bash
# 1. Node 20+ (native fetch, built-in test runner), then:
npm i -g @anthropic-ai/claude-code
claude   # sign in

# 2. Add MCPs for live discovery/fetch (optional if working from fixtures/)
claude mcp add playwright npx @playwright/mcp@latest
# add a search MCP (Tavily/Brave) per its own setup docs

# 3. From the repo root:
git clone <this-repo>
cd amazon-ads-kb
```

## Run

```bash
claude -p "Run the pipeline: use scout to discover sources from state/seed_sources.json, extractor to pull claims from any changed source, and merger to publish updates to knowledge/."
```

Run it twice in a row with no source changes — the second run should
produce zero diffs under `knowledge/` (check with `git status` /
`git diff`). This is the safe-to-re-run guarantee; see `CLAUDE.md` for the
full contract.

## Structure

```
amazon-ads-kb/
├── CLAUDE.md              # scope, pipeline contract, ground rules
├── .claude/
│   ├── agents/            # scout, extractor, merger
│   ├── skills/            # okf-format, dedup-merge, citation
│   └── settings.json      # pre-write validation hook
├── scripts/
│   ├── validate_okf_write.js   # hook: blocks malformed frontmatter
│   └── hash_source.js          # deterministic change detection
├── state/
│   ├── seed_sources.json  # starting source list (edit freely)
│   └── sources.json       # registry: hash, last-fetched, official?
├── knowledge/              # the OKF bundle (the actual deliverable)
└── fixtures/                # optional: cached raw source content for offline dev
```

## Design notes

See the design document for the full writeup. Short version: fetch,
hash, and frontmatter-validate are deterministic (code); deciding what's
worth fetching, what a fact means, and whether two things are "the same
topic" are Claude's job (subagents + skills).
