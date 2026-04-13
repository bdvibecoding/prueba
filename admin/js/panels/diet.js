import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients = [];
let _selectedClient = null;
let _meals = [{ id: Date.now(), label: 'Desayuno', content: '', supps: '' }];
let _editingDietId = null;
let _viewMode = 'clients'; // 'clients' | 'templates'

const DIET_TYPES = [
  { value: 'volumen',        label: 'Volumen',        color: '#ef4444' },
  { value: 'definicion',     label: 'Definición',     color: '#3b82f6' },
  { value: 'mantenimiento',  label: 'Mantenimiento',  color: '#22c55e' },
  { value: 'terapeutica',    label: 'Terapéutica',    color: '#a855f7' },
  { value: 'personalizada',  label: 'Personalizada',  color: '#f97316' },
];

export async function render(container, profile) {
  _profile = profile;

  if (!document.getElementById('diet-panel-css')) {
    const style = document.createElement('style');
    style.id = 'diet-panel-css';
    style.textContent = `
      .diet-layout { display: flex; height: 100%; width: 100%; overflow: hidden; }
      .diet-clients-col { width: 320px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; background: var(--color-bg); flex-shrink: 0; }
      .diet-clients-head { padding: 24px; border-bottom: 1px solid var(--glass-border); }
      .diet-clients-list { flex: 1; overflow-y: auto; padding: 12px; }
      .diet-client-card { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
      .diet-client-card:hover { background: var(--glass-bg); }
      .diet-client-card.active { background: var(--glass-bg-strong); border-color: var(--cyan); box-shadow: inset 4px 0 0 var(--cyan); }
      .diet-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(0, 200, 255, 0.15); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; overflow: hidden; }

      .diet-builder-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg); position: relative; }
      .diet-builder-head { padding: 32px 40px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: var(--glass-bg); }
      .diet-builder-body { flex: 1; overflow-y: auto; padding: 40px; }

      .diet-empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.5; }

      .diet-section-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--white); display: flex; align-items: center; gap: 8px; }
      .diet-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
      .diet-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }

      .diet-input-group { display: flex; flex-direction: column; gap: 10px; }
      .diet-label { font-size: 13px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .diet-input { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px 16px; font-size: 15px; color: var(--white); font-family: inherit; transition: border-color 0.2s; }
      .diet-input:focus { outline: none; border-color: var(--cyan); }
      .diet-textarea { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; font-size: 15px; color: var(--white); font-family: inherit; resize: vertical; min-height: 100px; transition: border-color 0.2s; }
      .diet-textarea:focus { outline: none; border-color: var(--cyan); }

      .diet-meal-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; margin-bottom: 24px; position: relative; }
      .diet-meal-remove { position: absolute; top: 24px; right: 24px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; }
      .diet-meal-remove:hover { background: rgba(239, 68, 68, 0.2); }

      .diet-bottom-action { position: sticky; bottom: 0; background: var(--color-bg); padding: 24px 40px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 12px; }
      .btn-save-diet { background: var(--cyan); color: #000; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: opacity 0.2s; }
      .btn-save-diet:hover { opacity: 0.9; }

      /* Template card */
      .tpl-card { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
      .tpl-card:hover { background: var(--glass-bg); }
      .tpl-type-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; display: inline-block; }

      /* View toggle */
      .view-toggle { display: flex; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border); margin-bottom: 16px; }
      .view-toggle-btn { flex: 1; padding: 10px; text-align: center; font-size: 12px; font-weight: 700; cursor: pointer; border: none; background: transparent; color: var(--color-text-muted); transition: 0.2s; font-family: inherit; }
      .view-toggle-btn.active { background: var(--cyan); color: #000; }

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
    <div class="diet-layout">
      <!-- Left Column -->
      <div class="diet-clients-col">
        <div class="diet-clients-head">
          <div class="view-toggle">
            <button class="view-toggle-btn active" data-view="clients">👥 Clientes</button>
            <button class="view-toggle-btn" data-view="templates">📂 Plantillas</button>
          </div>
          <input type="text" class="diet-input" id="diet-search" placeholder="Buscar..." style="width:100%;box-sizing:border-box;padding:12px;">
        </div>
        <div class="diet-clients-list" id="diet-left-container">
          <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
        </div>
      </div>

      <!-- Builder Column -->
      <div class="diet-builder-col" id="diet-builder-container">
        <div class="diet-empty-state">
          <div style="font-size:64px;margin-bottom:24px;">🥗</div>
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Panel Nutricional</h2>
          <p style="color:var(--color-text-muted);font-size:15px">Selecciona un cliente para crearle un plan, o consulta tus plantillas guardadas</p>
        </div>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  // View toggle
  container.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _viewMode = btn.dataset.view;
      const searchInput = container.querySelector('#diet-search');
      searchInput.value = '';
      if (_viewMode === 'clients') {
        renderClients(container);
      } else {
        renderTemplatesList(container);
      }
    });
  });

  await loadClients(container, profile);

  // Search filter
  const searchInput = container.querySelector('#diet-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      if (_viewMode === 'clients') {
        container.querySelectorAll('.diet-client-card').forEach(card => {
          const name = (card.dataset.name || '').toLowerCase();
          card.style.display = name.includes(q) ? '' : 'none';
        });
      } else {
        container.querySelectorAll('.tpl-card').forEach(card => {
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
      snap = await db.collection('users').where('assignedNutricionista', '==', profile.uid).limit(60).get();
    }
    _clients = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
  }
  renderClients(container);
}

function renderClients(container) {
  const el = container.querySelector('#diet-left-container');
  if (_clients.length === 0) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted);font-size:14px;">No tienes clientes asignados.</div>`;
    return;
  }
  el.innerHTML = _clients.map(c => `
    <div class="diet-client-card" data-uid="${c.uid}" data-name="${(c.name||'').replace(/"/g,'')}">
      <div class="diet-avatar">${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(c.name || '?')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || 'Sin nombre'}</div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">${c.email || ''}</div>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.diet-client-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.diet-client-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const client = _clients.find(c => c.uid === card.dataset.uid);
      if (client) {
        _selectedClient = client;
        _editingDietId = null;
        _meals = [{ id: Date.now(), label: 'Desayuno', content: '', supps: '' }];
        renderDietBuilder(container);
      }
    });
  });
}

// ── Templates List ──────────────────────────────
async function renderTemplatesList(container) {
  const el = container.querySelector('#diet-left-container');
  el.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>';

  try {
    const snap = await db.collection('dietTemplates').where('createdBy','==',_profile.uid).orderBy('createdAt','desc').limit(50).get();
    if (snap.empty) {
      el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted);">
        <div style="font-size:40px;margin-bottom:12px">📂</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">Sin plantillas guardadas</div>
        <div style="font-size:12px">Crea una dieta y guárdala como plantilla para reutilizarla</div>
      </div>`;
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const typeInfo = DIET_TYPES.find(t => t.value === d.type) || { label: d.type || '—', color: '#6b7280' };
      const macros = [d.calories ? `${d.calories}kcal` : null, d.protein ? `${d.protein}P` : null, d.carbs ? `${d.carbs}C` : null, d.fat ? `${d.fat}G` : null].filter(Boolean).join(' · ');
      return `
        <div class="tpl-card" data-tpl-id="${doc.id}" data-name="${(d.name||'').replace(/"/g,'')}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="tpl-type-badge" style="background:${typeInfo.color}22;color:${typeInfo.color}">${typeInfo.label}</span>
            <span style="font-size:11px;color:var(--color-text-muted)">${(d.meals||[]).length} comidas</span>
          </div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${d.name || 'Sin nombre'}</div>
          ${macros ? `<div style="font-size:11px;color:var(--color-text-muted);margin-bottom:10px">${macros}</div>` : ''}
          <div style="display:flex;gap:6px">
            <button class="btn-dh-edit" data-tpl-load="${doc.id}" style="flex:1;text-align:center">📝 Cargar</button>
            <button class="btn-dh-edit" data-tpl-assign="${doc.id}" data-tpl-name="${(d.name||'').replace(/"/g,'&quot;')}" style="flex:1;text-align:center;background:rgba(25,249,249,0.15);color:var(--cyan)">📋 Asignar</button>
            <button class="btn-dh-del" data-tpl-del="${doc.id}" data-tpl-delname="${(d.name||'').replace(/"/g,'&quot;')}" style="padding:6px 10px">🗑️</button>
          </div>
        </div>`;
    }).join('');

    // Load template into builder
    el.querySelectorAll('[data-tpl-load]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.dataset.tplLoad;
        try {
          const snap = await db.collection('dietTemplates').doc(docId).get();
          if (!snap.exists) { toast('Plantilla no encontrada', 'error'); return; }
          if (!_selectedClient) {
            toast('Selecciona un cliente primero (pestaña Clientes)', 'warning');
            return;
          }
          loadTemplateIntoForm(snap.data());
          toast('Plantilla cargada en el formulario', 'success');
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });

    // Assign template to client
    el.querySelectorAll('[data-tpl-assign]').forEach(btn => {
      btn.addEventListener('click', () => {
        openAssignOverlay(btn.dataset.tplAssign, btn.dataset.tplName, 'diet');
      });
    });

    // Delete template
    el.querySelectorAll('[data-tpl-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar la plantilla "${btn.dataset.tplDelname}"?`)) return;
        try {
          await db.collection('dietTemplates').doc(btn.dataset.tplDel).delete();
          toast('Plantilla eliminada', 'success');
          renderTemplatesList(container);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    });

  } catch (e) {
    el.innerHTML = `<div style="padding:24px;color:#ef4444;font-size:13px">Error: ${e.message}</div>`;
  }
}

function loadTemplateIntoForm(data) {
  document.getElementById('df-name').value = data.name || '';
  document.getElementById('df-type').value = data.type || 'volumen';
  document.getElementById('df-cals').value = data.calories || '';
  document.getElementById('df-prot').value = data.protein || '';
  document.getElementById('df-carb').value = data.carbs || '';
  document.getElementById('df-fat').value = data.fat || '';
  document.getElementById('df-wakeup').value = (data.wakeUp && data.wakeUp.description) || '';
  document.getElementById('df-presleep').value = (data.preSleep && data.preSleep.description) || '';
  document.getElementById('df-pre').value = (data.workout && data.workout.pre) || '';
  document.getElementById('df-post').value = (data.workout && data.workout.post) || '';

  if (data.meals && data.meals.length > 0) {
    _meals = data.meals.map(m => ({
      id: Date.now() + Math.random(),
      label: m.label || '',
      content: m.description || '',
      supps: m.supplements || ''
    }));
  } else {
    _meals = [{ id: Date.now(), label: 'Desayuno', content: '', supps: '' }];
  }
  renderMealsBlocks();
}

// ── Assign Overlay (pick client) ────────────────
async function openAssignOverlay(templateId, templateName, type) {
  // Load full template data
  let tplData = {};
  try {
    const snap = await db.collection('dietTemplates').doc(templateId).get();
    if (snap.exists) tplData = snap.data();
  } catch {}

  const overlay = document.createElement('div');
  overlay.className = 'assign-overlay';
  overlay.innerHTML = `
    <div class="assign-modal">
      <div class="assign-modal-head">
        <h3 style="margin:0;font-size:18px;font-weight:700">🥗 Asignar dieta</h3>
        <p style="margin:8px 0 0;font-size:13px;color:var(--color-text-muted)">"<strong>${templateName}</strong>" → selecciona destinatario:</p>
      </div>
      <div class="assign-modal-body">
        ${_clients.map(c => `
          <div class="assign-client-item" data-cuid="${c.uid}" data-cname="${(c.name||'').replace(/"/g,'')}">
            <div class="diet-avatar" style="width:36px;height:36px;font-size:13px">${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(c.name||'?')}</div>
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

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelectorAll('.assign-client-item').forEach(item => {
    item.addEventListener('click', async () => {
      const clientUid = item.dataset.cuid;
      const clientName = item.dataset.cname;
      item.innerHTML = '<div style="text-align:center;padding:8px"><div class="spinner-sm"></div></div>';
      try {
        await collections.dietas(clientUid).add({
          ...tplData,
          templateId,
          assignedBy: _profile.uid,
          assignedAt: timestamp(),
          createdAt: timestamp(),
        });
        toast(`Dieta asignada a ${clientName} ✅`, 'success');
        overlay.remove();
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  });
}

// ── Diet Builder ────────────────────────────────
function renderDietBuilder(container) {
  const el = container.querySelector('#diet-builder-container');
  if (!_selectedClient) return;

  el.innerHTML = `
    <div class="diet-builder-head">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">
          CREANDO PLAN PARA
        </div>
        <div style="font-size:28px;font-weight:800;color:var(--white)">
          ${_selectedClient.name || 'Cliente'}
        </div>
      </div>
      <div>
        <button class="btn-secondary" id="btn-view-previous" style="padding:12px 24px;">Ver historial de dietas</button>
      </div>
    </div>

    <div class="diet-builder-body" id="diet-form-body">

      <div class="diet-section-title">📋 Información Básica</div>
      <div class="diet-grid-2">
        <div class="diet-input-group">
          <label class="diet-label">Nombre del Plan</label>
          <input type="text" id="df-name" class="diet-input" placeholder="Ej: Dieta Fase 1 - Volumen">
        </div>
        <div class="diet-input-group">
          <label class="diet-label">Tipo de Dieta</label>
          <select id="df-type" class="diet-input">
            ${DIET_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="diet-section-title">⚖️ Macros y Calorías Generales</div>
      <div class="diet-grid-4">
        <div class="diet-input-group">
          <label class="diet-label">🔥 Calorías (kcal)</label>
          <input type="number" id="df-cals" class="diet-input" placeholder="2500">
        </div>
        <div class="diet-input-group">
          <label class="diet-label">🥩 Proteínas (g)</label>
          <input type="number" id="df-prot" class="diet-input" placeholder="180">
        </div>
        <div class="diet-input-group">
          <label class="diet-label">🍞 Carbohidratos (g)</label>
          <input type="number" id="df-carb" class="diet-input" placeholder="250">
        </div>
        <div class="diet-input-group">
          <label class="diet-label">🫒 Grasas (g)</label>
          <input type="number" id="df-fat" class="diet-input" placeholder="70">
        </div>
      </div>

      <div class="diet-section-title">💧 Suplementación y Notas Diarias</div>
      <div class="diet-grid-2">
        <div class="diet-input-group">
          <label class="diet-label">🌅 Al despertar (Ayunas)</label>
          <textarea id="df-wakeup" class="diet-textarea" placeholder="Ej: Vaso de agua con sal, 5g creatina..."></textarea>
        </div>
        <div class="diet-input-group">
          <label class="diet-label">🌙 Antes de dormir</label>
          <textarea id="df-presleep" class="diet-textarea" placeholder="Ej: Magnesio bisglicinato, caseína..."></textarea>
        </div>
      </div>

      <div class="diet-section-title">🏋️ Perientreno</div>
      <div class="diet-grid-2">
        <div class="diet-input-group">
          <label class="diet-label">Pre-Entreno</label>
          <textarea id="df-pre" class="diet-textarea" placeholder="Ej: Cafeína 200mg, citrulina..."></textarea>
        </div>
        <div class="diet-input-group">
          <label class="diet-label">Intra / Post-Entreno</label>
          <textarea id="df-post" class="diet-textarea" placeholder="Ej: Batido de proteína 40g..."></textarea>
        </div>
      </div>

      <div class="diet-section-title" style="margin-top:40px;justify-content:space-between">
        <span>🍽️ Bloques de Comidas</span>
        <button id="btn-add-meal" style="background:rgba(25,249,249,0.1);color:var(--cyan);border:1px solid rgba(25,249,249,0.3);padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;transition:0.2s">
          + Añadir Comida
        </button>
      </div>
      <div id="meals-container"></div>

    </div>

    <!-- Action Bar -->
    <div class="diet-bottom-action">
      <button class="btn-secondary" id="btn-save-template" style="padding:16px 24px;font-size:14px;font-weight:700">
        📂 Guardar como plantilla
      </button>
      <button class="btn-save-diet" id="btn-submit-diet">
        <span style="font-size:20px">💾</span> Asignar Plan a ${_selectedClient.name.split(' ')[0]}
      </button>
      <button class="btn-secondary" id="btn-cancel-edit" style="display:none;">Cancelar Edición</button>
    </div>

    <!-- History Panel -->
    <div class="dh-overlay" id="dh-overlay"></div>
    <div class="dh-panel" id="dh-panel">
      <div class="dh-head">
        <h3 style="margin:0;font-size:18px;font-weight:700">Historial de Dietas</h3>
        <button id="btn-dh-close" style="background:none;border:none;color:var(--white);font-size:24px;cursor:pointer">✕</button>
      </div>
      <div class="dh-body" id="dh-body">
        <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-add-meal').addEventListener('click', () => {
    _meals.push({ id: Date.now(), label: `Comida ${_meals.length + 1}`, content: '', supps: '' });
    renderMealsBlocks();
  });

  el.querySelector('#btn-view-previous').addEventListener('click', () => openHistoryPanel(container));
  el.querySelector('#btn-dh-close').addEventListener('click', closeHistoryPanel);
  el.querySelector('#dh-overlay').addEventListener('click', closeHistoryPanel);

  el.querySelector('#btn-cancel-edit').addEventListener('click', () => {
    _editingDietId = null;
    document.getElementById('df-name').value = '';
    document.getElementById('df-type').value = 'volumen';
    document.getElementById('df-cals').value = '';
    document.getElementById('df-prot').value = '';
    document.getElementById('df-carb').value = '';
    document.getElementById('df-fat').value = '';
    document.getElementById('df-wakeup').value = '';
    document.getElementById('df-presleep').value = '';
    document.getElementById('df-pre').value = '';
    document.getElementById('df-post').value = '';
    _meals = [{ id: Date.now(), label: 'Desayuno', content: '', supps: '' }];
    renderMealsBlocks();

    document.getElementById('btn-submit-diet').innerHTML = `<span style="font-size:20px">💾</span> Asignar Plan a ${_selectedClient.name.split(' ')[0]}`;
    document.getElementById('btn-cancel-edit').style.display = 'none';
  });

  el.querySelector('#btn-submit-diet').addEventListener('click', () => submitDiet(container));
  el.querySelector('#btn-save-template').addEventListener('click', () => saveAsTemplate());

  renderMealsBlocks();
}

function openHistoryPanel(container) {
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
    const snap = await collections.dietas(_selectedClient.uid).orderBy('assignedAt', 'desc').get();
    if (snap.empty) {
      hb.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">No hay dietas guardadas.</div>';
      return;
    }

    hb.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const dateStr = d.assignedAt && d.assignedAt.toDate ? d.assignedAt.toDate().toLocaleDateString() : '';
      return `
        <div class="dh-card">
          <div class="dh-card-title">${d.name || 'Plan'} <span style="font-size:11px;font-weight:400;color:var(--cyan)">${(d.type || '').toUpperCase()}</span></div>
          <div class="dh-card-date">${dateStr} - ${d.mealCount || 0} comidas</div>
          <div class="dh-actions">
            <button class="btn-dh-edit" data-id="${doc.id}">Editar</button>
            <button class="btn-dh-del" data-id="${doc.id}">Borrar</button>
          </div>
        </div>
      `;
    }).join('');

    hb.querySelectorAll('.btn-dh-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.dataset.id;
        const data = snap.docs.find(d => d.id === docId).data();
        loadEditingPlan(docId, data);
        closeHistoryPanel();
      });
    });

    hb.querySelectorAll('.btn-dh-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.dataset.id;
        if (confirm('Eliminando dieta. ¿Estás seguro? Esta acción no se puede deshacer.')) {
           if (confirm('¿DE VERDAD deseas borrar este plan completamente?')) {
             try {
               btn.textContent = '...';
               await collections.dietas(_selectedClient.uid).doc(docId).delete();
               toast('Plan borrado', 'success');
               if (_editingDietId === docId) document.getElementById('btn-cancel-edit').click();
               loadHistory();
             } catch(e) { toast('Error borrando', 'error'); }
           }
        }
      });
    });

  } catch(e) {
    hb.innerHTML = '<div style="color:#ef4444">Error cargando historial</div>';
  }
}

function loadEditingPlan(docId, data) {
  _editingDietId = docId;
  loadTemplateIntoForm(data);

  document.getElementById('btn-submit-diet').innerHTML = `<span style="font-size:20px">💾</span> Actualizar Plan`;
  document.getElementById('btn-cancel-edit').style.display = 'inline-block';
  document.getElementById('diet-form-body').scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMealsBlocks() {
  const mc = document.getElementById('meals-container');
  if (!mc) return;

  mc.innerHTML = _meals.map((m, index) => `
    <div class="diet-meal-card">
      ${index > 0 ? `<button class="diet-meal-remove" data-id="${m.id}">✕</button>` : ''}
      <div class="diet-input-group" style="margin-bottom:24px;width:70%">
        <label class="diet-label">Etiqueta de la comida ${index + 1}</label>
        <input type="text" class="diet-input inp-label" data-id="${m.id}" value="${m.label}" placeholder="Ej: Desayuno, Almuerzo...">
      </div>
      <div class="diet-grid-2">
        <div class="diet-input-group">
          <label class="diet-label">Alimentos / Opciones</label>
          <textarea class="diet-textarea inp-content" data-id="${m.id}" style="min-height:160px" placeholder="Detalla los gramos y opciones de esta comida...">${m.content}</textarea>
        </div>
        <div class="diet-input-group">
          <label class="diet-label">Suplementos / Notas Específicas</label>
          <textarea class="diet-textarea inp-supps" data-id="${m.id}" style="min-height:160px" placeholder="Ej: Omega 3, Vitamina D...">${m.supps}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  mc.querySelectorAll('.diet-meal-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      syncMealsValues();
      _meals = _meals.filter(meal => meal.id != btn.dataset.id);
      renderMealsBlocks();
    });
  });
}

function syncMealsValues() {
  const mc = document.getElementById('meals-container');
  if (!mc) return;
  _meals.forEach(m => {
    const lbl = mc.querySelector(`.inp-label[data-id="${m.id}"]`);
    const cnt = mc.querySelector(`.inp-content[data-id="${m.id}"]`);
    const sup = mc.querySelector(`.inp-supps[data-id="${m.id}"]`);
    if (lbl) m.label = lbl.value;
    if (cnt) m.content = cnt.value;
    if (sup) m.supps = sup.value;
  });
}

function buildDietDoc() {
  syncMealsValues();
  const type = document.getElementById('df-type').value;
  const name = document.getElementById('df-name').value.trim() || `Menú ${type}`;
  const finalMeals = _meals.map(m => ({
    label: m.label.trim() || 'Comida',
    description: m.content.trim(),
    supplements: m.supps.trim()
  }));

  return {
    type, name, mealCount: finalMeals.length, meals: finalMeals,
    ...(document.getElementById('df-cals').value && { calories: parseInt(document.getElementById('df-cals').value) }),
    ...(document.getElementById('df-prot').value && { protein: parseInt(document.getElementById('df-prot').value) }),
    ...(document.getElementById('df-carb').value && { carbs: parseInt(document.getElementById('df-carb').value) }),
    ...(document.getElementById('df-fat').value && { fat: parseInt(document.getElementById('df-fat').value) }),
    ...(document.getElementById('df-wakeup').value.trim() && { wakeUp: { description: document.getElementById('df-wakeup').value.trim() } }),
    ...(document.getElementById('df-presleep').value.trim() && { preSleep: { description: document.getElementById('df-presleep').value.trim() } }),
    workout: {
      ...(document.getElementById('df-pre').value.trim() && { pre: document.getElementById('df-pre').value.trim() }),
      ...(document.getElementById('df-post').value.trim() && { post: document.getElementById('df-post').value.trim() }),
    },
  };
}

async function saveAsTemplate() {
  const dietDoc = buildDietDoc();
  if (!dietDoc.name || dietDoc.name.startsWith('Menú ')) {
    toast('Introduce un nombre para la plantilla', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-template');
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '💾 Guardando...';

  try {
    await db.collection('dietTemplates').add({
      ...dietDoc,
      createdBy: _profile.uid,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    });
    toast('Plantilla guardada ✅', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function submitDiet(container) {
  const dietDoc = buildDietDoc();
  dietDoc.assignedBy = _profile.uid;
  dietDoc.createdAt = timestamp();

  const btn = document.getElementById('btn-submit-diet');
  btn.disabled = true;
  const orgText = btn.innerHTML;
  btn.innerHTML = `<div class="spinner-sm"></div> Guardando...`;

  try {
    if (_editingDietId) {
      await collections.dietas(_selectedClient.uid).doc(_editingDietId).update({
        ...dietDoc,
        assignedAt: timestamp()
      });
      toast(`Plan actualizado correctamente`, 'success');
      document.getElementById('btn-cancel-edit').click();
    } else {
      dietDoc.assignedAt = timestamp();
      await collections.dietas(_selectedClient.uid).add(dietDoc);
      toast(`Plan asignado correctamente a ${_selectedClient.name}`, 'success');

      document.getElementById('df-name').value = '';
      _meals = [{ id: Date.now(), label: 'Desayuno', content: '', supps: '' }];
      renderMealsBlocks();
      document.getElementById('diet-form-body').scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error(err);
    toast('Error al guardar plan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orgText;
  }
}
