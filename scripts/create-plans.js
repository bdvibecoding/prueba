/**
 * TGWL — Browser Console Script
 * Crea planes buscando rutinas por nombre (sin assignments previos).
 *
 * INSTRUCCIONES:
 *  1. Rellena los UIDs de Anahi y Luis abajo (los encuentras en
 *     Firebase Console → Authentication, o en el panel Usuarios del admin).
 *  2. Abre https://fasepruebasw.web.app/admin/ y entra como admin.
 *  3. DevTools → Console → pega todo y pulsa Enter.
 */

// ═══════════════════════════════════════════
//  CONFIGURA AQUÍ antes de ejecutar
// ═══════════════════════════════════════════
const CONFIG = {
  anahi: {
    uid:       'PEGAR_UID_ANAHI_AQUI',   // ← reemplaza
    name:      'Anahi Cabrera',
    planName:  'Plan Anahi / Mayo 2026',
    buscar:    'anah',   // fragmento del nombre de las rutinas a buscar
  },
  luis: {
    uid:       'PEGAR_UID_LUIS_AQUI',    // ← reemplaza
    name:      'Luis',
    planName:  'Plan Luis / Mayo 2026',
    buscar:    'luis',
  },
};
// ═══════════════════════════════════════════

(async () => {
  const db = firebase.firestore();
  const ts = firebase.firestore.FieldValue.serverTimestamp;

  // ── Cargar todas las rutinas ──────────────
  console.log('📚 Cargando rutinas...');
  const routinesSnap = await db.collection('routines').get();
  const allRoutines   = routinesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   ${allRoutines.length} rutinas en total.`);

  // ── Preview: mostrar qué rutinas encontraría ──
  for (const [key, cfg] of Object.entries(CONFIG)) {
    const found = allRoutines.filter(r =>
      (r.name || '').toLowerCase().includes(cfg.buscar.toLowerCase())
    );
    console.log(`\n🔍 Rutinas encontradas para "${cfg.name}" (buscar: "${cfg.buscar}"):`);
    if (found.length === 0) {
      console.warn('   ⚠️  Ninguna. Ajusta el campo "buscar" en CONFIG.');
    } else {
      found.forEach(r => console.log(`   • [${r.id}] ${r.name}`));
    }
  }

  // ── Confirmar ejecución ───────────────────
  const ok = confirm(
    '¿Crear los planes con las rutinas que aparecen en la consola?\n\n' +
    '(Si los UIDs son placeholder, cancela, pon los UIDs reales y vuelve a ejecutar)'
  );
  if (!ok) { console.log('❌ Cancelado.'); return; }

  // ── Crear plan para cada cliente ──────────
  for (const [key, cfg] of Object.entries(CONFIG)) {
    if (cfg.uid.startsWith('PEGAR')) {
      console.warn(`⚠️  UID de ${cfg.name} no configurado, se omite.`);
      continue;
    }

    const routines = allRoutines
      .filter(r => (r.name || '').toLowerCase().includes(cfg.buscar.toLowerCase()))
      .map(r => ({ routineId: r.id, name: r.name || r.id }));

    if (!routines.length) {
      console.warn(`⚠️  Sin rutinas para ${cfg.name}, se omite.`);
      continue;
    }

    // Evitar duplicados
    const existing = await db.collection('users').doc(cfg.uid)
      .collection('plans').where('name', '==', cfg.planName).get();
    if (!existing.empty) {
      console.log(`ℹ️  "${cfg.planName}" ya existe, se omite.`);
      continue;
    }

    await db.collection('users').doc(cfg.uid).collection('plans').add({
      name:       cfg.planName,
      routines,
      isActive:   false,
      assignedBy: 'script',
      createdAt:  ts(),
    });

    console.log(`✅ "${cfg.planName}" creado con ${routines.length} rutina(s):`);
    routines.forEach(r => console.log(`    • ${r.name}`));
  }

  console.log('\n🎉 Listo. Ve al panel Planes, selecciona al cliente y activa el plan.');
})();
