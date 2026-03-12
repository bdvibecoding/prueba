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
            <h2 class="page-title">⚙️ Ajustes</h2>
            <p class="page-subtitle">Personaliza tu experiencia</p>
          </div>
        </div>

        <!-- Apariencia -->
        <div class="section-title">Apariencia</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.2)">🌙</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Modo oscuro</div>
              <div class="settings-item-desc">Tema oscuro para un mejor contraste</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-dark" ${settings.darkMode !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(25,249,249,0.15)">🗺️</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Mapa muscular</div>
              <div class="settings-item-desc">Mostrar mapa de músculos al finalizar entreno</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-muscle-map" ${settings.showMuscleMap !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Idioma -->
        <div class="section-title">Idioma</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(59,130,246,0.2)">🌐</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Idioma de la app</div>
            </div>
            <div class="settings-item-right">
              <select id="select-language" style="background:transparent;border:none;color:var(--color-text-muted);font-size:13px">
                <option value="es" ${settings.language === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Notificaciones -->
        <div class="section-title">Notificaciones</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(245,158,11,0.2)">🔔</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Notificaciones push</div>
              <div class="settings-item-desc">Avisos del temporizador de descanso y recordatorios</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-notifications" ${settings.notifications !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-item" id="notification-status-row" ${settings.notifications !== false ? '' : 'style="opacity:0.5"'}>
            <div class="settings-item-icon" style="background:rgba(34,197,94,0.15)">📱</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Estado del permiso</div>
              <div class="settings-item-desc" id="notif-permission-desc">Comprobando...</div>
            </div>
            <button class="btn-accent" id="btn-request-notif" style="padding:6px 14px;font-size:12px">Activar</button>
          </div>
        </div>

        <!-- Pantalla -->
        <div class="section-title">Pantalla</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(168,85,247,0.2)">💡</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Mantener pantalla activa</div>
              <div class="settings-item-desc">Evita que la pantalla se apague durante el entreno</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-wake-lock" ${settings.keepAwake ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- PWA Install -->
        <div class="section-title">Aplicación</div>
        <div class="settings-group">
          <div class="settings-item" id="btn-install-pwa" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.2)">📲</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Instalar en dispositivo</div>
              <div class="settings-item-desc">Añade TGWL a tu pantalla de inicio</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item" id="btn-clear-cache" style="cursor:pointer">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.15)">🗑️</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Limpiar caché</div>
              <div class="settings-item-desc">Elimina datos temporales almacenados</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <!-- About -->
        <div class="section-title">Sobre la app</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(148,10,10,0.2)">ℹ️</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Versión</div>
            </div>
            <div class="settings-item-right" style="font-size:13px;color:var(--color-text-muted)">1.0.0</div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(25,249,249,0.1)">🔒</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Política de privacidad</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(107,114,128,0.15)">📄</div>
            <div class="settings-item-info">
              <div class="settings-item-label">Términos de uso</div>
            </div>
            <div class="settings-item-right">›</div>
          </div>
        </div>

        <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-xl)">
          TGWL — The Goal Will Live · v1.0.0<br>
          © 2024 Todos los derechos reservados
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
    toast(dark ? 'Modo oscuro activado 🌙' : 'Modo claro activado ☀️', 'info');
  });

  // Muscle map toggle
  container.querySelector('#toggle-muscle-map')?.addEventListener('change', (e) => {
    updateSettings({ showMuscleMap: e.target.checked });
    toast(e.target.checked ? 'Mapa muscular activado' : 'Mapa muscular desactivado', 'info');
  });

  // Language selector — actually applies translations
  container.querySelector('#select-language')?.addEventListener('change', (e) => {
    const lang = e.target.value;
    updateSettings({ language: lang });
    setLang(lang);
    toast(lang === 'es' ? 'Idioma: Español 🇪🇸' : 'Language: English 🇬🇧', 'info');
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
      toast('Pantalla activa durante el entreno 💡', 'info');
    } else {
      releaseWakeLock();
      toast('Pantalla se apagará normalmente', 'info');
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
      if (outcome === 'accepted') toast('¡TGWL instalada! 🎉', 'success');
    } else {
      toast('Para instalar: comparte > "Añadir a pantalla de inicio"', 'info', 5000);
    }
  });

  // Clear cache
  container.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      toast('Caché limpiada ✅', 'success');
    } catch { toast('No se pudo limpiar la caché', 'error'); }
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
    descEl.textContent = 'No soportado en este navegador';
    if (btn) btn.style.display = 'none';
    return;
  }

  const perm = Notification.permission;
  if (perm === 'granted') {
    descEl.textContent = '✅ Notificaciones activadas';
    if (btn) btn.style.display = 'none';
  } else if (perm === 'denied') {
    descEl.textContent = '❌ Permisos denegados — actívalos en el navegador';
    if (btn) btn.style.display = 'none';
  } else {
    descEl.textContent = 'Permiso pendiente';
    if (btn) btn.style.display = '';
  }
}

async function requestNotifications(container) {
  if (!('Notification' in window)) {
    toast('Notificaciones no soportadas', 'error');
    return;
  }

  const perm = await Notification.requestPermission();
  await checkNotificationPermission(container);

  if (perm === 'granted') {
    toast('¡Notificaciones activadas! 🔔', 'success');
    // Register service worker push (if available)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) updateSettings({ swRegistered: true });
    }
  } else {
    toast('Permiso denegado para notificaciones', 'warning');
  }
}
