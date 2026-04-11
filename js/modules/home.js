/* ═══════════════════════════════════════════════
   TGWL — modules/home.js
   iOS-style Home Screen
═══════════════════════════════════════════════ */

import { getUserProfile, getActiveSession, appState } from '../state.js';
import { navigate } from '../router.js';
import { getGreeting, getTimeLabel, formatDate, formatTime, translateRole } from '../utils.js';
import { collections, db, timestamp } from '../firebase-config.js';
import { t } from '../i18n.js';
import { openDirectChat } from '../components/direct-chat.js';

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
          <div style="font-weight:700">${t('active_session')}</div>
          <div class="text-muted">${session.routineName || 'Rutina activa'}</div>
        </div>
        <span style="color:var(--cyan);font-size:13px;font-weight:600">${t('continue')}</span>
      </div>` : ''}

      <!-- Quick Stats -->
      <div class="quick-stats" id="quick-stats-row">
        <div class="glass-card stat-card card-appear stagger-1">
          <div class="stat-value" id="stat-workouts">—</div>
          <div class="stat-label">${t('workouts')}</div>
        </div>
        <div class="glass-card stat-card card-appear stagger-2">
          <div class="stat-value" id="stat-streak">—</div>
          <div class="stat-label">${t('streak')}</div>
        </div>
        <div class="glass-card stat-card card-appear stagger-3">
          <div class="stat-value" id="stat-objectives">—</div>
          <div class="stat-label">Objetivos</div>
        </div>
      </div>

      <!-- App Grid (iOS-style) -->
      <div class="section-title">${t('modules')}</div>
      <div class="home-grid" id="app-grid">
        ${buildIconGrid(profile)}
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <div class="section-title">${t('recent_activity')}</div>
        <div id="recent-activity">
          <div class="skeleton skeleton-card" style="height:70px;border-radius:var(--r-md);margin-bottom:8px"></div>
          <div class="skeleton skeleton-card" style="height:70px;border-radius:var(--r-md)"></div>
        </div>
      </div>

      <!-- Specialists Chat -->
      <div class="section" id="specialists-section" style="display:none">
        <div class="section-title">${t('specialists')}</div>
        <div id="specialists-list" style="display:flex;flex-direction:column;gap:8px"></div>
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
  loadSpecialists(container);

  // Daily check-in (clients/athletes only)
  const profile = getUserProfile();
  if (['cliente','atleta'].includes(profile?.role)) {
    try {
      const { showDailyCheckin } = await import('../components/daily-checkin.js');
      await showDailyCheckin(profile.uid);
    } catch (e) { /* optional component */ }
  }

  // Chat send button
  container.querySelector('#btn-chat-send')?.addEventListener('click', () => sendChatMessage(container));
  container.querySelector('#chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(container); }
  });
}

// ── SVG icon definitions ──────────────────────
const SVG_ICONS = {
  entreno: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="6.5" y="4" width="3" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14.5" y="4" width="3" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8"/><line x1="9.5" y1="12" x2="14.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  alimentacion: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3C9.5 3 6 5 6 9C6 12.5 8 14.5 8 16V20C8 20.55 8.45 21 9 21H15C15.55 21 16 20.55 16 20V16C16 14.5 18 12.5 18 9C18 5 14.5 3 12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  biomedidas: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 17L8 12L12 16L17 9L21 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/></svg>`,
  salud: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 6 5 4 7.5 4C9.24 4 10.91 5 12 6.5C13.09 5 14.76 4 16.5 4C19 4 21 6 21 8.5C21 14.5 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  progreso: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  perfil: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  suscripcion: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  configuracion: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.8"/></svg>`,
  admin: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/></svg>`,
  fisio:         `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v1M12 15v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  psicologo:     `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  medico:        `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" stroke="currentColor" stroke-width="1.8"/><path d="M3 21v-1a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="13" x2="12" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="15" x2="14" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  nutricionista: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3C9.5 3 6 5 6 9C6 12.5 8 14.5 8 16V20C8 20.55 8.45 21 9 21H15C15.55 21 16 20.55 16 20V16C16 14.5 18 12.5 18 9C18 5 14.5 3 12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

// ── App icons grid ─────────────────────────────
function buildIconGrid(profile) {
  const icons = [
    { route: 'entreno',       svg: SVG_ICONS.entreno,       label: t('icon_entreno'),       cls: 'icon-entreno',       accent: 'var(--red)' },
    { route: 'alimentacion',  svg: SVG_ICONS.alimentacion,  label: t('icon_alimentacion'),  cls: 'icon-alimentacion',  accent: 'var(--cyan)' },
  ];

  // Especialistas asignados — mostrar icono de chat si el usuario los tiene asignados
  const specialistMap = [
    { key: 'assignedNutricionista', route: 'alimentacion', svg: SVG_ICONS.nutricionista, label: 'Nutricionista', cls: 'icon-nutricionista', accent: '#10b981' },
    { key: 'assignedFisio',         route: 'salud',         svg: SVG_ICONS.fisio,         label: 'Fisio',         cls: 'icon-fisio',         accent: '#3b82f6' },
    { key: 'assignedPsicologo',     route: 'salud',         svg: SVG_ICONS.psicologo,     label: 'Psicólogo',     cls: 'icon-psicologo',     accent: '#8b5cf6' },
    { key: 'assignedMedico',        route: 'salud',         svg: SVG_ICONS.medico,        label: 'Médico',        cls: 'icon-medico',        accent: '#ef4444' },
  ];
  const clientRoles = ['cliente', 'atleta', 'basico'];
  if (clientRoles.includes(profile?.role)) {
    specialistMap.forEach(sp => {
      if (profile?.[sp.key]) icons.push(sp);
    });
  }

  icons.push(
    { route: 'suscripcion',   svg: SVG_ICONS.suscripcion,   label: t('icon_suscripcion'),   cls: 'icon-suscripcion',   accent: '#f59e0b' },
    { route: 'configuracion', svg: SVG_ICONS.configuracion, label: t('icon_configuracion'), cls: 'icon-configuracion', accent: '#6b7280' },
  );

  const staffRoles = ['admin','coach','medico','fisio','psicologo','nutricionista'];
  if (staffRoles.includes(profile?.role)) {
    icons.push({ route: 'admin', svg: SVG_ICONS.admin, label: 'Panel', cls: 'icon-admin', accent: 'var(--red)' });
  }

  return icons.map((item, i) => `
    <div class="app-icon card-appear stagger-${Math.min(i + 1, 8)}" data-route="${item.route}">
      <div class="app-icon-inner ${item.cls} glass-shimmer" style="--icon-accent:${item.accent}">
        ${item.svg}
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

    container.querySelector('#stat-workouts').textContent  = sessions.length;
    container.querySelector('#stat-streak').textContent    = `${streak}d`;
    container.querySelector('#stat-objectives').textContent = `${thisWeek.length}/${profile?.weeklyGoal || 3}`;
  } catch (e) {
    ['#stat-workouts','#stat-streak'].forEach(id => {
      const el = container.querySelector(id);
      if (el) el.textContent = '0';
    });
    const objEl = container.querySelector('#stat-objectives');
    if (objEl) objEl.textContent = `0/${profile?.weeklyGoal || 3}`;
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
      <div class="empty-icon"><img src="logotipo/jus W Logo/TGWL --07.png" alt="W" style="height:52px;width:52px;object-fit:contain;opacity:0.4"></div>
      <div class="empty-title">${t('no_workouts')}</div>
      <div class="empty-subtitle">${t('start_first')}</div>
    </div>
  `;
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ── Load assigned specialists ──────────────────
async function loadSpecialists(container) {
  const profile = getUserProfile();
  if (!profile?.uid) return;
  const section = container.querySelector('#specialists-section');
  const el = container.querySelector('#specialists-list');
  if (!el) return;

  // Check if user has any specialist assigned
  const fields = { coach: 'coach', medico: 'medico', fisio: 'fisio', psicologo: 'psicologo', nutricionista: 'nutricionista' };
  const assigned = Object.entries(fields).filter(([key]) => profile[`assigned${key.charAt(0).toUpperCase() + key.slice(1)}`]);

  if (!assigned.length) return;
  section.style.display = '';

  // Load specialist profiles
  const cards = await Promise.all(assigned.map(async ([key]) => {
    const uid = profile[`assigned${key.charAt(0).toUpperCase() + key.slice(1)}`];
    const label = translateRole(key);
    try {
      const snap = await db.collection('users').doc(uid).get();
      const sp = snap.data() || {};
      return { uid, label, name: sp.name || label, key };
    } catch { return { uid, label, name: label, key }; }
  }));

  el.innerHTML = cards.map(sp => `
    <div class="glass-card" style="padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer" data-sp-uid="${sp.uid}" data-sp-name="${sp.name}" data-sp-label="${sp.label}">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--red),var(--cyan));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">
        ${sp.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${sp.name}</div>
        <div style="font-size:12px;color:var(--color-text-muted)">${sp.label}</div>
      </div>
      <span style="font-size:12px;color:var(--cyan);font-weight:600">${t('message')}</span>
    </div>
  `).join('');

  el.querySelectorAll('[data-sp-uid]').forEach(card => {
    card.addEventListener('click', () => {
      openDirectChat({
        myUid:     profile.uid,
        myName:    profile.name || '',
        otherUid:  card.dataset.spUid,
        otherName: card.dataset.spName,
        otherRole: card.dataset.spLabel,
      });
    });
  });
}

async function loadChatMessages(container, myUid, otherUid) {
  const el = container.querySelector('#chat-messages');
  if (!el) return;
  const chatId = [myUid, otherUid].sort().join('_');
  try {
    const snap = await db.collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc').limit(20).get();
    el.innerHTML = snap.docs.map(doc => {
      const m = doc.data();
      const mine = m.senderId === myUid;
      return `<div style="display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'}">
        <div style="max-width:80%;padding:8px 12px;border-radius:${mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${mine ? 'var(--red)' : 'var(--glass-bg-strong)'};font-size:13px;color:var(--white)">${m.text}</div>
      </div>`;
    }).join('') || '<p style="font-size:12px;color:var(--color-text-muted);text-align:center">Inicia la conversación</p>';
    el.scrollTop = el.scrollHeight;
  } catch { el.innerHTML = '<p class="text-muted" style="font-size:12px">No se pudieron cargar los mensajes</p>'; }
}

async function sendChatMessage(container) {
  const profile = getUserProfile();
  const input = container.querySelector('#chat-input');
  const text = input?.value.trim();
  if (!text || !profile?.uid) return;

  const activeCard = container.querySelector('[data-sp-uid]');
  // find selected specialist via a flag
  const allCards = container.querySelectorAll('[data-sp-uid]');
  let otherUid = allCards[0]?.dataset.spUid;

  if (!otherUid) return;
  const chatId = [profile.uid, otherUid].sort().join('_');

  input.value = '';
  try {
    await db.collection('chats').doc(chatId).collection('messages').add({
      text,
      senderId: profile.uid,
      senderName: profile.name,
      createdAt: timestamp(),
    });
    loadChatMessages(container, profile.uid, otherUid);
  } catch (e) {
    input.value = text;
  }
}

function getMotivationPhrase() {
  const phrases = [
    t('motivation_1'), t('motivation_2'), t('motivation_3'),
    t('motivation_4'), t('motivation_5'), t('motivation_6'), t('motivation_7'),
  ];
  return phrases[new Date().getDay() % phrases.length];
}
