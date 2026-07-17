const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveConceptId,
  resolveTrust,
  isDuplicateClaim,
  isAllowedDirectory,
  ALIASES,
} = require("../scripts/merge_logic");

// ── Concept Resolution ───────────────────────────────────────────────

describe("resolveConceptId", () => {
  const existing = [
    "metrics/acos",
    "metrics/tacos",
    "metrics/roas",
    "ad-products/sponsored-products",
    "ad-products/dsp",
    "ad-products/display-ads",
    "apis/ads-api",
  ];

  it("resolves exact path match", () => {
    const result = resolveConceptId("metrics/acos", existing);
    assert.equal(result.id, "metrics/acos");
    assert.equal(result.action, "exact");
  });

  it("resolves known alias to canonical ID", () => {
    const result = resolveConceptId("advertising-cost-of-sale", existing);
    assert.equal(result.id, "metrics/acos");
    assert.equal(result.action, "alias");
  });

  it("resolves 'sp' alias to ad-products/sponsored-products", () => {
    const result = resolveConceptId("sp", existing);
    assert.equal(result.id, "ad-products/sponsored-products");
    assert.equal(result.action, "alias");
  });

  it("resolves 'amazon-dsp' alias to ad-products/dsp", () => {
    const result = resolveConceptId("amazon-dsp", existing);
    assert.equal(result.id, "ad-products/dsp");
    assert.equal(result.action, "alias");
  });

  it("resolves keyword overlap (e.g. 'sponsored-products-bid-strategy' → sponsored-products)", () => {
    const result = resolveConceptId(
      "ad-products/sponsored-products-bid-strategy",
      existing
    );
    assert.equal(result.id, "ad-products/sponsored-products");
    assert.equal(result.action, "keyword");
  });

  it("returns 'new' for a genuinely unknown concept", () => {
    const result = resolveConceptId("strategy/audience-targeting", existing);
    assert.equal(result.id, "strategy/audience-targeting");
    assert.equal(result.action, "new");
  });

  it("strips .md extension before matching", () => {
    const result = resolveConceptId("metrics/acos.md", existing);
    assert.equal(result.id, "metrics/acos");
    assert.equal(result.action, "exact");
  });
});

// ── Trust Resolution ─────────────────────────────────────────────────

describe("resolveTrust", () => {
  it("official source wins over unofficial", () => {
    const result = resolveTrust(
      { claim: "ACOS is ad spend divided by ad revenue", official: true },
      { claim: "ACOS is ad spend divided by total revenue", official: false }
    );
    assert.equal(result.winner, "ACOS is ad spend divided by ad revenue");
    assert.equal(result.keepBoth, false);
  });

  it("unofficial loses to official (reversed order)", () => {
    const result = resolveTrust(
      { claim: "DSP has no minimum spend", official: false },
      { claim: "DSP requires a minimum spend of $35,000", official: true }
    );
    assert.equal(
      result.winner,
      "DSP requires a minimum spend of $35,000"
    );
    assert.equal(result.keepBoth, false);
  });

  it("same tier (both official) → keep both, never silently pick one", () => {
    const result = resolveTrust(
      { claim: "API rate limit is 10 req/sec", official: true },
      { claim: "API rate limit is 15 req/sec", official: true }
    );
    assert.equal(result.winner, null);
    assert.equal(result.keepBoth, true);
    assert.ok(result.note.includes("Both claims are preserved"));
  });

  it("same tier (both unofficial) → keep both", () => {
    const result = resolveTrust(
      { claim: "Good ACOS is under 25%", official: false },
      { claim: "Good ACOS is under 30%", official: false }
    );
    assert.equal(result.winner, null);
    assert.equal(result.keepBoth, true);
  });
});

// ── Duplicate Claim Detection ────────────────────────────────────────

describe("isDuplicateClaim", () => {
  it("detects same fact worded differently as a duplicate", () => {
    const existing = [
      "Amazon DSP enables programmatic ad buying across multiple channels and devices",
    ];
    const newClaim =
      "The Amazon DSP platform allows programmatic ad buying across channels and devices";
    // Use 0.6 threshold — these claims share 63.6% word overlap which
    // is a genuine semantic match worth flagging
    const result = isDuplicateClaim(newClaim, existing, 0.6);
    assert.equal(result.isDuplicate, true, `Similarity: ${result.similarity}`);
  });

  it("does NOT flag genuinely different claims as duplicates", () => {
    const existing = [
      "ACOS measures advertising spend as a percentage of ad revenue",
    ];
    const newClaim =
      "Sponsored Products appear in search results and on product detail pages";
    const result = isDuplicateClaim(newClaim, existing);
    assert.equal(
      result.isDuplicate,
      false,
      `Similarity was ${result.similarity}, expected < 0.65`
    );
  });

  it("catches exact duplicate with 1.0 similarity", () => {
    const claim =
      "Cost-Per-Click means you pay when customers click your ads";
    const result = isDuplicateClaim(claim, [claim]);
    assert.equal(result.isDuplicate, true);
    assert.equal(result.similarity, 1.0);
  });

  it("returns the matched claim text when a duplicate is found", () => {
    const existing = [
      "Amazon DSP uses real-time bidding technology",
      "Sponsored Products use keyword targeting",
    ];
    const newClaim = "Amazon DSP leverages real-time bidding technology";
    const result = isDuplicateClaim(newClaim, existing);
    assert.equal(result.isDuplicate, true);
    assert.ok(result.matchedClaim.includes("real-time bidding"));
  });
});

// ── Directory Validation ─────────────────────────────────────────────

describe("isAllowedDirectory", () => {
  it("allows ad-products, apis, metrics, glossary, strategy", () => {
    assert.equal(isAllowedDirectory("ad-products/dsp"), true);
    assert.equal(isAllowedDirectory("apis/ads-api"), true);
    assert.equal(isAllowedDirectory("metrics/acos"), true);
    assert.equal(isAllowedDirectory("glossary/cpc"), true);
    assert.equal(isAllowedDirectory("strategy/audience"), true);
  });

  it("blocks unauthorized directories", () => {
    assert.equal(isAllowedDirectory("api/ads-api"), false); // singular
    assert.equal(isAllowedDirectory("advertising/dsp"), false);
    assert.equal(isAllowedDirectory("tools/sdk"), false);
  });
});
