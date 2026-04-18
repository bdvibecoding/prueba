/* ═══════════════════════════════════════════════
   TGWL — utils.js
   Utility functions
═══════════════════════════════════════════════ */

import { appState } from './state.js';

// ── Date & Time ───────────────────────────────
export function formatDate(date, locale = 'es-ES') {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date?.seconds ? date.seconds * 1000 : date);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h  = Math.floor(totalSec / 3600);
  const m  = Math.floor((totalSec % 3600) / 60);
  const s  = totalSec % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function getAge(birthDateStr) {
  if (!birthDateStr) return null;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function todayString() {
  // Local date (YYYY-MM-DD) — rollover at 00:00 hora local, no UTC
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Milisegundos hasta la próxima medianoche local (para timers de reset diario)
export function msUntilLocalMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return next.getTime() - now.getTime();
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return `¡${t('greeting_morning')}`;
  if (h < 20) return `¡${t('greeting_afternoon')}`;
  return `¡${t('greeting_evening')}`;
}

export function getTimeLabel() {
  const now = new Date();
  const lang = appState.get('settings')?.language || 'es';
  return now.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ── Numbers & Formatting ──────────────────────
export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function formatWeight(kg) {
  return `${kg} kg`;
}

export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return round2(weightKg / (h * h));
}

export function bmiCategory(bmi) {
  if (!bmi) return '—';
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

export function deltaPercent(current, previous) {
  if (!previous || previous === 0) return null;
  return round2(((current - previous) / previous) * 100);
}

// ── DOM Helpers ───────────────────────────────
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}
export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') e.insertAdjacentHTML('beforeend', child);
    else if (child) e.appendChild(child);
  });
  return e;
}

export function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function setHTML(selector, html, parent = document) {
  const element = qs(selector, parent);
  if (element) element.innerHTML = html;
}

export function show(selector, parent = document) {
  const e = typeof selector === 'string' ? qs(selector, parent) : selector;
  if (e) e.classList.remove('hidden');
}

export function hide(selector, parent = document) {
  const e = typeof selector === 'string' ? qs(selector, parent) : selector;
  if (e) e.classList.add('hidden');
}

export function toggle(selector, parent = document) {
  const e = typeof selector === 'string' ? qs(selector, parent) : selector;
  if (e) e.classList.toggle('hidden');
}

// ── Toast Notification ────────────────────────
export function toast(message, type = 'info', duration = 3000) {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="display:flex;align-items:center">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 350);
  }, duration);
}

// ── Debounce / Throttle ───────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit = 200) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ── Ripple Effect ─────────────────────────────
export function addRipple(button) {
  button.addEventListener('click', function (e) {
    const r = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
    `;
    r.className = 'ripple';
    this.classList.add('ripple-container');
    this.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
}

// ── Confetti ──────────────────────────────────
export function launchConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#940a0a','#19f9f9','#ffffff','#f59e0b','#22c55e'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      animation-duration: ${Math.random() * 2 + 1.5}s;
      animation-delay: ${Math.random() * 0.5}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 4000);
}

// ── Audio beep (Web Audio API) ────────────────
let audioCtx = null;
export function beep(freq = 880, duration = 0.15, volume = 0.3) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* audio not supported */ }
}

export function beepWarning() {
  beep(660, 0.1, 0.4);
  setTimeout(() => beep(880, 0.1, 0.4), 150);
  setTimeout(() => beep(1100, 0.2, 0.5), 300);
}

// ── Screen Wake Lock ──────────────────────────
let wakeLock = null;
export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* not supported */ }
}
export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// ── Validate ──────────────────────────────────
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── LocalStorage helpers ──────────────────────
export function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export function lsDel(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ── Initials from name ────────────────────────
export function getInitials(name = '') {
  return name.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ── Translate ─────────────────────────────────
const I18N = {
  es: {
    roles: { admin: 'Administrador', coach: 'Coach', medico: 'Médico', fisio: 'Fisioterapeuta', psicologo: 'Psicólogo', nutricionista: 'Nutricionista', atleta: 'Atleta', cliente: 'Cliente' },
    days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    greeting_morning: 'Buenos días',
    greeting_afternoon: 'Buenas tardes',
    greeting_evening: 'Buenas noches',
  },
  en: {
    roles: { admin: 'Administrator', coach: 'Coach', medico: 'Doctor', fisio: 'Physiotherapist', psicologo: 'Psychologist', nutricionista: 'Nutritionist', atleta: 'Athlete', cliente: 'Client' },
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
  },
};

export function t(key, sub) {
  const lang = appState.get('settings')?.language || 'es';
  const dict = I18N[lang] || I18N['es'];
  if (sub) return dict[key]?.[sub] || sub;
  return dict[key] || key;
}

export function translateRole(role) {
  return t('roles', role) || role;
}

// ── Firestore date → JS Date ──────────────────
export function fsDateToDate(fsDate) {
  if (!fsDate) return null;
  if (fsDate.toDate) return fsDate.toDate();
  if (fsDate.seconds) return new Date(fsDate.seconds * 1000);
  return new Date(fsDate);
}
