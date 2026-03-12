/* ═══════════════════════════════════════════════
   TGWL — admin/menu-creator.js
   Nutritionist: Create & manage meal plans
═══════════════════════════════════════════════ */

import { db, collections, timestamp } from '../firebase-config.js';
import { getUserProfile }             from '../state.js';
import { toast, formatDate }          from '../utils.js';
import { openSheet, closeSheet, confirm } from '../components/modal.js';

// ── Meal slot names ────────────────────────────
const SLOT_OPTIONS = [
  'Desayuno',
  'Media mañana',
  'Almuerzo',
  'Merienda',
  'Cena',
  'Pre-entreno',
  'Post-entreno',
  'Suplementación',
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
  } catch { /* silently ignore — select stays empty */ }
}

// ── Build a single meal-slot card HTML ────────
function buildMealSlotHTML(index = 0) {
  const options = SLOT_OPTIONS.map(s => `<option>${s}</option>`).join('');
  return `
    <div class="meal-slot-item glass-card" data-slot-index="${index}" style="margin-bottom:var(--space-sm)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xs)">
        <select class="meal-slot-name input-solo" style="flex:1;margin-right:8px">
          ${options}
        </select>
        <input type="time" class="meal-slot-time input-solo" style="width:90px;margin-right:8px">
        <button class="btn-icon" style="color:var(--color-danger)" data-remove-slot>✕</button>
      </div>

      <div class="meal-items-list" style="margin-bottom:var(--space-xs)"></div>

      <div style="display:flex;gap:6px;margin-top:var(--space-xs)">
        <input type="text" class="meal-item-name input-solo" placeholder="Alimento (ej: Arroz cocido)" style="flex:2">
        <input type="text" class="meal-item-qty input-solo" placeholder="Cantidad (100g)" style="flex:1">
        <button class="btn-accent btn-add-meal-item" style="padding:6px 10px;white-space:nowrap">+</button>
      </div>

      <textarea
        class="meal-slot-notes input-solo"
        rows="1"
        placeholder="Notas de esta toma..."
        style="margin-top:var(--space-xs);font-size:12px;width:100%;resize:vertical"
      ></textarea>
    </div>
  `;
}

// ── Build a food-item row HTML ─────────────────
function buildFoodItemRow(name, quantity) {
  return `
    <div class="meal-item-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="font-size:13px">${name} — ${quantity}</span>
      <button class="btn-icon" style="color:var(--color-danger);font-size:11px" data-remove-item>✕</button>
    </div>
  `;
}

// ── Wire events inside a single slot card ─────
function wireMealSlotEvents(card) {
  // Remove slot
  card.querySelector('[data-remove-slot]')?.addEventListener('click', () => {
    card.remove();
  });

  // Add food item
  card.querySelector('.btn-add-meal-item')?.addEventListener('click', () => {
    const nameInput = card.querySelector('.meal-item-name');
    const qtyInput  = card.querySelector('.meal-item-qty');
    const name      = nameInput.value.trim();
    const quantity  = qtyInput.value.trim();
    if (!name) { toast('Escribe el nombre del alimento', 'warning'); return; }

    const list = card.querySelector('.meal-items-list');
    const row  = document.createElement('div');
    row.innerHTML = buildFoodItemRow(name, quantity || '—');
    const rowEl = row.firstElementChild;
    rowEl.querySelector('[data-remove-item]')?.addEventListener('click', () => rowEl.remove());
    list.appendChild(rowEl);

    nameInput.value = '';
    qtyInput.value  = '';
    nameInput.focus();
  });
}

// ── Collect slots from the DOM ─────────────────
function collectSlots(sc) {
  const meals = [];
  sc.querySelectorAll('.meal-slot-item').forEach(card => {
    const slot  = card.querySelector('.meal-slot-name')?.value || '';
    const time  = card.querySelector('.meal-slot-time')?.value || '';
    const notes = card.querySelector('.meal-slot-notes')?.value?.trim() || '';
    const items = [];
    card.querySelectorAll('.meal-item-row').forEach(row => {
      const text  = row.querySelector('span')?.textContent || '';
      const parts = text.split(' — ');
      items.push({ name: parts[0] || text, quantity: parts[1] || '' });
    });
    meals.push({ slot, time, items, notes });
  });
  return meals;
}

// ══════════════════════════════════════════════
// export: openMenuCreator
// ══════════════════════════════════════════════
export async function openMenuCreator(clientUid = null) {
  const profile = getUserProfile();
  const myUid   = profile?.uid;
  const myName  = profile?.name || 'Staff';
  const role    = profile?.role || 'nutricionista';

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🥗 Nuevo Plan Nutricional</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="padding:var(--space-md);overflow-y:auto;max-height:calc(100vh - 120px)">

      <!-- Basic Info -->
      <label class="field-label">Nombre del plan *</label>
      <input type="text" id="menu-name" class="input-solo" placeholder="Ej: Déficit calórico semana 1" style="margin-bottom:var(--space-md)">

      <label class="field-label">Descripción / Objetivo</label>
      <textarea id="menu-desc" class="input-solo" rows="2" placeholder="Objetivo del plan, observaciones..." style="margin-bottom:var(--space-md)"></textarea>

      <!-- Macro targets -->
      <div class="section-title">Objetivos nutricionales</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-md)">
        <div>
          <label class="field-label" style="font-size:11px">Kcal/día</label>
          <input type="number" id="menu-kcal" class="input-solo" placeholder="2000" style="margin-top:4px">
        </div>
        <div>
          <label class="field-label" style="font-size:11px">Proteínas (g)</label>
          <input type="number" id="menu-protein" class="input-solo" placeholder="150" style="margin-top:4px">
        </div>
        <div>
          <label class="field-label" style="font-size:11px">Carbohidratos (g)</label>
          <input type="number" id="menu-carbs" class="input-solo" placeholder="200" style="margin-top:4px">
        </div>
        <div>
          <label class="field-label" style="font-size:11px">Grasas (g)</label>
          <input type="number" id="menu-fat" class="input-solo" placeholder="70" style="margin-top:4px">
        </div>
      </div>

      <!-- Meal slots -->
      <div class="section-title">Comidas del día</div>
      <div id="meal-slots-container"></div>

      <button class="btn-accent" id="btn-add-meal-slot" style="margin-bottom:var(--space-md);width:100%">
        + Añadir toma
      </button>

      <!-- Assign client -->
      <label class="field-label">Asignar a cliente</label>
      <select id="menu-assign-client" class="input-solo" style="margin-top:4px;margin-bottom:var(--space-lg)">
        <option value="">— Sin asignar —</option>
      </select>

      <button class="btn-primary btn-full" id="btn-save-menu">💾 Guardar plan</button>
    </div>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  // Wire close button
  sc.querySelector('.modal-close')?.addEventListener('click', closeSheet);

  // Pre-populate client dropdown
  const assignSelect = sc.querySelector('#menu-assign-client');
  await loadAssignedClients(assignSelect, role, myUid);

  // If called with a specific client, pre-select them
  if (clientUid) {
    const opt = assignSelect.querySelector(`option[value="${clientUid}"]`);
    if (opt) opt.selected = true;
  }

  // Add meal slot
  let slotIndex = 0;
  const slotsContainer = sc.querySelector('#meal-slots-container');

  function addSlot() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildMealSlotHTML(slotIndex++);
    const card = wrapper.firstElementChild;
    wireMealSlotEvents(card);
    slotsContainer.appendChild(card);
  }

  // Add one slot by default
  addSlot();

  sc.querySelector('#btn-add-meal-slot')?.addEventListener('click', addSlot);

  // Save
  sc.querySelector('#btn-save-menu')?.addEventListener('click', async () => {
    const name = sc.querySelector('#menu-name')?.value?.trim();
    if (!name) { toast('El nombre del plan es obligatorio', 'warning'); return; }

    const description   = sc.querySelector('#menu-desc')?.value?.trim() || '';
    const kcalTarget    = parseFloat(sc.querySelector('#menu-kcal')?.value) || 0;
    const proteinTarget = parseFloat(sc.querySelector('#menu-protein')?.value) || 0;
    const carbsTarget   = parseFloat(sc.querySelector('#menu-carbs')?.value) || 0;
    const fatTarget     = parseFloat(sc.querySelector('#menu-fat')?.value) || 0;
    const assignedTo    = sc.querySelector('#menu-assign-client')?.value || null;
    const meals         = collectSlots(sc);

    if (meals.length === 0) { toast('Añade al menos una toma', 'warning'); return; }

    const plan = {
      name,
      description,
      kcalTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      meals,
      createdBy:     myUid,
      createdByName: myName,
      createdAt:     timestamp(),
      assignedTo:    assignedTo || null,
    };

    const saveBtn = sc.querySelector('#btn-save-menu');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Guardando…';

    try {
      // Save to top-level menus collection for easy querying
      await db.collection('menus').add(plan);

      // Also save to client subcollection if a client was selected
      if (assignedTo) {
        await collections.dietas(assignedTo).add({
          ...plan,
          assignedAt: timestamp(),
        });
      }

      toast('Plan guardado ✅', 'success');
      closeSheet();
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
      saveBtn.disabled    = false;
      saveBtn.textContent = '💾 Guardar plan';
    }
  });
}

// ══════════════════════════════════════════════
// export: openMenusList
// ══════════════════════════════════════════════
export async function openMenusList(container) {
  const profile = getUserProfile();
  const myUid   = profile?.uid;

  container.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  try {
    const snap = await db.collection('menus')
      .where('createdBy', '==', myUid)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🥗</div>
          <div class="empty-title">Sin planes creados</div>
          <div class="empty-subtitle">Crea tu primer plan nutricional.</div>
        </div>`;
      return;
    }

    const menus = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    container.innerHTML = menus.map(menu => buildMenuCard(menu)).join('');

    // Wire card buttons
    container.querySelectorAll('[data-assign-menu]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const menuId = btn.dataset.assignMenu;
        const menu   = menus.find(m => m.id === menuId);
        if (!menu) return;
        await openAssignMenuSheet(menu, profile);
      });
    });

    container.querySelectorAll('[data-delete-menu]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const menuId = btn.dataset.deleteMenu;
        const ok = await confirm('Eliminar plan', '¿Eliminar este plan nutricional? Esta acción no se puede deshacer.', { danger: true, okText: 'Eliminar' });
        if (!ok) return;
        try {
          await db.collection('menus').doc(menuId).delete();
          toast('Plan eliminado', 'success');
          // Re-render
          await openMenusList(container);
        } catch (e) {
          toast('Error: ' + e.message, 'error');
        }
      });
    });

  } catch (e) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Error: ${e.message}</p>`;
  }
}

// ── Menu card HTML ─────────────────────────────
function buildMenuCard(menu) {
  const mealCount = menu.meals?.length || 0;
  const kcal      = menu.kcalTarget ? `${menu.kcalTarget} kcal` : '—';
  const created   = menu.createdAt?.toDate
    ? formatDate(menu.createdAt.toDate())
    : '—';
  const assigned  = menu.assignedTo
    ? `<span class="badge badge-cyan" style="font-size:10px">Asignado</span>`
    : `<span class="badge badge-gray" style="font-size:10px">Sin asignar</span>`;

  return `
    <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            🥗 ${menu.name}
          </div>
          ${menu.description
            ? `<div class="text-muted" style="font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${menu.description}</div>`
            : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center">
            <span style="font-size:12px;color:var(--color-text-muted)">🔥 ${kcal}</span>
            <span style="font-size:12px;color:var(--color-text-muted)">🍽 ${mealCount} toma${mealCount !== 1 ? 's' : ''}</span>
            ${assigned}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px">${created}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button
            class="chip"
            data-assign-menu="${menu.id}"
            style="font-size:11px;padding:4px 10px;cursor:pointer;border-color:var(--cyan-dim);color:var(--cyan)"
          >Asignar</button>
          <button
            class="btn-icon"
            data-delete-menu="${menu.id}"
            style="color:var(--color-danger);font-size:12px"
          >🗑</button>
        </div>
      </div>
    </div>
  `;
}

// ── Sheet: assign a menu to a client ──────────
async function openAssignMenuSheet(menu, profile) {
  const role  = profile?.role || 'nutricionista';
  const myUid = profile?.uid;

  const html = `
    <h4 style="margin-bottom:4px">Asignar plan</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">
      <strong>${menu.name}</strong>
    </p>
    <label class="field-label">Selecciona cliente</label>
    <select id="assign-client-select" class="input-solo" style="margin-top:4px;margin-bottom:var(--space-md)">
      <option value="">— Selecciona un cliente —</option>
    </select>
    <button class="btn-primary btn-full" id="btn-do-assign">Asignar plan</button>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  const sel = sc.querySelector('#assign-client-select');
  await loadAssignedClients(sel, role, myUid);

  sc.querySelector('#btn-do-assign')?.addEventListener('click', async () => {
    const clientUid = sel.value;
    if (!clientUid) { toast('Selecciona un cliente', 'warning'); return; }

    try {
      await collections.dietas(clientUid).add({
        ...menu,
        id:         undefined,   // strip local id field
        assignedAt: timestamp(),
      });
      // Also update the top-level record
      await db.collection('menus').doc(menu.id).update({ assignedTo: clientUid });
      toast('Plan asignado ✅', 'success');
      closeSheet();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  });
}
