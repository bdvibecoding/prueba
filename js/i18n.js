/* ═══════════════════════════════════════════════
   TGWL — i18n.js
   Internationalization (ES / EN)
═══════════════════════════════════════════════ */

const translations = {
  es: {
    // Nav
    nav_home:'Inicio',
    nav_entreno:'Entreno',
    nav_nutricion:'Nutrición',
    nav_progreso:'Progreso',
    nav_perfil:'Perfil',
    nav_admin:'Admin',

    // Auth
    welcome_back:'Bienvenido de vuelta',
    sign_in_to_continue:'Inicia sesión para continuar',
    continue_google:'Continuar con Google',
    or_with_email:'o con correo',
    email:'Correo electrónico',
    password:'Contraseña',
    forgot_password:'¿Olvidaste tu contraseña?',
    sign_in:'Iniciar Sesión',
    new_here:'¿nuevo aquí?',
    get_started:'Empieza con nosotros',
    create_account:'Crear cuenta',
    join_community:'Únete a nuestra comunidad',
    back:'← Volver',
    full_name:'Nombre completo',
    confirm_password:'Confirmar contraseña',
    register:'Crear Cuenta',
    recover_password:'Recuperar contraseña',
    send_recovery:'Te enviaremos un enlace de recuperación',
    send_link:'Enviar enlace',

    // Home
    greeting_morning:'Buenos días',
    greeting_afternoon:'Buenas tardes',
    greeting_evening:'Buenas noches',
    modules:'Módulos',
    recent_activity:'Actividad reciente',
    workouts:'Entrenos',
    streak:'Racha',
    this_week:'Esta semana',
    no_workouts:'Sin entrenos aún',
    start_first:'¡Comienza tu primera sesión en Entreno!',
    active_session:'Entreno en curso',
    continue:'Continuar →',
    specialists:'Mis especialistas',
    chat_placeholder:'Escribe un mensaje...',
    send:'Enviar',
    message:'Mensaje →',
    start_conversation:'Inicia la conversación',

    // Home motivation phrases
    motivation_1:'El único entreno que lamentarás es el que no hiciste.',
    motivation_2:'Consistencia > Perfección.',
    motivation_3:'Cada rep cuenta. Cada día importa.',
    motivation_4:'Sé más fuerte que tus excusas.',
    motivation_5:'El dolor de hoy es el progreso de mañana.',
    motivation_6:'Tu cuerpo puede. Es tu mente la que debes convencer.',
    motivation_7:'No pares cuando estés cansado. Para cuando hayas terminado.',

    // Check-in
    checkin_title:'¿Cómo estás hoy?',
    checkin_mood:'¿Cómo te sientes?',
    checkin_sleep:'¿Cómo dormiste?',
    checkin_hours:'Horas de sueño',
    checkin_notes:'¿Algo fuera de lo normal?',
    checkin_pain:'¿Te duele algo hoy?',
    checkin_pain_where:'¿Dónde?',
    checkin_submit:'Registrar y continuar',
    checkin_skip:'Omitir por hoy',
    checkin_daily:'Check-in diario',
    checkin_saving:'Guardando…',
    checkin_saved:'Check-in guardado',
    checkin_error:'Error al guardar',
    checkin_optional:'(opcional)',
    checkin_hours_tonight:'horas esta noche',
    checkin_free_comment:'¿Hay algo fuera de lo normal?',
    checkin_comment_placeholder:'Ej: me siento muy cansado, tuve un evento estresante…',
    checkin_pain_where_placeholder:'¿Dónde? Ej: rodilla izquierda, hombro…',
    checkin_mood_bad:'Mal',
    checkin_mood_poor:'Regular',
    checkin_mood_ok:'Normal',
    checkin_mood_good:'Bien',
    checkin_mood_great:'Genial',
    checkin_sleep_terrible:'Muy mal',
    checkin_sleep_bad:'Mal',
    checkin_sleep_ok:'Regular',
    checkin_sleep_good:'Bien',
    checkin_sleep_great:'Excelente',

    // Entreno module
    entreno_title:'Entreno',
    entreno_subtitle:'Tus rutinas asignadas',
    entreno_tab_routines:'Rutinas',
    entreno_tab_history:'Historial',
    entreno_no_routines:'Sin rutinas asignadas',
    entreno_no_routines_sub:'Tu coach aún no ha asignado ninguna rutina.',
    entreno_error_load:'Error al cargar',
    entreno_load_error:'Error al cargar rutinas',
    entreno_back_routines:'← Rutinas',
    entreno_start_btn:' Iniciar Entreno',
    entreno_no_exercises:'Sin ejercicios',
    entreno_no_exercises_sub:'Esta rutina no tiene ejercicios asignados aún.',
    entreno_today:'Hoy',
    entreno_exercises_badge:'ej.',
    entreno_start_title:' Iniciar Entreno',
    entreno_start_confirm:'¿Listo para comenzar"{name}"? El cronómetro arrancará al confirmar.',
    entreno_start_ok:'Iniciar',
    entreno_started:'¡Arranca! {name}',
    entreno_cancel_title:'✕ Cancelar entreno',
    entreno_cancel_confirm:'¿Seguro que deseas cancelar? Se perderá el progreso no guardado.',
    entreno_cancel_ok:'Sí, cancelar',
    entreno_cancelled:'Entreno cancelado',
    entreno_saved:'Entreno guardado',
    entreno_save_error:'Error guardando',
    entreno_rest_done:'¡Tiempo de descanso terminado!',
    entreno_start_first_info:'Primero inicia el entreno',
    entreno_note_prompt:'Cómo te has sentido, observaciones...',
    entreno_note_title:' Nota general del entreno',
    entreno_summary_title:' ¡Entreno completado!',
    entreno_summary_close:'Cerrar',
    entreno_duration:'Duración',
    entreno_sets:'Series',
    entreno_rpe:'RPE',
    entreno_set_header:'Set',
    entreno_prev:'Anterior',
    entreno_reps:'Reps',
    entreno_kg:'Kg',
    entreno_show_map:'Mostrar mapa muscular',
    entreno_sets_done:'Series realizadas',
    entreno_muscles:'Músculos trabajados',
    entreno_no_set_data:'Sin datos de series registrados.',
    entreno_no_muscles:'No hay datos de músculos disponibles.',
    entreno_no_auth:'No autenticado',
    entreno_no_history:'Sin entrenos registrados',
    entreno_no_history_sub:'Completa tu primer entreno para ver el historial aquí.',
    entreno_routine_not_found:'Rutina no encontrada',
    entreno_video_btn:' Ver ejercicio',
    entreno_swap_btn:'',
    entreno_notes_btn:'',
    entreno_history_btn:'',
    entreno_swap_title:' Cambiar ejercicio',
    entreno_swap_alts:'Alternativas para',
    entreno_swap_reason:'Motivo del cambio *',
    entreno_swap_confirm:'Confirmar cambio',
    entreno_swap_reason_required:'Indica el motivo del cambio',
    entreno_swap_done:'Ejercicio cambiado a {name}',
    entreno_note_incidence:' Nota de incidencia',
    entreno_note_saved:'Nota guardada',
    entreno_history_title:' Historial',
    entreno_incidences:'Incidencias',
    entreno_no_history_ex:'Sin historial',
    entreno_history_error:'Error al cargar historial',
    entreno_setup_placeholder:'Notas de setup (banco pos.2, agarre neutro...)',
    entreno_no_equipment:'Sin equipo',

    // Alimentacion module
    alim_title:'Nutrición',
    alim_subtitle:'Seguimiento alimentario',
    alim_wake_up:'Al despertar',
    alim_loading_suppl:'Cargando suplementación...',
    alim_see:'Ver',
    alim_tab_tracker:'Tracker',
    alim_tab_menus:'Menús',
    alim_tab_restaurants:'Restaurantes',
    alim_today:'Hoy —',
    alim_5_meals:'5 comidas',
    alim_no_menus:'Sin menús asignados',
    alim_no_menus_sub:'Tu nutricionista aún no ha asignado ningún menú.',
    alim_no_restaurants:'Sin restaurantes asignados',
    alim_no_restaurants_sub:'Tu coach no ha añadido puntos de interés gastronómicos aún.',
    alim_no_suppl:'Sin suplementación asignada aún.',
    alim_consult_suppl:'Consulta tu suplementación.',
    alim_see_suppl:'Ver suplementación asignada.',
    alim_suppl_title:' Suplementación',
    alim_suppl_notice:'Los suplementos son orientativos. Consulta siempre con tu médico o nutricionista.',
    alim_no_suppl_empty:'Sin suplementos',
    alim_meal_question:'¿Qué comiste?',
    alim_meal_placeholder:'Ej: Arroz con pollo y ensalada, 300g arroz...',
    alim_meal_skipped:'¿Saltaste esta comida?',
    alim_meal_why:'¿Por qué la saltaste?',
    alim_meal_why_placeholder:'Ej: No tuve tiempo, estaba de viaje...',
    alim_meal_replacement:'¿Qué comiste en su lugar?',
    alim_meal_replacement_placeholder:'Ej: Un bocadillo, fruta...',
    alim_meal_clear:'Limpiar',
    alim_meal_save:' Guardar',
    alim_meal_saved:'Comida registrada',
    alim_meal_skipped_label:'Saltada',
    alim_menu_title:' Menú asignado',
    alim_healthy_restaurant:'Restaurante saludable',
    alim_assigned:'Asignado',
    alim_not_assigned:'Sin asignar',
    alim_timing_morning:' Al despertar',
    alim_timing_preworkout:' Pre-entreno',
    alim_timing_postworkout:' Post-entreno',
    alim_timing_anytime:' En cualquier momento',
    meal_breakfast:'Desayuno',
    meal_midmorning:'Media mañana',
    meal_lunch:'Almuerzo',
    meal_snack:'Merienda',
    meal_dinner:'Cena',

    // Biomedidas module
    bio_title:'Biomedidas',
    bio_subtitle:'Control de composición corporal',
    bio_add:'+ Añadir',
    bio_height:'Talla (cm)',
    bio_weight_label:'Peso (kg)',
    bio_bmi:'IMC',
    bio_tab_bio:'Bioimpedancia',
    bio_tab_skinfold:'Pliegues',
    bio_tab_perimetrals:'Perímetros',
    bio_apply:'Aplicar',
    bio_no_bio:'Sin datos de bioimpedancia',
    bio_no_skinfold:'Sin datos de pliegues',
    bio_no_perimetrals:'Sin medidas perimetrales',
    bio_fat:'% Grasa',
    bio_muscle:'% Músculo',
    bio_add_title:' Añadir medidas',
    bio_current_weight:'Peso actual',
    bio_fat_pct:'% Grasa corporal',
    bio_muscle_pct:'% Masa muscular',
    bio_water_pct:'% Agua',
    bio_visceral:'Grasa visceral',
    bio_visceral_unit:'índice',
    bio_fat_pct_skinfold:'% Grasa',
    bio_save:' Guardar',
    bio_saved:'Medidas guardadas',
    bio_load_error:'Error cargando datos',
    bio_date:'Fecha',
    bio_skinfold_triceps:'Tríceps',
    bio_skinfold_biceps:'Bíceps',
    bio_skinfold_subscapular:'Subescapular',
    bio_skinfold_supraspinal:'Supraespinal',
    bio_skinfold_abdominal:'Abdominal',
    bio_skinfold_thigh:'Muslo',
    bio_skinfold_leg:'Pierna',
    bio_peri_waist:'Cintura',
    bio_peri_hip:'Cadera',
    bio_peri_chest:'Pecho',
    bio_peri_arm_r:'Brazo D',
    bio_peri_arm_l:'Brazo I',
    bio_peri_thigh_r:'Muslo D',
    bio_peri_thigh_l:'Muslo I',
    bio_peri_calf:'Gemelo',
    bio_peri_waist_abbr:'cin',
    bio_peri_hip_abbr:'cad',
    bio_peri_chest_abbr:'pec',

    // Salud module
    salud_title:'Salud',
    salud_subtitle:'Historial y bienestar',
    salud_add:'+ Añadir',
    salud_tab_general:'General',
    salud_tab_sensitive:' Sensible',
    salud_tab_checkins:' Check-ins',
    salud_no_records:'Sin registros',
    salud_no_records_sub:'Añade lesiones, operaciones o afecciones relevantes.',
    salud_delete_title:'Eliminar registro',
    salud_delete_confirm:'¿Eliminar este registro de salud?',
    salud_deleted:'Registro eliminado',
    salud_active:'Activo',
    salud_resolved:'Resuelto',
    salud_affects_training:' Afecta al entrenamiento:',
    salud_sensitive_lock:'Datos sensibles protegidos',
    salud_sensitive_desc:'Solo visible para el administrador autorizado.',
    salud_request_access:'Solicitar acceso',
    salud_access_requested:'Solicitud enviada al administrador',
    salud_authorized:' Acceso autorizado',
    salud_no_sensitive:'Sin datos sensibles',
    salud_add_sensitive:'+ Añadir',
    salud_checkin_view:'Ver datos de',
    salud_my_checkins:'— Mis propios check-ins —',
    salud_no_checkins:'Sin check-ins aún',
    salud_no_checkins_client:'no ha completado ningún check-in todavía.',
    salud_no_checkins_own:'Completa tu primer check-in diario al abrir la app.',
    salud_state:'Estado:',
    salud_last_7:'Últimos 7 días ·',
    salud_mood:'Ánimo',
    salud_sleep:'Sueño',
    salud_hours:'Horas',
    salud_pain:'Dolor',
    salud_pain_days:' días',
    salud_last_days:'Últimos días',
    salud_mood_trend:'Tendencia ánimo (14 días)',
    salud_sleep_hours:'Horas de sueño (14 días)',
    salud_average:'Promedio:',
    salud_per_night:'h/noche',
    salud_pain_history:'Historial de dolor',
    salud_no_location:'Sin localización',
    salud_notes_anomalies:'Notas y anomalías',
    salud_state_good:'Bueno',
    salud_state_attention:'Atención',
    salud_state_alert:'Alerta',
    salud_type:'Tipo',
    salud_title_label:'Título / Diagnóstico',
    salud_title_placeholder:'Ej: Rotura fibras bíceps derecho',
    salud_date_label:'Fecha',
    salud_desc_label:'Descripción (opcional)',
    salud_desc_placeholder:'Detalles, tratamiento, observaciones...',
    salud_currently_active:'¿Activo actualmente?',
    salud_affects:'¿Afecta al entrenamiento?',
    salud_training_notes_placeholder:'Ej: Evitar peso muerto, no cargar más de 10kg...',
    salud_save:' Guardar',
    salud_saved:'Registro guardado',
    salud_title_required:'Introduce un título',
    salud_add_modal_general:' Registro de salud',
    salud_add_modal_sensitive:' Dato sensible',
    salud_type_injury:'Lesión',
    salud_type_fracture:'Fractura',
    salud_type_surgery:'Operación',
    salud_type_prosthesis:'Prótesis',
    salud_type_disease:'Enfermedad',
    salud_type_allergy:'Alergia',
    salud_type_other:'Otro',

    // Progreso module
    prog_title:'Progreso',
    prog_subtitle:'Fotos semanales y gráficas',
    prog_upload_btn:' Subir',
    prog_tab_photos:'Fotos',
    prog_tab_compare:'Comparar',
    prog_tab_charts:'Gráficas',
    prog_load:'Cargar',
    prog_apply:'Aplicar',
    prog_no_photo:'Sin foto',
    prog_start_date:'Fecha inicio',
    prog_end_date:'Fecha final',
    prog_before:'Antes',
    prog_after:'Ahora',
    prog_upload_title:' Subir fotos de progreso',
    prog_upload_date:'Fecha',
    prog_upload_hint:'Selecciona hasta 4 fotos (Frontal, Perfil Izq, Espalda, Perfil Der)',
    prog_save_photos:' Guardar fotos',
    prog_uploading:'Subiendo...',
    prog_uploaded:'Fotos subidas',
    prog_upload_error:'Error subiendo fotos',
    prog_change:'Cambiar',
    prog_compare_error:'Error cargando comparación',
    prog_chart_error:'Error cargando gráficas',
    prog_angle_front:'Frontal',
    prog_angle_left:'Perfil Izq',
    prog_angle_back:'Espalda',
    prog_angle_right:'Perfil Der',

    // Perfil module
    perfil_title:'Perfil',
    perfil_edit:'',
    perfil_logout_icon:'',
    perfil_physical:'Datos físicos',
    perfil_height:'Talla',
    perfil_weight_init:'Peso inicial',
    perfil_goals_exp:'Objetivos y experiencia',
    perfil_exp_label:'Nivel de experiencia',
    perfil_goals_label:'Objetivos deportivos',
    perfil_goals_placeholder:'Ej: Perder grasa, ganar masa muscular, mejorar rendimiento en competición...',
    perfil_save:' Guardar cambios',
    perfil_account:'Cuenta',
    perfil_change_pass:'Cambiar contraseña',
    perfil_logout:'Cerrar sesión',
    perfil_logout_title:'Cerrar sesión',
    perfil_logout_confirm:'¿Seguro que deseas cerrar sesión?',
    perfil_logout_ok:'Sí, salir',
    perfil_saved:'Perfil actualizado',
    perfil_age:'años',
    perfil_age_toast:'Edad calculada: {age} años',
    perfil_pass_sent:'Email de recuperación enviado',
    perfil_photo_updated:'Foto actualizada',
    perfil_photo_error:'Error subiendo foto',
    perfil_name_label:'Nombre completo',
    perfil_email_label:'Correo',
    perfil_birth_label:'Fecha de nacimiento',
    perfil_gender_label:'Género',
    perfil_gender_select:'Seleccionar...',
    perfil_gender_male:'Masculino',
    perfil_gender_female:'Femenino',
    perfil_gender_other:'Otro / Prefiero no indicar',
    perfil_exp_beginner:' Principiante',
    perfil_exp_intermediate:' Intermedio',
    perfil_exp_advanced:' Avanzado',
    perfil_exp_elite:' Élite',
    perfil_user:'Usuario',

    // Suscripcion module
    sub_title:'Suscripción',
    sub_subtitle:'Elige tu plan de entrenamiento',
    sub_active:'Plan activo',
    sub_free_trial:'14 días de prueba gratuita',
    sub_select:'Seleccionar',
    sub_current:' Plan actual',
    sub_request:'Solicitar información',
    sub_session:'Sesión Individual',
    sub_plans_title:'Planes & Servicios',
    sub_plans_subtitle:'Soluciones de alto rendimiento para empresas y profesionales',
    sub_active_plan:'Plan activo:',
    sub_active_desc:'Tu suscripción está activa y al corriente',
    sub_info_text:'Inversión en rendimiento y salud de alto nivel.',
    sub_info_text2:'Solicita información y nos ponemos en contacto contigo.',
    sub_per_month:'/ mes',
    sub_per_session:'/ sesión',
    sub_single_service:'Servicio puntual',
    sub_single_title:'Sesión Individual',
    sub_single_desc:'Una sesión de coaching personalizado con un especialista TGWL. Ideal para evaluación inicial, revisión de objetivos o sesión de intensidad.',
    sub_no_subscription:'Sin suscripción',
    sub_60_min:'60 minutos',
    sub_online_or_in_person:'Online o presencial',
    sub_book:'Reservar sesión',
    sub_faq_title:'Preguntas frecuentes',
    sub_secure:' Pagos seguros con',
    sub_billing:'Facturación mensual · IVA no incluido · Sin permanencia',
    sub_inquiry_title:'Solicitar información —',
    sub_inquiry_desc:'Déjanos tus datos de contacto y un especialista TGWL se pondrá en contacto contigo en menos de 24 horas para orientarte sobre este plan.',
    sub_contact_email:'Email de contacto',
    sub_message_opt:'Mensaje (opcional)',
    sub_message_placeholder:'Cuéntanos brevemente tus objetivos o consultas...',
    sub_send:'Enviar solicitud',
    sub_sending:'Enviando...',
    sub_sent_title:'¡Solicitud enviada!',
    sub_sent_desc:'Hemos recibido tu interés en el plan {name}. Un especialista TGWL se pondrá en contacto contigo en menos de 24 horas.',
    sub_no_commitment:'Sin compromiso · Respuesta en menos de 24 h',
    sub_send_error:'Error al enviar la solicitud. Inténtalo de nuevo.',
    sub_email_required:'Por favor, introduce un email de contacto',
    sub_book_title:' Reservar Sesión Individual',
    sub_book_what:'¿En qué quieres trabajar? (opcional)',
    sub_book_placeholder:'Ej: evaluación inicial, revisión de objetivos, sesión de intensidad...',
    sub_book_confirm:'Confirmar reserva',
    sub_confirming:'Confirmando...',
    sub_booked_title:'¡Reserva recibida!',
    sub_booked_desc:'Hemos registrado tu solicitud. Un especialista TGWL confirmará la cita y te enviará todos los detalles en menos de 24 horas.',
    sub_book_no_commitment:'Sin compromiso · El pago se gestiona con el especialista',
    sub_book_error:'Error al registrar la reserva. Inténtalo de nuevo.',

    // Suscripcion — plan features & extended keys
    sub_essential_desc:'Acceso completo a entrenamiento, nutrición, chat y seguimiento de salud.',
    sub_pro_desc:'Todo lo de Essential más coach personal, fotos de progreso, IA y soporte prioritario.',
    sub_elite_desc:'Equipo multidisciplinar completo, sesiones ilimitadas y plan de vida integral.',
    sub_most_popular:'Más popular',
    sub_f_routines:'Rutinas de entrenamiento',
    sub_f_nutrition:'Seguimiento nutricional',
    sub_f_chat:'Chat con especialista',
    sub_f_biomedidas:'Biomedidas & salud',
    sub_f_reports:'Informes de progreso',
    sub_f_coach:'Coach personal asignado',
    sub_f_nutrition_plan:'Plan nutricional personalizado',
    sub_f_ai:'Asistente IA',
    sub_f_priority:'Soporte prioritario',
    sub_f_team:'Equipo multidisciplinar (básico)',
    sub_f_team_full:'Equipo multidisciplinar completo',
    sub_f_unlimited:'Sesiones ilimitadas',
    sub_f_247:'Disponibilidad 24/7',
    sub_f_progress_photos:'Fotos de progreso',
    sub_f_biomedical:'Análisis biomédico avanzado',
    sub_f_life_plan:'Plan de vida integral',
    sub_free_desc:'Actualmente estás en el plan gratuito.',
    sub_free_cta:'Elige un plan para desbloquear todas las funciones.',
    sub_current_plan:'Plan actual',
    sub_request_info:'Solicitar información',
    sub_stripe_secure:'Pagos seguros con',
    sub_billing_note:'Facturación mensual · IVA no incluido · Sin permanencia',
    sub_one_time:'Servicio puntual',
    sub_session_title:'Sesión Individual',
    sub_session_desc:'Una sesión de coaching personalizado con un especialista TGWL. Ideal para evaluación inicial, revisión de objetivos o sesión de intensidad.',
    sub_book_session:'Reservar sesión',
    sub_session_coaching_note:'Coaching personalizado · 60 min',
    sub_session_modal_desc:'Indica tus datos y preferencias. Un especialista TGWL confirmará la cita y te enviará el acceso en menos de 24 horas.',
    sub_faq_q1:'¿Cómo funciona el proceso de incorporación?',
    sub_faq_a1:'Tras solicitar información, un especialista TGWL te contacta en menos de 24 horas para una llamada de diagnóstico. Definimos tus objetivos, personalizamos el plan y activamos el acceso.',
    sub_faq_q2:'¿Qué diferencia al plan Elite del Pro?',
    sub_faq_a2:'Elite incluye un equipo multidisciplinar completo (médico, fisioterapeuta, psicólogo y nutricionista), sesiones ilimitadas, disponibilidad 24/7 y un análisis biomédico avanzado con plan de vida integral.',
    sub_faq_q3:'¿Las sesiones son presenciales u online?',
    sub_faq_a3:'Ofrecemos ambas modalidades. El formato se acuerda con tu especialista asignado según tu disponibilidad y ubicación.',
    sub_faq_q4:'¿Los precios incluyen IVA?',
    sub_faq_a4:'Los precios indicados no incluyen IVA. La facturación se realiza mensualmente y recibirás factura detallada para deducción empresarial.',
    sub_faq_q5:'¿Hay permanencia o penalización por cancelación?',
    sub_faq_a5:'No existe permanencia. Puedes pausar o cancelar tu plan con 15 días de antelación al siguiente ciclo de facturación sin ningún coste adicional.',
    sub_faq_q6:'¿Puedo cambiar de plan una vez contratado?',
    sub_faq_a6:'Sí. Puedes hacer upgrade en cualquier momento. El cambio se aplica en el siguiente ciclo de facturación y te notificamos el ajuste de importe correspondiente.',

    // Configuracion module
    settings_title:'Ajustes',
    settings_subtitle:'Personaliza tu experiencia',
    appearance:'Apariencia',
    dark_mode:'Modo oscuro',
    dark_mode_desc:'Tema oscuro para un mejor contraste',
    muscle_map:'Mapa muscular',
    muscle_map_desc:'Mostrar mapa de músculos al finalizar entreno',
    language:'Idioma',
    language_app:'Idioma de la app',
    notifications:'Notificaciones',
    push_notif:'Notificaciones push',
    push_notif_desc:'Avisos del temporizador de descanso y recordatorios',
    notif_status:'Estado del permiso',
    notif_checking:'Comprobando...',
    notif_activate:'Activar',
    notif_granted:' Notificaciones activadas',
    notif_denied:' Permisos denegados — actívalos en el navegador',
    notif_pending:'Permiso pendiente',
    notif_not_supported:'No soportado en este navegador',
    notif_activated:'¡Notificaciones activadas!',
    notif_denied_toast:'Permiso denegado para notificaciones',
    notif_not_supported_toast:'Notificaciones no soportadas',
    screen:'Pantalla',
    keep_awake:'Mantener pantalla activa',
    keep_awake_desc:'Evita que la pantalla se apague durante el entreno',
    app:'Aplicación',
    install:'Instalar en dispositivo',
    install_desc:'Añade TGWL a tu pantalla de inicio',
    clear_cache:'Limpiar caché',
    clear_cache_desc:'Elimina datos temporales almacenados',
    about:'Sobre la app',
    version:'Versión',
    privacy:'Política de privacidad',
    terms:'Términos de uso',
    dark_mode_on:'Modo oscuro activado',
    dark_mode_off:'Modo claro activado',
    muscle_map_on:'Mapa muscular activado',
    muscle_map_off:'Mapa muscular desactivado',
    wake_lock_on:'Pantalla activa durante el entreno',
    wake_lock_off:'Pantalla se apagará normalmente',
    install_fallback:'Para instalar: comparte >"Añadir a pantalla de inicio"',
    installed:'¡TGWL instalada!',
    cache_cleared:'Caché limpiada',
    cache_clear_error:'No se pudo limpiar la caché',
    copyright:' 2024 Todos los derechos reservados',

    // Admin panel
    admin_title:'Panel Admin',
    admin_subtitle:'Gestión de usuarios y permisos',
    invite:'+ Invitar',
    search_users:'Buscar por nombre o email...',
    all:'Todos',
    users:'Usuarios',
    coaches:'Coaches',
    clients:'Clientes',
    save:'Guardar',
    cancel:'Cancelar',
    confirm:'Confirmar',
    admin_stats_users:'Usuarios',
    admin_stats_staff:'Staff',
    admin_stats_clients:'Clientes',
    admin_no_users:'Sin usuarios',
    admin_no_name:'Sin nombre',
    admin_change_role:'Cambiar rol',
    admin_role_confirm:'¿Cambiar el rol de este usuario a"{role}"?',
    admin_role_updated:'Rol actualizado a',
    admin_assign_coach:'Asignar coach',
    admin_assign_medico:'Médico asignado',
    admin_assign_fisio:'Fisio asignado',
    admin_assign_psicologo:'Psicólogo asignado',
    admin_assign_nutricionista:'Nutricionista asignado',
    admin_no_coach:'Sin coach asignado',
    admin_no_medico:'Sin médico asignado',
    admin_no_fisio:'Sin fisio asignado',
    admin_no_psicologo:'Sin psicólogo asignado',
    admin_no_nutricionista:'Sin nutricionista asignado',
    admin_save_coach_btn:'Asignar coach',
    admin_save_medico_btn:'Asignar médico',
    admin_save_fisio_btn:'Asignar fisio',
    admin_save_psicologo_btn:'Asignar psicólogo',
    admin_save_nutricionista_btn:'Asignar nutricionista',
    admin_assigned_ok:'asignado/a',
    admin_routines_title:'Rutinas asignadas',
    admin_assign_routine:' Asignar nueva rutina',
    admin_actions:'Acciones',
    admin_grant_sensitive:' Dar acceso datos sensibles',
    admin_revoke_access:' Revocar acceso',
    admin_sensitive_granted:'Acceso concedido a datos sensibles',
    admin_revoke_title:'Revocar acceso',
    admin_revoke_confirm:'¿Revocar el acceso de este usuario?',
    admin_revoked:'Acceso revocado',
    admin_no_routines:'Sin rutinas asignadas',
    admin_delete_assign:'Eliminar',
    admin_delete_assign_title:'Eliminar asignación',
    admin_delete_assign_confirm:'¿Eliminar esta rutina asignada?',
    admin_assign_deleted:'Asignación eliminada',
    admin_assign_modal:' Asignar rutina',
    admin_assigning_to:'Asignando a:',
    admin_no_routines_created:'No hay rutinas creadas aún.',
    admin_new_routine:'Nombre de la rutina...',
    admin_create_assign:'+ Crear y asignar',
    admin_routine_created:'Rutina creada y asignada',
    admin_name_required:'Introduce un nombre',
    admin_invite_title:' Invitar usuario',
    admin_invite_desc:'Genera un enlace de invitación para que el usuario cree su cuenta.',
    admin_invite_email:'correo@ejemplo.com',
    admin_generate:' Generar enlace',
    admin_invite_link:'Enlace de invitación:',
    admin_copy_link:' Copiar enlace',
    admin_email_link:' Enviar por email',
    admin_link_generated:'Enlace de invitación generado',
    admin_link_copied:'Enlace copiado al portapapeles',
    admin_link_copied2:'Enlace copiado',
    admin_generated_ok:' Enlace generado',
    admin_email_required:'Introduce un email',
    admin_invite_error:'Error al generar invitación',
    admin_exercises:'ejercicios',
    admin_or_create_routine:'O crea una nueva rutina:',
    admin_invite_subject:'Invitación TGWL',
    admin_invite_body:'Hola,\n\nTe han invitado a unirse a TGWL.\n\nHaz clic en el siguiente enlace para crear tu cuenta:\n{url}\n\nEste enlace es personal e intransferible.\n\nSaludos,\nEl equipo TGWL',
    admin_routine_label:'Rutina',
    admin_current_admins:'Admins actuales',
    admin_current_admins_desc:'El sistema permite un máximo de 3 administradores.',
    admin_no_admins:'No hay administradores registrados.',
    admin_admin_limit_reached:'Límite alcanzado: ya hay 3 administradores. Revoca el rol a uno antes de elevar a otro.',
    admin_elevate_confirm:'¿Elevar a este usuario al rol de administrador? Esta acción le otorga acceso total al sistema.',
    admin_elevate_warning:'Quedan {n} de 3 plazas de administrador disponibles.',

    // Pantalla de bloqueo de acceso
    access_blocked_title:'Acceso pendiente de activación',
    access_blocked_msg:'Tu cuenta está siendo revisada por nuestro equipo. Recibirás un email cuando tu acceso esté activo.',
    access_view_plans:'Ver planes',
    access_blocked_sub:'¿Ya tienes suscripción activa? Contacta con soporte.',

    // Modal de invitación — aviso staff
    invite_staff_only_client:'Como staff solo puedes invitar clientes. Los admins pueden invitar cualquier rol.',
    invite_role_locked:'Rol fijo: Cliente',

    // Admin — Control de Acceso
    admin_access_control:'Control de Acceso',
    admin_access_status:'Estado de acceso',
    admin_access_granted_toggle:'Desbloquear acceso manualmente',
    admin_access_note_placeholder:'Nota (ej: Prueba 30 días, Promo enero...)',
    admin_access_save_note:'Guardar nota',
    admin_access_granted_by:'Desbloqueado por',
    admin_access_active_sub:' Suscripción activa',
    admin_access_manual_override:' Acceso manual (admin)',
    admin_access_none:' Sin acceso',
    admin_access_revoked:'Acceso revocado',
    admin_access_unlocked:'Acceso desbloqueado para {name}',
    admin_pending_title:'Pendientes de activación',
    admin_pending_desc:'Clientes registrados que esperan autorización para usar la app.',
    admin_no_pending:'No hay clientes pendientes de activación',
    admin_grant_access:'Activar acceso',
    admin_pending_manual_note:'Activado manualmente por admin',
    admin_invite_sent:'Invitación enviada',
    admin_invite_pending:'En espera',
    admin_invite_approve:'✓ Aprobar',
    admin_invite_reject:'✗ Rechazar',
    admin_invite_approved:'Aprobado — tendrá acceso al registrarse',
    admin_invite_rejected:'Invitación rechazada',

    // Staff panel
    staff_client_view:'Vista cliente →',
    staff_clients:'Clientes',
    staff_sessions_week:'Sesiones semana',
    staff_routines_mgmt:'Gestión de Rutinas',
    staff_create_routine:'Crear rutina',
    staff_create_routine_desc:'Diseña una nueva rutina de entrenamiento',
    staff_my_routines:'Mis rutinas',
    staff_my_routines_desc:'Ver, editar y asignar rutinas creadas',
    staff_nutrition_mgmt:'Gestión de Planes',
    staff_create_menu:'Crear plan nutricional',
    staff_create_menu_desc:'Diseña un nuevo plan de alimentación semanal',
    staff_my_menus:'Mis planes',
    staff_my_menus_desc:'Ver, editar y asignar planes creados',
    staff_create_suppl:'Crear protocolo de suplementación',
    staff_create_suppl_desc:'Nuevo protocolo de suplementos para un cliente',
    staff_my_suppls:'Mis protocolos',
    staff_my_suppls_desc:'Ver, editar y asignar protocolos creados',
    staff_suppl_mgmt:'Gestión de Suplementación',
    staff_my_clients:'Mis Clientes',
    staff_no_clients:'Sin clientes asignados',
    staff_no_clients_sub:'El administrador te asignará clientes pronto.',
    staff_last_session:'Última sesión:',
    staff_add_note:'+ Nota',
    staff_chat:' Chat',
    staff_no_routines:'Sin rutinas asignadas aún.',
    staff_assigned_date:'Asignada:',
    staff_assign_routine:' Asignar rutina',
    staff_no_routines_yet:'No hay rutinas creadas todavía.',
    staff_health_title:'Historial de salud',
    staff_health_desc:'Historial completo',
    staff_health_full:'Ve al módulo de Salud del cliente para ver y editar su historial completo.',
    staff_diet_title:'Plan nutricional',
    staff_diet_desc:'Plan nutricional',
    staff_diet_full:'Accede al módulo de Alimentación del cliente para gestionar su dieta.',
    staff_note_title:'Nueva nota',
    staff_note_for:'Para:',
    staff_note_placeholder:'Escribe tu nota aquí...',
    staff_save_note:' Guardar nota',
    staff_note_saved:'Nota guardada',
    staff_note_empty:'Escribe algo antes de guardar',
    staff_note_error:'Error al guardar',
    staff_error_clients:'Error cargando clientes',
    staff_assigned_routine:'Rutinas asignadas',
    staff_assign_new_routine:' Asignar nueva rutina',
    staff_error_routines:'Error cargando rutinas',
    staff_routine_assigned:'Rutina asignada',
    staff_no_notes:'Sin notas aún.',
    staff_psi_notes_title:'Notas psicológicas',
    staff_coach_title:'Panel Coach',
    staff_coach_subtitle:'Gestiona tus clientes y rutinas',
    staff_coach_action:'Ver rutinas',
    staff_medico_title:'Panel Médico',
    staff_medico_subtitle:'Historial de salud de tus pacientes',
    staff_medico_action:'Ver historial de salud',
    staff_fisio_title:'Panel de Fisioterapia',
    staff_fisio_subtitle:'Seguimiento fisioterapéutico de tus pacientes',
    staff_fisio_action:'Ver historial de salud',
    staff_psicologo_title:'Panel de Psicología',
    staff_psicologo_subtitle:'Notas y seguimiento psicológico',
    staff_psicologo_action:'Ver notas',
    staff_nutricionista_title:'Panel de Nutrición',
    staff_nutricionista_subtitle:'Planes nutricionales de tus clientes',
    staff_nutricionista_action:'Ver dieta',
    staff_client_label:'Cliente',

    // Routine creator
    rc_title:' Nueva Rutina',
    rc_name_label:'Nombre de la rutina *',
    rc_name_placeholder:'Ej: Fuerza Upper Body A',
    rc_desc_label:'Descripción',
    rc_desc_placeholder:'Objetivo, notas generales...',
    rc_tags_label:'Etiquetas',
    rc_exercises_title:'Ejercicios',
    rc_add_exercise:'+ Añadir ejercicio',
    rc_assign_label:'Asignar a cliente (opcional)',
    rc_assign_auto:'Se asignará automáticamente al cliente seleccionado',
    rc_no_assign:'— Sin asignar —',
    rc_save:' Guardar rutina',
    rc_saving:'Guardando...',
    rc_saved:'Rutina"{name}" guardada y asignada',
    rc_saved_no_assign:'Rutina"{name}" guardada',
    rc_name_required:'El nombre de la rutina es obligatorio',
    rc_exercises_required:'Añade al menos un ejercicio a la rutina',
    rc_exercise_picker:'+ Añadir Ejercicio',
    rc_search_exercise:'Buscar ejercicio...',
    rc_all_muscles:'Todos',
    rc_no_results:'Sin resultados',
    rc_added:'añadido',
    rc_sets_label:'Series',
    rc_reps_label:'Reps',
    rc_rest_label:'Descanso (s)',
    rc_notes_placeholder:'Notas del ejercicio...',
    rc_my_routines:' Mis Rutinas',
    rc_new_routine:'+ Crear nueva rutina',
    rc_no_routines:'Sin rutinas creadas',
    rc_no_routines_sub:'Pulsa"Crear nueva rutina" para empezar.',
    rc_created:'Creada:',
    rc_assign_btn:'Asignar a cliente',
    rc_delete_btn:'Eliminar rutina',
    rc_delete_title:'Eliminar rutina',
    rc_delete_confirm:'¿Eliminar la rutina"{name}"? Esta acción no se puede deshacer.',
    rc_deleted:'Rutina eliminada',
    rc_delete_error:'Error al eliminar',
    rc_assign_title:' Asignar rutina',
    rc_assign_to:'selecciona el cliente',
    rc_no_clients:'No tienes clientes asignados.',
    rc_assign_ok:'Rutina asignada a {name}',
    rc_assign_error:'Error al asignar',
    rc_save_error:'Error al guardar',
    rc_load_error:'Error cargando rutinas',
    rc_exercise_s:'ejercicio',
    rc_exercises_s:'ejercicios',
    rc_saved_assigned:'guardada y asignada',
    rc_saved_plain:'guardada',

    // Menu creator
    mc_title:' Nuevo Plan Nutricional',
    mc_name_label:'Nombre del plan *',
    mc_name_placeholder:'Ej: Déficit calórico semana 1',
    mc_desc_label:'Descripción / Objetivo',
    mc_desc_placeholder:'Objetivo del plan, observaciones...',
    mc_macros_title:'Objetivos nutricionales',
    mc_kcal:'Kcal/día',
    mc_protein:'Proteínas (g)',
    mc_carbs:'Carbohidratos (g)',
    mc_fat:'Grasas (g)',
    mc_meals_title:'Comidas del día',
    mc_add_slot:'+ Añadir toma',
    mc_assign_label:'Asignar a cliente',
    mc_no_assign:'— Sin asignar —',
    mc_save:' Guardar plan',
    mc_saving:'Guardando…',
    mc_saved:'Plan guardado',
    mc_name_required:'El nombre del plan es obligatorio',
    mc_slot_required:'Añade al menos una toma',
    mc_food_name_required:'Escribe el nombre del alimento',
    mc_no_plans:'Sin planes creados',
    mc_no_plans_sub:'Crea tu primer plan nutricional.',
    mc_delete_title:'Eliminar plan',
    mc_delete_confirm:'¿Eliminar este plan nutricional? Esta acción no se puede deshacer.',
    mc_deleted:'Plan eliminado',
    mc_assign_plan:'Asignar plan',
    mc_select_client:'Selecciona cliente',
    mc_select_client_opt:'— Selecciona un cliente —',
    mc_do_assign:'Asignar plan',
    mc_assigned:'Plan asignado',
    mc_assign_select:'Selecciona un cliente',
    mc_slot_food_placeholder:'Alimento (ej: Arroz cocido)',
    mc_slot_qty_placeholder:'Cantidad (100g)',
    mc_slot_notes_placeholder:'Notas de esta toma...',
    mc_meals:'toma',
    mc_meals_plural:'tomas',
    mc_badge_assigned:'Asignado',
    mc_badge_not_assigned:'Sin asignar',
    mc_save_error:'Error al guardar',
    mc_slot_breakfast:'Desayuno',
    mc_slot_midmorning:'Media mañana',
    mc_slot_lunch:'Almuerzo',
    mc_slot_snack:'Merienda',
    mc_slot_dinner:'Cena',
    mc_slot_preworkout:'Pre-entreno',
    mc_slot_postworkout:'Post-entreno',
    mc_slot_supplements_name:'Suplementación',

    // Supplement creator
    sc_title:' Nuevo Protocolo de Suplementación',
    sc_name_label:'Nombre del protocolo *',
    sc_name_placeholder:'Ej: Protocolo de volumen',
    sc_desc_label:'Descripción / Objetivo',
    sc_desc_placeholder:'Objetivo del protocolo...',
    sc_suppl_title:'Suplementos',
    sc_suggestions:'Sugerencias:',
    sc_suppl_label:'Suplemento *',
    sc_suppl_placeholder:'Nombre',
    sc_brand_label:'Marca',
    sc_brand_placeholder:'Opcional',
    sc_dose_label:'Dosis',
    sc_dose_placeholder:'Ej: 5g',
    sc_timing_label:'Momento',
    sc_instructions_placeholder:'Instrucciones (mezclar con agua...)',
    sc_duration_placeholder:'Duración (ej: 8 semanas, continuo)',
    sc_add_suppl:'+ Añadir suplemento',
    sc_notes_label:'Notas generales',
    sc_notes_placeholder:'Contraindicaciones, consejos...',
    sc_assign_label:'Asignar a cliente',
    sc_no_assign:'— Sin asignar —',
    sc_save:' Guardar protocolo',
    sc_saving:'Guardando…',
    sc_saved:'Protocolo guardado',
    sc_name_required:'El nombre del protocolo es obligatorio',
    sc_suppl_required:'El nombre del suplemento es obligatorio',
    sc_items_required:'Añade al menos un suplemento',
    sc_no_protocols:'Sin protocolos creados',
    sc_no_protocols_sub:'Crea tu primer protocolo de suplementación.',
    sc_delete_title:'Eliminar protocolo',
    sc_delete_confirm:'¿Eliminar este protocolo de suplementación? Esta acción no se puede deshacer.',
    sc_deleted:'Protocolo eliminado',
    sc_assign_protocol:'Asignar protocolo',
    sc_select_client:'Selecciona cliente',
    sc_select_client_opt:'— Selecciona un cliente —',
    sc_do_assign:'Asignar protocolo',
    sc_assigned:'Protocolo asignado',
    sc_assign_select:'Selecciona un cliente',
    sc_supplements:'suplemento',
    sc_supplements_plural:'suplementos',
    sc_badge_assigned:'Asignado',
    sc_badge_not_assigned:'Sin asignar',
    sc_save_error:'Error al guardar',
    sc_timing_morning_fast:'Mañana en ayunas',
    sc_timing_with_breakfast:'Con desayuno',
    sc_timing_preworkout:'Pre-entreno (30min)',
    sc_timing_intra:'Intra-entreno',
    sc_timing_postworkout:'Post-entreno',
    sc_timing_with_lunch:'Con almuerzo',
    sc_timing_with_dinner:'Con cena',
    sc_timing_before_sleep:'Antes de dormir',
    sc_timing_anytime:'En cualquier momento',

    // Direct chat
    dc_back:'← Volver',
    dc_start_convo:'Inicia la conversación con',
    dc_placeholder:'Escribe un mensaje...',

    // Specialist Hub
    sh_my_clients:'Mis clientes',
    sh_search:'Buscar cliente...',
    sh_no_clients:'Sin clientes asignados',
    sh_no_clients_sub:'El administrador te asignará clientes',
    sh_select_client:'Selecciona un cliente para chatear',
    sh_start_convo:'Inicia la conversación',
    sh_write_msg:'Escribe un mensaje...',
    sh_client_info:'Info del cliente',
    sh_stats:'Estadísticas',
    sh_actions:'Acciones',
    sh_notes:'Notas privadas',
    sh_save_notes:'Guardar notas',
    sh_assign_routine:'Asignar rutina',
    sh_assign_diet:'Asignar menú',
    sh_view_health:'Ver historial salud',
    sh_tab_clients:'Clientes',
    sh_tab_chat:'Chat',
    sh_tab_info:'Info',
    sh_workouts:'Entrenos totales',
    sh_avg_rpe:'RPE medio',
    sh_last_workout:'Último',

    // Subscription
    sub_active_badge:'sub_active',

    // General
    loading:'Cargando...',
    error:'Error',
    success:'¡Éxito!',
    warning:'Atención',
    yes:'Sí',
    no:'No',
    close:'Cerrar',
    delete:'Eliminar',
    edit:'Editar',
    view:'Ver',
    assign:'Asignar',
    copy:'Copiar',
    copied:'¡Copiado!',
    share:'Compartir',
    add:'Añadir',
    name:'Nombre',
    client:'Cliente',
    no_name:'Sin nombre',

    route_home:'Inicio',
    route_entreno:'Entreno',
    route_alimentacion:'Nutrición',
    route_biomedidas:'Biomedidas',
    route_salud:'Salud',
    route_progreso:'Progreso',
    route_perfil:'Perfil',
    route_suscripcion:'Suscripción',
    route_configuracion:'Ajustes',
    route_admin:'Admin',

    icon_entreno:'Entreno',
    icon_alimentacion:'Nutrición',
    icon_biomedidas:'Biomedidas',
    icon_salud:'Salud',
    icon_progreso:'Progreso',
    icon_perfil:'Perfil',
    icon_suscripcion:'Premium',
    icon_configuracion:'Ajustes',
    icon_admin:'Panel',
  },

  en: {
    // Nav
    nav_home:'Home',
    nav_entreno:'Training',
    nav_nutricion:'Nutrition',
    nav_progreso:'Progress',
    nav_perfil:'Profile',
    nav_admin:'Admin',

    // Auth
    welcome_back:'Welcome back',
    sign_in_to_continue:'Sign in to continue',
    continue_google:'Continue with Google',
    or_with_email:'or with email',
    email:'Email address',
    password:'Password',
    forgot_password:'Forgot your password?',
    sign_in:'Sign In',
    new_here:'new here?',
    get_started:'Get started',
    create_account:'Create account',
    join_community:'Join our community',
    back:'← Back',
    full_name:'Full name',
    confirm_password:'Confirm password',
    register:'Create Account',
    recover_password:'Recover password',
    send_recovery:'We will send you a recovery link',
    send_link:'Send link',

    // Home
    greeting_morning:'Good morning',
    greeting_afternoon:'Good afternoon',
    greeting_evening:'Good evening',
    modules:'Modules',
    recent_activity:'Recent activity',
    workouts:'Workouts',
    streak:'Streak',
    this_week:'This week',
    no_workouts:'No workouts yet',
    start_first:'Start your first session in Training!',
    active_session:'Session in progress',
    continue:'Continue →',
    specialists:'My specialists',
    chat_placeholder:'Type a message...',
    send:'Send',
    message:'Message →',
    start_conversation:'Start the conversation',

    // Home motivation phrases
    motivation_1:'The only workout you\'ll regret is the one you didn\'t do.',
    motivation_2:'Consistency > Perfection.',
    motivation_3:'Every rep counts. Every day matters.',
    motivation_4:'Be stronger than your excuses.',
    motivation_5:'Today\'s pain is tomorrow\'s progress.',
    motivation_6:'Your body can do it. It\'s your mind you need to convince.',
    motivation_7:'Don\'t stop when you\'re tired. Stop when you\'re done.',

    // Check-in
    checkin_title:'How are you today?',
    checkin_mood:'How are you feeling?',
    checkin_sleep:'How did you sleep?',
    checkin_hours:'Hours of sleep',
    checkin_notes:'Anything unusual to report?',
    checkin_pain:'Are you in pain today?',
    checkin_pain_where:'Where?',
    checkin_submit:'Save & continue',
    checkin_skip:'Skip for today',
    checkin_daily:'Daily check-in',
    checkin_saving:'Saving…',
    checkin_saved:'Check-in saved',
    checkin_error:'Error saving',
    checkin_optional:'(optional)',
    checkin_hours_tonight:'hours tonight',
    checkin_free_comment:'Anything out of the ordinary?',
    checkin_comment_placeholder:'E.g. I feel very tired, had a stressful event…',
    checkin_pain_where_placeholder:'Where? E.g. left knee, shoulder…',
    checkin_mood_bad:'Bad',
    checkin_mood_poor:'Poor',
    checkin_mood_ok:'Okay',
    checkin_mood_good:'Good',
    checkin_mood_great:'Great',
    checkin_sleep_terrible:'Terrible',
    checkin_sleep_bad:'Bad',
    checkin_sleep_ok:'Okay',
    checkin_sleep_good:'Good',
    checkin_sleep_great:'Excellent',

    // Entreno module
    entreno_title:'Training',
    entreno_subtitle:'Your assigned routines',
    entreno_tab_routines:'Routines',
    entreno_tab_history:'History',
    entreno_no_routines:'No assigned routines',
    entreno_no_routines_sub:'Your coach hasn\'t assigned any routines yet.',
    entreno_error_load:'Error loading',
    entreno_load_error:'Error loading routines',
    entreno_back_routines:'← Routines',
    entreno_start_btn:' Start Workout',
    entreno_no_exercises:'No exercises',
    entreno_no_exercises_sub:'This routine has no exercises assigned yet.',
    entreno_today:'Today',
    entreno_exercises_badge:'ex.',
    entreno_start_title:' Start Workout',
    entreno_start_confirm:'Ready to start"{name}"? The timer will start when you confirm.',
    entreno_start_ok:'Start',
    entreno_started:'Let\'s go! {name}',
    entreno_cancel_title:'✕ Cancel workout',
    entreno_cancel_confirm:'Are you sure you want to cancel? Unsaved progress will be lost.',
    entreno_cancel_ok:'Yes, cancel',
    entreno_cancelled:'Workout cancelled',
    entreno_saved:'Workout saved',
    entreno_save_error:'Error saving',
    entreno_rest_done:'Rest time over!',
    entreno_start_first_info:'Start the workout first',
    entreno_note_prompt:'How you felt, observations...',
    entreno_note_title:' General workout note',
    entreno_summary_title:' Workout complete!',
    entreno_summary_close:'Close',
    entreno_duration:'Duration',
    entreno_sets:'Sets',
    entreno_rpe:'RPE',
    entreno_set_header:'Set',
    entreno_prev:'Previous',
    entreno_reps:'Reps',
    entreno_kg:'Kg',
    entreno_show_map:'Show muscle map',
    entreno_sets_done:'Sets completed',
    entreno_muscles:'Muscles worked',
    entreno_no_set_data:'No set data recorded.',
    entreno_no_muscles:'No muscle data available.',
    entreno_no_auth:'Not authenticated',
    entreno_no_history:'No workouts recorded',
    entreno_no_history_sub:'Complete your first workout to see history here.',
    entreno_routine_not_found:'Routine not found',
    entreno_video_btn:' Watch exercise',
    entreno_swap_btn:'',
    entreno_notes_btn:'',
    entreno_history_btn:'',
    entreno_swap_title:' Swap exercise',
    entreno_swap_alts:'Alternatives for',
    entreno_swap_reason:'Reason for change *',
    entreno_swap_confirm:'Confirm swap',
    entreno_swap_reason_required:'Please provide a reason for the swap',
    entreno_swap_done:'Exercise swapped to {name}',
    entreno_note_incidence:' Incident note',
    entreno_note_saved:'Note saved',
    entreno_history_title:' History',
    entreno_incidences:'Incidents',
    entreno_no_history_ex:'No history',
    entreno_history_error:'Error loading history',
    entreno_setup_placeholder:'Setup notes (bench pos.2, neutral grip...)',
    entreno_no_equipment:'No equipment',

    // Alimentacion module
    alim_title:'Nutrition',
    alim_subtitle:'Food tracking',
    alim_wake_up:'Upon waking',
    alim_loading_suppl:'Loading supplements...',
    alim_see:'View',
    alim_tab_tracker:'Tracker',
    alim_tab_menus:'Menus',
    alim_tab_restaurants:'Restaurants',
    alim_today:'Today —',
    alim_5_meals:'5 meals',
    alim_no_menus:'No menus assigned',
    alim_no_menus_sub:'Your nutritionist hasn\'t assigned any menus yet.',
    alim_no_restaurants:'No restaurants added',
    alim_no_restaurants_sub:'Your coach hasn\'t added any dining spots yet.',
    alim_no_suppl:'No supplements assigned yet.',
    alim_consult_suppl:'Check your supplementation.',
    alim_see_suppl:'View assigned supplementation.',
    alim_suppl_title:' Supplementation',
    alim_suppl_notice:'Supplements are for guidance only. Always consult your doctor or nutritionist.',
    alim_no_suppl_empty:'No supplements',
    alim_meal_question:'What did you eat?',
    alim_meal_placeholder:'e.g. Chicken rice with salad, 300g rice...',
    alim_meal_skipped:'Did you skip this meal?',
    alim_meal_why:'Why did you skip it?',
    alim_meal_why_placeholder:'e.g. No time, traveling...',
    alim_meal_replacement:'What did you eat instead?',
    alim_meal_replacement_placeholder:'e.g. A sandwich, fruit...',
    alim_meal_clear:'Clear',
    alim_meal_save:' Save',
    alim_meal_saved:'Meal logged',
    alim_meal_skipped_label:'Skipped',
    alim_menu_title:' Assigned menu',
    alim_healthy_restaurant:'Healthy restaurant',
    alim_assigned:'Assigned',
    alim_not_assigned:'Unassigned',
    alim_timing_morning:' Upon waking',
    alim_timing_preworkout:' Pre-workout',
    alim_timing_postworkout:' Post-workout',
    alim_timing_anytime:' Any time',
    meal_breakfast:'Breakfast',
    meal_midmorning:'Mid-morning',
    meal_lunch:'Lunch',
    meal_snack:'Snack',
    meal_dinner:'Dinner',

    // Biomedidas module
    bio_title:'Biometrics',
    bio_subtitle:'Body composition tracking',
    bio_add:'+ Add',
    bio_height:'Height (cm)',
    bio_weight_label:'Weight (kg)',
    bio_bmi:'BMI',
    bio_tab_bio:'BIA',
    bio_tab_skinfold:'Skinfolds',
    bio_tab_perimetrals:'Perimeters',
    bio_apply:'Apply',
    bio_no_bio:'No BIA data',
    bio_no_skinfold:'No skinfold data',
    bio_no_perimetrals:'No perimeter measurements',
    bio_fat:'% Fat',
    bio_muscle:'% Muscle',
    bio_add_title:' Add measurements',
    bio_current_weight:'Current weight',
    bio_fat_pct:'% Body fat',
    bio_muscle_pct:'% Muscle mass',
    bio_water_pct:'% Water',
    bio_visceral:'Visceral fat',
    bio_visceral_unit:'index',
    bio_fat_pct_skinfold:'% Fat',
    bio_save:' Save',
    bio_saved:'Measurements saved',
    bio_load_error:'Error loading data',
    bio_date:'Date',
    bio_skinfold_triceps:'Triceps',
    bio_skinfold_biceps:'Biceps',
    bio_skinfold_subscapular:'Subscapular',
    bio_skinfold_supraspinal:'Supraspinal',
    bio_skinfold_abdominal:'Abdominal',
    bio_skinfold_thigh:'Thigh',
    bio_skinfold_leg:'Calf',
    bio_peri_waist:'Waist',
    bio_peri_hip:'Hip',
    bio_peri_chest:'Chest',
    bio_peri_arm_r:'Arm R',
    bio_peri_arm_l:'Arm L',
    bio_peri_thigh_r:'Thigh R',
    bio_peri_thigh_l:'Thigh L',
    bio_peri_calf:'Calf',
    bio_peri_waist_abbr:'wst',
    bio_peri_hip_abbr:'hip',
    bio_peri_chest_abbr:'chs',

    // Salud module
    salud_title:'Health',
    salud_subtitle:'Records & wellness',
    salud_add:'+ Add',
    salud_tab_general:'General',
    salud_tab_sensitive:' Sensitive',
    salud_tab_checkins:' Check-ins',
    salud_no_records:'No records',
    salud_no_records_sub:'Add injuries, surgeries or relevant conditions.',
    salud_delete_title:'Delete record',
    salud_delete_confirm:'Delete this health record?',
    salud_deleted:'Record deleted',
    salud_active:'Active',
    salud_resolved:'Resolved',
    salud_affects_training:' Affects training:',
    salud_sensitive_lock:'Sensitive data protected',
    salud_sensitive_desc:'Only visible to the authorized administrator.',
    salud_request_access:'Request access',
    salud_access_requested:'Request sent to administrator',
    salud_authorized:' Authorized access',
    salud_no_sensitive:'No sensitive data',
    salud_add_sensitive:'+ Add',
    salud_checkin_view:'View data for',
    salud_my_checkins:'— My own check-ins —',
    salud_no_checkins:'No check-ins yet',
    salud_no_checkins_client:'has not completed any check-ins yet.',
    salud_no_checkins_own:'Complete your first daily check-in when opening the app.',
    salud_state:'Status:',
    salud_last_7:'Last 7 days ·',
    salud_mood:'Mood',
    salud_sleep:'Sleep',
    salud_hours:'Hours',
    salud_pain:'Pain',
    salud_pain_days:' days',
    salud_last_days:'Recent days',
    salud_mood_trend:'Mood trend (14 days)',
    salud_sleep_hours:'Sleep hours (14 days)',
    salud_average:'Average:',
    salud_per_night:'h/night',
    salud_pain_history:'Pain history',
    salud_no_location:'No location',
    salud_notes_anomalies:'Notes & anomalies',
    salud_state_good:'Good',
    salud_state_attention:'Attention',
    salud_state_alert:'Alert',
    salud_type:'Type',
    salud_title_label:'Title / Diagnosis',
    salud_title_placeholder:'e.g. Right bicep fiber tear',
    salud_date_label:'Date',
    salud_desc_label:'Description (optional)',
    salud_desc_placeholder:'Details, treatment, observations...',
    salud_currently_active:'Currently active?',
    salud_affects:'Affects training?',
    salud_training_notes_placeholder:'e.g. Avoid deadlifts, no more than 10kg...',
    salud_save:' Save',
    salud_saved:'Record saved',
    salud_title_required:'Please enter a title',
    salud_add_modal_general:' Health record',
    salud_add_modal_sensitive:' Sensitive data',
    salud_type_injury:'Injury',
    salud_type_fracture:'Fracture',
    salud_type_surgery:'Surgery',
    salud_type_prosthesis:'Prosthesis',
    salud_type_disease:'Disease',
    salud_type_allergy:'Allergy',
    salud_type_other:'Other',

    // Progreso module
    prog_title:'Progress',
    prog_subtitle:'Weekly photos & charts',
    prog_upload_btn:' Upload',
    prog_tab_photos:'Photos',
    prog_tab_compare:'Compare',
    prog_tab_charts:'Charts',
    prog_load:'Load',
    prog_apply:'Apply',
    prog_no_photo:'No photo',
    prog_start_date:'Start date',
    prog_end_date:'End date',
    prog_before:'Before',
    prog_after:'After',
    prog_upload_title:' Upload progress photos',
    prog_upload_date:'Date',
    prog_upload_hint:'Select up to 4 photos (Front, Left, Back, Right)',
    prog_save_photos:' Save photos',
    prog_uploading:'Uploading...',
    prog_uploaded:'Photos uploaded',
    prog_upload_error:'Error uploading photos',
    prog_change:'Change',
    prog_compare_error:'Error loading comparison',
    prog_chart_error:'Error loading charts',
    prog_angle_front:'Front',
    prog_angle_left:'Left side',
    prog_angle_back:'Back',
    prog_angle_right:'Right side',

    // Perfil module
    perfil_title:'Profile',
    perfil_edit:'',
    perfil_logout_icon:'',
    perfil_physical:'Physical data',
    perfil_height:'Height',
    perfil_weight_init:'Starting weight',
    perfil_goals_exp:'Goals & experience',
    perfil_exp_label:'Experience level',
    perfil_goals_label:'Sports goals',
    perfil_goals_placeholder:'e.g. Lose fat, build muscle, improve competition performance...',
    perfil_save:' Save changes',
    perfil_account:'Account',
    perfil_change_pass:'Change password',
    perfil_logout:'Sign out',
    perfil_logout_title:'Sign out',
    perfil_logout_confirm:'Are you sure you want to sign out?',
    perfil_logout_ok:'Yes, sign out',
    perfil_saved:'Profile updated',
    perfil_age:'years old',
    perfil_age_toast:'Age calculated: {age} years',
    perfil_pass_sent:'Recovery email sent',
    perfil_photo_updated:'Photo updated',
    perfil_photo_error:'Error uploading photo',
    perfil_name_label:'Full name',
    perfil_email_label:'Email',
    perfil_birth_label:'Date of birth',
    perfil_gender_label:'Gender',
    perfil_gender_select:'Select...',
    perfil_gender_male:'Male',
    perfil_gender_female:'Female',
    perfil_gender_other:'Other / Prefer not to say',
    perfil_exp_beginner:' Beginner',
    perfil_exp_intermediate:' Intermediate',
    perfil_exp_advanced:' Advanced',
    perfil_exp_elite:' Elite',
    perfil_user:'User',

    // Suscripcion module
    sub_title:'Subscription',
    sub_subtitle:'Choose your training plan',
    sub_active:'Active plan',
    sub_free_trial:'14-day free trial',
    sub_select:'Select',
    sub_current:' Current plan',
    sub_request:'Request info',
    sub_session:'Individual Session',
    sub_plans_title:'Plans & Services',
    sub_plans_subtitle:'High-performance solutions for businesses and professionals',
    sub_active_plan:'Active plan:',
    sub_active_desc:'Your subscription is active and up to date',
    sub_info_text:'Invest in high-level performance and health.',
    sub_info_text2:'Request info and we\'ll get in touch with you.',
    sub_per_month:'/ month',
    sub_per_session:'/ session',
    sub_single_service:'One-time service',
    sub_single_title:'Individual Session',
    sub_single_desc:'A personalized coaching session with a TGWL specialist. Ideal for initial assessment, goal review or an intensity session.',
    sub_no_subscription:'No subscription required',
    sub_60_min:'60 minutes',
    sub_online_or_in_person:'Online or in-person',
    sub_book:'Book session',
    sub_faq_title:'Frequently asked questions',
    sub_secure:' Secure payments with',
    sub_billing:'Monthly billing · VAT not included · No lock-in',
    sub_inquiry_title:'Request info —',
    sub_inquiry_desc:'Leave your contact details and a TGWL specialist will reach out within 24 hours to guide you on this plan.',
    sub_contact_email:'Contact email',
    sub_message_opt:'Message (optional)',
    sub_message_placeholder:'Briefly tell us about your goals or questions...',
    sub_send:'Send request',
    sub_sending:'Sending...',
    sub_sent_title:'Request sent!',
    sub_sent_desc:'We\'ve received your interest in the {name} plan. A TGWL specialist will contact you within 24 hours.',
    sub_no_commitment:'No commitment · Response within 24 h',
    sub_send_error:'Error sending request. Please try again.',
    sub_email_required:'Please enter a contact email',
    sub_book_title:' Book Individual Session',
    sub_book_what:'What would you like to work on? (optional)',
    sub_book_placeholder:'e.g. initial assessment, goal review, intensity session...',
    sub_book_confirm:'Confirm booking',
    sub_confirming:'Confirming...',
    sub_booked_title:'Booking received!',
    sub_booked_desc:'We\'ve registered your request. A TGWL specialist will confirm the appointment and send you all the details within 24 hours.',
    sub_book_no_commitment:'No commitment · Payment handled with the specialist',
    sub_book_error:'Error registering booking. Please try again.',

    // Suscripcion — plan features & extended keys
    sub_essential_desc:'Full access to training, nutrition, chat, and health tracking.',
    sub_pro_desc:'Everything in Essential plus a personal coach, progress photos, AI assistant, and priority support.',
    sub_elite_desc:'Full multidisciplinary team, unlimited sessions, and a comprehensive life plan.',
    sub_most_popular:'Most popular',
    sub_f_routines:'Training routines',
    sub_f_nutrition:'Nutrition tracking',
    sub_f_chat:'Specialist chat',
    sub_f_biomedidas:'Biometrics & health',
    sub_f_reports:'Progress reports',
    sub_f_coach:'Dedicated personal coach',
    sub_f_nutrition_plan:'Personalized nutrition plan',
    sub_f_ai:'AI assistant',
    sub_f_priority:'Priority support',
    sub_f_team:'Multidisciplinary team (basic)',
    sub_f_team_full:'Full multidisciplinary team',
    sub_f_unlimited:'Unlimited sessions',
    sub_f_247:'24/7 availability',
    sub_f_progress_photos:'Progress photos',
    sub_f_biomedical:'Advanced biomedical analysis',
    sub_f_life_plan:'Comprehensive life plan',
    sub_free_desc:'You are currently on the free plan.',
    sub_free_cta:'Choose a plan to unlock all features.',
    sub_active_plan:'Active plan',
    sub_current_plan:'Current plan',
    sub_request_info:'Request info',
    sub_stripe_secure:'Secure payments with',
    sub_billing_note:'Monthly billing · VAT not included · No lock-in',
    sub_one_time:'One-time service',
    sub_session_title:'Individual Session',
    sub_session_desc:'A personalized coaching session with a TGWL specialist. Ideal for an initial assessment, goal review, or an intensity session.',
    sub_book_session:'Book session',
    sub_session_coaching_note:'Personalized coaching · 60 min',
    sub_session_modal_desc:'Enter your details and preferences. A TGWL specialist will confirm the appointment and send you access information within 24 hours.',
    sub_faq_q1:'How does the onboarding process work?',
    sub_faq_a1:'After requesting information, a TGWL specialist contacts you within 24 hours for a diagnostic call. We define your goals, personalize the plan, and activate your access.',
    sub_faq_q2:'What sets the Elite plan apart from Pro?',
    sub_faq_a2:'Elite includes a full multidisciplinary team (doctor, physiotherapist, psychologist, and nutritionist), unlimited sessions, 24/7 availability, and an advanced biomedical analysis with a comprehensive life plan.',
    sub_faq_q3:'Are sessions in-person or online?',
    sub_faq_a3:'We offer both formats. The modality is agreed upon with your assigned specialist based on your availability and location.',
    sub_faq_q4:'Do prices include VAT?',
    sub_faq_a4:'Listed prices do not include VAT. Billing is monthly and you will receive a detailed invoice for business expense deduction.',
    sub_faq_q5:'Is there a minimum commitment or cancellation fee?',
    sub_faq_a5:'No lock-in period. You can pause or cancel your plan with 15 days\' notice before the next billing cycle at no additional cost.',
    sub_faq_q6:'Can I switch plans after signing up?',
    sub_faq_a6:'Yes. You can upgrade at any time. The change takes effect in the next billing cycle and we will notify you of the adjusted amount.',

    // Configuracion module
    settings_title:'Settings',
    settings_subtitle:'Customize your experience',
    appearance:'Appearance',
    dark_mode:'Dark mode',
    dark_mode_desc:'Dark theme for better contrast',
    muscle_map:'Muscle map',
    muscle_map_desc:'Show muscle map when finishing a workout',
    language:'Language',
    language_app:'App language',
    notifications:'Notifications',
    push_notif:'Push notifications',
    push_notif_desc:'Rest timer alerts and reminders',
    notif_status:'Permission status',
    notif_checking:'Checking...',
    notif_activate:'Enable',
    notif_granted:' Notifications enabled',
    notif_denied:' Permission denied — enable in browser settings',
    notif_pending:'Permission pending',
    notif_not_supported:'Not supported in this browser',
    notif_activated:'Notifications enabled!',
    notif_denied_toast:'Notification permission denied',
    notif_not_supported_toast:'Notifications not supported',
    screen:'Screen',
    keep_awake:'Keep screen awake',
    keep_awake_desc:'Prevents screen from turning off during workout',
    app:'App',
    install:'Install on device',
    install_desc:'Add TGWL to your home screen',
    clear_cache:'Clear cache',
    clear_cache_desc:'Removes temporarily stored data',
    about:'About',
    version:'Version',
    privacy:'Privacy policy',
    terms:'Terms of use',
    dark_mode_on:'Dark mode on',
    dark_mode_off:'Light mode on',
    muscle_map_on:'Muscle map enabled',
    muscle_map_off:'Muscle map disabled',
    wake_lock_on:'Screen stays on during workout',
    wake_lock_off:'Screen will turn off normally',
    install_fallback:'To install: share >"Add to Home Screen"',
    installed:'TGWL installed!',
    cache_cleared:'Cache cleared',
    cache_clear_error:'Could not clear cache',
    copyright:' 2024 All rights reserved',

    // Admin panel
    admin_title:'Admin Panel',
    admin_subtitle:'User & permission management',
    invite:'+ Invite',
    search_users:'Search by name or email...',
    all:'All',
    users:'Users',
    coaches:'Coaches',
    clients:'Clients',
    save:'Save',
    cancel:'Cancel',
    confirm:'Confirm',
    admin_stats_users:'Users',
    admin_stats_staff:'Staff',
    admin_stats_clients:'Clients',
    admin_no_users:'No users',
    admin_no_name:'No name',
    admin_change_role:'Change role',
    admin_role_confirm:'Change this user\'s role to"{role}"?',
    admin_role_updated:'Role updated to',
    admin_assign_coach:'Assign coach',
    admin_assign_medico:'Assigned doctor',
    admin_assign_fisio:'Assigned physiotherapist',
    admin_assign_psicologo:'Assigned psychologist',
    admin_assign_nutricionista:'Assigned nutritionist',
    admin_no_coach:'No coach assigned',
    admin_no_medico:'No doctor assigned',
    admin_no_fisio:'No physiotherapist assigned',
    admin_no_psicologo:'No psychologist assigned',
    admin_no_nutricionista:'No nutritionist assigned',
    admin_save_coach_btn:'Assign coach',
    admin_save_medico_btn:'Assign doctor',
    admin_save_fisio_btn:'Assign physiotherapist',
    admin_save_psicologo_btn:'Assign psychologist',
    admin_save_nutricionista_btn:'Assign nutritionist',
    admin_assigned_ok:'assigned',
    admin_routines_title:'Assigned routines',
    admin_assign_routine:' Assign new routine',
    admin_actions:'Actions',
    admin_grant_sensitive:' Grant sensitive data access',
    admin_revoke_access:' Revoke access',
    admin_sensitive_granted:'Sensitive data access granted',
    admin_revoke_title:'Revoke access',
    admin_revoke_confirm:'Revoke this user\'s access?',
    admin_revoked:'Access revoked',
    admin_no_routines:'No assigned routines',
    admin_delete_assign:'Remove',
    admin_delete_assign_title:'Remove assignment',
    admin_delete_assign_confirm:'Remove this assigned routine?',
    admin_assign_deleted:'Assignment removed',
    admin_assign_modal:' Assign routine',
    admin_assigning_to:'Assigning to:',
    admin_no_routines_created:'No routines created yet.',
    admin_new_routine:'Routine name...',
    admin_create_assign:'+ Create & assign',
    admin_routine_created:'Routine created and assigned',
    admin_name_required:'Enter a name',
    admin_invite_title:' Invite user',
    admin_invite_desc:'Generate an invitation link for the user to create their account.',
    admin_invite_email:'email@example.com',
    admin_generate:' Generate link',
    admin_invite_link:'Invitation link:',
    admin_copy_link:' Copy link',
    admin_email_link:' Send by email',
    admin_link_generated:'Invitation link generated',
    admin_link_copied:'Link copied to clipboard',
    admin_link_copied2:'Link copied',
    admin_generated_ok:' Link generated',
    admin_email_required:'Enter an email',
    admin_invite_error:'Error generating invitation',
    admin_exercises:'exercises',
    admin_or_create_routine:'Or create a new routine:',
    admin_invite_subject:'TGWL Invitation',
    admin_invite_body:'Hello,\n\nYou have been invited to join TGWL.\n\nClick the link below to create your account:\n{url}\n\nThis link is personal and non-transferable.\n\nBest regards,\nThe TGWL team',
    admin_routine_label:'Routine',
    admin_current_admins:'Current admins',
    admin_current_admins_desc:'The system allows a maximum of 3 administrators.',
    admin_no_admins:'No administrators registered.',
    admin_admin_limit_reached:'Limit reached: there are already 3 administrators. Revoke one before elevating another.',
    admin_elevate_confirm:'Elevate this user to administrator? This grants full system access.',
    admin_elevate_warning:'{n} of 3 admin slots remaining.',

    // Access blocked screen
    access_blocked_title:'Access Pending Activation',
    access_blocked_msg:"Your account is being reviewed by our team. You'll receive an email when your access is active.",
    access_view_plans:'View Plans',
    access_blocked_sub:'Already have an active subscription? Contact support.',

    // Invite modal — staff warning
    invite_staff_only_client:'As staff you can only invite clients. Admins can invite any role.',
    invite_role_locked:'Fixed role: Client',

    // Admin — Access Control
    admin_access_control:'Access Control',
    admin_access_status:'Access status',
    admin_access_granted_toggle:'Manually unlock access',
    admin_access_note_placeholder:'Note (e.g.: 30-day trial, January promo...)',
    admin_access_save_note:'Save note',
    admin_access_granted_by:'Unlocked by',
    admin_access_active_sub:' Active subscription',
    admin_access_manual_override:' Manual access (admin)',
    admin_access_none:' No access',
    admin_access_revoked:'Access revoked',
    admin_access_unlocked:'Access unlocked for {name}',
    admin_pending_title:'Pending Activation',
    admin_pending_desc:'Registered clients waiting for authorization to use the app.',
    admin_no_pending:'No clients pending activation',
    admin_grant_access:'Grant access',
    admin_pending_manual_note:'Manually activated by admin',
    admin_invite_sent:'Invitation sent',
    admin_invite_pending:'Waiting',
    admin_invite_approve:'✓ Approve',
    admin_invite_reject:'✗ Reject',
    admin_invite_approved:'Approved — will have access upon registration',
    admin_invite_rejected:'Invitation rejected',

    // Staff panel
    staff_client_view:'Client view →',
    staff_clients:'Clients',
    staff_sessions_week:'Sessions this week',
    staff_routines_mgmt:'Routine Management',
    staff_create_routine:'Create routine',
    staff_create_routine_desc:'Design a new training routine',
    staff_my_routines:'My routines',
    staff_my_routines_desc:'View, edit and assign created routines',
    staff_nutrition_mgmt:'Plan Management',
    staff_create_menu:'Create nutrition plan',
    staff_create_menu_desc:'Design a new weekly meal plan',
    staff_my_menus:'My plans',
    staff_my_menus_desc:'View, edit and assign created plans',
    staff_create_suppl:'Create supplement protocol',
    staff_create_suppl_desc:'New supplement protocol for a client',
    staff_my_suppls:'My protocols',
    staff_my_suppls_desc:'View, edit and assign created protocols',
    staff_suppl_mgmt:'Supplementation Management',
    staff_my_clients:'My Clients',
    staff_no_clients:'No assigned clients',
    staff_no_clients_sub:'The administrator will assign clients to you soon.',
    staff_last_session:'Last session:',
    staff_add_note:'+ Note',
    staff_chat:' Chat',
    staff_no_routines:'No routines assigned yet.',
    staff_assigned_date:'Assigned:',
    staff_assign_routine:' Assign routine',
    staff_no_routines_yet:'No routines created yet.',
    staff_health_title:'Health records',
    staff_health_desc:'Full records',
    staff_health_full:'Go to the client\'s Health module to view and edit their full history.',
    staff_diet_title:'Nutrition plan',
    staff_diet_desc:'Nutrition plan',
    staff_diet_full:'Go to the client\'s Nutrition module to manage their diet.',
    staff_note_title:'New note',
    staff_note_for:'For:',
    staff_note_placeholder:'Write your note here...',
    staff_save_note:' Save note',
    staff_note_saved:'Note saved',
    staff_note_empty:'Write something before saving',
    staff_note_error:'Error saving',
    staff_error_clients:'Error loading clients',
    staff_assigned_routine:'Assigned routines',
    staff_assign_new_routine:' Assign new routine',
    staff_error_routines:'Error loading routines',
    staff_routine_assigned:'Routine assigned',
    staff_no_notes:'No notes yet.',
    staff_psi_notes_title:'Psychological notes',
    staff_coach_title:'Coach Panel',
    staff_coach_subtitle:'Manage your clients and routines',
    staff_coach_action:'View routines',
    staff_medico_title:'Medical Panel',
    staff_medico_subtitle:'Health records of your patients',
    staff_medico_action:'View health records',
    staff_fisio_title:'Physiotherapy Panel',
    staff_fisio_subtitle:'Physiotherapeutic follow-up of your patients',
    staff_fisio_action:'View health records',
    staff_psicologo_title:'Psychology Panel',
    staff_psicologo_subtitle:'Psychological notes and follow-up',
    staff_psicologo_action:'View notes',
    staff_nutricionista_title:'Nutrition Panel',
    staff_nutricionista_subtitle:'Your clients\' nutrition plans',
    staff_nutricionista_action:'View diet',
    staff_client_label:'Client',

    // Routine creator
    rc_title:' New Routine',
    rc_name_label:'Routine name *',
    rc_name_placeholder:'e.g. Upper Body Strength A',
    rc_desc_label:'Description',
    rc_desc_placeholder:'Goal, general notes...',
    rc_tags_label:'Tags',
    rc_exercises_title:'Exercises',
    rc_add_exercise:'+ Add exercise',
    rc_assign_label:'Assign to client (optional)',
    rc_assign_auto:'Will be automatically assigned to the selected client',
    rc_no_assign:'— Unassigned —',
    rc_save:' Save routine',
    rc_saving:'Saving...',
    rc_saved:'Routine"{name}" saved and assigned',
    rc_saved_no_assign:'Routine"{name}" saved',
    rc_name_required:'Routine name is required',
    rc_exercises_required:'Add at least one exercise to the routine',
    rc_exercise_picker:'+ Add Exercise',
    rc_search_exercise:'Search exercise...',
    rc_all_muscles:'All',
    rc_no_results:'No results',
    rc_added:'added',
    rc_sets_label:'Sets',
    rc_reps_label:'Reps',
    rc_rest_label:'Rest (s)',
    rc_notes_placeholder:'Exercise notes...',
    rc_my_routines:' My Routines',
    rc_new_routine:'+ Create new routine',
    rc_no_routines:'No routines created',
    rc_no_routines_sub:'Press"Create new routine" to get started.',
    rc_created:'Created:',
    rc_assign_btn:'Assign to client',
    rc_delete_btn:'Delete routine',
    rc_delete_title:'Delete routine',
    rc_delete_confirm:'Delete the routine"{name}"? This action cannot be undone.',
    rc_deleted:'Routine deleted',
    rc_delete_error:'Error deleting',
    rc_assign_title:' Assign routine',
    rc_assign_to:'select the client',
    rc_no_clients:'You have no assigned clients.',
    rc_assign_ok:'Routine assigned to {name}',
    rc_assign_error:'Error assigning',
    rc_save_error:'Error saving',
    rc_load_error:'Error loading routines',
    rc_exercise_s:'exercise',
    rc_exercises_s:'exercises',
    rc_saved_assigned:'saved and assigned',
    rc_saved_plain:'saved',

    // Menu creator
    mc_title:' New Nutrition Plan',
    mc_name_label:'Plan name *',
    mc_name_placeholder:'e.g. Caloric deficit week 1',
    mc_desc_label:'Description / Goal',
    mc_desc_placeholder:'Plan goal, observations...',
    mc_macros_title:'Nutrition targets',
    mc_kcal:'Kcal/day',
    mc_protein:'Protein (g)',
    mc_carbs:'Carbohydrates (g)',
    mc_fat:'Fat (g)',
    mc_meals_title:'Daily meals',
    mc_add_slot:'+ Add meal',
    mc_assign_label:'Assign to client',
    mc_no_assign:'— Unassigned —',
    mc_save:' Save plan',
    mc_saving:'Saving…',
    mc_saved:'Plan saved',
    mc_name_required:'Plan name is required',
    mc_slot_required:'Add at least one meal',
    mc_food_name_required:'Enter the food name',
    mc_no_plans:'No plans created',
    mc_no_plans_sub:'Create your first nutrition plan.',
    mc_delete_title:'Delete plan',
    mc_delete_confirm:'Delete this nutrition plan? This action cannot be undone.',
    mc_deleted:'Plan deleted',
    mc_assign_plan:'Assign plan',
    mc_select_client:'Select client',
    mc_select_client_opt:'— Select a client —',
    mc_do_assign:'Assign plan',
    mc_assigned:'Plan assigned',
    mc_assign_select:'Select a client',
    mc_slot_food_placeholder:'Food (e.g. Cooked rice)',
    mc_slot_qty_placeholder:'Amount (100g)',
    mc_slot_notes_placeholder:'Notes for this meal...',
    mc_meals:'meal',
    mc_meals_plural:'meals',
    mc_badge_assigned:'Assigned',
    mc_badge_not_assigned:'Unassigned',
    mc_save_error:'Error saving',
    mc_slot_breakfast:'Breakfast',
    mc_slot_midmorning:'Mid-morning',
    mc_slot_lunch:'Lunch',
    mc_slot_snack:'Afternoon snack',
    mc_slot_dinner:'Dinner',
    mc_slot_preworkout:'Pre-workout',
    mc_slot_postworkout:'Post-workout',
    mc_slot_supplements_name:'Supplementation',

    // Supplement creator
    sc_title:' New Supplement Protocol',
    sc_name_label:'Protocol name *',
    sc_name_placeholder:'e.g. Bulking protocol',
    sc_desc_label:'Description / Goal',
    sc_desc_placeholder:'Protocol goal...',
    sc_suppl_title:'Supplements',
    sc_suggestions:'Suggestions:',
    sc_suppl_label:'Supplement *',
    sc_suppl_placeholder:'Name',
    sc_brand_label:'Brand',
    sc_brand_placeholder:'Optional',
    sc_dose_label:'Dose',
    sc_dose_placeholder:'e.g. 5g',
    sc_timing_label:'Timing',
    sc_instructions_placeholder:'Instructions (mix with water...)',
    sc_duration_placeholder:'Duration (e.g. 8 weeks, ongoing)',
    sc_add_suppl:'+ Add supplement',
    sc_notes_label:'General notes',
    sc_notes_placeholder:'Contraindications, tips...',
    sc_assign_label:'Assign to client',
    sc_no_assign:'— Unassigned —',
    sc_save:' Save protocol',
    sc_saving:'Saving…',
    sc_saved:'Protocol saved',
    sc_name_required:'Protocol name is required',
    sc_suppl_required:'Supplement name is required',
    sc_items_required:'Add at least one supplement',
    sc_no_protocols:'No protocols created',
    sc_no_protocols_sub:'Create your first supplement protocol.',
    sc_delete_title:'Delete protocol',
    sc_delete_confirm:'Delete this supplement protocol? This action cannot be undone.',
    sc_deleted:'Protocol deleted',
    sc_assign_protocol:'Assign protocol',
    sc_select_client:'Select client',
    sc_select_client_opt:'— Select a client —',
    sc_do_assign:'Assign protocol',
    sc_assigned:'Protocol assigned',
    sc_assign_select:'Select a client',
    sc_supplements:'supplement',
    sc_supplements_plural:'supplements',
    sc_badge_assigned:'Assigned',
    sc_badge_not_assigned:'Unassigned',
    sc_save_error:'Error saving',
    sc_timing_morning_fast:'Morning on empty stomach',
    sc_timing_with_breakfast:'With breakfast',
    sc_timing_preworkout:'Pre-workout (30min)',
    sc_timing_intra:'Intra-workout',
    sc_timing_postworkout:'Post-workout',
    sc_timing_with_lunch:'With lunch',
    sc_timing_with_dinner:'With dinner',
    sc_timing_before_sleep:'Before sleep',
    sc_timing_anytime:'Any time',

    // Direct chat
    dc_back:'← Back',
    dc_start_convo:'Start a conversation with',
    dc_placeholder:'Type a message...',

    // Specialist Hub
    sh_my_clients:'My clients',
    sh_search:'Search client...',
    sh_no_clients:'No assigned clients',
    sh_no_clients_sub:'The administrator will assign clients to you',
    sh_select_client:'Select a client to chat',
    sh_start_convo:'Start a conversation',
    sh_write_msg:'Type a message...',
    sh_client_info:'Client info',
    sh_stats:'Statistics',
    sh_actions:'Actions',
    sh_notes:'Private notes',
    sh_save_notes:'Save notes',
    sh_assign_routine:'Assign routine',
    sh_assign_diet:'Assign menu',
    sh_view_health:'View health history',
    sh_tab_clients:'Clients',
    sh_tab_chat:'Chat',
    sh_tab_info:'Info',
    sh_workouts:'Total workouts',
    sh_avg_rpe:'Avg RPE',
    sh_last_workout:'Last',

    // Subscription
    sub_active_badge:'sub_active',

    // General
    loading:'Loading...',
    error:'Error',
    success:'Success!',
    warning:'Warning',
    yes:'Yes',
    no:'No',
    close:'Close',
    delete:'Delete',
    edit:'Edit',
    view:'View',
    assign:'Assign',
    copy:'Copy',
    copied:'Copied!',
    share:'Share',
    add:'Add',
    name:'Name',
    client:'Client',
    no_name:'No name',

    route_home:'Home',
    route_entreno:'Training',
    route_alimentacion:'Nutrition',
    route_biomedidas:'Biometrics',
    route_salud:'Health',
    route_progreso:'Progress',
    route_perfil:'Profile',
    route_suscripcion:'Subscription',
    route_configuracion:'Settings',
    route_admin:'Admin',

    icon_entreno:'Training',
    icon_alimentacion:'Nutrition',
    icon_biomedidas:'Biometrics',
    icon_salud:'Health',
    icon_progreso:'Progress',
    icon_perfil:'Profile',
    icon_suscripcion:'Premium',
    icon_configuracion:'Settings',
    icon_admin:'Panel',

    // Roles
    role_cliente:'Client',
    role_atleta:'Athlete',
    role_coach:'Coach',
    role_medico:'Doctor',
    role_fisio:'Physiotherapist',
    role_psicologo:'Psychologist',
    role_nutricionista:'Nutritionist',
    role_admin:'Administrator',
  },
};

// Add roles to es too
translations.es.role_cliente       ='Cliente';
translations.es.role_atleta        ='Atleta';
translations.es.role_coach         ='Coach';
translations.es.role_medico        ='Médico';
translations.es.role_fisio         ='Fisioterapeuta';
translations.es.role_psicologo     ='Psicólogo';
translations.es.role_nutricionista ='Nutricionista';
translations.es.role_admin         ='Administrador';

// ── Alias keys (salud.js linter names) ──────────────────────────────────────
// ES aliases
translations.es.salud_record_deleted       = translations.es.salud_deleted;
translations.es.salud_sensitive_title      = translations.es.salud_sensitive_lock;
translations.es.salud_access_granted       = translations.es.salud_authorized;
translations.es.salud_view_data_of         = translations.es.salud_checkin_view;
translations.es.salud_no_checkins_staff    ='{name} no ha completado ningún check-in todavía.';
translations.es.salud_state_warning        = translations.es.salud_state_attention;
translations.es.salud_status              ='Estado';
translations.es.salud_last_7_days          ='Últimos 7 días';
translations.es.salud_days                ='días';
translations.es.salud_recent_days         = translations.es.salud_last_days;
translations.es.salud_avg                 ='Promedio';
translations.es.salud_sleep_hours_trend   = translations.es.salud_sleep_hours;
translations.es.salud_night               ='noche';
translations.es.salud_sensitive_record    = translations.es.salud_add_modal_sensitive;
translations.es.salud_health_record       = translations.es.salud_add_modal_general;
translations.es.salud_title_diagnosis     = translations.es.salud_title_label;
translations.es.salud_description_optional = translations.es.salud_desc_label;
translations.es.salud_description_placeholder = translations.es.salud_desc_placeholder;
translations.es.salud_affects_training_q  = translations.es.salud_affects;
translations.es.salud_type_illness        = translations.es.salud_type_disease;
translations.es.date                      ='Fecha';
translations.es.salud_record_saved        = translations.es.salud_saved;

// EN aliases
translations.en.salud_record_deleted       = translations.en.salud_deleted;
translations.en.salud_sensitive_title      = translations.en.salud_sensitive_lock;
translations.en.salud_access_granted       = translations.en.salud_authorized;
translations.en.salud_view_data_of         = translations.en.salud_checkin_view;
translations.en.salud_no_checkins_staff    ='{name} has not completed any check-ins yet.';
translations.en.salud_state_warning        = translations.en.salud_state_attention;
translations.en.salud_status              ='Status';
translations.en.salud_last_7_days          ='Last 7 days';
translations.en.salud_days                ='days';
translations.en.salud_recent_days         = translations.en.salud_last_days;
translations.en.salud_avg                 ='Average';
translations.en.salud_sleep_hours_trend   = translations.en.salud_sleep_hours;
translations.en.salud_night               ='night';
translations.en.salud_sensitive_record    = translations.en.salud_add_modal_sensitive;
translations.en.salud_health_record       = translations.en.salud_add_modal_general;
translations.en.salud_title_diagnosis     = translations.en.salud_title_label;
translations.en.salud_description_optional = translations.en.salud_desc_label;
translations.en.salud_description_placeholder = translations.en.salud_desc_placeholder;
translations.en.salud_affects_training_q  = translations.en.salud_affects;
translations.en.salud_type_illness        = translations.en.salud_type_disease;
translations.en.date                      ='Date';
translations.en.salud_record_saved        = translations.en.salud_saved;

// ── Alias keys (perfil.js names) ─────────────────────────────────────────────
// ES aliases
translations.es.perfil_full_name        = translations.es.perfil_name_label;
translations.es.perfil_email            = translations.es.perfil_email_label;
translations.es.perfil_birth_date       = translations.es.perfil_birth_label;
translations.es.perfil_gender           = translations.es.perfil_gender_label;
translations.es.perfil_select           = translations.es.perfil_gender_select;
translations.es.perfil_male             = translations.es.perfil_gender_male;
translations.es.perfil_female           = translations.es.perfil_gender_female;
translations.es.perfil_other_gender     = translations.es.perfil_gender_other;
translations.es.perfil_physical_data    = translations.es.perfil_physical;
translations.es.perfil_initial_weight   = translations.es.perfil_weight_init;
translations.es.perfil_goals_experience = translations.es.perfil_goals_exp;
translations.es.perfil_experience_level = translations.es.perfil_exp_label;
translations.es.perfil_beginner         ='Principiante';
translations.es.perfil_intermediate     ='Intermedio';
translations.es.perfil_advanced         ='Avanzado';
translations.es.perfil_elite            ='Élite';
translations.es.perfil_sports_goals     = translations.es.perfil_goals_label;
translations.es.perfil_save_changes     ='Guardar cambios';
translations.es.perfil_years_old        = translations.es.perfil_age;
translations.es.user                    = translations.es.perfil_user;
// EN aliases
translations.en.perfil_full_name        = translations.en.perfil_name_label;
translations.en.perfil_email            = translations.en.perfil_email_label;
translations.en.perfil_birth_date       = translations.en.perfil_birth_label;
translations.en.perfil_gender           = translations.en.perfil_gender_label;
translations.en.perfil_select           = translations.en.perfil_gender_select;
translations.en.perfil_male             = translations.en.perfil_gender_male;
translations.en.perfil_female           = translations.en.perfil_gender_female;
translations.en.perfil_other_gender     = translations.en.perfil_gender_other;
translations.en.perfil_physical_data    = translations.en.perfil_physical;
translations.en.perfil_initial_weight   = translations.en.perfil_weight_init;
translations.en.perfil_goals_experience = translations.en.perfil_goals_exp;
translations.en.perfil_experience_level = translations.en.perfil_exp_label;
translations.en.perfil_beginner         ='Beginner';
translations.en.perfil_intermediate     ='Intermediate';
translations.en.perfil_advanced         ='Advanced';
translations.en.perfil_elite            ='Elite';
translations.en.perfil_sports_goals     = translations.en.perfil_goals_label;
translations.en.perfil_save_changes     ='Save changes';
translations.en.perfil_years_old        = translations.en.perfil_age;
translations.en.user                    = translations.en.perfil_user;

// ── Alias keys (alimentacion.js names) ───────────────────────────────────────
// ES aliases
translations.es.alim_settings_title         ='Ajustes de nutrición';
translations.es.alim_wakeup                 = translations.es.alim_wake_up;
translations.es.alim_loading_supps          = translations.es.alim_loading_suppl;
translations.es.alim_5meals                 = translations.es.alim_5_meals;
translations.es.alim_toggle_meals           ='Cambiar número de comidas';
translations.es.alim_skipped                = translations.es.alim_meal_skipped_label;
translations.es.alim_what_ate               = translations.es.alim_meal_question;
translations.es.alim_foods_placeholder      = translations.es.alim_meal_placeholder;
translations.es.alim_skip_question          = translations.es.alim_meal_skipped;
translations.es.alim_skip_reason            = translations.es.alim_meal_why;
translations.es.alim_skip_reason_placeholder = translations.es.alim_meal_why_placeholder;
translations.es.alim_replacement            = translations.es.alim_meal_replacement;
translations.es.alim_replacement_placeholder = translations.es.alim_meal_replacement_placeholder;
translations.es.alim_assigned_menu          ='Menú asignado';
translations.es.alim_no_supps               = translations.es.alim_no_suppl;
translations.es.alim_check_supps            = translations.es.alim_consult_suppl;
translations.es.alim_see_supps              = translations.es.alim_see_suppl;
translations.es.alim_supplementation        ='Suplementación';
translations.es.alim_supps_disclaimer       = translations.es.alim_suppl_notice;
translations.es.supp_morning                ='Al despertar';
translations.es.supp_preworkout             ='Pre-entreno';
translations.es.supp_postworkout            ='Post-entreno';
translations.es.today                       ='Hoy';
translations.es.clear                       = translations.es.alim_meal_clear;
translations.es.error_loading               ='Error al cargar';
// EN aliases
translations.en.alim_settings_title         ='Nutrition settings';
translations.en.alim_wakeup                 = translations.en.alim_wake_up;
translations.en.alim_loading_supps          = translations.en.alim_loading_suppl;
translations.en.alim_5meals                 = translations.en.alim_5_meals;
translations.en.alim_toggle_meals           ='Toggle meal count';
translations.en.alim_skipped                = translations.en.alim_meal_skipped_label;
translations.en.alim_what_ate               = translations.en.alim_meal_question;
translations.en.alim_foods_placeholder      = translations.en.alim_meal_placeholder;
translations.en.alim_skip_question          = translations.en.alim_meal_skipped;
translations.en.alim_skip_reason            = translations.en.alim_meal_why;
translations.en.alim_skip_reason_placeholder = translations.en.alim_meal_why_placeholder;
translations.en.alim_replacement            = translations.en.alim_meal_replacement;
translations.en.alim_replacement_placeholder = translations.en.alim_meal_replacement_placeholder;
translations.en.alim_assigned_menu          ='Assigned menu';
translations.en.alim_no_supps               = translations.en.alim_no_suppl;
translations.en.alim_check_supps            = translations.en.alim_consult_suppl;
translations.en.alim_see_supps              = translations.en.alim_see_suppl;
translations.en.alim_supplementation        ='Supplementation';
translations.en.alim_supps_disclaimer       = translations.en.alim_suppl_notice;
translations.en.supp_morning                ='Upon waking';
translations.en.supp_preworkout             ='Pre-workout';
translations.en.supp_postworkout            ='Post-workout';
translations.en.today                       ='Today';
translations.en.clear                       = translations.en.alim_meal_clear;
translations.en.error_loading               ='Error loading';

// ── Alias keys (biomedidas.js names) ─────────────────────────────────────────
// ES aliases
translations.es.bio_add_measurements  ='Añadir medidas';
translations.es.bio_body_fat_pct      = translations.es.bio_fat_pct;
translations.es.bio_chest_abbr        = translations.es.bio_peri_chest_abbr;
translations.es.bio_height_cm         = translations.es.bio_height;
translations.es.bio_hip_abbr          = translations.es.bio_peri_hip_abbr;
translations.es.bio_index             = translations.es.bio_visceral_unit;
translations.es.bio_no_bio_data       = translations.es.bio_no_bio;
translations.es.bio_no_perim_data     = translations.es.bio_no_perimetrals;
translations.es.bio_no_skinfold_data  = translations.es.bio_no_skinfold;
translations.es.bio_p_arm_l           = translations.es.bio_peri_arm_l;
translations.es.bio_p_arm_r           = translations.es.bio_peri_arm_r;
translations.es.bio_p_calf            = translations.es.bio_peri_calf;
translations.es.bio_p_chest           = translations.es.bio_peri_chest;
translations.es.bio_p_hip             = translations.es.bio_peri_hip;
translations.es.bio_p_thigh_l         = translations.es.bio_peri_thigh_l;
translations.es.bio_p_thigh_r         = translations.es.bio_peri_thigh_r;
translations.es.bio_p_waist           = translations.es.bio_peri_waist;
translations.es.bio_sf_abdominal      = translations.es.bio_skinfold_abdominal;
translations.es.bio_sf_biceps         = translations.es.bio_skinfold_biceps;
translations.es.bio_sf_calf           = translations.es.bio_skinfold_leg;
translations.es.bio_sf_subscapular    = translations.es.bio_skinfold_subscapular;
translations.es.bio_sf_supraspinal    = translations.es.bio_skinfold_supraspinal;
translations.es.bio_sf_thigh          = translations.es.bio_skinfold_thigh;
translations.es.bio_sf_triceps        = translations.es.bio_skinfold_triceps;
translations.es.bio_tab_skinfolds     = translations.es.bio_tab_skinfold;
translations.es.bio_visceral_fat      = translations.es.bio_visceral;
translations.es.bio_waist_abbr        = translations.es.bio_peri_waist_abbr;
translations.es.bio_weight_kg         = translations.es.bio_weight_label;
// EN aliases
translations.en.bio_add_measurements  ='Add measurements';
translations.en.bio_body_fat_pct      = translations.en.bio_fat_pct;
translations.en.bio_chest_abbr        = translations.en.bio_peri_chest_abbr;
translations.en.bio_height_cm         = translations.en.bio_height;
translations.en.bio_hip_abbr          = translations.en.bio_peri_hip_abbr;
translations.en.bio_index             = translations.en.bio_visceral_unit;
translations.en.bio_no_bio_data       = translations.en.bio_no_bio;
translations.en.bio_no_perim_data     = translations.en.bio_no_perimetrals;
translations.en.bio_no_skinfold_data  = translations.en.bio_no_skinfold;
translations.en.bio_p_arm_l           = translations.en.bio_peri_arm_l;
translations.en.bio_p_arm_r           = translations.en.bio_peri_arm_r;
translations.en.bio_p_calf            = translations.en.bio_peri_calf;
translations.en.bio_p_chest           = translations.en.bio_peri_chest;
translations.en.bio_p_hip             = translations.en.bio_peri_hip;
translations.en.bio_p_thigh_l         = translations.en.bio_peri_thigh_l;
translations.en.bio_p_thigh_r         = translations.en.bio_peri_thigh_r;
translations.en.bio_p_waist           = translations.en.bio_peri_waist;
translations.en.bio_sf_abdominal      = translations.en.bio_skinfold_abdominal;
translations.en.bio_sf_biceps         = translations.en.bio_skinfold_biceps;
translations.en.bio_sf_calf           = translations.en.bio_skinfold_leg;
translations.en.bio_sf_subscapular    = translations.en.bio_skinfold_subscapular;
translations.en.bio_sf_supraspinal    = translations.en.bio_skinfold_supraspinal;
translations.en.bio_sf_thigh          = translations.en.bio_skinfold_thigh;
translations.en.bio_sf_triceps        = translations.en.bio_skinfold_triceps;
translations.en.bio_tab_skinfolds     = translations.en.bio_tab_skinfold;
translations.en.bio_visceral_fat      = translations.en.bio_visceral;
translations.en.bio_waist_abbr        = translations.en.bio_peri_waist_abbr;
translations.en.bio_weight_kg         = translations.en.bio_weight_label;

// ── Alias keys (entreno.js names) ────────────────────────────────────────────
// ES aliases
translations.es.entreno_alternatives_for       = translations.es.entreno_swap_alts;
translations.es.entreno_completed              ='¡Entreno completado!';
translations.es.entreno_confirm_swap           = translations.es.entreno_swap_confirm;
translations.es.entreno_exercises_count        = translations.es.entreno_exercises_badge;
translations.es.entreno_exercises_label        = translations.es.entreno_exercises_badge;
translations.es.entreno_general_note           ='Nota general del entreno';
translations.es.entreno_general_note_placeholder = translations.es.entreno_note_prompt;
translations.es.entreno_history                ='Historial';
translations.es.entreno_incident_note          ='Nota de incidencia';
translations.es.entreno_incident_placeholder   = translations.es.entreno_note_prompt;
translations.es.entreno_incidents              = translations.es.entreno_incidences;
translations.es.entreno_muscles_worked         = translations.es.entreno_muscles;
translations.es.entreno_no_muscle_data         = translations.es.entreno_no_muscles;
translations.es.entreno_no_sessions            = translations.es.entreno_no_history;
translations.es.entreno_no_sessions_sub        = translations.es.entreno_no_history_sub;
translations.es.entreno_notes                  ='Notas';
translations.es.entreno_set                    = translations.es.entreno_set_header;
translations.es.entreno_sets_count             = translations.es.entreno_sets;
translations.es.entreno_sets_performed         = translations.es.entreno_sets_done;
translations.es.entreno_show_muscle_map        = translations.es.entreno_show_map;
translations.es.entreno_start_first            = translations.es.entreno_start_first_info;
translations.es.entreno_swap_exercise          ='Cambiar ejercicio';
translations.es.entreno_swap_reason_placeholder ='Ej: Dolor en la articulación, no tengo el material...';
translations.es.entreno_swapped_to             = translations.es.entreno_swap_done;
translations.es.entreno_watch_exercise         ='Ver ejercicio';
// EN aliases
translations.en.entreno_alternatives_for       = translations.en.entreno_swap_alts;
translations.en.entreno_completed              ='Workout complete!';
translations.en.entreno_confirm_swap           = translations.en.entreno_swap_confirm;
translations.en.entreno_exercises_count        = translations.en.entreno_exercises_badge;
translations.en.entreno_exercises_label        = translations.en.entreno_exercises_badge;
translations.en.entreno_general_note           ='General workout note';
translations.en.entreno_general_note_placeholder = translations.en.entreno_note_prompt;
translations.en.entreno_history                ='History';
translations.en.entreno_incident_note          ='Incident note';
translations.en.entreno_incident_placeholder   = translations.en.entreno_note_prompt;
translations.en.entreno_incidents              = translations.en.entreno_incidences;
translations.en.entreno_muscles_worked         = translations.en.entreno_muscles;
translations.en.entreno_no_muscle_data         = translations.en.entreno_no_muscles;
translations.en.entreno_no_sessions            = translations.en.entreno_no_history;
translations.en.entreno_no_sessions_sub        = translations.en.entreno_no_history_sub;
translations.en.entreno_notes                  ='Notes';
translations.en.entreno_set                    = translations.en.entreno_set_header;
translations.en.entreno_sets_count             = translations.en.entreno_sets;
translations.en.entreno_sets_performed         = translations.en.entreno_sets_done;
translations.en.entreno_show_muscle_map        = translations.en.entreno_show_map;
translations.en.entreno_start_first            = translations.en.entreno_start_first_info;
translations.en.entreno_swap_exercise          ='Swap exercise';
translations.en.entreno_swap_reason_placeholder ='e.g. Joint pain, missing equipment...';
translations.en.entreno_swapped_to             = translations.en.entreno_swap_done;
translations.en.entreno_watch_exercise         ='Watch exercise';
// Dropset
translations.es.entreno_add_drop               ='DROP';
translations.es.entreno_dropset_label          ='DROPSET';
translations.es.entreno_remove_drop            ='Eliminar dropset';
translations.en.entreno_add_drop               ='DROP';
translations.en.entreno_dropset_label          ='DROPSET';
translations.en.entreno_remove_drop            ='Remove dropset';

// ── Alias keys (progreso.js / perfil.js / general) ───────────────────────────
// ES aliases
translations.es.apply                  = translations.es.bio_apply;
translations.es.change                 ='Cambiar';
translations.es.error_saving           ='Error al guardar';
translations.es.greeting               ='Hola';
translations.es.load                   ='Cargar';
translations.es.not_authenticated      = translations.es.entreno_no_auth;
translations.es.note_saved             = translations.es.entreno_note_saved;
translations.es.settings               = translations.es.settings_title;
translations.es.perfil_age_calculated  = translations.es.perfil_age_toast;
translations.es.perfil_change_password = translations.es.perfil_change_pass;
translations.es.perfil_reset_email_sent = translations.es.perfil_pass_sent;
translations.es.perfil_updated         = translations.es.perfil_saved;
translations.es.prog_charts_error      = translations.es.prog_chart_error;
translations.es.prog_comparison_error  = translations.es.prog_compare_error;
translations.es.prog_photos_saved      = translations.es.prog_uploaded;
translations.es.prog_upload            ='Subir fotos';
translations.es.supp_anytime           ='En cualquier momento';
// EN aliases
translations.en.apply                  = translations.en.bio_apply;
translations.en.change                 ='Change';
translations.en.error_saving           ='Error saving';
translations.en.greeting               ='Hello';
translations.en.load                   ='Load';
translations.en.not_authenticated      = translations.en.entreno_no_auth;
translations.en.note_saved             = translations.en.entreno_note_saved;
translations.en.settings               = translations.en.settings_title;
translations.en.perfil_age_calculated  = translations.en.perfil_age_toast;
translations.en.perfil_change_password = translations.en.perfil_change_pass;
translations.en.perfil_reset_email_sent = translations.en.perfil_pass_sent;
translations.en.perfil_updated         = translations.en.perfil_saved;
translations.en.prog_charts_error      = translations.en.prog_chart_error;
translations.en.prog_comparison_error  = translations.en.prog_compare_error;
translations.en.prog_photos_saved      = translations.en.prog_uploaded;
translations.en.prog_upload            ='Upload photos';
translations.en.supp_anytime           ='Any time';

let _lang ='es';

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
    if (el.tagName ==='INPUT' || el.tagName ==='TEXTAREA') {
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
export function initI18n(lang ='es') {
  _lang = lang ||'es';
  document.documentElement.lang = _lang;
}
