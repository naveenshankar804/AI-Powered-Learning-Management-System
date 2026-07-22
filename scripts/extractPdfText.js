const fs = require('fs');
const path = require('path');

async function main() {
  const pdfParse = require('pdf-parse');
  const file = process.argv[2] || path.join(__dirname, '..', 'docs', 'Amypo_PROBLEM_STATEMENT2.pdf');
  const abs = path.resolve(file);
  const buf = fs.readFileSync(abs);
  const data = await pdfParse(buf);
  process.stdout.write(data.text || '');
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});

