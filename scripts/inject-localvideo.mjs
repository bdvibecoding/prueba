// Inject localVideo paths into data.js for the 24 exercises that now have GIF fallbacks
import fs from 'node:fs';
import path from 'node:path';

const ASSIGN = JSON.parse(fs.readFileSync('scripts/copy-gif-fallbacks.result.json', 'utf8'))
  .filter(r => r.ok);

const dataPath = 'data/data.js';
let src = fs.readFileSync(dataPath, 'utf8');

let updated = 0;
let already = 0;
let notFound = 0;

for (const { exName, dataJsPath } of ASSIGN) {
  // Find the line that has n: "EX_NAME" — escape special regex chars in the name
  const escName = exName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(`(\\{\\s*n:\\s*"${escName}"[^}]*?)(\\s*\\})`, 'm');
  const m = src.match(lineRegex);
  if (!m) {
    console.log('✗ Not found in data.js: ' + exName);
    notFound++;
    continue;
  }
  if (m[1].includes('localVideo:')) {
    console.log('= Already has localVideo: ' + exName);
    already++;
    continue;
  }
  const inject = `, localVideo: "${dataJsPath}"`;
  src = src.replace(lineRegex, m[1] + inject + m[2]);
  updated++;
  console.log('✓ Injected: ' + exName);
}

fs.writeFileSync(dataPath, src);
console.log('───────────────────────────────────────');
console.log('Updated:    ' + updated);
console.log('Already:    ' + already);
console.log('Not found:  ' + notFound);
