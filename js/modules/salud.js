/* ═══════════════════════════════════════════════
   TGWL — modules/salud.js
   Health Records Module with Sensitive Data Lock
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp } from '../firebase-config.js';
import { toast, formatDate } from '../utils.js';
import { openModal, closeModal, confirm } from '../components/modal.js';

export async function render(container) {
  const profile = getUserProfile();
  container.innerHTML = `
    <div class="page active" id="salud-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">❤️ Salud</h2>
            <p class="page-subtitle">Historial médico relevante</p>
          </div>
          <button class="btn-primary" id="btn-add-health" style="padding:10px 16px;font-size:13px">+ Añadir</button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="general">General</button>
          <button class="tab-btn" data-tab="sensible">🔒 Sensible</button>
        </div>

        <!-- General -->
        <div id="tab-general" class="tab-content">
          <div id="health-records-list">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>

        <!-- Sensitive (locked) -->
        <div id="tab-sensible" class="tab-content hidden">
          <div id="sensible-container"></div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  const profile = getUserProfile();

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'sensible') loadSensitiveSection(container, profile);
    });
  });

  container.querySelector('#btn-add-health')?.addEventListener('click', () => openAddHealthModal(profile, container));

  loadHealthRecords(container, profile, 'general');
}

// ── Load Health Records ───────────────────────
async function loadHealthRecords(container, profile, type = 'general') {
  const el = container.querySelector('#health-records-list');
  if (!el) return;

  try {
    const snap = await collections.health(profile.uid)
      .where('sensitive', '==', false)
      .orderBy('date', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏥</div>
          <div class="empty-title">Sin registros</div>
          <div class="empty-subtitle">Añade lesiones, operaciones o afecciones relevantes.</div>
        </div>
      `;
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      return buildHealthCard(doc.id, r, profile);
    }).join('');

    el.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm('Eliminar registro', '¿Eliminar este registro de salud?', { okText: 'Eliminar', danger: true });
        if (ok) {
          await collections.health(profile.uid).doc(btn.dataset.deleteId).delete();
          toast('Registro eliminado', 'info');
          loadHealthRecords(container, profile);
        }
      });
    });
  } catch (e) {
    el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Error: ${e.message}</p>`;
  }
}

function buildHealthCard(id, record, profile) {
  const typeIcons = { lesion: '🤕', fractura: '🦴', operacion: '🏥', protesis: '🦾', enfermedad: '💊', alergia: '⚠️', otro: '📋' };
  const icon = typeIcons[record.type] || '📋';

  return `
    <div class="health-record glass-card" style="cursor:default">
      <div class="health-record-header">
        <span class="health-record-icon">${icon}</span>
        <div style="flex:1">
          <div class="health-record-title">${record.title}</div>
          <div class="health-record-date">${record.type ? record.type.charAt(0).toUpperCase() + record.type.slice(1) : ''} · ${formatDate(record.date)}</div>
        </div>
        <div style="display:flex;gap:6px">
          ${record.active ? '<span class="badge badge-orange">Activo</span>' : '<span class="badge badge-gray">Resuelto</span>'}
          <button class="btn-icon" data-delete-id="${id}" style="width:32px;height:32px;font-size:14px;color:var(--color-danger)">🗑</button>
        </div>
      </div>
      ${record.description ? `<p style="font-size:13px;color:var(--color-text-muted);line-height:1.5;margin-top:var(--space-xs)">${record.description}</p>` : ''}
      ${record.affectsTraining ? `<p style="font-size:12px;color:var(--color-warning);margin-top:4px">⚠️ Afecta al entrenamiento: ${record.trainingNotes || ''}</p>` : ''}
    </div>
  `;
}

// ── Sensitive Section ─────────────────────────
function loadSensitiveSection(container, profile) {
  const el = container.querySelector('#sensible-container');
  if (!el) return;

  // Check if user has admin clearance
  const isAdmin = profile?.role === 'admin';
  // Or if this is their own data AND they've been given access by admin
  const hasAccess = isAdmin || profile?.sensitiveClearance === true;

  if (!hasAccess) {
    el.innerHTML = `
      <div class="sensitive-lock">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">Datos sensibles protegidos</div>
        <div class="lock-desc">
          Esta sección contiene información médica privada.<br>
          Solo es visible para el administrador autorizado.
        </div>
        <button class="btn-secondary" id="btn-request-access" style="margin-top:var(--space-md)">
          Solicitar acceso
        </button>
      </div>
    `;
    el.querySelector('#btn-request-access')?.addEventListener('click', () => {
      toast('Solicitud enviada al administrador', 'info');
    });
    return;
  }

  // Admin/authorized access
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md)">
      <span class="badge badge-red">🔑 Acceso autorizado</span>
      <button class="btn-primary" id="btn-add-sensitive" style="padding:8px 14px;font-size:12px">+ Añadir</button>
    </div>
    <div id="sensitive-records">
      <div class="overlay-spinner"><div class="spinner-sm"></div></div>
    </div>
  `;

  el.querySelector('#btn-add-sensitive')?.addEventListener('click', () => openAddHealthModal(profile, container, true));
  loadSensitiveRecords(el.querySelector('#sensitive-records'), profile);
}

async function loadSensitiveRecords(el, profile) {
  try {
    const snap = await collections.health(profile.uid)
      .where('sensitive', '==', true)
      .orderBy('date', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Sin datos sensibles</div></div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => buildHealthCard(doc.id, doc.data(), profile)).join('');
  } catch (e) {
    el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }
}

// ── Add Health Record Modal ───────────────────
function openAddHealthModal(profile, container, sensitive = false) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${sensitive ? '🔒 Dato sensible' : '❤️ Registro de salud'}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">Tipo</label>
      <div class="input-group" style="margin-top:4px">
        <span class="input-icon">📋</span>
        <select id="health-type">
          <option value="lesion">Lesión</option>
          <option value="fractura">Fractura</option>
          <option value="operacion">Operación</option>
          <option value="protesis">Prótesis</option>
          <option value="enfermedad">Enfermedad</option>
          <option value="alergia">Alergia</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <label class="field-label">Título / Diagnóstico</label>
      <div class="input-group" style="margin-top:4px">
        <span class="input-icon">📝</span>
        <input type="text" id="health-title" placeholder="Ej: Rotura fibras bíceps derecho">
      </div>
    </div>
    <div class="form-row">
      <label class="field-label">Fecha</label>
      <input type="date" id="health-date" class="input-solo" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-row">
      <label class="field-label">Descripción (opcional)</label>
      <textarea id="health-desc" class="input-solo" rows="3"
        placeholder="Detalles, tratamiento, observaciones..."
        style="padding:var(--space-md);width:100%;margin-top:4px"></textarea>
    </div>
    <div class="form-row" style="display:flex;align-items:center;gap:var(--space-md)">
      <label class="field-label" style="margin:0">¿Activo actualmente?</label>
      <label class="toggle-switch">
        <input type="checkbox" id="health-active" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="form-row" style="display:flex;align-items:center;gap:var(--space-md)">
      <label class="field-label" style="margin:0">¿Afecta al entrenamiento?</label>
      <label class="toggle-switch">
        <input type="checkbox" id="health-affects">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div id="training-notes-row" style="display:none" class="form-row">
      <input type="text" id="health-training-notes" class="input-solo" placeholder="Ej: Evitar peso muerto, no cargar más de 10kg...">
    </div>
    <button class="btn-primary btn-full" id="btn-save-health" style="margin-top:var(--space-md)">💾 Guardar</button>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  modal.querySelector('#health-affects').addEventListener('change', (e) => {
    modal.querySelector('#training-notes-row').style.display = e.target.checked ? '' : 'none';
  });

  modal.querySelector('#btn-save-health').addEventListener('click', async () => {
    const title = modal.querySelector('#health-title').value.trim();
    if (!title) { toast('Introduce un título', 'warning'); return; }

    const record = {
      type:            modal.querySelector('#health-type').value,
      title,
      date:            modal.querySelector('#health-date').value,
      description:     modal.querySelector('#health-desc').value.trim(),
      active:          modal.querySelector('#health-active').checked,
      affectsTraining: modal.querySelector('#health-affects').checked,
      trainingNotes:   modal.querySelector('#health-training-notes').value.trim(),
      sensitive,
      createdAt:       timestamp(),
    };

    try {
      await collections.health(profile.uid).add(record);
      toast('Registro guardado ✅', 'success');
      closeModal();
      loadHealthRecords(container, profile);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}
