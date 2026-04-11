/* ═══════════════════════════════════════════════
   TGWL — modules/perfil.js
   User Profile Module
═══════════════════════════════════════════════ */

import { getUserProfile, setUser, appState } from '../state.js';
import { auth, db, storage, storagePaths, timestamp } from '../firebase-config.js';
import { toast, getAge, getInitials, formatDate, translateRole } from '../utils.js';
import { confirm } from '../components/modal.js';
import { logout } from '../auth.js';
import { t } from '../i18n.js';

export async function render(container) {
  const profile = getUserProfile();

  container.innerHTML = `
    <div class="page active" id="perfil-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <h2 class="page-title">👤 ${t('perfil_title')}</h2>
          <div style="display:flex;gap:8px">
            <button class="btn-icon" id="btn-edit-toggle" title="${t('edit')}">✏️</button>
            <button class="btn-icon" id="btn-logout" title="${t('perfil_logout')}" style="color:var(--color-danger)">🚪</button>
          </div>
        </div>

        <!-- Avatar -->
        <div class="profile-avatar-wrap">
          <div class="profile-avatar" id="profile-avatar" style="cursor:pointer">
            ${profile?.photoURL ? `<img src="${profile.photoURL}" alt="Avatar">` : getInitials(profile?.name || '?')}
            <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid var(--color-bg)">📷</div>
          </div>
          <div class="profile-name">${profile?.name || t('user')}</div>
          <span class="profile-role-badge badge ${getRoleBadgeClass(profile?.role)}">${translateRole(profile?.role || 'cliente')}</span>
          ${profile?.birthDate ? `<p class="text-muted">${getAge(profile.birthDate)} ${t('perfil_years_old')}</p>` : ''}
        </div>

        <!-- Mis datos: acceso rápido a submódulos -->
        <div class="section-title" style="margin-top:var(--space-lg)">Mis datos</div>
        <div class="profile-subnav-grid">
          <div class="glass-card profile-subnav-card" data-nav="biomedidas" style="cursor:pointer">
            <span class="profile-subnav-icon">📏</span>
            <div class="profile-subnav-info">
              <div class="profile-subnav-title">Biomedidas</div>
              <div class="profile-subnav-desc">Peso, talla y composición corporal</div>
            </div>
            <span class="profile-subnav-arrow">›</span>
          </div>
          <div class="glass-card profile-subnav-card" data-nav="salud" style="cursor:pointer">
            <span class="profile-subnav-icon">❤️</span>
            <div class="profile-subnav-info">
              <div class="profile-subnav-title">Salud</div>
              <div class="profile-subnav-desc">Métricas de salud y bienestar</div>
            </div>
            <span class="profile-subnav-arrow">›</span>
          </div>
          <div class="glass-card profile-subnav-card" data-nav="progreso" style="cursor:pointer">
            <span class="profile-subnav-icon">📈</span>
            <div class="profile-subnav-info">
              <div class="profile-subnav-title">Progreso</div>
              <div class="profile-subnav-desc">Evolución y estadísticas</div>
            </div>
            <span class="profile-subnav-arrow">›</span>
          </div>
        </div>

        <!-- Datos de usuario: collapsible -->
        <div class="glass-card profile-subnav-card" id="btn-datos-usuario" style="cursor:pointer;margin-top:var(--space-md)">
          <span class="profile-subnav-icon">👤</span>
          <div class="profile-subnav-info">
            <div class="profile-subnav-title">Datos de usuario</div>
            <div class="profile-subnav-desc">Nombre, correo, datos físicos</div>
          </div>
          <span class="profile-subnav-arrow" id="datos-arrow">›</span>
        </div>
        <div id="datos-usuario-form" style="display:none">

        <!-- Profile Form -->
        <form id="profile-form" class="profile-form">
          <div class="settings-group">
            ${profileField('text',   'profile-name-input',  t('perfil_full_name'),    profile?.name || '',     '👤', false)}
            ${profileField('email',  'profile-email',       t('perfil_email'),        profile?.email || '',    '✉️', true)}
            ${profileField('date',   'profile-birth',       t('perfil_birth_date'),   profile?.birthDate || '','🎂', false)}
            ${profileSelectField('profile-gender', t('perfil_gender'), profile?.gender || '', [
              { value: '', label: t('perfil_select') },
              { value: 'masculino', label: t('perfil_male') },
              { value: 'femenino', label: t('perfil_female') },
              { value: 'otro', label: t('perfil_other_gender') },
            ])}
          </div>

          <!-- Physical Data -->
          <div class="section-title">${t('perfil_physical_data')}</div>
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(25,249,249,0.1)">📏</div>
              <div class="settings-item-info">
                <div class="settings-item-label">${t('perfil_height')}</div>
              </div>
              <div class="settings-item-right">
                <input type="number" id="profile-height" class="measurement-input" value="${profile?.height || ''}" placeholder="175" min="100" max="250">
                <span class="measurement-unit">cm</span>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(148,10,10,0.1)">⚖️</div>
              <div class="settings-item-info">
                <div class="settings-item-label">${t('perfil_initial_weight')}</div>
              </div>
              <div class="settings-item-right">
                <input type="number" id="profile-weight" class="measurement-input" value="${profile?.weight || ''}" placeholder="75" min="30" max="300" step="0.5">
                <span class="measurement-unit">kg</span>
              </div>
            </div>
          </div>

          <!-- Goals & Experience -->
          <div class="section-title">${t('perfil_goals_experience')}</div>
          <div class="settings-group">
            ${profileSelectField('profile-experience', t('perfil_experience_level'), profile?.experience || 'principiante', [
              { value: 'principiante', label: `🌱 ${t('perfil_beginner')}` },
              { value: 'intermedio',   label: `💪 ${t('perfil_intermediate')}` },
              { value: 'avanzado',     label: `🏆 ${t('perfil_advanced')}` },
              { value: 'elite',        label: `⭐ ${t('perfil_elite')}` },
            ])}
          </div>
          <div class="form-row" style="margin-top:var(--space-md)">
            <label class="field-label">🎯 Objetivo semanal (entrenos)</label>
            <input type="number" id="field-weekly-goal" class="input-solo" min="1" max="7" placeholder="3" value="${profile?.weeklyGoal || 3}" style="margin-top:4px">
          </div>
          <div class="form-row" style="margin-top:var(--space-md)">
            <label class="field-label">${t('perfil_sports_goals')}</label>
            <textarea id="profile-goals" class="input-solo" rows="3"
              placeholder="${t('perfil_goals_placeholder')}"
              style="padding:var(--space-md);width:100%;margin-top:4px">${profile?.goals || ''}</textarea>
          </div>

          <!-- Save button (hidden until edit mode) -->
          <button type="submit" class="btn-primary btn-full hidden" id="btn-save-profile" style="margin-top:var(--space-md)">
            💾 ${t('perfil_save_changes')}
          </button>
        </form>

        </div><!-- /datos-usuario-form -->

        <!-- Account section -->
        <div class="section-title" style="margin-top:var(--space-lg)">${t('perfil_account')}</div>
        <div class="settings-group">
          <div class="settings-item" id="btn-change-password" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.1)">🔑</div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('perfil_change_password')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-logout-item" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(239,68,68,0.1)">🚪</div>
            <div class="settings-item-info">
              <div class="settings-item-label" style="color:var(--color-danger)">${t('perfil_logout')}</div>
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

  // Subnav cards → navigate
  container.querySelectorAll('.profile-subnav-card[data-nav]').forEach(card => {
    card.addEventListener('click', () => {
      const route = card.dataset.nav;
      if (route) import('../router.js').then(({ navigate }) => navigate(route));
    });
  });

  // Datos de usuario accordion toggle
  const btnDatos = container.querySelector('#btn-datos-usuario');
  const datosForm = container.querySelector('#datos-usuario-form');
  const datosArrow = container.querySelector('#datos-arrow');
  btnDatos?.addEventListener('click', () => {
    const isOpen = datosForm.style.display !== 'none';
    datosForm.style.display = isOpen ? 'none' : 'block';
    if (datosArrow) datosArrow.textContent = isOpen ? '›' : '↓';
  });

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
    if (age !== null) toast(t('perfil_age_calculated').replace('{age}', age), 'info');
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
      weeklyGoal: parseInt(container.querySelector('#field-weekly-goal')?.value) || 3,
      goals:      container.querySelector('#profile-goals').value.trim(),
      updatedAt:  timestamp(),
    };

    try {
      await db.collection('users').doc(user.uid).update(updates);
      const newProfile = { ...profile, ...updates };
      setUser(user, newProfile);
      // Update top bar
      const greetingEl = document.getElementById('top-bar-greeting');
      if (greetingEl) greetingEl.textContent = `${t('greeting')}, ${updates.name.split(' ')[0]}`;
      document.getElementById('avatar-initials').textContent = getInitials(updates.name);
      toast(t('perfil_updated'), 'success');
      editMode = false;
      editBtn.textContent = '✏️';
      saveBtn.classList.add('hidden');
      form?.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; });
    } catch (err) {
      toast(t('error') + ': ' + err.message, 'error');
    }
  });

  // Change password
  container.querySelector('#btn-change-password')?.addEventListener('click', async () => {
    const user = appState.get('user');
    if (!user?.email) return;
    try {
      await auth.sendPasswordResetEmail(user.email);
      toast(t('perfil_reset_email_sent'), 'success');
    } catch (e) { toast(t('error') + ': ' + e.message, 'error'); }
  });

  // Logout
  const handleLogout = async () => {
    const ok = await confirm(t('perfil_logout'), t('perfil_logout_confirm'), { okText: t('perfil_logout_ok') });
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
        toast(t('perfil_photo_updated'), 'success');
      } catch (e) { toast(t('perfil_photo_error') + ': ' + e.message, 'error'); }
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
