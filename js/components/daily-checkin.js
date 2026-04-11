/* ═══════════════════════════════════════════════
   TGWL — components/daily-checkin.js
   Daily Wellness Check-in Popup
   Called from home.js for 'cliente' / 'atleta' roles
═══════════════════════════════════════════════ */

import { db, collections, timestamp } from '../firebase-config.js';
import { toast } from '../utils.js';
import { t, getLang } from '../i18n.js';

// ── Entry point ────────────────────────────────
/**
 * showDailyCheckin(uid)
 * Call from home.js init() when profile.role === 'cliente' || 'atleta'.
 * Shows the overlay at most once per calendar day per user.
 */
export async function showDailyCheckin(uid) {
  if (!uid) return;

  const todayStr  = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const lsKey     = `tgwl_checkin_${uid}_${todayStr}`;

  // Already done today — skip silently
  if (localStorage.getItem(lsKey)) return;

  _buildAndShow(uid, todayStr, lsKey);
}

// ── Build overlay ──────────────────────────────
function _buildAndShow(uid, todayStr, lsKey) {
  // Inject keyframes once
  _injectStyles();

  // ── Overlay wrapper ──────────────────────────
  const overlay = document.createElement('div');
  overlay.id    = 'checkin-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.72);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    opacity: 0;
    animation: checkinFadeIn 0.3s ease forwards;
  `;

  // ── Card ─────────────────────────────────────
  const card = document.createElement('div');
  card.style.cssText = `
    width: 100%;
    max-width: 420px;
    max-height: 88dvh;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.09);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--r-xl);
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.7),
      0 2px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    padding: 28px 24px 24px;
    transform: translateY(30px);
    animation: checkinSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    scrollbar-width: none;
  `;

  // hide webkit scrollbar
  card.setAttribute('data-checkin-card', '1');

  card.innerHTML = `
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:36px;margin-bottom:8px">🌅</div>
      <h2 style="
        margin:0 0 4px;
        font-size:20px;
        font-weight:700;
        color:#fff;
        letter-spacing:-0.3px;
      ">${t('checkin_daily')}</h2>
      <p style="
        margin:0;
        font-size:13px;
        color:var(--color-text-muted, #a7a7a7);
      ">${_formatDisplayDate()}</p>
    </div>

    <!-- Q1: Estado general -->
    <div class="checkin-question" style="margin-bottom:24px">
      <div style="
        font-size:14px;
        font-weight:600;
        color:#fff;
        margin-bottom:12px;
      ">${t('checkin_mood')}</div>
      <div id="q-mood" style="display:flex;justify-content:space-between;gap:4px">
        ${_emojiRow([
          { v: 1, e: '😞', label: t('checkin_mood_bad') },
          { v: 2, e: '😕', label: t('checkin_mood_poor') },
          { v: 3, e: '😐', label: t('checkin_mood_ok') },
          { v: 4, e: '😊', label: t('checkin_mood_good') },
          { v: 5, e: '😄', label: t('checkin_mood_great') },
        ], 'mood')}
      </div>
    </div>

    <!-- Q2: Sueño calidad -->
    <div class="checkin-question" style="margin-bottom:24px">
      <div style="
        font-size:14px;
        font-weight:600;
        color:#fff;
        margin-bottom:12px;
      ">${t('checkin_sleep')}</div>
      <div id="q-sleep-quality" style="display:flex;justify-content:space-between;gap:4px">
        ${_emojiRow([
          { v: 1, e: '😴', label: t('checkin_sleep_terrible') },
          { v: 2, e: '💤', label: t('checkin_sleep_bad') },
          { v: 3, e: '🌙', label: t('checkin_sleep_ok') },
          { v: 4, e: '⭐', label: t('checkin_sleep_good') },
          { v: 5, e: '✨', label: t('checkin_sleep_great') },
        ], 'sleep')}
      </div>
    </div>

    <!-- Q3: Horas de sueño -->
    <div class="checkin-question" style="margin-bottom:24px">
      <div style="
        font-size:14px;
        font-weight:600;
        color:#fff;
        margin-bottom:10px;
      ">${t('checkin_hours')}</div>
      <div style="display:flex;align-items:center;gap:12px">
        <input
          id="q-sleep-hours"
          type="number"
          min="1"
          max="12"
          step="0.5"
          value="7"
          style="
            width:80px;
            background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.15);
            border-radius:var(--r-md);
            color:#fff;
            font-size:22px;
            font-weight:700;
            text-align:center;
            padding:8px;
            -moz-appearance:textfield;
          "
        />
        <span style="color:var(--color-text-muted,#a7a7a7);font-size:13px">${t('checkin_hours_tonight')}</span>
      </div>
    </div>

    <!-- Q4: Comentario libre -->
    <div class="checkin-question" style="margin-bottom:24px">
      <div style="
        font-size:14px;
        font-weight:600;
        color:#fff;
        margin-bottom:10px;
      ">${t('checkin_free_comment')} <span style="font-weight:400;color:var(--color-text-muted,#a7a7a7)">${t('checkin_optional')}</span></div>
      <textarea
        id="q-comment"
        rows="3"
        placeholder="${t('checkin_comment_placeholder')}"
        style="
          width:100%;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:var(--r-md);
          color:#fff;
          font-size:14px;
          line-height:1.55;
          padding:12px;
          resize:none;
          font-family:inherit;
          box-sizing:border-box;
          transition:border-color 0.2s;
        "
      ></textarea>
    </div>

    <!-- Q5: ¿Te duele algo? -->
    <div class="checkin-question" style="margin-bottom:28px">
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:10px;
      ">
        <div style="font-size:14px;font-weight:600;color:#fff">${t('checkin_pain')}</div>
        <!-- Toggle -->
        <div
          id="pain-toggle"
          role="switch"
          aria-checked="false"
          style="
            width:48px;height:27px;
            border-radius:var(--r-full);
            background:rgba(255,255,255,0.12);
            border:1px solid rgba(255,255,255,0.15);
            position:relative;
            cursor:pointer;
            transition:background 0.25s;
          "
        >
          <span id="pain-knob" style="
            position:absolute;
            top:3px;left:3px;
            width:19px;height:19px;
            border-radius:50%;
            background:#fff;
            transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></span>
        </div>
      </div>
      <div id="pain-detail" style="display:none;margin-top:8px">
        <input
          id="q-pain-location"
          type="text"
          placeholder="${t('checkin_pain_where_placeholder')}"
          style="
            width:100%;
            background:rgba(255,255,255,0.07);
            border:1px solid rgba(255,255,255,0.12);
            border-radius:var(--r-md);
            color:#fff;
            font-size:14px;
            padding:10px 14px;
            font-family:inherit;
            box-sizing:border-box;
            transition:border-color 0.2s;
          "
        />
      </div>
    </div>

    <!-- Actions -->
    <button
      id="checkin-submit"
      style="
        width:100%;
        padding:15px;
        background:linear-gradient(135deg, var(--color-primary,#940a0a) 0%, #c01010 100%);
        border:none;
        border-radius:var(--radius-lg,20px);
        color:#fff;
        font-size:16px;
        font-weight:700;
        cursor:pointer;
        letter-spacing:0.2px;
        box-shadow:0 4px 20px rgba(148,10,10,0.45);
        transition:opacity 0.2s, transform 0.15s;
        margin-bottom:12px;
      "
    >${t('checkin_submit')}</button>

    <div style="text-align:center">
      <button
        id="checkin-skip"
        style="
          background:none;
          border:none;
          color:var(--color-text-muted,#a7a7a7);
          font-size:13px;
          cursor:pointer;
          padding:4px 8px;
          text-decoration:underline;
          text-underline-offset:2px;
        "
      >${t('checkin_skip')}</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // ── State ────────────────────────────────────
  let selectedMood        = null;
  let selectedSleepQuality = null;
  let painActive          = false;

  // ── Emoji pickers ────────────────────────────
  card.querySelectorAll('[data-emoji-group="mood"]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMood = parseInt(btn.dataset.val);
      _selectEmoji(card, 'mood', btn);
    });
  });

  card.querySelectorAll('[data-emoji-group="sleep"]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSleepQuality = parseInt(btn.dataset.val);
      _selectEmoji(card, 'sleep', btn);
    });
  });

  // ── Pain toggle ──────────────────────────────
  const painToggle  = card.querySelector('#pain-toggle');
  const painKnob    = card.querySelector('#pain-knob');
  const painDetail  = card.querySelector('#pain-detail');

  painToggle.addEventListener('click', () => {
    painActive = !painActive;
    painToggle.setAttribute('aria-checked', painActive);
    painToggle.style.background = painActive
      ? 'var(--color-primary, #940a0a)'
      : 'rgba(255,255,255,0.12)';
    painToggle.style.borderColor = painActive
      ? 'rgba(148,10,10,0.6)'
      : 'rgba(255,255,255,0.15)';
    painKnob.style.transform = painActive ? 'translateX(21px)' : 'translateX(0)';
    painDetail.style.display = painActive ? 'block' : 'none';
  });

  // ── Textarea focus glow ──────────────────────
  [card.querySelector('#q-comment'), card.querySelector('#q-pain-location')].forEach(input => {
    if (!input) return;
    input.addEventListener('focus',  () => { input.style.borderColor = 'rgba(25,249,249,0.4)'; });
    input.addEventListener('blur',   () => { input.style.borderColor = 'rgba(255,255,255,0.12)'; });
  });

  // ── Submit ───────────────────────────────────
  card.querySelector('#checkin-submit').addEventListener('click', async () => {
    const sleepHours    = parseFloat(card.querySelector('#q-sleep-hours')?.value) || null;
    const comment       = card.querySelector('#q-comment')?.value?.trim() || null;
    const painLocation  = painActive
      ? (card.querySelector('#q-pain-location')?.value?.trim() || null)
      : null;

    const data = {
      mood:         selectedMood,
      sleepQuality: selectedSleepQuality,
      sleepHours,
      comment,
      pain:         painActive,
      painLocation,
      date:         todayStr,
      createdAt:    timestamp(),
    };

    try {
      const submitBtn = card.querySelector('#checkin-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = t('checkin_saving');

      await db.collection('users').doc(uid).collection('health').doc(todayStr).set(data, { merge: true });

      localStorage.setItem(lsKey, '1');
      toast(t('checkin_saved'), 'success');
      _closeOverlay(overlay);
    } catch (e) {
      const submitBtn = card.querySelector('#checkin-submit');
      submitBtn.disabled = false;
      submitBtn.textContent = t('checkin_submit');
      toast(t('checkin_error') + ': ' + e.message, 'error');
    }
  });

  // ── Skip ─────────────────────────────────────
  card.querySelector('#checkin-skip').addEventListener('click', () => {
    localStorage.setItem(lsKey, '1');
    _closeOverlay(overlay);
  });

  // ── Close on backdrop click ──────────────────
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      localStorage.setItem(lsKey, '1');
      _closeOverlay(overlay);
    }
  });
}

// ── Helpers ────────────────────────────────────
function _emojiRow(items, group) {
  return items.map(({ v, e, label }) => `
    <button
      data-emoji-group="${group}"
      data-val="${v}"
      style="
        flex:1;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:4px;
        background:rgba(255,255,255,0.06);
        border:1.5px solid rgba(255,255,255,0.1);
        border-radius:var(--r-md);
        padding:10px 4px 8px;
        cursor:pointer;
        transition:all 0.18s ease;
        -webkit-tap-highlight-color:transparent;
      "
      title="${label}"
    >
      <span style="font-size:22px;line-height:1">${e}</span>
      <span style="font-size:10px;color:var(--color-text-muted,#a7a7a7)">${label}</span>
    </button>
  `).join('');
}

function _selectEmoji(card, group, activeBtn) {
  card.querySelectorAll(`[data-emoji-group="${group}"]`).forEach(btn => {
    const selected = btn === activeBtn;
    btn.style.background     = selected ? 'rgba(25,249,249,0.15)'  : 'rgba(255,255,255,0.06)';
    btn.style.borderColor    = selected ? 'rgba(25,249,249,0.55)'  : 'rgba(255,255,255,0.1)';
    btn.style.transform      = selected ? 'scale(1.08)' : 'scale(1)';
    btn.style.boxShadow      = selected ? '0 0 12px rgba(25,249,249,0.2)' : 'none';
  });
}

function _closeOverlay(overlay) {
  overlay.style.animation = 'checkinFadeOut 0.3s ease forwards';
  setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 320);
}

function _formatDisplayDate() {
  const lang = getLang();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });
}

function _injectStyles() {
  const id = 'checkin-keyframes';
  if (document.getElementById(id)) return;
  const style    = document.createElement('style');
  style.id       = id;
  style.textContent = `
    @keyframes checkinFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes checkinFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes checkinSlideUp {
      from { transform: translateY(30px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    [data-checkin-card]::-webkit-scrollbar { display: none; }
    #q-sleep-hours::-webkit-inner-spin-button,
    #q-sleep-hours::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    #checkin-submit:hover  { opacity: 0.88; transform: translateY(-1px); }
    #checkin-submit:active { opacity: 1;    transform: translateY(0);    }
  `;
  document.head.appendChild(style);
}
