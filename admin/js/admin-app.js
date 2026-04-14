import { auth, db } from '../../js/firebase-config.js';
import { clearUser, setUser } from '../../js/state.js';

// Elements
const dashNav = document.getElementById('dash-nav');
const dashTitle = document.getElementById('dash-title');
const userNameEl = document.getElementById('dash-user-name');
const userRoleEl = document.getElementById('dash-user-role');
const btnLogout = document.getElementById('btn-admin-logout');
const dashContent = document.getElementById('dash-content');

// Define available panels
const PANELS = {
  users:    { id: 'users',    icon: '👥', title: 'Usuarios' },
  routines: { id: 'routines', icon: '💪', title: 'Rutinas' },
  diet:     { id: 'diet',     icon: '🥗', title: 'Plan Nutricional' },
  health:   { id: 'health',   icon: '🩺', title: 'Historial Médico' },
  fisio:    { id: 'fisio',    icon: '🦴', title: 'Fisioterapia' },
  psych:    { id: 'psych',    icon: '🧠', title: 'Psicología' },
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
        ${p.title}
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
        <div style="font-size:32px;margin-bottom:16px;">🚧</div>
        <div style="font-size:16px;font-weight:600;color:var(--white);margin-bottom:8px">Panel en construcción</div>
        <div style="font-size:13px">${err.message}</div>
      </div>
    `;
  }
}

function showAccessDenied(detail = '') {
  document.querySelector('.dash-layout').innerHTML = `
    <div class="admin-access-denied">
      <div style="font-size:48px;margin-bottom:16px;">🔒</div>
      <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#ef4444;">Acceso Denegado</h2>
      <p style="font-size:14px;color:var(--color-text-muted);max-width:400px;line-height:1.5;">
        Tu cuenta no tiene permisos suficientes para este Panel de Control.
      </p>
      ${detail ? `<p style="font-size:12px;color:#888;margin-top:16px">${detail}</p>` : ''}
      <button class="btn-primary" style="margin-top:24px;padding:10px 24px;" onclick="window.location.href='../'">
        Volver a la App Principal
      </button>
    </div>
  `;
}
