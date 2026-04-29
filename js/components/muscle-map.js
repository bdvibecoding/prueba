/* ═══════════════════════════════════════════════
   TGWL — components/muscle-map.js
   PNG-based Muscle Activation Heatmap
   Uses layered PNG masks tinted with brand reds
═══════════════════════════════════════════════ */

const BASE_URL = '/mapa%20muscular/';

// ── Muscle group → PNG overlay filename ──────────
const MUSCLE_PNG = {
  pectoral:        'pecho.png',
  lats:            'dorsales.png',
  trapezius:       'espalda_alta.png',
  lower_back:      'espalda_baja.png',
  deltoid_front:   'hombros_frontal.png',
  deltoid_rear:    'hombros_posterior.png',
  biceps:          'biceps.png',
  triceps:         'triceps.png',
  forearms_front:  'antebrazos.png',
  abs:             'abs.png',
  quads:           'cuadriceps.png',
  hamstrings:      'isquios.png',
  glutes:          'gluteos.png',
  calves_back:     'gemelos.png',
  calves_front:    'gemelos.png',
};

// ── Display labels ────────────────────────────────
const MUSCLE_LABELS = {
  pectoral:        'Pectoral',
  lats:            'Dorsales',
  trapezius:       'Trapecio',
  lower_back:      'Lumbar',
  deltoid_front:   'Hombros',
  deltoid_rear:    'Hombros Post.',
  biceps:          'Bíceps',
  triceps:         'Tríceps',
  forearms_front:  'Antebrazos',
  abs:             'Abdominales',
  quads:           'Cuádriceps',
  hamstrings:      'Isquios',
  glutes:          'Glúteos',
  calves_back:     'Gemelos',
  calves_front:    'Gemelos',
};

// ── Intensity sort order ──────────────────────────
const INTENSITY_ORDER = { high: 0, mid: 1, low: 2 };

// ── Exercise type → muscle groups activated ───────
export const EXERCISE_MUSCLES = {
  // Chest
  'press-banca':            { primary: ['pectoral'],               secondary: ['triceps','deltoid_front'] },
  'press-inclinado':        { primary: ['pectoral'],               secondary: ['deltoid_front','triceps'] },
  'aperturas':              { primary: ['pectoral'],               secondary: ['deltoid_front'] },
  // Back
  'dominadas':              { primary: ['lats'],                   secondary: ['biceps','trapezius'] },
  'remo-barra':             { primary: ['lats','trapezius'],       secondary: ['biceps','lower_back'] },
  'polea-alta':             { primary: ['lats'],                   secondary: ['biceps','trapezius'] },
  // Shoulders
  'press-militar':          { primary: ['deltoid_front'],          secondary: ['trapezius','triceps'] },
  'elevaciones-laterales':  { primary: ['deltoid_front'],          secondary: [] },
  'pajaros':                { primary: ['deltoid_rear'],           secondary: ['trapezius'] },
  // Arms
  'curl-barra':             { primary: ['biceps'],                 secondary: ['forearms_front'] },
  'press-frances':          { primary: ['triceps'],                secondary: [] },
  'fondos':                 { primary: ['triceps'],                secondary: ['pectoral','deltoid_front'] },
  // Legs
  'sentadilla':             { primary: ['quads','glutes'],         secondary: ['hamstrings','lower_back'] },
  'prensa':                 { primary: ['quads'],                  secondary: ['glutes','hamstrings'] },
  'peso-muerto':            { primary: ['lats','lower_back'],      secondary: ['glutes','hamstrings','trapezius'] },
  'estocadas':              { primary: ['quads','glutes'],         secondary: ['hamstrings'] },
  'curl-femoral':           { primary: ['hamstrings'],             secondary: ['glutes'] },
  'elevacion-gemelos':      { primary: ['calves_back','calves_front'], secondary: [] },
  // Core
  'crunch':                 { primary: ['abs'],                    secondary: [] },
  'plancha':                { primary: ['abs'],                    secondary: ['lower_back'] },
  'russian-twist':          { primary: ['abs'],                    secondary: [] },
};

// ── Compute active groups + intensity from exercises
export function computeActiveGroups(exercises = []) {
  const counts = {};
  exercises.forEach(ex => {
    const key = ex.id || ex.name?.toLowerCase().replace(/ /g, '-');
    const mapping = EXERCISE_MUSCLES[key];
    if (!mapping) return;
    mapping.primary.forEach(m   => { counts[m] = (counts[m] || 0) + 2; });
    mapping.secondary.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
  });

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

  // Build layer list; resolve duplicate PNGs to highest intensity
  const bestByFile = {};
  Object.entries(activeGroups).forEach(([id, intensity]) => {
    const file = MUSCLE_PNG[id];
    if (!file) return;
    const existing = bestByFile[file];
    if (!existing || INTENSITY_ORDER[intensity] < INTENSITY_ORDER[existing.intensity]) {
      bestByFile[file] = { id, file, label: MUSCLE_LABELS[id] || id, intensity };
    }
  });

  // Collect all labels (including lower-priority duplicates) for the legend
  const allLabels = Object.entries(activeGroups)
    .filter(([id]) => MUSCLE_PNG[id])
    .map(([id, intensity]) => ({ id, label: MUSCLE_LABELS[id] || id, intensity }))
    .sort((a, b) => INTENSITY_ORDER[a.intensity] - INTENSITY_ORDER[b.intensity]);

  // Deduplicate labels by label text (calves_front / calves_back → same label)
  const seenLabels = new Set();
  const uniqueLabels = allLabels.filter(l => {
    if (seenLabels.has(l.label)) return false;
    seenLabels.add(l.label);
    return true;
  });

  const layers = Object.values(bestByFile)
    .sort((a, b) => INTENSITY_ORDER[b.intensity] - INTENSITY_ORDER[a.intensity]); // low first, high on top

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
