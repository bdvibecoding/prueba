// One-shot script: copy fallback GIFs from "Videos Español" into the project
// and report which destination paths were created.
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = String.raw`C:\Users\bigde\Desktop\Videos Español`;
const DST_ROOT = path.join(process.cwd(), 'videos info');

const MAPPINGS = [
  // exerciseName               srcRel                                         dstRel
  ['RUEDA ABDOMINAL (AB WHEEL)',        'abs/rueda abdominal.gif',                  'Abdomen - Abs/rueda_abdominal.gif'],
  ['CRUNCH POLEA ALTA',                 'abs/abdominales polea.gif',                'Abdomen - Abs/crunch_polea_alta.gif'],
  ['CURL CONCENTRADO',                  'biceps/curl biceps concentrado mancuerna.gif','Bíceps - Biceps/curl_concentrado.gif'],
  ['CURL EN POLEA UNILATERAL',          'biceps/curl biceps polea.gif',             'Bíceps - Biceps/curl_polea_unilateral.gif'],
  ['CURL ARAÑA (SPIDER CURL)',          'biceps/curl biceps araña.gif',             'Bíceps - Biceps/curl_arana_spider.gif'],
  ['SENTADILLA JACA (HACK)',            'gluteos/jaca.gif',                         'Cuádriceps - Quadriceps/sentadilla_jaca.gif'],
  ['SENTADILLA BÚLGARA MANCUERNAS',     'cuadriceps/sentadilla bulgara.gif',        'Cuádriceps - Quadriceps/sentadilla_bulgara.gif'],
  ['SENTADILLA SISSY',                  'cuadriceps/sentadilla sissy.gif',          'Cuádriceps - Quadriceps/sentadilla_sissy.gif'],
  ['JALÓN AL PECHO AGARRE ANCHO',       'dorsales/jalon al pecho.gif',              'Dorsales - Lats/jalon_al_pecho_agarre_ancho.gif'],
  ['REMO SENTADO POLEA BAJA',           'espalda alta/remo polea.gif',              'Espalda - Back/remo_sentado_polea_baja.gif'],
  ['FACE PULL',                         'hombros/facepull.gif',                     'Hombros - Shoulders/face_pull.gif'],
  ['PESO MUERTO CONVENCIONAL (ESPALDA)','gluteos/peso muerto.gif',                  'Espalda - Back/peso_muerto_convencional.gif'],
  ['GEMELO EN PRENSA',                  'gemelos/gemelo en prensa.gif',             'Pantorrillas - Calves/gemelo_en_prensa.gif'],
  ['GEMELO SENTADO MÁQUINA',            'gemelos/gemelo maquina rotacion.gif',      'Pantorrillas - Calves/gemelo_sentado_maquina.gif'],
  ['HIP THRUST UNILATERAL',             'gluteos/hip thrust.gif',                   'Glúteos - Glutes/hip_thrust_unilateral.gif'],
  ['PESO MUERTO RUMANO (GLÚTEOS)',      'gluteos/peso muerto rumano.gif',           'Glúteos - Glutes/peso_muerto_rumano_gluteos.gif'],
  ['ELEVACIONES LATERALES POLEA',       'hombros/elevaciones polea.gif',            'Hombros - Shoulders/elevaciones_laterales_polea.gif'],
  ['CURL FEMORAL TUMBADO',              'isquios/femoral tumbado.gif',              'Isquiotibiales - Hamstrings/curl_femoral_tumbado.gif'],
  ['PESO MUERTO RUMANO BARRA',          'gluteos/peso muerto rumano.gif',           'Isquiotibiales - Hamstrings/peso_muerto_rumano_barra.gif'],
  ['BUENOS DÍAS BARRA',                 'isquios/buenos dias.gif',                  'Isquiotibiales - Hamstrings/buenos_dias_barra.gif'],
  ['FONDOS EN PARALELAS (PECHO)',       'pecho/fondos de pecho.gif',                'Pecho - Chest/fondos_paralelas.gif'],
  ['PRESS BANCA MANCUERNAS PLANO',      'pecho/press de pecho mancuerna.gif',       'Pecho - Chest/press_banca_mancuernas_plano.gif'],
  ['PRESS PECHO EN MÁQUINA',            'pecho/press de pecho maquina.gif',         'Pecho - Chest/press_pecho_maquina.gif'],
  ['PRESS FRANCÉS BARRA Z',             'triceps/press frances barra.gif',          'Tríceps - Triceps/press_frances_barra_z.gif'],
];

const results = [];
for (const [exName, srcRel, dstRel] of MAPPINGS) {
  const src = path.join(SRC_ROOT, srcRel);
  const dst = path.join(DST_ROOT, dstRel);
  try {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    const dataJsPath = 'videos info/' + dstRel.replace(/\\/g, '/');
    results.push({ exName, ok: true, dataJsPath });
  } catch (err) {
    results.push({ exName, ok: false, err: err.message, src });
  }
}

console.log('───────────────────────────────────────────────');
console.log('OK:    ' + results.filter(r => r.ok).length);
console.log('FAIL:  ' + results.filter(r => !r.ok).length);
console.log('───────────────────────────────────────────────');
for (const r of results) {
  if (r.ok) {
    console.log(`✓ ${r.exName}`);
    console.log(`  → ${r.dataJsPath}`);
  } else {
    console.log(`✗ ${r.exName}`);
    console.log(`  source missing: ${r.src}`);
  }
}
// Emit JSON so we can use it programmatically next step
fs.writeFileSync('scripts/copy-gif-fallbacks.result.json', JSON.stringify(results, null, 2));
