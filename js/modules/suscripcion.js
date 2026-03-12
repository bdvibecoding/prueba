/* ═══════════════════════════════════════════════
   TGWL — modules/suscripcion.js
   Subscription & Billing Module — Business Edition
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, timestamp } from '../firebase-config.js';
import { toast } from '../utils.js';
import { openModal, closeModal, alert } from '../components/modal.js';

const PLANS = [
  {
    id:          'essential',
    name:        'Essential',
    price:       400,
    period:      'mes',
    badge:       null,
    description: 'Para profesionales que buscan resultados',
    features:    [
      { label: 'Rutinas personalizadas',      included: true },
      { label: 'Seguimiento nutricional',     included: true },
      { label: 'Chat con especialistas',      included: true },
      { label: 'Biomedidas completas',        included: true },
      { label: 'Reportes mensuales',          included: true },
      { label: 'Coach personal dedicado',     included: false },
      { label: 'Plan de nutrición personalizado', included: false },
      { label: 'Análisis avanzado IA',        included: false },
      { label: 'Acceso prioritario',          included: false },
      { label: 'Equipo multidisciplinar',     included: false },
      { label: 'Sesiones ilimitadas',         included: false },
      { label: 'Disponibilidad 24/7',         included: false },
    ],
    gradientBorder: 'linear-gradient(135deg, rgba(107,114,128,0.7), rgba(75,85,99,0.4))',
    glowColor:      'rgba(107,114,128,0.15)',
    accentColor:    '#9CA3AF',
  },
  {
    id:          'pro',
    name:        'Pro',
    price:       600,
    period:      'mes',
    badge:       'MÁS POPULAR',
    description: 'La experiencia TGWL completa',
    features:    [
      { label: 'Rutinas personalizadas',          included: true },
      { label: 'Seguimiento nutricional',         included: true },
      { label: 'Chat con especialistas',          included: true },
      { label: 'Biomedidas completas',            included: true },
      { label: 'Reportes mensuales',              included: true },
      { label: 'Coach personal dedicado',         included: true },
      { label: 'Fotos de progreso',               included: true },
      { label: 'Plan de nutrición personalizado', included: true },
      { label: 'Análisis avanzado IA',            included: true },
      { label: 'Acceso prioritario',              included: true },
      { label: 'Equipo multidisciplinar',         included: false },
      { label: 'Sesiones ilimitadas',             included: false },
    ],
    gradientBorder: 'linear-gradient(135deg, rgba(148,10,10,0.9), rgba(220,38,38,0.5))',
    glowColor:      'rgba(148,10,10,0.2)',
    accentColor:    '#EF4444',
  },
  {
    id:          'elite',
    name:        'Elite',
    price:       800,
    period:      'mes',
    badge:       null,
    description: 'Sin límites. Sin excusas. Solo resultados.',
    features:    [
      { label: 'Rutinas personalizadas',          included: true },
      { label: 'Seguimiento nutricional',         included: true },
      { label: 'Chat con especialistas',          included: true },
      { label: 'Biomedidas completas',            included: true },
      { label: 'Reportes mensuales',              included: true },
      { label: 'Coach personal dedicado',         included: true },
      { label: 'Plan de nutrición personalizado', included: true },
      { label: 'Análisis avanzado IA',            included: true },
      { label: 'Acceso prioritario',              included: true },
      { label: 'Equipo multidisciplinar (médico, fisio, psicólogo, nutricionista)', included: true },
      { label: 'Sesiones ilimitadas',             included: true },
      { label: 'Disponibilidad 24/7',             included: true },
      { label: 'Análisis biomédico completo',     included: true },
      { label: 'Plan de vida integral',           included: true },
    ],
    gradientBorder: 'linear-gradient(135deg, rgba(25,249,249,0.7), rgba(6,182,212,0.4))',
    glowColor:      'rgba(25,249,249,0.1)',
    accentColor:    '#22D3EE',
  },
];

export async function render(container) {
  const profile     = getUserProfile();
  const currentPlan = profile?.subscriptionStatus || 'free';

  container.innerHTML = `
    <div class="page active" id="suscripcion-page">
      <div style="padding:var(--page-pad)">

        <!-- Header -->
        <div class="page-header">
          <div>
            <h2 class="page-title" style="font-size:clamp(22px,5vw,28px);font-weight:900;letter-spacing:-0.5px">
              Planes &amp; Servicios
            </h2>
            <p class="page-subtitle" style="font-size:14px;color:var(--color-text-muted)">
              Soluciones de alto rendimiento para empresas y profesionales
            </p>
          </div>
        </div>

        <!-- Active plan banner -->
        ${currentPlan !== 'free' ? `
          <div class="glass-card glass-card-cyan"
               style="padding:var(--space-md);margin-bottom:var(--space-lg);
                      display:flex;align-items:center;gap:var(--space-md)">
            <span style="font-size:28px">✅</span>
            <div>
              <div style="font-weight:700">Plan activo: ${capitalizeFirst(currentPlan)}</div>
              <div class="text-muted">Tu suscripción está activa y al corriente</div>
            </div>
          </div>
        ` : `
          <div class="glass-card"
               style="padding:var(--space-md);margin-bottom:var(--space-lg);
                      text-align:center;border:1px solid rgba(255,255,255,0.07)">
            <p style="font-size:14px;line-height:1.7;color:var(--color-text-muted)">
              Inversión en rendimiento y salud de alto nivel.<br>
              <strong style="color:var(--white)">Solicita información y nos ponemos en contacto contigo.</strong>
            </p>
          </div>
        `}

        <!-- Plans grid -->
        <div style="display:flex;flex-direction:column;gap:var(--space-lg)" id="plans-grid">
          ${PLANS.map(plan => buildPlanCard(plan, currentPlan)).join('')}
        </div>

        <!-- Sesión Individual -->
        ${buildSingleSessionCard()}

        <!-- Stripe badge -->
        <div style="text-align:center;margin-top:var(--space-xl)">
          <div class="stripe-secure">
            🔒 <span>Pagos seguros con</span>
            <strong style="color:#635BFF">Stripe</strong>
          </div>
          <p class="text-muted" style="margin-top:var(--space-sm);font-size:11px">
            Facturación mensual · IVA no incluido · Sin permanencia
          </p>
        </div>

        <!-- FAQ -->
        <div style="margin-top:var(--space-xl)">
          <div class="section-title" style="margin-bottom:var(--space-md)">Preguntas frecuentes</div>
          <div class="glass-card" style="padding:0">
            ${buildFAQ()}
          </div>
        </div>

      </div>
    </div>
  `;
}

export async function init(container) {
  // Plan subscription cards
  container.querySelectorAll('.pack-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.pack-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      openInquiryModal(card.dataset.planId);
    });
  });

  // Single session button
  const btnSession = container.querySelector('#btn-reservar-sesion');
  if (btnSession) {
    btnSession.addEventListener('click', () => openSessionModal());
  }

  // FAQ accordion
  container.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isOpen = item.classList.contains('open');
      container.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ── Plan Card ──────────────────────────────────
function buildPlanCard(plan, current) {
  const isActive = current === plan.id;
  const isPro    = plan.id === 'pro';

  const cardStyle = [
    `background:${plan.glowColor}`,
    `border:1px solid transparent`,
    `border-radius:16px`,
    `padding:var(--space-lg)`,
    `position:relative`,
    `overflow:hidden`,
    isPro ? `box-shadow:0 0 40px ${plan.glowColor},0 8px 32px rgba(0,0,0,0.4)` : `box-shadow:0 4px 24px rgba(0,0,0,0.3)`,
  ].join(';');

  // Gradient border via pseudo-approach using wrapper
  return `
    <div style="position:relative;border-radius:16px;padding:1px;background:${plan.gradientBorder};
                ${isPro ? 'box-shadow:0 0 48px ' + plan.glowColor + ',0 0 80px rgba(148,10,10,0.15)' : ''}">
      <div class="pack-card ${isActive ? 'selected' : ''}" data-plan-id="${plan.id}"
           style="${cardStyle};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
                  background:rgba(10,10,10,0.75)">

        ${isPro ? `
          <div style="position:absolute;top:0;right:0;background:${plan.accentColor};
                      color:#fff;font-size:10px;font-weight:900;letter-spacing:1.5px;
                      padding:5px 14px;border-radius:0 14px 0 10px;text-transform:uppercase">
            ${plan.badge}
          </div>
        ` : ''}

        <!-- Plan name & description -->
        <div style="margin-bottom:var(--space-md)">
          <h3 style="font-size:24px;font-weight:900;color:${plan.accentColor};
                     letter-spacing:-0.5px;margin-bottom:4px">${plan.name}</h3>
          <p style="font-size:13px;color:var(--color-text-muted);line-height:1.4">${plan.description}</p>
        </div>

        <!-- Price -->
        <div style="display:flex;align-items:flex-end;gap:4px;margin-bottom:var(--space-lg)">
          <span style="font-size:13px;font-weight:600;color:var(--color-text-muted);
                       margin-bottom:8px">€</span>
          <span style="font-size:46px;font-weight:900;line-height:1;color:var(--white)">
            ${plan.price.toLocaleString('es-ES')}
          </span>
          <span style="font-size:13px;color:var(--color-text-muted);margin-bottom:8px">/ mes</span>
        </div>

        <!-- Feature list -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:var(--space-lg)">
          ${plan.features.map(f => `
            <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.4">
              <span style="font-size:14px;font-weight:700;flex-shrink:0;margin-top:1px;
                           color:${f.included ? '#22C55E' : 'rgba(107,114,128,0.6)'}">
                ${f.included ? '✓' : '×'}
              </span>
              <span style="color:${f.included ? 'var(--color-text)' : 'rgba(107,114,128,0.5)'}">
                ${f.label}
              </span>
            </div>
          `).join('')}
        </div>

        <!-- CTA button -->
        <button class="btn-${isActive ? 'secondary' : 'primary'} btn-full"
                style="pointer-events:none;font-weight:700;letter-spacing:0.5px;
                       ${isPro && !isActive ? 'background:' + plan.accentColor + ';border-color:' + plan.accentColor : ''}">
          ${isActive ? '✅ Plan actual' : 'Solicitar información'}
        </button>

      </div>
    </div>
  `;
}

// ── Single Session Card ─────────────────────────
function buildSingleSessionCard() {
  return `
    <div style="margin-top:var(--space-xl)">
      <div class="section-title" style="margin-bottom:var(--space-md);font-size:12px;
                                        letter-spacing:1px;text-transform:uppercase;
                                        color:var(--color-text-muted)">
        Servicio puntual
      </div>

      <div style="position:relative;border-radius:16px;padding:1px;
                  background:linear-gradient(135deg,rgba(250,204,21,0.6),rgba(234,179,8,0.3))">
        <div style="background:rgba(10,10,10,0.85);border-radius:15px;padding:var(--space-lg);
                    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">

          <div style="display:flex;align-items:center;justify-content:space-between;
                      flex-wrap:wrap;gap:var(--space-md)">

            <!-- Left: info -->
            <div style="flex:1;min-width:200px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:22px">🎯</span>
                <h3 style="font-size:20px;font-weight:900;color:#FACC15;letter-spacing:-0.3px">
                  Sesión Individual
                </h3>
              </div>
              <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;
                        max-width:340px">
                Una sesión de coaching personalizado con un especialista TGWL.
                Ideal para evaluación inicial, revisión de objetivos o sesión de intensidad.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:var(--space-sm)">
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:20px;
                             padding:3px 10px;color:#FACC15">Sin suscripción</span>
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:20px;
                             padding:3px 10px;color:#FACC15">60 minutos</span>
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:20px;
                             padding:3px 10px;color:#FACC15">Online o presencial</span>
              </div>
            </div>

            <!-- Right: price + CTA -->
            <div style="display:flex;flex-direction:column;align-items:center;
                        gap:var(--space-sm);text-align:center">
              <div style="display:flex;align-items:flex-end;gap:4px">
                <span style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">€</span>
                <span style="font-size:42px;font-weight:900;line-height:1;color:#FACC15">80</span>
                <span style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">/ sesión</span>
              </div>
              <button class="btn-primary btn-full" id="btn-reservar-sesion"
                      style="background:rgba(250,204,21,0.15);border:1px solid rgba(250,204,21,0.5);
                             color:#FACC15;font-weight:700;letter-spacing:0.5px;
                             min-width:180px;white-space:nowrap">
                Reservar sesión
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Inquiry Modal (plan) ───────────────────────
function openInquiryModal(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const profile = getUserProfile();

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">Solicitar información — ${plan.name}</h3>
      <button class="modal-close">✕</button>
    </div>

    <div style="padding:1px;border-radius:12px;
                background:${plan.gradientBorder};margin-bottom:var(--space-md)">
      <div style="background:rgba(10,10,10,0.9);border-radius:11px;
                  padding:var(--space-md);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;font-size:16px;color:${plan.accentColor}">${plan.name}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">${plan.description}</div>
        </div>
        <div style="font-size:24px;font-weight:900;color:var(--white)">
          €${plan.price.toLocaleString('es-ES')}
          <span style="font-size:12px;font-weight:400;color:var(--color-text-muted)">/mes</span>
        </div>
      </div>
    </div>

    <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;margin-bottom:var(--space-md)">
      Déjanos tus datos de contacto y un especialista TGWL se pondrá en contacto contigo
      en menos de 24 horas para orientarte sobre este plan.
    </p>

    <div class="form-row" style="margin-bottom:var(--space-sm)">
      <label class="field-label">Email de contacto</label>
      <input type="email" id="inquiry-email" class="stripe-input"
             placeholder="${profile?.email || 'tu@empresa.com'}"
             value="${profile?.email || ''}"
             style="width:100%;margin-top:4px">
    </div>

    <div class="form-row" style="margin-bottom:var(--space-md)">
      <label class="field-label">Mensaje (opcional)</label>
      <textarea id="inquiry-message" class="stripe-input"
                placeholder="Cuéntanos brevemente tus objetivos o consultas..."
                style="width:100%;margin-top:4px;height:80px;resize:none"></textarea>
    </div>

    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-secondary btn-full" id="btn-cancel-inquiry">Cancelar</button>
      <button class="btn-primary btn-full" id="btn-send-inquiry"
              style="font-weight:700">
        Enviar solicitud
      </button>
    </div>
    <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-sm)">
      Sin compromiso · Respuesta en menos de 24 h
    </p>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  modal.querySelector('#btn-cancel-inquiry')?.addEventListener('click', closeModal);
  modal.querySelector('#btn-send-inquiry')?.addEventListener('click', () => sendInquiry(plan, profile));
}

// ── Session Reservation Modal ─────────────────
function openSessionModal() {
  const profile = getUserProfile();

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🎯 Reservar Sesión Individual</h3>
      <button class="modal-close">✕</button>
    </div>

    <div style="padding:1px;border-radius:12px;
                background:linear-gradient(135deg,rgba(250,204,21,0.6),rgba(234,179,8,0.3));
                margin-bottom:var(--space-md)">
      <div style="background:rgba(10,10,10,0.9);border-radius:11px;
                  padding:var(--space-md);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;font-size:16px;color:#FACC15">Sesión Individual</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">
            Coaching personalizado · 60 min
          </div>
        </div>
        <div style="font-size:24px;font-weight:900;color:#FACC15">
          €80
          <span style="font-size:12px;font-weight:400;color:var(--color-text-muted)">/sesión</span>
        </div>
      </div>
    </div>

    <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;margin-bottom:var(--space-md)">
      Indica tus datos y preferencias. Un especialista TGWL confirmará la cita
      y te enviará el acceso en menos de 24 horas.
    </p>

    <div class="form-row" style="margin-bottom:var(--space-sm)">
      <label class="field-label">Email de contacto</label>
      <input type="email" id="session-email" class="stripe-input"
             placeholder="${profile?.email || 'tu@empresa.com'}"
             value="${profile?.email || ''}"
             style="width:100%;margin-top:4px">
    </div>

    <div class="form-row" style="margin-bottom:var(--space-md)">
      <label class="field-label">¿En qué quieres trabajar? (opcional)</label>
      <textarea id="session-notes" class="stripe-input"
                placeholder="Ej: evaluación inicial, revisión de objetivos, sesión de intensidad..."
                style="width:100%;margin-top:4px;height:80px;resize:none"></textarea>
    </div>

    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-secondary btn-full" id="btn-cancel-session">Cancelar</button>
      <button class="btn-primary btn-full" id="btn-confirm-session"
              style="background:rgba(250,204,21,0.15);border:1px solid rgba(250,204,21,0.5);
                     color:#FACC15;font-weight:700">
        Confirmar reserva
      </button>
    </div>
    <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-sm)">
      Sin compromiso · El pago se gestiona con el especialista
    </p>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  modal.querySelector('#btn-cancel-session')?.addEventListener('click', closeModal);
  modal.querySelector('#btn-confirm-session')?.addEventListener('click', () => saveSessionIntent(profile));
}

// ── Save Plan Inquiry to Firestore ────────────
async function sendInquiry(plan, profile) {
  const modal = document.getElementById('modal-content');
  const btn   = modal?.querySelector('#btn-send-inquiry');
  if (!btn) return;

  const emailInput = modal.querySelector('#inquiry-email');
  const email      = emailInput?.value?.trim() || profile?.email || '';

  if (!email) {
    toast('Por favor, introduce un email de contacto', 'error');
    emailInput?.focus();
    return;
  }

  btn.textContent = 'Enviando...';
  btn.disabled    = true;

  try {
    await db.collection('inquiries').add({
      uid:       profile?.uid   || null,
      planId:    plan.id,
      planName:  plan.name,
      email,
      message:   modal.querySelector('#inquiry-message')?.value?.trim() || '',
      timestamp: timestamp(),
      status:    'pending',
      type:      'subscription',
    });

    closeModal();
    await alert(
      '¡Solicitud enviada!',
      `Hemos recibido tu interés en el plan ${plan.name}. Un especialista TGWL se pondrá en contacto contigo en menos de 24 horas.`,
      'success'
    );
  } catch (e) {
    toast('Error al enviar la solicitud. Inténtalo de nuevo.', 'error');
    btn.textContent = 'Enviar solicitud';
    btn.disabled    = false;
  }
}

// ── Save Session Intent to Firestore ─────────
async function saveSessionIntent(profile) {
  const modal = document.getElementById('modal-content');
  const btn   = modal?.querySelector('#btn-confirm-session');
  if (!btn) return;

  const emailInput = modal.querySelector('#session-email');
  const email      = emailInput?.value?.trim() || profile?.email || '';

  if (!email) {
    toast('Por favor, introduce un email de contacto', 'error');
    emailInput?.focus();
    return;
  }

  btn.textContent = 'Confirmando...';
  btn.disabled    = true;

  try {
    await db.collection('inquiries').add({
      uid:       profile?.uid  || null,
      planId:    'single-session',
      planName:  'Sesión Individual',
      email,
      notes:     modal.querySelector('#session-notes')?.value?.trim() || '',
      timestamp: timestamp(),
      status:    'pending',
      type:      'session',
    });

    closeModal();
    await alert(
      '¡Reserva recibida!',
      'Hemos registrado tu solicitud. Un especialista TGWL confirmará la cita y te enviará todos los detalles en menos de 24 horas.',
      'success'
    );
  } catch (e) {
    toast('Error al registrar la reserva. Inténtalo de nuevo.', 'error');
    btn.textContent = 'Confirmar reserva';
    btn.disabled    = false;
  }
}

// ── FAQ ───────────────────────────────────────
function buildFAQ() {
  const faqs = [
    {
      q: '¿Cómo funciona el proceso de incorporación?',
      a: 'Tras solicitar información, un especialista TGWL te contacta en menos de 24 horas para una llamada de diagnóstico. Definimos tus objetivos, personalizamos el plan y activamos el acceso.',
    },
    {
      q: '¿Qué diferencia al plan Elite del Pro?',
      a: 'Elite incluye un equipo multidisciplinar completo (médico, fisioterapeuta, psicólogo y nutricionista), sesiones ilimitadas, disponibilidad 24/7 y un análisis biomédico avanzado con plan de vida integral.',
    },
    {
      q: '¿Las sesiones son presenciales u online?',
      a: 'Ofrecemos ambas modalidades. El formato se acuerda con tu especialista asignado según tu disponibilidad y ubicación.',
    },
    {
      q: '¿Los precios incluyen IVA?',
      a: 'Los precios indicados no incluyen IVA. La facturación se realiza mensualmente y recibirás factura detallada para deducción empresarial.',
    },
    {
      q: '¿Hay permanencia o penalización por cancelación?',
      a: 'No existe permanencia. Puedes pausar o cancelar tu plan con 15 días de antelación al siguiente ciclo de facturación sin ningún coste adicional.',
    },
    {
      q: '¿Puedo cambiar de plan una vez contratado?',
      a: 'Sí. Puedes hacer upgrade en cualquier momento. El cambio se aplica en el siguiente ciclo de facturación y te notificamos el ajuste de importe correspondiente.',
    },
  ];

  return faqs.map(f => `
    <div class="accordion-item">
      <div class="accordion-header">
        <span class="accordion-title">${f.q}</span>
        <span class="accordion-chevron">▼</span>
      </div>
      <div class="accordion-body">
        <p class="text-muted" style="font-size:14px;line-height:1.6">${f.a}</p>
      </div>
    </div>
  `).join('');
}

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
