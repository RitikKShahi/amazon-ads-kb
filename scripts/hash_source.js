#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/hash_source.js check <url> <normalized-content-file>
 *   node scripts/hash_source.js record <url> <normalized-content-file> <type> <official:true|false>
 *
 * "check" prints CHANGED or UNCHANGED to stdout and exits 0 either way -
 * the Scout/orchestrator step reads this to decide whether to run
 * Extract on this source at all. "record" updates state/sources.json
 * after a successful Extract+Merge for that source.
 *
 * This is intentionally tiny/dependency-free so it's easy to read and
 * trust - the whole point is that this part is deterministic and testable,
 * unlike the LLM-driven stages.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STATE_PATH = path.join(__dirname, "..", "state", "sources.json");

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

function normalize(text) {
  // Deliberately simple: collapse whitespace so trivial formatting churn
  // (extra blank lines, trailing spaces) doesn't register as a "change".
  // Extend this if a real source turns out to be noisy in other ways.
  return text.replace(/\s+/g, " ").trim();
}

function hashOf(text) {
  return crypto.createHash("sha256").update(normalize(text)).digest("hex");
}

function main() {
  const [, , cmd, url, contentFile, type, officialStr] = process.argv;
  if (!cmd || !url || !contentFile) {
    console.error("Usage: hash_source.js <check|record> <url> <content-file> [type] [official]");
    process.exit(1);
  }

  const content = fs.readFileSync(contentFile, "utf-8");
  const hash = hashOf(content);
  const state = loadState();
  const prev = state[url];

  if (cmd === "check") {
    if (!prev || prev.hash !== hash) {
      console.log("CHANGED");
    } else {
      console.log("UNCHANGED");
    }
    process.exit(0);
  }

  if (cmd === "record") {
    const now = new Date().toISOString();
    state[url] = {
      hash,
      type: type || (prev && prev.type) || "unknown",
      official: officialStr ? officialStr === "true" : prev ? prev.official : false,
      first_seen: prev ? prev.first_seen : now,
      last_fetched: now,
      last_changed: !prev || prev.hash !== hash ? now : prev.last_changed,
    };
    saveState(state);
    console.log(`Recorded ${url} (${state[url].last_changed === now ? "changed" : "unchanged"})`);
    process.exit(0);
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main();
