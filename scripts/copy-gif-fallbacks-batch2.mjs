// Round 2: copy 7 more GIFs into the project + inject into data.js
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = String.raw`C:\Users\bigde\Desktop\Videos Español`;
const DST_ROOT = path.join(process.cwd(), 'videos info');

const MAPPINGS = [
  ['SENTADILLA SUMO',                   'gluteos/sentadilla sumo multipower.gif',   'Glúteos - Glutes/sentadilla_sumo.gif'],
  ['PATADA GLÚTEO POLEA',               'gluteos/Patada gluteo polea.gif',          'Glúteos - Glutes/patada_gluteo_polea.gif'],
  ['SENTADILLA FRONTAL BARRA',          'cuadriceps/sentadilla frontal.gif',        'Cuádriceps - Quadriceps/sentadilla_frontal_barra.gif'],
  ['ELEVACIÓN DE PIERNAS COLGADO',      'abs/elevaciones piernas colgando.gif',     'Abdomen - Abs/elevacion_piernas_colgado.gif'],
  ['PULLOVER POLEA ALTA',               'dorsales/pullover.gif',                    'Dorsales - Lats/pullover_polea_alta.gif'],
  ['PRESS CERRADO CON BARRA',           'triceps/press cerrado barra.gif',          'Tríceps - Triceps/press_cerrado_barra.gif'],
  ['EXTENSIÓN POLEA UNILATERAL',        'triceps/extensión polea unilateral.gif',   'Tríceps - Triceps/extension_polea_unilateral.gif'],
];

// 1. Copy files
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

// 2. Inject into data.js
const dataPath = 'data/data.js';
let src = fs.readFileSync(dataPath, 'utf8');

let updated = 0, already = 0, notFound = 0;
for (const r of results) {
  if (!r.ok) continue;
  const escName = r.exName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(\\{\\s*n:\\s*"${escName}"[^}]*?)(\\s*\\})`, 'm');
  const m = src.match(re);
  if (!m) { console.log('  ↳ NOT FOUND in data.js: ' + r.exName); notFound++; continue; }
  if (m[1].includes('localVideo:')) { console.log('  ↳ already has localVideo: ' + r.exName); already++; continue; }
  src = src.replace(re, m[1] + `, localVideo: "${r.dataJsPath}"` + m[2]);
  updated++;
  console.log('  ↳ injected into data.js');
}
fs.writeFileSync(dataPath, src);

console.log('───────────────────────────────────');
console.log('Files copied:    ' + results.filter(r => r.ok).length + '/' + MAPPINGS.length);
console.log('data.js updated: ' + updated);
console.log('Already had:     ' + already);
console.log('Not found:       ' + notFound);
