/* ═══════════════════════════════════════════════
   TGWL — modules/home.js
   iOS-style Home Screen
═══════════════════════════════════════════════ */

import { getUserProfile, getActiveSession, appState } from '../state.js';
import { navigate } from '../router.js';
import { getGreeting, getTimeLabel, formatDate, formatTime } from '../utils.js';
import { collections } from '../firebase-config.js';

export async function render(container) {
  const profile = getUserProfile();
  const name    = profile?.name?.split(' ')[0] || 'Atleta';
  const hour    = new Date().getHours();
  const greeting = getGreeting();
  const session  = getActiveSession();

  container.innerHTML = `
    <div class="home-screen" id="home-page">

      <!-- Welcome Banner -->
      <div class="welcome-banner glass-card card-appear">
        <div class="welcome-time">${getTimeLabel()} · ${formatDate(new Date())}</div>
        <div class="welcome-greeting">${greeting}, ${name}! 👋</div>
        <div class="welcome-subtext">
          ${getMotivationPhrase()}
        </div>
      </div>

      <!-- Active Session Resume Banner -->
      ${session?.routineId ? `
      <div class="glass-card glass-card-red" id="active-session-banner"
           style="padding:var(--space-md);margin-bottom:var(--space-md);cursor:pointer;display:flex;align-items:center;gap:var(--space-md)">
        <span style="font-size:24px">💪</span>
        <div style="flex:1">
          <div style="font-weight:700">Entreno en curso</div>
          <div class="text-muted">${session.routineName || 'Rutina activa'}</div>
        </div>
        <span style="color:var(--cyan);font-size:13px;font-weight:600">Continuar →</span>
      </div>` : ''}

      <!-- Quick Stats -->
      <div class="quick-stats" id="quick-stats-row">
        <div class="glass-card stat-card card-appear stagger-1">
          <div class="stat-value" id="stat-workouts">—</div>
          <div class="stat-label">Entrenos</div>
        </div>
        <div class="glass-card stat-card card-appear stagger-2">
          <div class="stat-value" id="stat-streak">—</div>
          <div class="stat-label">Racha</div>
        </div>
        <div class="glass-card stat-card card-appear stagger-3">
          <div class="stat-value" id="stat-week">—</div>
          <div class="stat-label">Esta semana</div>
        </div>
      </div>

      <!-- App Grid (iOS-style) -->
      <div class="section-title">Módulos</div>
      <div class="home-grid" id="app-grid">
        ${buildIconGrid(profile)}
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <div class="section-title">Actividad reciente</div>
        <div id="recent-activity">
          <div class="skeleton skeleton-card" style="height:70px;border-radius:14px;margin-bottom:8px"></div>
          <div class="skeleton skeleton-card" style="height:70px;border-radius:14px"></div>
        </div>
      </div>

    </div>
  `;
}

export async function init(container) {
  // Wire app icon clicks
  container.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const route = icon.dataset.route;
      if (route) navigate(route);
    });
  });

  // Active session resume
  container.querySelector('#active-session-banner')?.addEventListener('click', () => navigate('entreno'));

  // Load stats async
  loadStats(container);
  loadRecentActivity(container);
}

// ── App icons grid ─────────────────────────────
function buildIconGrid(profile) {
  const icons = [
    { route: 'entreno',       icon: '💪', label: 'Entreno',     cls: 'icon-entreno' },
    { route: 'alimentacion',  icon: '🥗', label: 'Nutrición',   cls: 'icon-alimentacion' },
    { route: 'biomedidas',    icon: '📊', label: 'Biomedidas',  cls: 'icon-biomedidas' },
    { route: 'salud',         icon: '❤️', label: 'Salud',       cls: 'icon-salud' },
    { route: 'progreso',      icon: '📈', label: 'Progreso',    cls: 'icon-progreso' },
    { route: 'perfil',        icon: '👤', label: 'Perfil',      cls: 'icon-perfil' },
    { route: 'suscripcion',   icon: '⭐', label: 'Premium',     cls: 'icon-suscripcion' },
    { route: 'configuracion', icon: '⚙️', label: 'Ajustes',    cls: 'icon-configuracion' },
  ];

  if (['admin','coach','medico','nutricionista'].includes(profile?.role)) {
    icons.push({ route: 'admin', icon: '🔑', label: 'Panel', cls: 'icon-admin' });
  }

  return icons.map((item, i) => `
    <div class="app-icon card-appear stagger-${Math.min(i + 1, 8)}" data-route="${item.route}">
      <div class="app-icon-inner ${item.cls} glass-shimmer">
        ${item.icon}
      </div>
      <span class="app-icon-label">${item.label}</span>
    </div>
  `).join('');
}

// ── Load workout stats ─────────────────────────
async function loadStats(container) {
  const profile = getUserProfile();
  if (!profile?.uid) return;

  try {
    const snap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc')
      .limit(30)
      .get();

    const sessions = snap.docs.map(d => d.data());
    const thisWeek = sessions.filter(s => {
      const d = s.startTime?.toDate?.() || new Date(s.startTime);
      const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 7;
    });

    // Streak calculation
    const sortedDates = [...new Set(
      sessions.map(s => {
        const d = s.startTime?.toDate?.() || new Date(s.startTime);
        return d.toISOString().split('T')[0];
      })
    )].sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let current = today;
    for (const date of sortedDates) {
      if (date === current) { streak++; current = getPrevDay(current); }
      else if (date < current) break;
    }

    container.querySelector('#stat-workouts').textContent = sessions.length;
    container.querySelector('#stat-streak').textContent   = `${streak}d`;
    container.querySelector('#stat-week').textContent     = thisWeek.length;
  } catch (e) {
    ['#stat-workouts','#stat-streak','#stat-week'].forEach(id => {
      const el = container.querySelector(id);
      if (el) el.textContent = '0';
    });
  }
}

// ── Load recent activity ───────────────────────
async function loadRecentActivity(container) {
  const profile = getUserProfile();
  const el = container.querySelector('#recent-activity');
  if (!el || !profile?.uid) {
    if (el) el.innerHTML = renderEmptyActivity();
    return;
  }

  try {
    const snap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc')
      .limit(3)
      .get();

    if (snap.empty) {
      el.innerHTML = renderEmptyActivity();
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const s = doc.data();
      const date = formatDate(s.startTime?.toDate?.() || new Date(s.startTime));
      const dur = s.durationMs ? formatTime(s.durationMs) : '—';
      return `
        <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm);display:flex;align-items:center;gap:var(--space-md)">
          <span style="font-size:24px;flex-shrink:0">💪</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.routineName || 'Entreno'}</div>
            <div class="text-muted">${date} · ${dur}</div>
          </div>
          ${s.rpe ? `<span class="badge badge-red">RPE ${s.rpe}</span>` : ''}
        </div>
      `;
    }).join('');
  } catch (e) {
    el.innerHTML = renderEmptyActivity();
  }
}

function renderEmptyActivity() {
  return `
    <div class="empty-state" style="padding:var(--space-lg)">
      <div class="empty-icon">🏋️</div>
      <div class="empty-title">Sin entrenos aún</div>
      <div class="empty-subtitle">¡Comienza tu primera sesión en Entreno!</div>
    </div>
  `;
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const PHRASES = [
  'El único entreno que lamentarás es el que no hiciste.',
  'Consistencia > Perfección.',
  'Cada rep cuenta. Cada día importa.',
  'Sé más fuerte que tus excusas.',
  'El dolor de hoy es el progreso de mañana.',
  'Tu cuerpo puede. Es tu mente la que debes convencer.',
  'No pares cuando estés cansado. Para cuando hayas terminado.',
];
function getMotivationPhrase() {
  return PHRASES[new Date().getDay() % PHRASES.length];
}
