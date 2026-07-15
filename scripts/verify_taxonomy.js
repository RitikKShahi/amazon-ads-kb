const fs = require('fs');
const path = require('path');
const { ALLOWED_TOP_LEVEL_DIRS } = require('./taxonomy.js');

const KNOWLEDGE_DIR = path.resolve(__dirname, '../knowledge');

function verifyTaxonomy(kbDir) {
  if (!fs.existsSync(kbDir)) {
    return { ok: true, output: "Taxonomy OK (knowledge/ directory does not exist)\n" };
  }

  const entries = fs.readdirSync(kbDir, { withFileTypes: true });
  const badDirs = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ALLOWED_TOP_LEVEL_DIRS.includes(entry.name)) {
        badDirs.push(entry.name);
      }
    }
  }

  if (badDirs.length === 0) {
    return { ok: true, output: "Taxonomy OK\n" };
  } else {
    let output = "";
    for (const badDir of badDirs) {
      output += `Offending directory: ${badDir}/\n`;
      const dirPath = path.join(kbDir, badDir);
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          output += `  - ${file}\n`;
        }
      } catch (e) {
        output += `  (Could not read contents: ${e.message})\n`;
      }
    }
    return { ok: false, output };
  }
}

if (require.main === module) {
  const result = verifyTaxonomy(KNOWLEDGE_DIR);
  process.stdout.write(result.output);
  if (!result.ok) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

module.exports = { verifyTaxonomy };
