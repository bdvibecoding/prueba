/* ═══════════════════════════════════════════════
   TGWL — modules/perfil.js
   Unified Profile & Settings Module
   (iOS Settings Architecture — spec §40-44)
═══════════════════════════════════════════════ */

import { getUserProfile, setUser, appState, updateSettings, getSettings } from '../state.js';
import { auth, db, storage, storagePaths, timestamp } from '../firebase-config.js';
import { toast, getInitials, requestWakeLock, releaseWakeLock } from '../utils.js';
import { confirm } from '../components/modal.js';
import { logout } from '../auth.js';
import { t, setLang } from '../i18n.js';

// t() returns the key when translation is missing, so _tFb won't catch it.
function _tFb(key, fallback) {
  const v = t(key);
  return (v === key || v == null) ? fallback : v;
}

export async function render(container) {
  const profile  = getUserProfile();
  const settings = getSettings();

  // §41.3 — email from profile or auth user
  const userEmail = profile?.email || appState.get('user')?.email || '';

  // §41.2 — avatar: clean circle, initials placeholder
  const avatarInner = profile?.photoURL
    ? `<img loading="lazy" decoding="async" src="${profile.photoURL}" alt="Avatar">`
    : `<span class="profile-avatar-initials">${getInitials(profile?.name || '?')}</span>`;

  container.innerHTML = `
    <div class="page active" id="perfil-page">
      <div style="padding:8px var(--page-pad) var(--page-pad)">

        <!-- §41.1 · Top Bar — solo icono de edición a la derecha -->
        <div class="page-header">
          <h2 class="page-title">${t('perfil_title')}</h2>
          <div style="display:flex;gap:8px">
            <button class="btn-icon" id="btn-edit-toggle" title="${t('edit')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
          </div>
        </div>

        <!-- §41.2 · Avatar — limpio, sin borde rojo, sin badge de cámara -->
        <div class="profile-avatar-wrap" style="gap:0;padding:var(--space-lg) 0 0">
          <div class="profile-avatar--clean" id="profile-avatar" style="cursor:pointer">
            ${avatarInner}
          </div>

          <!-- §41.3 · Nombre y email — sin badge de rol, sin edad -->
          <div class="profile-name profile-name--unified" style="margin-top:12px">${profile?.name || t('user')}</div>
          <div class="profile-email-line" style="margin-top:3px">${userEmail}</div>
        </div>

        <!-- §42 · Upgrade Banner — premium conversion card, gap 16px después del email -->
        <div class="upgrade-banner" id="upgrade-banner" style="margin-top:16px" role="button" tabindex="0" aria-label="Upgrade to Pro">
          <div class="upgrade-banner-left">
            <span class="upgrade-banner-title">Upgrade to Pro</span>
            <span class="upgrade-banner-subtitle">Planes, seguimiento avanzado y más</span>
          </div>
          <button class="upgrade-banner-btn" tabindex="-1" aria-hidden="true">
            <svg viewBox="0 0 10 10" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px"><path d="M2 8L8 2M8 2H4M8 2V6"/></svg>
            Upgrade
          </button>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 1 — MIS DATOS
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">MIS DATOS</div>
        <div class="settings-group">

          <!-- Biomedidas — §46: scale/weight icon -->
          <div class="settings-item" data-nav="biomedidas" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 2h12l2 7H4L6 2z"/><path d="M4 9a8 8 0 0 0 16 0"/><path d="M10 15h4"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">Biomedidas</div>
              <div class="settings-item-desc">Peso, talla y composición corporal</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>

          <!-- Salud — §46: heart rate/pulse icon -->
          <div class="settings-item" data-nav="salud" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l1.5-3 2 6.5 1.5-4.5H19"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">Salud</div>
              <div class="settings-item-desc">Métricas de salud y bienestar</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>

          <!-- Progreso — §46: chart/trending up icon -->
          <div class="settings-item" data-nav="progreso" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">Progreso</div>
              <div class="settings-item-desc">Evaluación y estadísticas</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>

          <!-- Datos de usuario — §46: person/user icon -->
          <div class="settings-item" id="btn-datos-usuario" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">Datos de usuario</div>
              <div class="settings-item-desc">Nombre, correo, datos físicos</div>
            </div>
            <div class="settings-item-right" id="datos-arrow">›</div>
          </div>
        </div>

        <!-- Datos de usuario form (accordion) -->
        <div id="datos-usuario-form" style="display:none">
          <form id="profile-form" class="profile-form">
            <div class="settings-group" style="margin-top:var(--space-sm)">
              ${profileField('text',  'profile-name-input',  t('perfil_full_name'),   profile?.name || '',
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`, false)}
              ${profileField('email', 'profile-email',        t('perfil_email'),       profile?.email || '',
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>`, true)}
              ${profileField('date',  'profile-birth',        t('perfil_birth_date'),  profile?.birthDate || '',
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`, false)}
              ${profileSelectField('profile-gender', t('perfil_gender'), profile?.gender || '', [
                { value: '',          label: t('perfil_select') },
                { value: 'masculino', label: t('perfil_male') },
                { value: 'femenino',  label: t('perfil_female') },
                { value: 'otro',      label: t('perfil_other_gender') },
              ], `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="9" r="4"/><path d="M3 20c0-3.87 4.03-7 9-7s9 3.13 9 7"/></svg>`)}
            </div>

            <!-- Datos físicos -->
            <div class="section-title" style="margin-top:var(--space-md)">${t('perfil_physical_data')}</div>
            <div class="settings-group">
              <div class="settings-item">
                <div class="settings-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                <div class="settings-item-info"><div class="settings-item-label">${t('perfil_height')}</div></div>
                <div class="settings-item-right">
                  <input type="number" id="profile-height" class="measurement-input" value="${profile?.height || ''}" placeholder="175" min="100" max="250">
                  <span class="measurement-unit">cm</span>
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v4"/></svg></div>
                <div class="settings-item-info"><div class="settings-item-label">${t('perfil_initial_weight')}</div></div>
                <div class="settings-item-right">
                  <input type="number" id="profile-weight" class="measurement-input" value="${profile?.weight || ''}" placeholder="75" min="30" max="300" step="0.5">
                  <span class="measurement-unit">kg</span>
                </div>
              </div>
            </div>

            <!-- Objetivos y experiencia -->
            <div class="section-title" style="margin-top:var(--space-md)">${t('perfil_goals_experience')}</div>
            <div class="settings-group">
              ${profileSelectField('profile-experience', t('perfil_experience_level'), profile?.experience || 'principiante', [
                { value: 'principiante', label: `${t('perfil_beginner')}` },
                { value: 'intermedio',   label: `${t('perfil_intermediate')}` },
                { value: 'avanzado',     label: `${t('perfil_advanced')}` },
                { value: 'elite',        label: `${t('perfil_elite')}` },
              ])}
            </div>
            <div class="form-row" style="margin-top:var(--space-md)">
              <label class="field-label">Objetivo semanal (entrenos)</label>
              <input type="number" id="field-weekly-goal" class="input-solo" min="1" max="7" placeholder="3" value="${profile?.weeklyGoal || 3}" style="margin-top:4px">
            </div>
            <div class="form-row" style="margin-top:var(--space-md)">
              <label class="field-label">${t('perfil_sports_goals')}</label>
              <textarea id="profile-goals" class="input-solo" rows="3"
                placeholder="${t('perfil_goals_placeholder')}"
                style="padding:var(--space-md);width:100%;margin-top:4px">${profile?.goals || ''}</textarea>
            </div>

            <button type="submit" class="btn-primary btn-full hidden" id="btn-save-profile" style="margin-top:var(--space-md)">
              ${t('perfil_save_changes')}
            </button>
          </form>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 2 — APARIENCIA
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">${t('appearance')}</div>
        <div class="settings-group">
          <!-- Modo oscuro — §46: moon icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('dark_mode')}</div>
              <div class="settings-item-desc">${t('dark_mode_desc')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-dark" ${settings.darkMode !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <!-- Mapa muscular — §46: body/torso silhouette icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M18 4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2l-1 5h3v11h8V9h3L18 4z"/><path d="M9 9c-1.5 0-2.5 1-2.5 2.5"/><path d="M15 9c1.5 0 2.5 1 2.5 2.5"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('muscle_map')}</div>
              <div class="settings-item-desc">${t('muscle_map_desc')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-muscle-map" ${settings.showMuscleMap !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 3 — PREFERENCIAS
             (Idioma + Unidades + Notificaciones fusionados)
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">PREFERENCIAS</div>
        <div class="settings-group">
          <!-- Idioma — §46: globe icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('language_app')}</div>
            </div>
            <div class="settings-item-right">
              <select id="select-language" style="background:transparent;border:none;color:var(--color-text-muted);font-size:13px;text-align:right">
                <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español</option>
                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
          </div>
          <!-- Unidades — §46: ruler/measure icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v4M10 6v2M14 6v4M18 6v2"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${_tFb('units_label','Sistema de unidades')}</div>
              <div class="settings-item-desc">${_tFb('units_desc','Métrico (kg, cm) o imperial (lb, ft)')}</div>
            </div>
            <div class="settings-item-right">
              <select id="select-units" style="background:transparent;border:none;color:var(--color-text-muted);font-size:13px;text-align:right">
                <option value="metric"   ${(settings.units || 'metric') === 'metric'   ? 'selected' : ''}>${_tFb('units_metric','Métrico')}</option>
                <option value="imperial" ${settings.units === 'imperial' ? 'selected' : ''}>${_tFb('units_imperial','Imperial')}</option>
              </select>
            </div>
          </div>
          <!-- Notificaciones push — §46: bell icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('push_notif')}</div>
              <div class="settings-item-desc" id="notif-permission-desc">${t('notif_checking')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-notifications" ${settings.notifications !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 4 — CUENTA
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">${t('perfil_account')}</div>
        <div class="settings-group">
          <!-- Cambiar contraseña — §46: lock icon -->
          <div class="settings-item" id="btn-change-password" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('perfil_change_password')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 5 — APLICACIÓN
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">${t('app')}</div>
        <div class="settings-group">
          <!-- Instalar en dispositivo — §46: download/add to home icon -->
          <div class="settings-item" id="btn-install-pwa" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('install')}</div>
              <div class="settings-item-desc">${t('install_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <!-- Limpiar caché — §46: trash/clear icon -->
          <div class="settings-item" id="btn-clear-cache" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('clear_cache')}</div>
              <div class="settings-item-desc">${t('clear_cache_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 6 — INFORMACIÓN
             (Fusión de "Sobre la App" original)
        ══════════════════════════════════════════ -->
        <div class="section-title" style="margin-top:var(--space-lg)">${t('about')}</div>
        <div class="settings-group">
          <!-- Versión de la app — §46: info circle icon -->
          <div class="settings-item">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('version')}</div>
            </div>
            <div class="settings-item-right" style="font-size:13px;color:var(--color-text-tertiary)">1.0.0</div>
          </div>
          <!-- Política de privacidad — §46: shield icon -->
          <div class="settings-item" id="btn-privacy" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('privacy')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <!-- Términos de uso — §46: document icon -->
          <div class="settings-item" id="btn-terms" style="cursor:pointer">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('terms')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             §43 · BLOQUE 7 — Cerrar sesión
             Acción destructiva suelta, fuera de cualquier bloque.
             Sin icono. Texto centrado. color:#C10801 · 14px · 400.
             padding-top: 24px · padding-bottom (safe area): 32px
        ══════════════════════════════════════════ -->
        <button class="btn-logout-destructive" id="btn-logout">
          ${t('perfil_logout')}
        </button>

      </div>
    </div>
  `;
}

export async function init(container) {
  const profile  = getUserProfile();
  const settings = getSettings();
  let editMode = false;

  // ── §41.2 · Navegación de submódulos (filas MIS DATOS) ─────────────
  container.querySelectorAll('.settings-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.dataset.nav;
      if (route) import('../router.js').then(({ navigate }) => navigate(route));
    });
  });

  // ── §41.3 · Accordion Datos de usuario ───────────────────────────────
  const btnDatos   = container.querySelector('#btn-datos-usuario');
  const datosForm  = container.querySelector('#datos-usuario-form');
  const datosArrow = container.querySelector('#datos-arrow');
  btnDatos?.addEventListener('click', () => {
    const isOpen = datosForm.style.display !== 'none';
    datosForm.style.display = isOpen ? 'none' : 'block';
    if (datosArrow) datosArrow.textContent = isOpen ? '›' : '↓';
  });

  // ── §41.1 · Edit mode (top bar pencil icon) ──────────────────────────
  const form    = container.querySelector('#profile-form');
  const saveBtn = container.querySelector('#btn-save-profile');
  const editBtn = container.querySelector('#btn-edit-toggle');

  const iconPencil = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const iconClose  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  editBtn?.addEventListener('click', () => {
    editMode = !editMode;
    // Open accordion when entering edit mode
    if (editMode && datosForm.style.display === 'none') {
      datosForm.style.display = 'block';
      if (datosArrow) datosArrow.textContent = '↓';
    }
    editBtn.innerHTML = editMode ? iconClose : iconPencil;
    saveBtn.classList.toggle('hidden', !editMode);
    form?.querySelectorAll('input:not([readonly]), select, textarea').forEach(inp => {
      inp.disabled = !editMode;
    });
  });

  // Disable fields initially
  form?.querySelectorAll('input:not([readonly]), select, textarea').forEach(inp => {
    inp.disabled = true;
  });

  // ── §41.2 · Avatar upload (tap → file picker, opacity:0.85 al presionar) ──
  const avatarEl = container.querySelector('#profile-avatar');
  if (avatarEl) {
    const fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Micro-animación al presionar (opacity 0.85)
    avatarEl.addEventListener('pointerdown', () => { avatarEl.style.opacity = '0.85'; });
    avatarEl.addEventListener('pointerup',   () => { avatarEl.style.opacity = '1';    });
    avatarEl.addEventListener('pointerleave',() => { avatarEl.style.opacity = '1';    });

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
        avatarEl.innerHTML = `<img loading="lazy" decoding="async" src="${url}" alt="Avatar">`;
        toast(t('perfil_photo_updated'), 'success');
      } catch (e) { toast(t('perfil_photo_error') + ': ' + e.message, 'error'); }
    });
  }

  // ── Save profile form ─────────────────────────────────────────────────
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
      // Update displayed name/email in header
      const nameEl = container.querySelector('.profile-name--unified');
      if (nameEl) nameEl.textContent = updates.name || t('user');
      toast(t('perfil_updated'), 'success');
      editMode = false;
      editBtn.innerHTML = iconPencil;
      saveBtn.classList.add('hidden');
      form?.querySelectorAll('input, select, textarea').forEach(inp => { inp.disabled = true; });
    } catch (err) {
      toast(t('error') + ': ' + err.message, 'error');
    }
  });

  // ── Change password ───────────────────────────────────────────────────
  container.querySelector('#btn-change-password')?.addEventListener('click', async () => {
    const user = appState.get('user');
    if (!user?.email) return;
    try {
      await auth.sendPasswordResetEmail(user.email);
      toast(t('perfil_reset_email_sent'), 'success');
    } catch (e) { toast(t('error') + ': ' + e.message, 'error'); }
  });

  // ── §43·7 · Logout — botón rojo suelto al final ──────────────────────
  container.querySelector('#btn-logout')?.addEventListener('click', async () => {
    const ok = await confirm(t('perfil_logout'), t('perfil_logout_confirm'), { okText: t('perfil_logout_ok') });
    if (ok) { await logout(); window.location.reload(); }
  });

  // ── §42 · Upgrade banner — full-width tappable area ──────────────────
  const upgradeBanner = container.querySelector('#upgrade-banner');
  upgradeBanner?.addEventListener('click', () => {
    import('../router.js').then(({ navigate }) => navigate('suscripcion'));
  });
  upgradeBanner?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      import('../router.js').then(({ navigate }) => navigate('suscripcion'));
    }
  });
  // pressed micro-animation
  upgradeBanner?.addEventListener('pointerdown', () => {
    upgradeBanner.style.opacity = '0.90';
    upgradeBanner.style.transform = 'scale(0.98)';
  });
  const resetBanner = () => {
    upgradeBanner.style.opacity = '1';
    upgradeBanner.style.transform = 'scale(1)';
  };
  upgradeBanner?.addEventListener('pointerup',    resetBanner);
  upgradeBanner?.addEventListener('pointerleave', resetBanner);

  // ── §43·2 · Apariencia toggles ───────────────────────────────────────
  container.querySelector('#toggle-dark')?.addEventListener('change', (e) => {
    const dark = e.target.checked;
    updateSettings({ darkMode: dark });
    document.body.classList.toggle('dark-mode',  dark);
    document.body.classList.toggle('light-mode', !dark);
    toast(dark ? t('dark_mode_on') : t('dark_mode_off'), 'info');
  });

  container.querySelector('#toggle-muscle-map')?.addEventListener('change', (e) => {
    updateSettings({ showMuscleMap: e.target.checked });
    toast(e.target.checked ? t('muscle_map_on') : t('muscle_map_off'), 'info');
  });

  // ── §43·3 · Preferencias — idioma, unidades, notificaciones ──────────
  container.querySelector('#select-language')?.addEventListener('change', (e) => {
    const lang = e.target.value;
    updateSettings({ language: lang });
    setLang(lang);
    toast(lang === 'es' ? 'Idioma: Español' : 'Language: English', 'info');
  });

  container.querySelector('#select-units')?.addEventListener('change', (e) => {
    const units = e.target.value;
    updateSettings({ units });
    toast(units === 'imperial' ? 'Unidades: lb / ft' : 'Unidades: kg / cm', 'info');
  });

  container.querySelector('#toggle-notifications')?.addEventListener('change', async (e) => {
    updateSettings({ notifications: e.target.checked });
    if (e.target.checked) await _checkNotifPermission(container);
  });

  // ── §43·5 · Aplicación — PWA install, clear cache ────────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  container.querySelector('#btn-install-pwa')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') toast(t('installed'), 'success');
    } else {
      toast(t('install_fallback'), 'info', 5000);
    }
  });

  container.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      toast(t('cache_cleared'), 'success');
    } catch { toast(t('cache_clear_error'), 'error'); }
  });

  // Check notification permission on load
  await _checkNotifPermission(container);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function profileField(type, id, label, value, icon, readonly = false) {
  return `
    <div class="settings-item">
      ${icon ? `<div class="settings-item-icon">${icon}</div>` : ''}
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

function profileSelectField(id, label, value, options, icon = '') {
  const opts = options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('');
  return `
    <div class="settings-item">
      ${icon ? `<div class="settings-item-icon">${icon}</div>` : ''}
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

async function _checkNotifPermission(container) {
  const descEl = container.querySelector('#notif-permission-desc');
  if (!descEl) return;
  if (!('Notification' in window)) {
    descEl.textContent = t('notif_not_supported');
    return;
  }
  const perm = Notification.permission;
  if (perm === 'granted') {
    descEl.textContent = t('notif_granted');
  } else if (perm === 'denied') {
    descEl.textContent = t('notif_denied');
  } else {
    descEl.textContent = t('notif_pending');
  }
}
