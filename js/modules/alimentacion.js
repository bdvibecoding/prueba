/* ═══════════════════════════════════════════════
   TGWL — modules/alimentacion.js
   Nutrition & Meal Tracking Module (v2)
   ▸ Header fijo con macros del día
   ▸ Sección "Nada más despertar" (suplementos morning)
   ▸ Botones de comida dinámicos (accordion)
   ▸ Botón Entreno (pre/post suplementos)
   ▸ Botón Antes de acostarse (timing:night / preSleep)
   ▸ Compatible con schema antiguo y nuevo de dietas
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, formatDate, todayString, msUntilLocalMidnight } from '../utils.js';
import { openModal, closeModal } from '../components/modal.js';
import { t } from '../i18n.js';

// ── SVG Icons (reemplazan emojis) ─────────────────
const ICON = {
  // Píldora/suplemento
  pill: `<svg class="tgwl-icon tgwl-icon-pill" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.8"/></svg>`,
  // Cubiertos (comida genérica)
  meal: `<svg class="tgwl-icon tgwl-icon-meal" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 2 2v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 3v6M5 3v6M9 3v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 3c-1.5 0-3 1-3 4v5h3v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Manzana (media mañana / snack)
  apple: `<svg class="tgwl-icon tgwl-icon-apple" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 7c-1-2-3-3-5-3-3 0-5 2.5-5 6 0 5 4 11 6 11 1 0 2-1 3-1s2 1 3 1c2 0 6-6 6-11 0-3.5-2-6-5-6-2 0-4 1-3 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7c0-2 1-4 3-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  // Sandwich
  sandwich: `<svg class="tgwl-icon tgwl-icon-sandwich" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8l9-4 9 4-9 4-9-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 13l9 4 9-4" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 17l9 4 9-4" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  // Sol (mañana / wakeup)
  sun: `<svg class="tgwl-icon tgwl-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  // Luna (noche / pre-sleep)
  moon: `<svg class="tgwl-icon tgwl-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  // Pesas (entreno)
  barbell: `<svg class="tgwl-icon tgwl-icon-barbell" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="6.5" y="4" width="3" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14.5" y="4" width="3" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8"/><line x1="9.5" y1="12" x2="14.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  // Rayo (pre-entreno)
  bolt: `<svg class="tgwl-icon tgwl-icon-bolt" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  // Refresh (post-entreno)
  refresh: `<svg class="tgwl-icon tgwl-icon-refresh" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Cuenco (ensalada / empty)
  bowl: `<svg class="tgwl-icon tgwl-icon-bowl" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 11a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="8" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/><circle cx="12" cy="9.5" r="1" fill="currentColor"/></svg>`,
  // Check (completado)
  check: `<svg class="tgwl-icon tgwl-icon-check" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polyline points="4 12 10 18 20 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Círculo vacío
  circle: `<svg class="tgwl-icon tgwl-icon-circle" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/></svg>`,
  // Cerrar
  close: `<svg class="tgwl-icon tgwl-icon-close" viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

// ── Render (HTML placeholder, datos cargados en init) ─
export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="alimentacion-page">

      <!-- ① Header fijo: macros del día -->
      <div class="nutrition-macro-bar" id="nutrition-macro-bar">
        <div class="nutrition-macro-cals" id="nmb-cals">
          <span class="nmb-cals-value" id="nmb-cals-value">—</span>
          <span class="nmb-cals-label">kcal</span>
        </div>
        <div class="nutrition-macro-pills">
          <span class="nmb-pill nmb-pill-p" id="nmb-p">P: —</span>
          <span class="nmb-separator">·</span>
          <span class="nmb-pill nmb-pill-c" id="nmb-c">C: —</span>
          <span class="nmb-separator">·</span>
          <span class="nmb-pill nmb-pill-g" id="nmb-g">G: —</span>
        </div>
        <div class="nmb-diet-name" id="nmb-diet-name"></div>
      </div>

      <!-- ② Contenido desplazable -->
      <div class="nutrition-scroll-body" id="nutrition-scroll-body">

        <!-- ② Sección fija: Nada más despertar -->
        <div class="nutrition-section-fixed hidden" id="section-wakeup">
          <div class="nsf-icon">${ICON.sun}</div>
          <div class="nsf-content">
            <div class="nsf-title">Nada más despertar</div>
            <div class="nsf-body" id="wakeup-body"></div>
          </div>
        </div>

        <!-- ③ Botones de comidas (generados dinámicamente) -->
        <div id="nutrition-meals-list" class="nutrition-meals-list">
          <div class="overlay-spinner"><div class="spinner-sm"></div></div>
        </div>

        <!-- ④ Botón Entreno -->
        <div id="section-workout" class="hidden">
          <div class="nutrition-meal-btn" id="btn-workout" data-open="false" role="button" tabindex="0">
            <span class="nmb-icon">${ICON.barbell}</span>
            <span class="nmb-label">Suplementación Entreno</span>
            <span class="nmb-arrow" id="arrow-workout">›</span>
          </div>
          <div class="nutrition-meal-accordion hidden" id="acc-workout">
            <div id="acc-workout-body"></div>
          </div>
        </div>

        <!-- ⑤ Botón Antes de acostarse -->
        <div id="section-presleep" class="hidden">
          <div class="nutrition-meal-btn" id="btn-presleep" data-open="false" role="button" tabindex="0">
            <span class="nmb-icon">${ICON.moon}</span>
            <span class="nmb-label">Antes de acostarse</span>
            <span class="nmb-arrow" id="arrow-presleep">›</span>
          </div>
          <div class="nutrition-meal-accordion hidden" id="acc-presleep">
            <div id="acc-presleep-body"></div>
          </div>
        </div>

        <!-- Espaciado inferior -->
        <div style="height: 24px"></div>
      </div>
    </div>
 `;
}

// Timer global para reset a medianoche (se reprograma al recargar)
let _midnightTimer = null;

function _scheduleMidnightReset(container) {
  if (_midnightTimer) { clearTimeout(_midnightTimer); _midnightTimer = null; }
  const ms = msUntilLocalMidnight();
  _midnightTimer = setTimeout(async () => {
    // A las 00:00 hora local: recargar comidas para el nuevo día
    try {
      const stillMounted = container && container.isConnected && container.querySelector('#nutrition-meals-list');
      if (stillMounted) {
        const profile = getUserProfile();
        const dietSnap = await collections.dietas(profile.uid).orderBy('assignedAt', 'desc').limit(1).get();
        const dietDoc  = !dietSnap.empty ? dietSnap.docs[0].data() : null;
        await _renderMeals(container, profile, dietDoc);
        toast('Nuevo día — comidas reiniciadas', 'info');
      }
    } catch (_) { /* noop */ }
    // Reprogramar para el siguiente día
    _scheduleMidnightReset(container);
  }, ms);
}

// ── Init: carga datos y renderiza ─────────────────
export async function init(container) {
  const profile = getUserProfile();

  // Acordeón helper
  function bindAccordion(btnId, accId, arrowId) {
    const btn = container.querySelector(`#${btnId}`);
    const acc = container.querySelector(`#${accId}`);
    const arrow = container.querySelector(`#${arrowId}`);
    if (!btn || !acc) return;
    btn.addEventListener('click', () => {
      const open = btn.dataset.open === 'true';
      btn.dataset.open = open ? 'false' : 'true';
      acc.classList.toggle('hidden', open);
      if (arrow) arrow.textContent = open ? '›' : '⌄';
    });
  }

  bindAccordion('btn-workout', 'acc-workout', 'arrow-workout');
  bindAccordion('btn-presleep', 'acc-presleep', 'arrow-presleep');

  try {
    // Cargar dieta activa y suplementos en paralelo
    const [dietSnap, suppSnap] = await Promise.all([
      collections.dietas(profile.uid).orderBy('assignedAt', 'desc').limit(1).get(),
      collections.supplements(profile.uid).get().catch(() => null),
    ]);

    const dietDoc  = !dietSnap.empty ? dietSnap.docs[0].data() : null;
    const suppDocs = suppSnap ? suppSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

    // Actualizar barra de macros
    _renderMacroBar(container, dietDoc);

    // Suplementos por timing
    const suppsByTiming = {};
    suppDocs.forEach(s => {
      const key = s.timing || 'anytime';
      if (!suppsByTiming[key]) suppsByTiming[key] = [];
      suppsByTiming[key].push(s);
    });

    // ② Nada más despertar
    _renderWakeup(container, dietDoc, suppsByTiming['morning'] || []);

    // ③ Comidas
    await _renderMeals(container, profile, dietDoc);

    // ④ Entreno
    _renderWorkout(container, dietDoc, suppsByTiming);

    // ⑤ Pre-sleep
    _renderPreSleep(container, dietDoc, suppsByTiming['night'] || []);

    // Programar reset automático a las 00:00 hora local
    _scheduleMidnightReset(container);

  } catch (e) {
    container.querySelector('#nutrition-meals-list').innerHTML =
 `<p class="text-muted" style="padding:16px">Error cargando datos: ${e.message}</p>`;
  }
}

// ── ① Barra de macros ─────────────────────────────
function _renderMacroBar(container, diet) {
  if (!diet) return;

  // Soportar campo legacy 'kcal' y nuevo 'calories'
  const cals    = diet.calories ?? diet.kcal ?? null;
  const protein = diet.protein  ?? diet.proteins ?? null;
  const carbs   = diet.carbs    ?? diet.carbohydrates ?? null;
  const fat     = diet.fat      ?? diet.fats ?? null;

  if (cals   != null) container.querySelector('#nmb-cals-value').textContent = cals;
  if (protein != null) container.querySelector('#nmb-p').textContent = `P: ${protein}g`;
  if (carbs   != null) container.querySelector('#nmb-c').textContent = `C: ${carbs}g`;
  if (fat     != null) container.querySelector('#nmb-g').textContent = `G: ${fat}g`;

  const nameEl = container.querySelector('#nmb-diet-name');
  if (nameEl && diet.name) nameEl.textContent = diet.name;
}

// ── ② Nada más despertar ──────────────────────────
function _renderWakeup(container, diet, morningSups) {
  const section = container.querySelector('#section-wakeup');
  const bodyEl  = container.querySelector('#wakeup-body');

  // Fuentes: diet.wakeUp (nuevo schema) + suplementos con timing:morning
  const wakeUpFromDiet = diet?.wakeUp;
  const wakeUpSuppsNorm = _normSupps(wakeUpFromDiet?.supplements);
  const hasDietWakeup  = wakeUpFromDiet && (wakeUpFromDiet.description || wakeUpSuppsNorm.length > 0);
  const hasMorningSups = morningSups.length > 0;

  if (!hasDietWakeup && !hasMorningSups) return;

  section.classList.remove('hidden');

  let html = '';

  if (wakeUpFromDiet?.description) {
    html += `<div class="nsf-desc">${_esc(wakeUpFromDiet.description)}</div>`;
  }

  // Suplementos del schema nuevo (diet.wakeUp.supplements)
  const dietWakeSupps = wakeUpSuppsNorm;
  // Suplementos de la colección supplements con timing:morning
  const allSupps = [
    ...dietWakeSupps.map(s => ({ ...s, _source: 'diet' })),
    ...morningSups.filter(ms => !dietWakeSupps.some(ds => ds.name === ms.name)),
  ];

  if (allSupps.length) {
    html += `<div class="nsf-supps">${allSupps.map(s =>
 `<span class="nsf-supp-pill">${ICON.pill}<span>${_esc(s.name)}${s.dose ? ` ${s.dose}${s.unit || ''}` : ''}</span></span>`
    ).join('')}</div>`;
  }

  bodyEl.innerHTML = html;
}

// ── ③ Comidas ─────────────────────────────────────
async function _renderMeals(container, profile, diet) {
  const listEl = container.querySelector('#nutrition-meals-list');
  const today  = todayString();

  // Obtener registro de hoy
  let todayData = {};
  try {
    const snap = await collections.meals(profile.uid).doc(today).get();
    todayData = snap.exists ? snap.data() : {};
  } catch { /* sin registro */ }

  // Determinar comidas desde schema nuevo o construir fallback
  let meals = [];
  if (diet?.meals && diet.meals.length > 0) {
    meals = diet.meals;
  } else {
    const count = diet?.mealCount || 3;
    meals = _defaultMeals(count);
  }

  if (!meals.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">${ICON.bowl}</div><div class="empty-title">Sin comidas configuradas</div></div>`;
    return;
  }

  listEl.innerHTML = meals.map((meal, i) => _buildMealBtn(meal, i, todayData)).join('');

  // Bind accordions de comidas + checkbox completar
  meals.forEach((meal, i) => {
    const btnId  = `btn-meal-${i}`;
    const accId  = `acc-meal-${i}`;
    const arrowId = `arrow-meal-${i}`;
    const btn  = listEl.querySelector(`#${btnId}`);
    const acc  = listEl.querySelector(`#${accId}`);
    const arrow = listEl.querySelector(`#${arrowId}`);

    btn?.addEventListener('click', () => {
      const open = btn.dataset.open === 'true';
      btn.dataset.open = open ? 'false' : 'true';
      acc?.classList.toggle('hidden', open);
      if (arrow) arrow.textContent = open ? '›' : '⌄';
    });

    // Checkbox completar
    const chk = listEl.querySelector(`#chk-meal-${i}`);
    chk?.addEventListener('change', async (e) => {
      e.stopPropagation();
      const key = `meal_${i + 1}`;
      try {
        await collections.meals(profile.uid).doc(today).set(
          { [key]: { completed: e.target.checked, completedAt: timestamp() } },
          { merge: true }
        );
        btn?.classList.toggle('nmb-completed', e.target.checked);
        // Actualizar visual del checkbox inline (icono SVG)
        const boxEl = chk.closest('.nmb-check-label')?.querySelector('.nmb-check-box');
        if (boxEl) boxEl.innerHTML = e.target.checked ? ICON.check : ICON.circle;
        toast(e.target.checked ? 'Comida marcada' : 'Comida desmarcada', 'success');
      } catch (err) {
        toast('Error: ' + err.message, 'error');
        e.target.checked = !e.target.checked;
      }
    });

    // Icono suplementos de comida
    const suppBtn = listEl.querySelector(`#btn-meal-supps-${i}`);
    const mealSupps = Array.isArray(meal.supplements) ? meal.supplements : (typeof meal.supplements === 'string' && meal.supplements.trim() ? [{ name: meal.supplements }] : []);
    if (suppBtn && mealSupps.length) {
      suppBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _openMealSuppsModal(meal.label || `Comida ${i + 1}`, mealSupps);
      });
    }
  });
}

function _buildMealBtn(meal, i, todayData) {
  const key       = `meal_${i + 1}`;
  const logged    = todayData[key];
  const completed = logged?.completed === true;
  const label     = meal.label || `Comida ${i + 1}`;
  const supps     = Array.isArray(meal.supplements) ? meal.supplements : (typeof meal.supplements === 'string' && meal.supplements.trim() ? [{ name: meal.supplements }] : []);
  const hasSups   = supps.length > 0;
  const desc      = meal.description || meal.content || '';

  return `
    <div class="nutrition-meal-item">
      <div class="nutrition-meal-btn ${completed ? 'nmb-completed' : ''}" id="btn-meal-${i}" data-open="false" role="button" tabindex="0">
        <span class="nmb-icon">${_mealIconFor(meal, i)}</span>
        <span class="nmb-label">${_esc(label)}</span>
        <span class="nmb-actions">
          ${hasSups ? `<span class="nmb-supp-icon" id="btn-meal-supps-${i}" title="Ver suplementos">${ICON.pill}</span>` : ''}
          <label class="nmb-check-label" title="Marcar completada" onclick="event.stopPropagation()">
            <input type="checkbox" class="nmb-check" id="chk-meal-${i}" ${completed ? 'checked' : ''}>
            <span class="nmb-check-box">${completed ? ICON.check : ICON.circle}</span>
          </label>
        </span>
        <span class="nmb-arrow" id="arrow-meal-${i}">›</span>
      </div>
      <div class="nutrition-meal-accordion hidden" id="acc-meal-${i}">
        ${desc
          ? `<div class="nma-desc">${_esc(desc)}</div>`
          : `<div class="nma-empty">Sin descripción configurada</div>`}
        ${hasSups ? `
          <div class="nma-supps-section">
            <div class="nma-supps-title">${ICON.pill}<span>Suplementos</span></div>
            ${supps.map(s =>
 `<div class="nma-supp-row">
                <span>${ICON.pill}</span>
                <span>${_esc(s.name)}</span>
                ${s.dose ? `<span class="nma-supp-dose">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
              </div>`
            ).join('')}
          </div>` : ''}
      </div>
    </div>
 `;
}

function _defaultMeals(count) {
  const all = [
    { label: 'Desayuno',       iconKey: 'sun' },
    { label: 'Media mañana',   iconKey: 'apple' },
    { label: 'Almuerzo',       iconKey: 'meal' },
    { label: 'Merienda',       iconKey: 'sandwich' },
    { label: 'Cena',           iconKey: 'moon' },
  ];
  if (count === 3) return [all[0], all[2], all[4]];
  if (count === 4) return [all[0], all[2], all[3], all[4]];
  return all.slice(0, count);
}

// Elige el icono de una comida según su label o iconKey
function _mealIconFor(meal, i) {
  if (meal?.iconKey && ICON[meal.iconKey]) return ICON[meal.iconKey];
  const lbl = (meal?.label || '').toLowerCase();
  if (/desayuno|wake|morning/.test(lbl)) return ICON.sun;
  if (/media ma[ñn]ana|snack|tentempi|fruta/.test(lbl)) return ICON.apple;
  if (/merienda/.test(lbl)) return ICON.sandwich;
  if (/cena|noche|sleep/.test(lbl)) return ICON.moon;
  return ICON.meal;
}

function _openMealSuppsModal(mealLabel, supps) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title" style="display:inline-flex;align-items:center;gap:8px">${ICON.pill}<span>${_esc(mealLabel)} — Suplementos</span></h3>
      <button class="modal-close" aria-label="Cerrar">${ICON.close}</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      ${supps.map(s => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md)">
          <span class="nma-supp-icon-wrap">${ICON.pill}</span>
          <div>
            <div style="font-weight:700">${_esc(s.name)}</div>
            ${s.dose ? `<div style="font-size:12px;color:var(--color-text-muted)">${_esc(s.dose)}${_esc(s.unit||'')}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>
 `;
  openModal(html);
}

// Normaliza suplementos: string → [{name}], array → as-is, falsy → []
function _normSupps(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return [{ name: val }];
  return [];
}

// ── ④ Entreno ─────────────────────────────────────
function _renderWorkout(container, diet, suppsByTiming) {
  const preSupps  = _normSupps(diet?.workout?.pre).concat(_normSupps(suppsByTiming['pre']), _normSupps(suppsByTiming['preworkout']));
  const postSupps = _normSupps(diet?.workout?.post).concat(_normSupps(suppsByTiming['post']), _normSupps(suppsByTiming['postworkout']));

  if (!preSupps.length && !postSupps.length) return;

  container.querySelector('#section-workout')?.classList.remove('hidden');

  const bodyEl = container.querySelector('#acc-workout-body');
  if (!bodyEl) return;

  let html = '';
  if (preSupps.length) {
    html += `<div class="nma-supps-title">${ICON.bolt}<span>Pre-entreno</span></div>`;
    html += preSupps.map(s =>
 `<div class="nma-supp-row">
        <span>${ICON.pill}</span>
        <span>${_esc(s.name)}</span>
        ${s.dose ? `<span class="nma-supp-dose">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
      </div>`
    ).join('');
  }
  if (postSupps.length) {
    html += `<div class="nma-supps-title" style="margin-top:12px">${ICON.refresh}<span>Post-entreno</span></div>`;
    html += postSupps.map(s =>
 `<div class="nma-supp-row">
        <span>${ICON.pill}</span>
        <span>${_esc(s.name)}</span>
        ${s.dose ? `<span class="nma-supp-dose">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
      </div>`
    ).join('');
  }

  bodyEl.innerHTML = html;
}

// ── ⑤ Pre-sleep ───────────────────────────────────
function _renderPreSleep(container, diet, nightSupps) {
  const preSleepData = diet?.preSleep;
  const lastMeal     = diet?.meals?.at(-1);
  const lastIsPreSleep = lastMeal?.isPreSleep === true;

  const preSleepSupps = _normSupps(preSleepData?.supplements);
  const hasContent = preSleepData?.description
    || preSleepSupps.length
    || nightSupps.length
    || lastIsPreSleep;

  if (!hasContent) return;

  container.querySelector('#section-presleep')?.classList.remove('hidden');

  const bodyEl = container.querySelector('#acc-presleep-body');
  if (!bodyEl) return;

  let html = '';

  if (lastIsPreSleep && lastMeal.description) {
    html += `<div class="nma-desc"><strong>Última comida:</strong> ${_esc(lastMeal.description)}</div>`;
  }

  if (preSleepData?.description) {
    html += `<div class="nma-desc">${_esc(preSleepData.description)}</div>`;
  }

  const allNightSupps = [
    ...preSleepSupps,
    ...nightSupps.filter(ns =>
      !preSleepSupps.some(ds => ds.name === ns.name)
    ),
  ];

  if (allNightSupps.length) {
    html += `<div class="nma-supps-title">${ICON.moon}<span>Suplementos</span></div>`;
    html += allNightSupps.map(s =>
 `<div class="nma-supp-row">
        <span>${ICON.pill}</span>
        <span>${_esc(s.name)}</span>
        ${s.dose ? `<span class="nma-supp-dose">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
      </div>`
    ).join('');
  }

  bodyEl.innerHTML = html;
}

// ── Helpers ───────────────────────────────────────
function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
