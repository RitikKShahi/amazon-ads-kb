const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const SCRIPT = path.join(__dirname, "..", "scripts", "hash_source.js");
const STATE_PATH = path.join(__dirname, "..", "state", "sources.json");

// We back up and restore state/sources.json so tests don't corrupt real state.
let originalState;

beforeEach(() => {
  originalState = fs.existsSync(STATE_PATH)
    ? fs.readFileSync(STATE_PATH, "utf-8")
    : null;
  // Start with empty state for test isolation
  fs.writeFileSync(STATE_PATH, "{}\n");
});

afterEach(() => {
  if (originalState !== null) {
    fs.writeFileSync(STATE_PATH, originalState);
  } else if (fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, "{}\n");
  }
});

/**
 * Write content to a temp file and return its path.
 */
function writeTmp(content) {
  const tmp = path.join(os.tmpdir(), `hash_test_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tmp, content);
  return tmp;
}

/**
 * Run hash_source.js with args; returns { status, stdout, stderr }.
 */
function run(...args) {
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return { status: 0, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return {
      status: err.status,
      stdout: (err.stdout || "").trim(),
      stderr: (err.stderr || "").trim(),
    };
  }
}

describe("hash_source.js", () => {
  // ----- check command -----

  describe("check", () => {
    it("prints CHANGED for a new URL not in state", () => {
      const tmp = writeTmp("hello world");
      const res = run("check", "https://example.com/new", tmp);
      assert.equal(res.status, 0);
      assert.equal(res.stdout, "CHANGED");
      fs.unlinkSync(tmp);
    });

    it("prints UNCHANGED when content hasn't changed", () => {
      const tmp = writeTmp("hello world");
      // Record first
      run("record", "https://example.com/same", tmp, "doc", "true");
      // Then check
      const res = run("check", "https://example.com/same", tmp);
      assert.equal(res.status, 0);
      assert.equal(res.stdout, "UNCHANGED");
      fs.unlinkSync(tmp);
    });

    it("prints CHANGED when content has changed", () => {
      const tmp1 = writeTmp("version 1");
      run("record", "https://example.com/diff", tmp1, "doc", "true");
      fs.unlinkSync(tmp1);

      const tmp2 = writeTmp("version 2");
      const res = run("check", "https://example.com/diff", tmp2);
      assert.equal(res.status, 0);
      assert.equal(res.stdout, "CHANGED");
      fs.unlinkSync(tmp2);
    });

    it("normalizes whitespace so trivial formatting doesn't register as change", () => {
      const tmp1 = writeTmp("hello   world\n\n\n");
      run("record", "https://example.com/ws", tmp1, "doc", "true");
      fs.unlinkSync(tmp1);

      // Same words, different whitespace
      const tmp2 = writeTmp("hello world\n");
      const res = run("check", "https://example.com/ws", tmp2);
      assert.equal(res.status, 0);
      assert.equal(res.stdout, "UNCHANGED");
      fs.unlinkSync(tmp2);
    });
  });

  // ----- record command -----

  describe("record", () => {
    it("creates a new entry with correct fields", () => {
      const tmp = writeTmp("content here");
      run("record", "https://example.com/rec", tmp, "official_doc", "true");
      fs.unlinkSync(tmp);

      const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      const entry = state["https://example.com/rec"];
      assert.ok(entry, "entry should exist in state");
      assert.equal(entry.type, "official_doc");
      assert.equal(entry.official, true);
      assert.ok(entry.hash, "hash should be present");
      assert.ok(entry.first_seen, "first_seen should be present");
      assert.ok(entry.last_fetched, "last_fetched should be present");
      assert.ok(entry.last_changed, "last_changed should be present");
    });

    it("preserves first_seen on update", () => {
      const tmp1 = writeTmp("v1");
      run("record", "https://example.com/preserve", tmp1, "doc", "false");
      fs.unlinkSync(tmp1);

      const state1 = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      const firstSeen = state1["https://example.com/preserve"].first_seen;

      const tmp2 = writeTmp("v2");
      run("record", "https://example.com/preserve", tmp2, "doc", "false");
      fs.unlinkSync(tmp2);

      const state2 = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      assert.equal(state2["https://example.com/preserve"].first_seen, firstSeen);
    });

    it("does not update last_changed when content is the same", () => {
      const tmp = writeTmp("stable content");
      run("record", "https://example.com/stable", tmp, "doc", "true");

      const state1 = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      const lastChanged1 = state1["https://example.com/stable"].last_changed;

      // Record again with same content (after a small delay)
      run("record", "https://example.com/stable", tmp, "doc", "true");
      fs.unlinkSync(tmp);

      const state2 = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      assert.equal(state2["https://example.com/stable"].last_changed, lastChanged1);
    });
  });

  // ----- error cases -----

  describe("errors", () => {
    it("exits 1 for unknown command", () => {
      const tmp = writeTmp("x");
      const res = run("badcommand", "https://example.com", tmp);
      assert.equal(res.status, 1);
      fs.unlinkSync(tmp);
    });

    it("exits 1 when required args are missing", () => {
      const res = run("check");
      assert.equal(res.status, 1);
    });
  });
});
