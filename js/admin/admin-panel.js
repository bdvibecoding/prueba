/* ═══════════════════════════════════════════════
   TGWL — admin/admin-panel.js
   Full Admin Panel — User, Role & Permission Management
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, translateRole, getInitials } from '../utils.js';
import { openModal, closeModal, confirm, openSheet, closeSheet } from '../components/modal.js';
import { t } from '../i18n.js';

// Role badge colors
const ROLE_BADGE_COLORS = {
  admin:         'background:#ef4444;color:#fff',
  coach:         'background:#06b6d4;color:#fff',
  medico:        'background:#22c55e;color:#fff',
  fisio:         'background:#3b82f6;color:#fff',
  psicologo:     'background:#a855f7;color:#fff',
  nutricionista: 'background:#f97316;color:#fff',
  atleta:        'background:#eab308;color:#000',
  cliente:       'background:#6b7280;color:#fff',
};

function roleBadgeHtml(role) {
  const style = ROLE_BADGE_COLORS[role] || 'background:#6b7280;color:#fff';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:var(--r-full);font-size:10px;font-weight:700;${style}">${translateRole(role)}</span>`;
}

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="admin-page" style="display:flex;flex-direction:column;height:100%;overflow:hidden;padding:0">

      <!-- ── Main tab bar ── -->
      <div style="
        display:flex; border-bottom:1px solid var(--glass-border);
        flex-shrink:0; background:var(--color-bg); padding:0 var(--page-pad);
      ">
        <button class="admin-main-tab active" data-main-tab="users"
          style="flex:1;padding:12px 6px;background:none;border:none;border-bottom:2.5px solid var(--cyan);
                 font-size:13px;font-weight:700;color:var(--cyan);cursor:pointer;font-family:inherit">
          👥 Usuarios
        </button>
        <button class="admin-main-tab" data-main-tab="hub"
          style="flex:1;padding:12px 6px;background:none;border:none;border-bottom:2.5px solid transparent;
                 font-size:13px;font-weight:700;color:var(--color-text-muted);cursor:pointer;font-family:inherit">
          💬 Hub Clientes
        </button>
        <button class="admin-main-tab" data-main-tab="routines"
          style="flex:1;padding:12px 6px;background:none;border:none;border-bottom:2.5px solid transparent;
                 font-size:13px;font-weight:700;color:var(--color-text-muted);cursor:pointer;font-family:inherit">
          💪 Rutinas
        </button>
        <button class="admin-main-tab" data-main-tab="diets"
          style="flex:1;padding:12px 6px;background:none;border:none;border-bottom:2.5px solid transparent;
                 font-size:13px;font-weight:700;color:var(--color-text-muted);cursor:pointer;font-family:inherit">
          🥗 Dietas
        </button>
      </div>

      <!-- ── Users panel ── -->
      <div id="admin-tab-users" style="flex:1;overflow-y:auto;padding:var(--page-pad);padding-bottom:var(--nav-clearance, 152px);display:flex;flex-direction:column">

        <div class="page-header">
          <div>
            <h2 class="page-title">🔑 ${t('admin_title')}</h2>
            <p class="page-subtitle">${t('admin_subtitle')}</p>
          </div>
          <button class="btn-primary" id="btn-invite-user" style="padding:10px 16px;font-size:13px">${t('invite')}</button>
        </div>

        <!-- Stats -->
        <div class="quick-stats" id="admin-stats">
          <div class="glass-card stat-card"><div class="stat-value" id="stat-total">—</div><div class="stat-label">${t('admin_stats_users')}</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-staff">—</div><div class="stat-label">${t('admin_stats_staff')}</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-clients">—</div><div class="stat-label">${t('admin_stats_clients')}</div></div>
        </div>

        <!-- Search -->
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <span class="input-icon">🔍</span>
          <input type="search" id="user-search" placeholder="${t('search_users')}" autocomplete="off">
        </div>

        <!-- Role Filter -->
        <div class="h-scroll" style="margin-bottom:var(--space-md)">
          <button class="chip active" data-filter="all">${t('all')}</button>
          <button class="chip" data-filter="admin">${translateRole('admin')}</button>
          <button class="chip" data-filter="coach">${translateRole('coach')}</button>
          <button class="chip" data-filter="medico">${translateRole('medico')}</button>
          <button class="chip" data-filter="fisio">${translateRole('fisio')}</button>
          <button class="chip" data-filter="psicologo">${translateRole('psicologo')}</button>
          <button class="chip" data-filter="nutricionista">${translateRole('nutricionista')}</button>
          <button class="chip" data-filter="atleta">${translateRole('atleta')}</button>
          <button class="chip" data-filter="cliente">${translateRole('cliente')}</button>
        </div>

        <!-- Pending activation section -->
        <div id="pending-access-section" style="
          margin-bottom:var(--space-md);
          border:1px solid rgba(234,179,8,0.3);
          border-radius:var(--r-md);
          padding:var(--space-md);
          background:rgba(234,179,8,0.05)
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:13px;font-weight:700;color:#eab308">
              ⏳ ${t('admin_pending_title')}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <button id="btn-refresh-pending" title="Actualizar" style="
                background:none;border:none;cursor:pointer;color:var(--color-text-muted);
                font-size:14px;padding:2px 4px;line-height:1
              ">↺</button>
              <span id="pending-count-badge" style="
                font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--r-full);
                background:rgba(234,179,8,0.2);color:#eab308;border:1px solid rgba(234,179,8,0.3)
              ">0</span>
            </div>
          </div>
          <p style="font-size:11px;color:var(--color-text-muted);margin:0 0 var(--space-sm)">
            ${t('admin_pending_desc')}
          </p>
          <div id="pending-list">
            <!-- filled by renderPendingSection() -->
          </div>
        </div>

        <!-- Admin elevation section -->
        <div id="admin-elevation-section" style="
          margin-bottom:var(--space-md);
          border:1px solid rgba(148,10,10,0.4);
          border-radius:var(--r-md);
          padding:var(--space-md);
          background:rgba(148,10,10,0.08)
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:13px;font-weight:700;color:#ef4444">
              🔑 ${t('admin_current_admins')}
            </div>
            <span id="admin-slot-badge" style="
              font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--r-full);
              background:rgba(148,10,10,0.3);color:#ef4444;border:1px solid rgba(148,10,10,0.4)
            ">— / 3</span>
          </div>
          <p style="font-size:11px;color:var(--color-text-muted);margin:0 0 var(--space-sm)">
            ${t('admin_current_admins_desc')}
          </p>
          <div id="admin-list-section">
            <div class="spinner-sm"></div>
          </div>
        </div>

        <!-- Users List -->
        <div id="users-list">
          <div class="overlay-spinner"><div class="spinner-sm"></div></div>
        </div>

        <!-- Spacer: rellena altura restante cuando el contenido es corto -->
        <div style="flex:1 1 auto;min-height:0" aria-hidden="true"></div>
      </div>

      <!-- ── Hub Clientes panel (lazy-loaded) ── -->
      <div id="admin-tab-hub" style="flex:1;display:none;overflow:hidden;min-height:0">

      <!-- ── Rutinas panel ── -->
      </div><div id="admin-tab-routines" style="flex:1;display:none;overflow-y:auto;padding:var(--page-pad);padding-bottom:var(--nav-clearance, 152px);flex-direction:column">
        <div class="page-header" style="margin-bottom:var(--space-lg)">
          <div>
            <h2 class="page-title">💪 Mis Rutinas</h2>
            <p class="page-subtitle">Crea, edita y asigna rutinas a tus clientes</p>
          </div>
          <button class="btn-primary" id="btn-new-routine-admin" style="padding:10px 16px;font-size:13px">+ Nueva rutina</button>
        </div>
        <div id="admin-routines-cards"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        <div style="flex:1 1 auto;min-height:0" aria-hidden="true"></div>
      </div>

      <!-- ── Dietas panel ── -->
      <div id="admin-tab-diets" style="flex:1;display:none;overflow-y:auto;padding:var(--page-pad);padding-bottom:var(--nav-clearance, 152px);flex-direction:column">
        <div class="page-header" style="margin-bottom:var(--space-lg)">
          <div>
            <h2 class="page-title">🥗 Mis Dietas</h2>
            <p class="page-subtitle">Crea, edita y asigna dietas a tus clientes</p>
          </div>
          <button class="btn-primary" id="btn-new-diet-admin" style="padding:10px 16px;font-size:13px">+ Nueva dieta</button>
        </div>
        <div id="admin-diets-cards"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        <div style="flex:1 1 auto;min-height:0" aria-hidden="true"></div>
      </div>

    </div>
  `;
}

export async function init(container) {
  let allUsers = [];
  let allInvitations = [];
  let currentFilter = 'all';
  let searchTerm = '';
  let _hubLoaded = false;
  let _hubModule = null;
  let _unsubscribeUsers = null;

  // ── Main tab switching ───────────────────────
  container.querySelectorAll('.admin-main-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      container.querySelectorAll('.admin-main-tab').forEach(t => {
        t.classList.remove('active');
        t.style.color = 'var(--color-text-muted)';
        t.style.borderBottomColor = 'transparent';
      });
      tab.classList.add('active');
      tab.style.color = 'var(--cyan)';
      tab.style.borderBottomColor = 'var(--cyan)';

      const which = tab.dataset.mainTab;
      // Los tabs scrollables usan flex-column para el spacer que rellena altura.
      // Hub usa flex row para su layout interno.
      container.querySelector('#admin-tab-users'   ).style.display = which === 'users'    ? 'flex' : 'none';
      container.querySelector('#admin-tab-hub'     ).style.display = which === 'hub'      ? 'flex' : 'none';
      container.querySelector('#admin-tab-routines').style.display = which === 'routines' ? 'flex' : 'none';
      container.querySelector('#admin-tab-diets'   ).style.display = which === 'diets'    ? 'flex' : 'none';

      if (which === 'routines') loadAdminRoutines(container);
      if (which === 'diets') loadAdminDiets(container);

      // Lazy-load the specialist hub the first time
      if (which === 'hub' && !_hubLoaded) {
        _hubLoaded = true;
        const hubContainer = container.querySelector('#admin-tab-hub');
        try {
          _hubModule = await import('./specialist-hub.js');
          await _hubModule.render(hubContainer, { embedded: true });
          await _hubModule.init(hubContainer, { embedded: true });
        } catch (e) {
          hubContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar hub</div><div class="empty-subtitle">${e.message}</div></div>`;
        }
      }
    });
  });

  // Must be declared before loadUsers() calls updateStats()
  const STAFF_ROLES = ['admin', 'coach', 'medico', 'fisio', 'psicologo', 'nutricionista'];

  // Load users + admin section
  await loadUsers();
  try {
    const invSnap = await db.collection('invitations')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    allInvitations = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn('Could not load invitations (index may be missing, retrying without orderBy):', e.message);
    try {
      const invSnap = await db.collection('invitations').where('status', '==', 'pending').get();
      allInvitations = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e2) {
      console.warn('Could not load invitations:', e2.message);
    }
  }
  renderAdminSection(allUsers);
  renderPendingSection(allUsers, allInvitations);

  // Search
  const searchInput = container.querySelector('#user-search');
  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderUsersList(filterUsers(allUsers, currentFilter, searchTerm));
  });

  // Role filters
  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderUsersList(filterUsers(allUsers, currentFilter, searchTerm));
    });
  });

  // Invite user button
  container.querySelector('#btn-invite-user')?.addEventListener('click', openInviteUserModal);

  // Refresh pending section manually
  container.querySelector('#btn-refresh-pending')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-refresh-pending');
    if (btn) { btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; }
    // Reload invitations
    try {
      const invSnap = await db.collection('invitations').where('status', '==', 'pending').get();
      allInvitations = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) { console.warn(e); }
    renderPendingSection(allUsers, allInvitations);
    if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
  });

  // ── Load all users ──────────────────────────
  async function loadUsers() {
    return new Promise((resolve) => {
      // Unsubscribe previous listener if any
      if (_unsubscribeUsers) _unsubscribeUsers();

      _unsubscribeUsers = db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .onSnapshot(snap => {
          allUsers = snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
          updateStats(allUsers);
          renderUsersList(filterUsers(allUsers, currentFilter, searchTerm));
          renderAdminSection(allUsers);
          renderPendingSection(allUsers, allInvitations);
          resolve();
        }, e => {
          container.querySelector('#users-list').innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
          resolve();
        });
    });
  }

  function filterUsers(users, filter, search) {
    return users.filter(u => {
      const matchFilter = filter === 'all' || u.role === filter;
      const matchSearch = !search || u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
      return matchFilter && matchSearch;
    });
  }

  function updateStats(users) {
    container.querySelector('#stat-total').textContent = users.length;
    container.querySelector('#stat-staff').textContent = users.filter(u => STAFF_ROLES.includes(u.role)).length;
    container.querySelector('#stat-clients').textContent = users.filter(u => u.role === 'cliente' || u.role === 'atleta').length;
  }

  function renderAdminSection(users) {
    const admins = users.filter(u => u.role === 'admin');
    const count  = admins.length;
    const MAX    = 3;

    const badge = container.querySelector('#admin-slot-badge');
    if (badge) {
      badge.textContent = `${count} / ${MAX}`;
      badge.style.background = count >= MAX ? 'rgba(148,10,10,0.5)' : 'rgba(25,249,249,0.1)';
      badge.style.color       = count >= MAX ? '#ef4444' : 'var(--cyan)';
      badge.style.borderColor = count >= MAX ? 'rgba(148,10,10,0.6)' : 'rgba(25,249,249,0.3)';
    }

    const el = container.querySelector('#admin-list-section');
    if (!el) return;

    if (!admins.length) {
      el.innerHTML = `<p style="font-size:12px;color:var(--color-text-muted);margin:0">${t('admin_no_admins')}</p>`;
      return;
    }

    el.innerHTML = admins.map(u => `
      <div style="
        display:flex;align-items:center;gap:10px;
        padding:8px 10px;border-radius:var(--r-sm);
        background:rgba(255,255,255,0.04);
        margin-bottom:6px
      ">
        <div style="
          width:30px;height:30px;border-radius:50%;flex-shrink:0;overflow:hidden;
          ${u.photoURL ? '' : 'background:#940a0a;color:#fff;'}
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700
        ">${u.photoURL ? `<img src="${u.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover">` : (getInitials(u.name) || '?')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${u.name || t('admin_no_name')}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${u.email || ''}
          </div>
        </div>
        <span style="
          font-size:10px;font-weight:700;padding:2px 6px;border-radius:var(--r-full);
          background:#ef4444;color:#fff;flex-shrink:0
        ">Admin</span>
      </div>
    `).join('');
  }

  function renderPendingSection(users, invitations = []) {
    // Type A: registered users without access
    const pendingUsers = users.filter(u =>
      ['cliente', 'atleta'].includes(u.role) &&
      u.accessGranted !== true &&
      (!u.subscriptionStatus || u.subscriptionStatus === 'free')
    );

    // Type B: invitations sent but not yet registered
    const pendingInvites = invitations.filter(inv => inv.status === 'pending');

    const total = pendingUsers.length + pendingInvites.length;

    const badge = container.querySelector('#pending-count-badge');
    if (badge) badge.textContent = total;

    // Always show the section so admins know it exists
    const section = container.querySelector('#pending-access-section');
    if (section) section.style.display = '';

    const el = container.querySelector('#pending-list');
    if (!el) return;

    if (total === 0) {
      el.innerHTML = `<p style="font-size:12px;color:var(--color-text-muted);margin:0;text-align:center;padding:var(--space-sm) 0">
        ${t('admin_no_pending') || 'No hay pendientes'}
      </p>`;
      return;
    }

    // Render pending invitations (not registered yet)
    const invitesHtml = pendingInvites.map(inv => `
      <div style="
        display:flex;align-items:center;gap:10px;
        padding:8px 10px;border-radius:var(--r-sm);
        background:rgba(255,255,255,0.03);
        border:1px solid rgba(234,179,8,0.15);
        margin-bottom:6px
      ">
        <div style="
          width:32px;height:32px;border-radius:50%;flex-shrink:0;
          background:rgba(234,179,8,0.15);color:#eab308;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;border:1px solid rgba(234,179,8,0.3)
        ">✉️</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${inv.email || '—'}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted)">
            ${t('admin_invite_sent') || 'Invitación enviada'} · ${inv.role || 'cliente'}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn-approve-invite" data-invid="${inv.id}" style="
            font-size:11px;font-weight:700;padding:4px 10px;border-radius:var(--r-sm);
            background:rgba(25,249,249,0.1);color:var(--cyan);
            border:1px solid rgba(25,249,249,0.3);cursor:pointer;white-space:nowrap
          ">${t('admin_invite_approve') || '✓ Aprobar'}</button>
          <button class="btn-reject-invite" data-invid="${inv.id}" style="
            font-size:11px;font-weight:700;padding:4px 10px;border-radius:var(--r-sm);
            background:rgba(148,10,10,0.15);color:#ef4444;
            border:1px solid rgba(148,10,10,0.3);cursor:pointer;white-space:nowrap
          ">${t('admin_invite_reject') || '✗ Rechazar'}</button>
        </div>
      </div>
    `).join('');

    // Render registered users without access
    const usersHtml = pendingUsers.map(u => `
      <div style="
        display:flex;align-items:center;gap:10px;
        padding:8px 10px;border-radius:var(--r-sm);
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(25,249,249,0.1);
        margin-bottom:6px
      ">
        <div style="
          width:32px;height:32px;border-radius:50%;flex-shrink:0;overflow:hidden;
          ${u.photoURL ? '' : 'background:rgba(25,249,249,0.1);color:var(--cyan);'}
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;border:1px solid rgba(25,249,249,0.2)
        ">${u.photoURL ? `<img src="${u.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover">` : (getInitials(u.name) || '?')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${u.name || u.email || '—'}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted)">
            ${u.email || ''} · ${u.role}
          </div>
        </div>
        <button class="btn-grant-access" data-uid="${u.uid || u.id}" style="
          font-size:11px;font-weight:700;padding:4px 10px;border-radius:var(--r-sm);
          background:rgba(25,249,249,0.1);color:var(--cyan);
          border:1px solid rgba(25,249,249,0.3);cursor:pointer;
          white-space:nowrap;flex-shrink:0
        ">${t('admin_grant_access') || 'Activar'}</button>
      </div>
    `).join('');

    el.innerHTML = invitesHtml + usersHtml;

    // Approve invitation
    el.querySelectorAll('.btn-approve-invite').forEach(btn => {
      btn.addEventListener('click', async () => {
        const invId = btn.dataset.invid;
        btn.disabled = true;
        try {
          await db.collection('invitations').doc(invId).update({ status: 'approved' });
          // Remove from local list so it disappears immediately
          allInvitations = allInvitations.filter(i => i.id !== invId);
          renderPendingSection(allUsers, allInvitations);
          toast(t('admin_invite_approved') || '✅ Aprobado — cuando se registre con su link tendrá acceso automáticamente', 'success');
        } catch(e) {
          console.error(e);
          toast('Error al aprobar', 'error');
          btn.disabled = false;
        }
      });
    });

    // Reject invitation
    el.querySelectorAll('.btn-reject-invite').forEach(btn => {
      btn.addEventListener('click', async () => {
        const invId = btn.dataset.invid;
        btn.disabled = true;
        try {
          await db.collection('invitations').doc(invId).update({ status: 'rejected' });
          allInvitations = allInvitations.filter(i => i.id !== invId);
          renderPendingSection(allUsers, allInvitations);
          toast(t('admin_invite_rejected') || 'Invitación rechazada', 'info');
        } catch(e) {
          console.error(e);
          toast('Error al rechazar', 'error');
          btn.disabled = false;
        }
      });
    });

    // Attach listeners for grant access buttons
    el.querySelectorAll('.btn-grant-access').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        btn.disabled = true;
        btn.textContent = '…';
        try {
          const adminProfile = getUserProfile();
          await db.collection('users').doc(uid).update({
            accessGranted:   true,
            accessGrantedBy: adminProfile?.uid || 'admin',
            accessGrantedAt: timestamp(),
            accessNote:      t('admin_pending_manual_note') || 'Activado manualmente',
          });
          const user = allUsers.find(u => (u.uid || u.id) === uid);
          if (user) user.accessGranted = true;
          renderPendingSection(allUsers, allInvitations);
          renderAdminSection(allUsers);
          toast(t('admin_access_unlocked')?.replace('{name}', user?.name || uid) || 'Acceso activado', 'success');
        } catch (e) {
          console.error(e);
          toast('Error al conceder acceso', 'error');
          btn.disabled = false;
          btn.textContent = t('admin_grant_access') || 'Activar';
        }
      });
    });
  }

  function renderUsersList(users) {
    const el = container.querySelector('#users-list');
    if (!users.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">${t('admin_no_users')}</div></div>`;
      return;
    }

    el.innerHTML = users.map(user => `
      <div class="admin-user-card" data-uid="${user.uid || user.id}">
        <div class="admin-user-avatar">${user.photoURL ? `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (getInitials(user.name) || '?')}</div>
        <div class="admin-user-info">
          <div class="admin-user-name">${user.name || t('admin_no_name')}</div>
          <div class="admin-user-email">${user.email || ''}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${roleBadgeHtml(user.role || 'cliente')}
            <span style="font-size:11px;color:var(--color-text-muted)">${formatDate(user.createdAt?.toDate?.() || user.createdAt)}</span>
          </div>
        </div>
        <div class="admin-user-role">
          <select class="role-select" data-uid="${user.uid || user.id}" data-current-role="${user.role}">
            <option value="basico"         ${user.role === 'basico'         ? 'selected' : ''}>Básico</option>
            <option value="cliente"        ${user.role === 'cliente'        ? 'selected' : ''}>${translateRole('cliente')}</option>
            <option value="atleta"         ${user.role === 'atleta'         ? 'selected' : ''}>${translateRole('atleta')}</option>
            <option value="coach"          ${user.role === 'coach'          ? 'selected' : ''}>${translateRole('coach')}</option>
            <option value="medico"         ${user.role === 'medico'         ? 'selected' : ''}>${translateRole('medico')}</option>
            <option value="fisio"          ${user.role === 'fisio'          ? 'selected' : ''}>${translateRole('fisio')}</option>
            <option value="psicologo"      ${user.role === 'psicologo'      ? 'selected' : ''}>${translateRole('psicologo')}</option>
            <option value="nutricionista"  ${user.role === 'nutricionista'  ? 'selected' : ''}>${translateRole('nutricionista')}</option>
            <option value="admin"          ${user.role === 'admin'          ? 'selected' : ''}>${translateRole('admin')}</option>
          </select>
        </div>
        <button class="btn-icon" data-uid="${user.uid || user.id}" style="width:32px;height:32px;font-size:16px" data-action="detail">👁</button>
      </div>
    `).join('');

    // Role change
    el.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const uid      = sel.dataset.uid;
        const newRole  = sel.value;
        const prevRole = sel.dataset.currentRole;

        // Admin elevation guard: max 3 admins
        if (newRole === 'admin' && prevRole !== 'admin') {
          const currentAdminCount = allUsers.filter(u => u.role === 'admin').length;
          if (currentAdminCount >= 3) {
            toast(t('admin_admin_limit_reached'), 'error');
            sel.value = prevRole;
            return;
          }
          const slotsLeft = 3 - currentAdminCount;
          const confirmMsg = t('admin_elevate_confirm') + '\n\n' +
            t('admin_elevate_warning').replace('{n}', slotsLeft);
          const ok = await confirm(t('admin_change_role'), confirmMsg, { okText: t('confirm'), danger: true });
          if (!ok) {
            sel.value = prevRole;
            return;
          }
        } else {
          const ok = await confirm(
            t('admin_change_role'),
            t('admin_role_confirm').replace('{role}', translateRole(newRole)),
            { okText: t('confirm') }
          );
          if (!ok) {
            sel.value = prevRole;
            return;
          }
        }

        try {
          await db.collection('users').doc(uid).update({ role: newRole, updatedAt: timestamp() });
          sel.dataset.currentRole = newRole;
          toast(t('admin_role_updated') + translateRole(newRole), 'success');
          const user = allUsers.find(u => (u.uid || u.id) === uid);
          if (user) user.role = newRole;
          updateStats(allUsers);
          renderAdminSection(allUsers);
          renderPendingSection(allUsers, allInvitations);
          // Refresh the badge in-place
          const card = el.querySelector(`.admin-user-card[data-uid="${uid}"]`);
          if (card) {
            const badgeWrap = card.querySelector('.admin-user-info [style*="display:flex"]');
            if (badgeWrap) {
              const badgeEl = badgeWrap.querySelector('span[style*="border-radius:var(--r-full)"]');
              if (badgeEl) badgeEl.outerHTML = roleBadgeHtml(newRole);
            }
          }
        } catch (e) {
          sel.value = prevRole;
          toast('Error: ' + e.message, 'error');
        }
      });
    });

    // Detail / assign
    el.querySelectorAll('[data-action="detail"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid  = btn.dataset.uid;
        const user = allUsers.find(u => (u.uid || u.id) === uid);
        if (user) openUserDetailSheet(user, allUsers);
      });
    });
  }
}

// ── Access Badge Helper ───────────────────────
function renderAccessBadge(user) {
  if (user.subscriptionStatus && user.subscriptionStatus !== 'free') {
    return `<span class="badge" style="background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.3)">${t('admin_access_active_sub')}</span>`;
  }
  if (user.accessGranted) {
    return `<span class="badge" style="background:rgba(6,182,212,0.2);color:#06b6d4;border:1px solid rgba(6,182,212,0.3)">${t('admin_access_manual_override')}</span>`;
  }
  return `<span class="badge" style="background:rgba(148,10,10,0.2);color:#ef4444;border:1px solid rgba(148,10,10,0.3)">${t('admin_access_none')}</span>`;
}

// ── User Detail Sheet ─────────────────────────
async function openUserDetailSheet(user, allUsers) {
  const byRole = (role) => allUsers.filter(u => u.role === role);

  const buildOptions = (list, assignedId) =>
    list.map(u =>
      `<option value="${u.uid || u.id}" ${assignedId === (u.uid || u.id) ? 'selected' : ''}>${u.name}</option>`
    ).join('');

  const coaches       = byRole('coach');
  const medicos       = byRole('medico');
  const fisios        = byRole('fisio');
  const psicologos    = byRole('psicologo');
  const nutricionistas = byRole('nutricionista');

  const html = `
    <h4 style="margin-bottom:var(--space-sm)">${user.name || t('admin_no_name')}</h4>
    <p class="text-muted" style="margin-bottom:4px">${user.email}</p>
    <div style="margin-bottom:var(--space-md)">${roleBadgeHtml(user.role || 'cliente')}</div>

    ${!['cliente','atleta'].includes(user.role) ? `
    <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md)">
      <div class="section-title" style="margin-bottom:8px">👤 Perfil de cliente</div>
      <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer">
        <div class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" id="isClientToggle" ${user.isClient ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </div>
        <span style="font-size:var(--fs-sm)">También es cliente — puede recibir rutinas y asignaciones</span>
      </label>
    </div>
    ` : ''}

    <!-- Coach -->
    <div class="section-title">${t('admin_assign_coach')}</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🏋️</span>
      <select id="sheet-coach-select">
        <option value="">${t('admin_no_coach')}</option>
        ${buildOptions(coaches, user.assignedCoach)}
      </select>
    </div>
    <button class="btn-primary btn-full" id="btn-save-coach" style="margin-bottom:var(--space-md)">${t('admin_save_coach_btn')}</button>

    <!-- Médico -->
    <div class="section-title">${t('admin_assign_medico')}</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🩺</span>
      <select id="sheet-medico-select">
        <option value="">${t('admin_no_medico')}</option>
        ${buildOptions(medicos, user.assignedMedico)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-medico" style="margin-bottom:var(--space-md)">${t('admin_save_medico_btn')}</button>

    <!-- Fisio -->
    <div class="section-title">${t('admin_assign_fisio')}</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">💆</span>
      <select id="sheet-fisio-select">
        <option value="">${t('admin_no_fisio')}</option>
        ${buildOptions(fisios, user.assignedFisio)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-fisio" style="margin-bottom:var(--space-md)">${t('admin_save_fisio_btn')}</button>

    <!-- Psicólogo -->
    <div class="section-title">${t('admin_assign_psicologo')}</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🧠</span>
      <select id="sheet-psicologo-select">
        <option value="">${t('admin_no_psicologo')}</option>
        ${buildOptions(psicologos, user.assignedPsicologo)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-psicologo" style="margin-bottom:var(--space-md)">${t('admin_save_psicologo_btn')}</button>

    <!-- Nutricionista -->
    <div class="section-title">${t('admin_assign_nutricionista')}</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🥗</span>
      <select id="sheet-nutricionista-select">
        <option value="">${t('admin_no_nutricionista')}</option>
        ${buildOptions(nutricionistas, user.assignedNutricionista)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-nutricionista" style="margin-bottom:var(--space-md)">${t('admin_save_nutricionista_btn')}</button>

    ${['cliente','atleta'].includes(user.role) ? `
    <!-- Access Control -->
    <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md)">
      <div class="section-title" style="margin-bottom:var(--space-sm)">${t('admin_access_control')}</div>

      <div id="accessStatusBadge" style="margin-bottom:var(--space-sm)">
        ${renderAccessBadge(user)}
      </div>

      <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;margin-bottom:var(--space-sm)">
        <div class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" id="accessToggle" data-uid="${user.uid || user.id}" ${user.accessGranted ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </div>
        <span style="font-size:var(--fs-sm)">${t('admin_access_granted_toggle')}</span>
      </label>

      <div class="input-group" style="margin-bottom:var(--space-sm)">
        <input
          type="text"
          id="accessNote"
          placeholder="${t('admin_access_note_placeholder')}"
          value="${user.accessNote || ''}"
          style="font-size:var(--fs-sm)"
        >
      </div>
      <button class="btn-secondary btn-full" id="saveAccessNote" style="font-size:var(--fs-sm)">
        ${t('admin_access_save_note')}
      </button>

      ${user.accessGrantedBy ? `
        <p style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-top:var(--space-sm);margin-bottom:0">
          ${t('admin_access_granted_by')}: ${user.accessGrantedBy}
        </p>
      ` : ''}
    </div>
    ` : ''}

    <div class="section-title">${t('admin_routines_title')}</div>
    <div id="sheet-routines"><div class="spinner-sm"></div></div>

    <button class="btn-accent btn-full" id="btn-assign-routine" style="margin-top:var(--space-md)">
      ${t('admin_assign_routine')}
    </button>

    ${['cliente','atleta'].includes(user.role) ? `
    <div class="section-title" style="margin-top:var(--space-lg)">${t('admin_actions')}</div>
    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-danger" id="btn-grant-sensitive" style="flex:1;font-size:12px">
        ${t('admin_grant_sensitive')}
      </button>
      <button class="btn-danger" id="btn-revoke-access" style="flex:1;font-size:12px">
        ${t('admin_revoke_access')}
      </button>
    </div>
    ` : ''}
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  // Load assigned routines
  loadSheetRoutines(sc, user);

  const uid = user.uid || user.id;

  // Helper for specialist save buttons
  async function saveSpecialist(selectId, field, label) {
    const val = sc.querySelector(selectId).value;
    try {
      await db.collection('users').doc(uid).update({ [field]: val || null, updatedAt: timestamp() });
      toast(`${label} ${t('admin_assigned_ok')}`, 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  // Save coach assignment
  sc.querySelector('#btn-save-coach')?.addEventListener('click', () =>
    saveSpecialist('#sheet-coach-select', 'assignedCoach', translateRole('coach'))
  );

  // Save médico assignment
  sc.querySelector('#btn-save-medico')?.addEventListener('click', () =>
    saveSpecialist('#sheet-medico-select', 'assignedMedico', translateRole('medico'))
  );

  // Save fisio assignment
  sc.querySelector('#btn-save-fisio')?.addEventListener('click', () =>
    saveSpecialist('#sheet-fisio-select', 'assignedFisio', translateRole('fisio'))
  );

  // Save psicólogo assignment
  sc.querySelector('#btn-save-psicologo')?.addEventListener('click', () =>
    saveSpecialist('#sheet-psicologo-select', 'assignedPsicologo', translateRole('psicologo'))
  );

  // Save nutricionista assignment
  sc.querySelector('#btn-save-nutricionista')?.addEventListener('click', () =>
    saveSpecialist('#sheet-nutricionista-select', 'assignedNutricionista', translateRole('nutricionista'))
  );

  // Assign routine
  sc.querySelector('#btn-assign-routine')?.addEventListener('click', () => openAssignRoutineModal(user));

  // isClient toggle (for staff/admin users)
  sc.querySelector('#isClientToggle')?.addEventListener('change', async (e) => {
    try {
      await db.collection('users').doc(uid).update({ isClient: e.target.checked, updatedAt: timestamp() });
      toast(e.target.checked ? 'Marcado como cliente ✅' : 'Perfil de cliente desactivado', 'info');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  });

  // ── Access Control (cliente / atleta only) ──
  if (['cliente', 'atleta'].includes(user.role)) {
    const adminProfile = getUserProfile();

    // Toggle accessGranted
    sc.querySelector('#accessToggle')?.addEventListener('change', async (e) => {
      const granted = e.target.checked;
      const badgeEl = sc.querySelector('#accessStatusBadge');
      try {
        if (granted) {
          await db.collection('users').doc(uid).update({
            accessGranted:   true,
            accessGrantedBy: adminProfile?.uid || null,
            accessGrantedAt: timestamp(),
            updatedAt:       timestamp(),
          });
          if (badgeEl) badgeEl.innerHTML = renderAccessBadge({ ...user, accessGranted: true });
          toast(t('admin_access_unlocked').replace('{name}', user.name || user.email), 'success');
        } else {
          await db.collection('users').doc(uid).update({
            accessGranted:   false,
            accessGrantedBy: null,
            accessGrantedAt: null,
            updatedAt:       timestamp(),
          });
          if (badgeEl) badgeEl.innerHTML = renderAccessBadge({ ...user, accessGranted: false });
          toast(t('admin_access_revoked'), 'warning');
        }
      } catch (e) {
        toast('Error: ' + e.message, 'error');
        // Revert toggle on failure
        e.target.checked = !granted;
      }
    });

    // Save access note
    sc.querySelector('#saveAccessNote')?.addEventListener('click', async () => {
      const note = sc.querySelector('#accessNote')?.value?.trim() || '';
      try {
        await db.collection('users').doc(uid).update({ accessNote: note, updatedAt: timestamp() });
        toast(t('admin_access_save_note'), 'success');
      } catch (e) {
        toast('Error: ' + e.message, 'error');
      }
    });
  }

  // Grant sensitive data access
  sc.querySelector('#btn-grant-sensitive')?.addEventListener('click', async () => {
    await db.collection('users').doc(uid).update({ sensitiveClearance: true, updatedAt: timestamp() });
    toast(t('admin_sensitive_granted'), 'success');
  });

  // Revoke access
  sc.querySelector('#btn-revoke-access')?.addEventListener('click', async () => {
    const ok = await confirm(t('admin_revoke_title'), t('admin_revoke_confirm'), { danger: true });
    if (!ok) return;
    await db.collection('users').doc(uid).update({
      role: 'cliente',
      sensitiveClearance: false,
      assignedCoach: null,
      assignedMedico: null,
      assignedFisio: null,
      assignedPsicologo: null,
      assignedNutricionista: null,
      updatedAt: timestamp(),
    });
    toast(t('admin_revoked'), 'warning');
    closeSheet();
  });
}

async function loadSheetRoutines(sc, user) {
  const el = sc.querySelector('#sheet-routines');
  const uid = user.uid || user.id;

  try {
    const snap = await collections.assignments(uid).orderBy('createdAt','desc').limit(5).get();
    if (snap.empty) {
      el.innerHTML = `<p class="text-muted" style="font-size:12px">${t('admin_no_routines')}</p>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="font-size:16px">💪</span>
          <div style="flex:1;font-size:13px;font-weight:600">${d.name || d.routineId || t('admin_routine_label')}</div>
          <button class="badge badge-red" style="cursor:pointer;border:none" data-assign-id="${doc.id}" data-uid="${uid}">${t('admin_delete_assign')}</button>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-assign-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm(t('admin_delete_assign_title'), t('admin_delete_assign_confirm'), { danger: true });
        if (!ok) return;
        await collections.assignments(btn.dataset.uid).doc(btn.dataset.assignId).delete();
        toast(t('admin_assign_deleted'), 'info');
        loadSheetRoutines(sc, user);
      });
    });
  } catch (e) {
    el.innerHTML = `<p class="text-muted" style="font-size:12px">Error: ${e.message}</p>`;
  }
}

// ── Assign Routine Modal ──────────────────────
async function openAssignRoutineModal(user) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('admin_assign_modal')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">${t('admin_assigning_to')}<strong>${user.name}</strong></p>
    <div id="routine-list-modal"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
    <div style="margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--glass-border)">
      <p class="text-muted" style="font-size:12px;margin-bottom:var(--space-sm)">${t('admin_or_create_routine')}</p>
      <input type="text" id="new-routine-name" class="input-solo" placeholder="${t('admin_new_routine')}">
      <button class="btn-secondary btn-full" id="btn-create-assign-routine" style="margin-top:var(--space-sm)">
        ${t('admin_create_assign')}
      </button>
    </div>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  // Load available routines
  try {
    const snap = await db.collection('routines').orderBy('createdAt','desc').limit(30).get();
    const el = modal.querySelector('#routine-list-modal');
    if (snap.empty) {
      el.innerHTML = `<p class="text-muted">${t('admin_no_routines_created')}</p>`;
    } else {
      el.innerHTML = snap.docs.map(doc => {
        const r = doc.data();
        return `
          <div class="admin-user-card" style="cursor:pointer" data-routine-id="${doc.id}" data-routine-name="${r.name}">
            <span style="font-size:20px">💪</span>
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px">${r.name}</div>
              <div class="text-muted">${r.exercises?.length || 0} ${t('admin_exercises')}</div>
            </div>
            <span class="badge badge-cyan">${t('assign')}</span>
          </div>
        `;
      }).join('');

      el.querySelectorAll('[data-routine-id]').forEach(card => {
        card.addEventListener('click', async () => {
          await assignRoutine(user.uid || user.id, card.dataset.routineId, card.dataset.routineName);
          closeModal();
        });
      });
    }
  } catch (e) {
    modal.querySelector('#routine-list-modal').innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }

  // Create & assign new routine
  modal.querySelector('#btn-create-assign-routine')?.addEventListener('click', async () => {
    const name = modal.querySelector('#new-routine-name').value.trim();
    if (!name) { toast(t('admin_name_required'), 'warning'); return; }

    try {
      const newRoutine = await db.collection('routines').add({
        name,
        description:  '',
        exercises:    [],
        tags:         [],
        createdBy:    getUserProfile()?.uid,
        createdAt:    timestamp(),
      });
      await assignRoutine(user.uid || user.id, newRoutine.id, name);
      toast(t('admin_routine_created'), 'success');
      closeModal();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}

async function assignRoutine(clientUid, routineId, routineName) {
  await collections.assignments(clientUid).add({
    routineId,
    name:       routineName,
    assignedBy: getUserProfile()?.uid,
    assignedAt: timestamp(),
    createdAt:  timestamp(),
  });
  toast(`"${routineName}" ${t('admin_assigned_ok')}`, 'success');
}

// ── Invite User Modal ─────────────────────────
const TGWL_FROM_EMAIL = 'Contact@tgwl.us';

function openInviteUserModal() {
  const inviterProfile = getUserProfile();
  const inviterRole    = inviterProfile?.role;
  const isAdminInviter = inviterRole === 'admin';

  const roleSelectHtml = isAdminInviter
    ? `
      <select id="invite-role">
        <option value="cliente">${translateRole('cliente')}</option>
        <option value="atleta">${translateRole('atleta')}</option>
        <option value="coach">${translateRole('coach')}</option>
        <option value="medico">${translateRole('medico')}</option>
        <option value="fisio">${translateRole('fisio')}</option>
        <option value="psicologo">${translateRole('psicologo')}</option>
        <option value="nutricionista">${translateRole('nutricionista')}</option>
        <option value="admin">${translateRole('admin')}</option>
      </select>`
    : `
      <select id="invite-role" disabled>
        <option value="cliente" selected>${translateRole('cliente')}</option>
      </select>`;

  const staffWarningHtml = isAdminInviter
    ? ''
    : `<p class="text-muted" style="font-size:var(--fs-xs);margin-top:calc(var(--space-xs) * -1);margin-bottom:var(--space-sm)">
        ${t('invite_staff_only_client')}
      </p>`;

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('admin_invite_title')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">
      ${t('admin_invite_desc')}
    </p>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">✉️</span>
      <input type="email" id="invite-email" placeholder="${t('admin_invite_email')}">
    </div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">👤</span>
      ${roleSelectHtml}
    </div>
    ${staffWarningHtml}
    <button class="btn-primary btn-full" id="btn-generate-invite">${t('admin_generate')}</button>

    <!-- Invite link result (hidden initially) -->
    <div id="invite-result" style="display:none;margin-top:var(--space-md)">
      <p class="text-muted" style="font-size:12px;margin-bottom:6px">${t('admin_invite_link')}</p>
      <div class="input-group" style="margin-bottom:var(--space-sm)">
        <input type="text" id="invite-url-input" readonly style="font-size:12px;cursor:text">
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn-secondary" id="btn-copy-invite" style="flex:1;font-size:13px">${t('admin_copy_link')}</button>
        <button class="btn-primary"   id="btn-send-invite" style="flex:1;font-size:13px">Enviar automático</button>
      </div>
      <p class="text-muted" style="font-size:11px;margin-top:6px;text-align:center">
        De: ${TGWL_FROM_EMAIL}
      </p>
    </div>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  modal.querySelector('#btn-generate-invite')?.addEventListener('click', async () => {
    const email = modal.querySelector('#invite-email').value.trim();
    const role  = modal.querySelector('#invite-role').value;
    if (!email) { toast(t('admin_email_required'), 'warning'); return; }

    // Generate unique token and invite URL
    const token    = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const inviteUrl = window.location.origin + window.location.pathname + '#register?invite=' + token;

    try {
      const inviteRef = await db.collection('invitations').add({
        email,
        role,
        token,
        inviteUrl,
        invitedBy: getUserProfile()?.uid,
        invitedByEmail: TGWL_FROM_EMAIL,
        createdAt: timestamp(),
        status: 'pending',
      });

      // Show result section
      const resultEl = modal.querySelector('#invite-result');
      const urlInput = modal.querySelector('#invite-url-input');
      urlInput.value = inviteUrl;
      resultEl.style.display = 'block';

      // Disable generate button to avoid duplicates
      modal.querySelector('#btn-generate-invite').disabled = true;
      modal.querySelector('#btn-generate-invite').textContent = t('admin_generated_ok');

      toast(t('admin_link_generated'), 'success');

      // Copy link
      modal.querySelector('#btn-copy-invite')?.addEventListener('click', () => {
        navigator.clipboard.writeText(inviteUrl)
          .then(() => toast(t('admin_link_copied'), 'success'))
          .catch(() => {
            urlInput.select();
            document.execCommand('copy');
            toast(t('admin_link_copied2'), 'success');
          });
      });

      // Send automatically via Firebase Trigger Email extension (mail collection)
      modal.querySelector('#btn-send-invite')?.addEventListener('click', async () => {
        const btn = modal.querySelector('#btn-send-invite');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
          await db.collection('mail').add({
            to: email,
            replyTo: TGWL_FROM_EMAIL,
            message: {
              subject: t('admin_invite_subject'),
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:var(--r-md);overflow:hidden">
                  <div style="background:#940a0a;padding:24px;text-align:center">
                    <h1 style="margin:0;font-size:24px;letter-spacing:2px">THE GROWTH LAB</h1>
                  </div>
                  <div style="padding:32px">
                    <h2 style="margin:0 0 16px">¡Tienes una invitación!</h2>
                    <p style="color:#aaa;margin-bottom:24px">
                      Has sido invitado/a a unirte a The Growth Lab como <strong style="color:#19f9f9">${translateRole(role)}</strong>.
                    </p>
                    <a href="${inviteUrl}"
                       style="display:block;background:#940a0a;color:#fff;text-align:center;padding:14px 24px;border-radius:var(--r-sm);text-decoration:none;font-weight:700;font-size:16px">
                      Activar mi cuenta
                    </a>
                    <p style="color:#555;font-size:12px;margin-top:24px;text-align:center">
                      Este enlace es de un solo uso. Si no esperabas esta invitación, puedes ignorar este correo.
                    </p>
                  </div>
                  <div style="padding:16px;text-align:center;border-top:1px solid #222">
                    <p style="color:#555;font-size:11px;margin:0">
                      The Growth Lab · ${TGWL_FROM_EMAIL}
                    </p>
                  </div>
                </div>
              `,
            },
          });
          await db.collection('invitations').doc(inviteRef.id).update({ emailSent: true, emailSentAt: timestamp() });
          btn.textContent = '✓ Enviado';
          toast('Invitación enviada a ' + email, 'success');
        } catch (e) {
          btn.disabled = false;
          btn.textContent = 'Enviar automático';
          toast('Error al enviar: ' + e.message, 'error');
        }
      });

    } catch (e) {
      toast(t('admin_invite_error') + ': ' + e.message, 'error');
    }
  });
}

// ── Admin Routines Panel ──────────────────────
let _routinesLoaded = false;

async function loadAdminRoutines(container) {
  const profile = getUserProfile();
  const btnNew  = container.querySelector('#btn-new-routine-admin');
  if (!_routinesLoaded) {
    _routinesLoaded = true;
    btnNew?.addEventListener('click', () => openAdminRoutineEditor(null, container));
  }
  await renderAdminRoutineCards(container, profile);
}

async function renderAdminRoutineCards(container, profile) {
  const el = container.querySelector('#admin-routines-cards');
  if (!el) return;
  try {
    const snap = await db.collection('routines').where('createdBy','==',profile.uid).limit(50).get();
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Sin rutinas creadas</div><div class="empty-subtitle">Pulsa "+ Nueva rutina" para crear la primera.</div></div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const muscles = [...new Set((r.exercises||[]).map(e=>e.muscleGroup).filter(Boolean))].slice(0,4).join(' · ');
      const tags = r.tags?.map(tg=>`<span class="badge badge-gray">${tg}</span>`).join('') || '';
      return `
        <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm)">
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px">
            <span style="font-size:26px">💪</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px">${r.name}</div>
              <div class="text-muted" style="font-size:12px;margin-top:2px">${r.exercises?.length||0} ejercicios${muscles?' · '+muscles:''}</div>
              ${tags?`<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">${tags}</div>`:''}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" style="flex:1;font-size:12px;padding:8px" data-edit="${doc.id}">✏️ Editar</button>
            <button class="btn-accent"    style="flex:1;font-size:12px;padding:8px" data-assign="${doc.id}" data-rname="${(r.name||'').replace(/"/g,'&quot;')}">📋 Asignar a cliente</button>
          </div>
        </div>`;
    }).join('');
    el.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openAdminRoutineEditor(btn.dataset.edit, container))
    );
    el.querySelectorAll('[data-assign]').forEach(btn =>
      btn.addEventListener('click', () => openAdminAssignRoutine(btn.dataset.assign, btn.dataset.rname, profile))
    );
  } catch(e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function openAdminRoutineEditor(routineId, container) {
  const profile = getUserProfile();
  const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let routine = { name:'', description:'', exercises:[], tags:[] };
  if (routineId) {
    const snap = await db.collection('routines').doc(routineId).get();
    if (snap.exists) routine = { id:snap.id, ...snap.data() };
  }
  const { EXERCISES } = await import('../../data/data.js');
  const muscleGroups = [...new Set(EXERCISES.map(e=>e.m).filter(Boolean))];

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${routineId?'Editar':'Nueva'} Rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <input type="text" id="rar-name" class="input-solo" placeholder="Nombre de la rutina" value="${_esc(routine.name)}" style="margin-bottom:8px">
    <textarea id="rar-desc" class="input-solo" rows="2" placeholder="Descripción..." style="padding:10px;width:100%;margin-bottom:12px;box-sizing:border-box">${_esc(routine.description||'')}</textarea>
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Ejercicios</div>
    <div id="rar-ex-list"></div>
    <div style="position:relative;margin:8px 0 4px">
      <input type="text" id="rar-ex-search" class="input-solo" placeholder="🔍 Buscar ejercicio o músculo..." style="font-size:12px" autocomplete="off">
      <div id="rar-ex-results" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:#1a1a2e;border:1px solid var(--glass-border);border-radius:var(--radius-sm);z-index:200;margin-top:2px"></div>
    </div>
    <button class="btn-accent btn-full" id="rar-add-ex" style="margin-bottom:12px">+ Añadir ejercicio seleccionado</button>
    <button class="btn-primary btn-full" id="rar-save">💾 Guardar rutina</button>
  `;
  openModal(html, { noClickClose: false });
  const m = document.getElementById('modal-content');
  let exercises = [...(routine.exercises||[])];
  let _selEx = null;

  const renderList = () => {
    const listEl = m.querySelector('#rar-ex-list');
    if (!exercises.length) { listEl.innerHTML=`<p style="color:var(--color-text-muted);font-size:12px;margin-bottom:4px">Sin ejercicios aún</p>`; return; }
    listEl.innerHTML = exercises.map((ex,i)=>`
      <div style="display:flex;align-items:center;gap:6px;padding:7px;background:var(--glass-bg);border-radius:var(--radius-sm);margin-bottom:4px">
        <span style="font-size:11px;font-weight:700;color:var(--color-text-muted);min-width:18px">${i+1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(ex.name||ex.n||'')}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">${_esc(ex.muscleGroup||ex.m||'')}</div>
        </div>
        <input type="number" value="${ex.sets||3}" min="1" max="20" style="width:36px;background:transparent;border:1px solid var(--glass-border);border-radius:var(--r-xs);color:#fff;font-size:11px;text-align:center;padding:2px" data-sets="${i}">
        <div style="display:flex;align-items:center;gap:4px">
          <input type="number" class="ex-warmup-input" data-index="${i}"
                 value="${ex.warmupSets||0}" min="0" max="10"
                 style="width:40px;background:rgba(251,146,60,.15);border:1px solid rgba(251,146,60,.4);border-radius:var(--r-xs);color:var(--color-text);font-size:11px;text-align:center;padding:2px">
          <span style="font-size:10px;color:rgba(251,146,60,.8)">🔥</span>
        </div>
        <span style="font-size:10px;color:var(--color-text-muted)">×</span>
        <input type="text" value="${ex.reps||'10'}" placeholder="ej: 12 o 20-16-16" style="width:72px;background:transparent;border:1px solid var(--glass-border);border-radius:var(--r-xs);color:#fff;font-size:11px;text-align:center;padding:2px" data-reps="${i}">
        <button style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:15px;padding:0 2px" data-rm="${i}">✕</button>
      </div>`).join('');
    listEl.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{ exercises.splice(+b.dataset.rm,1); renderList(); }));
    listEl.querySelectorAll('[data-sets]').forEach(b=>b.addEventListener('change',()=>{ exercises[+b.dataset.sets].sets=parseInt(b.value)||3; }));
    listEl.querySelectorAll('[data-reps]').forEach(b=>b.addEventListener('change',()=>{ exercises[+b.dataset.reps].reps=b.value; }));
    listEl.querySelectorAll('.ex-warmup-input').forEach(b=>b.addEventListener('change',()=>{ exercises[+b.dataset.index].warmupSets=parseInt(b.value)||0; }));
  };
  renderList();

  // Search logic
  const searchEl  = m.querySelector('#rar-ex-search');
  const resultsEl = m.querySelector('#rar-ex-results');
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase().trim();
    if (!q) { resultsEl.style.display='none'; return; }
    const hits = EXERCISES.filter(e => e.n.toLowerCase().includes(q) || e.m.toLowerCase().includes(q)).slice(0,20);
    if (!hits.length) { resultsEl.innerHTML=`<div style="padding:10px;color:var(--color-text-muted);font-size:12px">Sin resultados</div>`; resultsEl.style.display=''; return; }
    resultsEl.innerHTML = hits.map(e=>`
      <div data-exn="${e.n.replace(/"/g,'&quot;')}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)">
        <div style="flex:1;font-size:12px;font-weight:600;color:#e2e8f0">${_esc(e.n)}</div>
        <span style="font-size:10px;background:rgba(239,68,68,.2);color:#ef4444;padding:2px 7px;border-radius:var(--r-md);white-space:nowrap">${_esc(e.m)}</span>
      </div>`).join('');
    resultsEl.style.display='';
    resultsEl.querySelectorAll('[data-exn]').forEach(item=>{
      item.addEventListener('mouseenter',()=>item.style.background='rgba(255,255,255,.07)');
      item.addEventListener('mouseleave',()=>item.style.background='');
      item.addEventListener('click',()=>{ _selEx=EXERCISES.find(e=>e.n===item.dataset.exn); searchEl.value=_selEx?.n||''; resultsEl.style.display='none'; });
    });
  });
  document.addEventListener('click', e=>{ if(!m.contains(e.target)) resultsEl.style.display='none'; });

  m.querySelector('#rar-add-ex')?.addEventListener('click',()=>{
    if(!_selEx){ toast('Selecciona un ejercicio del buscador','info'); return; }
    exercises.push({ id:_selEx.n, name:_selEx.n, muscleGroup:_selEx.m, videoUrl:_selEx.v||'', setupNotes:(_selEx.instructions||[]).join(' '), sets:3, reps:'10', weight:0, restSeconds:60, warmupSets:0 });
    renderList(); searchEl.value=''; _selEx=null;
  });

  m.querySelector('#rar-save')?.addEventListener('click',async()=>{
    const name=m.querySelector('#rar-name').value.trim();
    if(!name){ toast('Introduce un nombre','warning'); return; }
    const data={ name, description:m.querySelector('#rar-desc').value.trim(), exercises, createdBy:profile.uid, updatedAt:timestamp() };
    try {
      if(routineId){ await db.collection('routines').doc(routineId).update(data); toast('Rutina actualizada ✅','success'); }
      else { data.createdAt=timestamp(); await db.collection('routines').add(data); toast('Rutina creada ✅','success'); }
      closeModal();
      _routinesLoaded = false;
      renderAdminRoutineCards(container, profile);
    } catch(e){ toast('Error: '+e.message,'error'); }
  });
}

async function openAdminAssignRoutine(routineId, routineName, profile, type = 'routine') {
  const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let clients = [];
  try {
    const snap = await db.collection('users').orderBy('name').limit(100).get();
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  const selfUid = profile.uid;
  const selfCard = `
    <div class="admin-user-card" data-cuid="${selfUid}" data-cname="${_esc(profile.name||'Yo')}" style="cursor:pointer;margin-bottom:6px;border-color:var(--cyan)">
      <div class="admin-user-avatar"${profile.photoURL ? ' style="overflow:hidden"' : ' style="background:rgba(0,200,255,.2);color:var(--cyan)"'}>${profile.photoURL ? `<img src="${profile.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(profile.name||'?')}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${_esc(profile.name||'Yo')} <span style="font-size:11px;color:var(--cyan)">(yo)</span></div>
        <div class="text-muted" style="font-size:12px">${_esc(profile.email||'')}</div>
      </div>
      <span class="badge" style="background:rgba(0,200,255,.15);color:var(--cyan)">Asignarme</span>
    </div>`;

  const clientCards = clients.filter(c => (c.uid||c.id) !== selfUid).map(c => `
    <div class="admin-user-card" data-cuid="${c.uid||c.id}" data-cname="${_esc(c.name||'Cliente')}" style="cursor:pointer;margin-bottom:6px">
      <div class="admin-user-avatar"${c.photoURL ? ' style="overflow:hidden"' : ''}>${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (getInitials(c.name||'?'))}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${_esc(c.name||'Cliente')}${c.isClient && !['cliente','atleta'].includes(c.role) ? ` <span style="font-size:10px;background:rgba(0,200,255,.15);color:var(--cyan);padding:1px 5px;border-radius:var(--r-xs);margin-left:4px">${c.role}</span>` : ''}</div>
        <div class="text-muted" style="font-size:12px">${_esc(c.email||'')}</div>
      </div>
      <span class="badge badge-cyan">Asignar</span>
    </div>`).join('');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:12px;font-size:13px">"<strong>${_esc(routineName)}</strong>" → selecciona destinatario:</p>
    ${selfCard}
    ${clientCards ? `<div style="border-top:1px solid var(--glass-border);margin:8px 0 10px"></div>${clientCards}` : ''}
  `;
  openModal(html);
  document.getElementById('modal-content')?.querySelectorAll('[data-cuid]').forEach(card => {
    card.addEventListener('click', async () => {
      await collections.assignments(card.dataset.cuid).add({
        routineId, name: routineName, assignedBy: profile.uid, assignedAt: timestamp(), createdAt: timestamp(),
      });
      toast(`Rutina asignada a ${card.dataset.cname} ✅`, 'success');
      closeModal();
    });
  });
}

// ══════════════════════════════════════════════════
//  Admin Diets Panel
// ══════════════════════════════════════════════════
let _dietsLoaded = false;

const DIET_TYPES = [
  { value: 'volumen',        label: 'Volumen',        color: '#ef4444' },
  { value: 'definicion',     label: 'Definición',     color: '#3b82f6' },
  { value: 'mantenimiento',  label: 'Mantenimiento',  color: '#22c55e' },
  { value: 'terapeutica',    label: 'Terapéutica',    color: '#a855f7' },
  { value: 'personalizada',  label: 'Personalizada',  color: '#f97316' },
];

async function loadAdminDiets(container) {
  const profile = getUserProfile();
  const btnNew  = container.querySelector('#btn-new-diet-admin');
  if (!_dietsLoaded) {
    _dietsLoaded = true;
    btnNew?.addEventListener('click', () => openAdminDietEditor(null, container));
  }
  await renderAdminDietCards(container, profile);
}

async function renderAdminDietCards(container, profile) {
  const el = container.querySelector('#admin-diets-cards');
  if (!el) return;
  try {
    const snap = await db.collection('dietTemplates').where('createdBy','==',profile.uid).limit(50).get();
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🥗</div><div class="empty-title">Sin dietas creadas</div><div class="empty-subtitle">Pulsa "+ Nueva dieta" para crear la primera.</div></div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const typeInfo = DIET_TYPES.find(t => t.value === d.type) || { label: d.type || 'Sin tipo', color: '#6b7280' };
      const macros = [
        d.calories ? `${d.calories} kcal` : null,
        d.protein ? `${d.protein}g P` : null,
        d.carbs ? `${d.carbs}g C` : null,
        d.fat ? `${d.fat}g G` : null,
      ].filter(Boolean).join(' · ');
      return `
        <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm)">
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px">
            <span style="font-size:26px">🥗</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px">${d.name || 'Sin nombre'}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-full);background:${typeInfo.color}22;color:${typeInfo.color}">${typeInfo.label}</span>
                ${macros ? `<span class="text-muted" style="font-size:11px">${macros}</span>` : ''}
              </div>
              <div class="text-muted" style="font-size:12px;margin-top:2px">${(d.meals||[]).length} comidas</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" style="flex:1;font-size:12px;padding:8px" data-diet-edit="${doc.id}">✏️ Editar</button>
            <button class="btn-accent"    style="flex:1;font-size:12px;padding:8px" data-diet-assign="${doc.id}" data-dname="${(d.name||'').replace(/"/g,'&quot;')}">📋 Asignar a cliente</button>
            <button style="font-size:12px;padding:8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:var(--r-sm);cursor:pointer" data-diet-del="${doc.id}" data-delname="${(d.name||'').replace(/"/g,'&quot;')}">🗑️</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-diet-edit]').forEach(btn =>
      btn.addEventListener('click', () => openAdminDietEditor(btn.dataset.dietEdit, container))
    );
    el.querySelectorAll('[data-diet-assign]').forEach(btn =>
      btn.addEventListener('click', () => openAdminAssignDiet(btn.dataset.dietAssign, btn.dataset.dname))
    );
    el.querySelectorAll('[data-diet-del]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ok = await confirm(`¿Eliminar la dieta "${btn.dataset.delname}"?`);
        if (!ok) return;
        try {
          await db.collection('dietTemplates').doc(btn.dataset.dietDel).delete();
          toast('Dieta eliminada', 'success');
          _dietsLoaded = false;
          renderAdminDietCards(container, profile);
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      })
    );
  } catch(e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function openAdminDietEditor(dietId, container) {
  const profile = getUserProfile();
  const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let diet = { name:'', type:'personalizada', calories:'', protein:'', carbs:'', fat:'', meals:[], notes:'' };
  if (dietId) {
    const snap = await db.collection('dietTemplates').doc(dietId).get();
    if (snap.exists) diet = { id:snap.id, ...snap.data() };
  }

  let meals = diet.meals?.length ? [...diet.meals] : [{ label:'Desayuno', description:'' }];

  const typeOptions = DIET_TYPES.map(t =>
    `<option value="${t.value}" ${diet.type===t.value?'selected':''}>${t.label}</option>`
  ).join('');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${dietId?'Editar':'Nueva'} Dieta</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="max-height:70vh;overflow-y:auto;padding:2px">
      <input type="text" id="diet-name" class="input-solo" placeholder="Nombre de la dieta (ej: Dieta Hipercalórica 3500kcal)" value="${_esc(diet.name)}" style="margin-bottom:8px">

      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:1">
          <label style="font-size:11px;color:var(--color-text-muted);font-weight:600;display:block;margin-bottom:4px">TIPO</label>
          <select id="diet-type" class="input-solo" style="width:100%">${typeOptions}</select>
        </div>
        <div style="flex:1">
          <label style="font-size:11px;color:var(--color-text-muted);font-weight:600;display:block;margin-bottom:4px">KCAL</label>
          <input type="number" id="diet-kcal" class="input-solo" placeholder="2500" value="${diet.calories||''}" style="width:100%">
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:1">
          <label style="font-size:11px;color:var(--color-text-muted);font-weight:600;display:block;margin-bottom:4px">PROTEÍNA (g)</label>
          <input type="number" id="diet-prot" class="input-solo" placeholder="180" value="${diet.protein||''}" style="width:100%">
        </div>
        <div style="flex:1">
          <label style="font-size:11px;color:var(--color-text-muted);font-weight:600;display:block;margin-bottom:4px">CARBOS (g)</label>
          <input type="number" id="diet-carbs" class="input-solo" placeholder="300" value="${diet.carbs||''}" style="width:100%">
        </div>
        <div style="flex:1">
          <label style="font-size:11px;color:var(--color-text-muted);font-weight:600;display:block;margin-bottom:4px">GRASA (g)</label>
          <input type="number" id="diet-fat" class="input-solo" placeholder="80" value="${diet.fat||''}" style="width:100%">
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Comidas</div>
      <div id="diet-meals-list"></div>
      <button class="btn-accent btn-full" id="diet-add-meal" style="margin-bottom:12px">+ Añadir comida</button>

      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Notas adicionales</div>
      <textarea id="diet-notes" class="input-solo" rows="3" placeholder="Observaciones, suplementos, restricciones..." style="padding:10px;width:100%;box-sizing:border-box;margin-bottom:12px">${_esc(diet.notes||'')}</textarea>

      <button class="btn-primary btn-full" id="diet-save">💾 Guardar dieta</button>
    </div>
  `;
  openModal(html, { noClickClose: false });
  const m = document.getElementById('modal-content');

  const renderMeals = () => {
    const listEl = m.querySelector('#diet-meals-list');
    if (!meals.length) { listEl.innerHTML=`<p style="color:var(--color-text-muted);font-size:12px;margin-bottom:4px">Sin comidas aún</p>`; return; }
    listEl.innerHTML = meals.map((meal,i) => `
      <div style="background:var(--glass-bg);border-radius:var(--r-sm);padding:10px;margin-bottom:8px;position:relative">
        <button style="position:absolute;top:6px;right:6px;background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:14px" data-meal-rm="${i}">✕</button>
        <input type="text" class="input-solo" placeholder="Nombre (ej: Desayuno, Snack AM...)" value="${_esc(meal.label)}" data-meal-label="${i}" style="font-size:12px;font-weight:600;margin-bottom:6px;width:calc(100% - 24px)">
        <textarea class="input-solo" placeholder="Descripción de la comida, alimentos, cantidades..." data-meal-desc="${i}" rows="3" style="font-size:12px;padding:8px;width:100%;box-sizing:border-box">${_esc(meal.description||'')}</textarea>
      </div>
    `).join('');
    listEl.querySelectorAll('[data-meal-rm]').forEach(b => b.addEventListener('click', () => { meals.splice(+b.dataset.mealRm, 1); renderMeals(); }));
    listEl.querySelectorAll('[data-meal-label]').forEach(b => b.addEventListener('input', () => { meals[+b.dataset.mealLabel].label = b.value; }));
    listEl.querySelectorAll('[data-meal-desc]').forEach(b => b.addEventListener('input', () => { meals[+b.dataset.mealDesc].description = b.value; }));
  };
  renderMeals();

  m.querySelector('#diet-add-meal')?.addEventListener('click', () => {
    const defaults = ['Desayuno','Media Mañana','Almuerzo','Merienda','Cena','Pre-entreno','Post-entreno'];
    const next = defaults[meals.length] || `Comida ${meals.length + 1}`;
    meals.push({ label: next, description: '' });
    renderMeals();
  });

  m.querySelector('#diet-save')?.addEventListener('click', async () => {
    const name = m.querySelector('#diet-name').value.trim();
    if (!name) { toast('Introduce un nombre para la dieta', 'warning'); return; }

    const data = {
      name,
      type: m.querySelector('#diet-type').value,
      calories: parseInt(m.querySelector('#diet-kcal').value) || 0,
      protein: parseInt(m.querySelector('#diet-prot').value) || 0,
      carbs: parseInt(m.querySelector('#diet-carbs').value) || 0,
      fat: parseInt(m.querySelector('#diet-fat').value) || 0,
      meals: meals.filter(ml => ml.label.trim()),
      notes: m.querySelector('#diet-notes').value.trim(),
      createdBy: profile.uid,
      updatedAt: timestamp(),
    };

    try {
      if (dietId) {
        await db.collection('dietTemplates').doc(dietId).update(data);
        toast('Dieta actualizada ✅', 'success');
      } else {
        data.createdAt = timestamp();
        await db.collection('dietTemplates').add(data);
        toast('Dieta creada ✅', 'success');
      }
      closeModal();
      _dietsLoaded = false;
      renderAdminDietCards(container, profile);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}

async function openAdminAssignDiet(dietId, dietName) {
  const profile = getUserProfile();
  const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Load the full diet template to copy into user's dietas subcollection
  let dietData = {};
  try {
    const dSnap = await db.collection('dietTemplates').doc(dietId).get();
    if (dSnap.exists) dietData = dSnap.data();
  } catch {}

  let clients = [];
  try {
    const snap = await db.collection('users').orderBy('name').limit(100).get();
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  const selfUid = profile.uid;
  const selfCard = `
    <div class="admin-user-card" data-cuid="${selfUid}" data-cname="${_esc(profile.name||'Yo')}" style="cursor:pointer;margin-bottom:6px;border-color:var(--cyan)">
      <div class="admin-user-avatar"${profile.photoURL ? ' style="overflow:hidden"' : ' style="background:rgba(0,200,255,.2);color:var(--cyan)"'}>${profile.photoURL ? `<img src="${profile.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(profile.name||'?')}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${_esc(profile.name||'Yo')} <span style="font-size:11px;color:var(--cyan)">(yo)</span></div>
        <div class="text-muted" style="font-size:12px">${_esc(profile.email||'')}</div>
      </div>
      <span class="badge" style="background:rgba(0,200,255,.15);color:var(--cyan)">Asignarme</span>
    </div>`;

  const clientCards = clients.filter(c => (c.uid||c.id) !== selfUid).map(c => `
    <div class="admin-user-card" data-cuid="${c.uid||c.id}" data-cname="${_esc(c.name||'Cliente')}" style="cursor:pointer;margin-bottom:6px">
      <div class="admin-user-avatar"${c.photoURL ? ' style="overflow:hidden"' : ''}>${c.photoURL ? `<img src="${c.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (getInitials(c.name||'?'))}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${_esc(c.name||'Cliente')}</div>
        <div class="text-muted" style="font-size:12px">${_esc(c.email||'')}</div>
      </div>
      <span class="badge badge-cyan">Asignar</span>
    </div>`).join('');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🥗 Asignar dieta</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:12px;font-size:13px">"<strong>${_esc(dietName)}</strong>" → selecciona destinatario:</p>
    ${selfCard}
    ${clientCards ? `<div style="border-top:1px solid var(--glass-border);margin:8px 0 10px"></div>${clientCards}` : ''}
  `;
  openModal(html);
  document.getElementById('modal-content')?.querySelectorAll('[data-cuid]').forEach(card => {
    card.addEventListener('click', async () => {
      try {
        // Copy diet template into user's dietas subcollection
        await collections.dietas(card.dataset.cuid).add({
          ...dietData,
          templateId: dietId,
          assignedBy: profile.uid,
          assignedAt: timestamp(),
          createdAt: timestamp(),
        });
        toast(`Dieta asignada a ${card.dataset.cname} ✅`, 'success');
        closeModal();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  });
}
