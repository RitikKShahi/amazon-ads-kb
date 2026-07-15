const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { generateIndex } = require("../scripts/generate_index.js");
const { appendLog } = require("../scripts/append_log.js");

describe("knowledge helpers", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-tests-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("generateIndex()", () => {
    it("should produce valid markdown index from knowledge/ files", () => {
      fs.writeFileSync(path.join(tempDir, "concept1.md"), "---\ntitle: Concept One\ndescription: First concept\n---\nBody1");
      fs.writeFileSync(path.join(tempDir, "concept2.md"), "---\ntitle: Concept Two\n---\nBody2");
      fs.writeFileSync(path.join(tempDir, "ignore.txt"), "not md");
      
      generateIndex(tempDir);
      
      const indexPath = path.join(tempDir, "index.md");
      assert.ok(fs.existsSync(indexPath));
      const content = fs.readFileSync(indexPath, "utf-8");
      
      assert.match(content, /# /);
      assert.match(content, /- \[Concept One\]\(.*concept1\.md\) — First concept/);
      assert.match(content, /- \[Concept Two\]\(.*concept2\.md\)/);
      assert.doesNotMatch(content, /ignore\.txt/);
    });

    it("should list all concept files with correct relative links", () => {
      const metricsDir = path.join(tempDir, "metrics");
      fs.mkdirSync(metricsDir);
      fs.writeFileSync(path.join(metricsDir, "acos.md"), "---\ntitle: ACOS\ndescription: ad spend\n---\n");
      
      generateIndex(metricsDir);
      
      const content = fs.readFileSync(path.join(metricsDir, "index.md"), "utf-8");
      assert.match(content, /- \[ACOS\]\(.*acos\.md\) — ad spend/);
    });

    it("should use explicit mapping for known directory headers", () => {
      const adProductsDir = path.join(tempDir, "ad-products");
      fs.mkdirSync(adProductsDir);
      generateIndex(adProductsDir);
      const adContent = fs.readFileSync(path.join(adProductsDir, "index.md"), "utf-8");
      assert.match(adContent, /# Ad Products/);
      
      const apisDir = path.join(tempDir, "apis");
      fs.mkdirSync(apisDir);
      generateIndex(apisDir);
      const apiContent = fs.readFileSync(path.join(apisDir, "index.md"), "utf-8");
      assert.match(apiContent, /# APIs/);
    });
  });

  describe("appendLog()", () => {
    it("should append a dated entry to log.md", () => {
      const logPath = path.join(tempDir, "log.md");
      const entries = [
        { concept_path: "metrics/acos.md", action: "updated", note: "added TACOS comparison" },
        { concept_path: "ad-products/sb.md", action: "created" }
      ];
      
      appendLog(entries, logPath);
      
      const content = fs.readFileSync(logPath, "utf-8");
      assert.match(content, /# Change Log/);
      assert.match(content, /## 20\d\d-\d\d-\d\d/);
      assert.match(content, /- Updated `metrics\/acos\.md`: added TACOS comparison/);
      assert.match(content, /- Created `ad-products\/sb\.md`/);
    });

    it("should keep newest entries first", () => {
      const logPath = path.join(tempDir, "log.md");
      const header = "# Change Log\n\nNewest entries first. One entry per concept created/changed per run.\n\n";
      fs.writeFileSync(logPath, header + "## 2026-01-01\n- Updated `old.md`\n\n");
      
      const entries = [
        { concept_path: "new.md", action: "created" }
      ];
      
      appendLog(entries, logPath);
      
      const content = fs.readFileSync(logPath, "utf-8");
      
      const indexOfNew = content.indexOf("new.md");
      const indexOfOld = content.indexOf("old.md");
      assert.ok(indexOfNew < indexOfOld, "New entry should be before old entry");
    });
  });
});
