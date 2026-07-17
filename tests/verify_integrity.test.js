const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  run,
  tokenize,
  jaccardSimilarity,
  extractClaims,
} = require("../scripts/verify_integrity");

/**
 * Create a temp knowledge directory with concept files for testing.
 * Returns the temp dir path.
 */
function createTempKB(files) {
  const tmpDir = path.join(
    os.tmpdir(),
    `kb_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ── Unit tests for tokenize ──────────────────────────────────────────

describe("tokenize", () => {
  it("lowercases and removes stop words", () => {
    const tokens = tokenize("The Amazon DSP is a Demand-Side Platform");
    assert.ok(tokens.has("amazon"));
    assert.ok(tokens.has("dsp"));
    assert.ok(tokens.has("demand"));
    assert.ok(!tokens.has("the"));
    assert.ok(!tokens.has("is"));
    assert.ok(!tokens.has("a"));
  });

  it("strips markdown formatting before tokenizing", () => {
    const tokens = tokenize(
      "**Bold text** and [link](https://example.com) and `code`"
    );
    assert.ok(tokens.has("bold"));
    assert.ok(tokens.has("text"));
    assert.ok(tokens.has("link"));
    assert.ok(tokens.has("code"));
    assert.ok(!tokens.has("https"));
  });
});

// ── Unit tests for jaccardSimilarity ─────────────────────────────────

describe("jaccardSimilarity", () => {
  it("returns 1.0 for identical sets", () => {
    const s = new Set(["amazon", "dsp", "platform"]);
    assert.equal(jaccardSimilarity(s, s), 1.0);
  });

  it("returns 0.0 for completely disjoint sets", () => {
    const a = new Set(["amazon", "dsp"]);
    const b = new Set(["google", "adwords"]);
    assert.equal(jaccardSimilarity(a, b), 0.0);
  });

  it("returns a value between 0 and 1 for partial overlap", () => {
    const a = new Set(["amazon", "dsp", "platform"]);
    const b = new Set(["amazon", "dsp", "programmatic"]);
    const sim = jaccardSimilarity(a, b);
    assert.ok(sim > 0 && sim < 1, `Expected 0 < ${sim} < 1`);
    // 2 shared / 4 union = 0.5
    assert.equal(sim, 0.5);
  });
});

// ── Unit tests for extractClaims ─────────────────────────────────────

describe("extractClaims", () => {
  it("extracts bullet points from the body, not frontmatter", () => {
    const tmpDir = createTempKB({
      "test/concept.md": [
        "---",
        "type: Reference",
        "title: Test",
        "sources:",
        "  - url: https://example.com",
        "    official: true",
        "---",
        "# Test Concept",
        "- This is a real claim about advertising",
        "- Short",
        "# Citations",
        "- [Source](https://example.com) — official, confirmed",
      ].join("\n"),
    });
    const claims = extractClaims(path.join(tmpDir, "test/concept.md"));
    // Should find the real claim but NOT the citation or frontmatter
    assert.equal(claims.length, 1);
    assert.ok(claims[0].includes("real claim about advertising"));
    cleanup(tmpDir);
  });

  it("skips claims inside the Citations section", () => {
    const tmpDir = createTempKB({
      "test/concept.md": [
        "---",
        "type: Reference",
        "title: Test",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# Body",
        "- A real claim with enough words to pass the filter",
        "# Citations",
        "- [Amazon Ads API Overview](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-15",
      ].join("\n"),
    });
    const claims = extractClaims(path.join(tmpDir, "test/concept.md"));
    assert.equal(claims.length, 1);
    assert.ok(!claims[0].includes("amazon.com"));
    cleanup(tmpDir);
  });
});

// ── Integration: Cross-file duplicate detection ──────────────────────

describe("cross-file duplicate detection", () => {
  it("catches an identical claim planted across two files", () => {
    const shared = "Amazon DSP enables programmatic ad buying across multiple channels";
    const tmpDir = createTempKB({
      "cat-a/file-a.md": [
        "---",
        "type: Reference",
        "title: File A",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File A",
        `- ${shared}`,
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
      "cat-b/file-b.md": [
        "---",
        "type: Reference",
        "title: File B",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File B",
        `- ${shared}`,
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
    });

    const result = run(tmpDir, 0.65);
    assert.ok(
      result.crossFileDups > 0,
      `Expected cross-file dups > 0, got ${result.crossFileDups}`
    );
    assert.equal(result.exitCode, 1, "Should exit with code 1");
    cleanup(tmpDir);
  });

  it("catches the same fact worded differently across two files", () => {
    const tmpDir = createTempKB({
      "cat-a/file-a.md": [
        "---",
        "type: Reference",
        "title: File A",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File A",
        "- Cost-Per-Click (CPC) means you pay when customers click your ads",
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
      "cat-b/file-b.md": [
        "---",
        "type: Reference",
        "title: File B",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File B",
        "- CPC (Cost-Per-Click) lets you pay when customers click on your ads",
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
    });

    const result = run(tmpDir, 0.65);
    assert.ok(
      result.crossFileDups > 0,
      `Expected semantically similar claims to be caught, got ${result.crossFileDups}`
    );
    assert.equal(result.exitCode, 1, "Should exit with code 1");
    cleanup(tmpDir);
  });

  it("passes clean when two files have completely unrelated claims", () => {
    const tmpDir = createTempKB({
      "cat-a/file-a.md": [
        "---",
        "type: Reference",
        "title: File A",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File A",
        "- Amazon DSP enables programmatic ad buying across channels",
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
      "cat-b/file-b.md": [
        "---",
        "type: Reference",
        "title: File B",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File B",
        "- TACOS measures total advertising spend relative to overall revenue",
        "# Citations",
        "- [Source](https://example.com)",
      ].join("\n"),
    });

    const result = run(tmpDir, 0.65);
    assert.equal(
      result.crossFileDups,
      0,
      `Expected 0 cross-file dups for unrelated claims, got ${result.crossFileDups}`
    );
    assert.equal(result.exitCode, 0, "Should exit cleanly");
    cleanup(tmpDir);
  });

  it("does not flag shared citation URLs as duplicates", () => {
    const tmpDir = createTempKB({
      "cat-a/file-a.md": [
        "---",
        "type: Reference",
        "title: File A",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File A",
        "- Amazon DSP uses real-time bidding technology for ad placement",
        "# Citations",
        "- [Amazon Ads API Overview](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-15",
      ].join("\n"),
      "cat-b/file-b.md": [
        "---",
        "type: Reference",
        "title: File B",
        "timestamp: 2026-01-01T00:00:00Z",
        "---",
        "# File B",
        "- Sponsored Products use keyword targeting for search placement",
        "# Citations",
        "- [Amazon Ads API Overview](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-15",
      ].join("\n"),
    });

    const result = run(tmpDir, 0.65);
    assert.equal(
      result.crossFileDups,
      0,
      "Shared citations should NOT be flagged as content duplicates"
    );
    assert.equal(result.exitCode, 0);
    cleanup(tmpDir);
  });
});
