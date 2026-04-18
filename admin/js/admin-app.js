import { auth, db } from '../../js/firebase-config.js';
import { clearUser, setUser } from '../../js/state.js';

// Elements
const dashNav = document.getElementById('dash-nav');
const dashTitle = document.getElementById('dash-title');
const userNameEl = document.getElementById('dash-user-name');
const userRoleEl = document.getElementById('dash-user-role');
const btnLogout = document.getElementById('btn-admin-logout');
const dashContent = document.getElementById('dash-content');

// SVG icons for nav panels
const SVG = {
  users:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  routines: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5"/><rect x="6.5" y="4" width="3" height="16" rx="1.5"/><rect x="14.5" y="4" width="3" height="16" rx="1.5"/><line x1="9.5" y1="12" x2="14.5" y2="12" stroke-linecap="round"/></svg>`,
  diet:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 3C9.5 3 6 5 6 9c0 3.5 2 5.5 2 7v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-4c0-1.5 2-3.5 2-7 0-4-3.5-6-6-6z"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
  health:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  fisio:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="5" r="3"/><path d="M6.5 8a5.5 5.5 0 0 0 0 11h11a5.5 5.5 0 0 0 0-11"/><path d="M12 8v11M8 13h8"/></svg>`,
  psych:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M9.5 2A6.5 6.5 0 0 1 16 8.5c0 2.5-1.3 4.7-3.3 6l-.7 4.5H9l-.7-4.5A6.5 6.5 0 0 1 9.5 2z"/><path d="M9 15.5h3"/></svg>`,
};

// Define available panels
const PANELS = {
  users:    { id: 'users',    icon: SVG.users,    title: 'Usuarios' },
  routines: { id: 'routines', icon: SVG.routines, title: 'Rutinas' },
  diet:     { id: 'diet',     icon: SVG.diet,     title: 'Plan Nutricional' },
  health:   { id: 'health',   icon: SVG.health,   title: 'Historial Médico' },
  fisio:    { id: 'fisio',    icon: SVG.fisio,    title: 'Fisioterapia' },
  psych:    { id: 'psych',    icon: SVG.psych,    title: 'Psicología' },
};

// Map roles to panels
const ROLE_PANELS = {
  admin:         ['users', 'routines', 'diet', 'health', 'fisio', 'psych'],
  coach:         ['users', 'routines'],
  nutricionista: ['users', 'diet'],
  medico:        ['users', 'health'],
  fisio:         ['users', 'fisio'],
  psicologo:     ['users', 'psych'],
};

let currentProfile = null;
let currentPanelId = null;
let panelModules = {}; // cache

// Setup auth listener
auth.onAuthStateChanged(async (firebaseUser) => {
  if (!firebaseUser) {
    window.location.href = '../#login';
    return;
  }

  try {
    const snap = await db.collection('users').doc(firebaseUser.uid).get();
    if (!snap.exists) {
      showAccessDenied();
      return;
    }
    
    currentProfile = { id: snap.id, uid: snap.id, ...snap.data() };
    setUser(firebaseUser, currentProfile);
    
    // Update top bar
    userNameEl.textContent = currentProfile.name || currentProfile.email;
    userRoleEl.textContent = currentProfile.role || 'cliente';

    // Verify Access
    const role = currentProfile.role;
    const allowedPanels = ROLE_PANELS[role];
    
    if (!allowedPanels) {
      showAccessDenied();
      return;
    }

    // Build Navigation
    buildSidebar(allowedPanels);
    
    // Load first panel by default
    if (allowedPanels.length > 0) {
      loadPanel(allowedPanels[0]);
    }
    
  } catch (err) {
    console.error('[AdminApp] Error:', err);
    showAccessDenied(`Error al cargar: ${err.message}`);
  }
});

btnLogout.addEventListener('click', async () => {
  await auth.signOut();
  clearUser();
  window.location.href = '../#login';
});

function buildSidebar(allowedPanels) {
  let html = `<div class="dash-nav-group">GENERAL</div>`;
  
  allowedPanels.forEach(pId => {
    const p = PANELS[pId];
    html += `
      <button class="dash-nav-btn" data-panel="${pId}">
        <span class="dash-nav-icon">${p.icon}</span>
        <span class="dash-nav-label">${p.title}</span>
      </button>
    `;
  });
  
  dashNav.innerHTML = html;
  
  // Wire clicks
  dashNav.querySelectorAll('.dash-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPanel(btn.dataset.panel));
  });
}

async function loadPanel(panelId) {
  if (currentPanelId === panelId) return;
  currentPanelId = panelId;
  const pDef = PANELS[panelId];
  
  // Update UI state
  dashTitle.textContent = pDef.title;
  dashNav.querySelectorAll('.dash-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === panelId);
  });
  
  // Show spinner
  dashContent.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%"><div class="spinner-sm"></div></div>`;
  
  try {
    // Dynamically import panel module if not cached
    if (!panelModules[panelId]) {
      const v = Date.now();
      panelModules[panelId] = await import(`./panels/${panelId}.js?v=${v}`);
    }
    const module = panelModules[panelId];
    
    // Clean and render
    dashContent.innerHTML = '';
    if (module.render) await module.render(dashContent, currentProfile);
    if (module.init)   await module.init(dashContent, currentProfile);
    
  } catch (err) {
    console.error(`[AdminApp] Error loading panel ${panelId}:`, err);
    dashContent.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--color-text-muted)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px;opacity:0.4;margin:0 auto 16px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style="font-size:16px;font-weight:600;color:var(--color-text);margin-bottom:8px">Panel en construcción</div>
        <div style="font-size:13px">${err.message}</div>
      </div>
    `;
  }
}

function showAccessDenied(detail = '') {
  document.querySelector('.dash-layout').innerHTML = `
    <div class="admin-access-denied">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;color:#8A8A8A;margin:0 auto 16px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--color-danger)">Acceso Denegado</h2>
      <p style="font-size:14px;color:var(--color-text-muted);max-width:400px;line-height:1.5;">
        Tu cuenta no tiene permisos suficientes para este Panel de Control.
      </p>
      ${detail ? `<p style="font-size:12px;color:var(--color-text-muted);margin-top:16px">${detail}</p>` : ''}
      <button class="btn-primary" style="margin-top:24px;padding:10px 24px;" onclick="window.location.href='../'">
        Volver a la App Principal
      </button>
    </div>
  `;
}
