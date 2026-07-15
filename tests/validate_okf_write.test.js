const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const SCRIPT = path.join(__dirname, "..", "scripts", "validate_okf_write.js");

/**
 * Helper: runs validate_okf_write.js with the given payload piped on stdin.
 * Returns { status, stdout, stderr }.
 */
function run(payload) {
  const input =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  try {
    const stdout = execFileSync("node", [SCRIPT], {
      input,
      encoding: "utf-8",
      timeout: 5000,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    };
  }
}

// ----- Helpers to build payloads -----

function writePayload(filePath, content) {
  return {
    session_id: "test-session",
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: filePath, content },
  };
}

function editPayload(filePath, oldStr, newStr) {
  return {
    session_id: "test-session",
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: { file_path: filePath, old_string: oldStr, new_string: newStr },
  };
}

const VALID_CONTENT = `---
type: Reference
title: Test Concept
timestamp: 2026-07-14T00:00:00Z
---

# Test Concept

Some body text.

# Citations

- [Source](https://example.com)
`;

// ===================================================================
// Tests
// ===================================================================

describe("validate_okf_write.js", () => {
  // ----- Allow cases -----

  it("allows a valid OKF concept file under knowledge/", () => {
    const res = run(writePayload("/repo/knowledge/metrics/test.md", VALID_CONTENT));
    assert.equal(res.status, 0);
  });

  it("allows files not under knowledge/", () => {
    const res = run(writePayload("/repo/src/app.js", "anything"));
    assert.equal(res.status, 0);
  });

  it("allows non-.md files under knowledge/", () => {
    const res = run(writePayload("/repo/knowledge/data.json", "{}"));
    assert.equal(res.status, 0);
  });

  it("allows reserved file index.md", () => {
    const res = run(writePayload("/repo/knowledge/index.md", "# Index"));
    assert.equal(res.status, 0);
  });

  it("allows reserved file log.md", () => {
    const res = run(writePayload("/repo/knowledge/log.md", "# Log"));
    assert.equal(res.status, 0);
  });

  it("allows when stdin is not valid JSON (graceful fallback)", () => {
    const res = run("not json at all");
    assert.equal(res.status, 0);
  });

  it("allows when tool_input has no file_path", () => {
    const res = run({ tool_input: {} });
    assert.equal(res.status, 0);
  });

  it("allows when content is empty (e.g. Read-then-Edit flow)", () => {
    const res = run(writePayload("/repo/knowledge/apis/test.md", ""));
    assert.equal(res.status, 0);
  });

  // ----- Taxonomy enforcement -----

  it("allows writes under allowed top-level directories", () => {
    const allowed = ["ad-products", "apis", "metrics", "glossary", "strategy"];
    for (const dir of allowed) {
      const res = run(writePayload(`/repo/knowledge/${dir}/test.md`, VALID_CONTENT));
      assert.equal(res.status, 0, `Failed for ${dir}`);
    }
  });

  it("blocks writes under disallowed top-level directories", () => {
    const disallowed = ["api", "sponsored-products", "advertising"];
    for (const dir of disallowed) {
      const res = run(writePayload(`/repo/knowledge/${dir}/test.md`, VALID_CONTENT));
      assert.equal(res.status, 2, `Should block ${dir}`);
      assert.match(res.stderr, new RegExp(`is under '${dir}/' which isn't an allowed top-level directory`));
    }
  });

  // ----- Block cases -----

  it("blocks knowledge .md with no frontmatter", () => {
    const res = run(writePayload("/repo/knowledge/apis/test.md", "# No frontmatter\n\n# Citations\n"));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /no YAML frontmatter/i);
  });

  it("blocks when frontmatter is missing 'type'", () => {
    const content = `---
title: Test
timestamp: 2026-07-14
---

# Test

# Citations
`;
    const res = run(writePayload("/repo/knowledge/apis/test.md", content));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /missing.*type/i);
  });

  it("blocks when frontmatter is missing 'title'", () => {
    const content = `---
type: Reference
timestamp: 2026-07-14
---

# Test

# Citations
`;
    const res = run(writePayload("/repo/knowledge/apis/test.md", content));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /missing.*title/i);
  });

  it("blocks when frontmatter is missing 'timestamp'", () => {
    const content = `---
type: Reference
title: Test
---

# Test

# Citations
`;
    const res = run(writePayload("/repo/knowledge/apis/test.md", content));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /missing.*timestamp/i);
  });

  it("blocks when timestamp is not ISO 8601", () => {
    const content = `---
type: Reference
title: Test
timestamp: July 14th
---

# Test

# Citations
`;
    const res = run(writePayload("/repo/knowledge/apis/test.md", content));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /ISO 8601/i);
  });

  it("blocks when body is missing # Citations section", () => {
    const content = `---
type: Reference
title: Test
timestamp: 2026-07-14
---

# Test

No citations section here.
`;
    const res = run(writePayload("/repo/knowledge/apis/test.md", content));
    assert.equal(res.status, 2);
    assert.match(res.stderr, /Citations/i);
  });

  // ----- Payload shape: matches Claude Code docs exactly -----

  it("works with the exact Write tool payload shape from Claude Code docs", () => {
    const payload = {
      session_id: "abc123",
      transcript_path: "/Users/test/.claude/projects/test/transcript.jsonl",
      cwd: "/Users/test/project",
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: "/Users/test/project/knowledge/apis/auth.md",
        content: VALID_CONTENT,
      },
    };
    const res = run(payload);
    assert.equal(res.status, 0);
  });

  it("works with the exact Edit tool payload shape from Claude Code docs", () => {
    const payload = {
      session_id: "abc123",
      transcript_path: "/Users/test/.claude/projects/test/transcript.jsonl",
      cwd: "/Users/test/project",
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: "/Users/test/project/knowledge/metrics/acos.md",
        old_string: "old text",
        new_string: VALID_CONTENT,
      },
    };
    const res = run(payload);
    assert.equal(res.status, 0);
  });

  it("Edit tool: blocks when new_string has bad frontmatter", () => {
    const payload = {
      session_id: "abc123",
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: "/repo/knowledge/apis/test.md",
        old_string: "old",
        new_string: "# No frontmatter here\n",
      },
    };
    const res = run(payload);
    assert.equal(res.status, 2);
  });
});
