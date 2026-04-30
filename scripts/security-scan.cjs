const { execFileSync } = require('child_process');
const fs = require('fs');

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(file => !/(^|\/)(node_modules|dist|build|private|src\/data)\//.test(file))
  .filter(file => !/(^|\/)package-lock\.json$/.test(file));

const rules = [
  { name: 'local Windows user path', pattern: /C:\\Users\\|OneDrive\\|\\Desktop\\/i },
  { name: 'local network IP', pattern: /\b192\.168\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'Discord webhook', pattern: /https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i },
  { name: 'Discord bot token', pattern: /\bMT[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Render API key', pattern: /\brnd_[A-Za-z0-9]{20,}\b/ },
  { name: 'OpenAI key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { name: 'private access key literal', pattern: /\b2211W65ST@VN\b/i },
  { name: 'personal marker', pattern: /\b(Keandra|Morris|PM_Portfolio|gmail\.com|12,000|veterans)\b/i }
];

const allowed = [
  /security-scan\.cjs$/,
  /\.env\.example$/,
  /\.env\.production\.example$/
];

const hits = [];
for (const file of files) {
  if (allowed.some(rule => rule.test(file))) continue;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        hits.push(`${file}:${index + 1}: ${rule.name}`);
      }
    }
  }
}

if (hits.length) {
  console.error('Security scan failed:\n' + hits.join('\n'));
  process.exit(1);
}

console.log('Security scan passed');
