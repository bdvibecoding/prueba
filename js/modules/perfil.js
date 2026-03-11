/* ═══════════════════════════════════════════════
   TGWL — modules/perfil.js
   User Profile Module
═══════════════════════════════════════════════ */

import { getUserProfile, setUser, appState } from '../state.js';
import { auth, db, storage, storagePaths, timestamp } from '../firebase-config.js';
import { toast, getAge, getInitials, formatDate, translateRole } from '../utils.js';
import { confirm } from '../components/modal.js';
import { logout } from '../auth.js';

export async function render(container) {
  const profile = getUserProfile();

  container.innerHTML = `
    <div class="page active" id="perfil-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <h2 class="page-title">👤 Perfil</h2>
          <div style="display:flex;gap:8px">
            <button class="btn-icon" id="btn-edit-toggle" title="Editar">✏️</button>
            <button class="btn-icon" id="btn-logout" title="Cerrar sesión" style="color:var(--color-danger)">🚪</button>
          </div>
        </div>

        <!-- Avatar -->
        <div class="profile-avatar-wrap">
          <div class="profile-avatar" id="profile-avatar" style="cursor:pointer">
            ${profile?.photoURL ? `<img src="${profile.photoURL}" alt="Avatar">` : getInitials(profile?.name || '?')}
            <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid var(--color-bg)">📷</div>
          </div>
          <div class="profile-name">${profile?.name || 'Usuario'}</div>
          <span class="profile-role-badge badge ${getRoleBadgeClass(profile?.role)}">${translateRole(profile?.role || 'cliente')}</span>
          ${profile?.birthDate ? `<p class="text-muted">${getAge(profile.birthDate)} años</p>` : ''}
        </div>

        <!-- Profile Form -->
        <form id="profile-form" class="profile-form">
          <div class="settings-group">
            ${profileField('text',   'profile-name-input',  'Nombre completo',    profile?.name || '',     '👤', false)}
            ${profileField('email',  'profile-email',       'Correo',             profile?.email || '',    '✉️', true)}
            ${profileField('date',   'profile-birth',       'Fecha de nacimiento', profile?.birthDate || '','🎂', false)}
            ${profileSelectField('profile-gender', 'Género', profile?.gender || '', [
              { value: '', label: 'Seleccionar...' },
              { value: 'masculino', label: 'Masculino' },
              { value: 'femenino', label: 'Femenino' },
              { value: 'otro', label: 'Otro / Prefiero no indicar' },
            ])}
          </div>

          <!-- Physical Data -->
          <div class="section-title">Datos físicos</div>
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(25,249,249,0.1)">📏</div>
              <div class="settings-item-info">
                <div class="settings-item-label">Talla</div>
              </div>
              <div class="settings-item-right">
                <input type="number" id="profile-height" class="measurement-input" value="${profile?.height || ''}" placeholder="175" min="100" max="250">
                <span class="measurement-unit">cm</span>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(148,10,10,0.1)">⚖️</div>
              <div class="settings-item-info">
                <div class="settings-item-label">Peso inicial</div>
              </div>
              <div class="settings-item-right">
                <input type="number" id="profile-weight" class="measurement-input" value="${profile?.weight || ''}" placeholder="75" min="30" max="300" step="0.5">
                <span class="measurement-unit">kg</span>
              </div>
            </div>
          </div>

          <!-- Goals & Experience -->
          <div class="section-title">Objetivos y experiencia</div>
          <div class="settings-group">
            ${profileSelectField('profile-experience', 'Nivel de experiencia', profile?.experience || 'principiante', [
              { value: 'principiante', label: '🌱 Principiante' },
              { value: 'intermedio',   label: '💪 Intermedio' },
              { value: 'avanzado',     label: '🏆 Avanzado' },
              { value: 'elite',        label: '⭐ Élite' },
            ])}
          </div>
          <div class="form-row" style="margin-top:var(--space-md)">
            <label class="field-label">Objetivos deportivos</label>
            <textarea id="profile-goals" class="input-solo" rows="3"
              placeholder="Ej: Perder grasa, ganar masa muscular, mejorar rendimiento en competición..."
              style="padding:var(--space-md);width:100%;margin-top:4px">${profile?.goals || ''}</textarea>
          </div>

          <!-- Save button (hidden until edit mode) -->
          <button type="submit" class="btn-primary btn-full hidden" id="btn-save-profile" style="margin-top:var(--space-md)">
            💾 Guardar cambios
          </button>
        </form>

        <!-- Account section -->
        <div class="section-title" style="margin-top:var(--space-lg)">Cuenta</div>
        <div class="settings-group">
          <div class="settings-item" id="btn-change-password" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.1)">🔑</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Cambiar contraseña</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-logout-item" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(239,68,68,0.1)">🚪</div>
            <div class="settings-item-info">
              <div class="settings-item-label" style="color:var(--color-danger)">Cerrar sesión</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  const profile = getUserProfile();
  let editMode = false;

  const form    = container.querySelector('#profile-form');
  const saveBtn = container.querySelector('#btn-save-profile');
  const editBtn = container.querySelector('#btn-edit-toggle');

  // Toggle edit mode
  editBtn?.addEventListener('click', () => {
    editMode = !editMode;
    editBtn.textContent = editMode ? '✕' : '✏️';
    saveBtn.classList.toggle('hidden', !editMode);
    form?.querySelectorAll('input:not([readonly]), select, textarea').forEach(input => {
      input.disabled = !editMode;
    });
  });

  // Initially disable fields
  form?.querySelectorAll('input:not([readonly]), select, textarea').forEach(input => {
    input.disabled = true;
  });

  // Update age dynamically
  container.querySelector('#profile-birth')?.addEventListener('change', (e) => {
    const age = getAge(e.target.value);
    if (age !== null) toast(`Edad calculada: ${age} años`, 'info');
  });

  // Save form
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = appState.get('user');
    if (!user) return;

    const updates = {
      name:       container.querySelector('#profile-name-input').value.trim(),
      birthDate:  container.querySelector('#profile-birth').value,
      gender:     container.querySelector('#profile-gender').value,
      height:     parseFloat(container.querySelector('#profile-height').value) || null,
      weight:     parseFloat(container.querySelector('#profile-weight').value) || null,
      experience: container.querySelector('#profile-experience').value,
      goals:      container.querySelector('#profile-goals').value.trim(),
      updatedAt:  timestamp(),
    };

    try {
      await db.collection('users').doc(user.uid).update(updates);
      const newProfile = { ...profile, ...updates };
      setUser(user, newProfile);
      // Update top bar
      document.getElementById('top-bar-greeting').textContent = `Buenos días, ${updates.name.split(' ')[0]}`;
      document.getElementById('avatar-initials').textContent = getInitials(updates.name);
      toast('Perfil actualizado ✅', 'success');
      editMode = false;
      editBtn.textContent = '✏️';
      saveBtn.classList.add('hidden');
      form?.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; });
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    }
  });

  // Change password
  container.querySelector('#btn-change-password')?.addEventListener('click', async () => {
    const user = appState.get('user');
    if (!user?.email) return;
    try {
      await auth.sendPasswordResetEmail(user.email);
      toast('Email de recuperación enviado', 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });

  // Logout
  const handleLogout = async () => {
    const ok = await confirm('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', { okText: 'Sí, salir' });
    if (ok) {
      await logout();
      window.location.reload();
    }
  };
  container.querySelector('#btn-logout')?.addEventListener('click', handleLogout);
  container.querySelector('#btn-logout-item')?.addEventListener('click', handleLogout);

  // Avatar upload
  const avatarEl = container.querySelector('#profile-avatar');
  if (avatarEl) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    avatarEl.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const user = appState.get('user');
      try {
        const ref = storage.ref(storagePaths.avatar(user.uid));
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.collection('users').doc(user.uid).update({ photoURL: url, updatedAt: timestamp() });
        const newProfile = { ...profile, photoURL: url };
        setUser(user, newProfile);
        avatarEl.innerHTML = `<img src="${url}" alt="Avatar">
          <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid var(--color-bg)">📷</div>`;
        toast('Foto actualizada ✅', 'success');
      } catch (e) { toast('Error subiendo foto: ' + e.message, 'error'); }
    });
  }
}

// ── Helpers ───────────────────────────────────
function profileField(type, id, label, value, icon, readonly = false) {
  return `
    <div class="settings-item">
      <div class="settings-item-icon" style="background:rgba(255,255,255,0.06)">${icon}</div>
      <div class="settings-item-info">
        <div class="settings-item-label">${label}</div>
      </div>
      <div class="settings-item-right">
        <input type="${type}" id="${id}" class="measurement-input"
          value="${value}" ${readonly ? 'readonly' : ''}
          style="width:auto;max-width:180px;text-align:right">
      </div>
    </div>
  `;
}

function profileSelectField(id, label, value, options) {
  const opts = options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('');
  return `
    <div class="settings-item">
      <div class="settings-item-info">
        <div class="settings-item-label">${label}</div>
      </div>
      <div class="settings-item-right">
        <select id="${id}" style="background:transparent;border:none;color:var(--color-text-muted);font-size:13px;text-align:right">
          ${opts}
        </select>
      </div>
    </div>
  `;
}

function getRoleBadgeClass(role) {
  const map = { admin: 'badge-red', coach: 'badge-cyan', medico: 'badge-green', nutricionista: 'badge-orange', cliente: 'badge-gray' };
  return map[role] || 'badge-gray';
}
