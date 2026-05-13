/* ═══════════════════════════════════════════════
   TGWL — modules/alimentacion.js  (v3 · Feedback v6)
   Nutrición · Plan + Historial
   ▸ Tab bar (Plan / Historial) — paralelo a Entrenos
   ▸ Bento macros card (kcal + 3 macros + progress)
   ▸ Meal cards expandibles · food rows con check individual
   ▸ Supplement cards independientes
   ▸ Bloques Pre/Intra/Post Entreno al final
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp, db } from '../firebase-config.js';
import { toast, todayString, msUntilLocalMidnight } from '../utils.js';
import { openModal, closeModal } from '../components/modal.js';
import { t } from '../i18n.js';

// ── SVG Icons (stroke-width 1.5, currentColor) ────
const ICON = {
  pill:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`,
  meal:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M7 3v6M5 3v6M9 3v6"/><path d="M17 3c-1.5 0-3 1-3 4v5h3v9"/></svg>`,
  apple:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7c-1-2-3-3-5-3-3 0-5 2.5-5 6 0 5 4 11 6 11 1 0 2-1 3-1s2 1 3 1c2 0 6-6 6-11 0-3.5-2-6-5-6-2 0-4 1-3 3z"/><path d="M12 7c0-2 1-4 3-4"/></svg>`,
  sun:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`,
  moon:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  bolt:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  barbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M17.5 6.5H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.5"/><rect x="6.5" y="4" width="3" height="16" rx="1.5"/><rect x="14.5" y="4" width="3" height="16" rx="1.5"/><line x1="9.5" y1="12" x2="14.5" y2="12"/></svg>`,
  dots:    `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>`,
  checkSm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 7"/></svg>`,
  // §26 placeholders — generic (plato for meals, cápsula for supplements)
  plate:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>`,
  bowl:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M7 11a5 5 0 0 1 10 0"/></svg>`,
};

// ── Chronological order ───────────────────────────
const MEAL_ORDER_KEYS = [
  { test: /(al\s*despertar|wake)/i,          rank: 0,  icon: 'sun' },
  { test: /desayuno|breakfast/i,             rank: 10, icon: 'sun' },
  { test: /media\s*ma[ñn]ana|snack\s*1/i,    rank: 20, icon: 'apple' },
  { test: /almuerzo|comida|lunch/i,          rank: 30, icon: 'meal' },
  { test: /merienda|snack\s*2/i,             rank: 40, icon: 'apple' },
  { test: /cena|dinner/i,                    rank: 50, icon: 'moon' },
  { test: /antes\s*de\s*acostar|pre.?sleep/i,rank: 60, icon: 'moon' },
];

function _mealMeta(label) {
  for (const m of MEAL_ORDER_KEYS) {
    if (m.test.test(label || '')) return m;
  }
  return { rank: 35, icon: 'meal' };
}

// §27 · Compute which meal block matches the current time slot
function _autoExpandKey(blocks) {
  const meals = blocks.filter(b => b.kind === 'meal');
  if (!meals.length) return null;
  const h = new Date().getHours();
  let targetRank;
  if (h < 9)       targetRank = 0;   // 0-8 · Al despertar / Desayuno
  else if (h < 12) targetRank = 20;  // 9-11 · Media mañana
  else if (h < 16) targetRank = 30;  // 12-15 · Almuerzo
  else if (h < 19) targetRank = 40;  // 16-18 · Merienda
  else if (h < 23) targetRank = 50;  // 19-22 · Cena
  else             targetRank = 55;  // 23-04 · Antes de acostarse
  let closest = meals[0];
  let minDiff = Math.abs(closest.rank - targetRank);
  for (const b of meals) {
    const d = Math.abs(b.rank - targetRank);
    if (d < minDiff) { minDiff = d; closest = b; }
  }
  return closest.key;
}

// ── Parse description into food rows ──────────────
// "40gr de aguacate" → {qty:"40 gramos", name:"Aguacate"}
function _parseFoods(description) {
  if (!description) return [];
  return description.split(/\r?\n+/).map(l => l.trim()).filter(Boolean).map(line => {
    // Match: number + optional unit + optional "de" + name
    const m = line.match(/^([\d.,]+\s*(?:gr?|g|ml|kcal|kg|unidades?|latas?|cuchar\w+|tazas?|cucharadas?|piezas?|porciones?)?)\s*(?:de\s+)?(.+)$/i);
    if (m) {
      const rawQty = m[1].trim();
      // Normalize "40gr" → "40 gramos"
      let qty = rawQty.replace(/^([\d.,]+)\s*gr?$/i, '$1 gramos');
      qty = qty.replace(/^([\d.,]+)\s*g$/i, '$1 gramos');
      const name = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
      return { qty, name, raw: line };
    }
    return { qty: '', name: line.charAt(0).toUpperCase() + line.slice(1).toLowerCase(), raw: line };
  });
}

// ── Build food list — prefer meal.foods array, fall back to parse ──
function _foodsOf(meal) {
  if (Array.isArray(meal?.foods) && meal.foods.length) {
    return meal.foods.map((f, i) => ({
      idx: i,
      qty:  f.quantity || (f.amount ? `${f.amount}${f.unit ? ' ' + f.unit : ''}` : ''),
      name: (f.name || '').charAt(0).toUpperCase() + (f.name || '').slice(1).toLowerCase(),
      kcal: f.kcal || f.calories || 0,
      protein: f.protein || 0,
      carbs:   f.carbs || f.carbohydrates || 0,
      fat:     f.fat || f.fats || 0,
    }));
  }
  return _parseFoods(meal?.description || meal?.content || '').map((f, i) => ({
    idx: i, qty: f.qty, name: f.name, kcal: 0, protein: 0, carbs: 0, fat: 0,
  }));
}

// ══════════════════════════════════════════════
//  RENDER — Plan / Historial tab bar
// ══════════════════════════════════════════════
export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="alimentacion-page">
      <div style="padding:var(--page-pad)">

        <!-- §23 · Tab bar (Plan / Historial) -->
        <div class="tab-bar-underline" id="nutricion-tab-bar" style="margin-bottom:var(--space-md)">
          <button class="tab-btn-underline active" data-tab="plan">Plan</button>
          <button class="tab-btn-underline" data-tab="historial">Historial</button>
        </div>

        <!-- Plan tab -->
        <div id="tab-nutricion-plan" class="tab-content">
          <div id="nutricion-plan-container">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>

        <!-- Historial tab -->
        <div id="tab-nutricion-historial" class="tab-content hidden">
          <div id="nutricion-historial-container">
            <div class="empty-state" style="padding:48px 16px">
              <div class="empty-title">Sin historial todavía</div>
              <div class="empty-subtitle">Aquí se mostrarán los días registrados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Timer global reset to midnight
let _midnightTimer = null;
let _historialLoaded = false;

function _scheduleMidnightReset(container) {
  if (_midnightTimer) { clearTimeout(_midnightTimer); _midnightTimer = null; }
  const ms = msUntilLocalMidnight();
  _midnightTimer = setTimeout(async () => {
    try {
      const stillMounted = container && container.isConnected && container.querySelector('#nutricion-plan-container');
      if (stillMounted) {
        await _loadPlanTab(container);
        toast('Nuevo día — Plan reiniciado', 'info');
      }
    } catch (_) { /* noop */ }
    _scheduleMidnightReset(container);
  }, ms);
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
export async function init(container) {
  // Tab indicator math
  function updateIndicator(activeBtn) {
    const bar = document.getElementById('nutricion-tab-bar');
    if (!bar || !activeBtn) return;
    requestAnimationFrame(() => {
      const btnRect = activeBtn.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      bar.style.setProperty('--indicator-width',  btnRect.width + 'px');
      bar.style.setProperty('--indicator-offset', (btnRect.left - barRect.left) + 'px');
    });
  }

  const tabBtns = container.querySelectorAll('.tab-btn-underline');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('#alimentacion-page .tab-content').forEach(tc => tc.classList.add('hidden'));
      const target = container.querySelector('#tab-nutricion-' + btn.dataset.tab);
      if (target) target.classList.remove('hidden');
      updateIndicator(btn);
    });
  });

  const activeTab = container.querySelector('.tab-btn-underline.active');
  if (activeTab) setTimeout(() => updateIndicator(activeTab), 50);

  // Load Plan tab content
  await _loadPlanTab(container);

  _scheduleMidnightReset(container);
}

// ══════════════════════════════════════════════
//  PLAN TAB — load data, render bento + blocks
// ══════════════════════════════════════════════
async function _loadPlanTab(container) {
  const planEl = container.querySelector('#nutricion-plan-container');
  if (!planEl) return;
  const profile = getUserProfile();

  try {
    const [dietSnap, suppSnap, todaySnap] = await Promise.all([
      collections.dietas(profile.uid).orderBy('assignedAt', 'desc').limit(1).get(),
      collections.supplements(profile.uid).get().catch(() => null),
      collections.meals(profile.uid).doc(todayString()).get().catch(() => null),
    ]);

    const diet      = !dietSnap.empty ? dietSnap.docs[0].data() : null;
    const suppDocs  = suppSnap ? suppSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const todayData = todaySnap && todaySnap.exists ? todaySnap.data() : {};

    // Targets from diet
    const targets = {
      kcal:    diet?.calories ?? diet?.kcal ?? 0,
      protein: diet?.protein  ?? diet?.proteins ?? 0,
      carbs:   diet?.carbs    ?? diet?.carbohydrates ?? 0,
      fat:     diet?.fat      ?? diet?.fats ?? 0,
    };

    // Compose all blocks
    const blocks = _composeBlocks(diet, suppDocs);

    // Initial totals from checked foods
    const totals = _computeTotals(blocks, todayData);

    // §27 · Auto-expand current time slot meal
    const autoExpandKey = _autoExpandKey(blocks);

    planEl.innerHTML = `
      <!-- §24 · Bento macros -->
      <div id="macro-bento">${_buildBentoMacros(totals, targets)}</div>

      <!-- §25–§27 · Bloques (comidas + suplementos + entreno) -->
      <div id="meal-blocks" style="display:flex;flex-direction:column;gap:10px;margin-top:16px;padding-bottom:24px">
        ${blocks.map((b, i) => _buildBlock(b, i, todayData, autoExpandKey)).join('')}
      </div>
    `;

    // Wire interactions
    _wireBlocks(planEl, blocks, todayData, targets, profile);
  } catch (e) {
    planEl.innerHTML = `<p class="text-muted" style="padding:16px">Error cargando plan: ${e.message}</p>`;
  }
}

// ── Compose ordered blocks ────────────────────────
function _composeBlocks(diet, suppDocs) {
  const blocks = [];

  // Pre-bucket supplements by timing
  const suppByTiming = {};
  suppDocs.forEach(s => {
    const k = (s.timing || 'anytime').toLowerCase();
    (suppByTiming[k] = suppByTiming[k] || []).push(s);
  });
  const morningSupps = suppByTiming['morning'] || [];
  const nightSupps   = suppByTiming['night']   || [];

  // Wake-up block (diet.wakeUp + collection supps with timing:morning)
  const dietWake = _normSupps(diet?.wakeUp?.supplements);
  const wakeSupps = [
    ...dietWake,
    ...morningSupps
      .map(s => ({ name: s.name, dose: s.dose, unit: s.unit }))
      .filter(s => !dietWake.some(d => d.name === s.name)),
  ];
  if (diet?.wakeUp?.description || wakeSupps.length) {
    blocks.push({
      kind: 'meal',
      key:  'wakeup',
      label:'Al despertar',
      icon: 'sun',
      description: diet?.wakeUp?.description || '',
      foods: diet?.wakeUp?.foods || [],
      supplements: wakeSupps,
      rank: 0,
    });
  }

  // Meals from diet.meals
  const meals = Array.isArray(diet?.meals) ? diet.meals : [];
  meals.forEach((m, i) => {
    const meta = _mealMeta(m.label || `Comida ${i+1}`);
    blocks.push({
      kind: 'meal',
      key:  `meal_${i+1}`,
      label: m.label || `Comida ${i+1}`,
      icon: m.iconKey || meta.icon,
      image: m.image || null,
      description: m.description || m.content || '',
      foods: m.foods || [],
      supplements: _normSupps(m.supplements),
      rank: meta.rank + i * 0.01, // preserve order ties
    });
  });

  // Pre-sleep (diet.preSleep + collection supps with timing:night)
  const dietSleep = _normSupps(diet?.preSleep?.supplements);
  const sleepSupps = [
    ...dietSleep,
    ...nightSupps
      .map(s => ({ name: s.name, dose: s.dose, unit: s.unit }))
      .filter(s => !dietSleep.some(d => d.name === s.name)),
  ];
  if (diet?.preSleep?.description || sleepSupps.length) {
    blocks.push({
      kind: 'meal',
      key:  'presleep',
      label:'Antes de acostarse',
      icon: 'moon',
      description: diet?.preSleep?.description || '',
      foods: diet?.preSleep?.foods || [],
      supplements: sleepSupps,
      rank: 55,
    });
  }

  // Sort meals chronologically
  blocks.sort((a, b) => a.rank - b.rank);

  // §26 · Workout supplement blocks — always at the end
  const pre  = [..._normSupps(diet?.workout?.pre),   ...(suppByTiming.pre || []),  ...(suppByTiming.preworkout || [])];
  const intra= [..._normSupps(diet?.workout?.intra), ...(suppByTiming.intra || []),...(suppByTiming.intraworkout || [])];
  const post = [..._normSupps(diet?.workout?.post),  ...(suppByTiming.post || []), ...(suppByTiming.postworkout || [])];

  if (pre.length)  blocks.push({ kind: 'workout', key: 'pre',   label: 'Pre Entreno',   icon: 'bolt',    supplements: pre  });
  if (intra.length)blocks.push({ kind: 'workout', key: 'intra', label: 'Intra Entreno', icon: 'barbell', supplements: intra});
  if (post.length) blocks.push({ kind: 'workout', key: 'post',  label: 'Post Entreno',  icon: 'refresh', supplements: post });

  return blocks;
}

// ── Compute totals from checked items ────────────
function _computeTotals(blocks, todayData) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  blocks.forEach(b => {
    if (b.kind !== 'meal') return;
    const foods = _foodsOf(b);
    const checks = todayData[b.key]?.foods || {};
    foods.forEach(f => {
      if (checks[`f${f.idx}`]) {
        t.kcal    += Number(f.kcal) || 0;
        t.protein += Number(f.protein) || 0;
        t.carbs   += Number(f.carbs) || 0;
        t.fat     += Number(f.fat) || 0;
      }
    });
  });
  return t;
}

// ══════════════════════════════════════════════
//  §24 · Bento macros card
// ══════════════════════════════════════════════
function _buildBentoMacros(totals, targets) {
  return `
    <div style="background:var(--color-background-primary,var(--glass-bg));
                border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                border-radius:14px;padding:14px 16px">
      <!-- Row 1 · kcal full width -->
      <div data-macro="kcal" style="margin-bottom:14px">
        ${_macroCell('Kilocalorías', totals.kcal, targets.kcal, 'kcal', true)}
      </div>
      <!-- Row 2 · 3 macros -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div data-macro="protein">${_macroCell('Proteínas', totals.protein, targets.protein, 'g', false)}</div>
        <div data-macro="carbs">${_macroCell('Carbs',      totals.carbs,   targets.carbs,   'g', false)}</div>
        <div data-macro="fat">${_macroCell('Grasas',       totals.fat,     targets.fat,     'g', false)}</div>
      </div>
    </div>
  `;
}

function _macroCell(label, consumed, target, unit, isBig) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const over = target > 0 && consumed > target;
  const valSize   = isBig ? '22px' : '13px';
  const valWeight = isBig ? '600'  : '500';
  const barH = isBig ? '4px' : '3px';
  const barR = isBig ? '2px' : '1.5px';
  const tail = isBig ? ' kcal' : ' g';

  return `
    <div style="font-family:'SF Pro Text',var(--font-sans);font-size:11px;font-weight:500;
                color:var(--color-text-tertiary,var(--color-text-muted));margin-bottom:4px">${label}</div>
    <div style="font-family:'SF Pro Display',var(--font-sans);font-size:${valSize};font-weight:${valWeight};
                color:var(--color-text-primary,var(--color-text));line-height:1.1;margin-bottom:8px">
      <span data-consumed>${_fmtNum(consumed)}</span><span style="color:var(--color-text-tertiary,var(--color-text-muted))"> / ${_fmtNum(target)}${tail}</span>
    </div>
    <div style="height:${barH};width:100%;background:var(--color-background-secondary,rgba(255,255,255,0.08));
                border-radius:${barR};overflow:hidden">
      <div data-fill style="height:100%;width:${pct.toFixed(2)}%;
                            background:${over ? '#C10801' : 'var(--macro-fill,#111111)'};
                            border-radius:${barR};transition:width 400ms ease,background 200ms ease"></div>
    </div>
  `;
}

function _fmtNum(n) {
  const v = Number(n) || 0;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

// ══════════════════════════════════════════════
//  §25–§27 · Build a block (meal | workout)
// ══════════════════════════════════════════════
function _buildBlock(block, i, todayData, autoExpandKey) {
  const isWorkout = block.kind === 'workout';
  const foods     = isWorkout ? [] : _foodsOf(block);
  const checks    = todayData[block.key]?.foods || {};
  const allDone   = foods.length > 0 && foods.every(f => checks[`f${f.idx}`]);
  // §27 · Default collapsed; auto-expand current time slot unless user toggled
  const userToggled = typeof todayData[block.key]?.expanded === 'boolean';
  const expanded  = userToggled
    ? todayData[block.key].expanded
    : block.key === autoExpandKey;
  const hasSupps  = block.supplements && block.supplements.length > 0;

  return `
    <div class="meal-card" data-block-idx="${i}" data-block-key="${block.key}"
         style="background:var(--color-background-primary,var(--glass-bg));
                border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                border-radius:14px;overflow:hidden">
      <!-- Header (collapsed) -->
      <div class="meal-card-header" role="button" tabindex="0"
           style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer">
        ${_blockImage(block)}
        <div class="meal-card-title" style="flex:1;min-width:0;font-family:'SF Pro Text',var(--font-sans);
                                            font-size:14px;font-weight:500;
                                            color:var(--color-text-primary,var(--color-text));
                                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${_esc(block.label)}
        </div>
        ${!isWorkout ? _headerCheckIndicator(allDone) : ''}
        <span class="meal-card-dots" style="width:18px;height:18px;display:inline-flex;
                                            color:var(--color-text-tertiary,var(--color-text-muted))">${ICON.dots}</span>
      </div>

      <!-- Expanded body -->
      <div class="meal-card-body" data-expanded="${expanded?'true':'false'}"
           style="max-height:${expanded?'2000px':'0'};overflow:hidden;
                  transition:max-height 280ms ease;
                  border-top:${expanded?'0.5px solid var(--color-border-tertiary,var(--glass-border))':'0.5px solid transparent'}">
        ${_buildBlockBody(block, foods, checks, hasSupps, isWorkout)}
      </div>
    </div>
  `;
}

function _headerCheckIndicator(done) {
  // §27 · 18×18 check circle, NON-interactive
  if (done) {
    return `<span class="meal-card-state-check" data-done="true"
            style="width:18px;height:18px;border-radius:50%;display:inline-flex;
                   align-items:center;justify-content:center;
                   background:var(--fill-on);color:var(--fill-on-contrast);flex-shrink:0">
            <span style="width:10px;height:10px;display:inline-flex">${ICON.checkSm}</span>
            </span>`;
  }
  return `<span class="meal-card-state-check" data-done="false"
          style="width:18px;height:18px;border-radius:50%;
                 border:0.5px solid var(--color-border-secondary,var(--glass-border));
                 background:transparent;flex-shrink:0"></span>`;
}

function _blockImage(block) {
  if (block.image) {
    return `<img src="${_esc(block.image)}" alt=""
                style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0"
                onerror="this.replaceWith(Object.assign(document.createElement('div'),{innerHTML:\`<div style='width:44px;height:44px;border-radius:8px;background:var(--color-background-secondary,rgba(255,255,255,0.08));display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary,var(--color-text-muted));flex-shrink:0'><svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 11h18a9 9 0 0 1-18 0z'/><path d='M7 11a5 5 0 0 1 10 0'/></svg></div>\`}).firstChild)">`;
  }
  // §26 · Generic placeholder — plato for meals, cápsula for supplements
  const genericIcon = block.kind === 'workout' ? ICON.pill : ICON.plate;
  return `<div style="width:44px;height:44px;border-radius:8px;
                      background:var(--color-background-secondary,rgba(255,255,255,0.08));
                      display:flex;align-items:center;justify-content:center;
                      color:var(--color-text-tertiary,var(--color-text-muted));flex-shrink:0">
            <span style="width:20px;height:20px;display:inline-flex">${genericIcon}</span>
          </div>`;
}

function _buildBlockBody(block, foods, checks, hasSupps, isWorkout) {
  let html = '';

  if (isWorkout) {
    // Workout block · just supplements
    html += `<div style="padding:4px 0">`;
    html += block.supplements.map((s, i) => _suppRow(s, i === block.supplements.length - 1)).join('');
    html += `</div>`;
    return html;
  }

  // Food rows
  if (foods.length) {
    foods.forEach((f, i) => {
      const isLast = i === foods.length - 1 && !hasSupps;
      const checked = !!checks[`f${f.idx}`];
      html += _foodRow(f, checked, isLast);
    });
  } else if (block.description) {
    // No structured foods — render description as plain text
    html += `<div style="padding:14px 16px;font-family:'SF Pro Text',var(--font-sans);
                         font-size:13px;color:var(--color-text-primary,var(--color-text));
                         white-space:pre-wrap">${_esc(block.description)}</div>`;
  }

  // Supplements section
  if (hasSupps) {
    html += `<div style="padding:6px 0">`;
    html += `<div style="padding:10px 16px 6px;font-family:'SF Pro Text',var(--font-sans);
                         font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;
                         color:var(--color-text-tertiary,var(--color-text-muted));
                         display:flex;align-items:center;gap:8px">
              <span style="width:14px;height:14px;display:inline-flex">${ICON.pill}</span>
              <span>Suplementos</span>
            </div>`;
    html += block.supplements.map((s, i) => _suppRow(s, i === block.supplements.length - 1)).join('');
    html += `</div>`;
  }

  return html;
}

function _foodRow(f, checked, isLast) {
  return `
    <div data-food-idx="${f.idx}" data-checked="${checked?'true':'false'}"
         style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                ${isLast?'':'border-bottom:0.5px solid var(--color-border-tertiary,var(--glass-border))'}">
      <div style="flex:1;min-width:0">
        <div style="font-family:'SF Pro Text',var(--font-sans);font-size:13px;font-weight:400;
                    color:var(--color-text-primary,var(--color-text))">${_esc(f.name)}</div>
        ${f.qty ? `<div style="font-family:'SF Pro Text',var(--font-sans);font-size:12px;
                              color:var(--color-text-tertiary,var(--color-text-muted));margin-top:2px">${_esc(f.qty)}</div>` : ''}
      </div>
      ${f.kcal ? `<span style="font-family:'SF Pro Text',var(--font-sans);font-size:12px;
                                color:var(--color-text-secondary,var(--color-text-muted));margin-right:12px">
                    ${Math.round(f.kcal)} kcal</span>` : ''}
      <button class="food-check" data-food-idx="${f.idx}" aria-label="Marcar"
              style="width:22px;height:22px;border-radius:50%;
                     ${checked
                       ? 'background:var(--fill-on);border:0.5px solid var(--fill-on);color:var(--fill-on-contrast)'
                       : 'background:transparent;border:0.5px solid var(--color-border-secondary,var(--glass-border));color:transparent'};
                     display:inline-flex;align-items:center;justify-content:center;
                     cursor:pointer;flex-shrink:0;padding:0;transition:background 150ms ease,border-color 150ms ease,color 150ms ease">
        <span style="width:12px;height:12px;display:inline-flex">${ICON.checkSm}</span>
      </button>
    </div>
  `;
}

function _suppRow(s, isLast) {
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;
                ${isLast?'':'border-bottom:0.5px solid var(--color-border-tertiary,var(--glass-border))'}">
      <span style="width:16px;height:16px;display:inline-flex;
                   color:var(--color-text-tertiary,var(--color-text-muted));flex-shrink:0">${ICON.pill}</span>
      <span style="font-family:'SF Pro Text',var(--font-sans);font-size:13px;
                   color:var(--color-text-primary,var(--color-text));flex:1">${_esc(s.name)}</span>
      ${s.dose ? `<span style="font-family:'SF Pro Text',var(--font-sans);font-size:12px;
                                color:var(--color-text-tertiary,var(--color-text-muted))">${_esc(s.dose)}${_esc(s.unit||'')}</span>` : ''}
    </div>
  `;
}

// ══════════════════════════════════════════════
//  WIRE — expand/collapse + food checks
// ══════════════════════════════════════════════
function _wireBlocks(planEl, blocks, todayData, targets, profile) {
  // Expand/collapse on header click
  planEl.querySelectorAll('.meal-card').forEach(card => {
    const header = card.querySelector('.meal-card-header');
    const body   = card.querySelector('.meal-card-body');
    if (!header || !body) return;
    header.addEventListener('click', () => {
      const open = body.dataset.expanded === 'true';
      body.dataset.expanded = open ? 'false' : 'true';
      body.style.maxHeight  = open ? '0' : '2000px';
      body.style.borderTop  = open
        ? '0.5px solid transparent'
        : '0.5px solid var(--color-border-tertiary,var(--glass-border))';
    });
  });

  // Food check clicks
  planEl.querySelectorAll('.food-check').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card  = btn.closest('.meal-card');
      const idx   = Number(btn.dataset.foodIdx);
      const key   = card.dataset.blockKey;
      const row   = btn.closest('[data-food-idx]');
      const wasChecked = row.dataset.checked === 'true';
      const nowChecked = !wasChecked;

      // Optimistic UI
      row.dataset.checked = nowChecked ? 'true' : 'false';
      if (nowChecked) {
        btn.style.background  = 'var(--fill-on)';
        btn.style.borderColor = 'var(--fill-on)';
        btn.style.color       = 'var(--fill-on-contrast)';
      } else {
        btn.style.background  = 'transparent';
        btn.style.borderColor = 'var(--color-border-secondary,var(--glass-border))';
        btn.style.color       = 'transparent';
      }

      // Save to Firestore
      try {
        const docRef = collections.meals(profile.uid).doc(todayString());
        await docRef.set({
          [key]: { foods: { [`f${idx}`]: nowChecked }, updatedAt: timestamp() }
        }, { merge: true });
        // Update local todayData
        todayData[key] = todayData[key] || {};
        todayData[key].foods = todayData[key].foods || {};
        todayData[key].foods[`f${idx}`] = nowChecked;
      } catch (err) {
        // Revert
        row.dataset.checked = wasChecked ? 'true' : 'false';
        toast('Error guardando: ' + err.message, 'error');
        return;
      }

      // Update bento progress
      const totals = _computeTotals(blocks, todayData);
      _updateBentoProgress(planEl, totals, targets);

      // Update header state check
      const block = blocks.find(b => b.key === key);
      const foods = _foodsOf(block);
      const allDone = foods.length > 0 && foods.every(f => (todayData[key]?.foods || {})[`f${f.idx}`]);
      const stateEl = card.querySelector('.meal-card-state-check');
      if (stateEl) {
        if (allDone) {
          stateEl.dataset.done = 'true';
          stateEl.style.background   = 'var(--fill-on)';
          stateEl.style.borderColor  = 'var(--fill-on)';
          stateEl.style.color        = 'var(--fill-on-contrast)';
          stateEl.style.border       = '';
          stateEl.style.display      = 'inline-flex';
          stateEl.style.alignItems   = 'center';
          stateEl.style.justifyContent = 'center';
          stateEl.innerHTML = `<span style="width:10px;height:10px;display:inline-flex">${ICON.checkSm}</span>`;
        } else {
          stateEl.dataset.done = 'false';
          stateEl.style.background  = 'transparent';
          stateEl.style.border      = '0.5px solid var(--color-border-secondary,var(--glass-border))';
          stateEl.style.color       = 'transparent';
          stateEl.innerHTML = '';
        }
      }
    });
  });
}

function _updateBentoProgress(planEl, totals, targets) {
  const map = [
    { sel: '[data-macro="kcal"]',    val: totals.kcal,    tgt: targets.kcal,    big: true  },
    { sel: '[data-macro="protein"]', val: totals.protein, tgt: targets.protein, big: false },
    { sel: '[data-macro="carbs"]',   val: totals.carbs,   tgt: targets.carbs,   big: false },
    { sel: '[data-macro="fat"]',     val: totals.fat,     tgt: targets.fat,     big: false },
  ];
  map.forEach(m => {
    const el = planEl.querySelector(m.sel);
    if (!el) return;
    const consumedEl = el.querySelector('[data-consumed]');
    const fillEl     = el.querySelector('[data-fill]');
    if (consumedEl) consumedEl.textContent = _fmtNum(m.val);
    if (fillEl) {
      const pct = m.tgt > 0 ? Math.min(100, (m.val / m.tgt) * 100) : 0;
      fillEl.style.width = pct.toFixed(2) + '%';
      const over = m.tgt > 0 && m.val > m.tgt;
      fillEl.style.background = over ? '#C10801' : 'var(--macro-fill,#111111)';
    }
  });
}

// ── Helpers ───────────────────────────────────────
function _normSupps(val) {
  if (Array.isArray(val)) {
    return val.map(v => typeof v === 'string' ? { name: v } : v).filter(v => v && v.name);
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split(/\r?\n+/).map(l => l.trim()).filter(Boolean).map(l => ({ name: l }));
  }
  return [];
}

function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
