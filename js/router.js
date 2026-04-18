/* ═══════════════════════════════════════════════
   TGWL — router.js
   SPA Hash Router
═══════════════════════════════════════════════ */

import { appState } from './state.js';
import { getUserProfile } from './state.js';
import { t } from './i18n.js';

// ── Route Definitions ─────────────────────────
export const ROUTES = {
  home:           { title: 'Inicio',       icon: 'home',           requireAuth: true },
  entreno:        { title: 'Entreno',      icon: 'dumbbell',       requireAuth: true },
  alimentacion:   { title: 'Nutrición',    icon: 'salad',          requireAuth: true },
  biomedidas:     { title: 'Biomedidas',   icon: 'chart',          requireAuth: true },
  salud:          { title: 'Salud',        icon: 'heart',          requireAuth: true },
  progreso:       { title: 'Progreso',     icon: 'trending-up',    requireAuth: true },
  perfil:         { title: 'Perfil',       icon: 'user',           requireAuth: true },
  suscripcion:    { title: 'Suscripción',  icon: 'star',           requireAuth: true },
  configuracion:  { title: 'Ajustes',      icon: 'settings',       requireAuth: true },
  admin:          { title: 'Admin',        icon: 'key',            requireAuth: true, adminOnly: true },
  login:          { title: 'Login',        icon: '',               requireAuth: false },
};

// ── Routes allowed for 'basico' role ─────────
const BASICO_ALLOWED_ROUTES = new Set(['home', 'entreno', 'perfil', 'configuracion', 'suscripcion', 'login']);

// ── Upgrade modal for 'basico' users ─────────
export function showUpgradeModal(feature = '') {
  const labels = {
    alimentacion:  'Accede a tu plan nutricional personalizado',
    biomedidas:    'Consulta tus biomedidas y composición corporal',
    salud:         'Monitoriza tu salud con tu médico o fisio',
    progreso:      'Visualiza tu evolución y estadísticas avanzadas',
  };
  const desc = labels[feature] || 'Accede a funciones avanzadas con un plan Premium';

  const existing = document.getElementById('upgrade-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'upgrade-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);padding:20px';
  overlay.innerHTML = `
    <div style="background:#1A1A1A;border:0.5px solid #252525;border-radius:var(--r-lg);padding:32px 24px;max-width:340px;width:100%;text-align:center">
      <div style="display:flex;justify-content:center;margin-bottom:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:44px;height:44px;color:#8A8A8A"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </div>
      <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px;color:#F0F0F0">Función Premium</h2>
      <p style="color:#8A8A8A;font-size:14px;margin-bottom:24px;line-height:1.5">${desc}</p>
      <button id="upgrade-btn-more" style="width:100%;padding:14px;background:#C10801;color:#fff;border:none;border-radius:var(--r-md);font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px">Saber más</button>
      <button id="upgrade-btn-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);color:#8A8A8A;border:0.5px solid #252525;border-radius:var(--r-md);font-size:14px;cursor:pointer">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#upgrade-btn-more').addEventListener('click', () => {
    overlay.remove();
    navigate('suscripcion');
  });
  overlay.querySelector('#upgrade-btn-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ── Navigation history stack ──────────────────
const history = [];

// ── Client Access Gate ────────────────────────
function checkClientAccess(profile) {
  if (!profile) return false;
  // Only applies to cliente/atleta roles
  if (!['cliente', 'atleta'].includes(profile.role)) return true;
  // Active subscription
  if (profile.subscriptionStatus && profile.subscriptionStatus !== 'free') return true;
  // Manual admin override
  if (profile.accessGranted === true) return true;
  return false;
}

// ── Navigate to a route ───────────────────────
export function navigate(route, params = {}) {
  const routeDef = ROUTES[route];
  if (!routeDef) {
    console.warn(`[Router] Unknown route: ${route}`);
    return;
  }

  // Auth guard
  if (routeDef.requireAuth && !appState.get('user')) {
    appState.set('currentRoute', 'login');
    renderRoute('login', {});
    return;
  }

  // Admin/staff guard
  if (routeDef.adminOnly) {
    const profile = getUserProfile();
    const role = profile?.role;
    const allowed = ['admin','coach','medico','fisio','psicologo','nutricionista'];
    if (!allowed.includes(role)) {
      import('./utils.js').then(({ toast }) => toast('Acceso no autorizado', 'error'));
      return;
    }
  }

  // Basico role guard — block premium routes
  if (route !== 'login') {
    const profile = getUserProfile();
    if (profile?.role === 'basico' && !BASICO_ALLOWED_ROUTES.has(route)) {
      showUpgradeModal(route);
      return;
    }
  }

  // Client access gate — block free clients from all non-exempt routes
  const FREE_ROUTES = ['login', 'suscripcion'];
  if (!FREE_ROUTES.includes(route)) {
    const profile = getUserProfile();
    if (!checkClientAccess(profile)) {
      const container = document.getElementById('page-container');
      if (container) {
        import('./components/access-blocked.js').then(({ render, init }) => {
          container.innerHTML = render();
          if (init) init();
        });
      }
      return;
    }
  }

  const prev = appState.get('currentRoute');
  if (prev !== route) {
    history.push(prev);
    if (history.length > 30) history.shift();
  }
  appState.update({ prevRoute: prev, currentRoute: route });
  renderRoute(route, params);
  updateBottomNav(route);
}

export function goBack() {
  if (history.length > 0) {
    const prev = history.pop();
    if (prev) {
      appState.update({ currentRoute: prev });
      renderRoute(prev, {});
      updateBottomNav(prev);
    }
  }
}

// ── Render route ──────────────────────────────
async function renderRoute(route, params) {
  const container = document.getElementById('page-container');
  if (!container) return;

  // Clean up previous route if it exposes a destroy() (e.g. specialist-hub)
  if (window.__activeModule?.destroy) {
    try { window.__activeModule.destroy(); } catch {}
    window.__activeModule = null;
  }

  // Clear previous
  container.innerHTML = `
    <div class="overlay-spinner">
      <div class="spinner-sm"></div>
    </div>
  `;

  try {
    let module;
    switch (route) {
      case 'home':          module = await import('./modules/home.js'); break;
      case 'entreno':       module = await import('./modules/entreno.js'); break;
      case 'alimentacion':  module = await import('./modules/alimentacion.js'); break;
      case 'biomedidas':    module = await import('./modules/biomedidas.js'); break;
      case 'salud':         module = await import('./modules/salud.js'); break;
      case 'progreso':      module = await import('./modules/progreso.js'); break;
      case 'perfil':        module = await import('./modules/perfil.js'); break;
      case 'suscripcion':   module = await import('./modules/suscripcion.js'); break;
      case 'configuracion': module = await import('./modules/configuracion.js'); break;
      case 'admin': {
        const profile = getUserProfile();
        if (profile?.role === 'admin') {
          module = await import('./admin/admin-panel.js?v=124');
        } else if (['coach','medico','fisio','psicologo','nutricionista'].includes(profile?.role)) {
          module = await import('./admin/specialist-hub.js');
        }
        break;
      }
      default:
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px;opacity:.4"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div><div class="empty-title">Página no encontrada</div></div>`;
        return;
    }

    if (module?.render) {
      container.innerHTML = '';
      await module.render(container, params);
      if (module?.init) await module.init(container, params);
      window.__activeModule = module;
    }

  } catch (err) {
    console.error('[Router] Error rendering route:', route, err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px;opacity:.4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="empty-title">Error al cargar</div>
        <div class="empty-subtitle">${err.message}</div>
      </div>
    `;
  }
}

// ── Bottom Nav Sync ───────────────────────────
export function updateBottomNav(route) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });
}

// ── Init Router ───────────────────────────────
export function initRouter() {
  // Wire bottom nav buttons
  document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  // Re-render current page when language changes
  window.addEventListener('langchange', () => {
    const currentRoute = appState.get('currentRoute');
    if (currentRoute && currentRoute !== 'login') navigate(currentRoute);
  });
}
