/**
 * ONE-TIME SEED — Anahi Cabrera Mayo 2026
 * Deploy: firebase deploy --only functions:seedAnahi
 * Call:   curl "https://REGION-fasepruebasw.cloudfunctions.net/seedAnahi?token=tgwl-seed-2026"
 * Delete after use.
 */
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

exports.seedAnahi = functions.https.onRequest(async (req, res) => {
  if (req.query.token !== 'tgwl-seed-2026') return res.status(403).send('Forbidden');

  const ts = admin.firestore.FieldValue.serverTimestamp();

  const routines = [
    // ── DÍA 1 — PIERNAS ────────────────────────────────────────────
    {
      name: 'Anahi Cabrera - Día 1 Piernas',
      description: 'Dejar 1 día de descanso entre entrenamiento. Seguir la secuencia de ejercicios. Tomar al menos 600 ml de agua. No sacrificar la técnica.',
      createdBy: 'seed-script',
      createdAt: ts,
      updatedAt: ts,
      exercises: [
        {
          name: 'GEMELO DE PIE MÁQUINA',
          muscleGroup: 'Gemelos',
          sets: 4, reps: '20', rest: 60,
          setupNotes: 'Movimientos lentos, pesos medios. Contraer y aguantar 2 segundos arriba en cada rep.',
        },
        {
          name: 'SENTADILLA SUMO',
          muscleGroup: 'Glúteos',
          sets: 4, reps: '16', rest: 60,
          setupNotes: 'Sumo squats con mancuerna. Movimientos lentos, aguantar 2 segundos abajo cada rep.',
        },
        {
          name: 'SENTADILLA ISOMÉTRICA (PARED)',
          muscleGroup: 'Cuádriceps',
          sets: 4, reps: '25-30 seg', rest: 60,
          setupNotes: 'Wall sit con soporte en pared. Aguantar 25-30 segundos por serie.',
        },
        {
          name: 'HIP THRUST BARRA',
          muscleGroup: 'Glúteos',
          sets: 4, reps: '20', rest: 60,
          setupNotes: '10 reps sin pausa + 10 reps con pausa de 3 segundos arriba cada rep. Solo usar bandas de aducción.',
        },
        {
          name: 'PESO MUERTO RUMANO BARRA',
          muscleGroup: 'Isquios',
          sets: 4, reps: '12', rest: 60,
          setupNotes: 'Con mancuernas o barra. Movimientos lentos y pesos controlados.',
        },
        {
          name: 'CAMINATA (CARDIO LISS)',
          muscleGroup: 'Cardio',
          sets: 1, reps: '25-30 min', rest: 0,
          setupNotes: 'LISS Low-Intensity Steady State. Realizar después del entrenamiento.',
        },
      ],
    },

    // ── DÍA 2 — UPPER BODY ─────────────────────────────────────────
    {
      name: 'Anahi Cabrera - Día 2 Upper Body',
      description: 'Dejar 1 día de descanso entre entrenamiento. Seguir la secuencia de ejercicios. Tomar al menos 600 ml de agua. No sacrificar la técnica.',
      createdBy: 'seed-script',
      createdAt: ts,
      updatedAt: ts,
      exercises: [
        {
          name: 'REMO SENTADO POLEA BAJA',
          muscleGroup: 'Dorsales',
          sets: 4, reps: '20/18/16/16', rest: 60,
          setupNotes: 'Remo sentado con ligas. Movimientos lentos, contraer y aguantar 1 segundo al final del recorrido.',
        },
        {
          name: 'REMO MANCUERNA UNILATERAL',
          muscleGroup: 'Dorsales',
          sets: 4, reps: '20/18/16/16', rest: 60,
          setupNotes: 'Remo de pie con ligas o mancuerna. Movimientos lentos, contraer y aguantar 1 segundo al final del recorrido.',
        },
        {
          name: 'PÁJAROS MANCUERNA (POSTERIOR)',
          muscleGroup: 'Hombros',
          sets: 4, reps: '16', rest: 60,
          setupNotes: 'Posteriores con ligas o mancuernas. Movimientos lentos, contraer y aguantar 1 segundo al final.',
        },
        {
          name: 'COPA TRÍCEPS A DOS MANOS (FRENCH PRESS)',
          muscleGroup: 'Tríceps',
          sets: 4, reps: '16', rest: 60,
          setupNotes: 'Extensiones sobre la cabeza con liga o mancuernas. Movimientos controlados, aguantar 1 segundo en contracción.',
        },
        {
          name: 'CURL CON MANCUERNAS ALTERNO',
          muscleGroup: 'Bíceps',
          sets: 4, reps: '16', rest: 60,
          setupNotes: 'Curl de bíceps con ligas o mancuernas. Movimientos lentos y controlados, aguantar 1 segundo arriba de cada rep.',
        },
        {
          name: 'PATADA DE TRÍCEPS MANCUERNA',
          muscleGroup: 'Tríceps',
          sets: 4, reps: '16', rest: 60,
          setupNotes: 'Movimientos lentos y controlados, aguantar 1 segundo arriba de cada rep.',
        },
        {
          name: 'PLANCHA ABDOMINAL (PLANK)',
          muscleGroup: 'Abs',
          sets: 4, reps: '30 seg', rest: 60,
          setupNotes: 'Abdominales isométricos con piernas extendidas. Aguantar 30 segundos por serie.',
        },
        {
          name: 'CAMINATA (CARDIO LISS)',
          muscleGroup: 'Cardio',
          sets: 1, reps: '25-30 min', rest: 0,
          setupNotes: 'LISS Low-Intensity Steady State. Realizar después del entrenamiento.',
        },
      ],
    },

    // ── DÍA 3 — PIERNAS (OPCIONAL) ─────────────────────────────────
    {
      name: 'Anahi Cabrera - Día 3 Piernas (Opcional)',
      description: 'Día opcional. Dejar 1 día de descanso entre entrenamiento. Seguir la secuencia de ejercicios. No sacrificar la técnica.',
      createdBy: 'seed-script',
      createdAt: ts,
      updatedAt: ts,
      exercises: [
        {
          name: 'GEMELO DE PIE MÁQUINA',
          muscleGroup: 'Gemelos',
          sets: 4, reps: '20', rest: 60,
          setupNotes: 'Movimientos lentos, pesos medios. Contraer y aguantar 2 segundos arriba en cada rep.',
        },
        {
          name: 'ZANCADAS MANCUERNAS',
          muscleGroup: 'Cuádriceps',
          sets: 4, reps: '12', rest: 45,
          setupNotes: 'Lunges. Movimiento lento, peso medio.',
        },
        {
          name: 'SENTADILLA ISOMÉTRICA (PARED)',
          muscleGroup: 'Cuádriceps',
          sets: 4, reps: '25-30 seg', rest: 60,
          setupNotes: 'Wall sit con soporte en pared. Aguantar 25-30 segundos por serie.',
        },
        {
          name: 'HIP THRUST BARRA',
          muscleGroup: 'Glúteos',
          sets: 4, reps: '20', rest: 60,
          setupNotes: '10 reps sin pausa + 10 reps con pausa de 3 segundos arriba cada rep. Solo usar bandas de aducción.',
        },
        {
          name: 'ABDUCCIÓN MÁQUINA',
          muscleGroup: 'Abductores',
          sets: 4, reps: '12', rest: 45,
          setupNotes: 'Patada lateral con banda. Movimientos lentos, aguantar 1 segundo en la posición fuera de cada rep.',
        },
        {
          name: 'PESO MUERTO RUMANO BARRA',
          muscleGroup: 'Isquios',
          sets: 4, reps: '12', rest: 60,
          setupNotes: 'Con mancuernas o barra. Movimientos lentos y pesos controlados.',
        },
        {
          name: 'CAMINATA (CARDIO LISS)',
          muscleGroup: 'Cardio',
          sets: 1, reps: '25-30 min', rest: 0,
          setupNotes: 'LISS Low-Intensity Steady State. Realizar después del entrenamiento.',
        },
      ],
    },
  ];

  try {
    const batch = db.batch();
    routines.forEach(r => batch.set(db.collection('routines').doc(), r));
    await batch.commit();
    res.json({ ok: true, created: routines.length, names: routines.map(r => r.name) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
