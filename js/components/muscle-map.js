/* ═══════════════════════════════════════════════
   TGWL — components/muscle-map.js
   SVG Human Body Muscle Map (Front + Back)
═══════════════════════════════════════════════ */

// Muscle groups and their SVG path IDs
export const MUSCLE_GROUPS = {
  // Front
  pectoral:      { label: 'Pectoral',     side: 'front', color: '#ef4444' },
  deltoid_front: { label: 'Deltoides',    side: 'front', color: '#f59e0b' },
  biceps:        { label: 'Bíceps',       side: 'front', color: '#f59e0b' },
  abs:           { label: 'Abdominales',  side: 'front', color: '#22c55e' },
  quads:         { label: 'Cuádriceps',   side: 'front', color: '#3b82f6' },
  calves_front:  { label: 'Gemelos',      side: 'front', color: '#8b5cf6' },
  forearms_front:{ label: 'Antebrazos',   side: 'front', color: '#f97316' },
  // Back
  trapezius:     { label: 'Trapecio',     side: 'back',  color: '#ef4444' },
  lats:          { label: 'Espalda',      side: 'back',  color: '#940a0a' },
  deltoid_rear:  { label: 'Deltoides P.',  side: 'back',  color: '#f59e0b' },
  triceps:       { label: 'Tríceps',      side: 'back',  color: '#f97316' },
  glutes:        { label: 'Glúteos',      side: 'back',  color: '#8b5cf6' },
  hamstrings:    { label: 'Isquiotibiales',side:'back',   color: '#3b82f6' },
  calves_back:   { label: 'Gemelos P.',    side: 'back',  color: '#8b5cf6' },
  lower_back:    { label: 'Lumbar',       side: 'back',  color: '#ec4899' },
};

// Map exercise types → muscle groups activated
export const EXERCISE_MUSCLES = {
  // Chest
  'press-banca':         { primary: ['pectoral'], secondary: ['triceps','deltoid_front'] },
  'press-inclinado':     { primary: ['pectoral'], secondary: ['deltoid_front','triceps'] },
  'aperturas':           { primary: ['pectoral'], secondary: ['deltoid_front'] },
  // Back
  'dominadas':           { primary: ['lats'], secondary: ['biceps','trapezius'] },
  'remo-barra':          { primary: ['lats','trapezius'], secondary: ['biceps','lower_back'] },
  'polea-alta':          { primary: ['lats'], secondary: ['biceps','trapezius'] },
  // Shoulders
  'press-militar':       { primary: ['deltoid_front'], secondary: ['trapezius','triceps'] },
  'elevaciones-laterales':{ primary: ['deltoid_front'], secondary: [] },
  'pajaros':             { primary: ['deltoid_rear'], secondary: ['trapezius'] },
  // Arms
  'curl-barra':          { primary: ['biceps'], secondary: ['forearms_front'] },
  'press-frances':       { primary: ['triceps'], secondary: [] },
  'fondos':              { primary: ['triceps'], secondary: ['pectoral','deltoid_front'] },
  // Legs
  'sentadilla':          { primary: ['quads','glutes'], secondary: ['hamstrings','lower_back'] },
  'prensa':              { primary: ['quads'], secondary: ['glutes','hamstrings'] },
  'peso-muerto':         { primary: ['lats','lower_back'], secondary: ['glutes','hamstrings','trapezius'] },
  'estocadas':           { primary: ['quads','glutes'], secondary: ['hamstrings'] },
  'curl-femoral':        { primary: ['hamstrings'], secondary: ['glutes'] },
  'elevacion-gemelos':   { primary: ['calves_back','calves_front'], secondary: [] },
  // Core
  'crunch':              { primary: ['abs'], secondary: [] },
  'plancha':             { primary: ['abs'], secondary: ['lower_back'] },
  'russian-twist':       { primary: ['abs'], secondary: [] },
};

// ── Build SVG Front View ──────────────────────
export function buildFrontSVG(activeGroups = {}) {
  return `
<svg viewBox="0 0 100 220" class="muscle-map-svg" xmlns="http://www.w3.org/2000/svg">
  <!-- Body outline -->
  <ellipse cx="50" cy="20" rx="12" ry="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
  <!-- Neck -->
  <rect x="46" y="32" width="8" height="8" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
  <!-- Torso -->
  <path d="M34 40 Q28 42 26 50 L24 90 Q24 95 50 95 Q76 95 76 90 L74 50 Q72 42 66 40 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>

  <!-- Pectoral Left -->
  <path id="pectoral-l" class="muscle-group ${getClass('pectoral', activeGroups)}"
    d="M34 42 Q38 40 50 42 L50 60 Q40 62 34 58 Z" style="${getStyle('pectoral', activeGroups)}"/>
  <!-- Pectoral Right -->
  <path id="pectoral-r" class="muscle-group ${getClass('pectoral', activeGroups)}"
    d="M66 42 Q62 40 50 42 L50 60 Q60 62 66 58 Z" style="${getStyle('pectoral', activeGroups)}"/>

  <!-- Deltoids front -->
  <ellipse id="deltoid-front-l" class="muscle-group ${getClass('deltoid_front', activeGroups)}"
    cx="30" cy="50" rx="7" ry="8" style="${getStyle('deltoid_front', activeGroups)}"/>
  <ellipse id="deltoid-front-r" class="muscle-group ${getClass('deltoid_front', activeGroups)}"
    cx="70" cy="50" rx="7" ry="8" style="${getStyle('deltoid_front', activeGroups)}"/>

  <!-- Abs -->
  <rect id="abs-1l" class="muscle-group ${getClass('abs', activeGroups)}"
    x="43" y="63" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>
  <rect id="abs-1r" class="muscle-group ${getClass('abs', activeGroups)}"
    x="51" y="63" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>
  <rect id="abs-2l" class="muscle-group ${getClass('abs', activeGroups)}"
    x="43" y="72" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>
  <rect id="abs-2r" class="muscle-group ${getClass('abs', activeGroups)}"
    x="51" y="72" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>
  <rect id="abs-3l" class="muscle-group ${getClass('abs', activeGroups)}"
    x="43" y="81" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>
  <rect id="abs-3r" class="muscle-group ${getClass('abs', activeGroups)}"
    x="51" y="81" width="6" height="7" rx="2" style="${getStyle('abs', activeGroups)}"/>

  <!-- Arms left -->
  <ellipse id="biceps-l" class="muscle-group ${getClass('biceps', activeGroups)}"
    cx="23" cy="65" rx="5" ry="10" style="${getStyle('biceps', activeGroups)}"/>
  <!-- Arms right -->
  <ellipse id="biceps-r" class="muscle-group ${getClass('biceps', activeGroups)}"
    cx="77" cy="65" rx="5" ry="10" style="${getStyle('biceps', activeGroups)}"/>

  <!-- Forearms left -->
  <ellipse id="forearms-l" class="muscle-group ${getClass('forearms_front', activeGroups)}"
    cx="21" cy="82" rx="4" ry="9" style="${getStyle('forearms_front', activeGroups)}"/>
  <!-- Forearms right -->
  <ellipse id="forearms-r" class="muscle-group ${getClass('forearms_front', activeGroups)}"
    cx="79" cy="82" rx="4" ry="9" style="${getStyle('forearms_front', activeGroups)}"/>

  <!-- Quads left -->
  <ellipse id="quads-l" class="muscle-group ${getClass('quads', activeGroups)}"
    cx="39" cy="130" rx="9" ry="22" style="${getStyle('quads', activeGroups)}"/>
  <!-- Quads right -->
  <ellipse id="quads-r" class="muscle-group ${getClass('quads', activeGroups)}"
    cx="61" cy="130" rx="9" ry="22" style="${getStyle('quads', activeGroups)}"/>

  <!-- Calves front left -->
  <ellipse id="calves-fl" class="muscle-group ${getClass('calves_front', activeGroups)}"
    cx="38" cy="175" rx="7" ry="14" style="${getStyle('calves_front', activeGroups)}"/>
  <!-- Calves front right -->
  <ellipse id="calves-fr" class="muscle-group ${getClass('calves_front', activeGroups)}"
    cx="62" cy="175" rx="7" ry="14" style="${getStyle('calves_front', activeGroups)}"/>
</svg>`;
}

// ── Build SVG Back View ───────────────────────
export function buildBackSVG(activeGroups = {}) {
  return `
<svg viewBox="0 0 100 220" class="muscle-map-svg" xmlns="http://www.w3.org/2000/svg">
  <!-- Head -->
  <ellipse cx="50" cy="20" rx="12" ry="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
  <!-- Neck -->
  <rect x="46" y="32" width="8" height="8" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
  <!-- Torso back -->
  <path d="M34 40 Q28 42 26 50 L24 90 Q24 95 50 95 Q76 95 76 90 L74 50 Q72 42 66 40 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>

  <!-- Trapezius -->
  <path id="trapezius" class="muscle-group ${getClass('trapezius', activeGroups)}"
    d="M38 40 L50 38 L62 40 L60 55 L50 58 L40 55 Z" style="${getStyle('trapezius', activeGroups)}"/>

  <!-- Lats left -->
  <path id="lats-l" class="muscle-group ${getClass('lats', activeGroups)}"
    d="M26 55 Q30 52 40 56 L38 90 Q28 88 24 80 Z" style="${getStyle('lats', activeGroups)}"/>
  <!-- Lats right -->
  <path id="lats-r" class="muscle-group ${getClass('lats', activeGroups)}"
    d="M74 55 Q70 52 60 56 L62 90 Q72 88 76 80 Z" style="${getStyle('lats', activeGroups)}"/>

  <!-- Lower back -->
  <ellipse id="lower-back" class="muscle-group ${getClass('lower_back', activeGroups)}"
    cx="50" cy="88" rx="10" ry="5" style="${getStyle('lower_back', activeGroups)}"/>

  <!-- Deltoids rear left -->
  <ellipse id="deltoid-rear-l" class="muscle-group ${getClass('deltoid_rear', activeGroups)}"
    cx="28" cy="50" rx="7" ry="8" style="${getStyle('deltoid_rear', activeGroups)}"/>
  <ellipse id="deltoid-rear-r" class="muscle-group ${getClass('deltoid_rear', activeGroups)}"
    cx="72" cy="50" rx="7" ry="8" style="${getStyle('deltoid_rear', activeGroups)}"/>

  <!-- Triceps left -->
  <ellipse id="triceps-l" class="muscle-group ${getClass('triceps', activeGroups)}"
    cx="22" cy="65" rx="5" ry="10" style="${getStyle('triceps', activeGroups)}"/>
  <!-- Triceps right -->
  <ellipse id="triceps-r" class="muscle-group ${getClass('triceps', activeGroups)}"
    cx="78" cy="65" rx="5" ry="10" style="${getStyle('triceps', activeGroups)}"/>

  <!-- Glutes left -->
  <ellipse id="glutes-l" class="muscle-group ${getClass('glutes', activeGroups)}"
    cx="41" cy="105" rx="11" ry="12" style="${getStyle('glutes', activeGroups)}"/>
  <!-- Glutes right -->
  <ellipse id="glutes-r" class="muscle-group ${getClass('glutes', activeGroups)}"
    cx="59" cy="105" rx="11" ry="12" style="${getStyle('glutes', activeGroups)}"/>

  <!-- Hamstrings left -->
  <ellipse id="hamstrings-l" class="muscle-group ${getClass('hamstrings', activeGroups)}"
    cx="40" cy="135" rx="9" ry="22" style="${getStyle('hamstrings', activeGroups)}"/>
  <!-- Hamstrings right -->
  <ellipse id="hamstrings-r" class="muscle-group ${getClass('hamstrings', activeGroups)}"
    cx="60" cy="135" rx="9" ry="22" style="${getStyle('hamstrings', activeGroups)}"/>

  <!-- Calves back left -->
  <ellipse id="calves-bl" class="muscle-group ${getClass('calves_back', activeGroups)}"
    cx="39" cy="176" rx="7" ry="14" style="${getStyle('calves_back', activeGroups)}"/>
  <!-- Calves back right -->
  <ellipse id="calves-br" class="muscle-group ${getClass('calves_back', activeGroups)}"
    cx="61" cy="176" rx="7" ry="14" style="${getStyle('calves_back', activeGroups)}"/>
</svg>`;
}

// ── Helper: Get CSS class for activation level ─
function getClass(muscleId, activeGroups) {
  const level = activeGroups[muscleId];
  if (!level) return '';
  return `active-${level}`;
}
function getStyle(muscleId, activeGroups) {
  return '';
}

// ── Compute active groups from exercise list ──
export function computeActiveGroups(exercises = []) {
  const counts = {};
  exercises.forEach(ex => {
    const key = ex.id || ex.name?.toLowerCase().replace(/ /g, '-');
    const mapping = EXERCISE_MUSCLES[key];
    if (!mapping) return;
    mapping.primary.forEach(m => {
      counts[m] = (counts[m] || 0) + 2;
    });
    mapping.secondary.forEach(m => {
      counts[m] = (counts[m] || 0) + 1;
    });
  });

  const maxCount = Math.max(...Object.values(counts), 1);
  const active = {};
  Object.entries(counts).forEach(([muscle, count]) => {
    const ratio = count / maxCount;
    active[muscle] = ratio > 0.65 ? 'high' : ratio > 0.3 ? 'mid' : 'low';
  });
  return active;
}

// ── Render full muscle map widget ─────────────
export function renderMuscleMap(container, exercises = []) {
  const activeGroups = computeActiveGroups(exercises);
  container.innerHTML = `
    <div class="muscle-map-wrap">
      <div class="muscle-map-side">
        <h5>Frontal</h5>
        ${buildFrontSVG(activeGroups)}
      </div>
      <div class="muscle-map-side">
        <h5>Posterior</h5>
        ${buildBackSVG(activeGroups)}
      </div>
    </div>
    <div class="muscle-legend" style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 16px;justify-content:center">
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--color-text-muted)">
        <span style="width:12px;height:12px;border-radius:3px;background:rgba(245,158,11,0.5);display:inline-block"></span> Baja
      </span>
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--color-text-muted)">
        <span style="width:12px;height:12px;border-radius:3px;background:rgba(239,68,68,0.6);display:inline-block"></span> Media
      </span>
      <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--color-text-muted)">
        <span style="width:12px;height:12px;border-radius:3px;background:rgba(148,10,10,0.8);display:inline-block"></span> Alta
      </span>
    </div>
  `;

  // Add hover tooltips to muscle groups
  container.querySelectorAll('.muscle-group').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const id = e.target.id.replace(/-[lr]$/, '').replace(/-/g, '_');
      const muscle = Object.entries(MUSCLE_GROUPS).find(([k]) => k === id || id.startsWith(k));
      if (muscle) {
        e.target.setAttribute('title', muscle[1].label);
      }
    });
  });
}
