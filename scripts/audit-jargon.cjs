const fs = require('fs');

const files = [
  'apps/customer-web/dist/index.html',
  'apps/admin-web/dist/index.html'
];

const forbiddenPatterns = [
  { name: 'Rule Reference', regex: /\brule\s*[0-9]+|golden\s*rule|according\s*to\s*(our|the)?\s*rule/i },
  { name: 'Cryptographic', regex: /cryptograph/i },
  { name: 'Merkle', regex: /merkle/i },
  { name: 'Kahn', regex: /kahn/i },
  { name: 'CRDT', regex: /\bcrdt\b/i },
  { name: 'Supabase Auth', regex: /supabase\s*auth/i },
  { name: 'Postgres Cluster', regex: /postgres(ql)?\s*cluster/i },
  { name: 'Row-Level Security', regex: /row-level\s*security/i }
];

let totalViolations = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn(`[WARN] File not found: ${file}`);
    continue;
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const { name, regex } of forbiddenPatterns) {
      if (regex.test(line)) {
        console.log(`[VIOLATION] ${file}:${idx + 1} [${name}]: ${line.trim().slice(0, 140)}`);
        totalViolations++;
      }
    }
  });
}

console.log(`Total violations: ${totalViolations}`);
process.exit(totalViolations > 0 ? 1 : 0);
