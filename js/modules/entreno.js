/* ═══════════════════════════════════════════════
   TGWL — modules/entreno.js
   Workout Module — Full Training Session Flow
═══════════════════════════════════════════════ */

import { getUserProfile, getActiveSession, startWorkoutSession, endSession, markSetDone, unmarkSetDone, updateSetData, appState } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, formatTime, formatDate, pad, launchConfetti, requestWakeLock, releaseWakeLock } from '../utils.js';
import { openModal, closeModal, openSheet, closeSheet, confirm, alert, openRPESheet, promptModal } from '../components/modal.js';
import { buildWorkoutTimerBar, initWorkoutTimerBar, startWorkoutTimer, stopWorkoutTimer, startRestTimer, clearRestTimer, buildRestTimerHTML, initRestTimerWidget, getElapsedMs } from '../components/timer.js';
import { renderMuscleMap } from '../components/muscle-map.js';
import { t } from '../i18n.js';

let activeRoutineId   = null;
let activeRoutineData = null;
let historialLoaded   = false;

// ══════════════════════════════════════════════
//  RENDER — Routines List + Historial Tabs
// ══════════════════════════════════════════════
export async function render(container) {
  historialLoaded = false;
  container.innerHTML = `
    <div class="page active" id="entreno-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">💪 ${t('entreno_title')}</h2>
            <p class="page-subtitle" id="entreno-subtitle">${t('entreno_subtitle')}</p>
          </div>
        </div>
        <!-- Tabs -->
        <div class="tabs" style="margin-bottom:var(--space-md)">
          <button class="tab-btn active" data-tab="rutinas">${t('entreno_tab_routines')}</button>
          <button class="tab-btn" data-tab="historial">${t('entreno_tab_history')}</button>
        </div>
        <!-- Routines tab -->
        <div id="tab-rutinas" class="tab-content">
          <div id="routines-container">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>
        <!-- History tab -->
        <div id="tab-historial" class="tab-content hidden">
          <div id="history-container">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  // If there's an active session, show it
  const session = getActiveSession();
  if (session?.routineId) {
    await loadActiveRoutine(container, session.routineId);
    return;
  }
  await loadRoutinesList(container);

  // Tab switching
  container.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'historial' && !historialLoaded) {
        historialLoaded = true;
        loadHistorialTab(container);
      }
    });
  });
}

// ── Load Routines List ─────────────────────────
async function loadRoutinesList(container) {
  const profile = getUserProfile();
  const listEl  = container.querySelector('#routines-container');

  try {
    const snap = await collections.assignments(profile.uid).orderBy('createdAt','desc').limit(20).get();

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">${t('entreno_no_routines')}</div>
          <div class="empty-subtitle">${t('entreno_no_routines_sub')}</div>
        </div>
      `;
      return;
    }

    const routines = await Promise.all(
      snap.docs.map(async d => {
        const data = d.data();
        const routineSnap = await db.collection('routines').doc(data.routineId).get();
        return { id: d.id, assignmentId: d.id, ...data, routine: routineSnap.data() };
      })
    );

    listEl.innerHTML = routines.map(a => {
      const r = a.routine || {};
      return `
        <div class="routine-card glass-card glass-shimmer" data-assignment-id="${a.assignmentId}" data-routine-id="${a.routineId || a.id}">
          <div class="routine-card-header">
            <div class="routine-card-icon"><img src="logotipo/jus%20W%20Logo/TGWL%20--07.png" alt="W" style="height:36px;width:36px;object-fit:contain"></div>
            <div>
              <div class="routine-card-title">${r.name || a.name || 'Rutina'}</div>
              <div class="text-muted" style="font-size:12px">${r.description || ''}</div>
            </div>
            <span class="badge badge-cyan">${r.exercises?.length || 0} ${t('entreno_exercises_count')}</span>
          </div>
          <div class="routine-card-meta">
            ${r.tags?.map(t => `<span class="chip">${t}</span>`).join('') || ''}
            <span class="chip">${a.assignedAt ? formatDate(a.assignedAt.toDate?.() || a.assignedAt) : t('today')}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.routine-card').forEach(card => {
      card.addEventListener('click', () => {
        const routineId = card.dataset.routineId;
        loadRoutineDetail(container, routineId);
      });
    });

  } catch (e) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
  }
}

// ── Load Routine Detail ────────────────────────
async function loadRoutineDetail(container, routineId) {
  activeRoutineId = routineId;
  const listEl = container.querySelector('#routines-container');
  listEl.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  try {
    const snap = await db.collection('routines').doc(routineId).get();
    if (!snap.exists) throw new Error(t('entreno_routine_not_found'));
    activeRoutineData = { id: snap.id, ...snap.data() };
    renderRoutineDetail(container, activeRoutineData);
  } catch (e) {
    toast(t('error_loading') + ': ' + e.message, 'error');
    loadRoutinesList(container);
  }
}

// ── Render Routine Detail ──────────────────────
function renderRoutineDetail(container, routine) {
  const exercises = routine.exercises || [];
  const session   = getActiveSession();
  const isActive  = session?.routineId === routine.id;

  container.querySelector('#entreno-page').innerHTML = `
    <div style="padding:var(--page-pad)">
      <div class="page-header">
        <button class="header-back" id="btn-back-routines">← ${t('entreno_tab_routines')}</button>
        <h2 class="page-title" style="font-size:20px">${routine.name}</h2>
      </div>

      ${routine.description ? `<p class="text-muted" style="margin-bottom:var(--space-md)">${routine.description}</p>` : ''}

      <!-- Workout Timer Bar -->
      ${isActive ? buildWorkoutTimerBar(routine.name) : ''}

      <!-- Action buttons -->
      ${!isActive ? `
        <button class="btn-primary btn-full" id="btn-start-routine" style="margin-bottom:var(--space-md)">
          ${t('entreno_start_btn')}
        </button>
      ` : ''}

      <!-- Exercise List -->
      <div class="exercise-list" id="exercise-list">
        ${exercises.map((ex, i) => buildExerciseCard(ex, i, isActive, session)).join('')}
      </div>

      ${exercises.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">${t('entreno_no_exercises')}</div>
          <div class="empty-subtitle">${t('entreno_no_exercises_sub')}</div>
        </div>
      ` : ''}
    </div>
  `;

  // Back button
  container.querySelector('#btn-back-routines')?.addEventListener('click', () => loadRoutinesList(container));

  // Start button
  container.querySelector('#btn-start-routine')?.addEventListener('click', () => startRoutine(container, routine));

  // Timer bar controls
  if (isActive) {
    initWorkoutTimerBar(container.querySelector('#workout-timer-bar'), {
      onPause:   () => {},
      onResume:  () => {},
      onFinish:  () => finishWorkout(container),
      onCancel:  () => cancelWorkout(container),
    });
    startWorkoutTimer('workout-timer');
    requestWakeLock();
  }

  // Exercise accordion + actions
  initExerciseList(container, exercises, isActive);
}

// ── Muscle Group Bars ─────────────────────────
function buildMuscleBars(ex) {
  const primary = ex.muscleGroup;
  const secondary = Array.isArray(ex.secondary) ? ex.secondary : [];
  if (!primary) return '';

  const totalSecondary = secondary.length;
  const primaryPct = totalSecondary === 0 ? 100 : totalSecondary === 1 ? 90 : 90;
  const secPct = totalSecondary === 0 ? [] : totalSecondary === 1 ? [10] : [5, 5];

  const bars = [
    { name: primary, pct: primaryPct, color: 'var(--color-primary)' },
    ...secondary.slice(0, 2).map((m, i) => ({ name: m, pct: secPct[i] || 5, color: 'var(--color-warning)' })),
  ];

  return `
    <div style="margin-bottom:var(--space-sm)">
      ${bars.map(b => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="font-size:11px;color:var(--color-text-muted);width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.name}</div>
          <div style="flex:1;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${b.pct}%;background:${b.color};border-radius:3px;transition:width 0.6s ease"></div>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);width:28px;text-align:right">${b.pct}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Exercise Card Builder ──────────────────────
function buildExerciseCard(ex, index, sessionActive, session) {
  const completedSets = session?.completedSets?.[ex.id] || [];
  const allDone = completedSets.length >= (ex.sets || 3);

  return `
    <div class="exercise-item ${allDone ? 'ex-all-done' : ''}" data-ex-id="${ex.id}" data-ex-index="${index}">
      <div class="exercise-header">
        <div class="exercise-num">${index + 1}</div>
        <div style="flex:1;min-width:0">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-sets">${ex.sets || 3} × ${ex.reps || '—'}${ex.weight ? ' · ' + ex.weight + 'kg' : ''}</div>
        </div>
        ${allDone ? '<span class="ex-done-check">✓</span>' : ''}
        <span class="exercise-chevron">▼</span>
      </div>

      <div class="exercise-body">

        <!-- Muscle activation bars -->
        ${buildMuscleBars(ex)}

        <!-- Action row -->
        <div class="ex-action-row">
          <button class="video-btn" data-action="info" data-exid="${ex.id}" data-exname="${(ex.name||ex.id).replace(/"/g,'&quot;')}" data-exindex="${index}" title="Ver técnica">
            ℹ️ ${t('entreno_watch_exercise')}
          </button>
          <button class="ex-icon-btn" data-action="swap" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_swap_exercise')}">🔄</button>
          <button class="ex-icon-btn" data-action="notes" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_notes')}">📝</button>
          <button class="ex-icon-btn" data-action="history" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_history')}">🕐</button>
        </div>

        <!-- Rest config -->
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0 4px;opacity:.7">
          <span style="font-size:11px;color:var(--color-text-muted)">⏱ Descanso:</span>
          <input type="number" class="rest-secs-input" data-exid="${ex.id}"
                 value="${ex.restSeconds || 60}" min="10" max="600" step="5"
                 style="width:52px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--color-text);font-size:11px;text-align:center;padding:2px">
          <span style="font-size:11px;color:var(--color-text-muted)">seg</span>
        </div>

        <!-- Sets Table -->
        ${buildSetsTable(ex, index, session)}

        <!-- Rest Timer -->
        <div id="rest-widget-${ex.id}" class="hidden"></div>
      </div>
    </div>
  `;
}

// ── Sets Table ────────────────────────────────
function buildSetsTable(ex, exIndex, session) {
  const numSets       = ex.sets || 3;
  const completedSets = session?.completedSets?.[ex.id] || [];
  const setDataStore  = session?.setData?.[ex.id]?.sets || [];
  // dropsets stored as { [setIdx]: [{reps,weight},...] }
  const dropData      = session?.setData?.[ex.id]?.drops || {};

  const rows = Array.from({ length: numSets }, (_, i) => {
    const done          = completedSets.includes(i);
    const prevSet       = ex.previousSets?.[i] || {};
    const repArr        = ex.reps ? String(ex.reps).split('-').map(r => r.trim()).filter(Boolean) : [];
    const defaultRep    = repArr[i] ?? repArr[0] ?? '';
    const currentReps   = setDataStore[i]?.reps   ?? defaultRep;
    const currentWeight = setDataStore[i]?.weight ?? ex.weight ?? '';
    const prevLabel     = (prevSet.reps && prevSet.weight)
      ? `${prevSet.reps}r × ${prevSet.weight}kg`
      : '—';

    // Build any existing dropset rows for this set
    const drops = Array.isArray(dropData[i]) ? dropData[i] : [];
    const dropRows = drops.map((drop, di) => `
      <tr class="dropset-row" data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}">
        <td colspan="2">
          <span class="dropset-label">${t('entreno_dropset_label')}</span>
        </td>
        <td>
          <input type="number" class="set-input drop-input"
                 data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}" data-field="reps"
                 value="${drop.reps ?? ''}" placeholder="—" min="0" max="999">
        </td>
        <td>
          <input type="number" class="set-input drop-input"
                 data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}" data-field="weight"
                 value="${drop.weight ?? ''}" placeholder="0" min="0" max="999" step="0.5">
        </td>
        <td>
          <button class="btn-remove-drop" data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}"
                  title="${t('entreno_remove_drop')}">✕</button>
        </td>
      </tr>
    `).join('');

    return `
      <tr class="set-row ${done ? 'completed locked' : ''}" data-exid="${ex.id}" data-setidx="${i}">
        <td class="set-num">${i + 1}</td>
        <td class="set-prev">${prevLabel}</td>
        <td>
          <input type="number" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="reps"
                 value="${currentReps}" placeholder="${defaultRep || '—'}" min="0" max="999" ${done ? 'disabled' : ''}>
        </td>
        <td>
          <input type="number" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="weight"
                 value="${currentWeight}" placeholder="${ex.weight || '0'}" min="0" max="999" step="0.5" ${done ? 'disabled' : ''}>
        </td>
        <td>
          <div class="set-actions-cell">
            <button class="set-done-btn ${done ? 'done' : ''}"
                    data-exid="${ex.id}" data-setidx="${i}" data-done="${done}">
              ${done ? '✓' : '○'}
            </button>
            ${!done ? `<button class="btn-add-drop" data-exid="${ex.id}" data-setidx="${i}"
                    title="${t('entreno_add_drop')}">${t('entreno_add_drop')}</button>` : ''}
          </div>
        </td>
      </tr>
      ${dropRows}
    `;
  }).join('');

  return `
    <table class="sets-table">
      <thead>
        <tr>
          <th>${t('entreno_set')}</th>
          <th>${t('entreno_prev')}</th>
          <th>${t('entreno_reps')}</th>
          <th>Kg</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="sets-body-${ex.id}">${rows}</tbody>
    </table>
  `;
}

// ── Init Exercise List Events ─────────────────
function initExerciseList(container, exercises, sessionActive) {
  // Accordion toggle
  container.querySelectorAll('.exercise-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.exercise-item');
      item.classList.toggle('open');
    });
  });

  // Set done buttons
  container.querySelectorAll('.set-done-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!sessionActive) {
        toast(t('entreno_start_first'), 'info');
        return;
      }
      const exId   = btn.dataset.exid;
      const setIdx = parseInt(btn.dataset.setidx);
      const isDone = btn.dataset.done === 'true';

      if (isDone) {
        unmarkSetDone(exId, setIdx);
        btn.classList.remove('done');
        btn.textContent = '○';
        btn.dataset.done = 'false';
        const row = btn.closest('.set-row');
        row?.classList.remove('completed', 'locked');
        row?.querySelectorAll('.set-input').forEach(inp => inp.disabled = false);
        // Re-show drop button
        const actCell = row?.querySelector('.set-actions-cell');
        if (actCell && !actCell.querySelector('.btn-add-drop')) {
          const dropBtn = document.createElement('button');
          dropBtn.className = 'btn-add-drop';
          dropBtn.dataset.exid = exId;
          dropBtn.dataset.setidx = String(setIdx);
          dropBtn.title = t('entreno_add_drop');
          dropBtn.textContent = t('entreno_add_drop');
          dropBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!sessionActive) { toast(t('entreno_start_first'), 'info'); return; }
            _addDropRow(container, exId, setIdx);
          });
          actCell.appendChild(dropBtn);
        }
      } else {
        // Read actual reps/weight from inputs (only non-drop inputs on this row)
        const row         = btn.closest('.set-row');
        const repsInput   = row?.querySelector(`.set-input[data-field="reps"]:not(.drop-input)`);
        const weightInput = row?.querySelector(`.set-input[data-field="weight"]:not(.drop-input)`);
        if (repsInput?.value)   updateSetData(exId, setIdx, 'reps', repsInput.value);
        if (weightInput?.value) updateSetData(exId, setIdx, 'weight', weightInput.value);

        markSetDone(exId, setIdx);
        btn.classList.add('done');
        btn.textContent = '✓';
        btn.dataset.done = 'true';
        row?.classList.add('completed', 'locked');
        // Lock inputs
        row?.querySelectorAll('.set-input').forEach(inp => inp.disabled = true);
        // Remove drop button
        row?.querySelector('.btn-add-drop')?.remove();

        // Start rest timer
        const exercise = exercises.find(ex => ex.id === exId);
        const restSecs = exercise?.restSeconds || 60;
        showRestTimer(container, exId, restSecs);
      }
    });
  });

  // Set input changes (normal sets)
  container.querySelectorAll('.set-input:not(.drop-input)').forEach(input => {
    input.addEventListener('change', () => {
      if (!sessionActive) return;
      updateSetData(input.dataset.exid, parseInt(input.dataset.setidx), input.dataset.field, input.value);
    });
  });

  // Dropset input changes
  container.querySelectorAll('.drop-input').forEach(input => {
    input.addEventListener('change', () => {
      if (!sessionActive) return;
      _updateDropData(input.dataset.exid, parseInt(input.dataset.setidx), parseInt(input.dataset.dropidx), input.dataset.field, input.value);
    });
  });

  // Add dropset button
  container.querySelectorAll('.btn-add-drop').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!sessionActive) { toast(t('entreno_start_first'), 'info'); return; }
      const exId   = btn.dataset.exid;
      const setIdx = parseInt(btn.dataset.setidx);
      _addDropRow(container, exId, setIdx);
    });
  });

  // Remove dropset button
  container.querySelectorAll('.btn-remove-drop').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const exId    = btn.dataset.exid;
      const setIdx  = parseInt(btn.dataset.setidx);
      const dropIdx = parseInt(btn.dataset.dropidx);
      btn.closest('.dropset-row')?.remove();
      _removeDropData(exId, setIdx, dropIdx);
      // Re-index remaining drop rows
      _reindexDropRows(container, exId, setIdx);
    });
  });

  // Action buttons
  container.querySelectorAll('[data-action="swap"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSwapExercise(exercises[parseInt(btn.dataset.exindex)], parseInt(btn.dataset.exindex), container, exercises);
    });
  });

  container.querySelectorAll('[data-action="notes"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openExerciseNotes(btn.dataset.exid);
    });
  });

  container.querySelectorAll('[data-action="history"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openExerciseHistory(exercises[parseInt(btn.dataset.exindex)]);
    });
  });

  container.querySelectorAll('[data-action="info"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openExerciseInfoModal(btn.dataset.exname || btn.dataset.exid);
    });
  });

  // Rest seconds config
  container.querySelectorAll('.rest-secs-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const ex = exercises.find(e => e.id === inp.dataset.exid);
      if (ex) ex.restSeconds = Math.max(10, parseInt(inp.value) || 60);
    });
  });
}

// ── Dropset DOM helpers ───────────────────────
function _addDropRow(container, exId, setIdx) {
  const tbody  = container.querySelector(`#sets-body-${exId}`);
  if (!tbody) return;

  // Count existing drop rows for this set to get new index
  const existing = tbody.querySelectorAll(`.dropset-row[data-setidx="${setIdx}"]`);
  const dropIdx  = existing.length;

  const tr = document.createElement('tr');
  tr.className = 'dropset-row';
  tr.dataset.exid    = exId;
  tr.dataset.setidx  = String(setIdx);
  tr.dataset.dropidx = String(dropIdx);
  tr.innerHTML = `
    <td colspan="2">
      <span class="dropset-label">${t('entreno_dropset_label')}</span>
    </td>
    <td>
      <input type="number" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="reps"
             value="" placeholder="—" min="0" max="999">
    </td>
    <td>
      <input type="number" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="weight"
             value="" placeholder="0" min="0" max="999" step="0.5">
    </td>
    <td>
      <button class="btn-remove-drop" data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}"
              title="${t('entreno_remove_drop')}">✕</button>
    </td>
  `;

  // Insert after the last drop row (or after the set row itself)
  const lastDrop = tbody.querySelector(`.dropset-row[data-setidx="${setIdx}"]:last-of-type`);
  const setRow   = tbody.querySelector(`.set-row[data-setidx="${setIdx}"]`);
  const anchor   = lastDrop || setRow;
  if (anchor?.nextSibling) {
    tbody.insertBefore(tr, anchor.nextSibling);
  } else {
    tbody.appendChild(tr);
  }

  // Bind events on new row
  tr.querySelector('.drop-input')?.addEventListener('change', (e) => {
    const inp = e.target;
    _updateDropData(inp.dataset.exid, parseInt(inp.dataset.setidx), parseInt(inp.dataset.dropidx), inp.dataset.field, inp.value);
  });
  tr.querySelectorAll('.drop-input').forEach(inp => {
    inp.addEventListener('change', (e) => {
      _updateDropData(e.target.dataset.exid, parseInt(e.target.dataset.setidx), parseInt(e.target.dataset.dropidx), e.target.dataset.field, e.target.value);
    });
  });
  tr.querySelector('.btn-remove-drop')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.closest('.dropset-row')?.remove();
    _removeDropData(btn.dataset.exid, parseInt(btn.dataset.setidx), parseInt(btn.dataset.dropidx));
    _reindexDropRows(container, btn.dataset.exid, parseInt(btn.dataset.setidx));
  });
}

function _updateDropData(exId, setIdx, dropIdx, field, value) {
  const session = getActiveSession();
  if (!session) return;
  if (!session.setData) session.setData = {};
  if (!session.setData[exId]) session.setData[exId] = { sets: [], drops: {} };
  if (!session.setData[exId].drops) session.setData[exId].drops = {};
  if (!Array.isArray(session.setData[exId].drops[setIdx])) session.setData[exId].drops[setIdx] = [];
  while (session.setData[exId].drops[setIdx].length <= dropIdx) {
    session.setData[exId].drops[setIdx].push({});
  }
  session.setData[exId].drops[setIdx][dropIdx][field] = value;
}

function _removeDropData(exId, setIdx, dropIdx) {
  const session = getActiveSession();
  if (!session?.setData?.[exId]?.drops?.[setIdx]) return;
  session.setData[exId].drops[setIdx].splice(dropIdx, 1);
}

function _reindexDropRows(container, exId, setIdx) {
  const tbody = container.querySelector(`#sets-body-${exId}`);
  if (!tbody) return;
  tbody.querySelectorAll(`.dropset-row[data-setidx="${setIdx}"]`).forEach((row, i) => {
    row.dataset.dropidx = String(i);
    row.querySelectorAll('[data-dropidx]').forEach(el => { el.dataset.dropidx = String(i); });
  });
}

// ── Rest Timer Widget ─────────────────────────
function showRestTimer(container, exId, seconds) {
  const widget = container.querySelector(`#rest-widget-${exId}`);
  if (!widget) return;

  // Read live value from the config input if available
  const liveInput = container.querySelector(`.rest-secs-input[data-exid="${exId}"]`);
  const secs = liveInput ? (Math.max(10, parseInt(liveInput.value) || seconds)) : seconds;

  widget.innerHTML = buildRestTimerHTML(secs);
  widget.classList.remove('hidden');

  // Scroll widget into view
  widget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  initRestTimerWidget(widget, () => {
    widget.classList.add('hidden');
    clearRestTimer();
  });

  startRestTimer(secs, () => {
    widget.classList.add('hidden');
    toast('¡Descanso terminado! 💪 Siguiente serie', 'success');
    // System notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('¡Descanso terminado!', {
        body: 'Es hora de la siguiente serie 💪',
        icon: '/logotipo/jus W Logo/TGWL --07.png',
        silent: false,
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('¡Descanso terminado!', { body: 'Es hora de la siguiente serie 💪' });
      });
    }
  }, `#rest-widget-${exId} .timer-ring`);
}

// ── Exercise Info Modal ───────────────────────
async function openExerciseInfoModal(exName) {
  const { EXERCISES } = await import('../../data/data.js');
  const exData = EXERCISES.find(e => e.n === exName);
  if (!exData || (!exData.localVideo && !exData.localImg?.length)) {
    toast('Sin contenido multimedia para este ejercicio', 'info');
    return;
  }

  const imgs = exData.localImg || [];
  const vid  = exData.localVideo;
  const steps = exData.instructions || [];

  const html = `
    <div class="modal-header">
      <h3 class="modal-title" style="font-size:14px">${exName}</h3>
      <button class="modal-close">✕</button>
    </div>

    ${imgs.length ? `
    <div style="position:relative;margin-bottom:12px">
      <div style="overflow:hidden;border-radius:var(--radius-md)">
        ${imgs.map((src, i) => `<img src="${encodeURI(src)}" alt="Posición ${i+1}" class="ex-info-img" data-imgidx="${i}" style="width:100%;display:${i===0?'block':'none'};max-height:260px;object-fit:cover;border-radius:var(--radius-md)">`).join('')}
      </div>
      ${imgs.length > 1 ? `
      <div style="display:flex;justify-content:center;gap:10px;margin-top:8px">
        ${imgs.map((_, i) => `<button class="ex-img-dot" data-imgidx="${i}" style="width:10px;height:10px;border-radius:50%;border:none;cursor:pointer;padding:0;background:${i===0?'var(--cyan)':'rgba(255,255,255,.3)'}"></button>`).join('')}
      </div>
      <div style="display:flex;justify-content:center;gap:4px;margin-top:6px">
        ${imgs.map((_, i) => `<span style="font-size:11px;color:var(--color-text-muted)">Posición ${i+1}${i===0?' · Inicio':' · Final'}</span>${i<imgs.length-1?'<span style="font-size:11px;color:var(--color-text-muted);margin:0 4px">|</span>':''}`).join('')}
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${vid ? `
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px;letter-spacing:.5px">🎬 Vídeo técnica</div>
      <video controls playsinline style="width:100%;border-radius:var(--radius-md);background:#000;max-height:220px;display:block">
        <source src="${encodeURI(vid)}" type="video/mp4">
      </video>
    </div>
    ` : ''}

    ${steps.length ? `
    <button id="ex-info-steps-btn" style="width:100%;padding:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:var(--radius-sm);color:#ef4444;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">
      📋 Ver pasos de ejecución
    </button>
    <div id="ex-info-steps" style="display:none;margin-top:8px">
      ${steps.map((s, i) => `
        <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="min-width:22px;height:22px;border-radius:50%;background:var(--cyan);color:#000;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</div>
          <div style="font-size:13px;color:var(--color-text);line-height:1.5">${s}</div>
        </div>`).join('')}
    </div>
    ` : ''}
  `;

  openModal(html);
  const m = document.getElementById('modal-content');

  // Image carousel dots
  m.querySelectorAll('.ex-img-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.imgidx);
      m.querySelectorAll('.ex-info-img').forEach((img, i) => { img.style.display = i === idx ? 'block' : 'none'; });
      m.querySelectorAll('.ex-img-dot').forEach((d, i) => { d.style.background = i === idx ? 'var(--cyan)' : 'rgba(255,255,255,.3)'; });
    });
  });

  // Steps toggle
  m.querySelector('#ex-info-steps-btn')?.addEventListener('click', () => {
    const el  = m.querySelector('#ex-info-steps');
    const btn = m.querySelector('#ex-info-steps-btn');
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    btn.innerHTML = open ? '📋 Ocultar pasos' : '📋 Ver pasos de ejecución';
  });
}

// ── Exercise Swap ─────────────────────────────
async function openSwapExercise(currentEx, exIndex, container, allExercises) {
  const { EXERCISES } = await import('../../data/data.js');
  // Match by muscleGroup (Firestore field) vs ex.m (data.js field)
  const muscle = currentEx.muscleGroup || currentEx.m || '';
  const pool = EXERCISES.filter(ex => ex.m === muscle && ex.n !== (currentEx.name || currentEx.id));

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🔄 ${t('entreno_swap_exercise')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:8px;font-size:13px">${t('entreno_alternatives_for')} <strong>${currentEx.name}</strong></p>

    <input type="text" id="swap-search" class="input-solo" placeholder="🔍 Buscar ejercicio..." style="margin-bottom:8px;font-size:13px" autocomplete="off">

    <div id="swap-list" style="max-height:260px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:var(--radius-sm);margin-bottom:12px"></div>

    <div style="margin-top:4px">
      <label class="field-label">${t('entreno_swap_reason')} *</label>
      <textarea id="swap-reason" class="input-solo" placeholder="${t('entreno_swap_reason_placeholder')}" rows="2"
                style="padding:var(--space-md);margin-top:var(--space-xs)"></textarea>
    </div>
    <button class="btn-primary btn-full" style="margin-top:var(--space-md)" id="btn-confirm-swap" disabled>
      ${t('entreno_confirm_swap')}
    </button>
  `;

  openModal(html);
  const modalEl = document.getElementById('modal-content');
  let selectedEx = null;

  function renderSwapList(items) {
    const listEl = modalEl.querySelector('#swap-list');
    if (!items.length) {
      listEl.innerHTML = `<div style="padding:14px;text-align:center;color:var(--color-text-muted);font-size:13px">Sin resultados</div>`;
      return;
    }
    listEl.innerHTML = items.map(ex => `
      <div class="swap-option" data-ex-n="${ex.n.replace(/"/g,'&quot;')}"
           style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#e2e8f0">${ex.n}</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${ex.m}${ex.t==='c'?' · Compuesto':ex.t==='i'?' · Aislado':''}</div>
        </div>
        <span style="font-size:18px">${ex.t==='c'?'🏋️':'💪'}</span>
      </div>`).join('');

    listEl.querySelectorAll('.swap-option').forEach(opt => {
      opt.addEventListener('mouseenter', () => { if(opt.dataset.exN !== selectedEx?.n) opt.style.background='rgba(255,255,255,.05)'; });
      opt.addEventListener('mouseleave', () => { if(opt.dataset.exN !== selectedEx?.n) opt.style.background=''; });
      opt.addEventListener('click', () => {
        listEl.querySelectorAll('.swap-option').forEach(o => o.style.background='');
        opt.style.background = 'rgba(148,10,10,0.2)';
        selectedEx = pool.find(e => e.n === opt.dataset.exN);
        modalEl.querySelector('#btn-confirm-swap').disabled = !modalEl.querySelector('#swap-reason').value.trim();
      });
    });
  }

  renderSwapList(pool);

  modalEl.querySelector('#swap-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderSwapList(q ? pool.filter(ex => ex.n.toLowerCase().includes(q)) : pool);
  });

  modalEl.querySelector('#swap-reason').addEventListener('input', (e) => {
    modalEl.querySelector('#btn-confirm-swap').disabled = !selectedEx || !e.target.value.trim();
  });

  modalEl.querySelector('#btn-confirm-swap').addEventListener('click', async () => {
    const reason = modalEl.querySelector('#swap-reason').value.trim();
    if (!reason) { toast(t('entreno_swap_reason_required'), 'warning'); return; }
    closeModal();
    toast(t('entreno_swapped_to').replace('{name}', selectedEx.n), 'success');
    const profile = getUserProfile();
    if (profile?.uid) {
      await collections.notes(profile.uid).add({
        type: 'swap', exerciseId: currentEx.id, exerciseName: currentEx.name,
        swappedTo: selectedEx.n, reason, date: timestamp(),
      }).catch(() => {});
    }
  });
}

// ── Exercise Notes ────────────────────────────
async function openExerciseNotes(exId) {
  const profile = getUserProfile();
  const note = await promptModal(`📝 ${t('entreno_incident_note')}`, t('entreno_incident_placeholder'));
  if (note && profile?.uid) {
    await collections.notes(profile.uid).add({
      type: 'incidence',
      exerciseId: exId,
      note,
      date: timestamp(),
    });
    toast(t('note_saved'), 'success');
  }
}

// ── Exercise History ──────────────────────────
async function openExerciseHistory(exercise) {
  const profile = getUserProfile();
  let historyHTML = '<div class="overlay-spinner"><div class="spinner-sm"></div></div>';

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🕐 ${t('entreno_history')}: ${exercise.name}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div id="history-content">${historyHTML}</div>
  `;
  openModal(html);

  if (!profile?.uid) return;
  try {
    const notesSnap = await collections.notes(profile.uid)
      .where('exerciseId', '==', exercise.id)
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    const sessSnap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();

    const modal = document.getElementById('modal-content');
    const histEl = modal.querySelector('#history-content');

    let html2 = '';
    sessSnap.docs.forEach(doc => {
      const s = doc.data();
      const exData = s.setData?.[exercise.id];
      if (!exData?.sets?.length) return;
      const date = formatDate(s.startTime?.toDate?.() || new Date(s.startTime));
      html2 += `
        <div style="margin-bottom:var(--space-sm)">
          <div style="font-weight:700;margin-bottom:4px">${date}</div>
          ${exData.sets.map((set, i) =>
            `<span style="font-size:12px;color:var(--color-text-muted);margin-right:12px">
              Set ${i+1}: ${set.reps || '?'} reps × ${set.weight || '?'}kg
            </span>`
          ).join('')}
        </div>
      `;
    });

    if (notesSnap.docs.length) {
      html2 += `<div class="divider"></div><div class="section-title">${t('entreno_incidents')}</div>`;
      notesSnap.docs.forEach(doc => {
        const n = doc.data();
        const date = formatDate(n.date?.toDate?.() || new Date(n.date));
        html2 += `<div class="history-note"><span class="history-note-date">${date}</span><span class="history-note-text">${n.note}</span></div>`;
      });
    }

    if (histEl) histEl.innerHTML = html2 || `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">${t('entreno_no_history')}</div></div>`;
  } catch (e) {
    const histEl = document.getElementById('modal-content')?.querySelector('#history-content');
    if (histEl) histEl.innerHTML = `<p class="text-muted">${t('entreno_history_error')}</p>`;
  }
}

// ══════════════════════════════════════════════
//  HISTORIAL TAB
// ══════════════════════════════════════════════

// ── Load Historial Tab ────────────────────────
async function loadHistorialTab(container) {
  const profile  = getUserProfile();
  const histEl   = container.querySelector('#history-container');

  if (!profile?.uid) {
    histEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">${t('not_authenticated')}</div></div>`;
    return;
  }

  try {
    const snap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc')
      .limit(30)
      .get();

    if (snap.empty) {
      histEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-title">${t('entreno_no_sessions')}</div>
          <div class="empty-subtitle">${t('entreno_no_sessions_sub')}</div>
        </div>
      `;
      return;
    }

    histEl.innerHTML = snap.docs.map(doc => {
      const session   = doc.data();
      const date      = session.startTime?.toDate?.() || new Date(session.startTime);
      const totalSets = Object.values(session.completedSets || {})
        .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
      const exerciseCount = Object.keys(session.setData || {})
        .filter(exId => (session.setData[exId]?.sets?.length || 0) > 0).length;

      return `
        <div class="session-history-card glass-card" data-session-id="${doc.id}" style="margin-bottom:var(--space-sm);cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700;font-size:15px">${session.routineName || 'Entreno'}</div>
              <div style="font-size:12px;color:var(--color-text-muted)">${formatDate(date)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:600">${formatTime(session.durationMs || 0)}</div>
              ${session.rpe ? `<div style="font-size:11px;color:var(--color-text-muted)">RPE ${session.rpe}/10</div>` : ''}
            </div>
          </div>
          <div style="margin-top:var(--space-xs);display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip">${totalSets} ${t('entreno_sets_count')}</span>
            <span class="chip">${exerciseCount} ${t('entreno_exercises_label')}</span>
          </div>
          ${session.note ? `<p style="font-size:12px;color:var(--color-text-muted);margin-top:var(--space-xs);font-style:italic">"${session.note}"</p>` : ''}
        </div>
      `;
    }).join('');

    // Attach click handlers — store session data on element for sheet
    snap.docs.forEach(doc => {
      const card = histEl.querySelector(`[data-session-id="${doc.id}"]`);
      if (card) {
        card.addEventListener('click', () => openSessionDetail(doc.id, doc.data()));
      }
    });

  } catch (e) {
    histEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
  }
}

// ── Open Session Detail Sheet ─────────────────
async function openSessionDetail(sessionId, session) {
  const profile     = getUserProfile();
  const role        = profile?.role || 'cliente';
  const isCoach     = role === 'coach' || role === 'admin';
  const date        = session.startTime?.toDate?.() || new Date(session.startTime);
  const totalSets   = Object.values(session.completedSets || {})
    .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

  // Build initial sheet with loading state for exercises
  const toggleHtml = !isCoach ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-sm)">
      <label style="font-size:13px;color:var(--color-text-muted)">${t('entreno_show_muscle_map')}</label>
      <label class="toggle-switch">
        <input type="checkbox" id="toggle-session-map" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
  ` : '';

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${session.routineName || 'Entreno'}</h3>
      <button class="modal-close">✕</button>
    </div>

    ${toggleHtml}

    <div class="summary-stat-grid" style="margin-bottom:var(--space-md)">
      <div class="summary-stat">
        <span class="summary-stat-val">${formatTime(session.durationMs || 0)}</span>
        <span class="summary-stat-key">${t('entreno_duration')}</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-val">${totalSets}</span>
        <span class="summary-stat-key">${t('entreno_sets_count')}</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-val">${session.rpe ? session.rpe + '/10' : '—'}</span>
        <span class="summary-stat-key">RPE</span>
      </div>
    </div>

    ${session.note ? `<div class="glass-card" style="margin-bottom:var(--space-md);font-style:italic;font-size:13px">"${session.note}"</div>` : ''}

    <div class="section-title">${t('entreno_sets_performed')}</div>
    <div id="session-exercises-detail">
      <div class="overlay-spinner"><div class="spinner-sm"></div></div>
    </div>

    <div class="section-title" style="margin-top:var(--space-md)" id="muscle-map-title">${t('entreno_muscles_worked')}</div>
    <div id="session-muscle-map"></div>
  `;

  openSheet(html);

  // Fetch routine exercises for names
  let exercises = [];
  if (session.routineId) {
    try {
      const routineSnap = await db.collection('routines').doc(session.routineId).get();
      exercises = routineSnap.exists ? (routineSnap.data().exercises || []) : [];
    } catch { /* silently fall back to empty array */ }
  }

  // Build exercise name lookup
  const exNameMap = {};
  exercises.forEach(ex => { exNameMap[ex.id] = ex.name || ex.id; });

  // Render per-exercise breakdown
  const sheetContent = document.getElementById('sheet-content') || document.querySelector('.sheet-body');
  const detailEl = sheetContent
    ? sheetContent.querySelector('#session-exercises-detail')
    : document.querySelector('#session-exercises-detail');

  if (detailEl) {
    const setData = session.setData || {};
    const exIds   = Object.keys(setData).filter(id => setData[id]?.sets?.length > 0);

    if (exIds.length === 0) {
      detailEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">${t('entreno_no_set_data')}</p>`;
    } else {
      detailEl.innerHTML = exIds.map(exId => {
        const sets = setData[exId].sets || [];
        const name = exNameMap[exId] || exId;
        const rows = sets.map((set, i) => `
          <tr>
            <td style="color:var(--color-text-muted);font-weight:700">${i + 1}</td>
            <td>${set.reps || '—'}</td>
            <td>${set.weight || '—'}</td>
          </tr>
        `).join('');

        return `
          <div class="glass-card" style="margin-bottom:var(--space-sm)">
            <div style="font-weight:600;margin-bottom:var(--space-xs)">${name}</div>
            <table class="sets-table" style="width:100%">
              <thead>
                <tr><th>${t('entreno_set')}</th><th>${t('entreno_reps')}</th><th>Kg</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }).join('');
    }
  }

  // Render muscle map
  const performedExIds = Object.keys(session.setData || {})
    .filter(id => (session.setData[id]?.sets?.length || 0) > 0);
  const performedExercises = exercises.filter(ex => performedExIds.includes(ex.id));

  const mapEl = sheetContent
    ? sheetContent.querySelector('#session-muscle-map')
    : document.querySelector('#session-muscle-map');

  const mapTitleEl = sheetContent
    ? sheetContent.querySelector('#muscle-map-title')
    : document.querySelector('#muscle-map-title');

  const renderMap = () => {
    if (mapEl && performedExercises.length > 0) {
      renderMuscleMap(mapEl, performedExercises);
    } else if (mapEl) {
      mapEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">${t('entreno_no_muscle_data')}</p>`;
    }
  };

  if (isCoach) {
    renderMap();
  } else {
    // Toggle behaviour for non-coach roles
    renderMap();

    const toggleInput = sheetContent
      ? sheetContent.querySelector('#toggle-session-map')
      : document.querySelector('#toggle-session-map');

    if (toggleInput && mapEl && mapTitleEl) {
      toggleInput.addEventListener('change', () => {
        const show = toggleInput.checked;
        mapEl.style.display        = show ? '' : 'none';
        mapTitleEl.style.display   = show ? '' : 'none';
      });
    }
  }
}

// ══════════════════════════════════════════════
//  START WORKOUT
// ══════════════════════════════════════════════
async function startRoutine(container, routine) {
  const ok = await confirm(
    t('entreno_start_btn'),
    t('entreno_start_confirm').replace('{name}', routine.name),
    { okText: t('entreno_start_ok'), cancelText: t('cancel') }
  );
  if (!ok) return;

  startWorkoutSession(routine.id, routine.name, routine.exercises || []);
  toast(t('entreno_started').replace('{name}', routine.name), 'success');
  renderRoutineDetail(container, routine);
}

// ══════════════════════════════════════════════
//  FINISH WORKOUT
// ══════════════════════════════════════════════
async function finishWorkout(container) {
  stopWorkoutTimer();
  clearRestTimer();
  releaseWakeLock();

  const session     = getActiveSession();
  const durationMs  = getElapsedMs();

  // 1. General note
  const note = await promptModal(`📝 ${t('entreno_general_note')}`, t('entreno_general_note_placeholder'));

  // 2. RPE
  const rpe = await openRPESheet(null);

  // 3. Save session
  const profile = getUserProfile();
  try {
    await collections.workoutSessions(profile.uid).add({
      routineId:    session.routineId,
      routineName:  session.routineName,
      startTime:    new firebase.firestore.Timestamp(Math.floor(session.startTime / 1000), 0),
      durationMs,
      completedSets: session.completedSets,
      setData:       session.setData,
      note:          note || '',
      rpe:           rpe || null,
      createdAt:     timestamp(),
    });
    toast(t('entreno_saved'), 'success');
  } catch (e) {
    toast(t('error_saving') + ': ' + e.message, 'error');
  }

  // 4. Muscle map & celebration
  launchConfetti();
  showWorkoutSummary(container, durationMs, session, rpe, note);
  endSession();
}

// ── Workout Summary ───────────────────────────
function showWorkoutSummary(container, durationMs, session, rpe, note) {
  const exercises = session.exercises || [];
  const totalSets = Object.values(session.completedSets || {}).reduce((a, b) => a + b.length, 0);

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🎉 ${t('entreno_completed')}</h3>
    </div>
    <div class="summary-stat-grid">
      <div class="summary-stat"><span class="summary-stat-val">${formatTime(durationMs)}</span><span class="summary-stat-key">${t('entreno_duration')}</span></div>
      <div class="summary-stat"><span class="summary-stat-val">${totalSets}</span><span class="summary-stat-key">${t('entreno_sets_count')}</span></div>
      <div class="summary-stat"><span class="summary-stat-val">${rpe ? rpe + '/10' : '—'}</span><span class="summary-stat-key">RPE</span></div>
    </div>
    ${note ? `<p class="text-muted" style="margin-bottom:var(--space-md);font-style:italic">"${note}"</p>` : ''}
    <div id="finish-muscle-map"></div>
    <button class="btn-primary btn-full" id="btn-close-summary" style="margin-top:var(--space-md)">${t('close')}</button>
  `;

  openModal(html, { noClickClose: true });
  const settings = appState.get('settings');
  if (settings.showMuscleMap) {
    const mapContainer = document.getElementById('modal-content').querySelector('#finish-muscle-map');
    if (mapContainer) renderMuscleMap(mapContainer, exercises);
  }

  document.getElementById('btn-close-summary')?.addEventListener('click', () => {
    closeModal();
    import('../router.js').then(({ navigate }) => navigate('home'));
  });
}

// ── Cancel Workout ────────────────────────────
async function cancelWorkout(container) {
  const ok = await confirm(
    t('entreno_cancel_title'),
    t('entreno_cancel_confirm'),
    { okText: t('entreno_cancel_ok'), danger: true }
  );
  if (!ok) return;
  stopWorkoutTimer();
  clearRestTimer();
  releaseWakeLock();
  endSession();
  toast(t('entreno_cancelled'), 'info');
  import('../router.js').then(({ navigate }) => navigate('home'));
}

// ── Resume active session ─────────────────────
async function loadActiveRoutine(container, routineId) {
  try {
    const snap = await db.collection('routines').doc(routineId).get();
    if (snap.exists) {
      activeRoutineData = { id: snap.id, ...snap.data() };
      renderRoutineDetail(container, activeRoutineData);
    }
  } catch { loadRoutinesList(container); }
}
