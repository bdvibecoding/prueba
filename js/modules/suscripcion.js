/* ═══════════════════════════════════════════════
   TGWL — modules/suscripcion.js
   Subscription & Billing Module (Stripe Mock)
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, timestamp } from '../firebase-config.js';
import { toast } from '../utils.js';
import { openModal, closeModal, alert } from '../components/modal.js';

const PLANS = [
  {
    id:          'basic',
    name:        'Starter',
    price:       29,
    period:      'mes',
    badge:       null,
    description: 'Para empezar tu transformación',
    features:    [
      { label: 'Acceso a entrenamientos', included: true },
      { label: 'Tracker nutricional',     included: true },
      { label: 'Biomedidas básicas',      included: true },
      { label: 'Fotos de progreso',       included: false },
      { label: 'Coach personal',          included: false },
      { label: 'Análisis avanzado',       included: false },
      { label: 'Acceso prioritario',      included: false },
    ],
    color: 'rgba(107,114,128,0.3)',
    border: 'rgba(107,114,128,0.4)',
  },
  {
    id:          'pro',
    name:        'Pro',
    price:       79,
    period:      'mes',
    badge:       '⭐ Más popular',
    description: 'La experiencia completa',
    features:    [
      { label: 'Acceso a entrenamientos',  included: true },
      { label: 'Tracker nutricional',      included: true },
      { label: 'Biomedidas completas',     included: true },
      { label: 'Fotos de progreso',        included: true },
      { label: 'Coach personal',           included: true },
      { label: 'Análisis avanzado',        included: false },
      { label: 'Acceso prioritario',       included: false },
    ],
    color: 'rgba(148,10,10,0.3)',
    border: 'rgba(148,10,10,0.5)',
  },
  {
    id:          'elite',
    name:        'Elite',
    price:       149,
    period:      'mes',
    badge:       '👑 Premium',
    description: 'Resultados máximos garantizados',
    features:    [
      { label: 'Acceso a entrenamientos',  included: true },
      { label: 'Tracker nutricional',      included: true },
      { label: 'Biomedidas completas',     included: true },
      { label: 'Fotos de progreso',        included: true },
      { label: 'Coach personal',           included: true },
      { label: 'Análisis avanzado',        included: true },
      { label: 'Acceso prioritario 24/7',  included: true },
    ],
    color: 'rgba(25,249,249,0.15)',
    border: 'rgba(25,249,249,0.4)',
  },
];

export async function render(container) {
  const profile = getUserProfile();
  const currentPlan = profile?.subscriptionStatus || 'free';

  container.innerHTML = `
    <div class="page active" id="suscripcion-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">⭐ Suscripción</h2>
            <p class="page-subtitle">Elige tu plan de entrenamiento</p>
          </div>
        </div>

        <!-- Current status -->
        ${currentPlan !== 'free' ? `
          <div class="glass-card glass-card-cyan" style="padding:var(--space-md);margin-bottom:var(--space-lg);display:flex;align-items:center;gap:var(--space-md)">
            <span style="font-size:28px">✅</span>
            <div>
              <div style="font-weight:700">Plan activo: ${capitalizeFirst(currentPlan)}</div>
              <div class="text-muted">Tu suscripción está activa</div>
            </div>
          </div>
        ` : `
          <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-lg);text-align:center">
            <p style="font-size:14px;line-height:1.6;color:var(--color-text-muted)">
              🎯 Elige el plan que mejor se adapte a tus objetivos.<br>
              Todos incluyen <strong style="color:var(--white)">7 días de prueba gratuita.</strong>
            </p>
          </div>
        `}

        <!-- Plans -->
        <div style="display:flex;flex-direction:column;gap:var(--space-md)" id="plans-grid">
          ${PLANS.map(plan => buildPlanCard(plan, currentPlan)).join('')}
        </div>

        <!-- Stripe info -->
        <div style="text-align:center;margin-top:var(--space-lg)">
          <div class="stripe-secure">
            🔒 <span>Pagos seguros con</span>
            <strong style="color:#635BFF">Stripe</strong>
          </div>
          <p class="text-muted" style="margin-top:var(--space-sm);font-size:11px">
            Cancela cuando quieras · Sin permanencia · IVA incluido
          </p>
        </div>

        <!-- FAQ -->
        <div style="margin-top:var(--space-xl)">
          <div class="section-title">Preguntas frecuentes</div>
          <div class="glass-card" style="padding:0">
            ${buildFAQ()}
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  let selectedPlan = null;

  container.querySelectorAll('.pack-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.pack-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPlan = card.dataset.planId;
      openCheckoutModal(selectedPlan);
    });
  });
}

// ── Plan Card ──────────────────────────────────
function buildPlanCard(plan, current) {
  const isActive = current === plan.id;
  return `
    <div class="pack-card glass-card ${isActive ? 'selected' : ''}" data-plan-id="${plan.id}"
         style="background:${plan.color};border-color:${plan.border}">
      ${plan.badge ? `<div class="pack-popular-badge">${plan.badge}</div>` : ''}
      <div style="margin-bottom:var(--space-sm)">
        <h3 style="font-size:22px;font-weight:800">${plan.name}</h3>
        <p class="text-muted" style="font-size:13px">${plan.description}</p>
      </div>
      <div class="pack-price">
        <sup>€</sup>${plan.price}<span> / ${plan.period}</span>
      </div>
      <div class="pack-features">
        ${plan.features.map(f => `
          <div class="pack-feature ${f.included ? 'included' : ''}">
            ${f.label}
          </div>
        `).join('')}
      </div>
      <button class="btn-${isActive ? 'secondary' : 'primary'} btn-full"
              style="margin-top:var(--space-md);pointer-events:none">
        ${isActive ? '✅ Plan actual' : 'Seleccionar'}
      </button>
    </div>
  `;
}

// ── Checkout Modal (Stripe Mock) ──────────────
function openCheckoutModal(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const profile = getUserProfile();

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">💳 Checkout — Plan ${plan.name}</h3>
      <button class="modal-close">✕</button>
    </div>

    <div class="glass-card glass-card-red" style="padding:var(--space-md);margin-bottom:var(--space-md);display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700">${plan.name}</div>
        <div class="text-muted">${plan.description}</div>
      </div>
      <div style="font-size:22px;font-weight:800">€${plan.price}<span style="font-size:13px;font-weight:400">/mes</span></div>
    </div>

    <div class="stripe-form">
      <p class="text-muted" style="font-size:12px;margin-bottom:var(--space-md)">Datos de pago (cifrado SSL)</p>
      <div class="form-row">
        <label class="field-label">Número de tarjeta</label>
        <input type="text" id="card-number" class="stripe-input" placeholder="1234 5678 9012 3456" maxlength="19"
               style="width:100%;margin-top:4px" inputmode="numeric">
      </div>
      <div class="stripe-row" style="margin-top:var(--space-sm)">
        <div style="flex:1">
          <label class="field-label">Vencimiento</label>
          <input type="text" id="card-exp" class="stripe-input" placeholder="MM/AA" maxlength="5" style="width:100%;margin-top:4px">
        </div>
        <div style="width:100px">
          <label class="field-label">CVC</label>
          <input type="text" id="card-cvc" class="stripe-input" placeholder="123" maxlength="4" style="width:100%;margin-top:4px" inputmode="numeric">
        </div>
      </div>
      <div class="form-row" style="margin-top:var(--space-sm)">
        <label class="field-label">Nombre del titular</label>
        <input type="text" id="card-name" class="stripe-input" placeholder="${profile?.name || 'Nombre Apellido'}"
               style="width:100%;margin-top:4px">
      </div>
    </div>

    <div class="stripe-secure" style="margin:var(--space-md) 0">
      🔒 Pago procesado por <strong style="color:#635BFF">Stripe</strong> — 256-bit SSL
    </div>

    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-secondary btn-full" id="btn-cancel-pay">Cancelar</button>
      <button class="btn-primary btn-full" id="btn-confirm-pay">
        Suscribirse — €${plan.price}/mes
      </button>
    </div>
    <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-sm)">
      7 días gratis · Cancela en cualquier momento
    </p>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  // Card number formatting
  modal.querySelector('#card-number')?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
  });
  modal.querySelector('#card-exp')?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
  });

  modal.querySelector('#btn-cancel-pay')?.addEventListener('click', closeModal);
  modal.querySelector('#btn-confirm-pay')?.addEventListener('click', () => processMockPayment(plan, profile));
}

// ── Mock Payment Processing ───────────────────
async function processMockPayment(plan, profile) {
  const modal = document.getElementById('modal-content');
  const btn   = modal?.querySelector('#btn-confirm-pay');
  if (!btn) return;

  const cardNum = modal.querySelector('#card-number')?.value?.replace(/\s/g, '');
  if (!cardNum || cardNum.length < 16) {
    toast('Número de tarjeta no válido', 'error');
    return;
  }

  btn.textContent = 'Procesando...';
  btn.disabled = true;

  // Simulate API delay
  await new Promise(r => setTimeout(r, 2000));

  try {
    if (profile?.uid) {
      await db.collection('users').doc(profile.uid).update({
        subscriptionStatus: plan.id,
        subscriptionStart: timestamp(),
        updatedAt: timestamp(),
      });
    }
    closeModal();
    await alert(
      '✅ ¡Suscripción activada!',
      `¡Bienvenido al plan ${plan.name}! Tu cuenta ha sido actualizada. Disfruta de todos los beneficios de TGWL.`,
      'success'
    );
    // Reload page to reflect changes
    import('../router.js').then(({ navigate }) => navigate('suscripcion'));
  } catch (e) {
    toast('Error al procesar el pago. Inténtalo de nuevo.', 'error');
    btn.textContent = `Suscribirse — €${plan.price}/mes`;
    btn.disabled = false;
  }
}

// ── FAQ ───────────────────────────────────────
function buildFAQ() {
  const faqs = [
    { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, puedes cancelar tu suscripción cuando quieras desde la configuración de tu cuenta. No hay permanencia.' },
    { q: '¿En qué consiste la prueba gratuita?', a: '7 días con acceso completo a todas las funcionalidades del plan elegido. Sin cargos hasta el día 8.' },
    { q: '¿Qué métodos de pago aceptáis?', a: 'Aceptamos todas las tarjetas Visa, Mastercard, American Express y pagos por Apple Pay / Google Pay.' },
    { q: '¿Puedo cambiar de plan?', a: 'Sí, puedes cambiar tu plan en cualquier momento. El cambio se aplica en el siguiente ciclo de facturación.' },
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
