/* ═══════════════════════════════════════════════
   TGWL — modules/biomedidas.js
   Body Measurements & Biometrics Module
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, timestamp } from '../firebase-config.js';
import { toast, formatDate, todayString, round2, calcBMI, bmiCategory, deltaPercent } from '../utils.js';
import { openModal, closeModal, openSheet } from '../components/modal.js';
import { renderWeightChart, renderBodyFatChart, renderSkinfoldChart, renderPerimetralsChart, renderCompositionChart } from '../components/charts.js';

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="biomedidas-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">📊 Biomedidas</h2>
            <p class="page-subtitle">Control de composición corporal</p>
          </div>
          <button class="btn-primary" id="btn-add-bio" style="padding:10px 16px;font-size:13px">+ Añadir</button>
        </div>

        <!-- Fixed Data Row -->
        <div class="quick-stats" id="fixed-stats-row">
          <div class="glass-card stat-card"><div class="stat-value" id="stat-height">—</div><div class="stat-label">Talla (cm)</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-weight">—</div><div class="stat-label">Peso (kg)</div></div>
          <div class="glass-card stat-card"><div class="stat-value" id="stat-bmi">—</div><div class="stat-label">IMC</div></div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="bioimpedancia">Bioimpedancia</button>
          <button class="tab-btn" data-tab="pliegues">Pliegues</button>
          <button class="tab-btn" data-tab="perimetros">Perímetros</button>
        </div>

        <!-- Date Range -->
        <div class="date-range" style="margin-bottom:var(--space-md)">
          <span>📅</span>
          <input type="date" id="date-from" value="${getDateMinus(90)}">
          <span>—</span>
          <input type="date" id="date-to" value="${todayString()}">
          <button class="btn-accent" id="btn-apply-range" style="padding:6px 12px;font-size:12px">Aplicar</button>
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
    toast('Error cargando datos: ' + e.message, 'error');
  }
}

function renderBioTable(container, data) {
  const el = container.querySelector('#bio-readings-table');
  if (!el) return;
  const rows = data.filter(d => d.fatPercent || d.musclePercent || d.weight).reverse().slice(0, 10);
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Sin datos de bioimpedancia</p>`; return; }
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
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Sin datos de pliegues</p>`; return; }
  const keys = Object.keys(rows[0].skinfolds || {});
  el.innerHTML = `
    <div style="padding:var(--space-md);overflow-x:auto">
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><th style="text-align:left;color:var(--color-text-muted);padding:6px 4px">Fecha</th>
          ${keys.map(k => `<th style="color:var(--color-text-muted);padding:6px 4px">${k}</th>`).join('')}
          <th style="color:var(--color-text-muted);padding:6px 4px">% Grasa</th>
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
  if (!rows.length) { el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">Sin medidas perimetrales</p>`; return; }
  el.innerHTML = `
    <div style="padding:var(--space-md)">
      ${rows.map(d => {
        const p = d.perimetrals || {};
        return `
          <div class="bio-row">
            <span class="bio-label">${formatDate(d.date)}</span>
            ${p.waist ? `<span class="bio-value">${p.waist} cm <span class="text-muted" style="font-size:10px">cin</span></span>` : ''}
            ${p.hip ? `<span class="bio-value">${p.hip} cm <span class="text-muted" style="font-size:10px">cad</span></span>` : ''}
            ${p.chest ? `<span class="bio-value">${p.chest} cm <span class="text-muted" style="font-size:10px">pec</span></span>` : ''}
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
    <h4 style="margin-bottom:var(--space-md)">📊 Añadir medidas</h4>
    <div class="tabs" style="margin-bottom:var(--space-md)">
      <button class="tab-btn active" data-subtab="bio">Bioimpedancia</button>
      <button class="tab-btn" data-subtab="skin">Pliegues</button>
      <button class="tab-btn" data-subtab="peri">Perímetros</button>
    </div>

    <input type="date" id="bio-entry-date" class="input-solo" value="${today}" style="margin-bottom:var(--space-md)">

    <!-- Bioimpedancia fields -->
    <div id="subtab-bio">
      ${buildMeasurementInput('bio-weight', 'Peso actual', 'kg')}
      ${buildMeasurementInput('bio-fat', '% Grasa corporal', '%')}
      ${buildMeasurementInput('bio-muscle', '% Masa muscular', '%')}
      ${buildMeasurementInput('bio-water', '% Agua', '%')}
      ${buildMeasurementInput('bio-visceral', 'Grasa visceral', 'índice')}
    </div>

    <!-- Pliegues fields -->
    <div id="subtab-skin" style="display:none">
      ${['Tríceps','Bíceps','Subescapular','Supraespinal','Abdominal','Muslo','Pierna'].map(p =>
        buildMeasurementInput('skin-' + p.toLowerCase(), p, 'mm')
      ).join('')}
    </div>

    <!-- Perímetros fields -->
    <div id="subtab-peri" style="display:none">
      ${['Cintura','Cadera','Pecho','Brazo D','Brazo I','Muslo D','Muslo I','Gemelo'].map(p =>
        buildMeasurementInput('peri-' + p.toLowerCase().replace(/ /g,''), p, 'cm')
      ).join('')}
    </div>

    <button class="btn-primary btn-full" id="btn-save-bio" style="margin-top:var(--space-md)">💾 Guardar</button>
  `;
  openSheet(html);

  const sc = document.getElementById('sheet-content');

  // Sub-tabs
  sc.querySelectorAll('.tab-btn[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      sc.querySelectorAll('.tab-btn[data-subtab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['bio','skin','peri'].forEach(t => {
        const el = sc.querySelector(`#subtab-${t}`);
        if (el) el.style.display = t === btn.dataset.subtab ? '' : 'none';
      });
    });
  });

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
      toast('Medidas guardadas ✅', 'success');
      closeSheet();
      loadBioData(container, profile, getDateMinus(90), todayString());
      loadFixedStats(container, { ...profile, weight: entry.weight || profile.weight });
    } catch (e) { toast('Error: ' + e.message, 'error'); }
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
