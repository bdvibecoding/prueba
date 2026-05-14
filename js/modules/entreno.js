/* ═══════════════════════════════════════════════
   TGWL — modules/entreno.js
   Workout Module — Full Training Session Flow
═══════════════════════════════════════════════ */

import { getUserProfile, getActiveSession, startWorkoutSession, endSession, markSetDone, unmarkSetDone, updateSetData, appState } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, formatTime, formatDate, pad, launchConfetti, requestWakeLock, releaseWakeLock } from '../utils.js';
import { openModal, closeModal, openSheet, closeSheet, confirm, alert, openRPESheet, promptModal } from '../components/modal.js';
import { initWorkoutTimerBar, stopWorkoutTimer, clearRestTimer, getElapsedMs } from '../components/timer.js';
import { renderMuscleMap } from '../components/muscle-map.js';
import { t } from '../i18n.js';

let activeRoutineId       = null;
let activeRoutineData     = null;
let _reorderMode          = false;
let activeAssignmentId    = null;
let _workoutStartTime     = null; // for timestamp display

// ── Muscle icon helper (§11 content-first card) ─
function getMuscleIcon(muscle = '') {
  const m = muscle.toLowerCase();
  if (m.includes('pecho') || m.includes('chest') || m.includes('pectoral')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M12 4C9 4 6 6 6 9c0 4 3 6 6 9 3-3 6-5 6-9 0-3-3-5-6-5z"/></svg>`;
  if (m.includes('espalda') || m.includes('dorsal') || m.includes('back')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M12 3c0 0-6 4-6 10s6 8 6 8 6-2 6-8-6-10-6-10z"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
  if (m.includes('pierna') || m.includes('cuádric') || m.includes('glút') || m.includes('femoral') || m.includes('leg')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M10 3h4M10 3c0 4-2 6-2 10l2 8M14 3c0 4 2 6 2 10l-2 8"/></svg>`;
  if (m.includes('hombro') || m.includes('delt') || m.includes('shoulder')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M6 8a6 6 0 0 1 12 0"/><path d="M4 12h16M6 8l-2 4M18 8l2 4"/></svg>`;
  if (m.includes('bícep') || m.includes('trícep') || m.includes('brazo') || m.includes('arm')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M7 6c0 0 2-2 5-2s5 2 5 2v4c0 3-2 5-5 8-3-3-5-5-5-8V6z"/></svg>`;
  if (m.includes('abdom') || m.includes('core') || m.includes('lumb')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><rect x="7" y="4" width="10" height="16" rx="3"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="14" x2="17" y2="14"/></svg>`;
  // Default: dumbbell
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5"/><rect x="6.5" y="4" width="3" height="16" rx="1.5"/><rect x="14.5" y="4" width="3" height="16" rx="1.5"/><line x1="9.5" y1="12" x2="14.5" y2="12"/></svg>`;
}
function getPrimaryMuscle(exercises = []) {
  const freq = {};
  exercises.forEach(ex => { const m = ex.muscleGroup || ex.m || ''; if (m) freq[m] = (freq[m] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}
// §19 — top 2–3 distinct muscle groups, sentence case, joined by ·
function getTopMuscleSubtitle(exercises = [], max = 3) {
  const freq = {};
  exercises.forEach(ex => { const m = ex.muscleGroup || ex.m || ''; if (m) freq[m] = (freq[m] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([m], i) => i === 0 ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : m.toLowerCase())
    .join(' · ');
}
function fmtHHMM(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
// §13: sentence case (only first letter capitalised)
function toSentenceCase(str = '') {
  if (!str) return str;
  const s = str.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
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
    // ── Fetch plans and assignments in parallel ──
    const [plansSnap, assignSnap] = await Promise.all([
      collections.plans(profile.uid).get(),
      collections.assignments(profile.uid).orderBy('createdAt', 'desc').limit(20).get()
    ]);

    const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── Build visible individual routines ──
    let individualRoutines = [];
    if (!assignSnap.empty) {
      const routinesData = await Promise.all(
        assignSnap.docs.map(async d => {
          const data = d.data();
          const routineSnap = await db.collection('routines').doc(data.routineId).get();
          return { id: d.id, assignmentId: d.id, ...data, routine: routineSnap.data() };
        })
      );
      const now = new Date();
      const daysFromMonday = (now.getDay() === 0 ? 6 : now.getDay() - 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      individualRoutines = routinesData.filter(a => {
        if (a.unassigned === true) return false;
        if (a.completedAt) {
          const cd = a.completedAt?.toDate?.() || new Date(a.completedAt);
          if (cd >= startOfWeek) return false;
        }
        return true;
      });
    }

    // ── Basico onboarding (no plans, no assignments) ──
    if (plans.length === 0 && individualRoutines.length === 0) {
      if (profile?.role === 'basico') {
        renderBasicOnboarding(container, listEl, profile);
      } else {
        // Always show folder view even when empty
        await renderPlansView(container, [], []);
      }
      return;
    }

    // ── Always render plans view (passes individual routines too) ──
    await renderPlansView(container, plans, individualRoutines);

  } catch (e) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
  }
}

// ── Plans View ──────────────────────────────────
async function renderPlansView(container, plans, individualRoutines = []) {
  const listEl = container.querySelector('#routines-container');
  const activePlan = plans.find(p => p.isActive);
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  });

  let html = '';

  // ── Active plan shortcuts ──
  if (activePlan && activePlan.routines?.length) {
    html += `
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="width:3px;height:20px;background:var(--red,#C10801);border-radius:2px"></div>
          <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--red,#C10801)">Plan Activo</span>
          <span style="font-size:13px;font-weight:700;color:var(--color-text)">${activePlan.name}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px" id="active-plan-routines">
    `;
    for (const r of activePlan.routines) {
      html += `
        <div class="routine-card glass-card" data-routine-id="${r.routineId}" style="cursor:pointer">
          <div class="routine-card-icon">${getMuscleIcon('')}</div>
          <div class="routine-card-body">
            <div class="routine-card-title">${r.name}</div>
            <div class="routine-card-meta" style="color:var(--red,#C10801);font-weight:600;font-size:11px">▶ Disponible</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      `;
    }
    html += `</div></div>`;
  }

  // ── Carpeta padre "Planes" (siempre visible) ──
  const plansInnerHtml = (() => {
    if (plans.length === 0) {
      return `
        <div style="padding:20px 18px;text-align:center;opacity:.45">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;margin:0 auto 8px;display:block"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <div style="font-size:12px;font-weight:600;margin-bottom:3px">Sin planes asignados</div>
          <div style="font-size:11px;color:var(--color-text-muted)">Tu entrenador preparará tu plan aquí</div>
        </div>`;
    }
    return sortedPlans.map(plan => {
      const isActive = plan.isActive;
      const routines = plan.routines || [];
      return `
        <div class="plan-folder-card" data-plan-id="${plan.id}"
          style="background:${isActive ? 'rgba(193,8,1,0.06)' : 'rgba(255,255,255,0.02)'};
                 border:1px solid ${isActive ? 'var(--red,#C10801)' : 'var(--glass-border)'};
                 border-radius:12px;margin-bottom:8px;overflow:hidden">
          <div class="plan-folder-header"
            style="display:flex;align-items:center;gap:10px;padding:13px 16px;cursor:pointer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"
              style="width:17px;height:17px;flex-shrink:0;color:${isActive ? 'var(--red,#C10801)' : 'var(--color-text-muted)'}">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700;color:${isActive ? 'var(--color-text)' : 'var(--color-text-muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${plan.name}</div>
              <div style="font-size:10px;color:var(--color-text-muted);margin-top:1px">${routines.length} ${routines.length === 1 ? 'rutina' : 'rutinas'}</div>
            </div>
            ${isActive
              ? `<span style="background:var(--red,#C10801);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;letter-spacing:.05em;text-transform:uppercase;flex-shrink:0">ACTIVO</span>`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:var(--color-text-muted);opacity:.5;flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`}
            <svg class="plan-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              style="width:14px;height:14px;color:var(--color-text-muted);transition:transform .2s;flex-shrink:0;transform:${isActive ? 'rotate(90deg)' : ''}">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="plan-folder-body"
            style="display:${isActive ? 'block' : 'none'};padding:0 16px 12px;border-top:1px solid ${isActive ? 'rgba(193,8,1,0.15)' : 'var(--glass-border)'}">
            ${routines.length
              ? routines.map(r => `
                <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);opacity:${isActive ? '1' : '.5'}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    style="width:13px;height:13px;flex-shrink:0;color:${isActive ? 'var(--red,#C10801)' : 'var(--color-text-muted)'}">
                    <path d="M6.5 6.5H4a1 1 0 00-1 1v9a1 1 0 001 1h2.5M17.5 6.5H20a1 1 0 011 1v9a1 1 0 01-1 1h-2.5"/>
                    <path d="M6.5 8.5h11v7h-11z"/>
                  </svg>
                  <span style="flex:1;font-size:13px;font-weight:600;color:var(--color-text)">${r.name}</span>
                  ${!isActive ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:var(--color-text-muted)"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ''}
                </div>`).join('')
              : `<div style="padding:10px 0;font-size:11px;color:var(--color-text-muted);opacity:.6">Sin rutinas en este plan</div>`}
          </div>
        </div>`;
    }).join('');
  })();

  html += `
    <div style="margin-top:${activePlan ? '28px' : '0'}">
      <!-- Carpeta padre Planes -->
      <div id="parent-plans-folder" style="background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:16px;overflow:hidden">
        <div id="parent-plans-header" style="display:flex;align-items:center;gap:12px;padding:16px 18px;cursor:pointer;user-select:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;flex-shrink:0;color:var(--color-text-muted)">
            <path d="M3 7a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.41.59l1.83 1.82A2 2 0 0 0 12.83 8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:800;color:var(--color-text)">Planes</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${plans.length} ${plans.length === 1 ? 'plan' : 'planes'}${activePlan ? ` · <span style="color:var(--red,#C10801);font-weight:700">${activePlan.name} activo</span>` : ''}</div>
          </div>
          <svg id="parent-plans-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--color-text-muted);transition:transform .25s;transform:rotate(90deg)">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
        <div id="parent-plans-body" style="padding:12px 12px 12px;border-top:1px solid var(--glass-border)">
          ${plansInnerHtml}
        </div>
      </div>
    </div>
  `;

  // ── Individual assigned routines (always shown at bottom) ──
  if (individualRoutines.length > 0) {
    html += `
      <div style="margin-top:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="width:3px;height:20px;background:var(--glass-border);border-radius:2px"></div>
          <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted)">Rutinas Individuales</span>
        </div>
        <div id="individual-routines-list" style="display:flex;flex-direction:column;gap:10px">
    `;
    individualRoutines.forEach(a => {
      const r = a.routine || {};
      const exCount = r.exercises?.length || 0;
      const muscle  = getPrimaryMuscle(r.exercises || []);
      const icon    = getMuscleIcon(muscle);
      html += `
        <div class="routine-card glass-card" data-assignment-id="${a.assignmentId}" data-routine-id="${a.routineId || a.id}" style="cursor:pointer">
          <div class="routine-card-icon">${icon}</div>
          <div class="routine-card-body">
            <div class="routine-card-title">${r.name || a.name || 'Rutina'}</div>
            <div class="routine-card-meta">${exCount} ${t('entreno_exercises_count')}</div>
          </div>
          <span class="badge badge-red" style="flex-shrink:0">${exCount} ej.</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  listEl.innerHTML = html;

  // ── Wire active plan routine clicks ──
  listEl.querySelectorAll('#active-plan-routines .routine-card').forEach(card => {
    card.addEventListener('click', () => {
      loadRoutineDetail(container, card.dataset.routineId);
    });
  });

  // ── Wire individual routine clicks ──
  listEl.querySelectorAll('#individual-routines-list .routine-card').forEach(card => {
    card.addEventListener('click', () => {
      activeAssignmentId = card.dataset.assignmentId || null;
      loadRoutineDetail(container, card.dataset.routineId);
    });
  });

  // ── Wire parent "Planes" folder toggle ──
  listEl.querySelector('#parent-plans-header')?.addEventListener('click', () => {
    const body    = listEl.querySelector('#parent-plans-body');
    const chevron = listEl.querySelector('#parent-plans-chevron');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
  });

  // ── Wire sub-plan folder toggles ──
  listEl.querySelectorAll('.plan-folder-header').forEach(header => {
    header.addEventListener('click', () => {
      const card    = header.closest('.plan-folder-card');
      const body    = card.querySelector('.plan-folder-body');
      const chevron = header.querySelector('.plan-chevron');
      const isOpen  = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
    });
  });

  // Folder routine rows are informational only — navigation is via the shortcuts at top
}

// ── Load Routine Detail ────────────────────────
async function loadRoutineDetail(container, routineId) {
  activeRoutineId = routineId;
  const listEl = container.querySelector('#routines-container');
  listEl.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  try {
    const profile = getUserProfile();
    const [snap, sessSnap] = await Promise.all([
      db.collection('routines').doc(routineId).get(),
      collections.workoutSessions(profile.uid)
        .orderBy('startTime', 'desc')
        .limit(20)
        .get()
    ]);
    if (!snap.exists) throw new Error(t('entreno_routine_not_found'));
    activeRoutineData = { id: snap.id, ...snap.data() };

    // Enrich exercises with previous session data (for PREV column)
    const prevDoc = sessSnap.docs.find(d => d.data().routineId === routineId);
    console.log('[PREV] Sessions fetched:', sessSnap.docs.length);
    console.log('[PREV] Looking for routineId:', routineId);
    console.log('[PREV] Session routineIds:', sessSnap.docs.map(d => d.data().routineId));
    console.log('[PREV] prevDoc found:', !!prevDoc);
    if (prevDoc) {
      const prevSetData = prevDoc.data().setData || {};
      console.log('[PREV] setData keys:', Object.keys(prevSetData));
      console.log('[PREV] exercise ids:', (activeRoutineData.exercises || []).map(ex => ex.id));
      activeRoutineData.exercises = (activeRoutineData.exercises || []).map(ex => {
        const prevEx = prevSetData[ex.id];
        const prevSets = prevEx?.sets || (Array.isArray(prevEx) ? prevEx : null);
        console.log('[PREV] ex.id:', ex.id, '→ prevEx:', prevEx, '→ prevSets:', prevSets);
        if (prevSets && prevSets.length) {
          return { ...ex, previousSets: prevSets };
        }
        return ex;
      });
    }

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

  // Format start time for timestamp block
  const startMs  = session?.startTime || null;
  const startStr = startMs ? fmtHHMM(startMs) : '--:--';

  // Flex-column layout: topbar fixed at top, only scroll area scrolls
  const page = container.querySelector('#entreno-page');
  page.classList.add('workout-detail-layout');
  page.innerHTML = `

    <!-- ── Top bar (§12.1 + §19) — always visible, never scrolls ── -->
    <div class="workout-topbar">
      <button class="workout-topbar-back" id="btn-back-routines" title="${t('entreno_tab_routines')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="workout-topbar-center">
        <div class="workout-topbar-title">${routine.name}</div>
        ${(() => { const sub = getTopMuscleSubtitle(routine.exercises || []); return sub ? `<div class="workout-topbar-subtitle">${sub}</div>` : ''; })()}
      </div>
      ${isActive ? `<button class="btn-topbar-finish" id="btn-finish-top">Terminar</button>` : ''}
    </div>

    <!-- ── Scrollable content area ── -->
    <div class="workout-scroll-area">

      ${routine.description ? `
        <p class="text-muted"
           style="text-align:center;margin-bottom:var(--space-md);line-height:1.5;padding:0 var(--space-md)">
          ${routine.description}
        </p>` : ''}

      <!-- ── Timestamp block — replaces timer (§12.2) ── -->
      ${isActive ? `
      <div class="workout-timestamp-block">
        <div class="workout-ts-row">
          <span class="workout-ts-label">Hora inicio</span>
          <span class="workout-ts-value">${startStr}</span>
        </div>
        <div class="workout-ts-row">
          <span class="workout-ts-label">Hora fin</span>
          <span class="workout-ts-value" id="workout-end-time">--:--</span>
        </div>
      </div>
      ` : ''}

      <!-- §12.3 Start button — elevated card dark/light aware, left-aligned red text -->
      ${!isActive ? `
        <button id="btn-start-routine" class="btn-start-workout">
          ${t('entreno_start_btn')}
        </button>
      ` : ''}

      <!-- Reorder toggle -->
      ${exercises.length > 1 ? `
        <div style="display:flex;justify-content:flex-end;padding:0 var(--space-md);margin-bottom:8px">
          <button id="btn-reorder-toggle" type="button"
                  style="background:transparent;border:none;cursor:pointer;
                         font-family:'SF Pro Text',var(--font-sans);font-size:13px;font-weight:500;
                         color:${_reorderMode ? 'var(--red)' : 'var(--color-text-muted)'};
                         display:inline-flex;align-items:center;gap:6px;padding:6px 8px">
            ${_reorderMode
              ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg> Listo`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="7 4 7 20"/><polyline points="4 7 7 4 10 7"/><polyline points="17 20 17 4"/><polyline points="14 17 17 20 20 17"/></svg> Reordenar`}
          </button>
        </div>
      ` : ''}

      <!-- Exercise List -->
      <div class="exercise-list" id="exercise-list">
        ${exercises.map((ex, i) => buildExerciseCard(ex, i, isActive, session, _exDataCache, _reorderMode, exercises.length)).join('')}
      </div>

      ${exercises.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon"><svg style="width:32px;height:32px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="3" rx="1"/><path d="M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg></div>
          <div class="empty-title">${t('entreno_no_exercises')}</div>
          <div class="empty-subtitle">${t('entreno_no_exercises_sub')}</div>
        </div>
      ` : ''}

      ${isActive ? `
      <div class="workout-cancel-zone">
        <button class="btn-cancel-workout" id="btn-cancel-bottom">Cancelar entrenamiento</button>
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

  // Top-bar Terminar / Cancelar
  if (isActive) {
    container.querySelector('#btn-finish-top')?.addEventListener('click', () => finishWorkout(container));
    container.querySelector('#btn-cancel-bottom')?.addEventListener('click', () => cancelWorkout(container));
    requestWakeLock();
  }

  // Exercise accordion + actions
  initExerciseList(container, exercises, isActive);

  // Auto-open first exercise
  const firstItem = container.querySelector('.exercise-item');
  if (firstItem) firstItem.classList.add('open');
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
// ── Drag-and-drop reorder ─────────────────────
function _setupExerciseDragDrop(container, routine) {
  const list = container.querySelector('#exercise-list');
  if (!list) return;

  list.querySelectorAll('.ex-drag-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (e) => {
      if (!_reorderMode) return;
      e.preventDefault();
      e.stopPropagation();

      const item = handle.closest('.exercise-item');
      if (!item) return;

      const items = Array.from(list.querySelectorAll('.exercise-item'));
      const fromIdx = items.indexOf(item);
      if (fromIdx < 0) return;

      // Capture initial layout (used for hit-testing in pointermove)
      const positions = items.map(it => {
        const r = it.getBoundingClientRect();
        return { el: it, top: r.top, height: r.height, mid: r.top + r.height / 2 };
      });
      const myHeight = positions[fromIdx].height;
      const myTop    = positions[fromIdx].top;
      const startY   = e.clientY;

      // Style dragging item
      item.style.zIndex     = '1000';
      item.style.transition = 'box-shadow 150ms ease';
      item.style.boxShadow  = '0 8px 24px rgba(0,0,0,0.25)';
      item.style.position   = 'relative';
      item.classList.add('is-dragging');

      handle.setPointerCapture(e.pointerId);
      let toIdx = fromIdx;

      function onMove(ev) {
        const dy = ev.clientY - startY;
        item.style.transform = `translateY(${dy}px)`;

        // Determine new slot index based on midpoint of dragged item
        const myMid = myTop + myHeight / 2 + dy;
        let newIdx = fromIdx;
        for (let i = 0; i < positions.length; i++) {
          if (i === fromIdx) continue;
          const p = positions[i];
          if (i < fromIdx && myMid < p.mid) { newIdx = i; break; }
          if (i > fromIdx && myMid > p.mid) newIdx = i;
        }

        if (newIdx !== toIdx) {
          toIdx = newIdx;
          // Shift other items to visualize the gap
          positions.forEach((p, i) => {
            if (i === fromIdx) return;
            let shift = 0;
            if (fromIdx < toIdx && i > fromIdx && i <= toIdx) shift = -myHeight;
            else if (fromIdx > toIdx && i >= toIdx && i < fromIdx) shift = myHeight;
            p.el.style.transition = 'transform 180ms ease';
            p.el.style.transform  = shift ? `translateY(${shift}px)` : '';
          });
        }
      }

      function cleanup() {
        positions.forEach(p => {
          p.el.style.transition = '';
          p.el.style.transform  = '';
        });
        item.style.transition = '';
        item.style.boxShadow  = '';
        item.style.zIndex     = '';
        item.style.position   = '';
        item.style.transform  = '';
        item.classList.remove('is-dragging');
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onCancel);
      }

      function onUp() {
        // Commit array change
        if (fromIdx !== toIdx && routine?.exercises) {
          const arr = routine.exercises;
          const [moved] = arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, moved);
        }
        cleanup();
        if (fromIdx !== toIdx) renderRoutineDetail(container, routine);
      }

      function onCancel() { cleanup(); }

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onCancel);
    });
  });
}

function buildExerciseCard(ex, index, sessionActive, session, exDataCache, reorderMode = false, total = 0) {
  const completedSets = session?.completedSets?.[ex.id] || [];
  const allDone = completedSets.length >= (ex.sets || 3);

  // §13 image: rectangular rounded (40×40, r-md) — no circular
  const exPhoto = exDataCache?.[ex.name]?.localImg?.[0];
  const numOrPhoto = exPhoto
    ? `<div class="exercise-num-img"><img src="${encodeURI(exPhoto)}" alt="${ex.name}" style="width:40px;height:40px;border-radius:var(--r-md);object-fit:cover;flex-shrink:0"></div>`
    : `<div class="exercise-num">${index + 1}</div>`;

  // §13 series format: "3 Series · 10 Repeticiones" / cardio: "1 Series · 25-30 min"
  const _cardioStr = ((ex.muscleGroup || ex.m || '') + ' ' + (ex.name || ex.n || '')).toLowerCase();
  const isCardio = /cardio|cardiovascular|caminata|running|correr|bicicleta|elíptica|remo\s*(cardio|máquina)|natación/.test(_cardioStr);
  const setsStr  = ex.sets || 3;
  const repsStr  = ex.reps
    ? isCardio
      ? ` · ${ex.reps} min`
      : ` · ${ex.reps} Repeticiones`
    : '';

  // §13 three-dot overflow indicator
  const dotsSVG = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;

  // Drag handle (only shown in reorder mode)
  const dragHandle = reorderMode ? `
    <div class="ex-drag-handle" data-exindex="${index}" aria-label="Reordenar"
         style="display:flex;align-items:center;justify-content:center;width:32px;height:44px;
                margin-right:6px;cursor:grab;color:var(--color-text-muted);touch-action:none;
                flex-shrink:0;border-radius:var(--r-sm)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px">
        <line x1="4" y1="8" x2="20" y2="8"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="16" x2="20" y2="16"/>
      </svg>
    </div>
  ` : '';

  return `
    <div class="exercise-item ${allDone ? 'ex-all-done' : ''} ${reorderMode ? 'reorder-mode' : ''}" data-ex-id="${ex.id}" data-ex-index="${index}">
      <div class="exercise-header">
        ${dragHandle}
        ${numOrPhoto}
        <div style="flex:1;min-width:0">
          <div class="exercise-name">${toSentenceCase(ex.name)}</div>
          <div class="exercise-sets">${setsStr} Series${repsStr}</div>
        </div>
        ${allDone ? '<span class="ex-done-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}
        <span class="exercise-chevron">${dotsSVG}</span>
      </div>

      <div class="exercise-body">

        <!-- §14: muscle bars REMOVED — redundant with card icon -->

        <!-- Rest config -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-sm);opacity:.7">
          <span style="font-size:11px;color:var(--color-text-muted)">Descanso:</span>
          <input type="number" class="rest-secs-input" data-exid="${ex.id}"
                 value="${ex.restSeconds || 60}" min="10" max="600" step="5"
                 style="width:52px;background:transparent;border:1px solid var(--glass-border);border-radius:var(--r-xs);color:var(--color-text);font-size:11px;text-align:center;padding:2px">
          <span style="font-size:11px;color:var(--color-text-muted)">seg</span>
        </div>

        <!-- Sets Table -->
        ${buildSetsTable(ex, index, session)}

        <!-- §14 split action bar — bottom of expandable -->
        <div class="ex-action-row">
          <button class="video-btn" data-action="info" data-exid="${ex.id}" data-exname="${(ex.name||ex.id).replace(/"/g,'&quot;')}" data-exindex="${index}" title="Ver técnica">
            ${t('entreno_watch_exercise')}
          </button>
          <div style="flex:1;min-width:0"></div>
          <button class="ex-icon-btn" data-action="swap" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_swap_exercise')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/><path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"/></svg></button>
          <button class="ex-icon-btn" data-action="notes" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_notes')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="ex-icon-btn" data-action="history" data-exid="${ex.id}" data-exindex="${index}" title="${t('entreno_history')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
        </div>

      </div>
    </div>
 `;
}

// ── Sets Table ────────────────────────────────
function buildSetsTable(ex, exIndex, session) {
  const _cStr    = ((ex.muscleGroup || ex.m || '') + ' ' + (ex.name || ex.n || '')).toLowerCase();
  const isCardio = /cardio|cardiovascular|caminata|running|correr|bicicleta|elíptica|natación/.test(_cStr);
  const numSets       = ex.sets || 3;
  const completedSets = session?.completedSets?.[ex.id] || [];
  const setDataStore  = session?.setData?.[ex.id]?.sets || [];
  // dropsets stored as { [setIdx]: [{reps,weight},...] }
  const dropData      = session?.setData?.[ex.id]?.drops || {};

  // ── Cardio: simplified table (SET | PREV | MIN | ✓) ─────────────
  if (isCardio) {
    const minutesPlaceholder = ex.reps ? String(ex.reps).replace(/[^0-9\-\/]/g, '') || '—' : '—';
    const cardioRows = Array.from({ length: numSets }, (_, i) => {
      const done       = completedSets.includes(i);
      const prevSet    = ex.previousSets?.[i] || {};
      const prevLabel  = prevSet.reps ? `${prevSet.reps} min` : '—';
      const savedMins  = setDataStore[i]?.reps ?? '';
      return `
        <tr class="set-row ${done ? 'completed locked' : ''}" data-exid="${ex.id}" data-setidx="${i}">
          <td class="set-num">${i + 1}</td>
          <td class="td-prev ${prevSet.reps ? 'has-data' : ''}">${prevLabel}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="text" inputmode="numeric" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="reps"
                     value="${savedMins}" placeholder="${minutesPlaceholder}" ${done ? 'disabled tabindex="-1"' : ''}>
              <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap">min</span>
            </div>
          </td>
          <td>
            <div class="set-actions-cell">
              <button class="set-done-btn ${done ? 'done' : ''}"
                      data-exid="${ex.id}" data-setidx="${i}" data-done="${done}">
                ${done ? '✓' : '○'}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <table class="sets-table">
        <colgroup>
          <col class="col-set">
          <col class="col-prev">
          <col style="width:auto">
          <col class="col-check">
        </colgroup>
        <thead>
          <tr>
            <th>${t('entreno_set')}</th>
            <th class="th-prev">Prev</th>
            <th>Min</th>
            <th>✓</th>
          </tr>
        </thead>
        <tbody id="sets-body-${ex.id}">${cardioRows}</tbody>
      </table>
    `;
  }

  // §14.1 — Warm-up rows (keep, adjust to new 5-col layout)
  const warmupCount = ex.warmupSets || 0;
  const _repArr     = ex.reps ? String(ex.reps).split(/[-\/]/).map(r => r.trim()).filter(Boolean) : [];
  const _defaultRep = _repArr[0] ?? '';
  const warmupRows  = Array.from({ length: warmupCount }, (_, wi) => {
    const warmupWeight = ex.weight ? Math.round(ex.weight * 0.4 / 2) * 2 : 0;
    return `
      <tr class="set-row warmup-row" data-exid="${ex.id}" data-warmup="${wi}">
        <td class="set-num" style="color:rgba(251,146,60,.8)">W${wi + 1}</td>
        <td class="td-prev" style="opacity:0.4">—</td>
        <td>
          <input type="text" inputmode="numeric" class="set-input warmup-input"
                 data-exid="${ex.id}" data-warmup="${wi}" data-field="reps"
                 placeholder="${_defaultRep || '—'}" style="opacity:0.7">
        </td>
        <td>
          <input type="text" inputmode="decimal" class="set-input warmup-input"
                 data-exid="${ex.id}" data-warmup="${wi}" data-field="weight"
                 placeholder="${warmupWeight || '0'}" style="opacity:0.7">
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
    const repArr        = ex.reps ? String(ex.reps).split(/[-\/]/).map(r => r.trim()).filter(Boolean) : [];
    const defaultRep    = repArr[i] ?? repArr[0] ?? '';
    const currentReps        = setDataStore[i]?.reps   ?? defaultRep;
    const savedWeight        = setDataStore[i]?.weight ?? '';
    const weightPlaceholder  = savedWeight || ex.weight || '';

    // Dropset rows — 4-col layout: Drop | REPS | KG | ✕
    const drops = Array.isArray(dropData[i]) ? dropData[i] : [];
    const dropRows = drops.map((drop, di) => `
      <tr class="dropset-row" data-exid="${ex.id}" data-setidx="${i}" data-dropidx="${di}">
        <td colspan="2"><span class="dropset-label">${t('entreno_dropset_label')}</span></td>
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

    // Ghost placeholders from prev session
    const prevWeight      = prevSet.weight ? String(prevSet.weight) : '';
    const prevReps        = prevSet.reps   ? String(prevSet.reps)   : '';
    const kgPlaceholder   = prevWeight || (ex.weight ? String(ex.weight) : '');
    const repsPlaceholder = prevReps   || defaultRep || '—';
    // PREV label — shown in red: "12×60kg" or "—"
    const prevLabel = (prevSet.reps && prevSet.weight)
      ? `${prevSet.reps}×${prevSet.weight}kg`
      : '—';

    return `
      <tr class="set-row ${done ? 'completed locked' : ''}" data-exid="${ex.id}" data-setidx="${i}">
        <td class="set-num">${i + 1}</td>
        <td class="td-prev ${(prevSet.reps && prevSet.weight) ? 'has-data' : ''}">${prevLabel}</td>
        <td>
          <input type="text" inputmode="numeric" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="reps"
                 value="${currentReps}" placeholder="${repsPlaceholder}" ${done ? 'disabled tabindex="-1"' : ''}>
        </td>
        <td>
          <input type="text" inputmode="decimal" class="set-input" data-exid="${ex.id}" data-setidx="${i}" data-field="weight"
                 value="${savedWeight}" placeholder="${kgPlaceholder || '0'}" ${done ? 'disabled' : ''}>
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
      <colgroup>
        <col class="col-set">
        <col class="col-prev">
        <col class="col-num">
        <col class="col-num">
        <col class="col-check">
      </colgroup>
      <thead>
        <tr>
          <th>${t('entreno_set')}</th>
          <th class="th-prev">Prev</th>
          <th>Reps</th>
          <th>Kg</th>
          <th>✓</th>
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
        // Read actual reps/weight/notes from inputs (only non-drop inputs on this row)
        const row         = btn.closest('.set-row');
        const repsInput   = row?.querySelector(`.set-input[data-field="reps"]:not(.drop-input)`);
        const weightInput = row?.querySelector(`.set-input[data-field="weight"]:not(.drop-input)`);
        const notesInput  = row?.querySelector(`.set-input[data-field="notes"]:not(.drop-input)`);
        if (repsInput?.value)   updateSetData(exId, setIdx, 'reps', repsInput.value);
        // Use typed value OR fall back to placeholder (last known weight)
        const weightVal = weightInput?.value || weightInput?.placeholder || '';
        if (weightVal) updateSetData(exId, setIdx, 'weight', weightVal);
        if (notesInput?.value)  updateSetData(exId, setIdx, 'notes', notesInput.value);

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

  // Set input changes (kg, reps, notes — all non-drop)
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

  // Reorder toggle
  container.querySelector('#btn-reorder-toggle')?.addEventListener('click', () => {
    _reorderMode = !_reorderMode;
    renderRoutineDetail(container, activeRoutineData || routine);
  });

  // Block expansion in reorder mode + setup drag-and-drop
  if (_reorderMode) {
    container.querySelectorAll('.exercise-header').forEach(h => {
      h.addEventListener('click', e => e.stopPropagation(), true);
    });
    _setupExerciseDragDrop(container, activeRoutineData || routine);
  }

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

  // §14.1 — 5-col layout: Set | Kg | Rep | Notas | Check
  const tr = document.createElement('tr');
  tr.className = 'dropset-row';
  tr.dataset.exid    = exId;
  tr.dataset.setidx  = String(setIdx);
  tr.dataset.dropidx = String(dropIdx);
  tr.innerHTML = `
    <td><span class="dropset-label">Drop</span></td>
    <td>
      <input type="text" inputmode="decimal" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="weight"
             value="${dropWeight || ''}" placeholder="${dropWeight || '0'}">
    </td>
    <td>
      <input type="text" inputmode="numeric" class="set-input drop-input"
             data-exid="${exId}" data-setidx="${setIdx}" data-dropidx="${dropIdx}" data-field="reps"
             value="${dropReps}">
    </td>
    <td></td>
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

// ── Exercise Info — §15 Bottom Sheet with 3 tabs ──
async function openExerciseInfoModal(exName) {
  const { EXERCISES } = await import('../../data/data.js');
  const exData = EXERCISES.find(e => e.n === exName);
  if (!exData || (!exData.localVideo && !exData.localImg?.length)) {
    toast('Sin contenido multimedia para este ejercicio', 'info');
    return;
  }

  const imgs  = exData.localImg || [];
  const vid   = exData.localVideo;
  const steps = exData.instructions || [];
  const title = toSentenceCase(exName);

  // ── Tab: Imagen ───────────────────────────────
  const tabImagen = imgs.length ? `
    <div>
      <div style="overflow:hidden;border-radius:var(--r-md)">
        ${imgs.map((src, i) => `<img
          src="${encodeURI(src)}"
          alt="Posición ${i + 1}"
          class="ex-info-img"
          data-imgidx="${i}"
          style="width:100%;display:${i === 0 ? 'block' : 'none'};max-height:300px;object-fit:cover;border-radius:var(--r-md);cursor:${imgs.length > 1 ? 'pointer' : 'default'}">`).join('')}
      </div>
      ${imgs.length > 1 ? `
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
        ${imgs.map((_, i) => `<span
          class="ex-img-dot"
          data-imgidx="${i}"
          style="width:8px;height:8px;border-radius:50%;cursor:pointer;display:inline-block;
                 transition:background var(--transition-fast);
                 background:${i === 0 ? 'var(--color-text)' : 'var(--glass-border)'}">
        </span>`).join('')}
      </div>` : ''}
    </div>
  ` : `<div class="empty-state"><div class="empty-title" style="font-size:13px">Sin imágenes disponibles</div></div>`;

  // ── Tab: Video ────────────────────────────────
  const tabVideo = vid ? `
    <div>
      <video controls playsinline
        style="width:100%;border-radius:var(--r-md);background:#000;max-height:260px;display:block">
        <source src="${encodeURI(vid)}" type="video/mp4">
      </video>
    </div>
  ` : `<div class="empty-state"><div class="empty-title" style="font-size:13px">Sin vídeo disponible</div></div>`;

  // ── Tab: Pasos ────────────────────────────────
  const tabPasos = steps.length ? `
    <div>
      ${steps.map((step, i) => `
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border)">
          <div style="min-width:24px;height:24px;border-radius:50%;
                      background:var(--color-primary,#C10801);color:#fff;
                      font-size:11px;font-weight:700;
                      display:flex;align-items:center;justify-content:center;
                      flex-shrink:0;margin-top:1px">${i + 1}</div>
          <div style="font-size:13px;color:var(--color-text);line-height:1.55">${step}</div>
        </div>`).join('')}
    </div>
  ` : `<div class="empty-state"><div class="empty-title" style="font-size:13px">Sin instrucciones disponibles</div></div>`;

  // ── Sheet HTML ────────────────────────────────
  const html = `
    <div class="modal-header" style="margin-bottom:8px">
      <h3 style="font-size:18px;font-weight:500;color:var(--color-text);margin:0;flex:1">${title}</h3>
      <button class="modal-close" id="ex-sheet-close">✕</button>
    </div>

    <!-- §15 underline tab bar — sm variant (16px / 500) -->
    <div class="tab-bar-underline tab-bar-underline--sm" id="ex-info-tab-bar" style="margin-bottom:16px">
      <button class="tab-btn-underline active" data-tab="imagen">Imagen</button>
      <button class="tab-btn-underline" data-tab="video">Video</button>
      <button class="tab-btn-underline" data-tab="pasos">Pasos</button>
    </div>

    <div id="ex-info-tab-imagen" class="ex-info-tab-content">${tabImagen}</div>
    <div id="ex-info-tab-video"  class="ex-info-tab-content" style="display:none">${tabVideo}</div>
    <div id="ex-info-tab-pasos"  class="ex-info-tab-content" style="display:none">${tabPasos}</div>
  `;

  openSheet(html);
  const s = document.getElementById('sheet-content');
  if (!s) return;

  // Close button
  s.querySelector('#ex-sheet-close')?.addEventListener('click', () => closeSheet());

  // Tab switching + indicator
  const tabBtns = s.querySelectorAll('#ex-info-tab-bar .tab-btn-underline');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      s.querySelectorAll('.ex-info-tab-content').forEach(tc => tc.style.display = 'none');
      const panel = s.querySelector(`#ex-info-tab-${btn.dataset.tab}`);
      if (panel) panel.style.display = '';
      _updateExInfoTabIndicator(s, btn);
    });
  });
  const firstTab = s.querySelector('.tab-btn-underline.active');
  if (firstTab) setTimeout(() => _updateExInfoTabIndicator(s, firstTab), 60);

  // Image dot nav + tap-to-advance
  const _goDot = (idx) => {
    s.querySelectorAll('.ex-info-img').forEach((img, i) => { img.style.display = i === idx ? 'block' : 'none'; });
    s.querySelectorAll('.ex-img-dot').forEach((dot, i) => {
      dot.style.background = i === idx ? 'var(--color-text)' : 'var(--glass-border)';
    });
  };
  s.querySelectorAll('.ex-img-dot').forEach(dot => {
    dot.addEventListener('click', () => _goDot(parseInt(dot.dataset.imgidx)));
  });
  s.querySelectorAll('.ex-info-img').forEach((img, i) => {
    img.addEventListener('click', () => { if (imgs.length > 1) _goDot((i + 1) % imgs.length); });
  });
}

function _updateExInfoTabIndicator(s, activeBtn) {
  const bar = s.querySelector('#ex-info-tab-bar');
  if (!bar || !activeBtn) return;
  requestAnimationFrame(() => {
    const btnRect = activeBtn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    bar.style.setProperty('--indicator-width', btnRect.width + 'px');
    bar.style.setProperty('--indicator-offset', (btnRect.left - barRect.left) + 'px');
  });
}

// ── Search helpers (accent-insensitive + EN→ES) ──
function _norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const _EN_ES_SWAP = [
  ['squat','sentadilla'],['deadlift','peso muerto'],['bench','banca'],
  ['row','remo'],['pulldown','jalon'],['curl','curl'],['press','press'],
  ['fly','apertura'],['chest','pecho'],['back','espalda'],['shoulder','hombro'],
  ['glute','gluteo'],['calf','gemelo'],['hamstring','isquio'],['quad','cuadricep'],
  ['dumbbell','mancuerna'],['barbell','barra'],['cable','polea'],['dip','fondos'],
  ['lat','dorsal'],['incline','inclinado'],['decline','declinado'],['seated','sentado'],
  ['standing','de pie'],['overhead','por encima'],['leg','pierna'],['arm','brazo'],
  ['tricep','triceps'],['bicep','biceps'],['lunge','zancada'],['hip','cadera'],
  ['pull','jalon'],['push','empuje'],['extension','extension'],['flexion','flexion'],
  ['raise','elevacion'],['crunch','crunch'],['plank','plancha'],['hip thrust','hip thrust'],
  ['rdl','peso muerto rumano'],['sumo','sumo'],['conventional','convencional'],
  ['romanian','rumano'],['bulgarian','bulgara'],['nordic','nordico'],
  ['machine','maquina'],['smith','multipower'],['hack','hack'],
  ['chest fly','apertura pecho'],['lat pulldown','jalon dorsal'],
  ['leg press','prensa'],['leg curl','curl pierna'],['leg extension','extension cuadriceps'],
  ['face pull','face pull'],['skull crusher','press frances'],['floor press','press suelo'],
  ['close grip','agarre cerrado'],['wide grip','agarre abierto'],['neutral grip','agarre neutro'],
];
function _exMatchesSwap(ex, q) {
  const en = _norm(ex.n), em = _norm(ex.m);
  if (en.includes(q) || em.includes(q)) return true;
  for (const [eng, esp] of _EN_ES_SWAP) {
    const espNorm = _norm(esp);
    const engMatch = q.includes(eng) || eng.startsWith(q) || eng.includes(q);
    if (engMatch && (en.includes(espNorm) || em.includes(espNorm))) return true;
  }
  return false;
}

// ── Exercise Swap ─────────────────────────────
const SWAP_REASONS = [
  { id: 'maquina_ocupada', label: 'Máquina ocupada' },
  { id: 'no_hay_maquina',  label: 'No hay máquina'  },
  { id: 'molestias',       label: 'Molestias'       },
  { id: 'otro',            label: 'Otro'            },
];

async function openSwapExercise(currentEx, exIndex, container, allExercises) {
  const { EXERCISES } = await import('../../data/data.js');
  const selfName = currentEx.name || currentEx.id || '';
  const muscle    = currentEx.muscleGroup || currentEx.m || '';
  const sameGroup = EXERCISES.filter(ex => ex.m === muscle && ex.n !== selfName);
  const allPool   = EXERCISES.filter(ex => ex.n !== selfName);

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('entreno_swap_exercise')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:8px;font-size:13px">${t('entreno_alternatives_for')} <strong>${currentEx.name}</strong></p>

    <input type="text" id="swap-search" class="input-solo" placeholder="Buscar ejercicio..." style="margin-bottom:8px;font-size:13px" autocomplete="off">

    <div id="swap-list" style="max-height:240px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:var(--r-sm);margin-bottom:14px"></div>

    <div style="margin-top:4px">
      <label class="field-label">Motivo del cambio *</label>
      <div id="swap-reason-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0">
        ${SWAP_REASONS.map(r => `
          <button type="button" class="swap-reason-chip" data-reason="${r.id}"
                  style="padding:10px 14px;border-radius:var(--r-md);border:0.5px solid var(--color-border-secondary,var(--glass-border));
                         background:transparent;color:var(--color-text);font-size:13px;font-weight:500;
                         font-family:'SF Pro Text',var(--font-sans);cursor:pointer;
                         transition:background 150ms ease,color 150ms ease,border-color 150ms ease">
            ${r.label}
          </button>`).join('')}
      </div>
      <input type="text" id="swap-reason-other" class="input-solo"
             placeholder="Describe el motivo..." style="display:none;font-size:13px;margin-top:4px">
    </div>
    <button class="btn-primary btn-full" style="margin-top:var(--space-md)" id="btn-confirm-swap" disabled>
      ${t('entreno_confirm_swap')}
    </button>
 `;

  openModal(html);
  const modalEl = document.getElementById('modal-content');
  let selectedEx = null;
  let selectedReason = null; // { id, label }

  function updateConfirmEnabled() {
    const otherInput = modalEl.querySelector('#swap-reason-other');
    let reasonOk = !!selectedReason;
    if (selectedReason?.id === 'otro') {
      reasonOk = !!otherInput.value.trim();
    }
    modalEl.querySelector('#btn-confirm-swap').disabled = !selectedEx || !reasonOk;
  }

  function renderSwapList(items) {
    const listEl = modalEl.querySelector('#swap-list');
    if (!items.length) {
      listEl.innerHTML = `<div style="padding:14px;text-align:center;color:var(--color-text-muted);font-size:13px">Sin resultados</div>`;
      return;
    }
    listEl.innerHTML = items.map(ex => `
      <div class="swap-option" data-ex-n="${ex.n.replace(/"/g,'&quot;')}"
           style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:0.5px solid var(--color-border-tertiary,var(--glass-border))">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--color-text)">${ex.n}</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${ex.m}${ex.t==='c'?' · Compuesto':ex.t==='i'?' · Aislado':''}</div>
        </div>
        <span style="font-size:11px;color:var(--color-text-muted)">${ex.t==='c'?'C':'I'}</span>
      </div>`).join('');

    listEl.querySelectorAll('.swap-option').forEach(opt => {
      opt.addEventListener('click', () => {
        listEl.querySelectorAll('.swap-option').forEach(o => {
          o.style.background = '';
          o.style.borderLeft = '';
        });
        opt.style.background = 'var(--color-background-secondary,rgba(255,255,255,0.08))';
        opt.style.borderLeft = '3px solid var(--red)';
        selectedEx = allPool.find(e => e.n === opt.dataset.exN) || sameGroup.find(e => e.n === opt.dataset.exN);
        updateConfirmEnabled();
      });
    });
  }

  renderSwapList(sameGroup);

  modalEl.querySelector('#swap-search').addEventListener('input', (e) => {
    const q = _norm(e.target.value.trim());
    if (!q) { renderSwapList(sameGroup); return; }
    const hits = allPool.filter(ex => _exMatchesSwap(ex, q));
    renderSwapList(hits);
  });

  // Reason chips
  modalEl.querySelectorAll('.swap-reason-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      modalEl.querySelectorAll('.swap-reason-chip').forEach(c => {
        c.style.background = 'transparent';
        c.style.color = 'var(--color-text)';
        c.style.borderColor = 'var(--color-border-secondary,var(--glass-border))';
      });
      chip.style.background = 'var(--red)';
      chip.style.color = '#FFFFFF';
      chip.style.borderColor = 'var(--red)';
      const id = chip.dataset.reason;
      selectedReason = SWAP_REASONS.find(r => r.id === id);
      const otherInput = modalEl.querySelector('#swap-reason-other');
      otherInput.style.display = id === 'otro' ? 'block' : 'none';
      if (id !== 'otro') otherInput.value = '';
      updateConfirmEnabled();
    });
  });

  modalEl.querySelector('#swap-reason-other').addEventListener('input', updateConfirmEnabled);

  modalEl.querySelector('#btn-confirm-swap').addEventListener('click', async () => {
    if (!selectedEx || !selectedReason) return;
    const reason = selectedReason.id === 'otro'
      ? modalEl.querySelector('#swap-reason-other').value.trim()
      : selectedReason.label;
    if (!reason) { toast('Indica el motivo del cambio', 'warning'); return; }

    // §13 · Actually replace the exercise in the active routine
    const newEx = {
      id: `ex_${_norm(selectedEx.n).replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
      name: selectedEx.n,
      muscleGroup: selectedEx.m,
      sets: currentEx.sets,
      reps: currentEx.reps,
      weight: currentEx.weight,
      restSeconds: currentEx.restSeconds,
    };
    if (activeRoutineData && Array.isArray(activeRoutineData.exercises)) {
      activeRoutineData.exercises[exIndex] = newEx;
    }
    if (Array.isArray(allExercises)) {
      allExercises[exIndex] = newEx;
    }

    closeModal();
    toast(t('entreno_swapped_to').replace('{name}', selectedEx.n), 'success');

    // Persist note (audit trail)
    const profile = getUserProfile();
    if (profile?.uid) {
      await collections.notes(profile.uid).add({
        type: 'swap',
        exerciseId: currentEx.id,
        exerciseName: currentEx.name,
        swappedTo: selectedEx.n,
        reasonId: selectedReason.id,
        reason,
        date: timestamp(),
      }).catch(() => {});
    }

    // Re-render so the new exercise appears immediately
    if (activeRoutineData) renderRoutineDetail(container, activeRoutineData);
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
// ── Historial helpers ──────────────────────────
const _DIAS_ABBR  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const _MESES_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _CAL_HEADS  = ['L','M','X','J','V','S','D'];

function _dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _dayOfWeekMon(d) { return (d.getDay() + 6) % 7; } // Mon=0 … Sun=6

function _buildCalHTML(year, month, trainedDays, selectedDay, isDark = false) {
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = _dayOfWeekMon(new Date(year, month, 1));

  // Inverted surface: dark bg in light mode, light bg in dark mode
  const numClr  = isDark ? 'rgba(0,0,0,0.85)'   : 'rgba(255,255,255,0.85)';
  const headClr = isDark ? 'rgba(0,0,0,0.5)'    : 'rgba(255,255,255,0.5)';
  const moClr   = isDark ? '#111111'             : '#FFFFFF';
  const yrClr   = isDark ? 'rgba(0,0,0,0.35)'   : 'rgba(255,255,255,0.35)';
  const selBg   = isDark ? '#111111'             : '#FFFFFF';
  const selClr  = isDark ? '#FFFFFF'             : '#111111';
  const selBdr  = isDark ? '0.5px solid #F0F0F0' : '0.5px solid #111111';
  // Brand gradient @ 15% opacity for trained days — decorative use of brand colors
  const trainedBg = 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(193,8,1,0.15) 35%, rgba(241,96,1,0.15) 70%, rgba(217,195,171,0.15) 100%)';

  const heads = _CAL_HEADS.map(h =>
    `<div style="text-align:center;font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;color:${headClr};padding-bottom:6px">${h}</div>`
  ).join('');

  let cells = Array(firstWeekday).fill('<div></div>').join('');
  for (let d = 1; d <= daysInMonth; d++) {
    const key    = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSel  = key === selectedDay;
    const hasDot = trainedDays.has(key);
    const bg    = isSel ? selBg : (hasDot ? trainedBg : 'transparent');
    const clr   = isSel ? selClr : numClr;
    const wgt   = (isSel || hasDot) ? '600' : '400';
    cells += `
      <div data-date="${key}" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:3px 0;min-width:0">
        <div style="width:100%;max-width:34px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm,8px);
          background:${bg};
          border:${isSel ? selBdr : 'none'};
          color:${clr};
          font-family:'SF Pro Text',var(--font-sans);
          font-weight:${wgt};font-size:11px;
          transition:background 180ms ease,color 180ms ease,border 180ms ease">
          ${d}
        </div>
      </div>`;
  }

  return `
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:12px">
      <span style="font-family:'SF Pro Display',var(--font-sans);font-size:20px;font-weight:600;color:${moClr}">${_MESES_ES[month]}</span>
      <span style="font-family:'SF Pro Text',var(--font-sans);font-size:12px;color:${yrClr}">${year}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin-bottom:4px">${heads}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0">${cells}</div>`;
}

async function loadHistorialTab(container) {
  const profile = getUserProfile();
  const histEl  = container.querySelector('#history-container');

  if (!profile?.uid) {
    histEl.innerHTML = `<div class="empty-state"><div class="empty-title">${t('not_authenticated')}</div></div>`;
    return;
  }

  try {
    const snap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc').limit(50).get();

    if (snap.empty) {
      histEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">${t('entreno_no_sessions')}</div>
          <div class="empty-subtitle">${t('entreno_no_sessions_sub')}</div>
        </div>`;
      return;
    }

    const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build set of trained day keys
    const trainedDays = new Set(sessions.map(s => {
      const d = s.startTime?.toDate?.() || new Date(s.startTime);
      return _dateKey(d);
    }));

    const today     = new Date();
    let calYear     = today.getFullYear();
    let calMonth    = today.getMonth();
    let selectedDay = null;
    const isDark    = document.documentElement.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const calBg     = isDark ? '#F0F0F0' : '#111111';

    histEl.innerHTML = `
      <div id="cal-wrapper" style="width:100%;margin-bottom:16px">
        <div id="training-calendar"
             style="background:${calBg};border-radius:14px;padding:16px;touch-action:none;overflow:hidden">
          <div id="cal-inner" style="will-change:transform"></div>
        </div>
      </div>
      <div id="history-cards"></div>`;

    // ── Render helpers ──
    function renderCalendar(direction = 0) {
      const el = histEl.querySelector('#cal-inner');
      if (!el) return;
      if (direction !== 0) {
        // Slide-in animation: incoming content arrives from below (up-swipe) or above (down-swipe)
        const fromY = direction < 0 ? '100%' : '-100%';
        el.animate([{ transform: `translateY(${fromY})`, opacity: 0 },
                    { transform: 'translateY(0)',         opacity: 1 }],
                   { duration: 300, easing: 'ease-in-out', fill: 'both' });
      }
      el.innerHTML = _buildCalHTML(calYear, calMonth, trainedDays, selectedDay, isDark);
      wireCalDays();
    }

    function wireCalDays() {
      histEl.querySelectorAll('#cal-inner [data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
          selectedDay = selectedDay === cell.dataset.date ? null : cell.dataset.date;
          renderCalendar();
          renderCards();
        });
      });
    }

    function renderCards() {
      const cardsEl = histEl.querySelector('#history-cards');
      if (!cardsEl) return;

      let filtered;
      if (!selectedDay) {
        filtered = sessions.filter(s => {
          const d = s.startTime?.toDate?.() || new Date(s.startTime);
          return d.getFullYear() === calYear && d.getMonth() === calMonth;
        });
      } else {
        filtered = sessions.filter(s => {
          const d = s.startTime?.toDate?.() || new Date(s.startTime);
          return _dateKey(d) === selectedDay;
        });
      }

      if (!filtered.length) {
        if (selectedDay) {
          cardsEl.innerHTML = `<div style="text-align:center;padding:32px 16px;font-family:'SF Pro Text',var(--font-sans);font-size:14px;color:var(--color-text-tertiary,var(--color-text-muted))">Sin registro este día</div>`;
        } else {
          cardsEl.innerHTML = '';
        }
        return;
      }

      cardsEl.innerHTML = filtered.map(s => {
        const date      = s.startTime?.toDate?.() || new Date(s.startTime);
        const dayAbbr   = _DIAS_ABBR[date.getDay()];
        const dayNum    = date.getDate();
        const durMin    = s.durationMs ? Math.round(s.durationMs / 60000) : null;
        const metaParts = [];
        if (durMin) metaParts.push(`${durMin} min`);
        if (s.rpe)  metaParts.push(`Rep ${s.rpe}/10`);
        const meta = metaParts.join(' · ');

        return `
          <div class="session-history-card" data-session-id="${s.id}"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                   background:var(--glass-bg);border:0.5px solid var(--glass-border);
                   border-radius:14px;margin-bottom:10px;cursor:pointer">
            <!-- Date block — left anchor -->
            <div style="min-width:44px;text-align:center;flex-shrink:0">
              <div style="font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;
                          text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);
                          line-height:1.2">${dayAbbr}</div>
              <div style="font-family:'SF Pro Display',var(--font-sans);font-size:28px;font-weight:600;
                          color:var(--color-text);line-height:1">${dayNum}</div>
            </div>
            <!-- Separator -->
            <div style="width:0.5px;height:44px;background:var(--glass-border);flex-shrink:0"></div>
            <!-- Card body -->
            <div style="flex:1;min-width:0">
              <div style="font-family:'SF Pro Text',var(--font-sans);font-size:14px;font-weight:500;
                          color:var(--color-text);overflow:hidden;text-overflow:ellipsis;
                          white-space:nowrap">${s.routineName || 'Entreno'}</div>
              ${meta ? `<div style="font-family:'SF Pro Text',var(--font-sans);font-size:12px;
                              color:var(--color-text-muted);margin-top:2px">${meta}</div>` : ''}
            </div>
            <!-- Chevron -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round"
                 style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>`;
      }).join('');

      filtered.forEach(s => {
        const card = cardsEl.querySelector(`[data-session-id="${s.id}"]`);
        if (card) card.addEventListener('click', () => openSessionDetail(s.id, s));
      });
    }

    renderCalendar();
    renderCards();

    // ── Vertical swipe to change month ──
    let _touchY0 = 0;
    const calEl = histEl.querySelector('#training-calendar');
    calEl.addEventListener('touchstart', e => { _touchY0 = e.touches[0].clientY; }, { passive: true });
    calEl.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientY - _touchY0;
      if (Math.abs(delta) < 30) return;
      const dir = delta < 0 ? -1 : 1; // -1 = swipe up (next month), +1 = swipe down (prev month)
      if (delta < 0) { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } }
      else           { calMonth--; if (calMonth < 0)  { calMonth = 11; calYear--; } }
      selectedDay = null;
      renderCalendar(dir);
      renderCards();
    }, { passive: true });

  } catch (e) {
    histEl.innerHTML = `<div class="empty-state"><div class="empty-title">${t('error_loading')}</div><div class="empty-subtitle">${e.message}</div></div>`;
  }
}

// ── Duration formatter: "01h 21min 31sec" ────
function formatSessionDur(ms) {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / 60000) % 60);
  const h = Math.floor(ms / 3600000);
  const p = n => String(n).padStart(2, '0');
  return h > 0
    ? `${p(h)}h ${p(m)}min ${p(s)}sec`
    : `${p(m)}min ${p(s)}sec`;
}

// ── Open Session Detail Sheet ─────────────────
async function openSessionDetail(sessionId, session) {
  const setData     = session.setData || {};
  const exIds       = Object.keys(setData).filter(id => setData[id]?.sets?.length > 0);
  const totalSets   = exIds.reduce((acc, id) => acc + (setData[id]?.sets?.length || 0), 0);
  const totalEx     = exIds.length;
  const setsSuffix  = `${String(totalSets).padStart(2,'0')} ser ${String(totalEx).padStart(2,'0')} ej`;
  const rpeSuffix   = session.rpe ? `${String(session.rpe).padStart(2,'0')}/10 rep` : '—';

  // Sentence case helper
  const toSentenceCase = str =>
    str ? str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : str;

  const routineTitle = toSentenceCase(session.routineName || 'Entreno');

  const html = `
    <div class="modal-header" style="margin-bottom:0">
      <h3 style="font-family:'SF Pro Display',var(--font-sans);font-size:18px;font-weight:500;
                 color:var(--color-text);text-align:left;flex:1;margin:0;
                 overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${routineTitle}</h3>
      <button class="modal-close">✕</button>
    </div>

    <!-- Tab bar — underline indicator (Spec v2 §10), 16px/500 -->
    <div class="tab-bar-underline tab-bar-underline--sm" id="session-tab-bar"
         style="margin:12px 0 16px;gap:24px">
      <button class="tab-btn-underline active session-tab" data-tab="resumen">Resumen</button>
      <button class="tab-btn-underline session-tab" data-tab="series">Series</button>
      <button class="tab-btn-underline session-tab" data-tab="musculos">Músculos</button>
    </div>

    <!-- Panel: Resumen -->
    <div id="session-panel-resumen" class="session-panel">
      ${session.note ? `<div style="margin-bottom:12px;padding:12px 14px;background:var(--color-background-primary,var(--glass-bg));border:0.5px solid var(--color-border-tertiary,var(--glass-border));border-radius:14px;font-style:italic;font-size:13px;color:var(--color-text-muted)">"${session.note}"</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <!-- Tarjeta 1 — Duración (fila completa) -->
        <div style="grid-column:1/-1;background:var(--color-background-primary,var(--glass-bg));
                    border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                    border-radius:14px;padding:14px 16px">
          <div style="font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;
                      color:var(--color-text-tertiary,var(--color-text-muted));margin-bottom:6px">Duración</div>
          <div style="font-family:'SF Pro Display',var(--font-sans);font-size:26px;font-weight:600;
                      color:var(--color-text-primary,var(--color-text));line-height:1.1">${formatSessionDur(session.durationMs || 0)}</div>
        </div>
        <!-- Tarjeta 2 — Series (fila 2, izq.) -->
        <div style="background:var(--color-background-primary,var(--glass-bg));
                    border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                    border-radius:14px;padding:14px 16px">
          <div style="font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;
                      color:var(--color-text-tertiary,var(--color-text-muted));margin-bottom:6px">Series</div>
          <div style="font-family:'SF Pro Display',var(--font-sans);font-size:20px;font-weight:600;
                      color:var(--color-text-primary,var(--color-text));line-height:1.1">${setsSuffix}</div>
        </div>
        <!-- Tarjeta 3 — Repeticiones (fila 2, der.) -->
        <div style="background:var(--color-background-primary,var(--glass-bg));
                    border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                    border-radius:14px;padding:14px 16px">
          <div style="font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;
                      color:var(--color-text-tertiary,var(--color-text-muted));margin-bottom:6px">Repeticiones</div>
          <div style="font-family:'SF Pro Display',var(--font-sans);font-size:20px;font-weight:600;
                      color:var(--color-text-primary,var(--color-text));line-height:1.1">${rpeSuffix}</div>
        </div>
      </div>
    </div>

    <!-- Panel: Series -->
    <div id="session-panel-series" class="session-panel" style="display:none">
      <div id="session-exercises-detail">
        <div class="overlay-spinner"><div class="spinner-sm"></div></div>
      </div>
    </div>

    <!-- Panel: Músculos -->
    <div id="session-panel-musculos" class="session-panel" style="display:none">
      <div id="session-muscle-map" style="border-radius:14px;overflow:hidden"></div>
    </div>
  `;

  openSheet(html);

  // Wire tab switching
  const sheetContent = document.getElementById('sheet-content') || document.querySelector('.sheet-body');
  const getEl = id => sheetContent ? sheetContent.querySelector(id) : document.querySelector(id);

  // §18 · Animated underline indicator (Spec v2 §10)
  const tabBarEl = (sheetContent || document).querySelector('#session-tab-bar');
  function updateSessionIndicator(activeBtn) {
    if (!tabBarEl || !activeBtn) return;
    requestAnimationFrame(() => {
      const btnRect = activeBtn.getBoundingClientRect();
      const barRect = tabBarEl.getBoundingClientRect();
      tabBarEl.style.setProperty('--indicator-width',  btnRect.width + 'px');
      tabBarEl.style.setProperty('--indicator-offset', (btnRect.left - barRect.left) + 'px');
    });
  }
  (sheetContent || document).querySelectorAll('.session-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      (sheetContent || document).querySelectorAll('.session-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSessionIndicator(btn);
      const tab = btn.dataset.tab;
      (sheetContent || document).querySelectorAll('.session-panel').forEach(p => {
        p.style.display = p.id === `session-panel-${tab}` ? '' : 'none';
      });
    });
  });
  // Initial indicator position
  const initialActive = (sheetContent || document).querySelector('.session-tab.active');
  if (initialActive) setTimeout(() => updateSessionIndicator(initialActive), 50);

  // Ensure exercise data cache
  if (!_exDataCache) {
    try {
      const { EXERCISES } = await import('../../data/data.js');
      _exDataCache = {};
      EXERCISES.forEach(e => { _exDataCache[e.n] = e; });
    } catch (_) {}
  }

  // Fetch routine exercises for names
  let exercises = [];
  if (session.routineId) {
    try {
      const routineSnap = await db.collection('routines').doc(session.routineId).get();
      exercises = routineSnap.exists ? (routineSnap.data().exercises || []) : [];
    } catch { /* silently fall back */ }
  }

  // Build exercise name lookup
  const exNameMap = {};
  exercises.forEach(ex => { exNameMap[ex.id] = ex.name || ex.id; });

  // Render Series panel
  const detailEl = getEl('#session-exercises-detail');
  if (detailEl) {
    const setData = session.setData || {};
    const exIds   = Object.keys(setData).filter(id => setData[id]?.sets?.length > 0);

    if (exIds.length === 0) {
      detailEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">${t('entreno_no_set_data')}</p>`;
    } else {
      detailEl.innerHTML = exIds.map(exId => {
        const sets = setData[exId].sets || [];
        const name = toSentenceCase(exNameMap[exId] || exId);
        const rows = sets.map((set, i) => `
          <tr>
            <td style="padding:6px 4px 6px 16px;font-size:13px;color:var(--color-text-secondary)">${i + 1}</td>
            <td style="padding:6px 4px;font-size:13px;color:var(--color-text-secondary)">${set.reps || '—'}</td>
            <td style="padding:6px 16px 6px 4px;font-size:13px;color:var(--color-text-secondary)">${set.weight || '—'}</td>
          </tr>`).join('');

        return `
          <div style="margin-bottom:10px;overflow:hidden;background:var(--color-background-primary,var(--glass-bg));
                      border:0.5px solid var(--color-border-tertiary,var(--glass-border));border-radius:14px">
            <div style="font-family:'SF Pro Text',var(--font-sans);font-size:14px;font-weight:500;
                        color:var(--color-text-primary,var(--color-text));padding:14px 16px 10px">${name}</div>
            <div style="height:0.5px;background:var(--color-border-tertiary,var(--glass-border))"></div>
            <table style="width:100%;border-collapse:collapse;padding:0 16px">
              <thead>
                <tr>
                  <th style="padding:8px 4px 6px 16px;text-align:left;font-size:12px;font-weight:500;color:var(--color-text-muted)">${t('entreno_set')}</th>
                  <th style="padding:8px 4px 6px;text-align:left;font-size:12px;font-weight:500;color:var(--color-text-muted)">${t('entreno_reps')}</th>
                  <th style="padding:8px 16px 6px 4px;text-align:left;font-size:12px;font-weight:500;color:var(--color-text-muted)">Kg</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }).join('');
    }
  }

  // Render Músculos panel
  const performedExIds = Object.keys(session.setData || {})
    .filter(id => (session.setData[id]?.sets?.length || 0) > 0);
  const performedExercises = exercises.filter(ex => performedExIds.includes(ex.id));
  const mapEl = getEl('#session-muscle-map');

  if (mapEl) {
    if (performedExercises.length > 0) {
      renderMuscleMap(mapEl, enrichExercises(performedExercises));
    } else if (performedExIds.length > 0) {
      // Fallback: build synthetic exercise list from cache
      const synth = performedExIds.map(id => {
        const name   = exNameMap[id];
        const cached = _exDataCache?.[name];
        return cached ? { id, name: cached.n, muscleGroup: cached.m, target: cached.target, sec: cached.sec } : null;
      }).filter(Boolean);
      renderMuscleMap(mapEl, enrichExercises(synth));
    } else {
      mapEl.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px">${t('entreno_no_muscle_data')}</p>`;
    }
  }
}

// ══════════════════════════════════════════════
//  START WORKOUT
// ══════════════════════════════════════════════
// §12.3: no confirmation dialog — workout starts directly on tap.
// Accidental-tap protection lives on "Terminar" (destructive action), not on "Iniciar".
async function startRoutine(container, routine) {
  startWorkoutSession(routine.id, routine.name, routine.exercises || []);
  toast(t('entreno_started').replace('{name}', routine.name), 'success');
  renderRoutineDetail(container, routine);
}

// ══════════════════════════════════════════════
//  FINISH WORKOUT
// ══════════════════════════════════════════════
async function finishWorkout(container) {
  // Show finish time in timestamp block before any modal opens
  const endDisplay = container.querySelector('#workout-end-time');
  if (endDisplay) endDisplay.textContent = fmtHHMM(Date.now());

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
  // Ensure data cache loaded (needed by enrichExercises inside showWorkoutSummary)
  if (!_exDataCache) {
    try {
      const { EXERCISES } = await import('../../data/data.js');
      _exDataCache = {};
      EXERCISES.forEach(e => { _exDataCache[e.n] = e; });
    } catch (_) {}
  }
  launchConfetti();
  showWorkoutSummary(container, durationMs, session, rpe, note);
  endSession();
}

// ── Enrich exercises with target + sec from _exDataCache ──
// muscle-map.js uses ex.target (the PNG key) and ex.sec.
// Firestore exercises from the admin only store { name, muscleGroup, sets, ... }
// — no target/sec. We look up by name in data.js to fill them in.
function enrichExercises(exercises = []) {
  return exercises.map(ex => {
    if (ex.target) return ex;          // already has the key we need
    const cached = _exDataCache?.[ex.name];
    if (!cached) return ex;
    return { ...ex, target: cached.target, sec: cached.sec || [] };
  });
}

// ── Workout Summary ───────────────────────────
function showWorkoutSummary(container, durationMs, session, rpe, note) {
  const exercises   = session.exercises || [];
  const completedSets = session.completedSets || {};
  const setData       = session.setData || {};
  const totalSets   = Object.values(completedSets).reduce((a, b) => a + b.length, 0);
  const totalEx     = exercises.length;

  // ── Volume total (suma peso × reps de todas las series) ──
  // setData shape: { [exId]: { sets: [{reps, weight}, ...] } }
  let totalVolume = 0;
  Object.values(setData).forEach(exData => {
    const sets = Array.isArray(exData) ? exData : (exData?.sets || []);
    sets.forEach(s => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps)   || 0;
      totalVolume += w * r;
    });
  });
  const volStr = totalVolume > 0
    ? (totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + ' T' : totalVolume.toFixed(0) + ' kg')
    : '—';

  // ── Start / end time ──
  const startMs  = session.startTime || (Date.now() - durationMs);
  const startStr = fmtHHMM(startMs);
  const endStr   = fmtHHMM(startMs + durationMs);

  // ── Date display ──
  const now      = new Date();
  const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const monNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const dateStr  = `${dayNames[now.getDay()]} ${now.getDate()} ${monNames[now.getMonth()]} ${now.getFullYear()}`;

  // ── Exercise breakdown ──
  const exBreakdown = exercises.map(ex => {
    const exId    = ex.id || ex.name;
    const sets    = (completedSets[exId] || []).length;
    const exData  = setData[exId];
    const rawSets = Array.isArray(exData) ? exData : (exData?.sets || []);
    // Summary: "3 series · 10 kg" or "3 series · 10 reps"
    let setsStr = `${sets} ${sets === 1 ? 'serie' : 'series'}`;
    if (rawSets.length > 0) {
      const last = rawSets[rawSets.length - 1];
      if (last.weight && parseFloat(last.weight) > 0) {
        setsStr += ` · ${last.weight} kg × ${last.reps || '?'}`;
      } else if (last.reps) {
        setsStr += ` · ${last.reps} reps`;
      }
    }
    const muscle = ex.muscleGroup || ex.m || '';
    return `
      <div class="wsum-ex-row">
        <div class="wsum-ex-dot"></div>
        <div class="wsum-ex-info">
          <span class="wsum-ex-name">${ex.name || 'Ejercicio'}</span>
          <span class="wsum-ex-meta">${setsStr}${muscle ? ' · ' + muscle : ''}</span>
        </div>
      </div>`;
  }).join('');

  const html = `
    <div class="wsum-card">
      <!-- Header gradient banner -->
      <div class="wsum-header">
        <div class="wsum-header-glow"></div>
        <div class="wsum-trophy">🏆</div>
        <div class="wsum-title">${t('entreno_completed')}</div>
        <div class="wsum-routine-name">${session.routineName || ''}</div>
        <div class="wsum-time-range">${startStr} → ${endStr} · ${dateStr}</div>
      </div>

      <!-- 4-stat grid -->
      <div class="wsum-stats">
        <div class="wsum-stat">
          <span class="wsum-stat-val">${formatTime(durationMs)}</span>
          <span class="wsum-stat-key">${t('entreno_duration')}</span>
        </div>
        <div class="wsum-stat">
          <span class="wsum-stat-val">${totalEx}</span>
          <span class="wsum-stat-key">${t('entreno_exercises_count')}</span>
        </div>
        <div class="wsum-stat">
          <span class="wsum-stat-val">${totalSets}</span>
          <span class="wsum-stat-key">${t('entreno_sets_count')}</span>
        </div>
        <div class="wsum-stat">
          <span class="wsum-stat-val">${rpe ? rpe + '<small>/10</small>' : '—'}</span>
          <span class="wsum-stat-key">RPE</span>
        </div>
      </div>

      ${totalVolume > 0 ? `
      <div class="wsum-volume-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="width:14px;height:14px;flex-shrink:0">
          <path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5"/>
          <rect x="6.5" y="4" width="3" height="16" rx="1.5"/>
          <rect x="14.5" y="4" width="3" height="16" rx="1.5"/>
          <line x1="9.5" y1="12" x2="14.5" y2="12"/>
        </svg>
        <span>Volumen total: <strong>${volStr}</strong></span>
      </div>` : ''}

      ${note ? `<div class="wsum-note">"${note}"</div>` : ''}

      <!-- Muscle heatmap -->
      <div id="finish-muscle-map" class="wsum-muscle-section"></div>

      <!-- Exercise breakdown -->
      ${exercises.length > 0 ? `
      <div class="wsum-ex-section">
        <div class="wsum-section-label">Ejercicios</div>
        ${exBreakdown}
      </div>` : ''}

      <button class="btn-primary btn-full wsum-close-btn" id="btn-close-summary">${t('close')}</button>
    </div>
  `;

  openModal(html, { noClickClose: true });

  const settings = appState.get('settings');
  if (settings.showMuscleMap !== false) {
    const mapContainer = document.getElementById('modal-content').querySelector('#finish-muscle-map');
    if (mapContainer) renderMuscleMap(mapContainer, enrichExercises(exercises));
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
    const profile = getUserProfile();
    const [snap, sessSnap] = await Promise.all([
      db.collection('routines').doc(routineId).get(),
      collections.workoutSessions(profile.uid)
        .orderBy('startTime', 'desc')
        .limit(20)
        .get()
    ]);
    if (snap.exists) {
      activeRoutineData = { id: snap.id, ...snap.data() };
      // Enrich with previous session data
      const prevDoc = sessSnap.docs.find(d => d.data().routineId === routineId);
      if (prevDoc) {
        const prevSetData = prevDoc.data().setData || {};
        activeRoutineData.exercises = (activeRoutineData.exercises || []).map(ex => {
          const prevEx = prevSetData[ex.id];
          const prevSets = prevEx?.sets || (Array.isArray(prevEx) ? prevEx : null);
          if (prevSets && prevSets.length) return { ...ex, previousSets: prevSets };
          return ex;
        });
      }
      renderRoutineDetail(container, activeRoutineData);
    }
  } catch { loadRoutinesList(container); }
}
