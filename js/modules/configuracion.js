/* ═══════════════════════════════════════════════
   TGWL — modules/configuracion.js
   App Settings Module
═══════════════════════════════════════════════ */

import { appState, updateSettings, getSettings } from '../state.js';
import { toast, requestWakeLock, releaseWakeLock } from '../utils.js';
import { setLang, t } from '../i18n.js';

export async function render(container) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="page active" id="configuracion-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">${t('settings_title')}</h2>
            <p class="page-subtitle">${t('settings_subtitle')}</p>
          </div>
        </div>

        <!-- Apariencia -->
        <div class="section-title">${t('appearance')}</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('dark_mode')}</div>
              <div class="settings-item-desc">${t('dark_mode_desc')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-dark" ${settings.darkMode !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(25,249,249,0.15)"></div>
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

        <!-- Idioma -->
        <div class="section-title">${t('language')}</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(59,130,246,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('language_app')}</div>
            </div>
            <div class="settings-item-right">
              <select id="select-language" style="background:transparent;border:none;color:var(--color-text-muted);font-size:13px">
                <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español</option>
                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Notificaciones -->
        <div class="section-title">${t('notifications')}</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(245,158,11,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('push_notif')}</div>
              <div class="settings-item-desc">${t('push_notif_desc')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-notifications" ${settings.notifications !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-item" id="notification-status-row" ${settings.notifications !== false ? '' : 'style="opacity:0.5"'}>
            <div class="settings-item-icon" style="background:rgba(34,197,94,0.15)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('notif_status')}</div>
              <div class="settings-item-desc" id="notif-permission-desc">${t('notif_checking')}</div>
            </div>
            <button class="btn-accent" id="btn-request-notif" style="padding:6px 14px;font-size:12px">${t('notif_activate')}</button>
          </div>
        </div>

        <!-- Pantalla -->
        <div class="section-title">${t('screen')}</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('keep_awake')}</div>
              <div class="settings-item-desc">${t('keep_awake_desc')}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-wake-lock" ${settings.keepAwake ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- PWA Install -->
        <div class="section-title">${t('app')}</div>
        <div class="settings-group">
          <div class="settings-item" id="btn-install-pwa" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('install')}</div>
              <div class="settings-item-desc">${t('install_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-clear-cache" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.15)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('clear_cache')}</div>
              <div class="settings-item-desc">${t('clear_cache_desc')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <!-- About -->
        <div class="section-title">${t('about')}</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.2)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('version')}</div>
            </div>
            <div class="settings-item-right" style="font-size:13px;color:var(--color-text-muted)">1.0.0</div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(193,8,1,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('privacy')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.15)"></div>
            <div class="settings-item-info">
              <div class="settings-item-label">${t('terms')}</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-xl)">
          TGWL — The Goal Will Live · v1.0.0<br>
          ${t('copyright')}
        </p>
      </div>
    </div>
  `;
}

export async function init(container) {
  const settings = getSettings();

  // Dark mode toggle
  container.querySelector('#toggle-dark')?.addEventListener('change', (e) => {
    const dark = e.target.checked;
    updateSettings({ darkMode: dark });
    document.body.classList.toggle('dark-mode',  dark);
    document.body.classList.toggle('light-mode', !dark);
    toast(dark ? t('dark_mode_on') : t('dark_mode_off'), 'info');
  });

  // Muscle map toggle
  container.querySelector('#toggle-muscle-map')?.addEventListener('change', (e) => {
    updateSettings({ showMuscleMap: e.target.checked });
    toast(e.target.checked ? t('muscle_map_on') : t('muscle_map_off'), 'info');
  });

  // Language selector — actually applies translations
  container.querySelector('#select-language')?.addEventListener('change', (e) => {
    const lang = e.target.value;
    updateSettings({ language: lang });
    setLang(lang);
    toast(lang === 'es' ? 'Idioma: Español' : 'Language: English', 'info');
  });

  // Notifications toggle
  container.querySelector('#toggle-notifications')?.addEventListener('change', async (e) => {
    updateSettings({ notifications: e.target.checked });
    container.querySelector('#notification-status-row').style.opacity = e.target.checked ? '1' : '0.5';
    if (e.target.checked) await checkNotificationPermission(container);
  });

  // Request notifications permission
  container.querySelector('#btn-request-notif')?.addEventListener('click', async () => {
    await requestNotifications(container);
  });

  // Wake lock toggle
  container.querySelector('#toggle-wake-lock')?.addEventListener('change', async (e) => {
    updateSettings({ keepAwake: e.target.checked });
    if (e.target.checked) {
      await requestWakeLock();
      toast(t('wake_lock_on'), 'info');
    } else {
      releaseWakeLock();
      toast(t('wake_lock_off'), 'info');
    }
  });

  // PWA install
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

  // Clear cache
  container.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      toast(t('cache_cleared'), 'success');
    } catch { toast(t('cache_clear_error'), 'error'); }
  });

  // Check notification permission
  await checkNotificationPermission(container);
}

// ── Notification Permission ───────────────────
async function checkNotificationPermission(container) {
  const descEl = container.querySelector('#notif-permission-desc');
  const btn    = container.querySelector('#btn-request-notif');
  if (!descEl) return;

  if (!('Notification' in window)) {
    descEl.textContent = t('notif_not_supported');
    if (btn) btn.style.display = 'none';
    return;
  }

  const perm = Notification.permission;
  if (perm === 'granted') {
    descEl.textContent = t('notif_granted');
    if (btn) btn.style.display = 'none';
  } else if (perm === 'denied') {
    descEl.textContent = t('notif_denied');
    if (btn) btn.style.display = 'none';
  } else {
    descEl.textContent = t('notif_pending');
    if (btn) btn.style.display = '';
  }
}

async function requestNotifications(container) {
  if (!('Notification' in window)) {
    toast(t('notif_not_supported_toast'), 'error');
    return;
  }

  const perm = await Notification.requestPermission();
  await checkNotificationPermission(container);

  if (perm === 'granted') {
    toast(t('notif_activated'), 'success');
    // Register service worker push (if available)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) updateSettings({ swRegistered: true });
    }
  } else {
    toast(t('notif_denied_toast'), 'warning');
  }
}
