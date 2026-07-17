#!/usr/bin/env node
/**
 * merge_logic.js — Deterministic merge rules extracted from the Merger agent.
 *
 * The Merger agent (merger.md) uses LLM judgment for ambiguous cases,
 * but the core rules — concept matching, trust resolution, duplicate
 * detection — are deterministic and testable. This module encodes them.
 *
 * Exported for testing; also usable as a pre-merge validator.
 */

const fs = require("fs");
const path = require("path");

// ── Alias Map ────────────────────────────────────────────────────────
// Known aliases → canonical concept IDs (from dedup-merge skill)
const ALIASES = {
  acos: "metrics/acos",
  "advertising-cost-of-sale": "metrics/acos",
  "ad-cost-of-sale": "metrics/acos",
  tacos: "metrics/tacos",
  "total-advertising-cost-of-sale": "metrics/tacos",
  roas: "metrics/roas",
  "return-on-ad-spend": "metrics/roas",
  sp: "ad-products/sponsored-products",
  "sponsored-products": "ad-products/sponsored-products",
  sd: "ad-products/sponsored-display",
  "sponsored-display": "ad-products/sponsored-display",
  dsp: "ad-products/dsp",
  "amazon-dsp": "ad-products/dsp",
  "demand-side-platform": "ad-products/dsp",
};

// Allowed top-level directories
const ALLOWED_DIRS = [
  "ad-products",
  "apis",
  "metrics",
  "glossary",
  "strategy",
];

// ── Concept Matching ─────────────────────────────────────────────────

/**
 * Resolve a concept_guess to a canonical concept ID.
 *
 * Follows the dedup-merge skill priority order:
 *   1. Exact path match against existing files
 *   2. Alias lookup
 *   3. Keyword/title overlap (simplified: slug overlap)
 *   4. New concept
 *
 * @param {string} guess - The concept_guess from the extractor
 * @param {string[]} existingIds - Array of existing concept IDs (e.g. ["metrics/acos", "ad-products/dsp"])
 * @returns {{ id: string, action: "exact"|"alias"|"keyword"|"new" }}
 */
function resolveConceptId(guess, existingIds) {
  const normalized = guess.toLowerCase().replace(/\.md$/, "").trim();

  // 1. Exact match
  if (existingIds.includes(normalized)) {
    return { id: normalized, action: "exact" };
  }

  // 2. Alias lookup
  const slug = normalized.split("/").pop(); // e.g. "metrics/acos" → "acos"
  if (ALIASES[slug]) {
    const canonical = ALIASES[slug];
    if (existingIds.includes(canonical)) {
      return { id: canonical, action: "alias" };
    }
  }
  // Also try the full normalized string as an alias key
  if (ALIASES[normalized]) {
    const canonical = ALIASES[normalized];
    if (existingIds.includes(canonical)) {
      return { id: canonical, action: "alias" };
    }
  }

  // 3. Keyword overlap — check if the slug's main noun appears in any existing ID
  for (const existingId of existingIds) {
    const existingSlug = existingId.split("/").pop();
    // If one contains the other (e.g. "sponsored-products-bid-strategy" contains "sponsored-products")
    if (
      slug.includes(existingSlug) ||
      existingSlug.includes(slug)
    ) {
      return { id: existingId, action: "keyword" };
    }
  }

  // 4. New concept
  return { id: normalized, action: "new" };
}

// ── Trust Resolution ─────────────────────────────────────────────────

/**
 * Resolve a conflict between two claims from different sources.
 *
 * Rules from dedup-merge skill:
 *   - Official beats unofficial
 *   - Equal rank: keep both, add a Note
 *   - Never silently pick one
 *
 * @param {{ claim: string, official: boolean }} claimA
 * @param {{ claim: string, official: boolean }} claimB
 * @returns {{ winner: string|null, keepBoth: boolean, note: string }}
 */
function resolveTrust(claimA, claimB) {
  if (claimA.official && !claimB.official) {
    return {
      winner: claimA.claim,
      keepBoth: false,
      note: "Official source takes precedence over unofficial.",
    };
  }

  if (!claimA.official && claimB.official) {
    return {
      winner: claimB.claim,
      keepBoth: false,
      note: "Official source takes precedence over unofficial.",
    };
  }

  // Same tier — keep both, add note (never silently pick one)
  return {
    winner: null,
    keepBoth: true,
    note:
      "Sources of equal authority disagree. Both claims are preserved with a ## Note.",
  };
}

// ── Duplicate Claim Detection ────────────────────────────────────────

/**
 * Check if a new claim is already covered by existing claims in a concept.
 *
 * Uses simple word-overlap (same approach as verify_integrity's Jaccard).
 *
 * @param {string} newClaim
 * @param {string[]} existingClaims
 * @param {number} threshold - Jaccard threshold (default 0.65)
 * @returns {{ isDuplicate: boolean, matchedClaim: string|null, similarity: number }}
 */
function isDuplicateClaim(newClaim, existingClaims, threshold = 0.65) {
  const newTokens = tokenize(newClaim);
  let bestMatch = null;
  let bestSim = 0;

  for (const existing of existingClaims) {
    const existingTokens = tokenize(existing);
    const sim = jaccardSimilarity(newTokens, existingTokens);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = existing;
    }
  }

  return {
    isDuplicate: bestSim >= threshold,
    matchedClaim: bestSim >= threshold ? bestMatch : null,
    similarity: bestSim,
  };
}

// ── Directory Validation ─────────────────────────────────────────────

/**
 * Check if a concept ID's top-level directory is in the allowed list.
 */
function isAllowedDirectory(conceptId) {
  const topDir = conceptId.split("/")[0];
  return ALLOWED_DIRS.includes(topDir);
}

// ── Shared helpers (same as verify_integrity) ────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "of", "in", "to",
  "for", "with", "on", "at", "from", "by", "about", "as", "into",
  "through", "during", "before", "after", "above", "below", "between",
  "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
  "neither", "each", "every", "all", "any", "few", "more", "most",
  "other", "some", "such", "no", "only", "own", "same", "than", "too",
  "very", "just", "because", "if", "when", "where", "how", "what",
  "which", "who", "whom", "this", "that", "these", "those", "it", "its",
  "they", "them", "their", "we", "our", "you", "your", "he", "she",
  "him", "her", "his",
]);

function tokenize(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w)
  );
  return new Set(words);
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Exports ──────────────────────────────────────────────────────────
module.exports = {
  ALIASES,
  ALLOWED_DIRS,
  resolveConceptId,
  resolveTrust,
  isDuplicateClaim,
  isAllowedDirectory,
  tokenize,
  jaccardSimilarity,
};
