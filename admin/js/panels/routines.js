import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients = [];
let _selectedClient = null;
let _exercisesList = [];
let _selectedExercises = [];
let _editingRoutineId = null;
let _editingAssignmentId = null;
let _viewMode = 'clients'; // 'clients' | 'library'

export async function render(container, profile) {
  _profile = profile;

  if (!document.getElementById('dash-panel-css')) {
    const style = document.createElement('style');
    style.id = 'dash-panel-css';
    style.textContent = `
      .dash-panel-layout { display: flex; height: 100%; width: 100%; overflow: hidden; }
      .dash-panel-list-col { width: 320px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; background: var(--color-bg); flex-shrink: 0; }
      .dash-panel-head { padding: 24px; border-bottom: 1px solid var(--glass-border); }
      .dash-panel-list { flex: 1; overflow-y: auto; padding: 12px; }
      .dash-client-card { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
      .dash-client-card:hover { background: var(--glass-bg); }
      .dash-client-card.active { background: var(--glass-bg-strong); border-color: var(--cyan); box-shadow: inset 4px 0 0 var(--cyan); }
      .dash-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(0, 200, 255, 0.15); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; overflow: hidden; }

      .dash-builder-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg); position: relative; }
      .dash-builder-head { padding: 32px 40px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: var(--glass-bg); }
      .dash-builder-body { flex: 1; overflow-y: auto; padding: 40px; }

      .dash-empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.5; }

      .dash-section-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--white); display: flex; align-items: center; gap: 8px; }
      .dash-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }

      .dash-input-group { display: flex; flex-direction: column; gap: 10px; }
      .dash-label { font-size: 13px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .dash-input { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px 16px; font-size: 15px; color: var(--white); font-family: inherit; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
      .dash-input:focus { outline: none; border-color: var(--cyan); }
      .dash-textarea { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; font-size: 15px; color: var(--white); font-family: inherit; resize: vertical; min-height: 100px; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
      .dash-textarea:focus { outline: none; border-color: var(--cyan); }

      .dash-bottom-action { position: sticky; bottom: 0; background: var(--color-bg); padding: 24px 40px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 12px; }
      .btn-save-dash { background: var(--cyan); color: #000; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: opacity 0.2s; }
      .btn-save-dash:hover { opacity: 0.9; }

      .ex-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
      .search-results { position: absolute; z-index: 100; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 12px; width: 100%; max-height: 300px; overflow-y: auto; top: 100%; margin-top: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: none; }
      .search-item { padding: 12px 16px; display: flex; justify-content: space-between; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .search-item:hover { background: rgba(255,255,255,0.05); }

      /* View toggle */
      .rt-view-toggle { display: flex; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border); margin-bottom: 16px; }
      .rt-view-toggle-btn { flex: 1; padding: 10px; text-align: center; font-size: 12px; font-weight: 700; cursor: pointer; border: none; background: transparent; color: var(--color-text-muted); transition: 0.2s; font-family: inherit; }
      .rt-view-toggle-btn.active { background: var(--cyan); color: #000; }

      /* Routine library card */
      .rt-lib-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
      .rt-lib-card:hover { background: var(--glass-bg); }

      /* History Slide-over */
      .dh-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
      .dh-overlay.active { opacity: 1; pointer-events: auto; }
      .dh-panel { position: absolute; top: 0; right: 0; bottom: 0; width: 400px; background: var(--glass-bg-strong); border-left: 1px solid var(--glass-border); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; z-index: 101; }
      .dh-panel.active { transform: translateX(0); }
      .dh-head { padding: 24px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; }
      .dh-body { flex: 1; overflow-y: auto; padding: 24px; }
      .dh-card { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .dh-card-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; color: var(--white); }
      .dh-card-date { font-size: 12px; color: var(--color-text-muted); margin-bottom: 16px; }
      .dh-actions { display: flex; gap: 8px; }
      .btn-dh-edit { background: var(--cyan); color: #000; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; }
      .btn-dh-del { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; transition: 0.2s; }
      .btn-dh-del:hover { background: rgba(239,68,68,0.2); }

      /* Assign overlay */
      .assign-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; }
      .assign-modal { background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: 16px; width: 480px; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden; }
      .assign-modal-head { padding: 24px; border-bottom: 1px solid var(--glass-border); }
      .assign-modal-body { flex: 1; overflow-y: auto; padding: 16px; }
      .assign-client-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; cursor: pointer; transition: 0.2s; margin-bottom: 4px; }
      .assign-client-item:hover { background: rgba(25,249,249,0.08); }
    `;
    document.head.appendChild(style);
  }

  container.innerHTML = `
    <div class="dash-panel-layout">
      <div class="dash-panel-list-col">
        <div class="dash-panel-head">
          <div class="rt-view-toggle">
            <button class="rt-view-toggle-btn active" data-view="clients">👥 Clientes</button>
            <button class="rt-view-toggle-btn" data-view="library">📂 Mis Rutinas</button>
          </div>
          <input type="text" class="dash-input" id="routines-search" placeholder="Buscar...">
        </div>
        <div class="dash-panel-list" id="routines-left-container">
          <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
        </div>
      </div>

      <div class="dash-builder-col" id="routines-builder-container">
        <div class="dash-empty-state">
          <div style="font-size:64px;margin-bottom:24px;">💪</div>
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Panel de Rutinas</h2>
          <p style="color:var(--color-text-muted);font-size:15px">Selecciona un cliente para planificar su entrenamiento, o consulta tus rutinas guardadas</p>
        </div>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  try {
    const dataModule = await import('../../../data/data.js');
    _exercisesList = dataModule.EXERCISES || [];
  } catch(e) { console.warn("Could not load exercises"); }

  // View toggle
  container.querySelectorAll('.rt-view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.rt-view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _viewMode = btn.dataset.view;
      const searchInput = container.querySelector('#routines-search');
      searchInput.value = '';
      if (_viewMode === 'clients') {
        renderClientsList(container);
      } else {
        renderRoutinesLibrary(container);
      }
    });
  });

  await loadClients(container, profile);

  const searchInput = container.querySelector('#routines-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      if (_viewMode === 'clients') {
        container.querySelectorAll('.dash-client-card').forEach(card => {
          const name = (card.dataset.name || '').toLowerCase();
          card.style.display = name.includes(q) ? '' : 'none';
        });
      } else {
        container.querySelectorAll('.rt-lib-card').forEach(card => {
          const name = (card.dataset.name || '').toLowerCase();
          card.style.display = name.includes(q) ? '' : 'none';
        });
      }
    });
  }
}

async function loadClients(container, profile) {
  try {
    let snap;
    if (profile.role === 'admin') {
      snap = await db.collection('users').orderBy('name').limit(100).get();
    } else {
      snap = await db.collection('users').where('assignedCoach', '==', profile.uid).limit(60).get();
    }
    _clients = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
  }
  renderClientsList(container);
}

function renderClientsList(container) {
  const el = container.querySelector('#routines-left-container');
  if (_clients.length === 0) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted);font-size:14px;">No tienes clientes asignados para entreno.</div>`;
    return;
  }

  el.innerHTML = _clients.map(c => `
    <div class="dash-client-card" data-uid="${c.uid}" data-name="${(c.name||'').replace(/"/g,'')}">
      <div class="dash-avatar">${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(c.name || '?')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || 'Sin nombre'}</div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">${c.email || ''}</div>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.dash-client-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.dash-client-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const client = _clients.find(c => c.uid === card.dataset.uid);
      if (client) {
        _selectedClient = client;
        _selectedExercises = [];
        _editingRoutineId = null;
        _editingAssignmentId = null;
        renderBuilder(container);
      }
    });
  });
}

// ── Routines Library ────────────────────────────
async function renderRoutinesLibrary(container) {
  const el = container.querySelector('#routines-left-container');
  el.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>';

  try {
    const snap = await db.collection('routines').where('createdBy','==',_profile.uid).orderBy('createdAt','desc').limit(50).get();
    if (snap.empty) {
      el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted);">
        <div style="font-size:40px;margin-bottom:12px">📂</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">Sin rutinas guardadas</div>
        <div style="font-size:12px">Las rutinas que asignes se guardan automáticamente aquí</div>
      </div>`;
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const muscles = [...new Set((r.exercises||[]).map(e => e.muscleGroup).filter(Boolean))].slice(0,3).join(' · ');
      return `
        <div class="rt-lib-card" data-rt-id="${doc.id}" data-name="${(r.name||'').replace(/"/g,'')}">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${r.name || 'Sin nombre'}</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px">${(r.exercises||[]).length} ejercicios${muscles ? ' · ' + muscles : ''}</div>
          ${r.description ? `<div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description}</div>` : '<div style="margin-bottom:10px"></div>'}
          <div style="display:flex;gap:6px">
            <button class="btn-dh-edit" data-rt-load="${doc.id}" style="flex:1;text-align:center">📝 Cargar</button>
            <button class="btn-dh-edit" data-rt-assign="${doc.id}" data-rt-name="${(r.name||'').replace(/"/g,'&quot;')}" style="flex:1;text-align:center;background:rgba(25,249,249,0.15);color:var(--cyan)">📋 Asignar</button>
            <button class="btn-dh-edit" data-rt-edit="${doc.id}" style="padding:6px 10px;background:rgba(255,255,255,0.08);color:var(--color-text-muted)">✏️</button>
            <button class="btn-dh-del" data-rt-del="${doc.id}" data-rt-delname="${(r.name||'').replace(/"/g,'&quot;')}" style="padding:6px 10px">🗑️</button>
          </div>
        </div>`;
    }).join('');

    // Load routine into builder for current client
    el.querySelectorAll('[data-rt-load]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!_selectedClient) {
          toast('Selecciona un cliente primero (pestaña Clientes)', 'warning');
          return;
        }
        try {
          const snap = await db.collection('routines').doc(btn.dataset.rtLoad).get();
          if (!snap.exists) { toast('Rutina no encontrada', 'error'); return; }
          const data = snap.data();
          _editingRoutineId = snap.id;
          _editingAssignmentId = null;
          document.getElementById('rt-name').value = data.name || '';
          document.getElementById('rt-desc').value = data.description || '';
          _selectedExercises = (data.exercises || []).map(ex => ({ ...ex, id: ex.id || Date.now().toString() + Math.random() }));
          renderExercises();
          document.getElementById('btn-submit-rt').innerHTML = `<span style="font-size:20px">💾</span> Actualizar y asignar`;
          document.getElementById('btn-cancel-rt-edit').style.display = 'inline-block';
          toast('Rutina cargada en el formulario', 'success');
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });

    // Assign routine to any client
    el.querySelectorAll('[data-rt-assign]').forEach(btn => {
      btn.addEventListener('click', () => {
        openAssignOverlay(btn.dataset.rtAssign, btn.dataset.rtName);
      });
    });

    // Edit routine (open in builder without client)
    el.querySelectorAll('[data-rt-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const snap = await db.collection('routines').doc(btn.dataset.rtEdit).get();
          if (!snap.exists) { toast('Rutina no encontrada', 'error'); return; }
          renderRoutineEditor(container, snap.id, snap.data());
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });

    // Delete routine
    el.querySelectorAll('[data-rt-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar la rutina "${btn.dataset.rtDelname}"?`)) return;
        try {
          await db.collection('routines').doc(btn.dataset.rtDel).delete();
          toast('Rutina eliminada', 'success');
          renderRoutinesLibrary(container);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });

  } catch (e) {
    el.innerHTML = `<div style="padding:24px;color:#ef4444;font-size:13px">Error: ${e.message}</div>`;
  }
}

// ── Assign Overlay ──────────────────────────────
async function openAssignOverlay(routineId, routineName) {
  const overlay = document.createElement('div');
  overlay.className = 'assign-overlay';
  overlay.innerHTML = `
    <div class="assign-modal">
      <div class="assign-modal-head">
        <h3 style="margin:0;font-size:18px;font-weight:700">💪 Asignar rutina</h3>
        <p style="margin:8px 0 0;font-size:13px;color:var(--color-text-muted)">"<strong>${routineName}</strong>" → selecciona destinatario:</p>
      </div>
      <div class="assign-modal-body">
        ${_clients.map(c => `
          <div class="assign-client-item" data-cuid="${c.uid}" data-cname="${(c.name||'').replace(/"/g,'')}">
            <div class="dash-avatar" style="width:36px;height:36px;font-size:13px">${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(c.name||'?')}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px">${c.name || 'Sin nombre'}</div>
              <div style="font-size:11px;color:var(--color-text-muted)">${c.email || ''}</div>
            </div>
            <span style="font-size:12px;color:var(--cyan);font-weight:600">Asignar</span>
          </div>`).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.assign-client-item').forEach(item => {
    item.addEventListener('click', async () => {
      const clientUid = item.dataset.cuid;
      const clientName = item.dataset.cname;
      item.innerHTML = '<div style="text-align:center;padding:8px"><div class="spinner-sm"></div></div>';
      try {
        await collections.assignments(clientUid).add({
          routineId,
          name: routineName,
          assignedBy: _profile.uid,
          assignedAt: timestamp(),
          createdAt: timestamp(),
        });
        toast(`Rutina asignada a ${clientName} ✅`, 'success');
        overlay.remove();
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  });
}

// ── Routine Editor (standalone, no client needed) ──
function renderRoutineEditor(container, routineId, data) {
  const el = container.querySelector('#routines-builder-container');
  _editingRoutineId = routineId;
  _selectedExercises = (data.exercises || []).map(ex => ({ ...ex, id: ex.id || Date.now().toString() + Math.random() }));

  el.innerHTML = `
    <div class="dash-builder-head">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">EDITANDO RUTINA</div>
        <div style="font-size:28px;font-weight:800;color:var(--white)">${data.name || 'Sin nombre'}</div>
      </div>
    </div>
    <div class="dash-builder-body" id="rt-form-body">
      <div class="dash-section-title">📝 Datos Generales</div>
      <div class="dash-input-group" style="margin-bottom:24px">
        <label class="dash-label">Nombre de la Rutina</label>
        <input type="text" id="rt-name" class="dash-input" value="${(data.name||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="dash-input-group" style="margin-bottom:40px">
        <label class="dash-label">Instrucciones / Descripción</label>
        <textarea id="rt-desc" class="dash-textarea">${data.description || ''}</textarea>
      </div>
      <div class="dash-section-title">🏋️ Ejercicios</div>
      <div style="position:relative;margin-bottom:32px">
        <div class="dash-input-group">
          <label class="dash-label">Añadir Ejercicio desde Base de Datos</label>
          <input type="text" id="rt-search" class="dash-input" placeholder="🔎 Buscar por nombre o grupo muscular...">
        </div>
        <div id="rt-search-results" class="search-results"></div>
      </div>
      <div id="rt-exercises-container"></div>
    </div>
    <div class="dash-bottom-action">
      <button class="btn-save-dash" id="btn-save-routine-only">
        <span style="font-size:20px">💾</span> Guardar cambios
      </button>
      <button class="btn-secondary" id="btn-cancel-rt-edit" style="padding:16px 24px;">Cancelar</button>
    </div>
  `;

  setupSearch(el);
  renderExercises();

  el.querySelector('#btn-save-routine-only').addEventListener('click', async () => {
    syncExercisesValues();
    const name = document.getElementById('rt-name').value.trim();
    if (!name) { toast('Introduce un nombre', 'warning'); return; }
    const btn = el.querySelector('#btn-save-routine-only');
    btn.disabled = true;
    btn.innerHTML = 'Guardando...';
    try {
      await db.collection('routines').doc(routineId).update({
        name,
        description: document.getElementById('rt-desc').value.trim(),
        exercises: _selectedExercises,
        updatedAt: timestamp(),
      });
      toast('Rutina actualizada ✅', 'success');
      renderRoutinesLibrary(container);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:20px">💾</span> Guardar cambios`;
  });

  el.querySelector('#btn-cancel-rt-edit').addEventListener('click', () => {
    _editingRoutineId = null;
    _selectedExercises = [];
    el.innerHTML = `
      <div class="dash-empty-state">
        <div style="font-size:64px;margin-bottom:24px;">💪</div>
        <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Panel de Rutinas</h2>
        <p style="color:var(--color-text-muted);font-size:15px">Selecciona un cliente o consulta tus rutinas guardadas</p>
      </div>
    `;
  });
}

// ── Client Builder ──────────────────────────────
function renderBuilder(container) {
  const el = container.querySelector('#routines-builder-container');
  if (!_selectedClient) return;

  el.innerHTML = `
    <div class="dash-builder-head">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">ASIGNANDO RUTINA A</div>
        <div style="font-size:28px;font-weight:800;color:var(--white)">${_selectedClient.name}</div>
      </div>
      <button class="btn-secondary" id="btn-hist-rutinas" style="padding:12px 24px;">Historial de Entrenos</button>
    </div>

    <div class="dash-builder-body" id="rt-form-body">
      <div class="dash-section-title">📝 Datos Generales</div>
      <div class="dash-input-group" style="margin-bottom:24px">
        <label class="dash-label">Nombre de la Rutina</label>
        <input type="text" id="rt-name" class="dash-input" placeholder="Ej: Fase 1 - Fuerza Maxima (Día A)">
      </div>
      <div class="dash-input-group" style="margin-bottom:40px">
        <label class="dash-label">Instrucciones / Descripción (Opcional)</label>
        <textarea id="rt-desc" class="dash-textarea" placeholder="Ej: Enfocate en la cadencia excentrica en todos los ejercicios compuestos..."></textarea>
      </div>

      <div class="dash-section-title">🏋️ Ejercicios</div>
      <div style="position:relative;margin-bottom:32px">
        <div class="dash-input-group">
          <label class="dash-label">Añadir Ejercicio desde Base de Datos</label>
          <input type="text" id="rt-search" class="dash-input" placeholder="🔎 Buscar por nombre o grupo muscular...">
        </div>
        <div id="rt-search-results" class="search-results"></div>
      </div>
      <div id="rt-exercises-container"></div>
    </div>

    <div class="dash-bottom-action">
      <button class="btn-save-dash" id="btn-submit-rt">
        <span style="font-size:20px">💾</span> Asignar Rutina a ${_selectedClient.name.split(' ')[0]}
      </button>
      <button class="btn-secondary" id="btn-cancel-rt-edit" style="display:none;">Cancelar Edición</button>
    </div>

    <!-- History Panel -->
    <div class="dh-overlay" id="dh-overlay"></div>
    <div class="dh-panel" id="dh-panel">
      <div class="dh-head">
        <h3 style="margin:0;font-size:18px;font-weight:700">Historial de Rutinas</h3>
        <button id="btn-dh-close" style="background:none;border:none;color:var(--white);font-size:24px;cursor:pointer">✕</button>
      </div>
      <div class="dh-body" id="dh-body">
        <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-hist-rutinas').addEventListener('click', openHistoryPanel);
  el.querySelector('#btn-dh-close').addEventListener('click', closeHistoryPanel);
  el.querySelector('#dh-overlay').addEventListener('click', closeHistoryPanel);

  el.querySelector('#btn-cancel-rt-edit').addEventListener('click', () => {
    _editingRoutineId = null;
    _editingAssignmentId = null;
    document.getElementById('rt-name').value = '';
    document.getElementById('rt-desc').value = '';
    _selectedExercises = [];
    renderExercises();
    document.getElementById('btn-submit-rt').innerHTML = `<span style="font-size:20px">💾</span> Asignar Rutina a ${_selectedClient.name.split(' ')[0]}`;
    document.getElementById('btn-cancel-rt-edit').style.display = 'none';
  });

  el.querySelector('#btn-submit-rt').addEventListener('click', () => submitRoutine(container));
  setupSearch(el);
  renderExercises();
}

function setupSearch(el) {
  const searchInput = el.querySelector('#rt-search');
  const resultsEl = el.querySelector('#rt-search-results');
  if (!searchInput || !resultsEl) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { resultsEl.style.display = 'none'; return; }

    const hits = _exercisesList.filter(e => e.n.toLowerCase().includes(q) || e.m.toLowerCase().includes(q)).slice(0, 20);
    if (!hits.length) {
      resultsEl.innerHTML = '<div style="padding:16px;color:#888;">Sin resultados</div>';
      resultsEl.style.display = 'block';
      return;
    }

    resultsEl.innerHTML = hits.map(e => `
      <div class="search-item" data-name="${String(e.n).replace(/"/g, '&quot;')}" data-muscle="${e.m}">
        <span style="font-weight:600">${e.n}</span>
        <span style="color:var(--cyan);font-size:12px;">${e.m}</span>
      </div>
    `).join('');
    resultsEl.style.display = 'block';

    resultsEl.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        _selectedExercises.push({
          id: Date.now().toString(),
          name: item.dataset.name,
          muscleGroup: item.dataset.muscle,
          sets: 3, reps: '10', restSeconds: 60, warmupSets: 0, setupNotes: ''
        });
        searchInput.value = '';
        resultsEl.style.display = 'none';
        renderExercises();
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsEl.contains(e.target)) {
      resultsEl.style.display = 'none';
    }
  });
}

function openHistoryPanel() {
  document.getElementById('dh-overlay').classList.add('active');
  document.getElementById('dh-panel').classList.add('active');
  loadHistory();
}

function closeHistoryPanel() {
  document.getElementById('dh-overlay').classList.remove('active');
  document.getElementById('dh-panel').classList.remove('active');
}

async function loadHistory() {
  const hb = document.getElementById('dh-body');
  if (!hb) return;
  hb.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>';

  try {
    const snap = await collections.assignments(_selectedClient.uid).orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      hb.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">No hay rutinas asignadas históricamente.</div>';
      return;
    }

    hb.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const dateStr = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString() : '';
      return `
        <div class="dh-card">
          <div class="dh-card-title">${d.name || 'Rutina'}</div>
          <div class="dh-card-date">Asignada: ${dateStr}</div>
          <div class="dh-actions">
            <button class="btn-dh-edit" data-id="${doc.id}" data-routine="${d.routineId}">Editar</button>
            <button class="btn-dh-del" data-id="${doc.id}" data-routine="${d.routineId}">Borrar</button>
          </div>
        </div>
      `;
    }).join('');

    hb.querySelectorAll('.btn-dh-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const btnText = btn.innerHTML;
        btn.innerHTML = '...';
        try {
          const assignmentId = btn.dataset.id;
          const routineId = btn.dataset.routine;
          const routineSnap = await db.collection('routines').doc(routineId).get();
          if (routineSnap.exists) {
             loadEditingRoutine(assignmentId, routineId, routineSnap.data());
             closeHistoryPanel();
          } else {
             toast('No se encontró la rutina raíz', 'error');
          }
        } catch(e) { console.error(e); }
        btn.innerHTML = btnText;
      });
    });

    hb.querySelectorAll('.btn-dh-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const assignmentId = btn.dataset.id;
        if (confirm('Eliminando asignación de rutina. ¿Estás seguro?')) {
           if (confirm('¿DE VERDAD deseas borrarla completamente?')) {
             try {
               btn.textContent = '...';
               await collections.assignments(_selectedClient.uid).doc(assignmentId).delete();
               toast('Asignación borrada', 'success');
               if (_editingAssignmentId === assignmentId) document.getElementById('btn-cancel-rt-edit').click();
               loadHistory();
             } catch(e) { toast('Error borrando', 'error'); }
           }
        }
      });
    });

  } catch(e) {
    hb.innerHTML = '<div style="color:#ef4444">Error cargando historial de rutinas</div>';
  }
}

function loadEditingRoutine(assignmentId, routineId, data) {
  _editingAssignmentId = assignmentId;
  _editingRoutineId = routineId;

  document.getElementById('rt-name').value = data.name || '';
  document.getElementById('rt-desc').value = data.description || '';

  _selectedExercises = (data.exercises || []).map(ex => ({
    ...ex,
    id: ex.id || Date.now().toString() + Math.random().toString()
  }));

  renderExercises();

  document.getElementById('btn-submit-rt').innerHTML = `<span style="font-size:20px">💾</span> Actualizar Rutina`;
  document.getElementById('btn-cancel-rt-edit').style.display = 'inline-block';
  document.getElementById('rt-form-body').scrollTo({ top: 0, behavior: 'smooth' });
}

function syncExercisesValues() {
  const container = document.getElementById('rt-exercises-container');
  if (!container) return;
  _selectedExercises.forEach(ex => {
    const card = container.querySelector(`.ex-card[data-id="${ex.id}"]`);
    if (card) {
      ex.sets = parseInt(card.querySelector('.inp-sets').value) || 0;
      ex.reps = card.querySelector('.inp-reps').value;
      ex.restSeconds = parseInt(card.querySelector('.inp-rest').value) || 0;
      ex.warmupSets = parseInt(card.querySelector('.inp-warmup').value) || 0;
      ex.setupNotes = card.querySelector('.inp-notes').value;
    }
  });
}

function renderExercises() {
  const container = document.getElementById('rt-exercises-container');
  if (!container) return;

  if (_selectedExercises.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;border:2px dashed rgba(255,255,255,0.1);border-radius:12px;color:#888;">No hay ejercicios añadidos. Busca uno arriba.</div>';
    return;
  }

  container.innerHTML = _selectedExercises.map((ex, i) => `
    <div class="ex-card" data-id="${ex.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:700;">${i+1}. ${ex.name} <span style="font-size:12px;color:var(--cyan);font-weight:400;margin-left:8px;">${ex.muscleGroup}</span></div>
        <button class="btn-rm-ex" data-id="${ex.id}" style="background:none;border:none;color:#ef4444;font-size:20px;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;margin-bottom:16px;">
        <div class="dash-input-group">
          <label class="dash-label">Series</label>
          <input type="number" class="dash-input inp-sets" value="${ex.sets}">
        </div>
        <div class="dash-input-group">
          <label class="dash-label">Repeticiones</label>
          <input type="text" class="dash-input inp-reps" value="${ex.reps}" placeholder="ej: 10-12">
        </div>
        <div class="dash-input-group">
          <label class="dash-label">Descanso (seg)</label>
          <input type="number" class="dash-input inp-rest" value="${ex.restSeconds}">
        </div>
        <div class="dash-input-group">
          <label class="dash-label">Series de Calentamiento</label>
          <input type="number" class="dash-input inp-warmup" value="${ex.warmupSets}">
        </div>
      </div>
      <div class="dash-input-group">
        <label class="dash-label">Técnica / Notas Específicas</label>
        <textarea class="dash-textarea inp-notes" rows="2" style="min-height:60px" placeholder="Ej: Controlar la cadencia en la bajada (3 segundos)...">${ex.setupNotes || ''}</textarea>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-rm-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      syncExercisesValues();
      _selectedExercises = _selectedExercises.filter(e => e.id !== btn.dataset.id);
      renderExercises();
    });
  });
}

async function submitRoutine(container) {
  syncExercisesValues();

  const name = document.getElementById('rt-name').value.trim();
  const desc = document.getElementById('rt-desc').value.trim();

  if (!name) { toast('Introduce un nombre para la rutina', 'warning'); return; }
  if (_selectedExercises.length === 0) { toast('Añade al menos 1 ejercicio', 'warning'); return; }

  const routineDoc = {
    name,
    description: desc,
    exercises: _selectedExercises,
    createdBy: _profile.uid,
    createdAt: timestamp()
  };

  const btn = document.getElementById('btn-submit-rt');
  btn.disabled = true;
  btn.innerHTML = 'Guardando...';

  try {
    if (_editingRoutineId) {
      await db.collection('routines').doc(_editingRoutineId).update({
        ...routineDoc,
        createdAt: undefined
      });
      if (_editingAssignmentId) {
         await collections.assignments(_selectedClient.uid).doc(_editingAssignmentId).update({
           name: name,
           assignedAt: timestamp()
         });
      }
      toast('Rutina actualizada ✅', 'success');
      document.getElementById('btn-cancel-rt-edit').click();
    } else {
      const rRef = await db.collection('routines').add(routineDoc);
      await collections.assignments(_selectedClient.uid).add({
        routineId: rRef.id,
        name: name,
        assignedBy: _profile.uid,
        assignedAt: timestamp(),
        createdAt: timestamp()
      });

      toast('Rutina asignada ✅', 'success');
      document.getElementById('rt-name').value = '';
      document.getElementById('rt-desc').value = '';
      _selectedExercises = [];
      renderExercises();
      document.getElementById('rt-form-body').scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error(err);
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:20px">💾</span> ${_editingRoutineId ? 'Actualizar Rutina' : ('Asignar Rutina a ' + (_selectedClient?.name?.split(' ')[0] || ''))}`;
  }
}
