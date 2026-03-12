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
            <h2 class="page-title">💪 Entreno</h2>
            <p class="page-subtitle" id="entreno-subtitle">Tus rutinas asignadas</p>
          </div>
        </div>
        <!-- Tabs -->
        <div class="tabs" style="margin-bottom:var(--space-md)">
          <button class="tab-btn active" data-tab="rutinas">Rutinas</button>
          <button class="tab-btn" data-tab="historial">Historial</button>
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
          <div class="empty-title">Sin rutinas asignadas</div>
          <div class="empty-subtitle">Tu coach aún no ha asignado ninguna rutina.</div>
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
            <div class="routine-card-icon">💪</div>
            <div>
              <div class="routine-card-title">${r.name || a.name || 'Rutina'}</div>
              <div class="text-muted" style="font-size:12px">${r.description || ''}</div>
            </div>
            <span class="badge badge-cyan">${r.exercises?.length || 0} ej.</span>
          </div>
          <div class="routine-card-meta">
            ${r.tags?.map(t => `<span class="chip">${t}</span>`).join('') || ''}
            <span class="chip">${a.assignedAt ? formatDate(a.assignedAt.toDate?.() || a.assignedAt) : 'Hoy'}</span>
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
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar</div><div class="empty-subtitle">${e.message}</div></div>`;
  }
}

// ── Load Routine Detail ────────────────────────
async function loadRoutineDetail(container, routineId) {
  activeRoutineId = routineId;
  const listEl = container.querySelector('#routines-container');
  listEl.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  try {
    const snap = await db.collection('routines').doc(routineId).get();
    if (!snap.exists) throw new Error('Rutina no encontrada');
    activeRoutineData = { id: snap.id, ...snap.data() };
    renderRoutineDetail(container, activeRoutineData);
  } catch (e) {
    toast('Error al cargar rutina: ' + e.message, 'error');
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
        <button class="header-back" id="btn-back-routines">← Rutinas</button>
        <h2 class="page-title" style="font-size:20px">${routine.name}</h2>
      </div>

      ${routine.description ? `<p class="text-muted" style="margin-bottom:var(--space-md)">${routine.description}</p>` : ''}

      <!-- Workout Timer Bar -->
      ${isActive ? buildWorkoutTimerBar(routine.name) : ''}

      <!-- Action buttons -->
      ${!isActive ? `
        <button class="btn-primary btn-full" id="btn-start-routine" style="margin-bottom:var(--space-md)">
          ▶ Iniciar Entreno
        </button>
      ` : ''}

      <!-- Exercise List -->
      <div class="exercise-list" id="exercise-list">
        ${exercises.map((ex, i) => buildExerciseCard(ex, i, isActive, session)).join('')}
      </div>

      ${exercises.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Sin ejercicios</div>
          <div class="empty-subtitle">Esta rutina no tiene ejercicios asignados aún.</div>
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

// ── Exercise Card Builder ──────────────────────
function buildExerciseCard(ex, index, sessionActive, session) {
  const completedSets = session?.completedSets?.[ex.id] || [];
  const allDone = completedSets.length >= (ex.sets || 3);

  return `
    <div class="exercise-item ${allDone ? 'done' : ''}" data-ex-id="${ex.id}" data-ex-index="${index}">
      <div class="exercise-header">
        <div class="exercise-num">${index + 1}</div>
        <div style="flex:1">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-sets text-muted">${ex.sets || 3}×${ex.reps || '—'} ${ex.weight ? '· ' + ex.weight + 'kg' : ''}</div>
        </div>
        ${allDone ? '<span style="color:var(--color-success)">✓</span>' : ''}
        <span class="exercise-chevron">▼</span>
      </div>

      <div class="exercise-body">
        <!-- Setup Note -->
        <div class="setup-note" id="setup-${ex.id}">
          <span class="setup-note-icon">📌</span>
          <textarea class="setup-note-text" placeholder="Notas de setup (banco pos.2, agarre neutro...)" data-exid="${ex.id}">${ex.setupNotes || ''}</textarea>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:8px;margin-bottom:var(--space-sm);flex-wrap:wrap">
          <a href="${ex.videoUrl || '#'}" target="_blank" class="video-btn" ${!ex.videoUrl ? 'onclick="return false"' : ''}>
            🎬 Ver ejercicio
          </a>
          <button class="btn-icon" data-action="swap" data-exid="${ex.id}" data-exindex="${index}" title="Cambiar ejercicio">🔄</button>
          <button class="btn-icon" data-action="notes" data-exid="${ex.id}" data-exindex="${index}" title="Notas / incidencias">📝</button>
          <button class="btn-icon" data-action="history" data-exid="${ex.id}" data-exindex="${index}" title="Historial">🕐</button>
        </div>

        <!-- Sets Table -->
        ${buildSetsTable(ex, index, session)}

        <!-- Rest Timer (shown after set done) -->
        <div id="rest-widget-${ex.id}" class="hidden"></div>
      </div>
    </div>
  `;
}

// ── Sets Table ────────────────────────────────
function buildSetsTable(ex, exIndex, session) {
  const numSets = ex.sets || 3;
  const completedSets = session?.completedSets?.[ex.id] || [];
  const setDataStore = session?.setData?.[ex.id]?.sets || [];

  const rows = Array.from({ length: numSets }, (_, i) => {
    const done = completedSets.includes(i);
    const prevSet = ex.previousSets?.[i] || {};
    const currentReps   = setDataStore[i]?.reps   ?? ex.reps ?? '';
    const currentWeight = setDataStore[i]?.weight ?? ex.weight ?? '';

    return `
      <tr>
        <td style="font-weight:700;color:var(--color-text-muted)">${i + 1}</td>
        <td>
          <div style="font-size:10px;color:var(--color-text-muted)">${prevSet.reps || '—'}/${prevSet.weight || '—'}kg</div>
        </td>
        <td>
          <input type="number" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="reps"
                 value="${currentReps}" placeholder="${ex.reps || '—'}" min="0" max="999">
        </td>
        <td>
          <input type="number" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="weight"
                 value="${currentWeight}" placeholder="${ex.weight || '0'}" min="0" max="999" step="0.5">
        </td>
        <td>
          <button class="set-done-btn ${done ? 'done' : ''}"
                  data-exid="${ex.id}" data-setidx="${i}" data-done="${done}">
            ${done ? '✓' : '○'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="sets-table">
      <thead>
        <tr>
          <th>Set</th>
          <th>Anterior</th>
          <th>Reps</th>
          <th>Kg</th>
          <th>✓</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
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
        toast('Primero inicia el entreno', 'info');
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
      } else {
        // Read actual reps/weight from inputs
        const repsInput   = container.querySelector(`.set-input[data-exid="${exId}"][data-setidx="${setIdx}"][data-field="reps"]`);
        const weightInput = container.querySelector(`.set-input[data-exid="${exId}"][data-setidx="${setIdx}"][data-field="weight"]`);
        if (repsInput?.value) updateSetData(exId, setIdx, 'reps', repsInput.value);
        if (weightInput?.value) updateSetData(exId, setIdx, 'weight', weightInput.value);

        markSetDone(exId, setIdx);
        btn.classList.add('done');
        btn.textContent = '✓';
        btn.dataset.done = 'true';

        // Start rest timer
        const exercise = exercises.find(ex => ex.id === exId);
        const restSecs = exercise?.restSeconds || 60;
        showRestTimer(container, exId, restSecs);
      }
    });
  });

  // Set input changes
  container.querySelectorAll('.set-input').forEach(input => {
    input.addEventListener('change', () => {
      if (!sessionActive) return;
      updateSetData(input.dataset.exid, parseInt(input.dataset.setidx), input.dataset.field, input.value);
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
}

// ── Rest Timer Widget ─────────────────────────
function showRestTimer(container, exId, seconds) {
  const widget = container.querySelector(`#rest-widget-${exId}`);
  if (!widget) return;
  widget.innerHTML = buildRestTimerHTML(seconds);
  widget.classList.remove('hidden');

  initRestTimerWidget(widget, () => {
    widget.classList.add('hidden');
    clearRestTimer();
  });

  startRestTimer(seconds, () => {
    widget.classList.add('hidden');
    toast('¡Tiempo de descanso terminado! 💪', 'info');
  }, `#rest-widget-${exId} .timer-ring`);
}

// ── Exercise Swap ─────────────────────────────
async function openSwapExercise(currentEx, exIndex, container, allExercises) {
  const { EXERCISES } = await import('../../data/data.js');
  const alternatives = EXERCISES.filter(ex =>
    ex.muscleGroup === currentEx.muscleGroup && ex.id !== currentEx.id
  ).slice(0, 6);

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🔄 Cambiar ejercicio</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">Alternativas para <strong>${currentEx.name}</strong></p>
    <div class="swap-dropdown">
      ${alternatives.map(ex => `
        <div class="swap-option" data-ex-id="${ex.id}" data-ex-name="${ex.name}">
          <div>
            <div class="swap-option-name">${ex.name}</div>
            <div class="swap-option-muscle">${ex.muscleGroup} · ${ex.equipment || 'Sin equipo'}</div>
          </div>
          <span class="badge badge-cyan">${ex.difficulty || ''}</span>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:var(--space-md)">
      <label class="field-label">Motivo del cambio *</label>
      <textarea id="swap-reason" class="input-solo" placeholder="Ej: Máquina ocupada, molestia en el codo..." rows="2"
                style="padding:var(--space-md);margin-top:var(--space-xs)"></textarea>
    </div>
    <button class="btn-primary btn-full" style="margin-top:var(--space-md)" id="btn-confirm-swap" disabled>
      Confirmar cambio
    </button>
  `;

  openModal(html);
  const modalEl = document.getElementById('modal-content');
  let selectedEx = null;

  modalEl.querySelectorAll('.swap-option').forEach(opt => {
    opt.addEventListener('click', () => {
      modalEl.querySelectorAll('.swap-option').forEach(o => o.style.background = '');
      opt.style.background = 'rgba(148,10,10,0.2)';
      selectedEx = { id: opt.dataset.exId, name: opt.dataset.exName };
      const confirmBtn = modalEl.querySelector('#btn-confirm-swap');
      const reason = modalEl.querySelector('#swap-reason').value.trim();
      if (selectedEx) confirmBtn.disabled = false;
    });
  });

  modalEl.querySelector('#swap-reason').addEventListener('input', (e) => {
    const confirmBtn = modalEl.querySelector('#btn-confirm-swap');
    confirmBtn.disabled = !selectedEx || !e.target.value.trim();
  });

  modalEl.querySelector('#btn-confirm-swap').addEventListener('click', async () => {
    const reason = modalEl.querySelector('#swap-reason').value.trim();
    if (!reason) { toast('Indica el motivo del cambio', 'warning'); return; }
    closeModal();
    toast(`Ejercicio cambiado a ${selectedEx.name}`, 'success');
    // Log swap note
    const profile = getUserProfile();
    if (profile?.uid) {
      await collections.notes(profile.uid).add({
        type: 'swap',
        exerciseId: currentEx.id,
        exerciseName: currentEx.name,
        swappedTo: selectedEx.name,
        reason,
        date: timestamp(),
      }).catch(() => {});
    }
  });
}

// ── Exercise Notes ────────────────────────────
async function openExerciseNotes(exId) {
  const profile = getUserProfile();
  const note = await promptModal('📝 Nota de incidencia', 'Ej: Dolor de codo, fatiga excesiva, malestar...');
  if (note && profile?.uid) {
    await collections.notes(profile.uid).add({
      type: 'incidence',
      exerciseId: exId,
      note,
      date: timestamp(),
    });
    toast('Nota guardada', 'success');
  }
}

// ── Exercise History ──────────────────────────
async function openExerciseHistory(exercise) {
  const profile = getUserProfile();
  let historyHTML = '<div class="overlay-spinner"><div class="spinner-sm"></div></div>';

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🕐 Historial: ${exercise.name}</h3>
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
      html2 += `<div class="divider"></div><div class="section-title">Incidencias</div>`;
      notesSnap.docs.forEach(doc => {
        const n = doc.data();
        const date = formatDate(n.date?.toDate?.() || new Date(n.date));
        html2 += `<div class="history-note"><span class="history-note-date">${date}</span><span class="history-note-text">${n.note}</span></div>`;
      });
    }

    if (histEl) histEl.innerHTML = html2 || `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Sin historial</div></div>`;
  } catch (e) {
    const histEl = document.getElementById('modal-content')?.querySelector('#history-content');
    if (histEl) histEl.innerHTML = `<p class="text-muted">Error al cargar historial</p>`;
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
    histEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">No autenticado</div></div>`;
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
          <div class="empty-title">Sin entrenos registrados</div>
          <div class="empty-subtitle">Completa tu primer entreno para ver el historial aquí.</div>
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
            <span class="chip">${totalSets} series</span>
            <span class="chip">${exerciseCount} ejercicios</span>
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
    histEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar</div><div class="empty-subtitle">${e.message}</div></div>`;
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
      <label style="font-size:13px;color:var(--color-text-muted)">Mostrar mapa muscular</label>
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
        <span class="summary-stat-key">Duración</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-val">${totalSets}</span>
        <span class="summary-stat-key">Series</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-val">${session.rpe ? session.rpe + '/10' : '—'}</span>
        <span class="summary-stat-key">RPE</span>
      </div>
    </div>

    ${session.note ? `<div class="glass-card" style="margin-bottom:var(--space-md);font-style:italic;font-size:13px">"${session.note}"</div>` : ''}

    <div class="section-title">Series realizadas</div>
    <div id="session-exercises-detail">
      <div class="overlay-spinner"><div class="spinner-sm"></div></div>
    </div>

    <div class="section-title" style="margin-top:var(--space-md)" id="muscle-map-title">Músculos trabajados</div>
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
      detailEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">Sin datos de series registrados.</p>`;
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
                <tr><th>Set</th><th>Reps</th><th>Kg</th></tr>
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
      mapEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">No hay datos de músculos disponibles.</p>`;
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
    '▶ Iniciar Entreno',
    `¿Listo para comenzar "${routine.name}"? El cronómetro arrancará al confirmar.`,
    { okText: 'Iniciar', cancelText: 'Cancelar' }
  );
  if (!ok) return;

  startWorkoutSession(routine.id, routine.name, routine.exercises || []);
  toast(`¡Arranca! ${routine.name} 💪`, 'success');
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
  const note = await promptModal('📝 Nota general del entreno', 'Cómo te has sentido, observaciones...');

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
    toast('Entreno guardado ✅', 'success');
  } catch (e) {
    toast('Error guardando: ' + e.message, 'error');
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
      <h3 class="modal-title">🎉 ¡Entreno completado!</h3>
    </div>
    <div class="summary-stat-grid">
      <div class="summary-stat"><span class="summary-stat-val">${formatTime(durationMs)}</span><span class="summary-stat-key">Duración</span></div>
      <div class="summary-stat"><span class="summary-stat-val">${totalSets}</span><span class="summary-stat-key">Series</span></div>
      <div class="summary-stat"><span class="summary-stat-val">${rpe ? rpe + '/10' : '—'}</span><span class="summary-stat-key">RPE</span></div>
    </div>
    ${note ? `<p class="text-muted" style="margin-bottom:var(--space-md);font-style:italic">"${note}"</p>` : ''}
    <div id="finish-muscle-map"></div>
    <button class="btn-primary btn-full" id="btn-close-summary" style="margin-top:var(--space-md)">Cerrar</button>
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
    '✕ Cancelar entreno',
    '¿Seguro que deseas cancelar? Se perderá el progreso no guardado.',
    { okText: 'Sí, cancelar', danger: true }
  );
  if (!ok) return;
  stopWorkoutTimer();
  clearRestTimer();
  releaseWakeLock();
  endSession();
  toast('Entreno cancelado', 'info');
  loadRoutinesList(container);
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
