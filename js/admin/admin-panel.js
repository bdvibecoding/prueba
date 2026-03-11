/* ═══════════════════════════════════════════════
   TGWL — admin/admin-panel.js
   Full Admin Panel — User, Role & Permission Management
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, translateRole, getInitials } from '../utils.js';
import { openModal, closeModal, confirm, openSheet, closeSheet } from '../components/modal.js';

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="admin-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">🔑 Panel Admin</h2>
            <p class="page-subtitle">Gestión de usuarios y permisos</p>
          </div>
          <button class="btn-primary" id="btn-invite-user" style="padding:10px 16px;font-size:13px">+ Invitar</button>
        </div>

        <!-- Stats -->
        <div class="quick-stats" id="admin-stats">
          <div class="glass-card stat-card"><div class="stat-value" id="stat-total">—</div><div class="stat-label">Usuarios</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-coaches">—</div><div class="stat-label">Coaches</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-clients">—</div><div class="stat-label">Clientes</div></div>
        </div>

        <!-- Search -->
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <span class="input-icon">🔍</span>
          <input type="search" id="user-search" placeholder="Buscar por nombre o email..." autocomplete="off">
        </div>

        <!-- Role Filter -->
        <div class="h-scroll" style="margin-bottom:var(--space-md)">
          <button class="chip active" data-filter="all">Todos</button>
          <button class="chip" data-filter="admin">Admin</button>
          <button class="chip" data-filter="coach">Coach</button>
          <button class="chip" data-filter="medico">Médico</button>
          <button class="chip" data-filter="nutricionista">Nutricionista</button>
          <button class="chip" data-filter="cliente">Cliente</button>
        </div>

        <!-- Users List -->
        <div id="users-list">
          <div class="overlay-spinner"><div class="spinner-sm"></div></div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  let allUsers = [];
  let currentFilter = 'all';
  let searchTerm = '';

  // Load users
  await loadUsers();

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

  // ── Load all users ──────────────────────────
  async function loadUsers() {
    try {
      const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
      allUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStats(allUsers);
      renderUsersList(allUsers);
    } catch (e) {
      container.querySelector('#users-list').innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
    }
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
    container.querySelector('#stat-coaches').textContent = users.filter(u => u.role === 'coach').length;
    container.querySelector('#stat-clients').textContent = users.filter(u => u.role === 'cliente').length;
  }

  function renderUsersList(users) {
    const el = container.querySelector('#users-list');
    if (!users.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Sin usuarios</div></div>`;
      return;
    }

    el.innerHTML = users.map(user => `
      <div class="admin-user-card" data-uid="${user.uid || user.id}">
        <div class="admin-user-avatar">${getInitials(user.name) || '?'}</div>
        <div class="admin-user-info">
          <div class="admin-user-name">${user.name || 'Sin nombre'}</div>
          <div class="admin-user-email">${user.email || ''}</div>
          <div style="margin-top:4px;font-size:11px;color:var(--color-text-muted)">${formatDate(user.createdAt?.toDate?.() || user.createdAt)}</div>
        </div>
        <div class="admin-user-role">
          <select class="role-select" data-uid="${user.uid || user.id}" data-current-role="${user.role}">
            <option value="cliente"        ${user.role === 'cliente'        ? 'selected' : ''}>Cliente</option>
            <option value="coach"          ${user.role === 'coach'          ? 'selected' : ''}>Coach</option>
            <option value="medico"         ${user.role === 'medico'         ? 'selected' : ''}>Médico</option>
            <option value="nutricionista"  ${user.role === 'nutricionista'  ? 'selected' : ''}>Nutricionista</option>
            <option value="admin"          ${user.role === 'admin'          ? 'selected' : ''}>Admin</option>
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
        const ok = await confirm(
          'Cambiar rol',
          `¿Cambiar el rol de este usuario a "${translateRole(newRole)}"?`,
          { okText: 'Confirmar' }
        );
        if (!ok) {
          sel.value = prevRole;
          return;
        }
        try {
          await db.collection('users').doc(uid).update({ role: newRole, updatedAt: timestamp() });
          sel.dataset.currentRole = newRole;
          toast(`Rol actualizado a ${translateRole(newRole)}`, 'success');
          const user = allUsers.find(u => (u.uid || u.id) === uid);
          if (user) user.role = newRole;
          updateStats(allUsers);
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

// ── User Detail Sheet ─────────────────────────
async function openUserDetailSheet(user, allUsers) {
  const coaches = allUsers.filter(u => u.role === 'coach');
  const coachOptions = coaches.map(c =>
    `<option value="${c.uid || c.id}" ${user.assignedCoach === (c.uid || c.id) ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  const html = `
    <h4 style="margin-bottom:var(--space-sm)">${user.name || 'Usuario'}</h4>
    <p class="text-muted" style="margin-bottom:var(--space-md)">${user.email}</p>

    <div class="section-title">Asignar coach</div>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">🏋️</span>
      <select id="sheet-coach-select">
        <option value="">Sin coach asignado</option>
        ${coachOptions}
      </select>
    </div>
    <button class="btn-primary btn-full" id="btn-save-coach" style="margin-bottom:var(--space-md)">Asignar coach</button>

    <div class="section-title">Rutinas asignadas</div>
    <div id="sheet-routines"><div class="spinner-sm"></div></div>

    <button class="btn-accent btn-full" id="btn-assign-routine" style="margin-top:var(--space-md)">
      📋 Asignar nueva rutina
    </button>

    <div class="section-title" style="margin-top:var(--space-lg)">Acciones</div>
    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-danger" id="btn-grant-sensitive" style="flex:1;font-size:12px">
        🔓 Dar acceso datos sensibles
      </button>
      <button class="btn-danger" id="btn-revoke-access" style="flex:1;font-size:12px">
        🚫 Revocar acceso
      </button>
    </div>
  `;

  openSheet(html);
  const sc = document.getElementById('sheet-content');

  // Load assigned routines
  loadSheetRoutines(sc, user);

  // Save coach assignment
  sc.querySelector('#btn-save-coach')?.addEventListener('click', async () => {
    const coachId = sc.querySelector('#sheet-coach-select').value;
    const uid = user.uid || user.id;
    try {
      await db.collection('users').doc(uid).update({ assignedCoach: coachId || null, updatedAt: timestamp() });
      toast('Coach asignado ✅', 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });

  // Assign routine
  sc.querySelector('#btn-assign-routine')?.addEventListener('click', () => openAssignRoutineModal(user));

  // Grant sensitive data access
  sc.querySelector('#btn-grant-sensitive')?.addEventListener('click', async () => {
    const uid = user.uid || user.id;
    await db.collection('users').doc(uid).update({ sensitiveClearance: true, updatedAt: timestamp() });
    toast('Acceso concedido a datos sensibles', 'success');
  });

  // Revoke access
  sc.querySelector('#btn-revoke-access')?.addEventListener('click', async () => {
    const ok = await confirm('Revocar acceso', '¿Revocar el acceso de este usuario?', { danger: true });
    if (!ok) return;
    const uid = user.uid || user.id;
    await db.collection('users').doc(uid).update({
      role: 'cliente',
      sensitiveClearance: false,
      assignedCoach: null,
      updatedAt: timestamp(),
    });
    toast('Acceso revocado', 'warning');
    closeSheet();
  });
}

async function loadSheetRoutines(sc, user) {
  const el = sc.querySelector('#sheet-routines');
  const uid = user.uid || user.id;

  try {
    const snap = await collections.assignments(uid).orderBy('createdAt','desc').limit(5).get();
    if (snap.empty) {
      el.innerHTML = `<p class="text-muted" style="font-size:12px">Sin rutinas asignadas</p>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="font-size:16px">💪</span>
          <div style="flex:1;font-size:13px;font-weight:600">${d.name || d.routineId || 'Rutina'}</div>
          <button class="badge badge-red" style="cursor:pointer;border:none" data-assign-id="${doc.id}" data-uid="${uid}">Eliminar</button>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-assign-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm('Eliminar asignación', '¿Eliminar esta rutina asignada?', { danger: true });
        if (!ok) return;
        await collections.assignments(btn.dataset.uid).doc(btn.dataset.assignId).delete();
        toast('Asignación eliminada', 'info');
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
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">Asignando a: <strong>${user.name}</strong></p>
    <div id="routine-list-modal"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
    <div style="margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--glass-border)">
      <p class="text-muted" style="font-size:12px;margin-bottom:var(--space-sm)">O crea una nueva rutina:</p>
      <input type="text" id="new-routine-name" class="input-solo" placeholder="Nombre de la rutina...">
      <button class="btn-secondary btn-full" id="btn-create-assign-routine" style="margin-top:var(--space-sm)">
        + Crear y asignar
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
      el.innerHTML = `<p class="text-muted">No hay rutinas creadas aún.</p>`;
    } else {
      el.innerHTML = snap.docs.map(doc => {
        const r = doc.data();
        return `
          <div class="admin-user-card" style="cursor:pointer" data-routine-id="${doc.id}" data-routine-name="${r.name}">
            <span style="font-size:20px">💪</span>
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px">${r.name}</div>
              <div class="text-muted">${r.exercises?.length || 0} ejercicios</div>
            </div>
            <span class="badge badge-cyan">Asignar</span>
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
    if (!name) { toast('Introduce un nombre', 'warning'); return; }

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
      toast('Rutina creada y asignada ✅', 'success');
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
  toast(`Rutina "${routineName}" asignada ✅`, 'success');
}

// ── Invite User Modal ─────────────────────────
function openInviteUserModal() {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📨 Invitar usuario</h3>
      <button class="modal-close">✕</button>
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">
      Envía un enlace de invitación para que el usuario cree su cuenta.
    </p>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">✉️</span>
      <input type="email" id="invite-email" placeholder="correo@ejemplo.com">
    </div>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">👤</span>
      <select id="invite-role">
        <option value="cliente">Cliente</option>
        <option value="coach">Coach</option>
        <option value="medico">Médico</option>
        <option value="nutricionista">Nutricionista</option>
      </select>
    </div>
    <button class="btn-primary btn-full" id="btn-send-invite">📨 Enviar invitación</button>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  modal.querySelector('#btn-send-invite')?.addEventListener('click', async () => {
    const email = modal.querySelector('#invite-email').value.trim();
    const role  = modal.querySelector('#invite-role').value;
    if (!email) { toast('Introduce un email', 'warning'); return; }

    // Mock: in real app, would send email via Cloud Functions
    await db.collection('invitations').add({
      email, role,
      invitedBy: getUserProfile()?.uid,
      createdAt: timestamp(),
      status: 'pending',
    });
    toast(`Invitación enviada a ${email}`, 'success');
    closeModal();
  });
}
