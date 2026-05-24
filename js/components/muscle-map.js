/* ═══════════════════════════════════════════════
   TGWL — components/muscle-map.js
   PNG-based Muscle Activation Heatmap
   target field in data.js === PNG filename (no extension)
   e.g.  target:"cuadriceps"  →  cuadriceps.png
═══════════════════════════════════════════════ */

const BASE_URL = '/mapa%20muscular/';

// ── Known PNG files in /mapa muscular/ ───────────
// Used to validate that a target key has a real file.
const KNOWN_PNGs = new Set([
  'abductores','abs','aductores','antebrazo','antebrazos',
  'biceps','core','core_inferior','core_superior',
  'cuadriceps','cuello','dorsales','espalda','espalda_alta','espalda_baja',
  'gemelos','gluteos','hombros','hombros_frontal','hombros_posterior',
  'isquios','oblicuos','pecho','piernas','triceps',
]);

// ── Display labels per target key ─────────────────
const LABELS = {
  abductores:       'Abductores',
  abs:              'Abdominales',
  aductores:        'Aductores',
  antebrazo:        'Antebrazos',
  antebrazos:       'Antebrazos',
  biceps:           'Bíceps',
  core:             'Core',
  core_inferior:    'Core Inf.',
  core_superior:    'Core Sup.',
  cuadriceps:       'Cuádriceps',
  cuello:           'Cuello',
  dorsales:         'Dorsales',
  espalda:          'Espalda',
  espalda_alta:     'Espalda Alta',
  espalda_baja:     'Lumbar',
  gemelos:          'Gemelos',
  gluteos:          'Glúteos',
  hombros:          'Hombros',
  hombros_frontal:  'Hombros Front.',
  hombros_posterior:'Hombros Post.',
  isquios:          'Isquios',
  oblicuos:         'Oblicuos',
  pecho:            'Pectoral',
  piernas:          'Piernas',
  triceps:          'Tríceps',
};

// ── Intensity sort order ──────────────────────────
const INTENSITY_ORDER = { high: 0, mid: 1, low: 2 };

// ── Validate and normalise a target/sec key ───────
// Returns the key if it has a PNG, otherwise null.
function resolveKey(raw) {
  if (!raw) return null;
  const k = String(raw).toLowerCase().trim();
  if (KNOWN_PNGs.has(k)) return k;
  // Strip combining diacritical marks (NFD decomposition + remove marks U+0300–U+036F)
  const plain = k.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (KNOWN_PNGs.has(plain)) return plain;
  // Also replace spaces with underscores (e.g. "espalda alta" → "espalda_alta")
  const underscored = plain.replace(/\s+/g, '_');
  if (KNOWN_PNGs.has(underscored)) return underscored;
  return null;
}

// ── Compute active groups from exercise list ──────
// Priority:
//  1. ex.target      — lowercase PNG key from data.js  (e.g. "cuadriceps")
//  2. ex.muscleGroup — Spanish name stored by admin     (e.g. "Cuádriceps")
//  3. ex.m           — Spanish name from data.js
//  ex.sec            — array of secondary PNG keys
export function computeActiveGroups(exercises = []) {
  const counts = {};

  exercises.forEach(ex => {
    // Primary: first candidate that resolves to a known PNG
    const primary = resolveKey(ex.target)
                 || resolveKey(ex.muscleGroup)
                 || resolveKey(ex.m);
    if (primary) {
      counts[primary] = (counts[primary] || 0) + 2;
    }

    // Secondary muscles (from data.js sec array)
    if (Array.isArray(ex.sec)) {
      ex.sec.forEach(s => {
        const k = resolveKey(s);
        if (k) counts[k] = (counts[k] || 0) + 1;
      });
    }
  });

  if (Object.keys(counts).length === 0) return {};

  const maxCount = Math.max(...Object.values(counts), 1);
  const active = {};
  Object.entries(counts).forEach(([muscle, count]) => {
    const ratio = count / maxCount;
    active[muscle] = ratio > 0.65 ? 'high' : ratio > 0.3 ? 'mid' : 'low';
  });
  return active;
}

// ── Render PNG-based muscle heatmap ──────────────
export function renderMuscleMap(container, exercises = []) {
  const activeGroups = computeActiveGroups(exercises);

  // Build layer list; duplicate PNGs → keep highest intensity
  const bestByFile = {};
  Object.entries(activeGroups).forEach(([id, intensity]) => {
    const file = id + '.png';
    const existing = bestByFile[file];
    if (!existing || INTENSITY_ORDER[intensity] < INTENSITY_ORDER[existing.intensity]) {
      bestByFile[file] = { id, file, label: LABELS[id] || id, intensity };
    }
  });

  // Legend labels, deduped by text
  const allLabels = Object.entries(activeGroups)
    .map(([id, intensity]) => ({ id, label: LABELS[id] || id, intensity }))
    .sort((a, b) => INTENSITY_ORDER[a.intensity] - INTENSITY_ORDER[b.intensity]);

  const seenLabels = new Set();
  const uniqueLabels = allLabels.filter(l => {
    if (seenLabels.has(l.label)) return false;
    seenLabels.add(l.label);
    return true;
  });

  // Layers: low first, high on top
  const layers = Object.values(bestByFile)
    .sort((a, b) => INTENSITY_ORDER[b.intensity] - INTENSITY_ORDER[a.intensity]);

  if (layers.length === 0) {
    container.innerHTML = `
      <p class="text-muted" style="text-align:center;font-size:13px;padding:var(--space-md) 0">
        Sin datos de músculos para mostrar
      </p>`;
    return;
  }

  container.innerHTML = `
    <div class="muscle-heatmap">
      <div class="muscle-heatmap-canvas">
        <img class="muscle-heatmap-base"
             src="${BASE_URL}baseImage_transparent.png"
             alt="Cuerpo"
             loading="lazy">
        ${layers.map(l => `
          <div class="muscle-heatmap-layer intensity-${l.intensity}"
               style="-webkit-mask-image:url('${BASE_URL}${l.file}');mask-image:url('${BASE_URL}${l.file}')">
          </div>`).join('')}
      </div>
      <div class="muscle-heatmap-legend">
        ${uniqueLabels.map(l => `
          <span class="muscle-heatmap-chip intensity-${l.intensity}">${l.label}</span>
        `).join('')}
      </div>
      <div class="muscle-heatmap-scale">
        <span class="muscle-heatmap-scale-item intensity-low">Baja</span>
        <span class="muscle-heatmap-scale-item intensity-mid">Media</span>
        <span class="muscle-heatmap-scale-item intensity-high">Alta</span>
      </div>
    </div>
  `;
}
