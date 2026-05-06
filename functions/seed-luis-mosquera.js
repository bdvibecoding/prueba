/**
 * One-time seed endpoint — Luis Mosquera Training Plan (Mayo 2026)
 * Deploy, call once via browser/curl, then undeploy.
 *
 * URL: https://us-central1-fasepruebasw.cloudfunctions.net/seedLuisMosquera
 * Security: simple secret token in query param  ?token=tgwl-seed-2026
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const SEED_TOKEN = 'tgwl-seed-2026';

function ex(name, muscleGroup, sets, reps, restSeconds, setupNotes) {
  return {
    id: name, name, muscleGroup,
    sets, reps: String(reps), restSeconds,
    weight: 0, warmupSets: 0,
    videoUrl: '', setupNotes,
  };
}

const routines = [
  // ── DÍA 1 — FULL UPPER BODY ──────────────────
  {
    name: 'Luis Mosquera - Día 1 Full Upper Body',
    description: 'Full Upper Body · Dejar 1 día de descanso entre entrenamientos · 25-30 min cardio LISS post-entrenamiento · Mínimo 1 litro de agua · No sacrificar la técnica.',
    exercises: [
      ex('REMO MANCUERNA UNILATERAL',           'Dorsales',   5, '16',          52, 'Movimientos controlados, pesos medios. Contraer y aguantar 1 segundo arriba.'),
      ex('PÁJAROS MANCUERNA (POSTERIOR)',        'Hombros',    4, '16',          45, 'Movimientos controlados, pesos medios. Contraer y aguantar 1 segundo arriba.'),
      ex('PRESS HOMBRO MANCUERNAS SENTADO',      'Hombros',    4, '16',          45, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('CURL CON BARRA Z',                     'Bíceps',     4, '16',          52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('PRESS INCLINADO MANCUERNAS',           'Pecho',      5, '16',          52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('APERTURAS MANCUERNAS INCLINADAS',      'Pecho',      5, '16',          52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('PATADA DE TRÍCEPS MANCUERNA',          'Tríceps',    4, '16',          52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('CAMINATA (CARDIO LISS)',                'Cardio',     1, '25-30 min',   0, '25-30 min de ejercicio cardiovascular post-entrenamiento. LISS — Low-Intensity Steady State.'),
    ],
  },
  // ── DÍA 2 — PIERNAS ──────────────────────────
  {
    name: 'Luis Mosquera - Día 2 Piernas',
    description: 'Piernas · Dejar 1 día de descanso entre entrenamientos · 25-30 min cardio LISS post-entrenamiento · Mínimo 1 litro de agua · No sacrificar la técnica.',
    exercises: [
      ex('GEMELO DE PIE MÁQUINA',     'Gemelos',     5, '20',             45, 'Movimientos lentos y controlados, pesos pesados. Contraer arriba.'),
      ex('SENTADILLA CON BARRA',      'Cuádriceps',  5, '20/16/16/14/12', 52, 'Movimientos lentos y controlados, pesos medios. Pirámide descendente de reps.'),
      ex('ZANCADAS MANCUERNAS',       'Cuádriceps',  4, '12',             52, 'Movimientos lentos y controlados. 12 pasos por pierna.'),
      ex('PESO MUERTO RUMANO BARRA',  'Isquios',     5, '20/16/16/14/12', 65, 'Movimientos lentos y controlados, pesos medios. Pirámide descendente de reps.'),
      ex('HIP THRUST BARRA',          'Glúteos',     5, '20',             45, 'Movimientos lentos y controlados, pesos medios.'),
      ex('CAMINATA (CARDIO LISS)',     'Cardio',      1, '25-30 min',       0, '25-30 min de ejercicio cardiovascular post-entrenamiento. LISS — Low-Intensity Steady State.'),
    ],
  },
  // ── DÍA 3 — FULL UPPER BODY (OPCIONAL) ───────
  {
    name: 'Luis Mosquera - Día 3 Full Upper Body (Opcional)',
    description: 'Full Upper Body — sesión opcional · Dejar 1 día de descanso entre entrenamientos · 25-30 min cardio LISS post-entrenamiento · Mínimo 1 litro de agua · No sacrificar la técnica.',
    exercises: [
      ex('REMO CON BARRA 45º (YATES)',                 'Dorsales',    5, '16',         52, 'Movimientos controlados, pesos medios. Contraer y aguantar 1 segundo arriba.'),
      ex('REMO AL MENTÓN AGARRE ESTRECHO',             'Espalda Alta',5, '16',         45, 'Movimientos controlados, pesos medios. Contraer y aguantar 1 segundo arriba.'),
      ex('ELEVACIONES LATERALES MANCUERNA',            'Hombros',     4, '16',         45, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('CURL CON MANCUERNAS ALTERNO',                'Bíceps',      4, '16',         52, 'Movimientos lentos, pesos medios. Doble bíceps alterno, máxima contracción.'),
      ex('PRESS BANCA MANCUERNAS PLANO',               'Pecho',       5, '16',         52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('PRESS INCLINADO BARRA',                      'Pecho',       5, '16',         52, 'Movimientos lentos, pesos medios. Enfocarse en máxima contracción.'),
      ex('COPA TRÍCEPS A DOS MANOS (FRENCH PRESS)',    'Tríceps',     4, '16',         52, 'Movimientos lentos, pesos medios. Extensiones sobre cabeza, máxima contracción.'),
      ex('CAMINATA (CARDIO LISS)',                     'Cardio',      1, '25-30 min',   0, '25-30 min de ejercicio cardiovascular post-entrenamiento. LISS — Low-Intensity Steady State.'),
    ],
  },
];

exports.seedLuisMosquera = onRequest(
  { region: 'us-central1', invoker: 'public', timeoutSeconds: 30 },
  async (req, res) => {
    // Simple token guard — prevents accidental re-runs
    if (req.query.token !== SEED_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const db = admin.firestore();
      const results = [];

      for (const routine of routines) {
        const doc = {
          ...routine,
          createdBy: 'seed-script',
          updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
        };
        const ref = await db.collection('routines').add(doc);
        results.push({ name: routine.name, id: ref.id });
      }

      return res.status(200).json({
        ok: true,
        message: `✅ ${results.length} rutinas creadas para Luis Mosquera`,
        routines: results,
      });
    } catch (err) {
      console.error('[seedLuisMosquera]', err);
      return res.status(500).json({ error: err.message });
    }
  }
);
