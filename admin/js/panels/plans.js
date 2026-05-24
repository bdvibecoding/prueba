/* ═══════════════════════════════════════════════
   TGWL Admin — panels/plans.js
   Plan / Phase management panel
   — Plantillas globales (sin cliente)
   — Planes por cliente
═══════════════════════════════════════════════ */

import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast } from '../../../js/utils.js';

let _profile         = null;
let _clients         = [];
let _selectedClient  = null;
let _mode            = 'client'; // 'templates' | 'client'
let _editingPlanId   = null;
let _planRoutines    = [];
let _allRoutines     = [];
let _exercisesList   = [];   // from data.js, for inline routine creation
let _inlineExercises = [];   // exercises being built in the inline creator

// ── Exercise search helpers (mirrored from routines.js) ──
function _norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const _EN_ES = [
  ['squat','sentadilla'],['deadlift','peso muerto'],['rdl','rumano'],
  ['bench','banco'],['press','press'],['row','remo'],['curl','curl'],
  ['extension','extensión'],['pulldown','jalón'],['pullup','dominada'],
  ['pushup','flexión'],['lunge','zancada'],['plank','plancha'],
  ['crunch','crunch'],['fly','aperturas'],['raise','elevación'],
  ['shrug','encogimiento'],['dip','fondos'],['dips','fondos'],
  ['lat','dorsal'],['pec','pecho'],
];
function _exMatches(e, qNorm) {
  const en = _norm(e.n), em = _norm(e.m);
  if (en.includes(qNorm) || em.includes(qNorm)) return true;
  for (const [eng, esp] of _EN_ES) {
    const espNorm = _norm(esp);
    if ((qNorm.includes(eng) || eng.startsWith(qNorm) || eng.includes(qNorm)) &&
        (en.includes(espNorm) || em.includes(espNorm))) return true;
  }
  return false;
}

// ── CSS ───────────────────────────────────────
function injectStyles() {
  if (document.getElementById('plans-panel-css')) return;
  const s = document.createElement('style');
  s.id = 'plans-panel-css';
  s.textContent = `
    .plan-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 12px;
      transition: border-color .2s;
    }
    .plan-card.active-plan {
      border-color: var(--red, #C10801);
      background: rgba(193,8,1,0.06);
    }
    .plan-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .plan-card-name {
      font-size: 16px;
      font-weight: 700;
      flex: 1;
      color: var(--color-text);
    }
    .badge-active {
      background: var(--red, #C10801);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 20px;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    .badge-inactive {
      background: rgba(255,255,255,0.08);
      color: var(--color-text-muted);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    .badge-template {
      background: rgba(99,102,241,0.18);
      color: #a5b4fc;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 20px;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    .plan-routines-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }
    .plan-routine-chip {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 11px;
      color: var(--color-text);
    }
    .plan-card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-plan-activate {
      background: var(--red, #C10801);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-plan-deactivate {
      background: rgba(255,255,255,0.08);
      color: var(--color-text-muted);
      border: 1px solid var(--glass-border);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-plan-edit {
      background: rgba(6,182,212,0.12);
      color: var(--cyan, #19F9F9);
      border: 1px solid rgba(6,182,212,0.3);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-plan-assign {
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.35);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-plan-delete {
      background: rgba(239,68,68,0.08);
      color: #ef4444;
      border: 1px solid rgba(239,68,68,0.25);
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
    }
    .plan-editor {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .plan-editor-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 20px;
      color: var(--color-text);
    }
    .plan-added-routine {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .plan-added-routine-name { flex: 1; font-size: 13px; font-weight: 600; }
    .btn-rm-plan-routine {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 2px 6px;
      font-size: 16px;
      line-height: 1;
    }
    .plan-search-results {
      position: absolute;
      z-index: 1000;
      background: #1A1A1A;
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      max-height: 240px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: none;
      width: 100%;
      top: calc(100% + 4px);
      left: 0;
    }
    .plan-search-item {
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,.05);
      font-size: 13px;
    }
    .plan-search-item:hover { background: rgba(255,255,255,0.06); }
    /* ── Left col mode btn ── */
    .plans-mode-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.25);
      color: #a5b4fc;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      margin-bottom: 16px;
      transition: .15s;
      text-align: left;
    }
    .plans-mode-btn.active-mode {
      background: rgba(99,102,241,0.22);
      border-color: rgba(99,102,241,0.55);
    }
    .plans-mode-btn:hover { background: rgba(99,102,241,0.16); }
    /* assign to client inline */
    .assign-client-picker {
      background: #1C1C1C;
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 10px;
      display: none;
    }
    .assign-client-picker.open { display: block; }
    .assign-client-list { max-height: 200px; overflow-y: auto; margin-top: 10px; }
    .assign-client-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .assign-client-row:hover { background: rgba(255,255,255,0.05); }
  `;
  document.head.appendChild(s);
}

function injectLayoutCss() {
  if (document.getElementById('dash-panel-css')) return;
  const s = document.createElement('style');
  s.id = 'dash-panel-css';
  s.textContent = `
    .dash-panel-layout { display:flex; height:100%; width:100%; min-width:0; }
    .dash-panel-list-col { width:320px; border-right:1px solid var(--glass-border); display:flex; flex-direction:column; background:var(--color-bg); flex-shrink:0; }
    .dash-panel-head { padding:24px; border-bottom:1px solid var(--glass-border); }
    .dash-panel-list { flex:1; overflow-y:auto; padding:12px; }
    .dash-client-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; cursor:pointer; margin-bottom:4px; border:1px solid transparent; transition:.15s; }
    .dash-client-card:hover { background:var(--glass-bg); }
    .dash-client-card.active { background:var(--glass-bg-strong); border-color:var(--red,#C10801); }
    .dash-avatar { width:44px; height:44px; border-radius:50%; background:rgba(193,8,1,0.08); color:var(--red,#C10801); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; overflow:hidden; }
    .dash-input { width:100%; box-sizing:border-box; background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:var(--r-lg); padding:10px 14px; color:var(--color-text); font-size:13px; font-family:inherit; outline:none; }
    .dash-input:focus { border-color:var(--red,#C10801); }
    .dash-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--color-text-muted); margin-bottom:6px; display:block; }
    .dash-input-group { margin-bottom:16px; }
    .dash-builder-col { flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--color-bg); position:relative; }
    .dash-builder-body { flex:1; overflow-y:auto; padding:32px 40px; }
    .dash-empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center; opacity:.5; }
  `;
  document.head.appendChild(s);
}

// ── render ─────────────────────────────────────
export function render(container, profile) {
  _profile = profile;
  injectStyles();
  injectLayoutCss();

  container.innerHTML = `
    <div class="dash-panel-layout">
      <div class="dash-panel-list-col">
        <div class="dash-panel-head">
          <div style="font-size:20px;font-weight:800;margin-bottom:16px;color:var(--color-text)">Planes</div>
          <!-- Templates toggle -->
          <button class="plans-mode-btn" id="btn-mode-templates">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Plantillas globales
          </button>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--color-text-muted);margin-bottom:10px">Clientes</div>
          <input type="text" class="dash-input" id="plans-client-search" placeholder="Buscar cliente...">
        </div>
        <div class="dash-panel-list" id="plans-client-list">
          <div style="text-align:center;padding:40px;opacity:.5"><div class="spinner-sm"></div></div>
        </div>
      </div>
      <div class="dash-builder-col" id="plans-builder-col">
        <div class="dash-empty-state">
          <div style="margin-bottom:16px;opacity:.3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="width:64px;height:64px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Planes de Entrenamiento</h2>
          <p style="font-size:14px;color:var(--color-text-muted)">Selecciona un cliente o gestiona las plantillas globales</p>
        </div>
      </div>
    </div>
  `;
}

// ── init ──────────────────────────────────────
export async function init(container, profile) {
  _profile = profile;
  // Load exercise list for inline routine creation
  try {
    const dataModule = await import('../../../data/data.js');
    _exercisesList = dataModule.EXERCISES || [];
  } catch (_) {}
  await loadClients(container);

  // Wire templates button
  container.querySelector('#btn-mode-templates')?.addEventListener('click', () => {
    _selectedClient = null;
    _mode = 'templates';
    // deselect clients
    container.querySelectorAll('.dash-client-card').forEach(c => c.classList.remove('active'));
    container.querySelector('#btn-mode-templates')?.classList.add('active-mode');
    loadTemplatesView(container);
  });
}

async function loadClients(container) {
  const listEl = container.querySelector('#plans-client-list');
  try {
    // Include all roles — admins/coaches also use the app as clients
    const snap = await db.collection('users').get();
    _clients = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    renderClientList(container, _clients);

    const searchInput = container.querySelector('#plans-client-search');
    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const filtered = q
        ? _clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
        : _clients;
      renderClientList(container, filtered);
    });
  } catch (e) {
    listEl.innerHTML = `<div style="padding:16px;color:#ef4444;font-size:12px">Error: ${e.message}</div>`;
  }
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function renderClientList(container, clients) {
  const listEl = container.querySelector('#plans-client-list');
  if (!listEl) return;
  if (!clients.length) {
    listEl.innerHTML = `<div style="padding:24px;text-align:center;opacity:.5;font-size:13px">Sin clientes</div>`;
    return;
  }
  const roleColor = { admin:'#a5b4fc', coach:'#6ee7b7', medico:'#93c5fd', fisio:'#fca5a5', psicologo:'#f9a8d4', nutricionista:'#fde68a', cliente:'', atleta:'' };
  listEl.innerHTML = clients.map(c => `
    <div class="dash-client-card ${_selectedClient?.uid === c.uid ? 'active' : ''}" data-uid="${c.uid}">
      <div class="dash-avatar">${c.photoURL
        ? `<img loading="lazy" decoding="async" src="${c.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : getInitials(c.name)}</div>
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || 'Sin nombre'}</div>
        <div style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.email || ''}</div>
      </div>
      ${c.role && roleColor[c.role] ? `<span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${roleColor[c.role]};flex-shrink:0">${c.role}</span>` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.dash-client-card').forEach(card => {
    card.addEventListener('click', () => {
      const client = _clients.find(c => c.uid === card.dataset.uid);
      if (!client) return;
      _selectedClient = client;
      _mode = 'client';
      container.querySelector('#btn-mode-templates')?.classList.remove('active-mode');
      listEl.querySelectorAll('.dash-client-card').forEach(c2 => c2.classList.remove('active'));
      card.classList.add('active');
      loadClientPlans(container, client);
    });
  });
}

// ══════════════════════════════════════════════
//  PLANTILLAS GLOBALES
// ══════════════════════════════════════════════
async function loadTemplatesView(container) {
  const col = container.querySelector('#plans-builder-col');
  col.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:.4"><div class="spinner-sm"></div></div>`;

  try {
    let snap;
    try {
      snap = await db.collection('planTemplates').orderBy('createdAt', 'desc').get();
    } catch (_) {
      snap = await db.collection('planTemplates').get();
    }
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTemplatesView(container, templates);
  } catch (e) {
    col.innerHTML = `<div class="dash-builder-body"><div style="color:#ef4444">Error: ${e.message}</div></div>`;
  }
}

function renderTemplatesView(container, templates) {
  const col = container.querySelector('#plans-builder-col');
  col.innerHTML = `
    <div class="dash-builder-body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
        <div>
          <div style="font-size:12px;color:#a5b4fc;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">PLANTILLAS GLOBALES</div>
          <div style="font-size:28px;font-weight:800">Biblioteca de Planes</div>
          <div style="font-size:13px;color:var(--color-text-muted);margin-top:4px">Crea planes reutilizables y asígnalos a clientes cuando se registren</div>
        </div>
        <button id="btn-new-template" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Plantilla
        </button>
      </div>

      <div id="template-editor-area"></div>

      <div id="templates-list">
        ${templates.length === 0 ? `
          <div style="text-align:center;padding:48px;opacity:.35">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="width:56px;height:56px;margin:0 auto 16px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <div style="font-size:16px;font-weight:600;margin-bottom:6px">Sin plantillas creadas</div>
            <div style="font-size:13px">Crea la primera plantilla para reutilizarla con varios clientes</div>
          </div>
        ` : templates.map(t => renderTemplateCard(t)).join('')}
      </div>
    </div>
  `;

  col.querySelector('#btn-new-template')?.addEventListener('click', () => {
    _editingPlanId = null;
    _planRoutines  = [];
    showPlanEditor(container, null, null, 'template');
  });

  wireTemplateCardButtons(container, templates);
}

function renderTemplateCard(tpl) {
  const routineCount = tpl.routines?.length || 0;
  return `
    <div class="plan-card" data-tpl-id="${tpl.id}">
      <div class="plan-card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;color:#a5b4fc"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span class="plan-card-name">${tpl.name}</span>
        <span class="badge-template">PLANTILLA</span>
      </div>
      <div class="plan-routines-list">
        ${(tpl.routines || []).map(r => `<span class="plan-routine-chip">${r.name}</span>`).join('')}
        ${routineCount === 0 ? `<span style="font-size:12px;color:var(--color-text-muted);opacity:.6">Sin rutinas</span>` : ''}
      </div>
      <div class="plan-card-actions">
        <button class="btn-plan-assign" data-action="assign-template" data-tpl-id="${tpl.id}">
          👤 Asignar a cliente
        </button>
        <button class="btn-plan-edit" data-action="edit-template" data-tpl-id="${tpl.id}">✎ Editar</button>
        <button class="btn-plan-delete" data-action="delete-template" data-tpl-id="${tpl.id}">🗑</button>
      </div>
      <!-- Assign client picker -->
      <div class="assign-client-picker" id="assign-picker-${tpl.id}">
        <div style="font-size:12px;font-weight:700;color:#a5b4fc;margin-bottom:8px">Selecciona el cliente</div>
        <input type="text" class="dash-input assign-client-search" placeholder="Buscar cliente..." style="font-size:12px;padding:8px 12px">
        <div class="assign-client-list" id="assign-list-${tpl.id}">
          ${_clients.map(c => `
            <div class="assign-client-row" data-assign-uid="${c.uid}" data-assign-name="${(c.name || '').replace(/"/g, '&quot;')}">
              <div style="width:28px;height:28px;border-radius:50%;background:rgba(193,8,1,0.1);color:var(--red,#C10801);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${getInitials(c.name)}</div>
              <div>
                <div style="font-weight:600">${c.name || 'Sin nombre'}</div>
                <div style="font-size:11px;color:var(--color-text-muted)">${c.email || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function wireTemplateCardButtons(container, templates) {
  const col = container.querySelector('#plans-builder-col');
  if (!col) return;

  col.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tplId  = btn.dataset.tplId;
      const action = btn.dataset.action;
      const tpl    = templates.find(t => t.id === tplId);

      if (action === 'assign-template') {
        // Toggle picker
        const picker = col.querySelector(`#assign-picker-${tplId}`);
        if (!picker) return;
        const isOpen = picker.classList.contains('open');
        // Close all pickers first
        col.querySelectorAll('.assign-client-picker').forEach(p => p.classList.remove('open'));
        if (!isOpen) {
          picker.classList.add('open');
          // Wire search within picker
          const searchEl = picker.querySelector('.assign-client-search');
          const listEl   = picker.querySelector('.assign-client-list');
          searchEl?.addEventListener('input', () => {
            const q = searchEl.value.toLowerCase();
            listEl.querySelectorAll('.assign-client-row').forEach(row => {
              const name = row.dataset.assignName.toLowerCase();
              row.style.display = (!q || name.includes(q)) ? '' : 'none';
            });
          });
          // Wire client rows
          listEl.querySelectorAll('.assign-client-row').forEach(row => {
            row.addEventListener('click', async () => {
              const uid  = row.dataset.assignUid;
              const name = row.dataset.assignName;
              if (!uid || !tpl) return;
              try {
                // Check duplicate
                const existing = await db.collection('users').doc(uid).collection('plans')
                  .where('name', '==', tpl.name).get();
                if (!existing.empty) {
                  toast(`"${tpl.name}" ya existe para ${name}`, 'warning');
                  return;
                }
                await db.collection('users').doc(uid).collection('plans').add({
                  name:       tpl.name,
                  routines:   tpl.routines || [],
                  isActive:   false,
                  assignedBy: _profile.uid,
                  fromTemplate: tplId,
                  createdAt:  timestamp(),
                });
                picker.classList.remove('open');
                toast(`Plan "${tpl.name}" asignado a ${name} ✅`, 'success');
              } catch (err) { toast('Error: ' + err.message, 'error'); }
            });
          });
        }
        return;
      }

      if (action === 'edit-template') {
        _editingPlanId = tplId;
        _planRoutines  = (tpl?.routines || []).map(r => ({ ...r }));
        showPlanEditor(container, null, tpl, 'template');
      }

      if (action === 'delete-template') {
        if (!confirm(`¿Eliminar la plantilla "${tpl?.name}"?`)) return;
        try {
          await db.collection('planTemplates').doc(tplId).delete();
          toast('Plantilla eliminada', 'success');
          loadTemplatesView(container);
        } catch (err) { toast('Error: ' + err.message, 'error'); }
      }
    });
  });
}

// ══════════════════════════════════════════════
//  PLANES POR CLIENTE (existing)
// ══════════════════════════════════════════════
async function loadClientPlans(container, client) {
  const col = container.querySelector('#plans-builder-col');
  col.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:.4"><div class="spinner-sm"></div></div>`;

  try {
    let snap;
    try {
      snap = await db.collection('users').doc(client.uid).collection('plans').orderBy('createdAt', 'desc').get();
    } catch (_) {
      snap = await db.collection('users').doc(client.uid).collection('plans').get();
    }
    const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientPlansView(container, client, plans);
  } catch (e) {
    const col2 = container.querySelector('#plans-builder-col');
    col2.innerHTML = `<div class="dash-builder-body"><div style="color:#ef4444">Error: ${e.message}</div></div>`;
  }
}

function renderClientPlansView(container, client, plans) {
  const col = container.querySelector('#plans-builder-col');
  const activePlan = plans.find(p => p.isActive);

  col.innerHTML = `
    <div class="dash-builder-body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
        <div>
          <div style="font-size:12px;color:var(--red,#C10801);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">PLANES DE</div>
          <div style="font-size:28px;font-weight:800">${client.name || 'Cliente'}</div>
          ${activePlan
            ? `<div style="font-size:13px;color:var(--color-text-muted);margin-top:4px">Plan activo: <strong style="color:var(--red,#C10801)">${activePlan.name}</strong></div>`
            : `<div style="font-size:13px;color:var(--color-text-muted);margin-top:4px">Sin plan activo</div>`}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
          <button id="btn-import-template" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.35);padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Importar plantilla
          </button>
          <button id="btn-new-plan" style="background:var(--red,#C10801);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Plan
          </button>
        </div>
      </div>

      <!-- Template import dropdown -->
      <div id="template-import-area" style="display:none;background:var(--glass-bg);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="font-size:13px;font-weight:700;color:#a5b4fc;margin-bottom:12px">Importar plantilla existente</div>
        <div id="import-template-list" style="display:flex;flex-direction:column;gap:8px"></div>
        <button id="btn-close-import" style="margin-top:12px;background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:13px;font-family:inherit">Cancelar</button>
      </div>

      <div id="plan-editor-area"></div>

      <div id="plans-list">
        ${plans.length === 0 ? `
          <div style="text-align:center;padding:48px;opacity:.35">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="width:56px;height:56px;margin:0 auto 16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <div style="font-size:16px;font-weight:600;margin-bottom:6px">Sin planes creados</div>
            <div style="font-size:13px">Crea un plan nuevo o importa una plantilla</div>
          </div>
        ` : plans.map(p => renderPlanCard(p, client)).join('')}
      </div>
    </div>
  `;

  col.querySelector('#btn-new-plan')?.addEventListener('click', () => {
    _editingPlanId = null;
    _planRoutines  = [];
    showPlanEditor(container, client, null, 'client');
  });

  // Import template button
  col.querySelector('#btn-import-template')?.addEventListener('click', async () => {
    const area = col.querySelector('#template-import-area');
    const listEl = col.querySelector('#import-template-list');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
    if (area.style.display === 'none') return;

    listEl.innerHTML = `<div style="opacity:.5;font-size:13px">Cargando plantillas...</div>`;
    try {
      const snap = await db.collection('planTemplates').get();
      const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!templates.length) {
        listEl.innerHTML = `<div style="opacity:.5;font-size:13px">No hay plantillas creadas</div>`;
        return;
      }
      listEl.innerHTML = templates.map(t => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:10px">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${t.name}</div>
            <div style="font-size:11px;color:var(--color-text-muted)">${t.routines?.length || 0} rutinas</div>
          </div>
          <button data-tpl-id="${t.id}" data-tpl-name="${(t.name || '').replace(/"/g, '&quot;')}" style="background:rgba(99,102,241,0.18);color:#a5b4fc;border:1px solid rgba(99,102,241,0.35);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">
            Importar
          </button>
        </div>
      `).join('');

      listEl.querySelectorAll('button[data-tpl-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const tplId   = btn.dataset.tplId;
          const tplName = btn.dataset.tplName;
          const tpl     = templates.find(t => t.id === tplId);
          if (!tpl) return;
          try {
            const existing = await db.collection('users').doc(client.uid).collection('plans')
              .where('name', '==', tplName).get();
            if (!existing.empty) {
              toast(`"${tplName}" ya existe para este cliente`, 'warning');
              return;
            }
            await db.collection('users').doc(client.uid).collection('plans').add({
              name:         tpl.name,
              routines:     tpl.routines || [],
              isActive:     false,
              assignedBy:   _profile.uid,
              fromTemplate: tplId,
              createdAt:    timestamp(),
            });
            toast(`"${tplName}" importado ✅`, 'success');
            loadClientPlans(container, client);
          } catch (err) { toast('Error: ' + err.message, 'error'); }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div style="color:#ef4444;font-size:13px">Error: ${err.message}</div>`;
    }
  });

  col.querySelector('#btn-close-import')?.addEventListener('click', () => {
    col.querySelector('#template-import-area').style.display = 'none';
  });

  wirePlanCardButtons(container, client, plans);
}

function renderPlanCard(plan, client) {
  const routineCount = plan.routines?.length || 0;
  return `
    <div class="plan-card ${plan.isActive ? 'active-plan' : ''}" data-plan-id="${plan.id}">
      <div class="plan-card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;color:${plan.isActive ? 'var(--red,#C10801)' : 'var(--color-text-muted)'}"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span class="plan-card-name">${plan.name}</span>
        <span class="${plan.isActive ? 'badge-active' : 'badge-inactive'}">${plan.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
      </div>
      <div class="plan-routines-list">
        ${(plan.routines || []).map(r => `<span class="plan-routine-chip">${r.name}</span>`).join('')}
        ${routineCount === 0 ? `<span style="font-size:12px;color:var(--color-text-muted);opacity:.6">Sin rutinas</span>` : ''}
      </div>
      <div class="plan-card-actions">
        ${plan.isActive
          ? `<button class="btn-plan-deactivate" data-action="deactivate" data-plan-id="${plan.id}">⏸ Desactivar</button>`
          : `<button class="btn-plan-activate"   data-action="activate"   data-plan-id="${plan.id}">▶ Activar</button>`
        }
        <button class="btn-plan-edit"   data-action="edit"   data-plan-id="${plan.id}">✎ Editar</button>
        <button class="btn-plan-delete" data-action="delete" data-plan-id="${plan.id}">🗑</button>
      </div>
    </div>
  `;
}

function wirePlanCardButtons(container, client, plans) {
  const col = container.querySelector('#plans-builder-col');
  col.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const planId = btn.dataset.planId;
      const action = btn.dataset.action;
      const plan   = plans.find(p => p.id === planId);

      if (action === 'activate') {
        try {
          const batch = db.batch();
          plans.forEach(p => batch.update(
            db.collection('users').doc(client.uid).collection('plans').doc(p.id),
            { isActive: false }
          ));
          batch.update(
            db.collection('users').doc(client.uid).collection('plans').doc(planId),
            { isActive: true, activatedAt: timestamp() }
          );
          await batch.commit();
          toast(`"${plan?.name}" activado ✅`, 'success');
          loadClientPlans(container, client);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      }

      if (action === 'deactivate') {
        try {
          await db.collection('users').doc(client.uid).collection('plans').doc(planId)
            .update({ isActive: false });
          toast('Plan desactivado', 'success');
          loadClientPlans(container, client);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      }

      if (action === 'edit') {
        _editingPlanId = planId;
        _planRoutines  = (plan?.routines || []).map(r => ({ ...r }));
        showPlanEditor(container, client, plan, 'client');
      }

      if (action === 'delete') {
        if (!confirm(`¿Eliminar "${plan?.name}"?`)) return;
        try {
          await db.collection('users').doc(client.uid).collection('plans').doc(planId).delete();
          toast('Plan eliminado', 'success');
          loadClientPlans(container, client);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      }
    });
  });
}

// ══════════════════════════════════════════════
//  PLAN / TEMPLATE EDITOR (shared)
// ══════════════════════════════════════════════
async function showPlanEditor(container, client, existingPlan, mode) {
  // Ensure routines list is loaded
  if (!_allRoutines.length) {
    try {
      const snap = await db.collection('routines').get();
      _allRoutines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {}
  }

  const col        = container.querySelector('#plans-builder-col');
  const editorArea = col.querySelector('#plan-editor-area') || col.querySelector('.dash-builder-body');
  if (!editorArea) return;

  const isEdit     = !!existingPlan;
  const isTemplate = mode === 'template';

  editorArea.innerHTML = `
    <div class="plan-editor">
      <div class="plan-editor-title">${isEdit ? '✎ Editar' : '+'} ${isTemplate ? 'Plantilla' : 'Plan'}</div>

      <!-- Plan name -->
      <div class="dash-input-group">
        <label class="dash-label">Nombre del ${isTemplate ? 'plantilla' : 'plan / fase'}</label>
        <input type="text" class="dash-input" id="plan-name-input"
          placeholder="${isTemplate ? 'Ej: Plan Mayo 2026' : 'Ej: Fase 2 - Mayo 2026'}"
          value="${existingPlan?.name || ''}">
      </div>

      <!-- Routines added -->
      <div class="dash-input-group" style="margin-top:16px">
        <label class="dash-label">Rutinas incluidas</label>
        <div id="plan-routines-added">
          ${_planRoutines.map((r, i) => `
            <div class="plan-added-routine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:var(--red,#C10801);flex-shrink:0"><path d="M6.5 6.5H4a1 1 0 00-1 1v9a1 1 0 001 1h2.5M17.5 6.5H20a1 1 0 011 1v9a1 1 0 01-1 1h-2.5"/><path d="M6.5 8.5h11v7h-11z"/></svg>
              <span class="plan-added-routine-name">${r.name}</span>
              <button class="btn-rm-plan-routine" data-idx="${i}">×</button>
            </div>
          `).join('')}
        </div>

        <!-- Routine search -->
        <div style="position:relative;margin-top:8px">
          <input type="text" class="dash-input" id="plan-routine-search" placeholder="🔍 Buscar rutina existente...">
          <div id="plan-routine-results" class="plan-search-results"></div>
        </div>
      </div>

      <!-- Create new routine inline -->
      <div style="margin-top:12px">
        <button id="btn-toggle-inline-rt" style="background:rgba(255,255,255,0.04);color:var(--color-text-muted);border:1px dashed var(--glass-border);padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;text-align:left;display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Crear nueva rutina y añadir al plan
        </button>
        <div id="inline-rt-creator" style="display:none;margin-top:12px;background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:20px">
          <div style="font-size:14px;font-weight:800;margin-bottom:16px;color:var(--color-text)">Nueva Rutina</div>
          <div class="dash-input-group" style="margin-bottom:14px">
            <label class="dash-label">Nombre de la rutina</label>
            <input type="text" class="dash-input" id="inline-rt-name" placeholder="Ej: Día A - Empuje">
          </div>
          <div class="dash-input-group" style="margin-bottom:14px">
            <label class="dash-label">Descripción (opcional)</label>
            <input type="text" class="dash-input" id="inline-rt-desc" placeholder="Ej: Pecho, hombro y tríceps">
          </div>

          <!-- Exercise search -->
          <div style="margin-bottom:12px">
            <label class="dash-label" style="margin-bottom:8px;display:block">Añadir ejercicios</label>
            <div style="position:relative">
              <input type="text" class="dash-input" id="inline-ex-search" placeholder="🔍 Buscar ejercicio...">
              <div id="inline-ex-results" style="position:absolute;z-index:1000;background:#1A1A1A;border:1px solid var(--glass-border);border-radius:10px;max-height:220px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none;width:100%;top:calc(100% + 4px);left:0"></div>
            </div>
          </div>

          <!-- Exercise cards -->
          <div id="inline-ex-container"></div>

          <div style="display:flex;gap:10px;margin-top:16px">
            <button id="btn-inline-rt-save" style="background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.35);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;flex:1">
              ✅ Crear rutina y añadir al plan
            </button>
            <button id="btn-inline-rt-cancel" style="background:rgba(255,255,255,.05);color:var(--color-text-muted);border:1px solid var(--glass-border);padding:10px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <!-- Save / Cancel plan -->
      <div style="display:flex;gap:10px;margin-top:20px">
        <button id="btn-save-plan" style="background:${isTemplate ? 'rgba(99,102,241,0.3)' : 'var(--red,#C10801)'};color:${isTemplate ? '#a5b4fc' : '#fff'};border:${isTemplate ? '1px solid rgba(99,102,241,0.5)' : 'none'};padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
          ${isEdit ? '💾 Guardar cambios' : `✅ Crear ${isTemplate ? 'plantilla' : 'plan'}`}
        </button>
        <button id="btn-cancel-plan" style="background:rgba(255,255,255,.06);color:var(--color-text-muted);border:1px solid var(--glass-border);padding:12px 20px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
      </div>
    </div>
  `;

  // ── Helper: refresh the "added routines" list ──
  function refreshAddedRoutines() {
    const addedEl = editorArea.querySelector('#plan-routines-added');
    if (!addedEl) return;
    addedEl.innerHTML = _planRoutines.map((r, i) => `
      <div class="plan-added-routine">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:var(--red,#C10801);flex-shrink:0"><path d="M6.5 6.5H4a1 1 0 00-1 1v9a1 1 0 001 1h2.5M17.5 6.5H20a1 1 0 011 1v9a1 1 0 01-1 1h-2.5"/><path d="M6.5 8.5h11v7h-11z"/></svg>
        <span class="plan-added-routine-name">${r.name}</span>
        <button class="btn-rm-plan-routine" data-idx="${i}">×</button>
      </div>
    `).join('');
    addedEl.querySelectorAll('.btn-rm-plan-routine').forEach(b => {
      b.addEventListener('click', () => {
        _planRoutines.splice(parseInt(b.dataset.idx), 1);
        refreshAddedRoutines();
      });
    });
  }
  refreshAddedRoutines();

  // ── Routine search (show all on focus, filter on input) ──
  const searchInput = editorArea.querySelector('#plan-routine-search');
  const resultsEl   = editorArea.querySelector('#plan-routine-results');

  function showRoutineResults(q = '') {
    const qLow = q.toLowerCase().trim();
    const available = _allRoutines.filter(r => !_planRoutines.find(pr => pr.routineId === r.id));
    const hits = (qLow
      ? available.filter(r => (r.name || '').toLowerCase().includes(qLow))
      : available
    ).slice(0, 20);

    if (!hits.length) {
      resultsEl.innerHTML = `<div class="plan-search-item" style="opacity:.5">Sin resultados</div>`;
    } else {
      resultsEl.innerHTML = hits.map(r => `
        <div class="plan-search-item" data-id="${r.id}" data-name="${(r.name || '').replace(/"/g, '&quot;')}">
          <strong>${r.name}</strong>
          <span style="font-size:11px;color:var(--color-text-muted);margin-left:8px">${r.exercises?.length || 0} ej.</span>
        </div>
      `).join('');
    }
    resultsEl.style.display = 'block';
    resultsEl.querySelectorAll('.plan-search-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        _planRoutines.push({ routineId: item.dataset.id, name: item.dataset.name });
        searchInput.value = '';
        resultsEl.style.display = 'none';
        refreshAddedRoutines();
      });
    });
  }

  searchInput?.addEventListener('focus', () => showRoutineResults(''));
  searchInput?.addEventListener('input', () => showRoutineResults(searchInput.value));
  searchInput?.addEventListener('blur', () => setTimeout(() => { resultsEl.style.display = 'none'; }, 150));

  // ── Toggle inline routine creator ──
  editorArea.querySelector('#btn-toggle-inline-rt')?.addEventListener('click', () => {
    const creator = editorArea.querySelector('#inline-rt-creator');
    if (!creator) return;
    const isOpen = creator.style.display !== 'none';
    creator.style.display = isOpen ? 'none' : 'block';
    _inlineExercises = [];
    if (!isOpen) renderInlineExercises(editorArea);
  });

  editorArea.querySelector('#btn-inline-rt-cancel')?.addEventListener('click', () => {
    editorArea.querySelector('#inline-rt-creator').style.display = 'none';
    _inlineExercises = [];
  });

  // ── Inline exercise search ──
  const exSearchInput = editorArea.querySelector('#inline-ex-search');
  const exResultsEl   = editorArea.querySelector('#inline-ex-results');

  exSearchInput?.addEventListener('focus', () => {
    if (!_exercisesList.length) return;
    showExResults('');
  });
  exSearchInput?.addEventListener('input', () => showExResults(exSearchInput.value));
  exSearchInput?.addEventListener('blur', () => setTimeout(() => { if (exResultsEl) exResultsEl.style.display = 'none'; }, 150));

  function showExResults(q) {
    const qNorm = _norm(q.trim());
    const hits = qNorm
      ? _exercisesList.filter(e => _exMatches(e, qNorm)).slice(0, 20)
      : _exercisesList.slice(0, 20);
    if (!hits.length) { exResultsEl.style.display = 'none'; return; }
    exResultsEl.innerHTML = hits.map(e => `
      <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;display:flex;justify-content:space-between;align-items:center"
           data-name="${String(e.n).replace(/"/g, '&quot;')}"
           data-muscle="${e.m}"
           data-target="${e.target || ''}">
        <span style="font-weight:600">${e.n}</span>
        <span style="color:var(--red,#C10801);font-size:11px">${e.m}</span>
      </div>
    `).join('');
    exResultsEl.style.display = 'block';
    exResultsEl.querySelectorAll('div[data-name]').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        syncInlineExValues(editorArea);
        _inlineExercises.push({
          id: Date.now().toString(),
          name: item.dataset.name,
          muscleGroup: item.dataset.muscle,
          target: item.dataset.target || '',
          sets: 3, reps: '10', restSeconds: 60, warmupSets: 0, setupNotes: ''
        });
        exSearchInput.value = '';
        exResultsEl.style.display = 'none';
        renderInlineExercises(editorArea);
      });
    });
  }

  // ── Save inline routine ──
  editorArea.querySelector('#btn-inline-rt-save')?.addEventListener('click', async () => {
    syncInlineExValues(editorArea);
    const rtName = editorArea.querySelector('#inline-rt-name')?.value.trim();
    const rtDesc = editorArea.querySelector('#inline-rt-desc')?.value.trim();
    if (!rtName) { toast('Escribe el nombre de la rutina', 'warning'); return; }
    if (!_inlineExercises.length) { toast('Añade al menos un ejercicio', 'warning'); return; }

    const btn = editorArea.querySelector('#btn-inline-rt-save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
      const docRef = await db.collection('routines').add({
        name: rtName,
        description: rtDesc || '',
        exercises: _inlineExercises,
        createdBy: _profile.uid,
        createdAt: timestamp(),
      });
      // Add to plan + refresh allRoutines cache
      _planRoutines.push({ routineId: docRef.id, name: rtName });
      _allRoutines.push({ id: docRef.id, name: rtName, exercises: _inlineExercises });
      _inlineExercises = [];
      // Hide creator
      editorArea.querySelector('#inline-rt-creator').style.display = 'none';
      editorArea.querySelector('#inline-rt-name').value = '';
      editorArea.querySelector('#inline-rt-desc').value = '';
      refreshAddedRoutines();
      toast(`Rutina "${rtName}" creada y añadida ✅`, 'success');
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '✅ Crear rutina y añadir al plan';
    }
  });

  // ── Save plan / template ──
  editorArea.querySelector('#btn-save-plan')?.addEventListener('click', async () => {
    const name = editorArea.querySelector('#plan-name-input')?.value.trim();
    if (!name) { toast('Introduce un nombre', 'warning'); return; }
    if (_planRoutines.length === 0) { toast('Añade al menos una rutina', 'warning'); return; }

    try {
      const data = { name, routines: _planRoutines, updatedAt: timestamp() };
      if (isTemplate) {
        if (_editingPlanId) {
          await db.collection('planTemplates').doc(_editingPlanId).update(data);
          toast('Plantilla actualizada ✅', 'success');
        } else {
          await db.collection('planTemplates').add({ ...data, createdBy: _profile.uid, createdAt: timestamp() });
          toast('Plantilla creada ✅', 'success');
        }
        _editingPlanId = null; _planRoutines = [];
        loadTemplatesView(container);
      } else {
        const planData = { ...data, assignedBy: _profile.uid, isActive: existingPlan?.isActive || false };
        if (_editingPlanId) {
          await db.collection('users').doc(client.uid).collection('plans').doc(_editingPlanId).update(planData);
          toast('Plan actualizado ✅', 'success');
        } else {
          await db.collection('users').doc(client.uid).collection('plans').add({ ...planData, createdAt: timestamp() });
          toast('Plan creado ✅', 'success');
        }
        _editingPlanId = null; _planRoutines = [];
        loadClientPlans(container, client);
      }
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });

  // Cancel
  editorArea.querySelector('#btn-cancel-plan')?.addEventListener('click', () => {
    _editingPlanId = null;
    _planRoutines  = [];
    _inlineExercises = [];
    editorArea.innerHTML = '';
  });
}

// ── Inline exercise cards ──────────────────────
function syncInlineExValues(editorArea) {
  const container = editorArea.querySelector('#inline-ex-container');
  if (!container) return;
  _inlineExercises.forEach(ex => {
    const card = container.querySelector(`.iex-card[data-id="${ex.id}"]`);
    if (!card) return;
    ex.sets        = parseInt(card.querySelector('.iex-sets').value)  || 0;
    ex.reps        = card.querySelector('.iex-reps').value;
    ex.restSeconds = parseInt(card.querySelector('.iex-rest').value)  || 0;
    ex.warmupSets  = parseInt(card.querySelector('.iex-warmup').value) || 0;
    ex.setupNotes  = card.querySelector('.iex-notes').value;
  });
}

function renderInlineExercises(editorArea) {
  const container = editorArea.querySelector('#inline-ex-container');
  if (!container) return;
  if (!_inlineExercises.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = _inlineExercises.map((ex, i) => `
    <div class="iex-card" data-id="${ex.id}" style="background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:14px;font-weight:700">${i+1}. ${ex.name}
          <span style="font-size:11px;color:var(--red,#C10801);font-weight:400;margin-left:6px">${ex.muscleGroup}</span>
        </div>
        <button class="iex-rm" data-id="${ex.id}" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:2px;line-height:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
        <div>
          <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin-bottom:4px;display:block">Series</label>
          <input type="number" class="dash-input iex-sets" value="${ex.sets}" style="padding:8px 10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin-bottom:4px;display:block">Reps</label>
          <input type="text" class="dash-input iex-reps" value="${ex.reps}" placeholder="10-12" style="padding:8px 10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin-bottom:4px;display:block">Descanso (s)</label>
          <input type="number" class="dash-input iex-rest" value="${ex.restSeconds}" style="padding:8px 10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin-bottom:4px;display:block">Cal. warming</label>
          <input type="number" class="dash-input iex-warmup" value="${ex.warmupSets}" style="padding:8px 10px;font-size:13px">
        </div>
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted);margin-bottom:4px;display:block">Notas</label>
        <textarea class="dash-input iex-notes" rows="2" style="resize:none;min-height:50px;padding:8px 10px;font-size:12px" placeholder="Técnica, cadencia...">${ex.setupNotes || ''}</textarea>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.iex-rm').forEach(btn => {
    btn.addEventListener('click', () => {
      syncInlineExValues(editorArea);
      _inlineExercises = _inlineExercises.filter(e => e.id !== btn.dataset.id);
      renderInlineExercises(editorArea);
    });
  });
}
