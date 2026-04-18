/* ═══════════════════════════════════════════════
   TGWL — modules/biomedidas.js
   Body Measurements & Biometrics Module
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, todayString, round2, calcBMI, bmiCategory, deltaPercent } from '../utils.js';
import { openModal, closeModal, openSheet } from '../components/modal.js';
import { renderWeightChart, renderBodyFatChart, renderSkinfoldChart, renderPerimetralsChart, renderCompositionChart } from '../components/charts.js';
import { t } from '../i18n.js';

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="biomedidas-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">${t('bio_title')}</h2>
            <p class="page-subtitle">${t('bio_subtitle')}</p>
          </div>
          <button class="btn-primary" id="btn-add-bio" style="padding:10px 16px;font-size:13px;display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:14px;height:14px;flex-shrink:0"><path d="M12 5v14M5 12h14"/></svg>
            Añadir
          </button>
        </div>

        <!-- Fixed Data Row -->
        <div class="quick-stats" id="fixed-stats-row">
          <div class="glass-card stat-card"><div class="stat-value" id="stat-height">—</div><div class="stat-label">${t('bio_height_cm')}</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-weight">—</div><div class="stat-label">${t('bio_weight_kg')}</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-bmi">—</div><div class="stat-label">${t('bio_bmi')}</div></div>
        </div>

        <!-- Tabs -->
        <div class="tab-bar-underline" id="bio-tab-bar">
          <button class="tab-btn-underline active" data-tab="bioimpedancia">${t('bio_tab_bio')}</button>
          <button class="tab-btn-underline" data-tab="pliegues">${t('bio_tab_skinfolds')}</button>
          <button class="tab-btn-underline" data-tab="perimetros">${t('bio_tab_perimetrals')}</button>
        </div>

        <!-- Date Range -->
        <div class="date-range" style="margin-bottom:var(--space-md)">
          <input type="date" id="date-from" value="${getDateMinus(90)}">
          <span>—</span>
          <input type="date" id="date-to" value="${todayString()}">
          <button class="btn-accent" id="btn-apply-range" style="padding:6px 12px;font-size:12px">${t('apply')}</button>
        </div>

        <!-- Tab Content: Bioimpedancia -->
        <div id="tab-bioimpedancia" class="tab-content">
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-bioimpedancia"></canvas></div>
          </div>
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-composition" style="max-height:200px"></canvas></div>
          </div>
          <div class="glass-card" id="bio-readings-table"></div>
        </div>

        <!-- Tab Content: Pliegues -->
        <div id="tab-pliegues" class="tab-content hidden">
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-pliegues"></canvas></div>
          </div>
          <div class="glass-card" id="skinfold-table"></div>
        </div>

        <!-- Tab Content: Perímetros -->
        <div id="tab-perimetros" class="tab-content hidden">
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-perimetros"></canvas></div>
          </div>
          <div class="glass-card" id="perimetral-table"></div>
        </div>
      </div>
    </div>
 `;
}

export async function init(container) {
  const profile = getUserProfile();
  loadFixedStats(container, profile);
  loadBioData(container, profile, getDateMinus(90), todayString());

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
    });
  });

  container.querySelector('#btn-apply-range')?.addEventListener('click', () => {
    const from = container.querySelector('#date-from').value;
    const to   = container.querySelector('#date-to').value;
    if (from && to) loadBioData(container, profile, from, to);
  });

  container.querySelector('#btn-add-bio')?.addEventListener('click', () => openAddBioSheet(profile, container));
}

// ── Load fixed stats ──────────────────────────
function loadFixedStats(container, profile) {
  const height = profile?.height || '—';
  const weight = profile?.weight || '—';
  const bmi    = (profile?.height && profile?.weight) ? calcBMI(parseFloat(weight), parseFloat(height)) : null;

  container.querySelector('#stat-height').textContent = height;
  container.querySelector('#stat-weight').textContent = weight;
  container.querySelector('#stat-bmi').textContent    = bmi ? bmi : '—';
  container.querySelector('#stat-bmi').title = bmi ? bmiCategory(bmi) : '';
}

// ── Load Bio Data ─────────────────────────────
async function loadBioData(container, profile, from, to) {
  try {
    const snap = await collections.biomedidas(profile.uid)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date', 'asc')
      .get();

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Bioimpedancia chart
    const bioData = data.filter(d => d.fatPercent || d.musclePercent || d.weight);
    renderBodyFatChart('chart-bioimpedancia', bioData.map(d => ({
      date: d.date, fatPercent: d.fatPercent, musclePercent: d.musclePercent,
    })));

    // Composition doughnut (latest)
    if (bioData.length) {
      const last = bioData[bioData.length - 1];
      renderCompositionChart('chart-composition',
        last.fatPercent || 0,
        last.musclePercent || 0,
        Math.max(0, 100 - (last.fatPercent || 0) - (last.musclePercent || 0)),
      );
    }

    // Skinfolds chart
    const skinData = data.filter(d => d.skinfolds);
    if (skinData.length) {
      const last = skinData[skinData.length - 1];
      renderSkinfoldChart('chart-pliegues', last.skinfolds || {});
    }

    // Perimetrals chart
    const perimData = data.filter(d => d.perimetrals);
    renderPerimetralsChart('chart-perimetros', perimData.map(d => ({
      date: d.date, ...d.perimetrals,
    })));

    // Tables
    renderBioTable(container, data);
    renderSkinfoldTable(container, data);
    renderPerimetralTable(container, data);

  } catch (e) {
    toast(t('error_loading') + ': ' + e.message, 'error');
  }
}

function renderBioTable(container, data) {
  const el = container.querySelector('#bio-readings-table');
  if (!el) return;
  const rows = data.filter(d => d.fatPercent || d.musclePercent || d.weight).reverse().slice(0, 10);
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('bio_no_bio_data')}</p>`; return; }
  el.innerHTML = `
    <div style="padding:var(--space-md)">
      ${rows.map(d => `
        <div class="bio-row">
          <span class="bio-label">${formatDate(d.date)}</span>
          <span class="bio-value">${d.weight ? d.weight + ' kg' : '—'}</span>
          <span class="bio-value" style="color:#ef4444">${d.fatPercent ? d.fatPercent + '% G' : '—'}</span>
          <span class="bio-value" style="color:#22c55e">${d.musclePercent ? d.musclePercent + '% M' : '—'}</span>
        </div>
 `).join('')}
    </div>
 `;
}

function renderSkinfoldTable(container, data) {
  const el = container.querySelector('#skinfold-table');
  if (!el) return;
  const rows = data.filter(d => d.skinfolds).reverse().slice(0, 5);
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('bio_no_skinfold_data')}</p>`; return; }
  const keys = Object.keys(rows[0].skinfolds || {});
  el.innerHTML = `
    <div style="padding:var(--space-md);overflow-x:auto">
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><th style="text-align:left;color:var(--color-text-muted);padding:6px 4px">${t('date')}</th>
          ${keys.map(k => `<th style="color:var(--color-text-muted);padding:6px 4px">${k}</th>`).join('')}
          <th style="color:var(--color-text-muted);padding:6px 4px">${t('bio_fat_pct')}</th>
        </tr>
        ${rows.map(d => `
          <tr style="border-top:1px solid rgba(255,255,255,0.04)">
            <td style="padding:6px 4px">${formatDate(d.date)}</td>
            ${keys.map(k => `<td style="text-align:center;padding:6px 4px">${d.skinfolds[k] || '—'}</td>`).join('')}
            <td style="text-align:center;padding:6px 4px;color:#ef4444">${d.fatPercentSkinfolds || '—'}%</td>
          </tr>
 `).join('')}
      </table>
    </div>
 `;
}

function renderPerimetralTable(container, data) {
  const el = container.querySelector('#perimetral-table');
  if (!el) return;
  const rows = data.filter(d => d.perimetrals).reverse().slice(0, 8);
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('bio_no_perim_data')}</p>`; return; }
  el.innerHTML = `
    <div style="padding:var(--space-md)">
      ${rows.map(d => {
        const p = d.perimetrals || {};
        return `
          <div class="bio-row">
            <span class="bio-label">${formatDate(d.date)}</span>
            ${p.waist ? `<span class="bio-value">${p.waist} cm <span class="text-muted" style="font-size:10px">${t('bio_waist_abbr')}</span></span>` : ''}
            ${p.hip ? `<span class="bio-value">${p.hip} cm <span class="text-muted" style="font-size:10px">${t('bio_hip_abbr')}</span></span>` : ''}
            ${p.chest ? `<span class="bio-value">${p.chest} cm <span class="text-muted" style="font-size:10px">${t('bio_chest_abbr')}</span></span>` : ''}
          </div>
 `;
      }).join('')}
    </div>
 `;
}

// ── Add Biometrics Sheet ──────────────────────
function openAddBioSheet(profile, container) {
  const today = todayString();
  const html = `
    <h4 style="margin-bottom:var(--space-md)">${t('bio_add_measurements')}</h4>
    <div class="tab-bar-underline tab-bar-underline--sm" id="bio-sheet-tab-bar" style="margin-bottom:var(--space-md)">
      <button class="tab-btn-underline active" data-subtab="bio">${t('bio_tab_bio')}</button>
      <button class="tab-btn-underline" data-subtab="skin">${t('bio_tab_skinfolds')}</button>
      <button class="tab-btn-underline" data-subtab="peri">${t('bio_tab_perimetrals')}</button>
    </div>

    <input type="date" id="bio-entry-date" class="input-solo" value="${today}" style="margin-bottom:var(--space-md)">

    <!-- Bioimpedancia fields -->
    <div id="subtab-bio">
      ${buildMeasurementInput('bio-weight', t('bio_current_weight'), 'kg')}
      ${buildMeasurementInput('bio-fat', t('bio_body_fat_pct'), '%')}
      ${buildMeasurementInput('bio-muscle', t('bio_muscle_pct'), '%')}
      ${buildMeasurementInput('bio-water', t('bio_water_pct'), '%')}
      ${buildMeasurementInput('bio-visceral', t('bio_visceral_fat'), t('bio_index'))}
    </div>

    <!-- Skinfold fields -->
    <div id="subtab-skin" style="display:none">
      ${[
        ['triceps',      t('bio_sf_triceps')],
        ['biceps',       t('bio_sf_biceps')],
        ['subescapular', t('bio_sf_subscapular')],
        ['supraespinal', t('bio_sf_supraspinal')],
        ['abdominal',    t('bio_sf_abdominal')],
        ['muslo',        t('bio_sf_thigh')],
        ['pierna',       t('bio_sf_calf')],
      ].map(([id, label]) => buildMeasurementInput('skin-' + id, label, 'mm')).join('')}
    </div>

    <!-- Perimetral fields -->
    <div id="subtab-peri" style="display:none">
      ${[
        ['cintura',  t('bio_p_waist')],
        ['cadera',   t('bio_p_hip')],
        ['pecho',    t('bio_p_chest')],
        ['brazod',   t('bio_p_arm_r')],
        ['brazoi',   t('bio_p_arm_l')],
        ['muslod',   t('bio_p_thigh_r')],
        ['musloi',   t('bio_p_thigh_l')],
        ['gemelo',   t('bio_p_calf')],
      ].map(([id, label]) => buildMeasurementInput('peri-' + id, label, 'cm')).join('')}
    </div>

    <button class="btn-primary btn-full" id="btn-save-bio" style="margin-top:var(--space-md)">${t('save')}</button>
 `;
  openSheet(html);

  const sc = document.getElementById('sheet-content');

  // Sub-tabs (underline style)
  function updateSheetTabIndicator(activeBtn) {
    const bar = document.getElementById('bio-sheet-tab-bar');
    if (!bar || !activeBtn) return;
    requestAnimationFrame(() => {
      const btnRect = activeBtn.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      bar.style.setProperty('--indicator-width', btnRect.width + 'px');
      bar.style.setProperty('--indicator-offset', (btnRect.left - barRect.left) + 'px');
    });
  }
  sc.querySelectorAll('.tab-btn-underline[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      sc.querySelectorAll('.tab-btn-underline[data-subtab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSheetTabIndicator(btn);
      ['bio','skin','peri'].forEach(k => {
        const el = sc.querySelector(`#subtab-${k}`);
        if (el) el.style.display = k === btn.dataset.subtab ? '' : 'none';
      });
    });
  });
  const activeSheetTab = sc.querySelector('.tab-btn-underline[data-subtab].active');
  if (activeSheetTab) setTimeout(() => updateSheetTabIndicator(activeSheetTab), 50);

  sc.querySelector('#btn-save-bio').addEventListener('click', async () => {
    const date = sc.querySelector('#bio-entry-date').value || today;
    const entry = { date, createdAt: timestamp() };

    // Bioimpedancia
    const weight    = parseFloat(sc.querySelector('#bio-weight')?.value);
    const fat       = parseFloat(sc.querySelector('#bio-fat')?.value);
    const muscle    = parseFloat(sc.querySelector('#bio-muscle')?.value);
    const water     = parseFloat(sc.querySelector('#bio-water')?.value);
    const visceral  = parseFloat(sc.querySelector('#bio-visceral')?.value);
    if (!isNaN(weight))  entry.weight = weight;
    if (!isNaN(fat))     entry.fatPercent = fat;
    if (!isNaN(muscle))  entry.musclePercent = muscle;
    if (!isNaN(water))   entry.waterPercent = water;
    if (!isNaN(visceral)) entry.visceralFat = visceral;

    // Skinfolds
    const skinfolds = {};
    sc.querySelectorAll('[id^="skin-"]').forEach(el => {
      const v = parseFloat(el.value);
      if (!isNaN(v)) skinfolds[el.id.replace('skin-','')] = v;
    });
    if (Object.keys(skinfolds).length) entry.skinfolds = skinfolds;

    // Perimetrals
    const perimetrals = {};
    sc.querySelectorAll('[id^="peri-"]').forEach(el => {
      const v = parseFloat(el.value);
      if (!isNaN(v)) perimetrals[el.id.replace('peri-','')] = v;
    });
    if (Object.keys(perimetrals).length) entry.perimetrals = perimetrals;

    try {
      await collections.biomedidas(profile.uid).add(entry);
      toast(t('bio_saved'), 'success');
      closeSheet();
      loadBioData(container, profile, getDateMinus(90), todayString());
      loadFixedStats(container, { ...profile, weight: entry.weight || profile.weight });
    } catch (e) { toast(t('error') + ': ' + e.message, 'error'); }
  });
}

function buildMeasurementInput(id, label, unit) {
  return `
    <div class="measurement-entry">
      <label class="measurement-label" for="${id}">${label}</label>
      <input type="number" id="${id}" class="measurement-input" placeholder="0" step="0.1" min="0">
      <span class="measurement-unit">${unit}</span>
    </div>
 `;
}

function getDateMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
