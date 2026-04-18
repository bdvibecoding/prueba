/* ═══════════════════════════════════════════════
   TGWL — modules/suscripcion.js
   Subscription & Billing Module — Business Edition
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, timestamp } from '../firebase-config.js';
import { toast } from '../utils.js';
import { openModal, closeModal, alert } from '../components/modal.js';
import { t } from '../i18n.js';

function getPlans() {
  return [
    {
      id: 'essential',
      name: 'Essential',
      price:       400,
      badge:       null,
      description: t('sub_essential_desc'),
      features:    [
        { label: t('sub_f_routines'),          included: true },
        { label: t('sub_f_nutrition'),         included: true },
        { label: t('sub_f_chat'),              included: true },
        { label: t('sub_f_biomedidas'),        included: true },
        { label: t('sub_f_reports'),           included: true },
        { label: t('sub_f_coach'),             included: false },
        { label: t('sub_f_nutrition_plan'),    included: false },
        { label: t('sub_f_ai'),                included: false },
        { label: t('sub_f_priority'),          included: false },
        { label: t('sub_f_team'),              included: false },
        { label: t('sub_f_unlimited'),         included: false },
        { label: t('sub_f_247'),               included: false },
      ],
      gradientBorder: 'linear-gradient(135deg, rgba(107,114,128,0.7), rgba(75,85,99,0.4))',
      glowColor: 'rgba(107,114,128,0.15)',
      accentColor: '#9CA3AF',
    },
    {
      id: 'pro',
      name: 'Pro',
      price:       600,
      badge:       t('sub_most_popular'),
      description: t('sub_pro_desc'),
      features:    [
        { label: t('sub_f_routines'),          included: true },
        { label: t('sub_f_nutrition'),         included: true },
        { label: t('sub_f_chat'),              included: true },
        { label: t('sub_f_biomedidas'),        included: true },
        { label: t('sub_f_reports'),           included: true },
        { label: t('sub_f_coach'),             included: true },
        { label: t('sub_f_progress_photos'),   included: true },
        { label: t('sub_f_nutrition_plan'),    included: true },
        { label: t('sub_f_ai'),                included: true },
        { label: t('sub_f_priority'),          included: true },
        { label: t('sub_f_team'),              included: false },
        { label: t('sub_f_unlimited'),         included: false },
      ],
      gradientBorder: 'linear-gradient(135deg, rgba(148,10,10,0.9), rgba(220,38,38,0.5))',
      glowColor: 'rgba(148,10,10,0.2)',
      accentColor: '#EF4444',
    },
    {
      id: 'elite',
      name: 'Elite',
      price:       800,
      badge:       null,
      description: t('sub_elite_desc'),
      features:    [
        { label: t('sub_f_routines'),          included: true },
        { label: t('sub_f_nutrition'),         included: true },
        { label: t('sub_f_chat'),              included: true },
        { label: t('sub_f_biomedidas'),        included: true },
        { label: t('sub_f_reports'),           included: true },
        { label: t('sub_f_coach'),             included: true },
        { label: t('sub_f_nutrition_plan'),    included: true },
        { label: t('sub_f_ai'),                included: true },
        { label: t('sub_f_priority'),          included: true },
        { label: t('sub_f_team_full'),         included: true },
        { label: t('sub_f_unlimited'),         included: true },
        { label: t('sub_f_247'),               included: true },
        { label: t('sub_f_biomedical'),        included: true },
        { label: t('sub_f_life_plan'),         included: true },
      ],
      gradientBorder: 'linear-gradient(135deg, rgba(25,249,249,0.7), rgba(6,182,212,0.4))',
      glowColor: 'rgba(25,249,249,0.1)',
      accentColor: '#22D3EE',
    },
  ];
}

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
              ${t('sub_title')}
            </h2>
            <p class="page-subtitle" style="font-size:14px;color:var(--color-text-muted)">
              ${t('sub_subtitle')}
            </p>
          </div>
        </div>

        <!-- Active plan banner -->
        ${currentPlan !== 'free' ? `
          <div class="glass-card glass-card-accent"
               style="padding:var(--space-md);margin-bottom:var(--space-lg);
                      display:flex;align-items:center;gap:var(--space-md)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <div style="font-weight:700">${t('sub_active_plan')} ${capitalizeFirst(currentPlan)}</div>
              <div class="text-muted">${t('sub_active_desc')}</div>
            </div>
          </div>
 ` : `
          <div class="glass-card"
               style="padding:var(--space-md);margin-bottom:var(--space-lg);
                      text-align:center;border:1px solid rgba(255,255,255,0.07)">
            <p style="font-size:14px;line-height:1.7;color:var(--color-text-muted)">
              ${t('sub_free_desc')}<br>
              <strong style="color:var(--white)">${t('sub_free_cta')}</strong>
            </p>
          </div>
 `}

        <!-- Plans grid -->
        <div style="display:flex;flex-direction:column;gap:var(--space-lg)" id="plans-grid">
          ${getPlans().map(plan => buildPlanCard(plan, currentPlan)).join('')}
        </div>

        <!-- Sesión Individual -->
        ${buildSingleSessionCard()}

        <!-- Stripe badge -->
        <div style="text-align:center;margin-top:var(--space-xl)">
          <div class="stripe-secure">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;vertical-align:-4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> <span>${t('sub_stripe_secure')}</span>
            <strong style="color:#635BFF">Stripe</strong>
          </div>
          <p class="text-muted" style="margin-top:var(--space-sm);font-size:11px">
            ${t('sub_billing_note')}
          </p>
        </div>

        <!-- FAQ -->
        <div style="margin-top:var(--space-xl)">
          <div class="section-title" style="margin-bottom:var(--space-md)">${t('sub_faq_title')}</div>
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
 `border-radius:var(--r-lg)`,
 `padding:var(--space-lg)`,
 `position:relative`,
 `overflow:hidden`,
    isPro ? `box-shadow:0 0 40px ${plan.glowColor},0 8px 32px rgba(0,0,0,0.4)` : `box-shadow:0 4px 24px rgba(0,0,0,0.3)`,
  ].join(';');

  // Gradient border via pseudo-approach using wrapper
  return `
    <div style="position:relative;border-radius:var(--r-lg);padding:1px;background:${plan.gradientBorder};
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
          <span style="font-size:13px;color:var(--color-text-muted);margin-bottom:8px">/ ${t('sub_per_month')}</span>
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
          ${isActive ? t('sub_current_plan') : t('sub_request_info')}
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
        ${t('sub_one_time')}
      </div>

      <div style="position:relative;border-radius:var(--r-lg);padding:1px;
                  background:linear-gradient(135deg,rgba(250,204,21,0.6),rgba(234,179,8,0.3))">
        <div style="background:rgba(10,10,10,0.85);border-radius:var(--r-lg);padding:var(--space-lg);
                    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">

          <div style="display:flex;align-items:center;justify-content:space-between;
                      flex-wrap:wrap;gap:var(--space-md)">

            <!-- Left: info -->
            <div style="flex:1;min-width:200px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:22px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;vertical-align:-4px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                <h3 style="font-size:20px;font-weight:900;color:#FACC15;letter-spacing:-0.3px">
                  ${t('sub_session_title')}
                </h3>
              </div>
              <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;
                        max-width:340px">
                ${t('sub_session_desc')}
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:var(--space-sm)">
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:var(--r-lg);
                             padding:3px 10px;color:#FACC15">${t('sub_no_subscription')}</span>
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:var(--r-lg);
                             padding:3px 10px;color:#FACC15">${t('sub_60_min')}</span>
                <span style="font-size:11px;background:rgba(250,204,21,0.12);
                             border:1px solid rgba(250,204,21,0.25);border-radius:var(--r-lg);
                             padding:3px 10px;color:#FACC15">${t('sub_online_or_in_person')}</span>
              </div>
            </div>

            <!-- Right: price + CTA -->
            <div style="display:flex;flex-direction:column;align-items:center;
                        gap:var(--space-sm);text-align:center">
              <div style="display:flex;align-items:flex-end;gap:4px">
                <span style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">€</span>
                <span style="font-size:42px;font-weight:900;line-height:1;color:#FACC15">80</span>
                <span style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px">/ ${t('sub_per_session')}</span>
              </div>
              <button class="btn-primary btn-full" id="btn-reservar-sesion"
                      style="background:rgba(250,204,21,0.15);border:1px solid rgba(250,204,21,0.5);
                             color:#FACC15;font-weight:700;letter-spacing:0.5px;
                             min-width:180px;white-space:nowrap">
                ${t('sub_book_session')}
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
  const plan = getPlans().find(p => p.id === planId);
  if (!plan) return;

  const profile = getUserProfile();

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('sub_request')} — ${plan.name}</h3>
      <button class="modal-close">✕</button>
    </div>

    <div style="padding:1px;border-radius:var(--r-md);
                background:${plan.gradientBorder};margin-bottom:var(--space-md)">
      <div style="background:rgba(10,10,10,0.9);border-radius:var(--r-md);
                  padding:var(--space-md);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;font-size:16px;color:${plan.accentColor}">${plan.name}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">${plan.description}</div>
        </div>
        <div style="font-size:24px;font-weight:900;color:var(--white)">
          €${plan.price.toLocaleString('es-ES')}
          <span style="font-size:12px;font-weight:400;color:var(--color-text-muted)">/${t('sub_per_month')}</span>
        </div>
      </div>
    </div>

    <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;margin-bottom:var(--space-md)">
      ${t('sub_inquiry_desc')}
    </p>

    <div class="form-row" style="margin-bottom:var(--space-sm)">
      <label class="field-label">${t('sub_contact_email')}</label>
      <input type="email" id="inquiry-email" class="stripe-input"
             placeholder="${profile?.email || 'your@company.com'}"
             value="${profile?.email || ''}"
             style="width:100%;margin-top:4px">
    </div>

    <div class="form-row" style="margin-bottom:var(--space-md)">
      <label class="field-label">${t('sub_message_opt')}</label>
      <textarea id="inquiry-message" class="stripe-input"
                placeholder="${t('sub_message_placeholder')}"
                style="width:100%;margin-top:4px;height:80px;resize:none"></textarea>
    </div>

    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-secondary btn-full" id="btn-cancel-inquiry">${t('cancel')}</button>
      <button class="btn-primary btn-full" id="btn-send-inquiry"
              style="font-weight:700">
        ${t('sub_send')}
      </button>
    </div>
    <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-sm)">
      ${t('sub_no_commitment')}
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
      <h3 class="modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;vertical-align:-4px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> ${t('sub_book')}</h3>
      <button class="modal-close">✕</button>
    </div>

    <div style="padding:1px;border-radius:var(--r-md);
                background:linear-gradient(135deg,rgba(250,204,21,0.6),rgba(234,179,8,0.3));
                margin-bottom:var(--space-md)">
      <div style="background:rgba(10,10,10,0.9);border-radius:var(--r-md);
                  padding:var(--space-md);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;font-size:16px;color:#FACC15">${t('sub_single_title')}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">
            ${t('sub_session_coaching_note')}
          </div>
        </div>
        <div style="font-size:24px;font-weight:900;color:#FACC15">
          €80
          <span style="font-size:12px;font-weight:400;color:var(--color-text-muted)">/${t('sub_per_session')}</span>
        </div>
      </div>
    </div>

    <p style="font-size:13px;color:var(--color-text-muted);line-height:1.6;margin-bottom:var(--space-md)">
      ${t('sub_session_modal_desc')}
    </p>

    <div class="form-row" style="margin-bottom:var(--space-sm)">
      <label class="field-label">${t('sub_contact_email')}</label>
      <input type="email" id="session-email" class="stripe-input"
             placeholder="${profile?.email || 'your@email.com'}"
             value="${profile?.email || ''}"
             style="width:100%;margin-top:4px">
    </div>

    <div class="form-row" style="margin-bottom:var(--space-md)">
      <label class="field-label">${t('sub_book_what')}</label>
      <textarea id="session-notes" class="stripe-input"
                placeholder="${t('sub_book_placeholder')}"
                style="width:100%;margin-top:4px;height:80px;resize:none"></textarea>
    </div>

    <div style="display:flex;gap:var(--space-sm)">
      <button class="btn-secondary btn-full" id="btn-cancel-session">${t('cancel')}</button>
      <button class="btn-primary btn-full" id="btn-confirm-session"
              style="background:rgba(250,204,21,0.15);border:1px solid rgba(250,204,21,0.5);
                     color:#FACC15;font-weight:700">
        ${t('sub_book_confirm')}
      </button>
    </div>
    <p class="text-muted" style="text-align:center;font-size:11px;margin-top:var(--space-sm)">
      ${t('sub_book_no_commitment')}
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
    toast(t('sub_email_required'), 'error');
    emailInput?.focus();
    return;
  }

  btn.textContent = t('sub_sending');
  btn.disabled    = true;

  try {
    await db.collection('inquiries').add({
      uid:       profile?.uid   || null,
      planId:    plan.id,
      planName:  plan.name,
      email,
      message:   modal.querySelector('#inquiry-message')?.value?.trim() || '',
      timestamp: timestamp(),
      status: 'pending',
      type: 'subscription',
    });

    closeModal();
    await alert(
      t('sub_sent_title'),
      t('sub_sent_desc').replace('{name}', plan.name),
 'success'
    );
  } catch (e) {
    toast(t('sub_send_error'), 'error');
    btn.textContent = t('sub_send');
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
    toast(t('sub_email_required'), 'error');
    emailInput?.focus();
    return;
  }

  btn.textContent = t('sub_confirming');
  btn.disabled    = true;

  try {
    await db.collection('inquiries').add({
      uid:       profile?.uid  || null,
      planId: 'single-session',
      planName: 'Sesión Individual',
      email,
      notes:     modal.querySelector('#session-notes')?.value?.trim() || '',
      timestamp: timestamp(),
      status: 'pending',
      type: 'session',
    });

    closeModal();
    await alert(
      t('sub_booked_title'),
      t('sub_booked_desc'),
 'success'
    );
  } catch (e) {
    toast(t('sub_book_error'), 'error');
    btn.textContent = t('sub_book_confirm');
    btn.disabled    = false;
  }
}

// ── FAQ ───────────────────────────────────────
function buildFAQ() {
  const faqs = [
    { q: t('sub_faq_q1'), a: t('sub_faq_a1') },
    { q: t('sub_faq_q2'), a: t('sub_faq_a2') },
    { q: t('sub_faq_q3'), a: t('sub_faq_a3') },
    { q: t('sub_faq_q4'), a: t('sub_faq_a4') },
    { q: t('sub_faq_q5'), a: t('sub_faq_a5') },
    { q: t('sub_faq_q6'), a: t('sub_faq_a6') },
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
