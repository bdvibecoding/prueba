/* ═══════════════════════════════════════════════
   TGWL — admin/staff-panel.js
   Unified Staff Panel (coach, medico, fisio, psicologo, nutricionista)
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, getInitials } from '../utils.js';
import { openSheet, closeSheet, confirm } from '../components/modal.js';
import { navigate } from '../router.js';
import { openDirectChat } from '../components/direct-chat.js';
import { t } from '../i18n.js';

// ── Lazy module loaders ─────────────────────────
async function getMenuCreator() {
  return import('./menu-creator.js');
}

async function getSupplementCreator() {
  return import('./supplement-creator.js');
}

// ── Role config (i18n-aware, built at call time) ─
function getRoleConfig() {
  return {
    coach: {
      icon:     '🏋️',
      title:    t('staff_coach_title'),
      subtitle: t('staff_coach_subtitle'),
      field:    'assignedCoach',
      action:   { label: t('staff_coach_action'), key: 'routines' },
    },
    medico: {
      icon:     '🩺',
      title:    t('staff_medico_title'),
      subtitle: t('staff_medico_subtitle'),
      field:    'assignedMedico',
      action:   { label: t('staff_medico_action'), key: 'health' },
    },
    fisio: {
      icon:     '🦴',
      title:    t('staff_fisio_title'),
      subtitle: t('staff_fisio_subtitle'),
      field:    'assignedFisio',
      action:   { label: t('staff_fisio_action'), key: 'health' },
    },
    psicologo: {
      icon:     '🧠',
      title:    t('staff_psicologo_title'),
      subtitle: t('staff_psicologo_subtitle'),
      field:    'assignedPsicologo',
      action:   { label: t('staff_psicologo_action'), key: 'notes' },
    },
    nutricionista: {
      icon:     '🥗',
      title:    t('staff_nutricionista_title'),
      subtitle: t('staff_nutricionista_subtitle'),
      field:    'assignedNutricionista',
      action:   { label: t('staff_nutricionista_action'), key: 'diet' },
    },
  };
}

// ── render ─────────────────────────────────────
export async function render(container) {
  const profile = getUserProfile();
  const role    = profile?.role || 'coach';
  const cfg     = getRoleConfig()[role] || getRoleConfig().coach;

  container.innerHTML = `
    <div class="page active" id="staff-page">
      <div style="padding:var(--page-pad)">

        <!-- Header -->
        <div class="page-header" style="align-items:flex-start">
          <div>
            <h2 class="page-title">${cfg.icon} ${cfg.title}</h2>
            <p class="page-subtitle">${cfg.subtitle}</p>
          </div>
          <button
            id="btn-client-view"
            style="
              padding:6px 12px;
              font-size:12px;
              background:transparent;
              border:1px solid var(--glass-border);
              border-radius:var(--radius-full);
              color:var(--color-text-muted);
              cursor:pointer;
              white-space:nowrap;
              flex-shrink:0;
              margin-top:2px;
            "
          >
            ${t('staff_client_view')}
          </button>
        </div>

        <!-- Quick stats -->
        <div class="quick-stats" id="staff-stats" style="margin-bottom:var(--space-md)">
          <div class="glass-card stat-card">
            <div class="stat-value" id="stat-clients">—</div>
            <div class="stat-label">${t('staff_clients')}</div>
          </div>
          <div class="glass-card stat-card">
            <div class="stat-value" id="stat-sessions-week">—</div>
            <div class="stat-label">${t('staff_sessions_week')}</div>
          </div>
        </div>

        <!-- Routine management (coach / admin only) -->
        ${role === 'coach' || role === 'admin' ? `
        <div class="section-title">${t('staff_routines_mgmt')}</div>
        <div class="settings-group" style="margin-bottom:var(--space-md)">
          <div class="settings-item" id="btn-create-routine" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.2)">📋</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_create_routine')}</div>
              <div class="settings-item-desc">${t('staff_create_routine_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-my-routines" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(25,249,249,0.1)">📚</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_my_routines')}</div>
              <div class="settings-item-desc">${t('staff_my_routines_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>
        ` : ''}

        <!-- Nutrition management (nutricionista only) -->
        ${role === 'nutricionista' ? `
        <div class="section-title">${t('staff_nutrition_mgmt')}</div>
        <div class="settings-group" style="margin-bottom:var(--space-md)">
          <div class="settings-item" id="btn-create-menu" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(34,197,94,0.15)">🥗</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_create_menu')}</div>
              <div class="settings-item-desc">${t('staff_create_menu_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-my-menus" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(34,197,94,0.1)">📋</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_my_menus')}</div>
              <div class="settings-item-desc">${t('staff_my_menus_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-create-suppl-nutri" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.15)">💊</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_create_suppl')}</div>
              <div class="settings-item-desc">${t('staff_create_suppl_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-my-suppls-nutri" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.1)">📚</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_my_suppls')}</div>
              <div class="settings-item-desc">${t('staff_my_suppls_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>
        ` : ''}

        <!-- Supplement management (coach only) -->
        ${role === 'coach' ? `
        <div class="section-title">${t('staff_suppl_mgmt')}</div>
        <div class="settings-group" style="margin-bottom:var(--space-md)">
          <div class="settings-item" id="btn-create-suppl-coach" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.15)">💊</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_create_suppl')}</div>
              <div class="settings-item-desc">${t('staff_create_suppl_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-my-suppls-coach" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.1)">📚</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('staff_my_suppls')}</div>
              <div class="settings-item-desc">${t('staff_my_suppls_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>
        ` : ''}

        <!-- Clients section -->
        <div class="section-title">${t('staff_my_clients')}</div>
        <div id="staff-clients-list">
          <div class="overlay-spinner"><div class="spinner-sm"></div></div>
        </div>

        <!-- Menus list panel (rendered inline when "Mis planes" is clicked) -->
        <div id="staff-menus-list" style="display:none"></div>

        <!-- Supplements list panel (rendered inline when "Mis protocolos" is clicked) -->
        <div id="staff-suppls-list" style="display:none"></div>

      </div>
    </div>
  `;
}

// ── init ───────────────────────────────────────
export async function init(container) {
  const profile = getUserProfile();
  const role    = profile?.role || 'coach';

  container.querySelector('#btn-client-view')?.addEventListener('click', () => navigate('home'));

  // Routine management buttons (coach / admin only)
  if (role === 'coach' || role === 'admin') {
    const { openRoutineCreator, openRoutinesList } = await import('./routine-creator.js');

    container.querySelector('#btn-create-routine')?.addEventListener('click', () => {
      openRoutineCreator();
    });

    container.querySelector('#btn-my-routines')?.addEventListener('click', () => {
      openRoutinesList(container);
    });
  }

  // Nutrition plan management (nutricionista only)
  if (role === 'nutricionista') {
    container.querySelector('#btn-create-menu')?.addEventListener('click', async () => {
      const { openMenuCreator } = await getMenuCreator();
      openMenuCreator();
    });

    container.querySelector('#btn-my-menus')?.addEventListener('click', async () => {
      const listEl = container.querySelector('#staff-menus-list');
      if (!listEl) return;
      // Toggle: hide if already visible, show otherwise
      if (listEl.style.display !== 'none') {
        listEl.style.display = 'none';
        return;
      }
      listEl.style.display = 'block';
      const { openMenusList } = await getMenuCreator();
      await openMenusList(listEl);
    });

    container.querySelector('#btn-create-suppl-nutri')?.addEventListener('click', async () => {
      const { openSupplementCreator } = await getSupplementCreator();
      openSupplementCreator();
    });

    container.querySelector('#btn-my-suppls-nutri')?.addEventListener('click', async () => {
      const listEl = container.querySelector('#staff-suppls-list');
      if (!listEl) return;
      if (listEl.style.display !== 'none') {
        listEl.style.display = 'none';
        return;
      }
      listEl.style.display = 'block';
      const { openSupplementsList } = await getSupplementCreator();
      await openSupplementsList(listEl);
    });
  }

  // Supplement management (coach only)
  if (role === 'coach') {
    container.querySelector('#btn-create-suppl-coach')?.addEventListener('click', async () => {
      const { openSupplementCreator } = await getSupplementCreator();
      openSupplementCreator();
    });

    container.querySelector('#btn-my-suppls-coach')?.addEventListener('click', async () => {
      const listEl = container.querySelector('#staff-suppls-list');
      if (!listEl) return;
      if (listEl.style.display !== 'none') {
        listEl.style.display = 'none';
        return;
      }
      listEl.style.display = 'block';
      const { openSupplementsList } = await getSupplementCreator();
      await openSupplementsList(listEl);
    });
  }

  await loadMyClients(container, profile);
}

// ── Load assigned clients ──────────────────────
async function loadMyClients(container, profile) {
  const el  = container.querySelector('#staff-clients-list');
  const role = profile?.role || 'coach';
  const cfg  = getRoleConfig()[role] || getRoleConfig().coach;

  try {
    const snap = await db.collection('users')
      .where(cfg.field, '==', profile.uid)
      .limit(50)
      .get();

    // Update stat
    const statEl = container.querySelector('#stat-clients');
    if (statEl) statEl.textContent = snap.size;

    if (snap.empty) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-title">${t('staff_no_clients')}</div>
          <div class="empty-subtitle">${t('staff_no_clients_sub')}</div>
        </div>`;
      container.querySelector('#stat-sessions-week').textContent = '0';
      return;
    }

    const clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Count sessions this week (coach only — uses workoutSessions)
    let sessionsThisWeek = 0;
    if (role === 'coach') {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekResults = await Promise.all(
          clients.map(c =>
            collections.workoutSessions(c.uid || c.id)
              .where('startTime', '>=', weekAgo)
              .get()
              .then(s => s.size)
              .catch(() => 0)
          )
        );
        sessionsThisWeek = weekResults.reduce((a, b) => a + b, 0);
      } catch { /* ignore */ }
    }
    const sessWkEl = container.querySelector('#stat-sessions-week');
    if (sessWkEl) sessWkEl.textContent = sessionsThisWeek;

    el.innerHTML = clients.map(client => buildClientCard(client, cfg)).join('');

    // Wire card events
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid    = btn.closest('[data-uid]')?.dataset.uid;
        const action = btn.dataset.action;
        const client = clients.find(c => (c.uid || c.id) === uid);
        if (!client) return;
        handleClientAction(action, client, profile);
      });
    });

    el.querySelectorAll('[data-note-uid]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid    = btn.dataset.noteUid;
        const client = clients.find(c => (c.uid || c.id) === uid);
        if (client) openNoteSheet(client, profile);
      });
    });

    el.querySelectorAll('[data-chat-uid]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDirectChat({
          myUid:     profile.uid,
          myName:    profile.name || '',
          otherUid:  btn.dataset.chatUid,
          otherName: btn.dataset.chatName,
          otherRole: t('staff_client_label'),
        });
      });
    });

  } catch (e) {
    el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('staff_error_clients')}: ${e.message}</p>`;
  }
}

// ── Build client card HTML ─────────────────────
function buildClientCard(client, cfg) {
  const uid      = client.uid || client.id;
  const initials = getInitials(client.name || '?');
  const lastSeen = client.lastLoginAt
    ? formatDate(client.lastLoginAt?.toDate?.() || new Date(client.lastLoginAt))
    : '—';

  return `
    <div
      class="glass-card"
      data-uid="${uid}"
      style="
        padding:var(--space-md);
        margin-bottom:var(--space-sm);
        display:flex;
        align-items:center;
        gap:var(--space-md);
      "
    >
      <!-- Avatar -->
      <div
        class="admin-user-avatar"
        style="
          width:44px;height:44px;
          min-width:44px;
          border-radius:50%;
          background:linear-gradient(135deg,var(--color-primary),var(--cyan-dim));
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:15px;color:var(--white);
          flex-shrink:0;
        "
      >${initials}</div>

      <!-- Info -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${client.name || t('staff_client_label')}
        </div>
        <div class="text-muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${client.email || ''}
        </div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">
          ${t('staff_last_session')}${lastSeen}
        </div>
        <!-- Action buttons row -->
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <button
            class="chip"
            data-action="${cfg.action.key}"
            data-uid="${uid}"
            style="font-size:11px;padding:4px 10px;cursor:pointer"
          >${cfg.action.label}</button>
          <button
            class="chip"
            data-note-uid="${uid}"
            style="font-size:11px;padding:4px 10px;cursor:pointer;border-color:var(--cyan-dim);color:var(--cyan)"
          >${t('staff_add_note')}</button>
          <button
            class="chip"
            data-chat-uid="${uid}"
            data-chat-name="${client.name || ''}"
            style="font-size:11px;padding:4px 10px;cursor:pointer;border-color:rgba(34,197,94,0.4);color:#4ade80"
          >${t('staff_chat')}</button>
        </div>
      </div>

      <!-- Status badge -->
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        ${client.subscriptionStatus && client.subscriptionStatus !== 'free'
          ? `<span class="badge badge-cyan" style="font-size:10px">${client.subscriptionStatus}</span>`
          : ''}
        ${client.experience
          ? `<span class="badge badge-gray" style="font-size:10px">${client.experience}</span>`
          : ''}
      </div>
    </div>
  `;
}

// ── Handle role-specific actions ───────────────
function handleClientAction(action, client, profile) {
  switch (action) {
    case 'routines':
      openRoutinesSheet(client, profile);
      break;
    case 'health':
      openHealthSheet(client);
      break;
    case 'notes':
      openNoteSheet(client, profile);
      break;
    case 'diet':
      openDietSheet(client);
      break;
    default:
      break;
  }
}

// ── Coach: Routines sheet ──────────────────────
async function openRoutinesSheet(client, profile) {
  const uid  = client.uid || client.id;
  const html = `
    <h4 style="margin-bottom:4px">${client.name}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">${t('staff_assigned_routine')}</p>
    <div id="sheet-routines-list"><div class="spinner-sm"></div></div>
    <button class="btn-accent btn-full" id="btn-assign-routine" style="margin-top:var(--space-md)">
      ${t('staff_assign_new_routine')}
    </button>
  `;
  openSheet(html);
  const sc = document.getElementById('sheet-content');
  await loadSheetRoutines(sc, uid);
  sc.querySelector('#btn-assign-routine')?.addEventListener('click', () => openAssignRoutineSheet(uid));
}

async function loadSheetRoutines(sc, uid) {
  const el = sc.querySelector('#sheet-routines-list');
  if (!el) return;
  try {
    const snap = await collections.assignments(uid).orderBy('assignedAt', 'desc').limit(20).get();
    if (snap.empty) {
      el.innerHTML = `<p class="text-muted">${t('staff_no_routines')}</p>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div style="
          display:flex;align-items:center;gap:10px;
          padding:10px 0;
          border-bottom:1px solid rgba(255,255,255,0.06)
        ">
          <span style="font-size:18px">💪</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${d.name || d.routineId || t('admin_routine_label')}</div>
            <div class="text-muted" style="font-size:11px">
              ${t('staff_assigned_date')}${formatDate(d.assignedAt?.toDate?.() || d.assignedAt)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }
}

async function openAssignRoutineSheet(clientUid) {
  let routineSnap;
  try {
    routineSnap = await db.collection('routines').limit(30).get();
  } catch {
    toast(t('staff_error_routines'), 'error');
    return;
  }
  const routines = routineSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const html = `
    <h4 style="margin-bottom:var(--space-md)">${t('staff_assign_routine')}</h4>
    ${routines.length
      ? routines.map(r => `
          <div
            class="glass-card"
            data-rid="${r.id}"
            data-rname="${r.name || t('admin_routine_label')}"
            style="
              display:flex;align-items:center;gap:10px;
              padding:var(--space-sm) var(--space-md);
              margin-bottom:var(--space-sm);
              cursor:pointer;
            "
          >
            <span style="font-size:20px">💪</span>
            <div style="flex:1">
              <div style="font-weight:700">${r.name || t('admin_routine_label')}</div>
              <div class="text-muted" style="font-size:12px">${r.exercises?.length || 0} ${t('admin_exercises')}</div>
            </div>
            <span class="badge badge-cyan">${t('assign')}</span>
          </div>
        `).join('')
      : `<p class="text-muted">${t('staff_no_routines_yet')}</p>`
    }
  `;

  openSheet(html);
  document.getElementById('sheet-content')?.querySelectorAll('[data-rid]').forEach(card => {
    card.addEventListener('click', async () => {
      try {
        const profile = getUserProfile();
        await collections.assignments(clientUid).add({
          routineId:  card.dataset.rid,
          name:       card.dataset.rname,
          assignedBy: profile?.uid,
          assignedAt: timestamp(),
          createdAt:  timestamp(),
        });
        toast(t('staff_routine_assigned'), 'success');
        closeSheet();
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  });
}

// ── Medico / Fisio: Health sheet (placeholder) ──
function openHealthSheet(client) {
  const html = `
    <h4 style="margin-bottom:4px">${client.name}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">${t('staff_health_title')}</p>
    <div
      class="glass-card glass-card-accent"
      style="padding:var(--space-md);text-align:center;margin-top:var(--space-lg)"
    >
      <div style="font-size:32px;margin-bottom:8px">🩺</div>
      <div style="font-weight:700;margin-bottom:4px">${t('staff_health_desc')}</div>
      <div class="text-muted" style="font-size:13px;margin-bottom:var(--space-md)">
        ${t('staff_health_full')}
      </div>
    </div>
  `;
  openSheet(html);
}

// ── Psicologo: Notes sheet ─────────────────────
async function openPsicologoNotesSheet(client) {
  const uid  = client.uid || client.id;
  const html = `
    <h4 style="margin-bottom:4px">${client.name}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">${t('staff_psi_notes_title')}</p>
    <div id="psi-notes-list"><div class="spinner-sm"></div></div>
  `;
  openSheet(html);
  const sc = document.getElementById('sheet-content');
  try {
    const snap = await collections.notes(uid)
      .where('type', '==', 'psicologo')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const el = sc.querySelector('#psi-notes-list');
    if (!el) return;
    if (snap.empty) {
      el.innerHTML = `<p class="text-muted">${t('staff_no_notes')}</p>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm)">
          <div style="font-size:12px;color:var(--cyan);margin-bottom:4px">
            ${formatDate(d.createdAt?.toDate?.() || d.createdAt)}
          </div>
          <div style="font-size:14px;line-height:1.5">${d.text || ''}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    const el = sc.querySelector('#psi-notes-list');
    if (el) el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }
}

// ── Nutricionista: Diet sheet (placeholder) ────
function openDietSheet(client) {
  const html = `
    <h4 style="margin-bottom:4px">${client.name}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">${t('staff_diet_title')}</p>
    <div
      class="glass-card glass-card-accent"
      style="padding:var(--space-md);text-align:center;margin-top:var(--space-lg)"
    >
      <div style="font-size:32px;margin-bottom:8px">🥗</div>
      <div style="font-weight:700;margin-bottom:4px">${t('staff_diet_desc')}</div>
      <div class="text-muted" style="font-size:13px;margin-bottom:var(--space-md)">
        ${t('staff_diet_full')}
      </div>
    </div>
  `;
  openSheet(html);
}

// ── Universal: Nueva Nota sheet ────────────────
function openNoteSheet(client, profile) {
  const uid  = client.uid || client.id;
  const role = profile?.role || 'coach';

  const html = `
    <h4 style="margin-bottom:4px">${t('staff_note_title')}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md);font-size:13px">
      ${t('staff_note_for')}<strong>${client.name}</strong>
    </p>
    <textarea
      id="staff-note-text"
      class="input-solo"
      rows="5"
      placeholder="${t('staff_note_placeholder')}"
      style="
        padding:var(--space-md);
        width:100%;
        resize:vertical;
        margin-bottom:var(--space-md);
        background:var(--glass-bg);
        border:1px solid var(--glass-border);
        border-radius:var(--radius-md);
        color:var(--color-text);
        font-size:14px;
        line-height:1.6;
        font-family:var(--font-sans);
      "
    ></textarea>
    <button class="btn-primary btn-full" id="btn-save-note">${t('staff_save_note')}</button>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  sc.querySelector('#btn-save-note')?.addEventListener('click', async () => {
    const text = sc.querySelector('#staff-note-text')?.value?.trim();
    if (!text) {
      toast(t('staff_note_empty'), 'warning');
      return;
    }
    try {
      await collections.notes(uid).add({
        text,
        type:      role,
        authorUid: profile?.uid,
        createdAt: timestamp(),
      });
      toast(t('staff_note_saved'), 'success');
      closeSheet();
    } catch (e) {
      toast(t('staff_note_error') + ': ' + e.message, 'error');
    }
  });
}
