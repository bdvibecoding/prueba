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
import { toast, formatDate, todayString } from '../utils.js';
import { openModal, closeModal } from '../components/modal.js';
import { t } from '../i18n.js';

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
          <div class="nsf-icon">🌅</div>
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
          <button class="nutrition-meal-btn" id="btn-workout" data-open="false">
            <span class="nmb-icon">🏋️</span>
            <span class="nmb-label">Suplementación Entreno</span>
            <span class="nmb-arrow" id="arrow-workout">›</span>
          </button>
          <div class="nutrition-meal-accordion hidden" id="acc-workout">
            <div id="acc-workout-body"></div>
          </div>
        </div>

        <!-- ⑤ Botón Antes de acostarse -->
        <div id="section-presleep" class="hidden">
          <button class="nutrition-meal-btn" id="btn-presleep" data-open="false">
            <span class="nmb-icon">🌙</span>
            <span class="nmb-label">Antes de acostarse</span>
            <span class="nmb-arrow" id="arrow-presleep">›</span>
          </button>
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

  bindAccordion('btn-workout',  'acc-workout',  'arrow-workout');
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
  const hasDietWakeup  = wakeUpFromDiet && (wakeUpFromDiet.description || (wakeUpFromDiet.supplements?.length > 0));
  const hasMorningSups = morningSups.length > 0;

  if (!hasDietWakeup && !hasMorningSups) return;

  section.classList.remove('hidden');

  let html = '';

  if (wakeUpFromDiet?.description) {
    html += `<div class="nsf-desc">${_esc(wakeUpFromDiet.description)}</div>`;
  }

  // Suplementos del schema nuevo (diet.wakeUp.supplements)
  const dietWakeSupps = wakeUpFromDiet?.supplements || [];
  // Suplementos de la colección supplements con timing:morning
  const allSupps = [
    ...dietWakeSupps.map(s => ({ ...s, _source: 'diet' })),
    ...morningSups.filter(ms => !dietWakeSupps.some(ds => ds.name === ms.name)),
  ];

  if (allSupps.length) {
    html += `<div class="nsf-supps">${allSupps.map(s =>
      `<span class="nsf-supp-pill">💊 ${_esc(s.name)}${s.dose ? ` ${s.dose}${s.unit || ''}` : ''}</span>`
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
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🥗</div><div class="empty-title">Sin comidas configuradas</div></div>`;
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
        toast(e.target.checked ? 'Comida marcada ✅' : 'Comida desmarcada', 'success');
      } catch (err) {
        toast('Error: ' + err.message, 'error');
        e.target.checked = !e.target.checked;
      }
    });

    // Icono suplementos de comida
    const suppBtn = listEl.querySelector(`#btn-meal-supps-${i}`);
    if (suppBtn && meal.supplements?.length) {
      suppBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _openMealSuppsModal(meal.label || `Comida ${i + 1}`, meal.supplements);
      });
    }
  });
}

function _buildMealBtn(meal, i, todayData) {
  const key       = `meal_${i + 1}`;
  const logged    = todayData[key];
  const completed = logged?.completed === true;
  const label     = meal.label || `Comida ${i + 1}`;
  const hasSups   = meal.supplements && meal.supplements.length > 0;
  const desc      = meal.description || meal.content || '';

  return `
    <div class="nutrition-meal-item">
      <button class="nutrition-meal-btn ${completed ? 'nmb-completed' : ''}" id="btn-meal-${i}" data-open="false">
        <span class="nmb-icon">🍽️</span>
        <span class="nmb-label">${_esc(label)}</span>
        <span class="nmb-actions">
          ${hasSups ? `<button class="nmb-supp-icon" id="btn-meal-supps-${i}" title="Ver suplementos">💊</button>` : ''}
          <label class="nmb-check-label" title="Marcar completada" onclick="event.stopPropagation()">
            <input type="checkbox" class="nmb-check" id="chk-meal-${i}" ${completed ? 'checked' : ''}>
            <span class="nmb-check-box">${completed ? '✅' : '○'}</span>
          </label>
        </span>
        <span class="nmb-arrow" id="arrow-meal-${i}">›</span>
      </button>
      <div class="nutrition-meal-accordion hidden" id="acc-meal-${i}">
        ${desc
          ? `<div class="nma-desc">${_esc(desc)}</div>`
          : `<div class="nma-empty">Sin descripción configurada</div>`}
        ${hasSups ? `
          <div class="nma-supps-section">
            <div class="nma-supps-title">💊 Suplementos</div>
            ${meal.supplements.map(s =>
              `<div class="nma-supp-row">
                <span>💊</span>
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
    { label: 'Desayuno',       icon: '🌅' },
    { label: 'Media mañana',   icon: '🍎' },
    { label: 'Almuerzo',       icon: '🍽️' },
    { label: 'Merienda',       icon: '🥪' },
    { label: 'Cena',           icon: '🌙' },
  ];
  if (count === 3) return [all[0], all[2], all[4]];
  if (count === 4) return [all[0], all[2], all[3], all[4]];
  return all.slice(0, count);
}

function _openMealSuppsModal(mealLabel, supps) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">💊 ${_esc(mealLabel)} — Suplementos</h3>
      <button class="modal-close">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      ${supps.map(s => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md)">
          <span style="font-size:22px">💊</span>
          <div>
            <div style="font-weight:700">${_esc(s.name)}</div>
            ${s.dose ? `<div style="font-size:12px;color:var(--color-text-muted)">${_esc(s.dose)}${_esc(s.unit||'')}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>
  `;
  openModal(html);
}

// ── ④ Entreno ─────────────────────────────────────
function _renderWorkout(container, diet, suppsByTiming) {
  const preSupps  = diet?.workout?.pre  || suppsByTiming['pre']  || suppsByTiming['preworkout']  || [];
  const postSupps = diet?.workout?.post || suppsByTiming['post'] || suppsByTiming['postworkout'] || [];

  if (!preSupps.length && !postSupps.length) return;

  container.querySelector('#section-workout')?.classList.remove('hidden');

  const bodyEl = container.querySelector('#acc-workout-body');
  if (!bodyEl) return;

  let html = '';
  if (preSupps.length) {
    html += `<div class="nma-supps-title">⚡ Pre-entreno</div>`;
    html += preSupps.map(s =>
      `<div class="nma-supp-row">
        <span>💊</span>
        <span>${_esc(s.name)}</span>
        ${s.dose ? `<span class="nma-supp-dose">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
      </div>`
    ).join('');
  }
  if (postSupps.length) {
    html += `<div class="nma-supps-title" style="margin-top:12px">🔄 Post-entreno</div>`;
    html += postSupps.map(s =>
      `<div class="nma-supp-row">
        <span>💊</span>
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

  const hasContent = preSleepData?.description
    || preSleepData?.supplements?.length
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
    ...(preSleepData?.supplements || []),
    ...nightSupps.filter(ns =>
      !(preSleepData?.supplements || []).some(ds => ds.name === ns.name)
    ),
  ];

  if (allNightSupps.length) {
    html += `<div class="nma-supps-title">🌙 Suplementos</div>`;
    html += allNightSupps.map(s =>
      `<div class="nma-supp-row">
        <span>💊</span>
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
