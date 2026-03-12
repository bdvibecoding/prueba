/* ═══════════════════════════════════════════════
   TGWL — router.js
   SPA Hash Router
═══════════════════════════════════════════════ */

import { appState } from './state.js';
import { getUserProfile } from './state.js';

// ── Route Definitions ─────────────────────────
export const ROUTES = {
  home:           { title: 'Inicio',       icon: '🏠', requireAuth: true },
  entreno:        { title: 'Entreno',      icon: '💪', requireAuth: true },
  alimentacion:   { title: 'Nutrición',    icon: '🥗', requireAuth: true },
  biomedidas:     { title: 'Biomedidas',   icon: '📊', requireAuth: true },
  salud:          { title: 'Salud',        icon: '❤️', requireAuth: true },
  progreso:       { title: 'Progreso',     icon: '📈', requireAuth: true },
  perfil:         { title: 'Perfil',       icon: '👤', requireAuth: true },
  suscripcion:    { title: 'Suscripción',  icon: '⭐', requireAuth: true },
  configuracion:  { title: 'Ajustes',      icon: '⚙️', requireAuth: true },
  admin:          { title: 'Admin',        icon: '🔑', requireAuth: true, adminOnly: true },
  login:          { title: 'Login',        icon: '',   requireAuth: false },
};

// ── Navigation history stack ──────────────────
const history = [];

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
          module = await import('./admin/admin-panel.js');
        } else if (['coach','medico','fisio','psicologo','nutricionista'].includes(profile?.role)) {
          // Try staff-panel first, fall back to coach-panel
          try { module = await import('./admin/staff-panel.js'); }
          catch { module = await import('./admin/coach-panel.js'); }
        }
        break;
      }
      default:
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Página no encontrada</div></div>`;
        return;
    }

    if (module?.render) {
      container.innerHTML = '';
      await module.render(container, params);
      if (module?.init) await module.init(container, params);
    }

    // Update top-bar title
    const topTitle = document.getElementById('top-bar-title');
    if (topTitle && ROUTES[route]) topTitle.textContent = ROUTES[route].title;

  } catch (err) {
    console.error('[Router] Error rendering route:', route, err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
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

  // Top-bar avatar click → profile
  const avatar = document.getElementById('top-bar-avatar');
  if (avatar) avatar.addEventListener('click', () => navigate('perfil'));
}
