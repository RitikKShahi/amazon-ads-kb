const fs = require('node:fs');
const path = require('node:path');

const KNOWLEDGE_DIR = path.resolve(__dirname, '../knowledge');

/**
 * Scans a knowledge/ subdirectory for .md concept files (skipping index.md and log.md),
 * reads each file's frontmatter title and description, and writes an index.md
 * with a bullet list linking to each concept.
 */
function generateIndex(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') && f !== 'index.md' && f !== 'log.md');
  const items = [];
  
  // Compute relative path from knowledge root
  const relDir = path.relative(KNOWLEDGE_DIR, path.resolve(dirPath));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const desc = descMatch ? descMatch[1].trim() : '';
      
      const linkPath = relDir ? `/${relDir.replace(/\\/g, '/')}/${file}` : `/${file}`;
      const descPart = desc ? ` — ${desc}` : '';
      items.push(`- [${title}](${linkPath})${descPart}`);
    }
  }
  
  const folderName = path.basename(dirPath);
  const header = folderName === 'knowledge' ? 'Knowledge' : folderName.charAt(0).toUpperCase() + folderName.slice(1);
  const indexContent = `# ${header}\n\n${items.join('\n')}\n`;
  
  fs.writeFileSync(path.join(dirPath, 'index.md'), indexContent);
}

if (require.main === module) {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Usage: node generate_index.js <directory>');
    process.exit(1);
  }
  generateIndex(targetDir);
}

module.exports = { generateIndex };
