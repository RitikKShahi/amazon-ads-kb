#!/usr/bin/env node
/**
 * verify_integrity.js — Knowledge Base Integrity Scanner
 *
 * Two-layer duplicate detection:
 *   Layer 1: Exact-match duplicates within each file (trivial)
 *   Layer 2: Cross-file semantic similarity using Jaccard index (the hard part)
 *
 * Exit codes:
 *   0 = clean
 *   1 = duplicates found (this tool CAN fail — that's the point)
 *
 * Usage:
 *   node scripts/verify_integrity.js [--threshold 0.7] [--dir knowledge]
 */

const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const THRESHOLD = parseFloat(
  args[args.indexOf("--threshold") + 1] || "0.65"
);
const KB_DIR = args[args.indexOf("--dir") + 1] || "knowledge";

// Common English stop words to ignore when comparing meaning
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

// ── Helpers ───────────────────────────────────────────────────────────

/** Recursively find all concept .md files (skip index.md and log.md). */
function getMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMarkdownFiles(filePath, fileList);
    } else if (
      filePath.endsWith(".md") &&
      !filePath.includes("index.md") &&
      !filePath.includes("log.md")
    ) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/** Extract bullet-point claims from a markdown file's body (not frontmatter or citations). */
function extractClaims(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const claims = [];

  let inFrontmatter = false;
  let frontmatterDone = false;
  let inCitations = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip YAML frontmatter block
    if (trimmed === "---" && !frontmatterDone) {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) frontmatterDone = true;
      continue;
    }
    if (inFrontmatter) continue;

    // Skip the Citations section entirely (shared source URLs are expected)
    if (/^#\s*Citations/i.test(trimmed)) {
      inCitations = true;
      continue;
    }
    // A new top-level heading exits the citations section
    if (/^#\s+[^#]/.test(trimmed) && inCitations) {
      inCitations = false;
    }
    if (inCitations) continue;

    // Extract actual content bullets
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const text = trimmed.replace(/^[-*]\s*/, "").trim();
      if (text.length > 15) {
        claims.push(text);
      }
    }
  }
  return claims;
}

/**
 * Tokenize a claim into a set of meaningful words.
 * Strips markdown formatting, punctuation, lowercases, removes stop words.
 */
function tokenize(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // strip markdown links
    .replace(/\*\*([^*]*)\*\*/g, "$1")       // strip bold
    .replace(/`([^`]*)`/g, "$1")             // strip inline code
    .replace(/[^a-z0-9\s]/g, " ")            // strip punctuation
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w)
  );
  return new Set(words);
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|
 * Returns a value between 0.0 (no overlap) and 1.0 (identical word sets).
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Main ──────────────────────────────────────────────────────────────

function run(kbDir, threshold) {
  const dir = kbDir || KB_DIR;
  const thresh = threshold != null ? threshold : THRESHOLD;
  const files = getMarkdownFiles(dir);

  // Collect all claims tagged with their source file
  const allClaims = []; // { file, text, tokens }
  let totalWithinDups = 0;
  const fileStats = [];

  console.log("==================================================");
  console.log("🔍 KNOWLEDGE BASE INTEGRITY SCAN");
  console.log("==================================================");
  console.log(`   Similarity threshold: ${thresh}`);
  console.log("");

  // ── Layer 1: Within-file exact duplicates ──────────────────────────
  console.log("── Layer 1: Within-File Exact Duplicates ──");
  for (const file of files) {
    const claims = extractClaims(file);
    const seen = new Set();
    let fileDups = 0;

    for (const claim of claims) {
      if (seen.has(claim)) {
        fileDups++;
        totalWithinDups++;
      } else {
        seen.add(claim);
      }
      allClaims.push({
        file: file.replace(dir + "/", ""),
        text: claim,
        tokens: tokenize(claim),
      });
    }

    const status = fileDups === 0 ? "✅ CLEAN" : "❌ DUPS ";
    const relPath = file.replace(dir + "/", "");
    console.log(
      `[${status}] ${relPath.padEnd(45)} | ${claims.length} claims` +
        (fileDups > 0 ? ` (${fileDups} exact dups)` : "")
    );

    fileStats.push({
      file: relPath,
      claims: claims.length,
      withinDups: fileDups,
    });
  }

  console.log("");

  // ── Layer 2: Cross-file semantic similarity ────────────────────────
  console.log("── Layer 2: Cross-File Semantic Similarity ──");
  const crossFileDups = [];

  for (let i = 0; i < allClaims.length; i++) {
    for (let j = i + 1; j < allClaims.length; j++) {
      // Only compare claims from DIFFERENT files
      if (allClaims[i].file === allClaims[j].file) continue;
      // Skip claims with very few tokens (too short to compare meaningfully)
      if (allClaims[i].tokens.size < 4 || allClaims[j].tokens.size < 4)
        continue;

      const sim = jaccardSimilarity(allClaims[i].tokens, allClaims[j].tokens);

      if (sim >= thresh) {
        crossFileDups.push({
          fileA: allClaims[i].file,
          fileB: allClaims[j].file,
          claimA: allClaims[i].text.substring(0, 80),
          claimB: allClaims[j].text.substring(0, 80),
          similarity: sim,
        });
      }
    }
  }

  if (crossFileDups.length === 0) {
    console.log("   ✅ No cross-file duplicates found above threshold.");
  } else {
    for (const dup of crossFileDups) {
      console.log(
        `   ❌ MATCH (${(dup.similarity * 100).toFixed(1)}% similar):`
      );
      console.log(`      File A: ${dup.fileA}`);
      console.log(`        "${dup.claimA}..."`);
      console.log(`      File B: ${dup.fileB}`);
      console.log(`        "${dup.claimB}..."`);
      console.log("");
    }
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log("");
  console.log("==================================================");
  console.log("📊 INTEGRITY REPORT SUMMARY");
  console.log("==================================================");
  console.log(`Total Concepts Scanned     : ${files.length}`);
  console.log(`Total Claims Analyzed      : ${allClaims.length}`);
  console.log(`Within-File Exact Dups     : ${totalWithinDups}`);
  console.log(`Cross-File Semantic Matches: ${crossFileDups.length}`);
  console.log("");

  const totalIssues = totalWithinDups + crossFileDups.length;
  if (totalIssues === 0) {
    console.log(
      "VERDICT: CLEAN. No exact or semantic duplicates detected at the current threshold."
    );
  } else {
    console.log(
      `VERDICT: ${totalIssues} ISSUE(S) FOUND. Review the flagged pairs above.`
    );
  }

  return {
    files: files.length,
    totalClaims: allClaims.length,
    withinFileDups: totalWithinDups,
    crossFileDups: crossFileDups.length,
    crossFileDetails: crossFileDups,
    exitCode: totalIssues > 0 ? 1 : 0,
  };
}

// ── Export for testing, run if called directly ────────────────────────
module.exports = { run, tokenize, jaccardSimilarity, extractClaims };

if (require.main === module) {
  const result = run();
  process.exit(result.exitCode);
}
