/* ═══════════════════════════════════════════════
   TGWL — modules/entreno.js
   Workout Module — Full Training Session Flow
═══════════════════════════════════════════════ */

import { getUserProfile, getActiveSession, startWorkoutSession, endSession, markSetDone, unmarkSetDone, updateSetData, appState } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, formatTime, formatDate, pad, launchConfetti, requestWakeLock, releaseWakeLock } from '../utils.js';
import { openModal, closeModal, openSheet, closeSheet, confirm, alert, openRPESheet, promptModal } from '../components/modal.js';
import { buildWorkoutTimerBar, initWorkoutTimerBar, startWorkoutTimer, stopWorkoutTimer, clearRestTimer, getElapsedMs } from '../components/timer.js';
import { renderMuscleMap } from '../components/muscle-map.js';
import { t } from '../i18n.js';

let activeRoutineId       = null;
let activeRoutineData     = null;
let activeAssignmentId    = null;
let historialLoaded   = false;
let _exDataCache      = null;

// ══════════════════════════════════════════════
//  RENDER — Routines List + Historial Tabs
// ══════════════════════════════════════════════
export async function render(container) {
  historialLoaded = false;
  container.innerHTML = `
    <div class="page active" id="entreno-page">
      <div style="padding:var(--page-pad)">
        <!-- Tabs -->
        <div class="tab-bar-underline" id="entreno-tab-bar" style="margin-bottom:var(--space-md)">
          <button class="tab-btn-underline active" data-tab="rutinas">${t('entreno_tab_routines')}</button>
          <button class="tab-btn-underline" data-tab="historial">${t('entreno_tab_history')}</button>
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

  // Tab switching — underline style
  function updateTabIndicator(activeBtn) {
    const bar = document.getElementById('entreno-tab-bar');
    if (!bar || !activeBtn) return;
    requestAnimationFrame(() => {
      const btnRect = activeBtn.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      const offset = btnRect.left - barRect.left;
      bar.style.setProperty('--indicator-width', btnRect.width + 'px');
      bar.style.setProperty('--indicator-offset', offset + 'px');
    });
  }

  const tabBtns = container.querySelectorAll('.tab-btn-underline');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('#entreno-page .tab-content').forEach(tc => tc.classList.add('hidden'));
      const target = document.getElementById('tab-' + btn.dataset.tab);
      if (target) target.classList.remove('hidden');
      updateTabIndicator(btn);
      if (btn.dataset.tab === 'historial' && !historialLoaded) {
        historialLoaded = true;
        loadHistorialTab(container);
      }
    });
  });

  // Position indicator on initial active tab
  const activeTab = container.querySelector('.tab-btn-underline.active');
  if (activeTab) setTimeout(() => updateTabIndicator(activeTab), 50);
}

// ── Load Routines List ─────────────────────────
async function loadRoutinesList(container) {
  const profile = getUserProfile();
  const listEl  = container.querySelector('#routines-container');

  try {
    const snap = await collections.assignments(profile.uid).orderBy('createdAt','desc').limit(20).get();

    if (snap.empty) {
      if (profile?.role === 'basico') {
        renderBasicOnboarding(container, listEl, profile);
      } else {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="3" rx="1"/><path d="M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg></div>
            <div class="empty-title">${t('entreno_no_routines')}</div>
            <div class="empty-subtitle">${t('entreno_no_routines_sub')}</div>
          </div>
 `;
      }
      return;
    }

    const routines = await Promise.all(
      snap.docs.map(async d => {
        const data = d.data();
        const routineSnap = await db.collection('routines').doc(data.routineId).get();
        return { id: d.id, assignmentId: d.id, ...data, routine: routineSnap.data() };
      })
    );

    // Ocultar rutinas completadas esta semana (se muestran de nuevo el lunes 00:00)
    const now = new Date();
    const daysFromMonday = (now.getDay() === 0 ? 6 : now.getDay() - 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const visibleRoutines = routines.filter(a => {
      if (a.completedAt) {
        const cd = a.completedAt?.toDate?.() || new Date(a.completedAt);
        if (cd >= startOfWeek) return false;
      }
      return true;
    });

    if (visibleRoutines.length === 0 && routines.length > 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="empty-title">¡Semana completada!</div>
          <div class="empty-subtitle">Las rutinas vuelven a estar disponibles el lunes a las 00:00</div>
        </div>`;
      return;
    }

    listEl.innerHTML = visibleRoutines.map(a => {
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
        activeAssignmentId = card.dataset.assignmentId || null;
        loadRoutineDetail(container, card.dataset.routineId);
      });
    });

  } catch (e) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
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
async function renderRoutineDetail(container, routine) {
  if (!_exDataCache) {
    try {
      const { EXERCISES } = await import('../../data/data.js');
      _exDataCache = {};
      EXERCISES.forEach(e => { _exDataCache[e.n] = e; });
    } catch(_) {}
  }

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
        ${exercises.map((ex, i) => buildExerciseCard(ex, i, isActive, session, _exDataCache)).join('')}
      </div>

      ${exercises.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="3" rx="1"/><path d="M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg></div>
          <div class="empty-title">${t('entreno_no_exercises')}</div>
          <div class="empty-subtitle">${t('entreno_no_exercises_sub')}</div>
        </div>
 ` : ''}

      ${isActive ? `
      <div style="display:flex;gap:12px;padding:var(--space-lg) 0;margin-top:var(--space-md)">
        <button id="btn-finish-bottom" class="btn-primary btn-full" style="flex:1">Finalizar entreno</button>
        <button id="btn-cancel-bottom" class="btn-secondary" style="min-width:80px">Cancelar</button>
      </div>
 ` : ''}
    </div>
 `;

  // Back button
  container.querySelector('#btn-back-routines')?.addEventListener('click', () => {
    import('../router.js').then(({ navigate }) => navigate('entreno'));
  });

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

  // Auto-open first exercise
  const firstItem = container.querySelector('.exercise-item');
  if (firstItem) firstItem.classList.add('open');

  // Bottom finish/cancel buttons
  container.querySelector('#btn-finish-bottom')?.addEventListener('click', () => finishWorkout(container));
  container.querySelector('#btn-cancel-bottom')?.addEventListener('click', () => cancelWorkout(container));
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
          <div style="flex:1;height:5px;background:rgba(255,255,255,0.1);border-radius:var(--r-xs);overflow:hidden">
            <div style="height:100%;width:${b.pct}%;background:${b.color};border-radius:var(--r-xs);transition:width 0.6s ease"></div>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);width:28px;text-align:right">${b.pct}%</div>
        </div>
 `).join('')}
    </div>
 `;
}

// ── Exercise Card Builder ──────────────────────
function buildExerciseCard(ex, index, sessionActive, session, exDataCache) {
  const completedSets = session?.completedSets?.[ex.id] || [];
  const allDone = completedSets.length >= (ex.sets || 3);

  const exPhoto = exDataCache?.[ex.name]?.localImg?.[0];
  const numOrPhoto = exPhoto
    ? `<div class="exercise-num-img"><img src="${encodeURI(exPhoto)}" alt="${ex.name}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid var(--glass-border)"></div>`
    : `<div class="exercise-num">${index + 1}</div>`;

  return `
    <div class="exercise-item ${allDone ? 'ex-all-done' : ''}" data-ex-id="${ex.id}" data-ex-index="${index}">
      <div class="exercise-header">
        ${numOrPhoto}
        <div style="flex:1;min-width:0">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-sets">${ex.sets || 3} × ${ex.reps || '—'}${ex.weight ? ' · ' + ex.weight + 'kg' : ''}</div>
        </div>
        ${allDone ? '<span class="ex-done-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}
        <span class="exercise-chevron">▼</span>
      </div>

      <div class="exercise-body">

        <!-- Muscle activation bars -->
        ${buildMuscleBars(ex)}

        <!-- Action row -->
        <div class="ex-action-row">
          <button class="video-btn" data-action="info" data-exid="${ex.id}" data-exname="${(ex.name||ex.id).replace(/"/g,'&quot;')}" data-exindex="${index}" title="Ver técnica">
            ${t('entreno_watch_exercise')}
          </button>
          <button class="ex-icon-btn" data-action="swap" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_swap_exercise')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/><path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"/></svg></button>
          <button class="ex-icon-btn" data-action="notes" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_notes')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="ex-icon-btn" data-action="history" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_history')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
        </div>

        <!-- Rest config -->
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0 4px;opacity:.7">
          <span style="font-size:11px;color:var(--color-text-muted)">Descanso:</span>
          <input type="number" class="rest-secs-input" data-exid="${ex.id}"
                 value="${ex.restSeconds || 60}" min="10" max="600" step="5"
                 style="width:52px;background:transparent;border:1px solid var(--glass-border);border-radius:var(--r-xs);color:var(--color-text);font-size:11px;text-align:center;padding:2px">
          <span style="font-size:11px;color:var(--color-text-muted)">seg</span>
        </div>

        <!-- Sets Table -->
        ${buildSetsTable(ex, index, session)}
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

  // Warm-up rows
  const warmupCount = ex.warmupSets || 0;
  const _repArr     = ex.reps ? String(ex.reps).split('-').map(r => r.trim()).filter(Boolean) : [];
  const _defaultRep = _repArr[0] ?? '';
  const warmupRows  = Array.from({ length: warmupCount }, (_, wi) => {
    const warmupWeight = ex.weight ? Math.round(ex.weight * 0.4 / 2) * 2 : 0;
    return `
      <tr class="set-row warmup-row" data-exid="${ex.id}" data-warmup="${wi}">
        <td class="set-num" style="color:rgba(251,146,60,.8)">W${wi + 1}</td>
        <td class="set-prev" style="font-size:10px;color:rgba(251,146,60,.6)">Calentamiento</td>
        <td>
          <input type="text" inputmode="numeric" class="set-input warmup-input"
                 data-exid="${ex.id}" data-warmup="${wi}" data-field="reps"
                 placeholder="${_defaultRep || '—'}"
                 style="opacity:0.7">
        </td>
        <td>
          <input type="number" class="set-input warmup-input"
                 data-exid="${ex.id}" data-warmup="${wi}" data-field="weight"
                 placeholder="${warmupWeight || '0'}" min="0" max="999" step="0.5"
                 style="opacity:0.7">
        </td>
        <td>
          <div class="set-actions-cell">
            <button class="set-done-btn warmup-done-btn" data-exid="${ex.id}" data-warmup="${wi}" data-done="false">○</button>
          </div>
        </td>
      </tr>
 `;
  }).join('');

  const rows = Array.from({ length: numSets }, (_, i) => {
    const done          = completedSets.includes(i);
    const prevSet       = ex.previousSets?.[i] || {};
    const repArr        = ex.reps ? String(ex.reps).split('-').map(r => r.trim()).filter(Boolean) : [];
    const defaultRep    = repArr[i] ?? repArr[0] ?? '';
    const currentReps        = setDataStore[i]?.reps   ?? defaultRep;
    const savedWeight        = setDataStore[i]?.weight ?? '';
    const weightPlaceholder  = savedWeight || ex.weight || '';
    const prevLabel          = (prevSet.reps && prevSet.weight)
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
          <input type="text" inputmode="numeric" class="set-input drop-input"
                 data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}" data-field="reps"
                 value="${drop.reps ?? ''}" placeholder="—">
        </td>
        <td>
          <input type="text" inputmode="decimal" class="set-input drop-input"
                 data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}" data-field="weight"
                 value="${drop.weight ?? ''}" placeholder="0">
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
          <input type="text" inputmode="numeric" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="reps"
                 value="${currentReps}" placeholder="${defaultRep || '—'}" ${done ? 'disabled tabindex="-1"' : ''}>
        </td>
        <td>
          <input type="text" inputmode="decimal" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="weight"
                 value="${savedWeight}" placeholder="${weightPlaceholder || '0'}" ${done ? 'disabled' : ''}>
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
      <tbody id="sets-body-${ex.id}">${warmupRows}${rows}</tbody>
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
        row?.querySelectorAll('.set-input').forEach(inp => {
          inp.disabled = false;
          inp.tabIndex = 0;
        });
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
            _addDropRow(container, exId, setIdx, exercises);
          });
          actCell.appendChild(dropBtn);
        }
      } else {
        // Read actual reps/weight from inputs (only non-drop inputs on this row)
        const row         = btn.closest('.set-row');
        const repsInput   = row?.querySelector(`.set-input[data-field="reps"]:not(.drop-input)`);
        const weightInput = row?.querySelector(`.set-input[data-field="weight"]:not(.drop-input)`);
        if (repsInput?.value)   updateSetData(exId, setIdx, 'reps', repsInput.value);
        // Use typed value OR fall back to placeholder (last known weight)
        const weightVal = weightInput?.value || weightInput?.placeholder || '';
        if (weightVal) updateSetData(exId, setIdx, 'weight', weightVal);

        markSetDone(exId, setIdx);
        btn.classList.add('done');
        btn.textContent = '✓';
        btn.dataset.done = 'true';
        row?.classList.add('completed', 'locked');
        // Lock inputs — disable + blur + tabIndex to cover all browsers/mobile
        row?.querySelectorAll('.set-input').forEach(inp => {
          inp.disabled  = true;
          inp.tabIndex  = -1;
          inp.blur();
        });
        // Remove drop button
        row?.querySelector('.btn-add-drop')?.remove();

        // Start rest timer
        const exercise = exercises.find(ex => ex.id === exId);
        const restSecs = exercise?.restSeconds || 60;
        showRestTimer(container, exId, restSecs);

        // Auto-advance accordion when all sets of exercise are done
        const session = getActiveSession();
        const doneCount = (session?.completedSets?.[exId] || []).length;
        const totalSets = exercise?.sets || 3;
        if (doneCount >= totalSets) {
          const currentCard = container.querySelector(`[data-ex-id="${exId}"]`);
          currentCard?.classList.remove('open');
          const allCards = [...container.querySelectorAll('.exercise-item')];
          const idx = allCards.findIndex(c => c.dataset.exId === exId);
          const nextCard = allCards[idx + 1];
          if (nextCard) {
            nextCard.classList.add('open');
            setTimeout(() => nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
          }
        }
      }
    });
  });

  // Warm-up done buttons
  container.querySelectorAll('.warmup-done-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDone = btn.dataset.done === 'true';
      const row = btn.closest('.warmup-row');
      btn.dataset.done = isDone ? 'false' : 'true';
      btn.textContent = isDone ? '○' : '✓';
      row?.classList.toggle('completed', !isDone);
      row?.classList.toggle('locked', !isDone);
      row?.querySelectorAll('.warmup-input').forEach(inp => { inp.disabled = !isDone; });
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
      _addDropRow(container, exId, setIdx, exercises);
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
function _addDropRow(container, exId, setIdx, exercises) {
  const tbody  = container.querySelector(`#sets-body-${exId}`);
  if (!tbody) return;

  // Count existing drop rows for this set to get new index
  const existing = tbody.querySelectorAll(`.dropset-row[data-setidx="${setIdx}"]`);
  const dropIdx  = existing.length;

  // ── Auto-calculate drop values ────────────────
  const setRow      = tbody.querySelector(`.set-row[data-setidx="${setIdx}"]`);
  const repsInput   = setRow?.querySelector(`.set-input[data-field="reps"]:not(.drop-input)`);
  const weightInput = setRow?.querySelector(`.set-input[data-field="weight"]:not(.drop-input)`);

  const currentWeight  = parseFloat(weightInput?.value || weightInput?.placeholder || '0') || 0;
  const enteredReps    = parseInt(repsInput?.value || '0') || 0;

  // Planned reps from exercise definition
  const exercise    = exercises?.find(e => e.id === exId);
  const repArr      = exercise?.reps ? String(exercise.reps).split('-').map(r => parseInt(r.trim())).filter(Boolean) : [];
  const plannedReps = repArr[setIdx] ?? repArr[0] ?? enteredReps;

  // Drop weight: 75% rounded to nearest even number ≥ 2
  let dropWeight = 0;
  if (currentWeight > 0) {
    dropWeight = Math.round((currentWeight * 0.75) / 2) * 2;
    if (dropWeight < 2) dropWeight = 2;
  }

  // Drop reps: remaining (planned - entered) + 4, min 4
  const remaining = Math.max(0, plannedReps - enteredReps);
  const dropReps  = remaining + 4;

  const tr = document.createElement('tr');
  tr.className = 'dropset-row';
  tr.dataset.exid    = exId;
  tr.dataset.setidx  = String(setIdx);
  tr.dataset.dropidx = String(dropIdx);
  tr.innerHTML = `
    <td colspan="2">
      <span class="dropset-label">Drop</span>
    </td>
    <td>
      <input type="text" inputmode="numeric" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="reps"
             value="${dropReps}">
    </td>
    <td>
      <input type="text" inputmode="decimal" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="weight"
             value="${dropWeight || ''}" placeholder="${dropWeight || '0'}">
    </td>
    <td>
      <button class="btn-remove-drop" data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}"
              title="${t('entreno_remove_drop')}">✕</button>
    </td>
 `;

  // Insert after the last drop row (or after the set row itself)
  const lastDrop = tbody.querySelector(`.dropset-row[data-setidx="${setIdx}"]:last-of-type`);
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

// ── Rest Timer Modal ──────────────────────────
function showRestTimer(container, exId, seconds) {
  // Read live value from the config input (user may have changed it)
  const liveInput = container.querySelector(`.rest-secs-input[data-exid="${exId}"]`);
  const secs = liveInput ? Math.max(10, parseInt(liveInput.value) || seconds) : seconds;

  // Find exercise name for display
  const exCard = container.querySelector(`[data-ex-id="${exId}"] .exercise-name`);
  const exName = exCard?.textContent || exId;

  // Remove any existing rest modal
  document.getElementById('rest-timer-modal')?.remove();
  clearRestTimer();

  // Create AudioContext here (inside user gesture) to avoid browser block
  let audioCtx = null;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {}

  const C = 339.3;
  let remaining = secs;
  let restIv    = null;

  // Build elements manually (no innerHTML) to guarantee refs
  const overlay = document.createElement('div');
  overlay.id        = 'rest-timer-modal';
  overlay.className = 'rest-timer-modal-overlay';

  const card = document.createElement('div');
  card.className = 'rest-timer-modal-card glass-card';

  const titleEl = document.createElement('div');
  titleEl.className = 'rest-timer-modal-title';
  titleEl.textContent = 'Descanso';

  const nameEl = document.createElement('div');
  nameEl.className = 'rest-timer-modal-exname';
  nameEl.textContent = exName;

  // SVG ring
  const ringWrap = document.createElement('div');
  ringWrap.className = 'timer-ring rest-timer-modal-ring';
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  const bgCircle = document.createElementNS(ns, 'circle');
  bgCircle.setAttribute('class', 'timer-ring-bg');
  bgCircle.setAttribute('cx', '60'); bgCircle.setAttribute('cy', '60'); bgCircle.setAttribute('r', '54');
  const fillCircle = document.createElementNS(ns, 'circle');
  fillCircle.setAttribute('class', 'timer-ring-fill');
  fillCircle.setAttribute('cx', '60'); fillCircle.setAttribute('cy', '60'); fillCircle.setAttribute('r', '54');
  fillCircle.setAttribute('stroke-dasharray', String(C));
  fillCircle.setAttribute('stroke-dashoffset', '0');
  svg.appendChild(bgCircle); svg.appendChild(fillCircle);

  const ringText = document.createElement('div');
  ringText.className = 'timer-ring-text';
  const secsEl = document.createElement('span');
  secsEl.className = 'timer-seconds';
  secsEl.textContent = pad(secs);
  const labelEl = document.createElement('span');
  labelEl.className = 'timer-label';
  labelEl.textContent = 'seg';
  ringText.appendChild(secsEl); ringText.appendChild(labelEl);
  ringWrap.appendChild(svg); ringWrap.appendChild(ringText);

  // Buttons: -15s, +15s, Saltar
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:12px;margin-top:16px';
  const subBtn  = document.createElement('button');
  subBtn.className = 'btn-secondary';
  subBtn.textContent = '-15s';
  const addBtn  = document.createElement('button');
  addBtn.className = 'btn-accent';
  addBtn.textContent = '+15s';
  const skipBtn = document.createElement('button');
  skipBtn.className = 'btn-secondary';
  skipBtn.textContent = 'Saltar';
  btnRow.appendChild(subBtn); btnRow.appendChild(addBtn); btnRow.appendChild(skipBtn);

  card.appendChild(titleEl); card.appendChild(nameEl);
  card.appendChild(ringWrap); card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function updateDisplay() {
    secsEl.textContent = pad(remaining);
    const offset = C * (1 - Math.max(0, remaining / secs));
    fillCircle.style.strokeDashoffset = offset;
    fillCircle.setAttribute('class', `timer-ring-fill${remaining <= 5 ? ' danger' : remaining <= 15 ? ' warning' : ''}`);
  }

  function closeRestModal() {
    clearInterval(restIv);
    document.getElementById('rest-timer-modal')?.remove();
  }

  function playAlarm() {
    if (!audioCtx) return;
    audioCtx.resume().then(() => {
      [440, 880].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.start(audioCtx.currentTime + i * 0.05);
        osc.stop(audioCtx.currentTime + 1.3);
      });
    });
  }

  function onDone() {
    closeRestModal();
    toast('¡Descanso terminado! Siguiente serie', 'success');
    playAlarm();
    navigator.vibrate?.([200, 100, 200, 100, 400]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('¡Descanso terminado!', { body: 'Es hora de la siguiente serie', icon: '/logotipo/jus W Logo/TGWL --07.png' });
    }
  }

  updateDisplay();
  restIv = setInterval(() => {
    remaining--;
    updateDisplay();
    if (remaining <= 0) onDone();
  }, 1000);

  subBtn.addEventListener('click',  () => { remaining = Math.max(5, remaining - 15); updateDisplay(); });
  addBtn.addEventListener('click',  () => { remaining += 15; updateDisplay(); });
  skipBtn.addEventListener('click', closeRestModal);
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
      <div style="display:flex;gap:8px;margin-top:10px;justify-content:center">
        ${imgs.map((_, i) => `<button class="ex-img-nav-btn ${i===0?'active':''}" data-imgidx="${i}" style="padding:6px 18px;border-radius:var(--r-lg);font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--glass-border);background:${i===0?'var(--cyan)':'transparent'};color:${i===0?'#000':'var(--color-text)'}">
          ${i===0?'Inicio':'Final'}
        </button>`).join('')}
      </div>
 ` : ''}
    </div>
 ` : ''}

    ${vid ? `
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px;letter-spacing:.5px">Vídeo técnica</div>
      <video controls playsinline style="width:100%;border-radius:var(--radius-md);background:#000;max-height:220px;display:block">
        <source src="${encodeURI(vid)}" type="video/mp4">
      </video>
    </div>
 ` : ''}

    ${steps.length ? `
    <button id="ex-info-steps-btn" style="width:100%;padding:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:var(--radius-sm);color:#ef4444;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">
      Ver pasos de ejecución
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

  // Image nav buttons (Inicio / Final)
  m.querySelectorAll('.ex-img-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.imgidx);
      m.querySelectorAll('.ex-info-img').forEach((img, i) => { img.style.display = i === idx ? 'block' : 'none'; });
      m.querySelectorAll('.ex-img-nav-btn').forEach((b, i) => {
        b.style.background = i === idx ? 'var(--cyan)' : 'transparent';
        b.style.color = i === idx ? '#000' : 'var(--color-text)';
      });
    });
  });

  // Steps toggle
  m.querySelector('#ex-info-steps-btn')?.addEventListener('click', () => {
    const el  = m.querySelector('#ex-info-steps');
    const btn = m.querySelector('#ex-info-steps-btn');
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    btn.innerHTML = open ? 'Ocultar pasos' : 'Ver pasos de ejecución';
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
      <h3 class="modal-title">${t('entreno_swap_exercise')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:8px;font-size:13px">${t('entreno_alternatives_for')} <strong>${currentEx.name}</strong></p>

    <input type="text" id="swap-search" class="input-solo" placeholder="Buscar ejercicio..." style="margin-bottom:8px;font-size:13px" autocomplete="off">

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
        <span style="font-size:11px;color:var(--color-text-muted)">${ex.t==='c'?'C':'I'}</span>
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
  const note = await promptModal(t('entreno_incident_note'), t('entreno_incident_placeholder'));
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
      <h3 class="modal-title">${t('entreno_history')}: ${exercise.name}</h3>
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

    if (histEl) histEl.innerHTML = html2 || `<div class="empty-state"><div class="empty-title">${t('entreno_no_history')}</div></div>`;
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
    histEl.innerHTML = `<div class="empty-state"><div class="empty-title">${t('not_authenticated')}</div></div>`;
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
    histEl.innerHTML = `<div class="empty-state"><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
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
  const note = await promptModal(t('entreno_general_note'), t('entreno_general_note_placeholder'));

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
    // Marcar assignment como completado esta semana
    if (activeAssignmentId) {
      try {
        await collections.assignments(profile.uid).doc(activeAssignmentId).update({ completedAt: timestamp() });
      } catch (_) {}
    }
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
      <h3 class="modal-title">${t('entreno_completed')}</h3>
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

// ── Basic user onboarding ─────────────────────
function renderBasicOnboarding(container, listEl, profile) {
  let selectedGender = profile?.gender === 'femenino' ? 'mujer' : 'hombre';
  let selectedDays   = profile?.weeklyGoal || 3;

  function render() {
    listEl.innerHTML = `
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:4px">Configura tu plan</h3>
        <p class="text-muted" style="font-size:13px;margin-bottom:20px">Cuéntanos sobre ti para asignarte las rutinas perfectas</p>

        <div class="form-row" style="margin-bottom:16px">
          <label class="field-label" style="margin-bottom:8px">Género</label>
          <div style="display:flex;gap:8px">
            <button class="basic-gender-btn ${selectedGender==='hombre'?'active':''}" data-gender="hombre"
              style="flex:1;padding:10px;border-radius:var(--r-md);border:1px solid ${selectedGender==='hombre'?'var(--cyan)':'rgba(255,255,255,0.1)'};background:${selectedGender==='hombre'?'rgba(25,249,249,0.1)':'rgba(255,255,255,0.03)'};color:var(--color-text);cursor:pointer;font-size:14px;font-weight:600">
              Hombre
            </button>
            <button class="basic-gender-btn ${selectedGender==='mujer'?'active':''}" data-gender="mujer"
              style="flex:1;padding:10px;border-radius:var(--r-md);border:1px solid ${selectedGender==='mujer'?'var(--cyan)':'rgba(255,255,255,0.1)'};background:${selectedGender==='mujer'?'rgba(25,249,249,0.1)':'rgba(255,255,255,0.03)'};color:var(--color-text);cursor:pointer;font-size:14px;font-weight:600">
              Mujer
            </button>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:24px">
          <label class="field-label" style="margin-bottom:8px">Días de entreno por semana</label>
          <div style="display:flex;gap:8px">
            ${[2,3,4,5].map(d => `
              <button class="basic-days-btn" data-days="${d}"
                style="flex:1;padding:10px;border-radius:var(--r-md);border:1px solid ${selectedDays===d?'var(--red)':'rgba(255,255,255,0.1)'};background:${selectedDays===d?'rgba(148,10,10,0.2)':'rgba(255,255,255,0.03)'};color:var(--color-text);cursor:pointer;font-size:15px;font-weight:700">
                ${d}
              </button>`).join('')}
          </div>
        </div>

        <button class="btn-primary btn-full" id="btn-apply-basic-plan">Obtener mi plan</button>
      </div>
 `;

    listEl.querySelectorAll('.basic-gender-btn').forEach(btn => {
      btn.addEventListener('click', () => { selectedGender = btn.dataset.gender; render(); });
    });
    listEl.querySelectorAll('.basic-days-btn').forEach(btn => {
      btn.addEventListener('click', () => { selectedDays = parseInt(btn.dataset.days); render(); });
    });
    listEl.querySelector('#btn-apply-basic-plan').addEventListener('click', async () => {
      const { getUserProfile } = await import('../state.js');
      const p = getUserProfile();
      try {
        const { db, timestamp } = await import('../firebase-config.js');
        await db.collection('users').doc(p.uid).update({
          gender: selectedGender === 'mujer' ? 'femenino' : 'masculino',
          weeklyGoal: selectedDays,
          updatedAt: timestamp()
        });
      } catch (_) {}
      // Load generic routines
      listEl.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;
      try {
        const { db } = await import('../firebase-config.js');
        const snap = await db.collection('routines')
          .where('generic', '==', true)
          .where('gender', 'in', [selectedGender, 'todos'])
          .limit(6).get();
        if (snap.empty) {
          listEl.innerHTML = `<div class="empty-state"><div class="empty-title">¡Ya casi!</div><div class="empty-subtitle">Tu entrenador está preparando tu plan personalizado</div></div>`;
        } else {
          listEl.innerHTML = snap.docs.map(doc => {
            const r = doc.data();
            return `<div class="routine-card glass-card glass-shimmer" data-routine-id="${doc.id}" style="cursor:pointer">
              <div class="routine-card-header">
                <div class="routine-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="width:36px;height:36px"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5"/><rect x="6.5" y="4" width="3" height="16" rx="1.5" stroke-width="1.8"/><rect x="14.5" y="4" width="3" height="16" rx="1.5" stroke-width="1.8"/><line x1="9.5" y1="12" x2="14.5" y2="12" stroke-width="1.8"/></svg></div>
                <div><div class="routine-card-title">${r.name || 'Rutina'}</div>
                <div class="text-muted" style="font-size:12px">${r.description || ''}</div></div>
                <span class="badge badge-cyan">${r.exercises?.length || 0} ejercicios</span>
              </div></div>`;
          }).join('');
          listEl.querySelectorAll('.routine-card').forEach(card => {
            card.addEventListener('click', () => loadRoutineDetail(container, card.dataset.routineId));
          });
        }
      } catch (e) {
        listEl.innerHTML = `<div class="empty-state"><div class="empty-title">Error</div><div class="empty-subtitle">${e.message}</div></div>`;
      }
    });
  }
  render();
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
