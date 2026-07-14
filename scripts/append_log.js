const fs = require('node:fs');
const path = require('node:path');

const LOG_PATH = path.resolve(__dirname, '../knowledge/log.md');
const LOG_HEADER = '# Change Log\n\nNewest entries first. One entry per concept created/changed per run.\n\n';

/**
 * Takes a list of {concept_path, action: "created"|"updated", note} entries
 * and prepends a dated section to knowledge/log.md (newest-first).
 */
function appendLog(entries, logFilePath = LOG_PATH) {
  if (!entries || entries.length === 0) return;

  const date = new Date().toISOString().split('T')[0];
  let section = `## ${date}\n`;
  
  for (const entry of entries) {
    const action = entry.action === 'created' ? 'Created' : 'Updated';
    const note = entry.note ? `: ${entry.note}` : '';
    section += `- ${action} \`${entry.concept_path}\`${note}\n`;
  }
  section += '\n';

  let currentLog = '';
  if (fs.existsSync(logFilePath)) {
    currentLog = fs.readFileSync(logFilePath, 'utf-8');
  } else {
    currentLog = LOG_HEADER;
  }

  const headerMatch = currentLog.match(/^# Change Log\n\nNewest entries first\. One entry per concept created\/changed per run\.\n\n/);
  
  let newLog;
  if (headerMatch) {
    newLog = currentLog.substring(0, headerMatch[0].length) + section + currentLog.substring(headerMatch[0].length);
  } else {
    const strippedLog = currentLog.replace(/^# Change Log[\s\S]*?per run\.\n\n/, '');
    newLog = LOG_HEADER + section + strippedLog;
  }

  fs.writeFileSync(logFilePath, newLog);
}

if (require.main === module) {
  const jsonStr = process.argv[2];
  if (!jsonStr) {
    console.error('Usage: node append_log.js <json-array-of-entries>');
    process.exit(1);
  }
  try {
    const entries = JSON.parse(jsonStr);
    appendLog(entries);
  } catch (e) {
    console.error('Error parsing JSON:', e.message);
    process.exit(1);
  }
}

module.exports = { appendLog };
