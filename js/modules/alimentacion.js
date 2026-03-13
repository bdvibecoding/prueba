/* ═══════════════════════════════════════════════
   TGWL — modules/alimentacion.js
   Nutrition & Meal Tracking Module
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, formatDate, todayString } from '../utils.js';
import { openModal, closeModal, openSheet, closeSheet } from '../components/modal.js';
import { t } from '../i18n.js';

function getMealTypes3() {
  return [
    { id: 'breakfast', name: t('meal_breakfast'),   icon: '🌅', time: '08:00' },
    { id: 'lunch',     name: t('meal_lunch'),        icon: '🍽️', time: '14:00' },
    { id: 'dinner',    name: t('meal_dinner'),       icon: '🌙', time: '21:00' },
  ];
}
function getMealTypes5() {
  return [
    { id: 'breakfast',  name: t('meal_breakfast'),   icon: '🌅', time: '08:00' },
    { id: 'midmorning', name: t('meal_midmorning'),  icon: '🍎', time: '11:00' },
    { id: 'lunch',      name: t('meal_lunch'),       icon: '🍽️', time: '14:00' },
    { id: 'snack',      name: t('meal_snack'),       icon: '🥪', time: '18:00' },
    { id: 'dinner',     name: t('meal_dinner'),      icon: '🌙', time: '21:00' },
  ];
}

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="alimentacion-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">🥗 ${t('alim_title')}</h2>
            <p class="page-subtitle">${t('alim_subtitle')}</p>
          </div>
          <button class="btn-icon" id="btn-diet-settings" title="${t('alim_settings_title')}">⚙️</button>
        </div>

        <!-- Wake-up Supplement Banner -->
        <div class="glass-card" id="supplement-banner" style="padding:var(--space-md);margin-bottom:var(--space-md)">
          <div style="display:flex;align-items:center;gap:var(--space-md)">
            <span style="font-size:28px">🌟</span>
            <div style="flex:1">
              <div style="font-weight:700;margin-bottom:4px">${t('alim_wakeup')}</div>
              <div id="supplement-list" class="text-muted" style="font-size:13px">${t('alim_loading_supps')}</div>
            </div>
            <button class="btn-accent" id="btn-see-supplements">${t('view')}</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="tracker">${t('alim_tab_tracker')}</button>
          <button class="tab-btn" data-tab="menus">${t('alim_tab_menus')}</button>
          <button class="tab-btn" data-tab="restaurants">${t('alim_tab_restaurants')}</button>
        </div>

        <!-- Tab Content -->
        <div id="tab-tracker" class="tab-content">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md)">
            <span class="section-title" style="margin:0">${t('today')} — ${formatDate(new Date())}</span>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--color-text-muted)">
              <span>${t('alim_5meals')}</span>
              <label class="toggle-switch" title="${t('alim_toggle_meals')}">
                <input type="checkbox" id="toggle-meals">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div id="meal-list" class="meal-grid">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>

        <div id="tab-menus" class="tab-content hidden">
          <div id="menus-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        </div>

        <div id="tab-restaurants" class="tab-content hidden">
          <div id="restaurants-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  const profile = getUserProfile();

  // Load supplements
  loadSupplements(container, profile);

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'tracker')     loadMealTracker(container, profile);
      if (btn.dataset.tab === 'menus')       loadMenus(container, profile);
      if (btn.dataset.tab === 'restaurants') loadRestaurants(container);
    });
  });

  // Toggle 3/5 meals
  container.querySelector('#toggle-meals')?.addEventListener('change', (e) => {
    loadMealTracker(container, profile, e.target.checked ? 5 : 3);
  });

  // See supplements
  container.querySelector('#btn-see-supplements')?.addEventListener('click', () => openSupplementsSheet(profile));

  // Initial load
  loadMealTracker(container, profile, 3);
}

// ── Load Meal Tracker ─────────────────────────
async function loadMealTracker(container, profile, count = 3) {
  const listEl = container.querySelector('#meal-list');
  const today  = todayString();
  const meals  = count === 5 ? getMealTypes5() : getMealTypes3();

  try {
    const snap = await collections.meals(profile.uid).doc(today).get();
    const data = snap.exists ? snap.data() : {};

    listEl.innerHTML = meals.map(meal => {
      const logged = data[meal.id];
      return buildMealSlot(meal, logged);
    }).join('');

    listEl.querySelectorAll('.meal-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const mealId = slot.dataset.mealId;
        const meal = meals.find(m => m.id === mealId);
        openMealModal(meal, data[mealId], profile, today, listEl, meals);
      });
    });
  } catch (e) {
    listEl.innerHTML = `<p class="text-muted">${t('error_loading')}: ${e.message}</p>`;
  }
}

function buildMealSlot(meal, logged) {
  const status = logged?.skipped ? 'skipped' : logged?.completed ? 'completed' : '';
  const statusIcon = logged?.skipped ? '⚠️' : logged?.completed ? '✅' : '○';

  return `
    <div class="meal-slot ${status}" data-meal-id="${meal.id}" style="cursor:pointer">
      <div class="meal-slot-header">
        <span class="meal-slot-icon">${meal.icon}</span>
        <div>
          <div class="meal-slot-name">${meal.name}</div>
          <div class="meal-slot-time">${meal.time}</div>
        </div>
        <span style="font-size:20px">${statusIcon}</span>
      </div>
      ${logged?.foods ? `<div class="text-muted" style="font-size:12px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.05)">${logged.foods}</div>` : ''}
      ${logged?.skipped ? `<div style="font-size:12px;color:var(--color-warning)">⚠️ ${logged.skipReason || t('alim_skipped')}</div>` : ''}
    </div>
  `;
}

// ── Meal Modal ────────────────────────────────
function openMealModal(meal, logged, profile, today, listEl, meals) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${meal.icon} ${meal.name}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">${t('alim_what_ate')}</label>
      <textarea id="meal-foods" class="input-solo" rows="3"
        placeholder="${t('alim_foods_placeholder')}"
        style="padding:var(--space-md);width:100%;margin-top:4px">${logged?.foods || ''}</textarea>
    </div>
    <div class="form-row">
      <div style="display:flex;align-items:center;gap:var(--space-md)">
        <label class="field-label" style="margin:0">${t('alim_skip_question')}</label>
        <label class="toggle-switch">
          <input type="checkbox" id="meal-skipped" ${logged?.skipped ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div id="skip-reason-row" class="form-row" style="${logged?.skipped ? '' : 'display:none'}">
      <label class="field-label">${t('alim_skip_reason')}</label>
      <textarea id="meal-skip-reason" class="input-solo" rows="2"
        placeholder="${t('alim_skip_reason_placeholder')}"
        style="padding:var(--space-md);width:100%;margin-top:4px">${logged?.skipReason || ''}</textarea>
    </div>
    <div id="replacement-row" class="form-row" style="${logged?.skipped ? '' : 'display:none'}">
      <label class="field-label">${t('alim_replacement')}</label>
      <input id="meal-replacement" type="text" class="input-solo"
        placeholder="${t('alim_replacement_placeholder')}" value="${logged?.replacement || ''}">
    </div>
    <div style="display:flex;gap:8px;margin-top:var(--space-md)">
      <button class="btn-secondary btn-full" id="btn-meal-delete">${t('clear')}</button>
      <button class="btn-primary btn-full" id="btn-meal-save">💾 ${t('save')}</button>
    </div>
  `;

  openModal(html);
  const modal = document.getElementById('modal-content');

  modal.querySelector('#meal-skipped').addEventListener('change', (e) => {
    const show = e.target.checked;
    modal.querySelector('#skip-reason-row').style.display  = show ? '' : 'none';
    modal.querySelector('#replacement-row').style.display  = show ? '' : 'none';
  });

  modal.querySelector('#btn-meal-save').addEventListener('click', async () => {
    const foods      = modal.querySelector('#meal-foods').value.trim();
    const skipped    = modal.querySelector('#meal-skipped').checked;
    const skipReason = modal.querySelector('#meal-skip-reason')?.value.trim();
    const replacement= modal.querySelector('#meal-replacement')?.value.trim();

    const mealData = {
      foods, skipped, skipReason, replacement,
      completed: !!foods && !skipped,
      loggedAt: timestamp(),
    };

    try {
      await collections.meals(profile.uid).doc(today).set(
        { [meal.id]: mealData }, { merge: true }
      );
      toast(t('alim_meal_saved'), 'success');
      closeModal();
      // Refresh list
      const data = (await collections.meals(profile.uid).doc(today).get()).data() || {};
      listEl.innerHTML = meals.map(m => buildMealSlot(m, data[m.id])).join('');
      listEl.querySelectorAll('.meal-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const m = meals.find(x => x.id === slot.dataset.mealId);
          openMealModal(m, data[m.id], profile, today, listEl, meals);
        });
      });
    } catch (e) { toast(t('error') + ': ' + e.message, 'error'); }
  });

  modal.querySelector('#btn-meal-delete').addEventListener('click', async () => {
    await collections.meals(profile.uid).doc(today).set(
      { [meal.id]: firebase.firestore.FieldValue.delete() }, { merge: true }
    ).catch(() => {});
    closeModal();
    loadMealTracker(document.getElementById('alimentacion-page'), profile);
  });
}

// ── Load Menus ────────────────────────────────
async function loadMenus(container, profile) {
  const el = container.querySelector('#menus-list');
  try {
    const snap = await collections.dietas(profile.uid).orderBy('assignedAt','desc').limit(10).get();
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">${t('alim_no_menus')}</div><div class="empty-subtitle">${t('alim_no_menus_sub')}</div></div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-sm);cursor:pointer;display:flex;align-items:center;gap:var(--space-md)"
             data-diet-id="${doc.id}" data-diet-type="${d.type}">
          <span style="font-size:28px">📄</span>
          <div style="flex:1">
            <div style="font-weight:700">${d.name || 'Menú'}</div>
            <div class="text-muted">${d.type || ''} · ${formatDate(d.assignedAt?.toDate?.() || d.assignedAt)}</div>
          </div>
          <span class="badge badge-cyan">${t('view')}</span>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-diet-id]').forEach(card => {
      card.addEventListener('click', () => openDietMenu(card.dataset.dietId, card.dataset.dietType));
    });
  } catch (e) { el.innerHTML = `<p class="text-muted">${t('error')}: ${e.message}</p>`; }
}

function openDietMenu(dietId, dietType) {
  const dietMap = {
    volumen:     '../dietas/dieta-volumen.html',
    definicion:  '../dietas/dieta-definicion.html',
    mantenimiento: '../dietas/dieta-mantenimiento.html',
  };
  const url = dietMap[dietType] || `../dietas/${dietType}.html`;

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 ${t('alim_assigned_menu')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="height:70vh;overflow:hidden;border-radius:var(--radius-md)">
      <iframe src="${url}" style="width:100%;height:100%;border:none;background:#fff;border-radius:var(--radius-md)"
              title="Menú nutricional"></iframe>
    </div>
  `;
  openModal(html);
}

// ── Load Restaurants ──────────────────────────
async function loadRestaurants(container) {
  const el = container.querySelector('#restaurants-list');
  try {
    const snap = await db.collection('restaurants').limit(20).get();
    if (snap.empty) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🍽️</div>
          <div class="empty-title">${t('alim_no_restaurants')}</div>
          <div class="empty-subtitle">${t('alim_no_restaurants_sub')}</div>
        </div>
      `;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      return `
        <div class="restaurant-card">
          <div class="restaurant-img">${r.emoji || '🍽️'}</div>
          <div class="restaurant-info">
            <div class="restaurant-name">${r.name}</div>
            <div class="restaurant-desc">${r.description || t('alim_healthy_restaurant')}</div>
            <div class="restaurant-rating">
              ⭐ ${r.rating || '5.0'}
              <span class="text-muted" style="margin-left:8px">📍 ${r.city || ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) { el.innerHTML = `<p class="text-muted">${t('error')}: ${e.message}</p>`; }
}

// ── Load Supplements ─────────────────────────
async function loadSupplements(container, profile) {
  const el = container.querySelector('#supplement-list');
  try {
    const snap = await collections.supplements(profile.uid).get();
    if (snap.empty) {
      el.textContent = t('alim_no_supps');
      return;
    }
    const morning = snap.docs.filter(d => d.data().timing === 'morning' || d.data().timing === 'anytime');
    el.textContent = morning.length
      ? morning.map(d => d.data().name).slice(0, 3).join(' · ')
      : t('alim_check_supps');
  } catch { el.textContent = t('alim_see_supps'); }
}

// ── Supplements Sheet ─────────────────────────
async function openSupplementsSheet(profile) {
  const html = `
    <h4 style="margin-bottom:var(--space-md)">💊 ${t('alim_supplementation')}</h4>
    <div id="supplements-sheet-list"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>
    <p class="text-muted" style="margin-top:var(--space-md);font-size:12px">
      ${t('alim_supps_disclaimer')}
    </p>
  `;
  openSheet(html);

  try {
    const snap = await collections.supplements(profile.uid).get();
    const el = document.getElementById('sheet-content').querySelector('#supplements-sheet-list');
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">💊</div><div class="empty-title">${t('alim_no_supps')}</div></div>`;
      return;
    }
    const groups = {};
    snap.docs.forEach(doc => {
      const s = doc.data();
      if (!groups[s.timing]) groups[s.timing] = [];
      groups[s.timing].push(s);
    });

    const timingLabels = {
      morning:     `🌅 ${t('supp_morning')}`,
      preworkout:  `⚡ ${t('supp_preworkout')}`,
      postworkout: `🔄 ${t('supp_postworkout')}`,
      anytime:     `🕒 ${t('supp_anytime')}`,
    };
    el.innerHTML = Object.entries(groups).map(([timing, supps]) => `
      <div class="section-title">${timingLabels[timing] || timing}</div>
      ${supps.map(s => `
        <div class="supplement-card">
          <span class="supplement-icon">💊</span>
          <div class="supplement-info">
            <div class="supplement-name">${s.name}</div>
            <div class="supplement-dose">${s.dose || ''} ${s.notes ? '· ' + s.notes : ''}</div>
          </div>
        </div>
      `).join('')}
    `).join('');
  } catch (e) {
    const el = document.getElementById('sheet-content')?.querySelector('#supplements-sheet-list');
    if (el) el.innerHTML = `<p class="text-muted">${t('error')}: ${e.message}</p>`;
  }
}
