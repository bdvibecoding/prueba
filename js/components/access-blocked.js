/* ═══════════════════════════════════════════════
   TGWL — components/access-blocked.js
   Gate screen shown to clients without active access
═══════════════════════════════════════════════ */

import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { auth } from '../firebase-config.js';

export function render() {
  return `
    <div class="access-blocked-screen">
      <div class="access-blocked-card glass-card glass-card-elevated">
        <img
          src="logotipo/jus W Logo/TGWL --07.png"
          alt="TGWL"
          class="access-blocked-logo"
        >
        <div class="access-blocked-lock">🔒</div>
        <h2 class="access-blocked-title">${t('access_blocked_title')}</h2>
        <p class="access-blocked-msg">${t('access_blocked_msg')}</p>
        <button class="btn-primary btn-full access-blocked-plans-btn" id="accessBlockedPlans">
          ${t('access_view_plans')}
        </button>
        <button class="btn-secondary btn-full access-blocked-logout-btn" id="accessBlockedLogout">
          ${t('perfil_logout') || 'Cerrar sesión'}
        </button>
        <p class="access-blocked-sub">${t('access_blocked_sub')}</p>
      </div>
    </div>
  `;
}

export function init() {
  document.getElementById('accessBlockedPlans')?.addEventListener('click', () => {
    navigate('suscripcion');
  });

  document.getElementById('accessBlockedLogout')?.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error('[AccessBlocked] signOut error', e);
    }
  });
}
