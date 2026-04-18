/* ═══════════════════════════════════════════════
   TGWL — admin/routine-creator.js
   Routine Creator & Manager for coaches/admins
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate } from '../utils.js';
import { openSheet, closeSheet, openModal, closeModal, confirm } from '../components/modal.js';
import { EXERCISES } from '../../data/data.js';
import { t } from '../i18n.js';

// ── Helpers ────────────────────────────────────
const TAGS = ['Fuerza', 'Hipertrofia', 'Cardio', 'Full Body', 'Upper', 'Lower', 'Push', 'Pull', 'Legs', 'HIIT'];
const MUSCLE_GROUPS = [...new Set(EXERCISES.map(e => e.muscleGroup))].sort();

// ─────────────────────────────────────────────────────────────────────────────
// openRoutineCreator(clientUid?)
// Opens a full-screen sheet to create a new routine and optionally assign it.
// ─────────────────────────────────────────────────────────────────────────────
export async function openRoutineCreator(clientUid = null) {
  // Load clients list for the optional assign-to dropdown (only when no specific client)
  let clientsOptions = '';
  if (!clientUid) {
    try {
      const profile = getUserProfile();
      const role    = profile?.role || 'coach';
      const fieldMap = {
        coach: 'assignedCoach',
        medico: 'assignedMedico',
        fisio: 'assignedFisio',
        psicologo: 'assignedPsicologo',
        nutricionista: 'assignedNutricionista',
        admin: 'assignedCoach',
      };
      const field = fieldMap[role] || 'assignedCoach';
      const snap  = await db.collection('users')
        .where(field, '==', profile.uid)
        .limit(50)
        .get();
      clientsOptions = snap.docs.map(doc => {
        const d = doc.data();
        return `<option value="${doc.id}">${d.name || d.email || doc.id}</option>`;
      }).join('');
    } catch { /* ignore — dropdown just won't have entries */ }
  }

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('rc_title')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="padding:var(--space-md);overflow-y:auto;max-height:calc(80vh - 60px)">

      <!-- Routine name -->
      <label class="field-label">${t('rc_name_label')}</label>
      <input
        type="text"
        id="routine-name"
        class="input-solo"
        placeholder="${t('rc_name_placeholder')}"
        style="margin-bottom:var(--space-md)"
      >

      <!-- Description -->
      <label class="field-label">${t('rc_desc_label')}</label>
      <textarea
        id="routine-desc"
        class="input-solo"
        placeholder="${t('rc_desc_placeholder')}"
        rows="2"
        style="margin-bottom:var(--space-md);resize:vertical"
      ></textarea>

      <!-- Tag chips -->
      <label class="field-label">${t('rc_tags_label')}</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--space-md)" id="tag-chips">
        ${TAGS.map(tag =>
 `<button class="chip tag-chip" data-tag="${tag}" type="button">${tag}</button>`
        ).join('')}
      </div>

      <!-- Exercise builder -->
      <div class="section-title" style="margin-top:var(--space-sm)">${t('rc_exercises_title')}</div>
      <div id="exercise-builder-list"></div>

      <button
        class="btn-accent btn-full"
        id="btn-add-exercise"
        type="button"
        style="margin-top:var(--space-sm)"
      >${t('rc_add_exercise')}</button>

      <!-- Client assignment -->
      ${clientUid
        ? `<div style="margin-top:var(--space-md)">
             <label class="field-label">${t('rc_assign_btn')}</label>
             <p style="font-size:12px;color:var(--color-text-muted);margin-top:4px">
               ${t('rc_assign_auto')}
             </p>
           </div>`
        : `<div style="margin-top:var(--space-md)">
             <label class="field-label">${t('rc_assign_label')}</label>
             <select id="select-assign-client" class="input-solo" style="margin-top:4px">
               <option value="">${t('rc_no_assign')}</option>
               ${clientsOptions}
             </select>
           </div>`
      }

      <!-- Save button -->
      <button
        class="btn-primary btn-full"
        id="btn-save-routine"
        type="button"
        style="margin-top:var(--space-lg);margin-bottom:var(--space-md)"
      >${t('rc_save')}</button>

    </div>
 `;

  openSheet(html, { noClickClose: false });

  const sc = document.getElementById('sheet-content');
  if (!sc) return;

  // ── Tag chip toggle ──────────────────────────
  sc.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // ── Add exercise button ──────────────────────
  sc.querySelector('#btn-add-exercise')?.addEventListener('click', () => {
    openExercisePicker(sc);
  });

  // ── Save routine ─────────────────────────────
  sc.querySelector('#btn-save-routine')?.addEventListener('click', () => {
    saveRoutine(sc, clientUid);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise Picker Sheet
// ─────────────────────────────────────────────────────────────────────────────
function openExercisePicker(creatorSc) {
  // Track which exercises are already added
  const addedIds = new Set(
    [...creatorSc.querySelectorAll('.exercise-builder-item')].map(el => el.dataset.exId)
  );

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('rc_exercise_picker')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="padding:var(--space-md);overflow-y:auto;max-height:calc(80vh - 60px)">
      <input
        type="text"
        id="ex-search"
        class="input-solo"
        placeholder="${t('rc_search_exercise')}"
        style="margin-bottom:var(--space-md)"
      >
      <!-- Muscle group filter chips -->
      <div class="h-scroll" id="muscle-filter" style="margin-bottom:var(--space-md);padding-bottom:4px">
        <button class="chip active" data-muscle="all" type="button">${t('rc_all_muscles')}</button>
        ${MUSCLE_GROUPS.map(g =>
 `<button class="chip" data-muscle="${g}" type="button">${g}</button>`
        ).join('')}
      </div>
      <!-- Exercise list -->
      <div id="ex-picker-list">
        ${renderPickerItems(EXERCISES, addedIds)}
      </div>
    </div>
 `;

  openModal(html, { noClickClose: false });

  const mc = document.getElementById('modal-content');
  if (!mc) return;

  // ── Search filter ─────────────────────────────
  let currentMuscle = 'all';
  let currentSearch = '';

  function applyFilters() {
    const list    = mc.querySelector('#ex-picker-list');
    if (!list) return;
    const filtered = EXERCISES.filter(ex => {
      const matchSearch = !currentSearch ||
        ex.name.toLowerCase().includes(currentSearch) ||
        ex.muscleGroup.toLowerCase().includes(currentSearch);
      const matchMuscle = currentMuscle === 'all' || ex.muscleGroup === currentMuscle;
      return matchSearch && matchMuscle;
    });
    list.innerHTML = renderPickerItems(filtered, addedIds);
    wirePickerItems(list);
  }

  mc.querySelector('#ex-search')?.addEventListener('input', e => {
    currentSearch = e.target.value.toLowerCase().trim();
    applyFilters();
  });

  mc.querySelectorAll('#muscle-filter .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      mc.querySelectorAll('#muscle-filter .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMuscle = chip.dataset.muscle;
      applyFilters();
    });
  });

  // ── Wire initial picker items ─────────────────
  wirePickerItems(mc.querySelector('#ex-picker-list'));

  function wirePickerItems(container) {
    if (!container) return;
    container.querySelectorAll('.exercise-picker-item:not(.already-added)').forEach(item => {
      item.addEventListener('click', () => {
        const exId = item.dataset.exId;
        const ex   = EXERCISES.find(e => e.id === exId);
        if (!ex) return;
        addExerciseToBuilder(creatorSc, ex);
        closeModal();
      });
    });
  }
}

// ── Render picker item list HTML ───────────────
function renderPickerItems(exercises, addedIds) {
  if (!exercises.length) {
    return `<p class="text-muted" style="padding:var(--space-md);text-align:center">${t('rc_no_results')}</p>`;
  }
  return exercises.map(ex => {
    const isAdded = addedIds.has(ex.id);
    return `
      <div
        class="exercise-picker-item${isAdded ? ' already-added' : ''}"
        data-ex-id="${ex.id}"
        style="
          padding:var(--space-sm);
          border-radius:var(--radius-md);
          cursor:${isAdded ? 'default' : 'pointer'};
          display:flex;
          justify-content:space-between;
          align-items:center;
          border-bottom:1px solid rgba(255,255,255,0.05);
          opacity:${isAdded ? '0.45' : '1'};
 "
      >
        <div>
          <div style="font-weight:500;font-size:14px">${ex.name}</div>
          <div style="font-size:11px;color:var(--color-text-muted)">${ex.muscleGroup} · ${ex.equipment || ''}</div>
        </div>
        ${isAdded
          ? `<span style="font-size:10px;color:var(--color-text-muted)">${t('rc_added')}</span>`
          : `<span class="badge badge-cyan" style="font-size:10px">${ex.difficulty || ''}</span>`
        }
      </div>
 `;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Add exercise row to the builder list
// ─────────────────────────────────────────────────────────────────────────────
function addExerciseToBuilder(sc, ex) {
  const list = sc.querySelector('#exercise-builder-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'exercise-builder-item glass-card';
  item.dataset.exId = ex.id;
  item.style.marginBottom = 'var(--space-sm)';

  item.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xs)">
      <div>
        <div style="font-weight:600;font-size:14px">${ex.name}</div>
        <div style="font-size:11px;color:var(--color-text-muted)">${ex.muscleGroup} · ${ex.equipment || ''}</div>
      </div>
      <button
        class="btn-icon"
        data-remove="${ex.id}"
        type="button"
        style="color:var(--color-danger);font-size:16px;line-height:1"
      >✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:var(--space-xs)">
      <div>
        <label style="font-size:11px;color:var(--color-text-muted)">${t('rc_sets_label')}</label>
        <input
          type="number"
          class="ex-sets input-solo"
          style="margin-top:2px;padding:6px"
          value="${ex.defaultSets || 3}"
          min="1"
          max="10"
        >
      </div>
      <div>
        <label style="font-size:11px;color:var(--color-text-muted)">${t('rc_reps_label')}</label>
        <input
          type="text"
          class="ex-reps input-solo"
          style="margin-top:2px;padding:6px"
          value="${ex.defaultReps || '8-12'}"
          placeholder="8-12"
        >
      </div>
      <div>
        <label style="font-size:11px;color:var(--color-text-muted)">${t('rc_rest_label')}</label>
        <input
          type="number"
          class="ex-rest input-solo"
          style="margin-top:2px;padding:6px"
          value="${ex.defaultRest || 60}"
          min="0"
          max="600"
        >
      </div>
    </div>
    <input
      type="text"
      class="ex-notes input-solo"
      style="padding:6px;font-size:12px"
      placeholder="${t('rc_notes_placeholder')}"
      value="${ex.setupNotes || ''}"
    >
 `;

  // Wire remove button
  item.querySelector('[data-remove]')?.addEventListener('click', () => item.remove());

  list.appendChild(item);
}

// ─────────────────────────────────────────────────────────────────────────────
// Save routine to Firestore
// ─────────────────────────────────────────────────────────────────────────────
async function saveRoutine(sc, clientUid) {
  const profile   = getUserProfile();
  const nameInput = sc.querySelector('#routine-name');
  const descInput = sc.querySelector('#routine-desc');
  const name      = nameInput?.value?.trim();

  if (!name) {
    toast(t('rc_name_required'), 'warning');
    nameInput?.focus();
    return;
  }

  // Collect selected tags
  const selectedTags = [...sc.querySelectorAll('.tag-chip.active')].map(c => c.dataset.tag);

  // Collect exercises
  const exercises = [];
  sc.querySelectorAll('.exercise-builder-item').forEach(item => {
    const exId = item.dataset.exId;
    const ex   = EXERCISES.find(e => e.id === exId);
    if (!ex) return;
    exercises.push({
      id:          ex.id,
      name:        ex.name,
      muscleGroup: ex.muscleGroup,
      secondary:   ex.secondary || [],
      equipment:   ex.equipment || '',
      videoUrl:    ex.videoUrl || '',
      sets:        parseInt(item.querySelector('.ex-sets')?.value) || 3,
      reps:        item.querySelector('.ex-reps')?.value || '8-12',
      restSeconds: parseInt(item.querySelector('.ex-rest')?.value) || 60,
      setupNotes:  item.querySelector('.ex-notes')?.value || '',
    });
  });

  if (exercises.length === 0) {
    toast(t('rc_exercises_required'), 'warning');
    return;
  }

  // Determine client to assign
  const assignClientUid = clientUid ||
    sc.querySelector('#select-assign-client')?.value || null;

  const routine = {
    name,
    description: descInput?.value?.trim() || '',
    tags:        selectedTags,
    exercises,
    createdBy:     profile.uid,
    createdByName: profile.name || profile.email || '',
    createdAt:   timestamp(),
    updatedAt:   timestamp(),
  };

  // Disable save button while working
  const saveBtn = sc.querySelector('#btn-save-routine');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = t('rc_saving'); }

  try {
    const docRef = await collections.routines().add(routine);
    const newRoutineId = docRef.id;

    // Assign to client if selected
    if (assignClientUid) {
      await collections.assignments(assignClientUid).add({
        routineId:   newRoutineId,
        routineName: routine.name,
        assignedAt:  timestamp(),
        assignedBy:  profile.uid,
        status: 'active',
        createdAt:   timestamp(),
      });
    }

    const savedMsg = assignClientUid
      ? t('rc_saved').replace('{name}', name)
      : t('rc_saved_no_assign').replace('{name}', name);
    toast(savedMsg, 'success');
    closeSheet();
  } catch (e) {
    toast(t('rc_save_error') + ': ' + e.message, 'error');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = t('rc_save'); }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// openRoutinesList(container)
// Renders the coach's routines inside a bottom sheet.
// ─────────────────────────────────────────────────────────────────────────────
export async function openRoutinesList(container) {
  const profile = getUserProfile();

  // Open an initially loading sheet
  const html = `
    <div class="modal-header" style="margin-bottom:var(--space-md)">
      <h3 class="modal-title">${t('rc_my_routines')}</h3>
      <button class="modal-close" id="close-routines-sheet">✕</button>
    </div>
    <div style="padding:0 var(--space-md) var(--space-md)">
      <button class="btn-accent btn-full" id="btn-new-routine-from-list" type="button"
              style="margin-bottom:var(--space-md)">
        ${t('rc_new_routine')}
      </button>
      <div id="routines-list-inner">
        <div class="overlay-spinner"><div class="spinner-sm"></div></div>
      </div>
    </div>
 `;

  openSheet(html, { noClickClose: false });

  const sc = document.getElementById('sheet-content');
  if (!sc) return;

  sc.querySelector('#close-routines-sheet')?.addEventListener('click', closeSheet);
  sc.querySelector('#btn-new-routine-from-list')?.addEventListener('click', () => {
    closeSheet();
    setTimeout(() => openRoutineCreator(), 150);
  });

  await loadRoutinesList(sc, profile);
}

// ── Load and render the routines list ──────────
async function loadRoutinesList(sc, profile) {
  const inner = sc.querySelector('#routines-list-inner');
  if (!inner) return;

  try {
    const snap = await collections.routines()
      .where('createdBy', '==', profile.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snap.empty) {
      inner.innerHTML = `
        <div class="empty-state" style="padding:var(--space-lg) 0">
          <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg></div>
          <div class="empty-title">${t('rc_no_routines')}</div>
          <div class="empty-subtitle">${t('rc_no_routines_sub')}</div>
        </div>
 `;
      return;
    }

    inner.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const exCount = r.exercises?.length || 0;
      const tagStr  = r.tags?.length ? r.tags.join(', ') : '—';
      const created = r.createdAt
        ? formatDate(r.createdAt?.toDate?.() || r.createdAt)
        : '—';
      const exLabel = exCount === 1 ? t('rc_exercise_s') : t('rc_exercises_s');
      return `
        <div class="glass-card routine-item"
             data-id="${doc.id}"
             style="padding:var(--space-md);margin-bottom:var(--space-sm)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${r.name || t('admin_no_name')}
              </div>
              <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">
                ${exCount} ${exLabel} · ${tagStr}
              </div>
              <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">
                ${t('rc_created')}${created}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button
                class="btn-icon btn-assign-routine"
                data-id="${doc.id}"
                data-name="${(r.name || '').replace(/"/g, '&quot;')}"
                title="${t('rc_assign_btn')}"
                type="button"
                style="font-size:18px"
              ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
              <button
                class="btn-icon btn-delete-routine"
                data-id="${doc.id}"
                data-name="${(r.name || '').replace(/"/g, '&quot;')}"
                title="${t('rc_delete_btn')}"
                type="button"
                style="font-size:18px;color:var(--color-danger)"
              ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
            </div>
          </div>
        </div>
 `;
    }).join('');

    // Wire assign buttons
    inner.querySelectorAll('.btn-assign-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAssignClientModal(btn.dataset.id, btn.dataset.name, profile);
      });
    });

    // Wire delete buttons
    inner.querySelectorAll('.btn-delete-routine').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await confirm(
          t('rc_delete_title'),
          t('rc_delete_confirm').replace('{name}', btn.dataset.name),
          { okText: t('rc_delete_btn'), danger: true }
        );
        if (!ok) return;
        try {
          await collections.routines().doc(btn.dataset.id).delete();
          toast(t('rc_deleted'), 'success');
          // Remove item from DOM
          inner.querySelector(`.routine-item[data-id="${btn.dataset.id}"]`)?.remove();
          if (!inner.querySelector('.routine-item')) {
            inner.innerHTML = `
              <div class="empty-state" style="padding:var(--space-lg) 0">
                <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg></div>
                <div class="empty-title">${t('rc_no_routines')}</div>
                <div class="empty-subtitle">${t('rc_no_routines_sub')}</div>
              </div>
 `;
          }
        } catch (err) {
          toast(t('rc_delete_error') + ': ' + err.message, 'error');
        }
      });
    });

  } catch (e) {
    inner.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('rc_load_error')}: ${e.message}</p>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign routine to a client — modal with client picker
// ─────────────────────────────────────────────────────────────────────────────
async function openAssignClientModal(routineId, routineName, profile) {
  // Load coach's clients
  let clients = [];
  try {
    const role = profile?.role || 'coach';
    const fieldMap = {
      coach: 'assignedCoach',
      medico: 'assignedMedico',
      fisio: 'assignedFisio',
      psicologo: 'assignedPsicologo',
      nutricionista: 'assignedNutricionista',
      admin: 'assignedCoach',
    };
    const field = fieldMap[role] || 'assignedCoach';
    const snap  = await db.collection('users')
      .where(field, '==', profile.uid)
      .limit(50)
      .get();
    clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch { /* handled below */ }

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('rc_assign_title')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="padding:var(--space-md)">
      <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:var(--space-md)">
        <strong>${routineName}</strong> → ${t('rc_assign_to')}
      </p>
      ${clients.length
        ? `<div id="assign-client-list">
            ${clients.map(c => `
              <div
                class="glass-card assign-client-item"
                data-uid="${c.uid || c.id}"
                style="
                  display:flex;align-items:center;gap:12px;
                  padding:var(--space-sm) var(--space-md);
                  margin-bottom:var(--space-sm);
                  cursor:pointer;
 "
              >
                <div style="
                  width:36px;height:36px;border-radius:50%;flex-shrink:0;
                  background:linear-gradient(135deg,var(--color-primary),var(--cyan-dim));
                  display:flex;align-items:center;justify-content:center;
                  font-weight:700;font-size:13px;color:var(--white)
 ">${(c.name || '?').slice(0, 2).toUpperCase()}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:14px">${c.name || t('staff_client_label')}</div>
                  <div style="font-size:11px;color:var(--color-text-muted)">${c.email || ''}</div>
                </div>
                <span class="badge badge-cyan" style="font-size:10px">${t('assign')}</span>
              </div>
 `).join('')}
           </div>`
        : `<p class="text-muted" style="padding:var(--space-md);text-align:center">
             ${t('rc_no_clients')}
           </p>`
      }
    </div>
 `;

  openModal(html, { noClickClose: false });

  const mc = document.getElementById('modal-content');
  if (!mc) return;

  mc.querySelectorAll('.assign-client-item').forEach(item => {
    item.addEventListener('click', async () => {
      const clientUid  = item.dataset.uid;
      const clientName = item.querySelector('div > div:first-child')?.textContent?.trim() || '';
      try {
        await collections.assignments(clientUid).add({
          routineId,
          routineName,
          assignedAt: timestamp(),
          assignedBy: profile.uid,
          status: 'active',
          createdAt:  timestamp(),
        });
        toast(t('rc_assign_ok').replace('{name}', clientName), 'success');
        closeModal();
      } catch (e) {
        toast(t('rc_assign_error') + ': ' + e.message, 'error');
      }
    });
  });
}
