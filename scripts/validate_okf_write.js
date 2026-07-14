#!/usr/bin/env node
/**
 * PreToolUse hook for Write/Edit. Reads the hook payload Claude Code sends
 * on stdin, and if the target file is under knowledge/ and is a .md file,
 * validates that its frontmatter is well-formed OKF before allowing the
 * write to proceed.
 *
 * Exit code 0  -> allow
 * Exit code 2  -> block; stderr is surfaced back to Claude so it can fix
 *                 the content and retry (per Claude Code hook conventions)
 *
 * NOTE: the exact shape of the hook payload can change between Claude Code
 * versions - if this doesn't fire as expected, run `claude` with a trivial
 * write and inspect what's actually sent on stdin, then adjust the field
 * names below. Treat this file as a starting point, not gospel.
 */

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf-8");
  } catch (e) {
    return "";
  }
}

function extractFilePathAndContent(payload) {
  // Claude Code PreToolUse hook payloads nest tool call args under
  // "tool_input". Per the official docs:
  //   Write tool → { file_path, content }
  //   Edit  tool → { file_path, old_string, new_string }
  const input = payload.tool_input || {};
  const filePath = input.file_path;
  // For Write, "content" is the full file; for Edit, "new_string" is the
  // replacement text. We validate whichever is present.
  const content = input.content ?? input.new_string ?? "";
  return { filePath, content };
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const fm = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

function fail(msg) {
  process.stderr.write(`[okf-validate] BLOCKED: ${msg}\n`);
  process.exit(2);
}

function main() {
  const raw = readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    // If we can't parse the payload, don't block the whole pipeline on a
    // hook plumbing issue - allow, but say why.
    process.stderr.write("[okf-validate] warning: could not parse hook payload, allowing\n");
    process.exit(0);
  }

  const { filePath, content } = extractFilePathAndContent(payload);
  if (!filePath) process.exit(0); // nothing to validate against

  const isKnowledgeFile =
    filePath.includes("/knowledge/") || filePath.startsWith("knowledge/");
  const isReserved =
    filePath.endsWith("/index.md") ||
    filePath.endsWith("/log.md") ||
    filePath.endsWith("index.md") ||
    filePath.endsWith("log.md");

  if (!isKnowledgeFile || !filePath.endsWith(".md")) process.exit(0);
  if (isReserved) process.exit(0); // index/log have their own conventions, skip frontmatter check

  if (!content) process.exit(0); // nothing to validate yet (e.g. a Read-then-Edit flow)

  const fm = parseFrontmatter(content);
  if (!fm) fail(`${filePath} has no YAML frontmatter block (--- ... ---).`);
  if (!fm.type) fail(`${filePath} frontmatter is missing required field 'type'.`);
  if (!fm.title) fail(`${filePath} frontmatter is missing 'title' (recommended by this project).`);
  if (!fm.timestamp) fail(`${filePath} frontmatter is missing 'timestamp'.`);
  if (fm.timestamp && !/^\d{4}-\d{2}-\d{2}/.test(fm.timestamp)) {
    fail(`${filePath} 'timestamp' does not look like ISO 8601 (${fm.timestamp}).`);
  }
  if (!content.includes("# Citations")) {
    fail(`${filePath} body is missing a '# Citations' section - every concept must cite its sources.`);
  }

  process.exit(0);
}

main();
