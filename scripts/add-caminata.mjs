// Insert CAMINATA cardio exercise before the closing ];
import fs from 'node:fs';
const path = 'data/data.js';
let src = fs.readFileSync(path, 'utf8');

if (src.includes('"CAMINATA"')) {
  console.log('CAMINATA already present, skipping.');
  process.exit(0);
}

const entry = `\n// ─── CARDIO ───\n{ n: "CAMINATA", img: "cardio.png", m: "Cardio", t: "c", target: "cardio", sec: [], instructions: ["Camina a ritmo moderado-rápido manteniendo una postura erguida.","Activa el core y mantén los hombros relajados hacia atrás.","Aterriza con el talón y empuja con el dedo gordo en cada paso.","Mueve los brazos de forma natural acompañando el ritmo.","Mantén una intensidad que te permita hablar pero no cantar.","Camina el tiempo previsto."], v: "", localVideo: "videos info/Cardio - Cardio/caminata.gif" },\n`;

// Find last "}," before the closing "];" — insert our entry right after it
const closingIdx = src.lastIndexOf('];');
if (closingIdx === -1) { console.log('Could not find closing ];'); process.exit(1); }

const before = src.slice(0, closingIdx);
const after  = src.slice(closingIdx);
src = before + entry + '\n' + after;

fs.writeFileSync(path, src);
console.log('✓ CAMINATA inserted.');
