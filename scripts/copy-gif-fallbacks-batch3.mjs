// Round 3: copy Press Arnold GIF + remove Dragon Flag from exercises
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = String.raw`C:\Users\bigde\Desktop\Videos Español`;
const DST_ROOT = path.join(process.cwd(), 'videos info');

const MAPPINGS = [
  ['PRESS ARNOLD', 'hombros/press Arnold.gif', 'Hombros - Shoulders/press_arnold.gif'],
];

// 1. Copy
const results = [];
for (const [exName, srcRel, dstRel] of MAPPINGS) {
  const src = path.join(SRC_ROOT, srcRel);
  const dst = path.join(DST_ROOT, dstRel);
  try {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    const dataJsPath = 'videos info/' + dstRel.replace(/\\/g, '/');
    results.push({ exName, ok: true, dataJsPath });
    console.log('✓ ' + exName + ' → ' + dataJsPath);
  } catch (err) {
    results.push({ exName, ok: false, err: err.message });
    console.log('✗ ' + exName + ' — ' + err.message);
  }
}

// 2. Inject + 3. Delete Dragon Flag
const dataPath = 'data/data.js';
let src = fs.readFileSync(dataPath, 'utf8');

// Inject
for (const r of results) {
  if (!r.ok) continue;
  const escName = r.exName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(\\{\\s*n:\\s*"${escName}"[^}]*?)(\\s*\\})`, 'm');
  const m = src.match(re);
  if (!m) { console.log('NOT FOUND in data.js: ' + r.exName); continue; }
  if (m[1].includes('localVideo:')) { console.log('already has localVideo: ' + r.exName); continue; }
  src = src.replace(re, m[1] + `, localVideo: "${r.dataJsPath}"` + m[2]);
  console.log('  ↳ injected into data.js: ' + r.exName);
}

// Remove DRAGON FLAG entry — match the entire line including the trailing comma + newline if present
const dragonRe = /\{\s*n:\s*"DRAGON FLAG"[\s\S]*?\}\,?\s*\r?\n/m;
if (dragonRe.test(src)) {
  src = src.replace(dragonRe, '');
  console.log('✓ Removed DRAGON FLAG from data.js');
} else {
  console.log('✗ DRAGON FLAG not found in data.js');
}

fs.writeFileSync(dataPath, src);
console.log('───────────────');
console.log('Done.');
