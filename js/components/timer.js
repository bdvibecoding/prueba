/* ═══════════════════════════════════════════════
   TGWL — components/timer.js
   Workout Timer + Rest Countdown Timer
═══════════════════════════════════════════════ */

import { appState, pauseSession, resumeSession, getActiveSession } from '../state.js';
import { formatTime, pad, beep, beepWarning } from '../utils.js';

// ══════════════════════════════════════════════
//  WORKOUT GLOBAL TIMER
// ══════════════════════════════════════════════
let workoutInterval = null;

export function startWorkoutTimer(containerId = 'workout-timer') {
  stopWorkoutTimer();
  workoutInterval = setInterval(() => {
    const session = getActiveSession();
    if (!session.startTime || session.isPaused) return;
    const elapsed = Date.now() - session.startTime - (session.totalPauseMs || 0);
    const display = document.getElementById(containerId);
    if (display) display.textContent = formatTime(elapsed);
  }, 1000);
}

export function stopWorkoutTimer() {
  if (workoutInterval) {
    clearInterval(workoutInterval);
    workoutInterval = null;
  }
}

export function getElapsedMs() {
  const s = getActiveSession();
  if (!s.startTime) return 0;
  const pauseOffset = s.isPaused
    ? s.totalPauseMs + (Date.now() - s.pauseTime)
    : s.totalPauseMs;
  return Date.now() - s.startTime - pauseOffset;
}

// ══════════════════════════════════════════════
//  REST COUNTDOWN TIMER
// ══════════════════════════════════════════════
let restInterval   = null;
let restRemaining  = 0;
let restCallback   = null;
let warningFired   = false;

export function startRestTimer(seconds = 60, onDone = null, ringSelector = null) {
  clearRestTimer();
  restRemaining = seconds;
  restCallback  = onDone;
  warningFired  = false;

  updateRestDisplay(restRemaining, seconds, ringSelector);
  appState.set('restTimer', { active: true, seconds, remaining: restRemaining, exerciseId: null });

  restInterval = setInterval(() => {
    restRemaining--;
    appState.set('restTimer', {
      ...appState.get('restTimer'),
      remaining: restRemaining,
    });
    updateRestDisplay(restRemaining, seconds, ringSelector);

    // Warning beep at 5 seconds
    if (restRemaining === 5 && !warningFired) {
      warningFired = true;
      beepWarning();
    }

    if (restRemaining <= 0) {
      clearRestTimer();
      beep(1100, 0.3, 0.6);
      if (restCallback) restCallback();
    }
  }, 1000);
}

export function clearRestTimer() {
  if (restInterval) {
    clearInterval(restInterval);
    restInterval = null;
  }
  restRemaining = 0;
  appState.set('restTimer', { active: false, seconds: 60, remaining: 0, exerciseId: null });
}

export function addRestTime(seconds = 15) {
  restRemaining += seconds;
}

// ── Update circular ring display ──────────────
function updateRestDisplay(remaining, total, ringSelector) {
  const circumference = 339.3; // 2π × 54
  const progress = Math.max(0, remaining / total);
  const offset = circumference * (1 - progress);

  if (ringSelector) {
    const ring = document.querySelector(ringSelector);
    if (ring) {
      const fill = ring.querySelector('.timer-ring-fill');
      const timeEl = ring.querySelector('.timer-seconds');
      if (fill) {
        fill.style.strokeDashoffset = offset;
        fill.className = `timer-ring-fill${remaining <= 5 ? ' danger' : remaining <= 15 ? ' warning' : ''}`;
      }
      if (timeEl) timeEl.textContent = pad(remaining);
    }
  }
}

// ── Build Rest Timer HTML ─────────────────────
export function buildRestTimerHTML(seconds = 60) {
  const circumference = 339.3;
  return `
    <div class="rest-timer" id="rest-timer-widget">
      <div class="timer-ring">
        <svg viewBox="0 0 120 120">
          <circle class="timer-ring-bg" cx="60" cy="60" r="54"/>
          <circle class="timer-ring-fill" cx="60" cy="60" r="54"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="0"/>
        </svg>
        <div class="timer-ring-text">
          <span class="timer-seconds">${pad(seconds)}</span>
          <span class="timer-label">descanso</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-accent" id="rest-add-time">+15s</button>
        <button class="btn-secondary" id="rest-skip">Saltar</button>
      </div>
    </div>
 `;
}

export function initRestTimerWidget(container, onSkip) {
  const addBtn  = container.querySelector('#rest-add-time');
  const skipBtn = container.querySelector('#rest-skip');
  if (addBtn)  addBtn.addEventListener('click', () => addRestTime(15));
  if (skipBtn) skipBtn.addEventListener('click', () => {
    clearRestTimer();
    if (onSkip) onSkip();
  });
}

// ══════════════════════════════════════════════
//  WORKOUT CONTROL BAR BUILDER
// ══════════════════════════════════════════════
export function buildWorkoutTimerBar(routineName = 'Entreno') {
  return `
    <div class="workout-timer-bar glass-card-red" id="workout-timer-bar">
      <div>
        <div class="workout-timer-status">En curso · ${routineName}</div>
        <div class="workout-timer-display" id="workout-timer">00:00</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-icon" id="wt-pause" title="Pausar"></button>
        <button class="btn-icon" id="wt-finish" title="Finalizar" style="color:var(--cyan)"></button>
        <button class="btn-icon" id="wt-cancel" title="Cancelar" style="color:var(--color-danger)">✕</button>
      </div>
    </div>
 `;
}

export function initWorkoutTimerBar(container, { onPause, onResume, onFinish, onCancel } = {}) {
  const pauseBtn  = container.querySelector('#wt-pause');
  const finishBtn = container.querySelector('#wt-finish');
  const cancelBtn = container.querySelector('#wt-cancel');

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      const session = getActiveSession();
      if (session.isPaused) {
        resumeSession();
        pauseBtn.textContent = '';
        pauseBtn.title = 'Pausar';
        if (onResume) onResume();
      } else {
        pauseSession();
        pauseBtn.textContent = '';
        pauseBtn.title = 'Continuar';
        if (onPause) onPause();
      }
    });
  }

  if (finishBtn) finishBtn.addEventListener('click', () => { if (onFinish) onFinish(); });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { if (onCancel) onCancel(); });
}
