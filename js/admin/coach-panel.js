/* ═══════════════════════════════════════════════
   TGWL — admin/coach-panel.js
   Coach / Medico / Nutricionista Panel
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, getInitials } from '../utils.js';
import { openModal, closeModal, openSheet, closeSheet } from '../components/modal.js';

export async function render(container) {
  const profile = getUserProfile();
  const role    = profile?.role || 'coach';

  const roleConfig = {
    coach:          { title: '🏋️ Panel Coach',   subtitle: 'Gestiona tus clientes y rutinas' },
    medico:         { title: '🩺 Panel Médico',  subtitle: 'Registros de salud de tus pacientes' },
    nutricionista:  { title: '🥗 Panel Nutrición', subtitle: 'Menús y suplementación de tus clientes' },
  };
  const config = roleConfig[role] || roleConfig.coach;

  container.innerHTML = `
    <div class="page active" id="coach-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">${config.title}</h2>
            <p class="page-subtitle">${config.subtitle}</p>
          </div>
          ${role === 'coach' ? `<button class="btn-primary" id="btn-new-routine" style="padding:10px 16px;font-size:13px">+ Rutina</button>` : ''}
        </div>

        <!-- Tabs based on role -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="clients">Mis clientes</button>
          ${role === 'coach' ? '<button class="tab-btn" data-tab="routines">Rutinas</button>' : ''}
          ${role === 'nutricionista' ? '<button class="tab-btn" data-tab="diets">Dietas</button>' : ''}
          ${role === 'medico' ? '<button class="tab-btn" data-tab="health">Historial</button>' : ''}
        </div>

        <div id="tab-clients" class="tab-content">
          <div id="my-clients-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        </div>

        ${role === 'coach' ? `
        <div id="tab-routines" class="tab-content hidden">
          <div id="routines-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        </div>` : ''}

        ${role === 'nutricionista' ? `
        <div id="tab-diets" class="tab-content hidden">
          <div id="diets-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        </div>` : ''}

        ${role === 'medico' ? `
        <div id="tab-health" class="tab-content hidden">
          <p class="text-muted" style="padding:var(--space-md)">Selecciona un cliente para ver su historial de salud.</p>
        </div>` : ''}
      </div>
    </div>
  `;
}

export async function init(container) {
  const profile = getUserProfile();
  const role    = profile?.role;

  loadMyClients(container, profile);

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'routines') loadMyRoutines(container, profile);
      if (btn.dataset.tab === 'diets')    loadMyDiets(container, profile);
    });
  });

  if (role === 'coach') {
    container.querySelector('#btn-new-routine')?.addEventListener('click', () => openNewRoutineModal(profile, container));
  }
}

// ── My Clients ────────────────────────────────
async function loadMyClients(container, profile) {
  const el = container.querySelector('#my-clients-list');
  try {
    const snap = await db.collection('users')
      .where('assignedCoach', '==', profile.uid)
      .limit(50)
      .get();

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Sin clientes asignados</div><div class="empty-subtitle">El administrador te asignará clientes.</div></div>`;
      return;
    }

    const clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    el.innerHTML = clients.map(client => `
      <div class="admin-user-card" data-uid="${client.uid || client.id}" style="cursor:pointer">
        <div class="admin-user-avatar">${getInitials(client.name || '?')}</div>
        <div class="admin-user-info">
          <div class="admin-user-name">${client.name || 'Cliente'}</div>
          <div class="admin-user-email">${client.email || ''}</div>
          <div style="margin-top:4px;display:flex;gap:6px">
            <span class="badge badge-gray">${client.experience || 'principiante'}</span>
            ${client.subscriptionStatus && client.subscriptionStatus !== 'free' ? `<span class="badge badge-cyan">${client.subscriptionStatus}</span>` : ''}
          </div>
        </div>
        <span style="color:var(--cyan);font-size:13px">Ver →</span>
      </div>
    `).join('');

    el.querySelectorAll('.admin-user-card').forEach(card => {
      card.addEventListener('click', () => {
        const uid = card.dataset.uid;
        const client = clients.find(c => (c.uid || c.id) === uid);
        if (client) openClientSheet(client, profile);
      });
    });
  } catch (e) {
    el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }
}

// ── Client Detail Sheet ───────────────────────
async function openClientSheet(client, profile) {
  const uid = client.uid || client.id;
  const html = `
    <h4 style="margin-bottom:4px">${client.name}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md)">${client.email}</p>

    <div class="tabs">
      <button class="tab-btn active" data-ctab="overview">Resumen</button>
      <button class="tab-btn" data-ctab="routines">Rutinas</button>
      <button class="tab-btn" data-ctab="notes">Notas</button>
    </div>

    <div id="ctab-overview">
      <div class="quick-stats" style="margin:var(--space-md) 0">
        <div class="glass-card stat-card"><div class="stat-value" id="cs-workouts">—</div><div class="stat-label">Entrenos</div></div>
        <div class="glass-card stat-card"><div class="stat-value" id="cs-rpe">—</div><div class="stat-label">RPE medio</div></div>
      </div>
      <div id="cs-last-workout" class="text-muted"></div>
    </div>

    <div id="ctab-routines" style="display:none">
      <div id="client-routines"><div class="spinner-sm"></div></div>
      <button class="btn-accent btn-full" id="btn-add-routine-client" style="margin-top:var(--space-md)">
        📋 Asignar nueva rutina
      </button>
    </div>

    <div id="ctab-notes" style="display:none">
      <textarea id="coach-notes-input" class="input-solo" rows="4"
        placeholder="Anotaciones sobre el cliente..."
        style="padding:var(--space-md);width:100%;margin-bottom:var(--space-sm)">${client.coachNotes || ''}</textarea>
      <button class="btn-primary btn-full" id="btn-save-coach-notes">Guardar notas</button>
    </div>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  // Load client overview
  loadClientOverview(sc, uid);
  loadClientRoutines(sc, uid);

  // Tabs
  sc.querySelectorAll('[data-ctab]').forEach(btn => {
    btn.addEventListener('click', () => {
      sc.querySelectorAll('[data-ctab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['overview','routines','notes'].forEach(t => {
        const el = sc.querySelector(`#ctab-${t}`);
        if (el) el.style.display = t === btn.dataset.ctab ? '' : 'none';
      });
    });
  });

  // Add routine
  sc.querySelector('#btn-add-routine-client')?.addEventListener('click', () => openAssignRoutineFromCoach(uid));

  // Save coach notes
  sc.querySelector('#btn-save-coach-notes')?.addEventListener('click', async () => {
    const notes = sc.querySelector('#coach-notes-input').value.trim();
    await db.collection('users').doc(uid).update({ coachNotes: notes, updatedAt: timestamp() });
    toast('Notas guardadas ✅', 'success');
  });
}

async function loadClientOverview(sc, uid) {
  try {
    const snap = await collections.workoutSessions(uid)
      .orderBy('startTime','desc').limit(10).get();

    const sessions = snap.docs.map(d => d.data());
    const avgRpe   = sessions.filter(s => s.rpe).reduce((a, s, _, arr) => a + s.rpe / arr.length, 0);
    const last     = sessions[0];

    sc.querySelector('#cs-workouts').textContent = sessions.length;
    sc.querySelector('#cs-rpe').textContent = avgRpe ? avgRpe.toFixed(1) : '—';
    if (last && sc.querySelector('#cs-last-workout')) {
      sc.querySelector('#cs-last-workout').textContent =
        `Último entreno: ${formatDate(last.startTime?.toDate?.() || new Date(last.startTime))} — ${last.routineName || ''}`;
    }
  } catch { /* ignore */ }
}

async function loadClientRoutines(sc, uid) {
  const el = sc.querySelector('#client-routines');
  if (!el) return;
  try {
    const snap = await collections.assignments(uid).limit(10).get();
    if (snap.empty) { el.innerHTML = `<p class="text-muted">Sin rutinas asignadas</p>`; return; }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span>💪</span>
          <div style="flex:1;font-size:13px">${d.name || d.routineId}</div>
          <span class="text-muted" style="font-size:11px">${formatDate(d.assignedAt?.toDate?.() || d.assignedAt)}</span>
        </div>
      `;
    }).join('');
  } catch (e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function openAssignRoutineFromCoach(clientUid) {
  const routineSnap = await db.collection('routines').limit(30).get();
  const routines = routineSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    ${routines.map(r => `
      <div class="admin-user-card" data-rid="${r.id}" data-rname="${r.name}" style="cursor:pointer">
        <span style="font-size:20px">💪</span>
        <div style="flex:1">
          <div style="font-weight:700">${r.name}</div>
          <div class="text-muted">${r.exercises?.length || 0} ejercicios</div>
        </div>
        <span class="badge badge-cyan">Asignar</span>
      </div>
    `).join('')}
  `;

  openModal(html);
  document.getElementById('modal-content').querySelectorAll('[data-rid]').forEach(card => {
    card.addEventListener('click', async () => {
      await collections.assignments(clientUid).add({
        routineId: card.dataset.rid, name: card.dataset.rname,
        assignedBy: getUserProfile()?.uid, assignedAt: timestamp(), createdAt: timestamp(),
      });
      toast('Rutina asignada ✅', 'success');
      closeModal();
    });
  });
}

// ── My Routines (Coach) ───────────────────────
async function loadMyRoutines(container, profile) {
  const el = container.querySelector('#routines-list');
  if (!el) return;

  el.innerHTML = `
    <button class="btn-primary btn-full" id="btn-create-routine-tab" style="margin-bottom:var(--space-md)">
      + Nueva rutina
    </button>
    <div id="routines-cards"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
  `;

  el.querySelector('#btn-create-routine-tab')?.addEventListener('click', () => openNewRoutineModal(profile, container));
  await renderRoutineCards(el.querySelector('#routines-cards'), profile, container);
}

async function renderRoutineCards(el, profile, container) {
  if (!el) return;
  try {
    const snap = await db.collection('routines').where('createdBy', '==', profile.uid).limit(30).get();
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Sin rutinas creadas</div><div class="empty-subtitle">Crea tu primera rutina arriba.</div></div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const tags = r.tags?.map(t => `<span class="badge badge-gray">${t}</span>`).join('') || '';
      const muscles = [...new Set((r.exercises || []).map(e => e.muscleGroup).filter(Boolean))].slice(0, 3).join(' · ');
      return `
        <div class="glass-card" style="margin-bottom:var(--space-sm);padding:var(--space-md)">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
            <div style="font-size:26px;line-height:1">💪</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px">${r.name}</div>
              <div class="text-muted" style="font-size:12px;margin-top:2px">
                ${r.exercises?.length || 0} ejercicios${muscles ? ' · ' + muscles : ''}
              </div>
              ${tags ? `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${tags}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" style="flex:1;font-size:12px;padding:8px" data-edit-rid="${doc.id}">✏️ Editar</button>
            <button class="btn-accent" style="flex:1;font-size:12px;padding:8px" data-assign-rid="${doc.id}" data-assign-rname="${r.name}">📋 Asignar</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-edit-rid]').forEach(btn => {
      btn.addEventListener('click', () => openEditRoutineModal(btn.dataset.editRid, profile, container));
    });

    el.querySelectorAll('[data-assign-rid]').forEach(btn => {
      btn.addEventListener('click', () => openAssignClientForRoutine(btn.dataset.assignRid, btn.dataset.assignRname, profile));
    });
  } catch (e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

// ── Assign routine → pick client ─────────────
async function openAssignClientForRoutine(routineId, routineName, profile) {
  let clients = [];
  try {
    const snap = await db.collection('users').where('assignedCoach', '==', profile.uid).get();
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { /* ignore */ }

  if (!clients.length) {
    toast('No tienes clientes asignados aún', 'info');
    return;
  }

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">
      "<strong>${routineName}</strong>" → selecciona el cliente:
    </p>
    ${clients.map(c => `
      <div class="admin-user-card" data-cuid="${c.uid || c.id}" data-cname="${c.name || 'Cliente'}" style="cursor:pointer;margin-bottom:6px">
        <div class="admin-user-avatar">${getInitials(c.name || '?')}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${c.name || 'Cliente'}</div>
          <div class="text-muted" style="font-size:12px">${c.email || ''}</div>
        </div>
        <span class="badge badge-cyan">Asignar</span>
      </div>
    `).join('')}
  `;

  openModal(html);
  document.getElementById('modal-content').querySelectorAll('[data-cuid]').forEach(card => {
    card.addEventListener('click', async () => {
      await collections.assignments(card.dataset.cuid).add({
        routineId, name: routineName,
        assignedBy: profile.uid,
        assignedAt: timestamp(), createdAt: timestamp(),
      });
      toast(`Rutina asignada a ${card.dataset.cname} ✅`, 'success');
      closeModal();
    });
  });
}

// ── New / Edit Routine Modal ──────────────────
async function openNewRoutineModal(profile, container) {
  await openEditRoutineModal(null, profile, container);
}

async function openEditRoutineModal(routineId, profile, container) {
  let routine = { name: '', description: '', exercises: [], tags: [] };
  if (routineId) {
    const snap = await db.collection('routines').doc(routineId).get();
    if (snap.exists) routine = { id: snap.id, ...snap.data() };
  }

  const { EXERCISES } = await import('../../data/data.js');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${routineId ? 'Editar' : 'Nueva'} Rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <input type="text" id="routine-name" class="input-solo" placeholder="Nombre de la rutina" value="${routine.name}">
    </div>
    <div class="form-row">
      <textarea id="routine-desc" class="input-solo" rows="2" placeholder="Descripción..."
        style="padding:var(--space-md);width:100%">${routine.description || ''}</textarea>
    </div>
    <div class="section-title">Ejercicios</div>
    <div id="routine-exercises-list">
      ${routine.exercises?.map((ex, i) => buildRoutineExRow(ex, i)).join('') || '<p class="text-muted">Añade ejercicios</p>'}
    </div>
    <div style="position:relative;margin:8px 0 4px">
      <input type="text" id="cp-ex-search" class="input-solo" placeholder="🔍 Buscar ejercicio o músculo..." style="font-size:12px;width:100%" autocomplete="off">
      <div id="cp-ex-results" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:#1a1a2e;border:1px solid var(--glass-border);border-radius:var(--radius-sm);z-index:200;margin-top:2px"></div>
    </div>
    <button class="btn-accent btn-full" id="btn-add-ex-to-routine" style="margin-bottom:12px">+ Añadir ejercicio seleccionado</button>
    <button class="btn-primary btn-full" id="btn-save-routine" style="margin-top:var(--space-md)">
      💾 Guardar rutina
    </button>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  let exercises = [...(routine.exercises || [])];

  let _cpSelEx = null;
  const cpSearch = modal.querySelector('#cp-ex-search');
  const cpResults = modal.querySelector('#cp-ex-results');
  cpSearch?.addEventListener('input', () => {
    const q = cpSearch.value.toLowerCase().trim();
    if (!q) { cpResults.style.display = 'none'; return; }
    const hits = EXERCISES.filter(e => e.n.toLowerCase().includes(q) || e.m.toLowerCase().includes(q)).slice(0, 20);
    if (!hits.length) { cpResults.style.display = 'none'; return; }
    cpResults.innerHTML = hits.map(e => `
      <div data-ex="${e.n}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--glass-border);display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
        <span style="color:#e2e8f0;font-size:13px">${e.n}</span>
        <span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:8px;white-space:nowrap">${e.m}</span>
      </div>`).join('');
    cpResults.style.display = 'block';
    cpResults.querySelectorAll('[data-ex]').forEach(row => {
      row.addEventListener('click', () => {
        _cpSelEx = EXERCISES.find(e => e.n === row.dataset.ex);
        cpSearch.value = _cpSelEx.n;
        cpResults.style.display = 'none';
      });
    });
  });

  modal.querySelector('#btn-add-ex-to-routine')?.addEventListener('click', () => {
    if (!_cpSelEx) return;
    exercises.push({ id:_cpSelEx.n, name:_cpSelEx.n, muscleGroup:_cpSelEx.m, videoUrl:_cpSelEx.v||'', setupNotes:(_cpSelEx.instructions||[]).join(' '), sets:3, reps:'10', weight:0, restSeconds:60 });
    _cpSelEx = null;
    cpSearch.value = '';
    refreshExerciseList();
  });

  function refreshExerciseList() {
    const listEl = modal.querySelector('#routine-exercises-list');
    if (!exercises.length) { listEl.innerHTML = `<p class="text-muted">Sin ejercicios aún</p>`; return; }
    listEl.innerHTML = exercises.map((ex, i) => buildRoutineExRow(ex, i)).join('');
    listEl.querySelectorAll('[data-remove-ex]').forEach(btn => {
      btn.addEventListener('click', () => {
        exercises.splice(parseInt(btn.dataset.removeEx), 1);
        refreshExerciseList();
      });
    });
    listEl.querySelectorAll('[data-sets]').forEach(b => b.addEventListener('change', () => { exercises[+b.dataset.sets].sets = parseInt(b.value) || 3; }));
    listEl.querySelectorAll('[data-reps]').forEach(b => b.addEventListener('change', () => { exercises[+b.dataset.reps].reps = b.value; }));
  }

  refreshExerciseList();

  modal.querySelector('#btn-save-routine')?.addEventListener('click', async () => {
    const name = modal.querySelector('#routine-name').value.trim();
    if (!name) { toast('Introduce un nombre', 'warning'); return; }

    const data = {
      name,
      description: modal.querySelector('#routine-desc').value.trim(),
      exercises,
      createdBy: profile.uid,
      updatedAt: timestamp(),
    };

    try {
      if (routineId) {
        await db.collection('routines').doc(routineId).update(data);
        toast('Rutina actualizada ✅', 'success');
      } else {
        data.createdAt = timestamp();
        await db.collection('routines').add(data);
        toast('Rutina creada ✅', 'success');
      }
      closeModal();
      if (container) {
        const cardsEl = container.querySelector('#routines-cards');
        if (cardsEl) await renderRoutineCards(cardsEl, profile, container);
        else loadMyRoutines(container, profile);
      }
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}

function buildRoutineExRow(ex, index) {
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--glass-bg);border-radius:var(--radius-sm);margin-bottom:4px">
      <span style="font-size:12px;font-weight:700;color:var(--color-text-muted);min-width:20px">${index + 1}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${ex.name}</div>
        <div style="display:flex;gap:8px;margin-top:2px">
          <input type="number" value="${ex.sets || 3}" min="1" max="10" style="width:40px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--white);font-size:11px;text-align:center;padding:2px" data-sets="${index}">
          <span style="font-size:11px;color:var(--color-text-muted)">×</span>
          <input type="text" value="${ex.reps || '10'}" placeholder="ej: 12 o 20-16-16" style="width:72px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--white);font-size:11px;text-align:center;padding:2px" data-reps="${index}">
          <span style="font-size:11px;color:var(--color-text-muted)">kg</span>
          <input type="number" value="${ex.weight || 0}" step="0.5" style="width:44px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--white);font-size:11px;text-align:center;padding:2px" placeholder="Peso">
        </div>
      </div>
      <button style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:16px" data-remove-ex="${index}">✕</button>
    </div>
  `;
}

// ── My Diets (Nutricionista) ──────────────────
async function loadMyDiets(container, profile) {
  const el = container.querySelector('#diets-list');
  if (!el) return;
  el.innerHTML = `
    <button class="btn-primary btn-full" id="btn-assign-diet" style="margin-bottom:var(--space-md)">
      + Asignar menú a cliente
    </button>
    <p class="text-muted" style="font-size:13px">Selecciona un cliente y asigna uno de los menús disponibles.</p>
  `;
  el.querySelector('#btn-assign-diet')?.addEventListener('click', () => openAssignDietModal(profile));
}

async function openAssignDietModal(profile) {
  const clientSnap = await db.collection('users').where('assignedCoach', '==', profile.uid).get();
  const clients    = clientSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🥗 Asignar menú</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">Cliente</label>
      <select id="diet-client" class="input-solo" style="margin-top:4px">
        ${clients.map(c => `<option value="${c.uid || c.id}">${c.name} (${c.email})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <label class="field-label">Tipo de dieta</label>
      <select id="diet-type" class="input-solo" style="margin-top:4px">
        <option value="volumen">Volumen</option>
        <option value="definicion">Definición</option>
        <option value="mantenimiento">Mantenimiento</option>
      </select>
    </div>
    <div class="form-row">
      <label class="field-label">Nombre del menú</label>
      <input type="text" id="diet-name" class="input-solo" placeholder="Ej: Menú semana 1">
    </div>
    <button class="btn-primary btn-full" id="btn-confirm-diet" style="margin-top:var(--space-md)">Asignar</button>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  modal.querySelector('#btn-confirm-diet')?.addEventListener('click', async () => {
    const clientId = modal.querySelector('#diet-client').value;
    const type     = modal.querySelector('#diet-type').value;
    const name     = modal.querySelector('#diet-name').value.trim() || `Menú ${type}`;

    await collections.dietas(clientId).add({
      type, name,
      assignedBy: profile.uid,
      assignedAt: timestamp(),
      createdAt:  timestamp(),
    });
    toast(`Menú "${name}" asignado ✅`, 'success');
    closeModal();
  });
}
