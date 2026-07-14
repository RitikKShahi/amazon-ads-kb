#!/usr/bin/env node
/**
 * prefetch_static_sources.js — OPTIONAL offline/dev fallback
 *
 * Pre-fetches the known static official-doc URLs from seed_sources.json,
 * strips HTML boilerplate, and writes normalized content to fixtures/ so
 * the extractor subagent can work from disk without re-fetching.
 *
 * THIS IS NOT THE PRIMARY DISCOVERY/FETCH MECHANISM.
 * In a real pipeline run inside Claude Code:
 *   - The Scout agent uses Tavily (search MCP) to discover new sources
 *   - The Extractor agent uses Playwright (browser MCP) to fetch and
 *     render JavaScript-heavy pages
 *   - hash_source.js is called via Bash tool *after* those agents write
 *     content to fixtures/, not as part of a fetch loop
 *
 * This script exists for two purposes only:
 *   1. Bootstrapping fixtures/ for offline development/testing
 *   2. Pre-seeding content for the seed URLs that are simple static HTML
 *      (GitHub READMEs, etc.) where plain fetch() works fine
 *
 * Pages that require JavaScript rendering (e.g. Amazon API docs SPAs)
 * will return thin/empty content here — that's expected. Those need
 * Playwright MCP inside a Claude Code session.
 *
 * Requires Node 20+ (native fetch).
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SEED_PATH = path.join(ROOT, "state", "seed_sources.json");
const FIXTURES_DIR = path.join(ROOT, "fixtures");
const HASH_SCRIPT = path.join(__dirname, "hash_source.js");

// -----------------------------------------------------------------------
// HTML boilerplate stripping
// -----------------------------------------------------------------------

/**
 * Strip obvious boilerplate from fetched HTML so the hash reflects actual
 * content, not page furniture.
 *
 * KNOWN SIMPLIFICATION: This uses regex-based stripping which is good
 * enough for our use case (Amazon docs, GitHub READMEs, blog posts) but
 * will miss edge cases like deeply nested templates, inline JS content
 * that looks like prose, or <nav> tags split across lines with attributes.
 * Real production systems should use a proper HTML parser (e.g. cheerio,
 * jsdom, or a readability library). We intentionally avoid heavy
 * dependencies here to keep the scaffolding lightweight and auditable.
 */
function stripHtmlBoilerplate(html) {
  let text = html;

  // Remove entire tag blocks (tag + content) for common boilerplate elements.
  // The [\s\S]*? is non-greedy to avoid swallowing content between separate
  // tags of the same type (e.g. two <nav> sections).
  const blockTags = ["script", "style", "nav", "footer", "header", "noscript", "iframe"];
  for (const tag of blockTags) {
    // Case-insensitive, handles attributes on the opening tag
    text = text.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"),
      ""
    );
  }

  // Remove remaining HTML tags (keeps text content)
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse whitespace (same normalisation hash_source.js uses internally,
  // but we do it here so the fixture file is also clean)
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// -----------------------------------------------------------------------
// Slug helper — turn a URL into a safe filename
// -----------------------------------------------------------------------

function slugify(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

async function main() {
  // 1. Read seed sources
  if (!fs.existsSync(SEED_PATH)) {
    console.error(`Error: seed sources not found at ${SEED_PATH}`);
    process.exit(1);
  }
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  const sources = seed.sources || [];

  if (sources.length === 0) {
    console.log("No sources in seed_sources.json — nothing to do.");
    return;
  }

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const results = [];

  // 2. Process each source
  for (const source of sources) {
    const { url, type, official } = source;
    process.stdout.write(`  ${url} ... `);

    // 2a. Fetch
    let body;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "amazon-ads-kb-pipeline/0.1" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.log(`FETCH_ERROR (${res.status})`);
        results.push({ url, status: "fetch_error", reason: `HTTP ${res.status}` });
        continue;
      }
      body = await res.text();
    } catch (err) {
      console.log(`FETCH_ERROR (${err.message})`);
      results.push({ url, status: "fetch_error", reason: err.message });
      continue;
    }

    // 2b. Strip HTML boilerplate and normalise
    const content = stripHtmlBoilerplate(body);

    if (!content) {
      console.log("EMPTY_AFTER_STRIP");
      results.push({ url, status: "empty", reason: "no content after stripping" });
      continue;
    }

    // 2c. Write to a temp file for hash_source.js
    const slug = slugify(url);
    const fixturePath = path.join(FIXTURES_DIR, `${slug}.txt`);
    fs.writeFileSync(fixturePath, content);

    // 2d. Check if content changed via hash_source.js
    let hashResult;
    try {
      hashResult = execFileSync("node", [HASH_SCRIPT, "check", url, fixturePath], {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
    } catch (err) {
      console.log(`HASH_ERROR`);
      results.push({ url, status: "hash_error", reason: err.message });
      continue;
    }

    if (hashResult === "CHANGED") {
      console.log("CHANGED → fixture written");
      results.push({ url, status: "changed", fixture: `fixtures/${slug}.txt` });
    } else {
      console.log("UNCHANGED → skipped");
      // Remove the fixture we just wrote — no need to keep unchanged content
      fs.unlinkSync(fixturePath);
      results.push({ url, status: "unchanged" });
    }
  }

  // 3. Print summary
  console.log("\n" + "=".repeat(60));
  console.log("Pipeline Fetch Summary");
  console.log("=".repeat(60));

  const changed = results.filter((r) => r.status === "changed");
  const unchanged = results.filter((r) => r.status === "unchanged");
  const errors = results.filter((r) => !["changed", "unchanged"].includes(r.status));

  console.log(`  Changed:   ${changed.length}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Errors:    ${errors.length}`);
  console.log("");

  if (changed.length > 0) {
    console.log("Changed sources (fixtures written):");
    for (const r of changed) {
      console.log(`  ✓ ${r.url}`);
      console.log(`    → ${r.fixture}`);
    }
  }

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const r of errors) {
      console.log(`  ✗ ${r.url}`);
      console.log(`    → ${r.reason}`);
    }
  }

  console.log("\nDone. Extraction/merging is subagent work — run the full");
  console.log("pipeline via Claude Code to continue.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
