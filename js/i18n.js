/* ═══════════════════════════════════════════════
   TGWL — i18n.js
   Internationalization (ES / EN)
═══════════════════════════════════════════════ */

const translations = {
  es: {
    // Nav
    nav_home:      'Inicio',
    nav_entreno:   'Entreno',
    nav_nutricion: 'Nutrición',
    nav_progreso:  'Progreso',
    nav_perfil:    'Perfil',
    nav_admin:     'Admin',

    // Auth
    welcome_back:    'Bienvenido de vuelta',
    sign_in_to_continue: 'Inicia sesión para continuar',
    continue_google: 'Continuar con Google',
    or_with_email:   'o con correo',
    email:           'Correo electrónico',
    password:        'Contraseña',
    forgot_password: '¿Olvidaste tu contraseña?',
    sign_in:         'Iniciar Sesión',
    new_here:        '¿nuevo aquí?',
    get_started:     '🚀 Empieza con nosotros',
    create_account:  'Crear cuenta',
    join_community:  'Únete a nuestra comunidad',
    back:            '← Volver',
    full_name:       'Nombre completo',
    confirm_password: 'Confirmar contraseña',
    register:        'Crear Cuenta',
    recover_password: 'Recuperar contraseña',
    send_recovery:   'Te enviaremos un enlace de recuperación',
    send_link:       'Enviar enlace',

    // Home
    greeting_morning:  'Buenos días',
    greeting_afternoon: 'Buenas tardes',
    greeting_evening:  'Buenas noches',
    modules:           'Módulos',
    recent_activity:   'Actividad reciente',
    workouts:          'Entrenos',
    streak:            'Racha',
    this_week:         'Esta semana',
    no_workouts:       'Sin entrenos aún',
    start_first:       '¡Comienza tu primera sesión en Entreno!',
    active_session:    'Entreno en curso',
    continue:          'Continuar →',
    specialists:       'Mis especialistas',
    chat_placeholder:  'Escribe un mensaje...',
    send:              'Enviar',

    // Check-in
    checkin_title:     '¿Cómo estás hoy?',
    checkin_mood:      '¿Cómo te sientes?',
    checkin_sleep:     '¿Cómo dormiste?',
    checkin_hours:     'Horas de sueño',
    checkin_notes:     '¿Algo fuera de lo normal?',
    checkin_pain:      '¿Te duele algo hoy?',
    checkin_pain_where: '¿Dónde?',
    checkin_submit:    'Registrar y continuar',
    checkin_skip:      'Omitir por hoy',

    // Subscription
    sub_title:     'Suscripción',
    sub_subtitle:  'Elige tu plan de entrenamiento',
    sub_active:    'Plan activo',
    sub_free_trial: '14 días de prueba gratuita',
    sub_select:    'Seleccionar',
    sub_current:   '✅ Plan actual',
    sub_request:   'Solicitar información',
    sub_session:   'Sesión Individual',

    // Settings
    settings_title:     'Ajustes',
    settings_subtitle:  'Personaliza tu experiencia',
    appearance:         'Apariencia',
    dark_mode:          'Modo oscuro',
    muscle_map:         'Mapa muscular',
    language:           'Idioma',
    notifications:      'Notificaciones',
    push_notif:         'Notificaciones push',
    screen:             'Pantalla',
    keep_awake:         'Mantener pantalla activa',
    app:                'Aplicación',
    install:            'Instalar en dispositivo',
    clear_cache:        'Limpiar caché',
    about:              'Sobre la app',
    version:            'Versión',
    privacy:            'Política de privacidad',
    terms:              'Términos de uso',

    // Admin
    admin_title:    'Panel Admin',
    admin_subtitle: 'Gestión de usuarios y permisos',
    invite:         '+ Invitar',
    search_users:   'Buscar por nombre o email...',
    all:            'Todos',
    users:          'Usuarios',
    coaches:        'Coaches',
    clients:        'Clientes',
    save:           'Guardar',
    cancel:         'Cancelar',
    confirm:        'Confirmar',

    // Roles
    role_cliente:       'Cliente',
    role_atleta:        'Atleta',
    role_coach:         'Coach',
    role_medico:        'Médico',
    role_fisio:         'Fisioterapeuta',
    role_psicologo:     'Psicólogo',
    role_nutricionista: 'Nutricionista',
    role_admin:         'Administrador',

    // General
    loading:  'Cargando...',
    error:    'Error',
    success:  '¡Éxito!',
    warning:  'Atención',
    yes:      'Sí',
    no:       'No',
    close:    'Cerrar',
    delete:   'Eliminar',
    edit:     'Editar',
    view:     'Ver',
    assign:   'Asignar',
    copy:     'Copiar',
    copied:   '¡Copiado!',
    share:    'Compartir',

    route_home:          'Inicio',
    route_entreno:       'Entreno',
    route_alimentacion:  'Nutrición',
    route_biomedidas:    'Biomedidas',
    route_salud:         'Salud',
    route_progreso:      'Progreso',
    route_perfil:        'Perfil',
    route_suscripcion:   'Suscripción',
    route_configuracion: 'Ajustes',
    route_admin:         'Admin',

    icon_entreno:       'Entreno',
    icon_alimentacion:  'Nutrición',
    icon_biomedidas:    'Biomedidas',
    icon_salud:         'Salud',
    icon_progreso:      'Progreso',
    icon_perfil:        'Perfil',
    icon_suscripcion:   'Premium',
    icon_configuracion: 'Ajustes',
    icon_admin:         'Panel',
  },

  en: {
    // Nav
    nav_home:      'Home',
    nav_entreno:   'Training',
    nav_nutricion: 'Nutrition',
    nav_progreso:  'Progress',
    nav_perfil:    'Profile',
    nav_admin:     'Admin',

    // Auth
    welcome_back:    'Welcome back',
    sign_in_to_continue: 'Sign in to continue',
    continue_google: 'Continue with Google',
    or_with_email:   'or with email',
    email:           'Email address',
    password:        'Password',
    forgot_password: 'Forgot your password?',
    sign_in:         'Sign In',
    new_here:        'new here?',
    get_started:     '🚀 Get started',
    create_account:  'Create account',
    join_community:  'Join our community',
    back:            '← Back',
    full_name:       'Full name',
    confirm_password: 'Confirm password',
    register:        'Create Account',
    recover_password: 'Recover password',
    send_recovery:   'We will send you a recovery link',
    send_link:       'Send link',

    // Home
    greeting_morning:  'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening:  'Good evening',
    modules:           'Modules',
    recent_activity:   'Recent activity',
    workouts:          'Workouts',
    streak:            'Streak',
    this_week:         'This week',
    no_workouts:       'No workouts yet',
    start_first:       'Start your first session in Training!',
    active_session:    'Session in progress',
    continue:          'Continue →',
    specialists:       'My specialists',
    chat_placeholder:  'Type a message...',
    send:              'Send',

    // Check-in
    checkin_title:     'How are you today?',
    checkin_mood:      'How are you feeling?',
    checkin_sleep:     'How did you sleep?',
    checkin_hours:     'Hours of sleep',
    checkin_notes:     'Anything unusual to report?',
    checkin_pain:      'Are you in pain today?',
    checkin_pain_where: 'Where?',
    checkin_submit:    'Save & continue',
    checkin_skip:      'Skip for today',

    // Subscription
    sub_title:     'Subscription',
    sub_subtitle:  'Choose your training plan',
    sub_active:    'Active plan',
    sub_free_trial: '14-day free trial',
    sub_select:    'Select',
    sub_current:   '✅ Current plan',
    sub_request:   'Request info',
    sub_session:   'Individual Session',

    // Settings
    settings_title:     'Settings',
    settings_subtitle:  'Customize your experience',
    appearance:         'Appearance',
    dark_mode:          'Dark mode',
    muscle_map:         'Muscle map',
    language:           'Language',
    notifications:      'Notifications',
    push_notif:         'Push notifications',
    screen:             'Screen',
    keep_awake:         'Keep screen awake',
    app:                'App',
    install:            'Install on device',
    clear_cache:        'Clear cache',
    about:              'About',
    version:            'Version',
    privacy:            'Privacy policy',
    terms:              'Terms of use',

    // Admin
    admin_title:    'Admin Panel',
    admin_subtitle: 'User & permission management',
    invite:         '+ Invite',
    search_users:   'Search by name or email...',
    all:            'All',
    users:          'Users',
    coaches:        'Coaches',
    clients:        'Clients',
    save:           'Save',
    cancel:         'Cancel',
    confirm:        'Confirm',

    // Roles
    role_cliente:       'Client',
    role_atleta:        'Athlete',
    role_coach:         'Coach',
    role_medico:        'Doctor',
    role_fisio:         'Physiotherapist',
    role_psicologo:     'Psychologist',
    role_nutricionista: 'Nutritionist',
    role_admin:         'Administrator',

    // General
    loading:  'Loading...',
    error:    'Error',
    success:  'Success!',
    warning:  'Warning',
    yes:      'Yes',
    no:       'No',
    close:    'Close',
    delete:   'Delete',
    edit:     'Edit',
    view:     'View',
    assign:   'Assign',
    copy:     'Copy',
    copied:   'Copied!',
    share:    'Share',

    route_home:          'Home',
    route_entreno:       'Training',
    route_alimentacion:  'Nutrition',
    route_biomedidas:    'Biometrics',
    route_salud:         'Health',
    route_progreso:      'Progress',
    route_perfil:        'Profile',
    route_suscripcion:   'Subscription',
    route_configuracion: 'Settings',
    route_admin:         'Admin',

    icon_entreno:       'Training',
    icon_alimentacion:  'Nutrition',
    icon_biomedidas:    'Biometrics',
    icon_salud:         'Health',
    icon_progreso:      'Progress',
    icon_perfil:        'Profile',
    icon_suscripcion:   'Premium',
    icon_configuracion: 'Settings',
    icon_admin:         'Panel',
  },
};

let _lang = 'es';

export function setLang(lang) {
  if (!translations[lang]) return;
  _lang = lang;
  document.documentElement.lang = lang;
  applyTranslations();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function getLang() { return _lang; }

export function t(key) {
  return translations[_lang]?.[key] ?? translations['es']?.[key] ?? key;
}

// Apply all data-i18n attributes in the DOM
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

// Initialize from saved settings
export function initI18n(lang = 'es') {
  _lang = lang || 'es';
  document.documentElement.lang = _lang;
}
