/* ═══════════════════════════════════════════════
   TGWL — modules/salud.js
   Health Records + Daily Check-in Analytics
═══════════════════════════════════════════════ */

import { getUserProfile } from '../state.js';
import { db, collections, timestamp } from '../firebase-config.js';
import { toast, formatDate } from '../utils.js';
import { openModal, closeModal, confirm } from '../components/modal.js';
import { t, getLang } from '../i18n.js';

const MOOD_LABELS  = ['', '1', '2', '3', '4', '5'];
const SLEEP_LABELS = ['', '1', '2', '3', '4', '5'];
const MOOD_COLORS  = ['', '#8A8A8A', '#C10801', '#F16001', '#D9C3AB', '#22c55e'];

const STAFF_ROLES = ['coach', 'medico', 'fisio', 'psicologo', 'nutricionista', 'admin'];
const ROLE_FIELD  = {
  coach:         'assignedCoach',
  medico:        'assignedMedico',
  fisio:         'assignedFisio',
  psicologo:     'assignedPsicologo',
  nutricionista: 'assignedNutricionista',
  admin:         'assignedCoach',
};

export async function render(container) {
  container.innerHTML = `
    <div class="page active" id="salud-page">
      <div style="padding:var(--page-pad)">
        <div class="page-header">
          <div>
            <h2 class="page-title">❤️ ${t('salud_title')}</h2>
            <p class="page-subtitle">${t('salud_subtitle')}</p>
          </div>
          <button class="btn-primary" id="btn-add-health" style="padding:10px 16px;font-size:13px">+ ${t('add')}</button>
        </div>

        <div class="tabs">
          <button class="tab-btn active" data-tab="general">${t('salud_tab_general')}</button>
          <button class="tab-btn" data-tab="sensible">${t('salud_tab_sensitive')}</button>
          <button class="tab-btn" data-tab="checkins">${t('salud_tab_checkins')}</button>
        </div>

        <div id="tab-general" class="tab-content">
          <div id="health-records-list">
            <div class="overlay-spinner"><div class="spinner-sm"></div></div>
          </div>
        </div>

        <div id="tab-sensible" class="tab-content hidden">
          <div id="sensible-container"></div>
        </div>

        <div id="tab-checkins" class="tab-content hidden">
          <div id="checkins-container"></div>
        </div>
      </div>
    </div>
  `;
}

export async function init(container) {
  const profile = getUserProfile();

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      if (btn.dataset.tab === 'sensible') loadSensitiveSection(container, profile);
      if (btn.dataset.tab === 'checkins') loadCheckinsTab(container, profile);
    });
  });

  container.querySelector('#btn-add-health')?.addEventListener('click', () => openAddHealthModal(profile, container));
  loadHealthRecords(container, profile);
}

/* ════════════════════════════════
   TAB 1 — General health records
════════════════════════════════ */
async function loadHealthRecords(container, profile) {
  const el = container.querySelector('#health-records-list');
  if (!el) return;
  try {
    const snap = await collections.health(profile.uid)
      .where('sensitive', '==', false)
      .orderBy('date', 'desc')
      .get();

    if (snap.empty) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏥</div>
          <div class="empty-title">${t('salud_no_records')}</div>
          <div class="empty-subtitle">${t('salud_no_records_sub')}</div>
        </div>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => buildHealthCard(doc.id, doc.data(), profile)).join('');
    el.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm(t('salud_delete_title'), t('salud_delete_confirm'), { okText: t('delete'), danger: true });
        if (ok) {
          await collections.health(profile.uid).doc(btn.dataset.deleteId).delete();
          toast(t('salud_record_deleted'), 'info');
          loadHealthRecords(container, profile);
        }
      });
    });
  } catch (e) {
    el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('error')}: ${e.message}</p>`;
  }
}

function buildHealthCard(id, record, profile) {
  const icons = { lesion:'!', fractura:'!', operacion:'!', protesis:'!', enfermedad:'!', alergia:'!', otro:'!' };
  return `
    <div class="health-record glass-card">
      <div class="health-record-header">
        <span class="health-record-icon">${icons[record.type]||'!'}</span>
        <div style="flex:1">
          <div class="health-record-title">${record.title}</div>
          <div class="health-record-date">${record.type?record.type.charAt(0).toUpperCase()+record.type.slice(1):''} · ${formatDate(record.date)}</div>
        </div>
        <div style="display:flex;gap:6px">
          ${record.active?`<span class="badge badge-orange">${t('salud_active')}</span>`:`<span class="badge badge-gray">${t('salud_resolved')}</span>`}
          <button class="btn-icon" data-delete-id="${id}" style="width:32px;height:32px;color:var(--color-danger);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div>
      </div>
      ${record.description?`<p style="font-size:13px;color:var(--color-text-muted);line-height:1.5;margin-top:var(--space-xs)">${record.description}</p>`:''}
      ${record.affectsTraining?`<p style="font-size:12px;color:var(--color-warning);margin-top:4px">${t('salud_affects_training')}: ${record.trainingNotes||''}</p>`:''}
    </div>`;
}

/* ════════════════════════════════
   TAB 2 — Sensitive records
════════════════════════════════ */
function loadSensitiveSection(container, profile) {
  const el = container.querySelector('#sensible-container');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  const hasAccess = profile?.role === 'admin' || profile?.sensitiveClearance === true;
  if (!hasAccess) {
    el.innerHTML = `
      <div class="sensitive-lock">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">${t('salud_sensitive_title')}</div>
        <div class="lock-desc">${t('salud_sensitive_desc')}</div>
        <button class="btn-secondary" id="btn-request-access" style="margin-top:var(--space-md)">${t('salud_request_access')}</button>
      </div>`;
    el.querySelector('#btn-request-access')?.addEventListener('click', () => toast(t('salud_access_requested'), 'info'));
    return;
  }
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md)">
      <span class="badge badge-red">🔑 ${t('salud_access_granted')}</span>
      <button class="btn-primary" id="btn-add-sensitive" style="padding:8px 14px;font-size:12px">+ ${t('add')}</button>
    </div>
    <div id="sensitive-records"><div class="overlay-spinner"><div class="spinner-sm"></div></div></div>`;
  el.querySelector('#btn-add-sensitive')?.addEventListener('click', () => openAddHealthModal(profile, container, true));
  loadSensitiveRecords(el.querySelector('#sensitive-records'), profile);
}

async function loadSensitiveRecords(el, profile) {
  try {
    const snap = await collections.health(profile.uid).where('sensitive','==',true).orderBy('date','desc').get();
    if (snap.empty) { el.innerHTML = `<div class="empty-state"><div class="empty-title">${t('salud_no_sensitive')}</div></div>`; return; }
    el.innerHTML = snap.docs.map(doc => buildHealthCard(doc.id, doc.data(), profile)).join('');
  } catch (e) { el.innerHTML = `<p class="text-muted">${t('error')}: ${e.message}</p>`; }
}

/* ════════════════════════════════
   TAB 3 — Daily Check-in Analytics
════════════════════════════════ */
async function loadCheckinsTab(container, profile) {
  const el = container.querySelector('#checkins-container');
  if (!el) return;
  el.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;

  const isStaff = STAFF_ROLES.includes(profile?.role);
  let clients = [];
  if (isStaff) {
    try {
      const field = ROLE_FIELD[profile.role] || 'assignedCoach';
      const snap  = await db.collection('users').where(field, '==', profile.uid).limit(50).get();
      clients     = snap.docs.map(d => ({ uid: d.id, name: d.data().name || d.data().email || d.id }));
    } catch (_) {}
  }

  el.innerHTML = `
    ${isStaff && clients.length ? `
    <div style="margin-bottom:var(--space-md)">
      <label class="field-label">${t('salud_view_data_of')}</label>
      <div class="input-group" style="margin-top:4px">
        <span class="input-icon">👤</span>
        <select id="checkin-client-select">
          <option value="${profile.uid}">— ${t('salud_my_checkins')} —</option>
          ${clients.map(c=>`<option value="${c.uid}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>` : ''}
    <div id="checkin-data-area">
      <div class="overlay-spinner"><div class="spinner-sm"></div></div>
    </div>`;

  const select = el.querySelector('#checkin-client-select');
  select?.addEventListener('change', () => {
    const uid  = select.value;
    const name = clients.find(c=>c.uid===uid)?.name || profile.name || '';
    renderCheckinData(el.querySelector('#checkin-data-area'), uid, name, isStaff);
  });

  renderCheckinData(el.querySelector('#checkin-data-area'), profile.uid, profile.name||'', isStaff);
}

async function renderCheckinData(el, uid, userName, isStaff) {
  if (!el) return;
  el.innerHTML = `<div class="overlay-spinner"><div class="spinner-sm"></div></div>`;
  try {
    const snap = await db.collection('users').doc(uid).collection('health')
      .orderBy('date', 'desc').limit(30).get();

    // Only docs with mood field are check-ins
    const checkins = snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.mood!==undefined);

    if (!checkins.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:var(--space-2xl)">
          <div class="empty-title">${t('salud_no_checkins')}</div>
          <div class="empty-subtitle">${isStaff ? t('salud_no_checkins_staff').replace('{name}', userName) : t('salud_no_checkins_own')}</div>
        </div>`;
      return;
    }

    const recent = checkins.slice(0, 14);
    const last7  = checkins.slice(0, 7);
    const last14rev = [...recent].reverse();

    const avg = (arr, key) => arr.length ? (arr.reduce((s,c)=>s+(c[key]||0),0)/arr.length).toFixed(1) : '—';
    const avgMood  = avg(last7, 'mood');
    const avgSleep = avg(last7, 'sleepQuality');
    const avgHours = avg(last7, 'sleepHours');
    const painDays = last7.filter(c=>c.pain).length;

    const moodN  = parseFloat(avgMood)||0;
    const sleepN = parseFloat(avgSleep)||0;
    const state  = (moodN>=3.5&&sleepN>=3.5&&painDays<=1) ? {label:t('salud_state_good'),color:'#22c55e',icon:'🟢'}
                 : (moodN>=2.5&&sleepN>=2.5&&painDays<=3) ? {label:t('salud_state_warning'),color:'#f59e0b',icon:'🟡'}
                 : {label:t('salud_state_alert'),color:'#ef4444',icon:'🔴'};

    el.innerHTML = `
      ${isStaff ? `
      <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md);border-color:${state.color}40;background:${state.color}10">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">${state.icon}</span>
          <div>
            <div style="font-weight:700;font-size:15px">${t('salud_status')}: <span style="color:${state.color}">${state.label}</span></div>
            <div style="font-size:12px;color:var(--color-text-muted)">${t('salud_last_7_days')} · ${userName}</div>
          </div>
        </div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:var(--space-md)">
        ${_pill('',t('salud_mood'),avgMood+'/5')}
        ${_pill('',t('salud_sleep'),avgSleep+'/5')}
        ${_pill('',t('salud_hours'),avgHours+'h')}
        ${_pill('',t('salud_pain'),painDays+' '+t('salud_days'),painDays>3?'var(--color-danger)':painDays>0?'var(--color-warning)':undefined)}
      </div>

      <div class="section-title" style="margin-bottom:8px">${t('salud_recent_days')}</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:var(--space-md);-webkit-overflow-scrolling:touch">
        ${[...last7].reverse().map(c=>{
          const lbl = new Date(c.date+'T12:00:00').toLocaleDateString(getLang(),{weekday:'short',day:'numeric'});
          return `<div class="glass-card" style="flex-shrink:0;min-width:72px;padding:10px 8px;text-align:center">
            <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px">${lbl}</div>
            <div style="font-size:14px;font-weight:700;color:${MOOD_COLORS[c.mood]||'var(--color-text-muted)'}">${MOOD_LABELS[c.mood]||'—'}</div>
            <div style="font-size:12px;margin-top:2px;color:var(--color-text-muted)">${SLEEP_LABELS[c.sleepQuality]||'—'}</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${c.sleepHours||'—'}h</div>
            ${c.pain?`<div style="width:8px;height:8px;border-radius:50%;background:var(--color-danger);margin:4px auto 0" title="${c.painLocation||'Dolor'}"></div>`:''}
          </div>`;
        }).join('')}
      </div>

      <div class="section-title" style="margin-bottom:8px">${t('salud_mood_trend')}</div>
      <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md)">
        <div style="display:flex;align-items:flex-end;gap:3px;height:50px">
          ${last14rev.map(c=>{
            const h = Math.round(((c.mood||0)/5)*44)+4;
            return `<div style="flex:1;min-width:0;height:${h}px;background:${MOOD_COLORS[c.mood]||'#6b7280'};border-radius:var(--r-xs) var(--r-xs) 0 0;opacity:0.85" title="${c.date}: ${MOOD_EMOJIS[c.mood]||'—'}"></div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span style="font-size:10px;color:var(--color-text-muted)">${last14rev[0]?.date||''}</span>
          <span style="font-size:10px;color:var(--color-text-muted)">${t('salud_avg')}: ${avgMood}/5</span>
          <span style="font-size:10px;color:var(--color-text-muted)">${last14rev[last14rev.length-1]?.date||''}</span>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:8px">${t('salud_sleep_hours_trend')}</div>
      <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md)">
        <div style="display:flex;align-items:flex-end;gap:3px;height:50px">
          ${last14rev.map(c=>{
            const hrs = Math.min(c.sleepHours||0,10);
            const h   = Math.round((hrs/10)*44)+4;
            const col = hrs>=7?'#22c55e':hrs>=5?'#f59e0b':'#ef4444';
            return `<div style="flex:1;min-width:0;height:${h}px;background:${col};border-radius:var(--r-xs) var(--r-xs) 0 0;opacity:0.8" title="${c.date}: ${c.sleepHours||0}h"></div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span style="font-size:10px;color:var(--color-text-muted)">${last14rev[0]?.date||''}</span>
          <span style="font-size:10px;color:var(--color-text-muted)">${t('salud_avg')}: ${avgHours}h/${t('salud_night')}</span>
          <span style="font-size:10px;color:var(--color-text-muted)">${last14rev[last14rev.length-1]?.date||''}</span>
        </div>
      </div>

      ${checkins.filter(c=>c.pain).length?`
      <div class="section-title" style="margin-bottom:8px">${t('salud_pain_history')}</div>
      <div class="glass-card" style="padding:var(--space-md);margin-bottom:var(--space-md)">
        ${checkins.filter(c=>c.pain).slice(0,8).map(c=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--glass-border)">
            <span style="font-size:16px"></span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${c.date}</div>
              <div style="font-size:12px;color:var(--color-text-muted)">${c.painLocation||t('salud_no_location')}</div>
            </div>
          </div>`).join('')}
      </div>`:''}

      ${checkins.filter(c=>c.comment?.trim()).length?`
      <div class="section-title" style="margin-bottom:8px">${t('salud_notes_anomalies')}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:var(--space-md)">
        ${checkins.filter(c=>c.comment?.trim()).slice(0,10).map(c=>`
          <div class="glass-card" style="padding:var(--space-sm) var(--space-md);display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:14px;margin-top:2px"></span>
            <div>
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px">${c.date}</div>
              <div style="font-size:13px;line-height:1.5">${c.comment}</div>
            </div>
          </div>`).join('')}
      </div>`:''}
    `;
  } catch (e) {
    el.innerHTML = `<p class="text-muted" style="padding:var(--space-md)">${t('error')}: ${e.message}</p>`;
  }
}

function _pill(icon, label, value, color) {
  return `<div class="glass-card" style="padding:10px 6px;text-align:center">
    <div style="font-size:14px;font-weight:800;color:${color||'var(--color-text)'}">${value}</div>
    <div style="font-size:10px;color:var(--color-text-muted);margin-top:2px">${label}</div>
  </div>`;
}

/* ════════════════════════════════
   Add health record modal
════════════════════════════════ */
function openAddHealthModal(profile, container, sensitive = false) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${sensitive?t('salud_sensitive_record'):t('salud_health_record')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">${t('salud_type')}</label>
      <div class="input-group" style="margin-top:4px">
        <span class="input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="9" y="2" width="6" height="3" rx="1"/><path d="M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/></svg></span>
        <select id="health-type">
          <option value="lesion">${t('salud_type_injury')}</option>
          <option value="fractura">${t('salud_type_fracture')}</option>
          <option value="operacion">${t('salud_type_surgery')}</option>
          <option value="protesis">${t('salud_type_prosthesis')}</option>
          <option value="enfermedad">${t('salud_type_illness')}</option>
          <option value="alergia">${t('salud_type_allergy')}</option>
          <option value="otro">${t('salud_type_other')}</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <label class="field-label">${t('salud_title_diagnosis')}</label>
      <div class="input-group" style="margin-top:4px">
        <span class="input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
        <input type="text" id="health-title" placeholder="${t('salud_title_placeholder')}">
      </div>
    </div>
    <div class="form-row">
      <label class="field-label">${t('date')}</label>
      <input type="date" id="health-date" class="input-solo" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-row">
      <label class="field-label">${t('salud_description_optional')}</label>
      <textarea id="health-desc" class="input-solo" rows="3"
        placeholder="${t('salud_description_placeholder')}"
        style="padding:var(--space-md);width:100%;margin-top:4px;resize:vertical"></textarea>
    </div>
    <div class="form-row" style="display:flex;align-items:center;gap:var(--space-md)">
      <label class="field-label" style="margin:0">${t('salud_currently_active')}</label>
      <label class="toggle-switch"><input type="checkbox" id="health-active" checked><span class="toggle-slider"></span></label>
    </div>
    <div class="form-row" style="display:flex;align-items:center;gap:var(--space-md)">
      <label class="field-label" style="margin:0">${t('salud_affects_training_q')}</label>
      <label class="toggle-switch"><input type="checkbox" id="health-affects"><span class="toggle-slider"></span></label>
    </div>
    <div id="training-notes-row" style="display:none" class="form-row">
      <input type="text" id="health-training-notes" class="input-solo"
        placeholder="${t('salud_training_notes_placeholder')}">
    </div>
    <button class="btn-primary btn-full" id="btn-save-health" style="margin-top:var(--space-md)">💾 ${t('save')}</button>`;

  openModal(html);
  const modal = document.getElementById('modal-content');
  modal.querySelector('#health-affects').addEventListener('change', e => {
    modal.querySelector('#training-notes-row').style.display = e.target.checked ? '' : 'none';
  });
  modal.querySelector('#btn-save-health').addEventListener('click', async () => {
    const title = modal.querySelector('#health-title').value.trim();
    if (!title) { toast(t('salud_title_required'), 'warning'); return; }
    const record = {
      type:            modal.querySelector('#health-type').value,
      title,
      date:            modal.querySelector('#health-date').value,
      description:     modal.querySelector('#health-desc').value.trim(),
      active:          modal.querySelector('#health-active').checked,
      affectsTraining: modal.querySelector('#health-affects').checked,
      trainingNotes:   modal.querySelector('#health-training-notes').value.trim(),
      sensitive,
      createdAt:       timestamp(),
    };
    try {
      await collections.health(profile.uid).add(record);
      toast(t('salud_record_saved'), 'success');
      closeModal();
      loadHealthRecords(container, profile);
    } catch (e) { toast(t('error') + ': ' + e.message, 'error'); }
  });
}
