const fs = require('fs');
const path = require('path');

function getMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMarkdownFiles(filePath, fileList);
    } else if (filePath.endsWith('.md') && !filePath.includes('index.md') && !filePath.includes('log.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getMarkdownFiles('knowledge');
let totalClaims = 0;
let totalDuplicates = 0;
let fileStats = [];

console.log("==================================================");
console.log("🔍 KNOWLEDGE BASE INTEGRITY SCAN");
console.log("==================================================");

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const claims = new Set();
  
  let fileClaims = 0;
  let fileDups = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Only check bullet points for duplication
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const claimText = trimmed.replace(/^[-*]\s*/, '').trim();
      if (claimText.length > 10) { // Ignore trivial short bullets
        fileClaims++;
        totalClaims++;
        if (claims.has(claimText)) {
          fileDups++;
          totalDuplicates++;
        } else {
          claims.add(claimText);
        }
      }
    }
  }
  
  fileStats.push({ file: file.replace('knowledge/', ''), fileClaims, fileDups });
}

for (const stat of fileStats) {
  const status = stat.fileDups === 0 ? '✅ PRISTINE' : '❌ DUPLICATES FOUND';
  console.log(`[${status}] ${stat.file.padEnd(45)} | ${stat.fileClaims} claims`);
}

console.log("==================================================");
console.log("📊 INTEGRITY REPORT SUMMARY");
console.log("==================================================");
console.log(`Total Concepts Scanned : ${files.length}`);
console.log(`Total Claims Analyzed  : ${totalClaims}`);
console.log(`Duplicate Claims Found : ${totalDuplicates}`);
console.log("");
if (totalDuplicates === 0) {
  console.log("VERDICT: PERFECT DEDUPLICATION. The Merger agent safely folded all re-runs without creating redundant data.");
} else {
  console.log("VERDICT: FAILED. Duplicates detected.");
}
