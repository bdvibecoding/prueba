/* ═══════════════════════════════════════════════
   TGWL — admin/supplement-creator.js
   Staff: Create & manage supplement protocols
═══════════════════════════════════════════════ */

import { db, collections, timestamp } from '../firebase-config.js';
import { getUserProfile }             from '../state.js';
import { toast, formatDate }          from '../utils.js';
import { openSheet, closeSheet, confirm } from '../components/modal.js';

// ── Common supplement suggestions ─────────────
const SUPPLEMENT_SUGGESTIONS = [
  'Creatina', 'Proteína Whey', 'BCAA', 'Vitamina D3',
  'Omega-3', 'Magnesio', 'ZMA', 'Beta-Alanina',
  'Cafeína', 'Glutamina', 'Colágeno',
];

// ── Timing options ─────────────────────────────
const TIMING_OPTIONS = [
  'Mañana en ayunas',
  'Con desayuno',
  'Pre-entreno (30min)',
  'Intra-entreno',
  'Post-entreno',
  'Con almuerzo',
  'Con cena',
  'Antes de dormir',
  'En cualquier momento',
];

// ── Helper: load clients assigned to current user ──
async function loadAssignedClients(selectEl, role, myUid) {
  const field = role === 'nutricionista' ? 'assignedNutricionista' : 'assignedCoach';
  try {
    const snap = await db.collection('users')
      .where(field, '==', myUid)
      .limit(50)
      .get();
    snap.docs.forEach(doc => {
      const d   = doc.data();
      const opt = document.createElement('option');
      opt.value       = doc.id;
      opt.textContent = d.name || d.email || doc.id;
      selectEl.appendChild(opt);
    });
  } catch { /* silently ignore */ }
}

// ── Build supplement item row HTML ────────────
function buildSupplItemRow(item) {
  const { supplement, brand, dose, timing, instructions, duration } = item;
  return `
    <div class="suppl-item-row glass-card" style="margin-bottom:8px;padding:var(--space-sm)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">
            ${supplement}${brand ? ` · <span style="font-weight:400;color:var(--color-text-muted)">${brand}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--color-text-muted)">${dose ? dose + ' · ' : ''}${timing}</div>
          ${instructions ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${instructions}</div>` : ''}
          ${duration ? `<div style="font-size:11px;color:var(--color-accent);margin-top:2px">⏱ ${duration}</div>` : ''}
        </div>
        <button class="btn-icon" data-remove-suppl style="color:var(--color-danger);flex-shrink:0;margin-left:8px">✕</button>
      </div>
    </div>
  `;
}

// ── Collect items from the DOM ─────────────────
function collectItems(sc) {
  const items = [];
  sc.querySelectorAll('.suppl-item-row').forEach(row => {
    // Read back from stored dataset
    items.push({
      supplement:   row.dataset.supplement   || '',
      brand:        row.dataset.brand        || '',
      dose:         row.dataset.dose         || '',
      timing:       row.dataset.timing       || '',
      instructions: row.dataset.instructions || '',
      duration:     row.dataset.duration     || '',
    });
  });
  return items;
}

// ══════════════════════════════════════════════
// export: openSupplementCreator
// ══════════════════════════════════════════════
export async function openSupplementCreator(clientUid = null) {
  const profile = getUserProfile();
  const myUid   = profile?.uid;
  const myName  = profile?.name || 'Staff';
  const role    = profile?.role || 'coach';

  const timingOpts  = TIMING_OPTIONS.map(t => `<option>${t}</option>`).join('');
  const suggChips   = SUPPLEMENT_SUGGESTIONS.map(s =>
    `<button class="chip suppl-suggest" data-name="${s}" style="cursor:pointer">${s}</button>`
  ).join('');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">💊 Nuevo Protocolo de Suplementación</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="padding:var(--space-md);overflow-y:auto;max-height:calc(100vh - 120px)">

      <label class="field-label">Nombre del protocolo *</label>
      <input type="text" id="suppl-name" class="input-solo" placeholder="Ej: Protocolo de volumen" style="margin-bottom:var(--space-md)">

      <label class="field-label">Descripción / Objetivo</label>
      <textarea id="suppl-desc" class="input-solo" rows="2" placeholder="Objetivo del protocolo..." style="margin-bottom:var(--space-md)"></textarea>

      <div class="section-title">Suplementos</div>

      <!-- Quick suggestions -->
      <div style="margin-bottom:var(--space-sm)">
        <p style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">Sugerencias:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${suggChips}
        </div>
      </div>

      <!-- New supplement form -->
      <div class="glass-card" style="margin-bottom:var(--space-sm)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:11px;color:var(--color-text-muted)">Suplemento *</label>
            <input type="text" id="new-suppl-name" class="input-solo" placeholder="Nombre" style="margin-top:2px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--color-text-muted)">Marca</label>
            <input type="text" id="new-suppl-brand" class="input-solo" placeholder="Opcional" style="margin-top:2px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--color-text-muted)">Dosis</label>
            <input type="text" id="new-suppl-dose" class="input-solo" placeholder="Ej: 5g" style="margin-top:2px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--color-text-muted)">Momento</label>
            <select id="new-suppl-timing" class="input-solo" style="margin-top:2px">
              ${timingOpts}
            </select>
          </div>
        </div>
        <input type="text" id="new-suppl-instructions" class="input-solo" placeholder="Instrucciones (mezclar con agua...)" style="margin-bottom:6px">
        <input type="text" id="new-suppl-duration" class="input-solo" placeholder="Duración (ej: 8 semanas, continuo)">
        <button class="btn-accent btn-full" id="btn-add-suppl" style="margin-top:8px">+ Añadir suplemento</button>
      </div>

      <!-- Items list -->
      <div id="suppl-items-list"></div>

      <label class="field-label" style="margin-top:var(--space-md)">Notas generales</label>
      <textarea id="suppl-notes" class="input-solo" rows="2" placeholder="Contraindicaciones, consejos..." style="margin-top:4px;margin-bottom:var(--space-md)"></textarea>

      <!-- Assign client -->
      <label class="field-label">Asignar a cliente</label>
      <select id="suppl-assign-client" class="input-solo" style="margin-top:4px;margin-bottom:var(--space-lg)">
        <option value="">— Sin asignar —</option>
      </select>

      <button class="btn-primary btn-full" id="btn-save-suppl">💾 Guardar protocolo</button>
    </div>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  // Wire close button
  sc.querySelector('.modal-close')?.addEventListener('click', closeSheet);

  // Pre-populate client dropdown
  const assignSelect = sc.querySelector('#suppl-assign-client');
  await loadAssignedClients(assignSelect, role, myUid);

  if (clientUid) {
    const opt = assignSelect.querySelector(`option[value="${clientUid}"]`);
    if (opt) opt.selected = true;
  }

  // Suggestion chip click → pre-fill name input
  sc.querySelectorAll('.suppl-suggest').forEach(chip => {
    chip.addEventListener('click', () => {
      sc.querySelector('#new-suppl-name').value = chip.dataset.name;
      sc.querySelector('#new-suppl-name').focus();
    });
  });

  // Add supplement item
  const itemsList = sc.querySelector('#suppl-items-list');

  sc.querySelector('#btn-add-suppl')?.addEventListener('click', () => {
    const name         = sc.querySelector('#new-suppl-name')?.value?.trim();
    const brand        = sc.querySelector('#new-suppl-brand')?.value?.trim() || '';
    const dose         = sc.querySelector('#new-suppl-dose')?.value?.trim() || '';
    const timing       = sc.querySelector('#new-suppl-timing')?.value || TIMING_OPTIONS[0];
    const instructions = sc.querySelector('#new-suppl-instructions')?.value?.trim() || '';
    const duration     = sc.querySelector('#new-suppl-duration')?.value?.trim() || '';

    if (!name) { toast('El nombre del suplemento es obligatorio', 'warning'); return; }

    const item = { supplement: name, brand, dose, timing, instructions, duration };

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildSupplItemRow(item);
    const rowEl = wrapper.firstElementChild;

    // Store data on the element for easy collection later
    rowEl.dataset.supplement   = name;
    rowEl.dataset.brand        = brand;
    rowEl.dataset.dose         = dose;
    rowEl.dataset.timing       = timing;
    rowEl.dataset.instructions = instructions;
    rowEl.dataset.duration     = duration;

    rowEl.querySelector('[data-remove-suppl]')?.addEventListener('click', () => rowEl.remove());
    itemsList.appendChild(rowEl);

    // Clear form
    sc.querySelector('#new-suppl-name').value         = '';
    sc.querySelector('#new-suppl-brand').value        = '';
    sc.querySelector('#new-suppl-dose').value         = '';
    sc.querySelector('#new-suppl-instructions').value = '';
    sc.querySelector('#new-suppl-duration').value     = '';
    sc.querySelector('#new-suppl-name').focus();
  });

  // Save
  sc.querySelector('#btn-save-suppl')?.addEventListener('click', async () => {
    const name = sc.querySelector('#suppl-name')?.value?.trim();
    if (!name) { toast('El nombre del protocolo es obligatorio', 'warning'); return; }

    const items = collectItems(sc);
    if (items.length === 0) { toast('Añade al menos un suplemento', 'warning'); return; }

    const description = sc.querySelector('#suppl-desc')?.value?.trim() || '';
    const notes       = sc.querySelector('#suppl-notes')?.value?.trim() || '';
    const assignedTo  = sc.querySelector('#suppl-assign-client')?.value || null;

    const protocol = {
      name,
      description,
      items,
      notes,
      createdBy:     myUid,
      createdByName: myName,
      createdAt:     timestamp(),
      assignedTo:    assignedTo || null,
    };

    const saveBtn = sc.querySelector('#btn-save-suppl');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Guardando…';

    try {
      await db.collection('supplements').add(protocol);

      if (assignedTo) {
        await collections.supplements(assignedTo).add({
          ...protocol,
          assignedAt: timestamp(),
        });
      }

      toast('Protocolo guardado ✅', 'success');
      closeSheet();
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
      saveBtn.disabled    = false;
      saveBtn.textContent = '💾 Guardar protocolo';
    }
  });
}

// ══════════════════════════════════════════════
// export: openSupplementsList
// ══════════════════════════════════════════════
export async function openSupplementsList(container) {
  const profile = getUserProfile();
  const myUid   = profile?.uid;

  container.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  try {
    const snap = await db.collection('supplements')
      .where('createdBy', '==', myUid)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💊</div>
          <div class="empty-title">Sin protocolos creados</div>
          <div class="empty-subtitle">Crea tu primer protocolo de suplementación.</div>
        </div>`;
      return;
    }

    const protocols = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    container.innerHTML = protocols.map(p => buildProtocolCard(p)).join('');

    // Wire assign buttons
    container.querySelectorAll('[data-assign-suppl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid      = btn.dataset.assignSuppl;
        const protocol = protocols.find(p => p.id === pid);
        if (!protocol) return;
        await openAssignSupplSheet(protocol, profile);
      });
    });

    // Wire delete buttons
    container.querySelectorAll('[data-delete-suppl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.deleteSuppl;
        const ok  = await confirm('Eliminar protocolo', '¿Eliminar este protocolo de suplementación? Esta acción no se puede deshacer.', { danger: true, okText: 'Eliminar' });
        if (!ok) return;
        try {
          await db.collection('supplements').doc(pid).delete();
          toast('Protocolo eliminado', 'success');
          await openSupplementsList(container);
        } catch (e) {
          toast('Error: ' + e.message, 'error');
        }
      });
    });

  } catch (e) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Error: ${e.message}</p>`;
  }
}

// ── Protocol card HTML ─────────────────────────
function buildProtocolCard(protocol) {
  const itemCount = protocol.items?.length || 0;
  const created   = protocol.createdAt?.toDate
    ? formatDate(protocol.createdAt.toDate())
    : '—';
  const assigned  = protocol.assignedTo
    ? `<span class="badge badge-cyan" style="font-size:10px">Asignado</span>`
    : `<span class="badge badge-gray" style="font-size:10px">Sin asignar</span>`;

  return `
    <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            💊 ${protocol.name}
          </div>
          ${protocol.description
            ? `<div class="text-muted" style="font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${protocol.description}</div>`
            : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center">
            <span style="font-size:12px;color:var(--color-text-muted)">💊 ${itemCount} suplemento${itemCount !== 1 ? 's' : ''}</span>
            ${assigned}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px">${created}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button
            class="chip"
            data-assign-suppl="${protocol.id}"
            style="font-size:11px;padding:4px 10px;cursor:pointer;border-color:var(--cyan-dim);color:var(--cyan)"
          >Asignar</button>
          <button
            class="btn-icon"
            data-delete-suppl="${protocol.id}"
            style="color:var(--color-danger);font-size:12px"
          >🗑</button>
        </div>
      </div>
    </div>
  `;
}

// ── Sheet: assign protocol to a client ────────
async function openAssignSupplSheet(protocol, profile) {
  const role  = profile?.role || 'coach';
  const myUid = profile?.uid;

  const html = `
    <h4 style="margin-bottom:4px">Asignar protocolo</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">
      <strong>${protocol.name}</strong>
    </p>
    <label class="field-label">Selecciona cliente</label>
    <select id="assign-suppl-client-select" class="input-solo" style="margin-top:4px;margin-bottom:var(--space-md)">
      <option value="">— Selecciona un cliente —</option>
    </select>
    <button class="btn-primary btn-full" id="btn-do-assign-suppl">Asignar protocolo</button>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  const sel = sc.querySelector('#assign-suppl-client-select');
  await loadAssignedClients(sel, role, myUid);

  sc.querySelector('#btn-do-assign-suppl')?.addEventListener('click', async () => {
    const clientUid = sel.value;
    if (!clientUid) { toast('Selecciona un cliente', 'warning'); return; }

    try {
      await collections.supplements(clientUid).add({
        ...protocol,
        id:         undefined,
        assignedAt: timestamp(),
      });
      await db.collection('supplements').doc(protocol.id).update({ assignedTo: clientUid });
      toast('Protocolo asignado ✅', 'success');
      closeSheet();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  });
}
