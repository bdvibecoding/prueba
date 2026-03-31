/* ═══════════════════════════════════════════════
   TGWL — auth.js
   Firebase Authentication & Session Management
═══════════════════════════════════════════════ */

import { auth, db, collections, timestamp } from './firebase-config.js';
import { appState, setUser, clearUser } from './state.js';
import { toast, validateEmail, getInitials, getGreeting } from './utils.js';
import { navigate } from './router.js';

// ── Read invite token from URL hash ──────────
function getInviteToken() {
  // URL format: #register?invite=TOKEN  or  #register?invite=TOKEN&...
  const hash = window.location.hash || '';
  const match = hash.match(/[?&]invite=([^&]+)/);
  return match ? match[1] : null;
}

// ── Process invitation token after registration ─
async function processInvitation(token, uid, email) {
  if (!token) return {};
  try {
    const snap = await db.collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return {};
    const invDoc = snap.docs[0];
    const inv = invDoc.data();
    // Only process pending or approved invitations
    if (!['pending', 'approved'].includes(inv.status)) return {};
    // Mark invitation as accepted
    await invDoc.ref.update({
      status:     'accepted',
      acceptedBy: uid,
      acceptedAt: timestamp(),
    });
    // Return profile overrides from invitation
    return {
      role:          inv.role || 'cliente',
      accessGranted: inv.status === 'approved',
    };
  } catch (e) {
    console.warn('[Auth] Could not process invitation:', e.message);
    return {};
  }
}

// ── Show/Hide Auth Views ──────────────────────
function showAuthView(viewId) {
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

// ── Load user profile from Firestore ─────────
export async function loadUserProfile(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
    return null;
  } catch (e) {
    console.error('[Auth] Failed to load profile', e);
    return null;
  }
}

// ── Create user profile on first register ─────
async function createUserProfile(user, extra = {}) {
  const profile = {
    uid:           user.uid,
    email:         user.email,
    name:          extra.name || user.displayName || '',
    role:          extra.role || 'cliente',
    gender:        '',
    birthDate:     '',
    height:        '',
    weight:        '',
    goals:         '',
    experience:    'principiante',
    createdAt:     timestamp(),
    updatedAt:     timestamp(),
    assignedCoach: null,
    subscriptionStatus: 'free',
    accessGranted:   extra.accessGranted || false,
    accessGrantedBy: extra.accessGranted ? 'invitation' : null,
    accessGrantedAt: extra.accessGranted ? timestamp() : null,
    photoURL:      user.photoURL || '',
  };
  await db.collection('users').doc(user.uid).set(profile);
  return profile;
}

// ── Update top bar after login ────────────────
function updateTopBar(profile) {
  const greeting   = document.getElementById('top-bar-greeting');
  const initials   = document.getElementById('avatar-initials');
  const avatarBtn  = document.getElementById('top-bar-avatar');

  if (greeting && profile?.name) {
    greeting.textContent = `${getGreeting()}, ${profile.name.split(' ')[0]}`;
  }

  // Use Google photo if available, otherwise show initials
  if (avatarBtn && profile?.photoURL) {
    avatarBtn.style.backgroundImage    = `url(${profile.photoURL})`;
    avatarBtn.style.backgroundSize     = 'cover';
    avatarBtn.style.backgroundPosition = 'center';
    if (initials) initials.style.display = 'none';
  } else {
    if (avatarBtn) avatarBtn.style.backgroundImage = '';
    if (initials) {
      initials.style.display = '';
      if (profile?.name) initials.textContent = getInitials(profile.name);
    }
  }
}

// Re-update greeting when language changes
window.addEventListener('langchange', () => {
  const profile = appState.get('userProfile');
  if (profile) updateTopBar(profile);
});

// All staff roles (not counting admin separately)
export const STAFF_ROLES   = ['coach','medico','fisio','psicologo','nutricionista'];
export const ALL_ROLES     = ['cliente','atleta','coach','medico','fisio','psicologo','nutricionista','admin'];
export const ADMIN_ROLES   = ['admin'];

// ── Show / Hide sections ──────────────────────
function showApp(profile) {
  document.getElementById('loading-screen')?.classList.remove('active');
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('app-section')?.classList.remove('hidden');
  updateTopBar(profile);

  const role = profile?.role;
  const bottomNav = document.getElementById('bottom-nav');

  // Staff & Admin: add panel nav button
  if ([...STAFF_ROLES, ...ADMIN_ROLES].includes(role)) {
    if (bottomNav && !bottomNav.querySelector('[data-route="admin"]')) {
      const panelBtn = document.createElement('button');
      panelBtn.className = 'nav-item nav-item-staff';
      panelBtn.dataset.route = 'admin';
      const label = role === 'admin' ? 'Admin' : 'Panel';
      panelBtn.innerHTML = `
        <span class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/>
          </svg>
        </span>
        <span class="nav-label">${label}</span>`;
      bottomNav.appendChild(panelBtn);
      panelBtn.addEventListener('click', () => {
        import('./router.js').then(({ navigate }) => navigate('admin'));
      });
    }

    // If staff/admin is also a client, show client nav items too
    if (profile?.isClient && bottomNav && !bottomNav.querySelector('[data-client-nav]')) {
      const homeBtn = document.createElement('button');
      homeBtn.className = 'nav-item';
      homeBtn.dataset.route = 'home';
      homeBtn.dataset.clientNav = '1';
      homeBtn.innerHTML = `<span class="nav-icon">🏠</span><span class="nav-label">Inicio</span>`;
      homeBtn.addEventListener('click', () => {
        import('./router.js').then(({ navigate }) => navigate('home'));
      });
      bottomNav.insertBefore(homeBtn, bottomNav.firstChild);
    }
  }
}

function showAuth() {
  document.getElementById('loading-screen')?.classList.remove('active');
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('app-section')?.classList.add('hidden');
  showAuthView('view-login');
}

// ── Auth State Observer ───────────────────────
export function initAuthListener() {
  auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      let profile = await loadUserProfile(firebaseUser.uid);
      if (!profile) profile = await createUserProfile(firebaseUser);
      setUser(firebaseUser, profile);

      // Apply theme preference
      const settings = appState.get('settings');
      document.body.classList.toggle('dark-mode',  settings.darkMode !== false);
      document.body.classList.toggle('light-mode', settings.darkMode === false);

      showApp(profile);
      const { navigate, initRouter } = await import('./router.js');
      initRouter();
      // Staff goes to their panel; clients go home
      const role = profile?.role;
      if ([...STAFF_ROLES, ...ADMIN_ROLES].includes(role)) {
        navigate('admin');
      } else {
        navigate('home');
      }
    } else {
      clearUser();
      showAuth();
    }
  });
}

// ── Login ─────────────────────────────────────
export async function login(email, password) {
  if (!validateEmail(email)) throw new Error('Correo electrónico no válido');
  if (!password) throw new Error('Introduce tu contraseña');
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

// ── Login / Register con Google ───────────────
export async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  // signInWithPopup gestiona tanto login como registro automáticamente
  const result = await auth.signInWithPopup(provider);
  const user   = result.user;
  // Si es la primera vez (usuario nuevo), crear perfil en Firestore
  const profile = await loadUserProfile(user.uid);
  if (!profile) {
    // New user via Google — check for invite token
    const token = getInviteToken();
    const inviteData = await processInvitation(token, user.uid, user.email);
    await createUserProfile(user, { name: user.displayName || '', ...inviteData });
  }
  return user;
}

// ── Register ──────────────────────────────────
export async function register(name, email, password) {
  if (!name?.trim()) throw new Error('Introduce tu nombre completo');
  if (!validateEmail(email)) throw new Error('Correo electrónico no válido');
  if (password?.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: name });
  // Process invite token if present
  const token = getInviteToken();
  const inviteData = await processInvitation(token, cred.user.uid, email);
  await createUserProfile(cred.user, { name, ...inviteData });
  return cred.user;
}

// ── Forgot Password ───────────────────────────
export async function forgotPassword(email) {
  if (!validateEmail(email)) throw new Error('Correo electrónico no válido');
  await auth.sendPasswordResetEmail(email);
}

// ── Logout ────────────────────────────────────
export async function logout() {
  await auth.signOut();
  clearUser();
}

// ── Init Auth Forms ───────────────────────────
export function initAuthForms() {
  // ── Login Form
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('btn-login');
    const errEl    = document.getElementById('auth-error');

    errEl.classList.add('hidden');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    try {
      await login(email, password);
    } catch (err) {
      errEl.textContent = translateFirebaseError(err.code) || err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
    }
  });

  // ── Register Form
  const regForm = document.getElementById('register-form');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name   = document.getElementById('reg-name').value.trim();
    const email  = document.getElementById('reg-email').value.trim();
    const pass   = document.getElementById('reg-password').value;
    const pass2  = document.getElementById('reg-password2').value;
    const btn    = document.getElementById('btn-register');
    const errEl  = document.getElementById('register-error');

    errEl.classList.add('hidden');
    if (pass !== pass2) {
      errEl.textContent = 'Las contraseñas no coinciden';
      errEl.classList.remove('hidden');
      return;
    }
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    try {
      await register(name, email, pass);
      toast('¡Cuenta creada con éxito!', 'success');
    } catch (err) {
      errEl.textContent = translateFirebaseError(err.code) || err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
    }
  });

  // ── Forgot Form
  const forgotForm = document.getElementById('forgot-form');
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email  = document.getElementById('forgot-email').value.trim();
    const btn    = document.getElementById('btn-forgot-submit');
    const errEl  = document.getElementById('forgot-error');
    const msgEl  = document.getElementById('forgot-msg');

    errEl.classList.add('hidden');
    msgEl.classList.add('hidden');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    try {
      await forgotPassword(email);
      msgEl.textContent = 'Te hemos enviado un correo de recuperación. Revisa tu bandeja de entrada.';
      msgEl.classList.remove('hidden');
    } catch (err) {
      errEl.textContent = translateFirebaseError(err.code) || err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
    }
  });

  // ── Navigation buttons
  document.getElementById('btn-goto-register')?.addEventListener('click', () => showAuthView('view-register'));
  document.getElementById('btn-forgot-password')?.addEventListener('click', () => showAuthView('view-forgot'));
  document.getElementById('btn-back-login')?.addEventListener('click', () => showAuthView('view-login'));
  document.getElementById('btn-back-login-2')?.addEventListener('click', () => showAuthView('view-login'));

  // ── Google Sign-In (login y registro usan la misma función)
  async function handleGoogleAuth(btn, errElId) {
    const errEl = document.getElementById(errElId);
    if (errEl) errEl.classList.add('hidden');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style="animation:spin 0.6s linear infinite">
        <circle cx="9" cy="9" r="7" fill="none" stroke="#ccc" stroke-width="2"/>
        <path d="M9 2 A7 7 0 0 1 16 9" fill="none" stroke="#3c4043" stroke-width="2"/>
      </svg>
      Conectando...`;
    try {
      await loginWithGoogle();
      // onAuthStateChanged se encarga del resto (showApp, navigate)
    } catch (err) {
      if (errEl) {
        errEl.textContent = translateFirebaseError(err.code) || err.message;
        errEl.classList.remove('hidden');
      } else {
        toast(translateFirebaseError(err.code) || err.message, 'error');
      }
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }

  const btnGoogleLogin    = document.getElementById('btn-google-login');
  const btnGoogleRegister = document.getElementById('btn-google-register');
  btnGoogleLogin?.addEventListener('click',    () => handleGoogleAuth(btnGoogleLogin,    'auth-error'));
  btnGoogleRegister?.addEventListener('click', () => handleGoogleAuth(btnGoogleRegister, 'register-error'));

  // ── Password visibility toggles
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });
}

// ── Firebase Error Translation ────────────────
function translateFirebaseError(code) {
  const map = {
    'auth/user-not-found':       'No existe ninguna cuenta con ese correo.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/weak-password':        'La contraseña es demasiado débil.',
    'auth/invalid-email':        'Formato de correo no válido.',
    'auth/too-many-requests':    'Demasiados intentos. Espera un momento.',
    'auth/network-request-failed': 'Error de red. Revisa tu conexión.',
    'auth/invalid-credential':   'Credenciales no válidas. Verifica tu correo y contraseña.',
  };
  return map[code] || null;
}
