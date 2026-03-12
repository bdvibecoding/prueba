/* ═══════════════════════════════════════════════
   TGWL — admin/admin-panel.js
   Full Admin Panel — User, Role & Permission Management
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, translateRole, getInitials } from '../utils.js';
import { openModal, closeModal, confirm, openSheet, closeSheet } from '../components/modal.js';

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
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;${style}">${translateRole(role)}</span>`;
}

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
          <div class="glass-card stat-card"><div class="stat-value" id="stat-staff">—</div><div class="stat-label">Staff</div></div>
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
          <button class="chip" data-filter="fisio">Fisio</button>
          <button class="chip" data-filter="psicologo">Psicólogo</button>
          <button class="chip" data-filter="nutricionista">Nutricionista</button>
          <button class="chip" data-filter="atleta">Atleta</button>
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

  const STAFF_ROLES = ['admin', 'coach', 'medico', 'fisio', 'psicologo', 'nutricionista'];

  function updateStats(users) {
    container.querySelector('#stat-total').textContent = users.length;
    container.querySelector('#stat-staff').textContent = users.filter(u => STAFF_ROLES.includes(u.role)).length;
    container.querySelector('#stat-clients').textContent = users.filter(u => u.role === 'cliente' || u.role === 'atleta').length;
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
          <div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${roleBadgeHtml(user.role || 'cliente')}
            <span style="font-size:11px;color:var(--color-text-muted)">${formatDate(user.createdAt?.toDate?.() || user.createdAt)}</span>
          </div>
        </div>
        <div class="admin-user-role">
          <select class="role-select" data-uid="${user.uid || user.id}" data-current-role="${user.role}">
            <option value="cliente"        ${user.role === 'cliente'        ? 'selected' : ''}>Cliente</option>
            <option value="atleta"         ${user.role === 'atleta'         ? 'selected' : ''}>Atleta</option>
            <option value="coach"          ${user.role === 'coach'          ? 'selected' : ''}>Coach</option>
            <option value="medico"         ${user.role === 'medico'         ? 'selected' : ''}>Médico</option>
            <option value="fisio"          ${user.role === 'fisio'          ? 'selected' : ''}>Fisio</option>
            <option value="psicologo"      ${user.role === 'psicologo'      ? 'selected' : ''}>Psicólogo</option>
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
          // Refresh the badge in-place
          const card = el.querySelector(`.admin-user-card[data-uid="${uid}"]`);
          if (card) {
            const badgeWrap = card.querySelector('.admin-user-info [style*="display:flex"]');
            if (badgeWrap) {
              const badgeEl = badgeWrap.querySelector('span[style*="border-radius:999px"]');
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
    <h4 style="margin-bottom:var(--space-sm)">${user.name || 'Usuario'}</h4>
    <p class="text-muted" style="margin-bottom:4px">${user.email}</p>
    <div style="margin-bottom:var(--space-md)">${roleBadgeHtml(user.role || 'cliente')}</div>

    <!-- Coach -->
    <div class="section-title">Asignar coach</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🏋️</span>
      <select id="sheet-coach-select">
        <option value="">Sin coach asignado</option>
        ${buildOptions(coaches, user.assignedCoach)}
      </select>
    </div>
    <button class="btn-primary btn-full" id="btn-save-coach" style="margin-bottom:var(--space-md)">Asignar coach</button>

    <!-- Médico -->
    <div class="section-title">Médico asignado</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🩺</span>
      <select id="sheet-medico-select">
        <option value="">Sin médico asignado</option>
        ${buildOptions(medicos, user.assignedMedico)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-medico" style="margin-bottom:var(--space-md)">Asignar médico</button>

    <!-- Fisio -->
    <div class="section-title">Fisio asignado</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">💆</span>
      <select id="sheet-fisio-select">
        <option value="">Sin fisio asignado</option>
        ${buildOptions(fisios, user.assignedFisio)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-fisio" style="margin-bottom:var(--space-md)">Asignar fisio</button>

    <!-- Psicólogo -->
    <div class="section-title">Psicólogo asignado</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🧠</span>
      <select id="sheet-psicologo-select">
        <option value="">Sin psicólogo asignado</option>
        ${buildOptions(psicologos, user.assignedPsicologo)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-psicologo" style="margin-bottom:var(--space-md)">Asignar psicólogo</button>

    <!-- Nutricionista -->
    <div class="section-title">Nutricionista asignado</div>
    <div class="input-group" style="margin-bottom:var(--space-sm)">
      <span class="input-icon">🥗</span>
      <select id="sheet-nutricionista-select">
        <option value="">Sin nutricionista asignado</option>
        ${buildOptions(nutricionistas, user.assignedNutricionista)}
      </select>
    </div>
    <button class="btn-secondary btn-full" id="btn-save-nutricionista" style="margin-bottom:var(--space-md)">Asignar nutricionista</button>

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

  const uid = user.uid || user.id;

  // Helper for specialist save buttons
  async function saveSpecialist(selectId, field, label) {
    const val = sc.querySelector(selectId).value;
    try {
      await db.collection('users').doc(uid).update({ [field]: val || null, updatedAt: timestamp() });
      toast(`${label} asignado/a ✅`, 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  // Save coach assignment
  sc.querySelector('#btn-save-coach')?.addEventListener('click', () =>
    saveSpecialist('#sheet-coach-select', 'assignedCoach', 'Coach')
  );

  // Save médico assignment
  sc.querySelector('#btn-save-medico')?.addEventListener('click', () =>
    saveSpecialist('#sheet-medico-select', 'assignedMedico', 'Médico')
  );

  // Save fisio assignment
  sc.querySelector('#btn-save-fisio')?.addEventListener('click', () =>
    saveSpecialist('#sheet-fisio-select', 'assignedFisio', 'Fisio')
  );

  // Save psicólogo assignment
  sc.querySelector('#btn-save-psicologo')?.addEventListener('click', () =>
    saveSpecialist('#sheet-psicologo-select', 'assignedPsicologo', 'Psicólogo')
  );

  // Save nutricionista assignment
  sc.querySelector('#btn-save-nutricionista')?.addEventListener('click', () =>
    saveSpecialist('#sheet-nutricionista-select', 'assignedNutricionista', 'Nutricionista')
  );

  // Assign routine
  sc.querySelector('#btn-assign-routine')?.addEventListener('click', () => openAssignRoutineModal(user));

  // Grant sensitive data access
  sc.querySelector('#btn-grant-sensitive')?.addEventListener('click', async () => {
    await db.collection('users').doc(uid).update({ sensitiveClearance: true, updatedAt: timestamp() });
    toast('Acceso concedido a datos sensibles', 'success');
  });

  // Revoke access
  sc.querySelector('#btn-revoke-access')?.addEventListener('click', async () => {
    const ok = await confirm('Revocar acceso', '¿Revocar el acceso de este usuario?', { danger: true });
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
      Genera un enlace de invitación para que el usuario cree su cuenta.
    </p>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">✉️</span>
      <input type="email" id="invite-email" placeholder="correo@ejemplo.com">
    </div>
    <div class="input-group" style="margin-bottom:var(--space-md)">
      <span class="input-icon">👤</span>
      <select id="invite-role">
        <option value="cliente">Cliente</option>
        <option value="atleta">Atleta</option>
        <option value="coach">Coach</option>
        <option value="medico">Médico</option>
        <option value="fisio">Fisio</option>
        <option value="psicologo">Psicólogo</option>
        <option value="nutricionista">Nutricionista</option>
      </select>
    </div>
    <button class="btn-primary btn-full" id="btn-generate-invite">🔗 Generar enlace</button>

    <!-- Invite link result (hidden initially) -->
    <div id="invite-result" style="display:none;margin-top:var(--space-md)">
      <p class="text-muted" style="font-size:12px;margin-bottom:6px">Enlace de invitación:</p>
      <div class="input-group" style="margin-bottom:var(--space-sm)">
        <input type="text" id="invite-url-input" readonly style="font-size:12px;cursor:text">
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn-secondary" id="btn-copy-invite" style="flex:1;font-size:13px">📋 Copiar enlace</button>
        <button class="btn-accent"    id="btn-email-invite" style="flex:1;font-size:13px">📧 Enviar por email</button>
      </div>
    </div>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  modal.querySelector('#btn-generate-invite')?.addEventListener('click', async () => {
    const email = modal.querySelector('#invite-email').value.trim();
    const role  = modal.querySelector('#invite-role').value;
    if (!email) { toast('Introduce un email', 'warning'); return; }

    // Generate unique token and invite URL
    const token    = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const inviteUrl = window.location.origin + window.location.pathname + '#register?invite=' + token;

    try {
      await db.collection('invitations').add({
        email,
        role,
        token,
        inviteUrl,
        invitedBy: getUserProfile()?.uid,
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
      modal.querySelector('#btn-generate-invite').textContent = '✅ Enlace generado';

      toast('Enlace de invitación generado', 'success');

      // Copy link
      modal.querySelector('#btn-copy-invite')?.addEventListener('click', () => {
        navigator.clipboard.writeText(inviteUrl)
          .then(() => toast('Enlace copiado al portapapeles', 'success'))
          .catch(() => {
            // Fallback for browsers that block clipboard
            urlInput.select();
            document.execCommand('copy');
            toast('Enlace copiado', 'success');
          });
      });

      // Send via email client
      modal.querySelector('#btn-email-invite')?.addEventListener('click', () => {
        const subject = encodeURIComponent('Invitación TGWL');
        const body    = encodeURIComponent(
          `Hola,\n\nTe han invitado a unirse a TGWL.\n\n` +
          `Haz clic en el siguiente enlace para crear tu cuenta:\n${inviteUrl}\n\n` +
          `Este enlace es personal e intransferible.\n\n` +
          `Saludos,\nEl equipo TGWL`
        );
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      });

    } catch (e) {
      toast('Error al generar invitación: ' + e.message, 'error');
    }
  });
}
