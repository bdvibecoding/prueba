/* ═══════════════════════════════════════════════
   TGWL — modules/progreso.js
   Progress Photos & Charts Module
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { collections, storage, storagePaths, timestamp } from '../firebase-config.js';
import { toast, formatDate, todayString } from '../utils.js';
import { openModal, closeModal } from '../components/modal.js';
import { buildSliderHTML, initBeforeAfterSlider, updateSliderImages } from '../components/before-after-slider.js';
import { renderWeightChart, renderWorkoutChart } from '../components/charts.js';
import { t } from '../i18n.js';

function getAngles() {
  return [
    { id: 'front',  label: t('prog_angle_front'), icon: '' },
    { id: 'left',   label: t('prog_angle_left'),  icon: '' },
    { id: 'back',   label: t('prog_angle_back'),  icon: '' },
    { id: 'right',  label: t('prog_angle_right'), icon: '' },
  ];
}

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="progreso-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">${t('prog_title')}</h2>
            <p class="page-subtitle">${t('prog_subtitle')}</p>
          </div>
          <button class="btn-primary" id="btn-upload-photos" style="padding:10px 16px;font-size:13px">${t('prog_upload')}</button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="photos">${t('prog_tab_photos')}</button>
          <button class="tab-btn" data-tab="comparison">${t('prog_tab_compare')}</button>
          <button class="tab-btn" data-tab="charts">${t('prog_tab_charts')}</button>
        </div>

        <!-- Tab: Photos -->
        <div id="tab-photos" class="tab-content">
          <!-- Week selector -->
          <div class="date-range" style="margin-bottom:var(--space-md)">
            <input type="date" id="photo-week-selector" value="${todayString()}">
            <button class="btn-accent" id="btn-load-photos" style="padding:6px 12px;font-size:12px">${t('load')}</button>
          </div>

          <!-- Angle tabs -->
          <div class="h-scroll" id="angle-tabs" style="margin-bottom:var(--space-md)">
            ${getAngles().map((a, i) => `
              <button class="chip ${i === 0 ? 'active' : ''}" data-angle="${a.id}">${a.icon} ${a.label}</button>
 `).join('')}
          </div>

          <!-- Photo display -->
          <div id="current-photo-wrap" style="max-width:320px;margin:0 auto">
            <div class="photo-slot" id="main-photo-slot" style="aspect-ratio:3/4;cursor:default">
              <div class="photo-slot-icon"></div>
              <div class="photo-slot-label">${t('prog_no_photo')}</div>
            </div>
          </div>
        </div>

        <!-- Tab: Comparison (Before/After) -->
        <div id="tab-comparison" class="tab-content hidden">
          <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md)">
            <div style="flex:1">
              <label class="field-label">${t('prog_start_date')}</label>
              <input type="date" id="compare-from" class="input-solo" style="margin-top:4px" value="${getDateMinus(90)}">
            </div>
            <div style="flex:1">
              <label class="field-label">${t('prog_end_date')}</label>
              <input type="date" id="compare-to" class="input-solo" style="margin-top:4px" value="${todayString()}">
            </div>
          </div>
          <div class="h-scroll" style="margin-bottom:var(--space-md)">
            ${getAngles().map((a, i) => `
              <button class="chip ${i === 0 ? 'active' : ''}" data-compare-angle="${a.id}">${a.label}</button>
 `).join('')}
          </div>
          <div id="comparison-slider-wrap">
            ${buildSliderHTML(null, null, t('prog_before'), t('prog_after'))}
          </div>
        </div>

        <!-- Tab: Charts -->
        <div id="tab-charts" class="tab-content hidden">
          <div class="date-range" style="margin-bottom:var(--space-md)">
            <input type="date" id="chart-from" value="${getDateMinus(90)}">
            <span>—</span>
            <input type="date" id="chart-to" value="${todayString()}">
            <button class="btn-accent" id="btn-apply-chart-range" style="padding:6px 12px;font-size:12px">${t('apply')}</button>
          </div>
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-progress-weight"></canvas></div>
          </div>
          <div class="glass-card" style="margin-bottom:var(--space-md)">
            <div class="chart-container"><canvas id="chart-progress-workouts"></canvas></div>
          </div>
        </div>
      </div>
    </div>
 `;
}

export async function init(container) {
  const profile = getUserProfile();
  let currentAngle = 'front';
  let compareAngle = 'front';

  // Load initial photos
  loadPhotosForWeek(container, profile, todayString(), currentAngle);

  // Upload button
  container.querySelector('#btn-upload-photos')?.addEventListener('click', () => openUploadModal(profile, container));

  // Load photos by week
  container.querySelector('#btn-load-photos')?.addEventListener('click', () => {
    const date = container.querySelector('#photo-week-selector').value;
    loadPhotosForWeek(container, profile, date, currentAngle);
  });

  // Angle tabs (photos)
  container.querySelectorAll('[data-angle]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-angle]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAngle = btn.dataset.angle;
      const date = container.querySelector('#photo-week-selector').value;
      loadPhotosForWeek(container, profile, date, currentAngle);
    });
  });

  // Angle tabs (compare)
  container.querySelectorAll('[data-compare-angle]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-compare-angle]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      compareAngle = btn.dataset.compareAngle;
      loadComparison(container, profile, compareAngle);
    });
  });

  // Main tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'comparison') {
        initBeforeAfterSlider(container.querySelector('#comparison-slider-wrap'));
        loadComparison(container, profile, compareAngle);
      }
      if (btn.dataset.tab === 'charts') {
        loadCharts(container, profile, getDateMinus(90), todayString());
      }
    });
  });

  // Chart range
  container.querySelector('#btn-apply-chart-range')?.addEventListener('click', () => {
    const from = container.querySelector('#chart-from').value;
    const to   = container.querySelector('#chart-to').value;
    if (from && to) loadCharts(container, profile, from, to);
  });
}

// ── Load Photos ───────────────────────────────
async function loadPhotosForWeek(container, profile, date, angle) {
  const slot = container.querySelector('#main-photo-slot');
  if (!slot) return;

  slot.innerHTML = `<div class="spinner-sm"></div>`;

  try {
    const snap = await collections.progress(profile.uid)
      .where('date', '==', date)
      .limit(1)
      .get();

    let photoURL = null;
    if (!snap.empty) {
      const data = snap.docs[0].data();
      photoURL = data.photos?.[angle] || null;
    }

    if (photoURL) {
      slot.innerHTML = `
        <img src="${photoURL}" alt="${angle}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md)">
        <div class="photo-slot-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;cursor:pointer" id="btn-expand-photo"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
 `;
      slot.querySelector('#btn-expand-photo')?.addEventListener('click', () => openPhotoModal(photoURL, formatDate(date)));
    } else {
      slot.innerHTML = `
        <div class="photo-slot-icon"></div>
        <div class="photo-slot-label">${t('prog_no_photo')} · ${angle}</div>
 `;
    }
  } catch (e) {
    slot.innerHTML = `<div class="photo-slot-label">Error</div>`;
  }
}

// ── Load Comparison ───────────────────────────
async function loadComparison(container, profile, angle) {
  const from = container.querySelector('#compare-from')?.value;
  const to   = container.querySelector('#compare-to')?.value;

  try {
    const [snapFrom, snapTo] = await Promise.all([
      collections.progress(profile.uid).where('date', '==', from).limit(1).get(),
      collections.progress(profile.uid).where('date', '==', to).limit(1).get(),
    ]);

    const beforeURL = snapFrom.empty ? null : snapFrom.docs[0].data()?.photos?.[angle];
    const afterURL  = snapTo.empty   ? null : snapTo.docs[0].data()?.photos?.[angle];

    const sliderWrap = container.querySelector('#comparison-slider-wrap');
    if (sliderWrap) {
      sliderWrap.innerHTML = buildSliderHTML(beforeURL, afterURL,
 `${t('prog_before')} · ${from}`, `${t('prog_after')} · ${to}`);
      initBeforeAfterSlider(sliderWrap);
    }
  } catch (e) { toast(t('prog_comparison_error'), 'error'); }
}

// ── Load Charts ───────────────────────────────
async function loadCharts(container, profile, from, to) {
  try {
    const [bioSnap, sessionSnap] = await Promise.all([
      collections.biomedidas(profile.uid).where('date', '>=', from).where('date', '<=', to).orderBy('date').get(),
      collections.workoutSessions(profile.uid).orderBy('startTime', 'desc').limit(20).get(),
    ]);

    const weightData = bioSnap.docs.map(d => ({ date: d.data().date, weight: d.data().weight })).filter(d => d.weight);
    renderWeightChart('chart-progress-weight', weightData);

    const sessions = sessionSnap.docs.map(d => {
      const s = d.data();
      return {
        date: formatDate(s.startTime?.toDate?.() || new Date(s.startTime)),
        rpe: s.rpe || 0,
        durationMs: s.durationMs || 0,
      };
    });
    renderWorkoutChart('chart-progress-workouts', sessions);
  } catch (e) { toast(t('prog_charts_error'), 'error'); }
}

// ── Upload Modal ──────────────────────────────
function openUploadModal(profile, container) {
  const today = todayString();
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${t('prog_upload_title')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">${t('date')}</label>
      <input type="date" id="upload-date" class="input-solo" value="${today}">
    </div>
    <p class="text-muted" style="margin-bottom:var(--space-md)">${t('prog_upload_hint')}</p>
    <div class="photo-grid" id="upload-photo-grid">
      ${getAngles().map(a => `
        <div class="photo-slot upload-slot" data-angle="${a.id}" style="cursor:pointer">
          <div class="photo-slot-icon"></div>
          <div class="photo-slot-label">${a.label}</div>
          <input type="file" accept="image/*" capture="environment" style="display:none" class="photo-file-input" data-angle="${a.id}">
        </div>
 `).join('')}
    </div>
    <button class="btn-primary btn-full" id="btn-upload-save" style="margin-top:var(--space-md)" disabled>
      ${t('prog_save_photos')}
    </button>
 `;

  openModal(html);
  const modal = document.getElementById('modal-content');
  const files = {};

  modal.querySelectorAll('.upload-slot').forEach(slot => {
    const fileInput = slot.querySelector('.photo-file-input');
    const angle = slot.dataset.angle;

    slot.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      files[angle] = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        slot.innerHTML = `
          <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:calc(var(--radius-md) - 2px)">
          <div class="photo-slot-overlay">
            <span style="color:white;font-size:13px">${t('change')}</span>
          </div>
          <input type="file" accept="image/*" capture="environment" style="display:none" class="photo-file-input" data-angle="${angle}">
 `;
        slot.querySelector('.photo-file-input').addEventListener('change', (e2) => {
          const f2 = e2.target.files[0];
          if (f2) { files[angle] = f2; }
        });
      };
      reader.readAsDataURL(file);
      modal.querySelector('#btn-upload-save').disabled = false;
    });
  });

  modal.querySelector('#btn-upload-save').addEventListener('click', async () => {
    const date = modal.querySelector('#upload-date').value;
    const btn  = modal.querySelector('#btn-upload-save');
    btn.textContent = t('prog_uploading');
    btn.disabled = true;

    try {
      const photoURLs = {};
      for (const [angle, file] of Object.entries(files)) {
        const path = storagePaths.progressPhoto(profile.uid, date, angle);
        const ref  = storage.ref(path);
        await ref.put(file);
        photoURLs[angle] = await ref.getDownloadURL();
      }

      await collections.progress(profile.uid).add({
        date, photos: photoURLs, createdAt: timestamp(),
      });

      toast(t('prog_photos_saved'), 'success');
      closeModal();
      loadPhotosForWeek(container, profile, date, 'front');
    } catch (e) {
      toast(t('prog_upload_error') + ': ' + e.message, 'error');
      btn.textContent = ` ${t('prog_save_photos')}`;
      btn.disabled = false;
    }
  });
}

// ── Full-screen photo modal ───────────────────
function openPhotoModal(url, date) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title"> ${date}</h3>
      <button class="modal-close">✕</button>
    </div>
    <img src="${url}" alt="Progreso" style="width:100%;border-radius:var(--radius-md);max-height:70vh;object-fit:contain">
 `;
  openModal(html);
}

function getDateMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
