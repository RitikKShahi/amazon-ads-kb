const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { verifyTaxonomy } = require("../scripts/verify_taxonomy.js");

describe("verify_taxonomy.js", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-tax-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("prints Taxonomy OK and returns ok=true when clean", () => {
    fs.mkdirSync(path.join(tempDir, "ad-products"));
    fs.mkdirSync(path.join(tempDir, "apis"));
    fs.writeFileSync(path.join(tempDir, "ad-products", "test.md"), "test");
    
    const result = verifyTaxonomy(tempDir);
    assert.equal(result.ok, true);
    assert.match(result.output, /Taxonomy OK/);
  });

  it("prints offending directories and files and returns ok=false when drifted", () => {
    fs.mkdirSync(path.join(tempDir, "ad-products"));
    fs.mkdirSync(path.join(tempDir, "api")); // drifted!
    fs.writeFileSync(path.join(tempDir, "api", "auth.md"), "auth");
    
    const result = verifyTaxonomy(tempDir);
    assert.equal(result.ok, false);
    assert.match(result.output, /Offending directory: api\//);
    assert.match(result.output, /- auth\.md/);
    assert.doesNotMatch(result.output, /ad-products/); // should not list clean dirs
  });
});
