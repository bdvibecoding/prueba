/* ═══════════════════════════════════════════════
   TGWL — app.js
   Main Application Entry Point
═══════════════════════════════════════════════ */

import { initAuthListener, initAuthForms } from './auth.js';
import { loadPersistedSettings, appState } from './state.js';
import { initI18n, setLang, applyTranslations } from './i18n.js';

// ══════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════
async function bootstrap() {
  // 1. Load persisted settings (dark mode, language, etc.)
  loadPersistedSettings();
  applySettings();
  // Init i18n with saved language
  const savedLang = appState.get('settings')?.language || 'es';
  initI18n(savedLang);
  setLang(savedLang);

  // 2. Register Service Worker (PWA)
  registerSW();

  // 3. Init auth forms (login, register, forgot)
  initAuthForms();

  // 4. Start Firebase auth listener → routes to app or login
  initAuthListener();

  // 5. Settings listener for live updates
  appState.on('settings', applySettings);
}

// ── Apply Settings ────────────────────────────
function applySettings() {
  const settings = appState.get('settings');
  if (!settings) return;

  document.body.classList.toggle('dark-mode',  settings.darkMode !== false);
  document.body.classList.toggle('light-mode', settings.darkMode === false);

  // Apply language attribute
  document.documentElement.lang = settings.language || 'es';
}

// ── Service Worker Registration ───────────────
let _swReg = null;          // module-level reference for banner dismiss
let _reloadOnController = false; // only reload when WE triggered skipWaiting

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    _swReg = reg;
    console.log('[App] SW registered:', reg.scope);

    // If there is already a waiting worker on load, show banner immediately
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner();
    }

    // Listen for future updates
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

    // Reload ONLY when we explicitly triggered skipWaiting (not on normal SW activation)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloadOnController) window.location.reload();
    });

  } catch (err) {
    console.warn('[App] SW registration failed:', err);
  }
}

// ── Activate waiting SW ───────────────────────
function activateWaitingSW() {
  if (_swReg?.waiting) {
    _reloadOnController = true;
    _swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// ── Update Banner ─────────────────────────────
function showUpdateBanner() {
  const existing = document.getElementById('update-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed; bottom: calc(96px + env(safe-area-inset-bottom));
    left: 50%; transform: translateX(-50%);
    background: #1A1A1A;
    border: 0.5px solid #252525;
    padding: 12px 20px;
    border-radius: var(--r-md);
    z-index: 9000;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #F0F0F0;
    min-width: 280px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.13);
  `;

  const onUpdate = () => {
    activateWaitingSW();      // triggers controllerchange → auto reload
    banner.remove();
  };
  const onDismiss = () => {
    activateWaitingSW();      // activate silently so banner never reappears
    banner.remove();
  };

  banner.innerHTML = `
    <span>Nueva versión disponible</span>
    <button id="sw-update-btn" style="
      background: #C10801;
      border: none; color: white; padding: 6px 14px;
      border-radius: var(--r-sm); cursor: pointer; font-size: 12px; font-weight: 700;
    ">Actualizar</button>
    <button id="sw-dismiss-btn" style="
      background: none; border: none; color: #8A8A8A;
      cursor: pointer; font-size: 16px; padding: 0; line-height: 1;
    ">✕</button>
  `;

  document.body.appendChild(banner);

  banner.querySelector('#sw-update-btn').addEventListener('click', onUpdate);
  banner.querySelector('#sw-dismiss-btn').addEventListener('click', onDismiss);

  // Auto-dismiss after 30 s without activating (just hides UI, SW stays waiting)
  setTimeout(() => banner.remove(), 30000);
}

// ── Handle offline/online ─────────────────────
window.addEventListener('online', () => {
  import('./utils.js').then(({ toast }) => toast('Conexión restaurada ', 'success'));
});
window.addEventListener('offline', () => {
  import('./utils.js').then(({ toast }) => toast('Sin conexión — modo offline', 'warning', 5000));
});

// ── Prevent bounce scroll on iOS ──────────────
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('.page-container, .modal-container, .sheet-container, .h-scroll')) return;
  // Allow scroll within scrollable areas
}, { passive: true });

// ── Global error handler ──────────────────────
window.addEventListener('unhandledrejection', (e) => {
  console.error('[App] Unhandled promise rejection:', e.reason);
});

window.addEventListener('error', (e) => {
  console.error('[App] Global error:', e.message);
});

// ── Start ─────────────────────────────────────
bootstrap().catch(err => {
  console.error('[App] Bootstrap failed:', err);
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.innerHTML = `
      <div style="text-align:center;padding:40px;color:white">
        <div style="font-size:48px;margin-bottom:16px"></div>
        <h2>Error al iniciar</h2>
        <p style="color:#a7a7a7;margin:12px 0">${err.message}</p>
        <button onclick="window.location.reload()"
          style="background:#C10801;color:white;border:none;padding:12px 24px;border-radius:var(--r-md);font-size:15px;cursor:pointer;margin-top:12px">
          Reintentar
        </button>
      </div>
 `;
  }
});
