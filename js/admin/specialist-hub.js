/* ═══════════════════════════════════════════════
   TGWL — admin/specialist-hub.js
   Specialist + Admin Client Workspace
   ▸ Desktop: 3 columns (clients | chat | info)
   ▸ Mobile:  tab bar (clients | chat | info)
   ▸ Roles: coach · medico · nutricionista · fisio · psicologo · admin
═══════════════════════════════════════════════ */

import { getUserProfile }                   from '../state.js';
import { db, collections, timestamp }       from '../firebase-config.js';
import { toast, formatDate, getInitials }   from '../utils.js';
import { openModal, closeModal }            from '../components/modal.js';
import { t }                                from '../i18n.js';

// ── Module-level state ─────────────────────────
let _profile     = null;
let _chatUnsub   = null;
let _clients     = [];
let _chatId      = null;
let _embedded    = false;  // true when loaded inside admin panel

// ── Role config ────────────────────────────────
const ROLE_CFG = {
  coach:         { label: 'Coach',          icon: '🏋️', field: 'assignedCoach',         color: '#ef4444', tools: ['stats','routines','notes'] },
  medico:        { label: 'Médico',         icon: '🩺', field: 'assignedMedico',        color: '#06b6d4', tools: ['stats','health','notes'] },
  nutricionista: { label: 'Nutricionista',  icon: '🥗', field: 'assignedNutricionista', color: '#22c55e', tools: ['stats','diet','notes'] },
  fisio:         { label: 'Fisioterapeuta', icon: '🦴', field: 'assignedFisio',         color: '#3b82f6', tools: ['stats','health','fisio_notes','notes'] },
  psicologo:     { label: 'Psicólogo',      icon: '🧠', field: 'assignedPsicologo',     color: '#a855f7', tools: ['stats','psych_notes','notes'] },
  admin:         { label: 'Admin',          icon: '🔑', field: null,                    color: '#f97316',
                   tools: ['stats','routines','diet','health','fisio_notes','psych_notes','notes','assignments'] },
};

// ── Styles (injected once) ─────────────────────
function injectStyles() {
  if (document.getElementById('sh-styles')) return;
  const s = document.createElement('style');
  s.id = 'sh-styles';
  s.textContent = `
    /* ── Hub container ── */
    .sh-hub {
      height: calc(100dvh
        - var(--top-bar-h, 56px)
        - var(--safe-top, env(safe-area-inset-top, 0px))
        - var(--bottom-nav-h, 72px)
        - var(--safe-bottom, env(safe-area-inset-bottom, 0px))
      );
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--color-bg);
    }
    /* When embedded inside admin panel, fill parent instead */
    .sh-hub.sh-embedded { height: 100%; }

    /* ── Mobile tab bar ── */
    .sh-tabs {
      display: none;
      flex-shrink: 0;
      border-bottom: 1px solid var(--glass-border);
      background: var(--color-bg);
    }
    .sh-tab {
      flex: 1; padding: 10px 4px;
      background: none; border: none;
      border-bottom: 2.5px solid transparent;
      font-size: 11px; font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer; font-family: inherit;
      transition: color .15s, border-color .15s;
    }
    .sh-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }

    /* ── Three-column layout ── */
    .sh-layout { display: flex; flex: 1; overflow: hidden; }

    /* Left panel */
    .sh-left {
      width: 260px; min-width: 260px;
      border-right: 1px solid var(--glass-border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sh-left-head {
      padding: 12px 14px 10px;
      border-bottom: 1px solid var(--glass-border); flex-shrink: 0;
    }
    .sh-left-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: var(--color-text-muted); margin-bottom: 8px;
    }
    .sh-search {
      width: 100%; box-sizing: border-box;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 20px; padding: 7px 12px;
      color: var(--color-text); font-size: 12px;
      font-family: inherit; outline: none;
    }
    .sh-clients-scroll { flex: 1; overflow-y: auto; }
    .sh-client-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,.04);
      border-left: 3px solid transparent;
      transition: background .15s, border-color .15s;
    }
    .sh-client-row:hover  { background: var(--glass-bg); }
    .sh-client-row.active { background: var(--glass-bg-strong); border-left-color: var(--cyan); }
    .sh-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg,var(--red),var(--cyan));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: #fff; flex-shrink: 0;
    }
    .sh-client-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sh-client-sub  { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sh-unread-dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; }

    /* Middle panel – chat */
    .sh-mid {
      flex: 1; display: flex; flex-direction: column;
      overflow: hidden; min-width: 0;
    }
    .sh-chat-head {
      padding: 10px 16px; border-bottom: 1px solid var(--glass-border);
      display: flex; align-items: center; gap: 10px; flex-shrink: 0; min-height: 57px;
    }
    .sh-messages {
      flex: 1; overflow-y: auto;
      padding: 12px 16px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      display: flex; flex-direction: column; gap: 8px;
      -webkit-overflow-scrolling: touch;
    }
    .sh-msg-out { display: flex; justify-content: flex-end; }
    .sh-bubble-out {
      max-width: 72%; padding: 9px 13px;
      background: linear-gradient(135deg,var(--red-light),var(--red));
      border-radius: 18px 18px 4px 18px;
      font-size: 14px; color: #fff; line-height: 1.45; word-break: break-word;
    }
    .sh-msg-in  { display: flex; gap: 8px; align-items: flex-end; }
    .sh-bubble-in {
      max-width: 72%; padding: 9px 13px;
      background: var(--glass-bg-strong);
      border: 1px solid var(--glass-border);
      border-radius: 18px 18px 18px 4px;
      font-size: 14px; color: var(--color-text); line-height: 1.45; word-break: break-word;
    }
    .sh-msg-time { font-size: 10px; opacity: .6; margin-top: 3px; }
    .sh-input-row {
      display: flex; gap: 8px; align-items: center;
      padding: 10px 14px;
      padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--glass-border); flex-shrink: 0;
    }
    .sh-input {
      flex: 1; background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 22px; padding: 9px 14px;
      color: var(--color-text); font-size: 14px;
      font-family: inherit; outline: none;
    }
    .sh-send {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,var(--red-light),var(--red));
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(148,10,10,.4);
      transition: transform .15s, opacity .15s;
    }
    .sh-send:active { transform: scale(.91); }

    /* Right panel – info */
    .sh-right {
      width: 300px; min-width: 300px;
      border-left: 1px solid var(--glass-border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sh-right-head {
      padding: 12px 14px; border-bottom: 1px solid var(--glass-border);
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: var(--color-text-muted); flex-shrink: 0;
    }
    .sh-info-scroll { flex: 1; overflow-y: auto; }
    .sh-info-block  { padding: 12px 14px; border-bottom: 1px solid var(--glass-border); }
    .sh-info-title  {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: var(--color-text-muted); margin-bottom: 8px;
    }
    .sh-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 13px; }
    .sh-stat-val  { font-weight: 700; color: var(--cyan); }

    /* Info tab bar (admin right panel) */
    .sh-info-tabs {
      display: flex; overflow-x: auto; gap: 4px;
      padding: 8px 12px; border-bottom: 1px solid var(--glass-border);
      flex-shrink: 0; scrollbar-width: none;
    }
    .sh-info-tabs::-webkit-scrollbar { display: none; }
    .sh-info-tab {
      padding: 5px 10px; border-radius: 20px;
      background: var(--glass-bg); border: 1px solid var(--glass-border);
      font-size: 11px; font-weight: 600; white-space: nowrap;
      color: var(--color-text-muted); cursor: pointer;
      transition: background .15s, color .15s;
    }
    .sh-info-tab.active { background: var(--cyan); color: #000; border-color: var(--cyan); }

    /* Textarea helper */
    .sh-textarea {
      width: 100%; box-sizing: border-box;
      background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm); padding: 8px 10px;
      color: var(--color-text); font-size: 12px;
      font-family: inherit; resize: vertical; outline: none;
      margin-bottom: 8px;
    }

    /* Mobile overrides */
    @media (max-width: 767px) {
      .sh-tabs { display: flex; }
      .sh-left, .sh-mid, .sh-right { display: none; width: 100%; min-width: 0; border: none; }
      .sh-left.sh-visible, .sh-mid.sh-visible, .sh-right.sh-visible { display: flex; }
    }
  `;
  document.head.appendChild(s);
}

// ── render ─────────────────────────────────────
export async function render(container, params = {}) {
  _profile  = getUserProfile();
  _embedded = !!params?.embedded;
  const role = _profile?.role || 'coach';
  const cfg  = ROLE_CFG[role] || ROLE_CFG.coach;

  injectStyles();

  container.innerHTML = `
    <div class="sh-hub${_embedded ? ' sh-embedded' : ''}" id="sh-hub">

      <!-- Mobile tab bar -->
      <div class="sh-tabs" id="sh-tabs">
        <button class="sh-tab active" data-panel="left">👥 Clientes</button>
        <button class="sh-tab"        data-panel="mid" >💬 Chat</button>
        <button class="sh-tab"        data-panel="right">📋 Info</button>
      </div>

      <div class="sh-layout">

        <!-- LEFT: client list -->
        <div class="sh-left sh-visible" id="sh-left">
          <div class="sh-left-head">
            <div class="sh-left-label">${cfg.icon} Mis clientes</div>
            ${(role === 'coach' || role === 'admin') ? `<button id="btn-my-routines" title="Mis rutinas" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444;border-radius:var(--radius-sm);padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">💪 Rutinas</button>` : ''}
            <input class="sh-search" id="sh-search" type="search" placeholder="Buscar cliente...">
          </div>
          <div class="sh-clients-scroll" id="sh-clients-scroll">
            ${_spinnerHtml()}
          </div>
        </div>

        <!-- MIDDLE: chat -->
        <div class="sh-mid" id="sh-mid">
          <div class="sh-chat-head" id="sh-chat-head">
            <div id="sh-chat-head-inner" style="display:flex;align-items:center;gap:10px;flex:1;opacity:.3">
              <div style="font-size:28px">💬</div>
              <div style="font-size:13px;color:var(--color-text-muted)">Selecciona un cliente para chatear</div>
            </div>
          </div>
          <div class="sh-messages" id="sh-messages">
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.25;gap:10px;padding:32px">
              <div style="font-size:48px">💬</div>
              <div style="font-size:14px">Selecciona un cliente para comenzar</div>
            </div>
          </div>
          <div class="sh-input-row" id="sh-input-row" style="display:none">
            <input class="sh-input" id="sh-msg-input" type="text" placeholder="Escribe un mensaje..." autocomplete="off">
            <button class="sh-send" id="sh-send-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- RIGHT: info -->
        <div class="sh-right" id="sh-right">
          <div class="sh-right-head">📋 Info del cliente</div>
          <div class="sh-info-scroll" id="sh-info-scroll">
            <div style="padding:40px 16px;text-align:center;opacity:.28">
              <div style="font-size:36px;margin-bottom:8px">👤</div>
              <div style="font-size:13px">Selecciona un cliente</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ── init ───────────────────────────────────────
export async function init(container) {
  _profile = getUserProfile();
  const role = _profile?.role || 'coach';
  const cfg  = ROLE_CFG[role] || ROLE_CFG.coach;

  await loadClients(container, role, cfg);

  // My Routines button
  container.querySelector('#btn-my-routines')?.addEventListener('click', () => openMyRoutinesPanel());

  // Search
  container.querySelector('#sh-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.sh-client-row').forEach(r => {
      r.style.display = (r.querySelector('.sh-client-name')?.textContent.toLowerCase().includes(q)) ? '' : 'none';
    });
  });

  // Send
  const input   = container.querySelector('#sh-msg-input');
  const sendBtn = container.querySelector('#sh-send-btn');
  const doSend  = () => {
    if (!_chatId || !input?.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    db.collection('chats').doc(_chatId).collection('messages').add({
      text, senderId: _profile.uid, senderName: _profile.name || '', createdAt: timestamp(),
    }).catch(e => { if (input) input.value = text; });
  };
  sendBtn?.addEventListener('click', doSend);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });

  // Mobile tabs
  container.querySelectorAll('.sh-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.sh-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const p = tab.dataset.panel;
      ['left','mid','right'].forEach(id => {
        container.querySelector(`#sh-${id}`)?.classList.toggle('sh-visible', id === p);
      });
    });
  });
}

// ── Load clients ───────────────────────────────
async function loadClients(container, role, cfg) {
  const el = container.querySelector('#sh-clients-scroll');

  let snap;
  try {
    if (role === 'admin') {
      // Admin sees all users (admins/staff are also clients)
      snap = await db.collection('users').orderBy('name').limit(100).get();
    } else {
      snap = await db.collection('users')
        .where(cfg.field, '==', _profile.uid)
        .limit(60).get();
    }
  } catch {
    try {
      snap = await db.collection('users').where('assignedCoach', '==', _profile.uid).limit(60).get();
    } catch { snap = { empty: true, docs: [] }; }
  }

  if (!snap || snap.empty) {
    el.innerHTML = `
      <div style="padding:40px 16px;text-align:center;opacity:.5">
        <div style="font-size:36px;margin-bottom:8px">👥</div>
        <div style="font-size:13px;color:var(--color-text-muted)">Sin clientes asignados</div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px">El administrador te asignará clientes</div>
      </div>`;
    return;
  }

  _clients = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  renderClientList(container, _clients);
}

// ── Render client list ─────────────────────────
function renderClientList(container, clients) {
  const el = container.querySelector('#sh-clients-scroll');
  el.innerHTML = clients.map(c => `
    <div class="sh-client-row" data-uid="${c.uid}">
      <div class="sh-avatar">${getInitials(c.name || '?')}</div>
      <div style="flex:1;min-width:0">
        <div class="sh-client-name">${_esc(c.name || 'Cliente')}${c.isClient && !['cliente','atleta'].includes(c.role) ? ` <span style="font-size:10px;background:rgba(0,200,255,.15);color:var(--cyan);padding:1px 5px;border-radius:4px;margin-left:4px">${c.role}</span>` : ''}</div>
        <div class="sh-client-sub">${_esc(c.email || '')}</div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.sh-client-row').forEach(row => {
    row.addEventListener('click', () => {
      const client = _clients.find(c => c.uid === row.dataset.uid);
      if (!client) return;
      selectClient(container, client);
      if (window.innerWidth < 768) {
        container.querySelectorAll('.sh-tab').forEach(t => t.classList.remove('active'));
        container.querySelector('[data-panel="mid"]')?.classList.add('active');
        ['left','mid','right'].forEach(id => {
          container.querySelector(`#sh-${id}`)?.classList.toggle('sh-visible', id === 'mid');
        });
      }
    });
  });
}

// ── Select client ──────────────────────────────
function selectClient(container, client) {
  _chatId = [_profile.uid, client.uid].sort().join('_');

  container.querySelectorAll('.sh-client-row')
    .forEach(r => r.classList.toggle('active', r.dataset.uid === client.uid));

  // Chat header
  const hi = container.querySelector('#sh-chat-head-inner');
  if (hi) {
    hi.style.opacity = '';
    hi.innerHTML = `
      <div class="sh-avatar" style="width:36px;height:36px;font-size:13px">${getInitials(client.name || '?')}</div>
      <div style="min-width:0">
        <div style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(client.name || 'Cliente')}</div>
        <div style="font-size:11px;color:var(--color-text-muted)">${_esc(client.email || '')}</div>
      </div>`;
  }

  const inputRow = container.querySelector('#sh-input-row');
  if (inputRow) inputRow.style.display = '';
  setTimeout(() => container.querySelector('#sh-msg-input')?.focus(), 150);

  subscribeChat(container);
  loadClientInfo(container, client);
}

// ── Realtime chat ──────────────────────────────
function subscribeChat(container) {
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
  const el = container.querySelector('#sh-messages');
  if (!el || !_chatId) return;

  el.innerHTML = `<div style="display:flex;justify-content:center;padding:40px">${_spinnerHtml()}</div>`;

  _chatUnsub = db.collection('chats').doc(_chatId)
    .collection('messages').orderBy('createdAt','asc').limit(100)
    .onSnapshot(snap => renderMessages(el, snap), err => console.error('[Hub] chat', err));
}

function renderMessages(el, snapshot) {
  if (!el) return;
  if (snapshot.empty) {
    el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.3;gap:10px;padding:32px">
        <div style="font-size:40px">💬</div>
        <div style="font-size:13px">Inicia la conversación</div>
      </div>`;
    return;
  }
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.innerHTML = snapshot.docs.map(doc => {
    const m = doc.data(); const mine = m.senderId === _profile?.uid;
    const time = _fmtTime(m.createdAt);
    return mine
      ? `<div class="sh-msg-out"><div class="sh-bubble-out">${_esc(m.text||'')}<div class="sh-msg-time" style="text-align:right">${time}</div></div></div>`
      : `<div class="sh-msg-in">
           <div class="sh-avatar" style="width:26px;height:26px;font-size:10px;flex-shrink:0">${getInitials(m.senderName||'?')}</div>
           <div class="sh-bubble-in">${_esc(m.text||'')}<div class="sh-msg-time">${time}</div></div>
         </div>`;
  }).join('');
  if (wasAtBottom || snapshot.docChanges().some(c => c.type === 'added')) el.scrollTop = el.scrollHeight;
}

// ── Client info panel ──────────────────────────
async function loadClientInfo(container, client) {
  const role   = _profile?.role || 'coach';
  const cfg    = ROLE_CFG[role] || ROLE_CFG.coach;
  const infoEl = container.querySelector('#sh-info-scroll');
  if (!infoEl) return;

  infoEl.innerHTML = `<div style="padding:32px;text-align:center;opacity:.4">${_spinnerHtml()}</div>`;

  const uid      = client.uid;
  const initials = getInitials(client.name || '?');

  // Load workout stats
  let totalSessions = 0, avgRpe = 0, lastDate = '';
  try {
    const ss = await db.collection('users').doc(uid)
      .collection('workoutSessions').orderBy('startTime','desc').limit(10).get();
    const sessions = ss.docs.map(d => d.data());
    totalSessions  = sessions.length;
    avgRpe         = sessions.filter(s => s.rpe).reduce((a, s, _, arr) => a + s.rpe / arr.length, 0);
    if (sessions[0]) lastDate = formatDate(sessions[0].startTime?.toDate?.() || new Date(sessions[0].startTime));
  } catch {}

  // Profile header
  const headerHtml = `
    <div style="padding:16px;text-align:center;border-bottom:1px solid var(--glass-border)">
      <div class="sh-avatar" style="width:52px;height:52px;font-size:20px;margin:0 auto 8px">${initials}</div>
      <div style="font-weight:700;font-size:15px">${_esc(client.name || 'Cliente')}</div>
      <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${_esc(client.email || '')}</div>
      <div style="margin-top:8px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
        ${client.experience ? `<span class="badge badge-gray" style="font-size:10px">${client.experience}</span>` : ''}
        ${client.subscriptionStatus && client.subscriptionStatus !== 'free'
          ? `<span class="badge badge-cyan" style="font-size:10px">${client.subscriptionStatus}</span>` : ''}
      </div>
    </div>`;

  // Stats block
  const statsHtml = `
    <div class="sh-info-block">
      <div class="sh-info-title">📊 Estadísticas</div>
      <div class="sh-stat-row"><span>Entrenos</span><span class="sh-stat-val">${totalSessions}</span></div>
      <div class="sh-stat-row"><span>RPE medio</span><span class="sh-stat-val">${avgRpe ? avgRpe.toFixed(1) : '—'}</span></div>
      ${lastDate ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:6px">Último: ${lastDate}</div>` : ''}
    </div>`;

  if (role === 'admin') {
    // Admin: full panel with tabs
    infoEl.innerHTML = `
      ${headerHtml}
      <div class="sh-info-tabs" id="sh-info-tabs">
        <button class="sh-info-tab active" data-itab="stats">📊 Stats</button>
        <button class="sh-info-tab" data-itab="routines">💪 Rutinas</button>
        <button class="sh-info-tab" data-itab="diet">🥗 Dieta</button>
        <button class="sh-info-tab" data-itab="health">🩺 Salud</button>
        <button class="sh-info-tab" data-itab="notes">📝 Notas</button>
        <button class="sh-info-tab" data-itab="team">👥 Equipo</button>
      </div>
      <div id="sh-itab-stats"    class="sh-itab-panel">${_statsContent(totalSessions, avgRpe, lastDate)}</div>
      <div id="sh-itab-routines" class="sh-itab-panel" style="display:none">${_routinesContent(uid)}</div>
      <div id="sh-itab-diet"     class="sh-itab-panel" style="display:none">${_dietContent(uid)}</div>
      <div id="sh-itab-health"   class="sh-itab-panel" style="display:none">${_healthContent(uid)}</div>
      <div id="sh-itab-notes"    class="sh-itab-panel" style="display:none">${_notesContent(uid)}</div>
      <div id="sh-itab-team"     class="sh-itab-panel" style="display:none">${_teamContent(client)}</div>
    `;

    // Wire tab switching
    infoEl.querySelectorAll('.sh-info-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        infoEl.querySelectorAll('.sh-info-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        infoEl.querySelectorAll('.sh-itab-panel').forEach(p => p.style.display = 'none');
        infoEl.querySelector(`#sh-itab-${tab.dataset.itab}`)?.style.setProperty('display', '');
        // Lazy load
        if (tab.dataset.itab === 'routines') loadRoutinesTab(infoEl, uid);
        if (tab.dataset.itab === 'diet')     loadDietTab(infoEl, uid);
        if (tab.dataset.itab === 'health')   loadHealthTab(infoEl, uid);
        if (tab.dataset.itab === 'notes')    loadNotesTab(infoEl, uid, client.name);
        if (tab.dataset.itab === 'team')     loadTeamTab(infoEl, client);
      });
    });

    // Wire stats tab actions
    wireActionsBlock(infoEl, uid, 'stats', client.name);

  } else {
    // Specialist: role-filtered panel
    const tools = cfg.tools || [];
    let html     = headerHtml + statsHtml;

    if (tools.includes('routines'))    html += _routinesBlock(uid);
    if (tools.includes('diet'))        html += _dietBlock(uid);
    if (tools.includes('health'))      html += _healthBlock(uid);
    if (tools.includes('fisio_notes')) html += _fisioNotesBlock(uid);
    if (tools.includes('psych_notes')) html += _psychNotesBlock(uid);
    if (tools.includes('notes'))       html += _notesBlock(uid, client.name);

    infoEl.innerHTML = html;
    wireAllBlocks(infoEl, uid, client.name);
  }
}

// ── Admin tab: static content templates ────────
function _statsContent(total, rpe, lastDate) {
  return `
    <div class="sh-info-block">
      <div class="sh-stat-row"><span>Entrenos totales</span><span class="sh-stat-val">${total}</span></div>
      <div class="sh-stat-row"><span>RPE medio</span><span class="sh-stat-val">${rpe ? rpe.toFixed(1) : '—'}</span></div>
      ${lastDate ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:6px">Último: ${lastDate}</div>` : ''}
    </div>`;
}
function _routinesContent(uid)  { return `<div class="sh-info-block" id="blk-routines-${uid}">${_spinnerHtml()}</div>`; }
function _dietContent(uid)      { return `<div class="sh-info-block" id="blk-diet-${uid}">${_spinnerHtml()}</div>`; }
function _healthContent(uid)    { return `<div class="sh-info-block" id="blk-health-${uid}">${_spinnerHtml()}</div>`; }
function _notesContent(uid)     { return `<div class="sh-info-block" id="blk-notes-${uid}">${_spinnerHtml()}</div>`; }
function _teamContent(client)   { return `<div class="sh-info-block" id="blk-team-${client.uid}">${_spinnerHtml()}</div>`; }

// ── Specialist blocks (static HTML + lazy load) ─
function _routinesBlock(uid) {
  return `<div class="sh-info-block" id="blk-routines-${uid}">
    <div class="sh-info-title">💪 Rutinas asignadas</div>
    ${_spinnerHtml()}
  </div>`;
}
function _dietBlock(uid) {
  return `<div class="sh-info-block" id="blk-diet-${uid}">
    <div class="sh-info-title">🥗 Plan nutricional</div>
    ${_spinnerHtml()}
  </div>`;
}
function _healthBlock(uid) {
  return `<div class="sh-info-block" id="blk-health-${uid}">
    <div class="sh-info-title">🩺 Historial médico</div>
    ${_spinnerHtml()}
  </div>`;
}
function _fisioNotesBlock(uid) {
  return `<div class="sh-info-block" id="blk-fisio-${uid}">
    <div class="sh-info-title">🦴 Notas fisioterapia</div>
    <textarea class="sh-textarea" id="sh-fisio-notes-${uid}" rows="3" placeholder="Notas de fisioterapia..."></textarea>
    <button class="btn-accent btn-full" data-save-fisio="${uid}" style="font-size:12px;padding:7px">💾 Guardar</button>
  </div>`;
}
function _psychNotesBlock(uid) {
  return `<div class="sh-info-block" id="blk-psych-${uid}">
    <div class="sh-info-title">🧠 Notas psicológicas</div>
    <textarea class="sh-textarea" id="sh-psych-notes-${uid}" rows="3" placeholder="Notas sesión psicológica..."></textarea>
    <button class="btn-accent btn-full" data-save-psych="${uid}" style="font-size:12px;padding:7px">💾 Guardar</button>
  </div>`;
}
function _notesBlock(uid, name) {
  return `<div class="sh-info-block">
    <div class="sh-info-title">📝 Notas del equipo</div>
    <textarea class="sh-textarea" id="sh-team-notes-${uid}" rows="3" placeholder="Notas sobre ${name || 'el cliente'}..."></textarea>
    <button class="btn-accent btn-full" data-save-notes="${uid}" style="font-size:12px;padding:7px">💾 Guardar</button>
  </div>`;
}

// ── Lazy tab loaders (admin) ────────────────────
async function loadRoutinesTab(infoEl, uid) {
  const el = infoEl.querySelector(`#blk-routines-${uid}`) || infoEl.querySelector('[id^="blk-routines-"]');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';
  try {
    const snap = await collections.assignments(uid).orderBy('assignedAt','desc').limit(10).get();
    const existing = snap.docs.map(d => d.data());
    el.innerHTML = `
      <div class="sh-info-title">💪 Rutinas asignadas</div>
      ${existing.length ? existing.map(r => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <span>📋</span>
          <div style="flex:1;font-size:12px">${_esc(r.name || r.routineId)}</div>
          <span style="font-size:10px;color:var(--color-text-muted)">${formatDate(r.assignedAt?.toDate?.() || r.assignedAt)}</span>
        </div>`).join('')
      : `<p style="font-size:12px;color:var(--color-text-muted)">Sin rutinas asignadas</p>`}
      <button class="btn-primary btn-full" id="btn-assign-routine-${uid}" style="margin-top:10px;font-size:12px;padding:8px">
        📋 Asignar rutina
      </button>`;
    el.querySelector(`#btn-assign-routine-${uid}`)?.addEventListener('click', () => openAssignRoutineModal(uid));
  } catch (e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function loadDietTab(infoEl, uid) {
  const el = infoEl.querySelector(`#blk-diet-${uid}`) || infoEl.querySelector('[id^="blk-diet-"]');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';
  try {
    const snap = await collections.dietas(uid).orderBy('assignedAt','desc').limit(5).get();
    const diets = snap.docs.map(d => d.data());
    el.innerHTML = `
      <div class="sh-info-title">🥗 Planes nutricionales</div>
      ${diets.length ? diets.map(d => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <span>🥗</span>
          <div style="flex:1;font-size:12px">${_esc(d.name || d.type)}</div>
          <span class="badge badge-gray" style="font-size:10px">${d.type || ''}</span>
        </div>`).join('')
      : `<p style="font-size:12px;color:var(--color-text-muted)">Sin planes asignados</p>`}
      <button class="btn-primary btn-full" id="btn-assign-diet-${uid}" style="margin-top:10px;font-size:12px;padding:8px">
        🥗 Asignar menú
      </button>`;
    el.querySelector(`#btn-assign-diet-${uid}`)?.addEventListener('click', () => openAssignDietModal(uid, ''));
  } catch (e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function loadHealthTab(infoEl, uid) {
  const el = infoEl.querySelector(`#blk-health-${uid}`) || infoEl.querySelector('[id^="blk-health-"]');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';
  try {
    const [healthSnap, bioSnap] = await Promise.all([
      collections.health(uid).orderBy('date','desc').limit(5).get(),
      collections.biomedidas(uid).orderBy('date','desc').limit(3).get(),
    ]);
    el.innerHTML = `
      <div class="sh-info-title">🩺 Historial de salud</div>
      ${healthSnap.docs.length ? healthSnap.docs.map(doc => {
        const d = doc.data();
        return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px">
          <div style="font-weight:600">${formatDate(d.date?.toDate?.() || new Date(d.date))}</div>
          ${d.notes ? `<div style="color:var(--color-text-muted);margin-top:2px">${_esc(d.notes)}</div>` : ''}
        </div>`}).join('')
      : `<p style="font-size:12px;color:var(--color-text-muted)">Sin registros de salud</p>`}
      ${bioSnap.docs.length ? `
        <div class="sh-info-title" style="margin-top:12px">📏 Biomedidas recientes</div>
        ${bioSnap.docs.map(doc => {
          const d = doc.data();
          return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
            <span>${formatDate(d.date?.toDate?.() || new Date(d.date))}</span>
            <span style="color:var(--cyan)">${d.weight ? d.weight + ' kg' : ''} ${d.bodyFat ? '· ' + d.bodyFat + '% GC' : ''}</span>
          </div>`;
        }).join('')}` : ''}
      <textarea class="sh-textarea" id="sh-health-note-${uid}" rows="2" placeholder="Añadir nota médica..." style="margin-top:10px"></textarea>
      <button class="btn-primary btn-full" id="btn-add-health-note-${uid}" style="font-size:12px;padding:8px">
        🩺 Guardar nota médica
      </button>`;
    el.querySelector(`#btn-add-health-note-${uid}`)?.addEventListener('click', async () => {
      const notes = el.querySelector(`#sh-health-note-${uid}`)?.value.trim();
      if (!notes) return;
      await collections.health(uid).add({ notes, date: timestamp(), addedBy: _profile.uid, createdAt: timestamp() });
      toast('Nota guardada ✅', 'success');
      el.querySelector(`#sh-health-note-${uid}`).value = '';
      el.dataset.loaded = '';
      loadHealthTab(infoEl, uid);
    });
  } catch (e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function loadNotesTab(infoEl, uid, clientName) {
  const el = infoEl.querySelector(`#blk-notes-${uid}`) || infoEl.querySelector('[id^="blk-notes-"]');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  // Load existing saved notes from user doc
  let savedNotes = '';
  try {
    const snap = await db.collection('users').doc(uid).get();
    savedNotes = snap.data()?.coachNotes || snap.data()?.specialistNotes || '';
  } catch {}

  el.innerHTML = `
    <div class="sh-info-title">📝 Notas del equipo</div>
    <textarea class="sh-textarea" id="sh-notes-ta-${uid}" rows="5"
      placeholder="Notas sobre ${_esc(clientName || 'el cliente')}...">${_esc(savedNotes)}</textarea>
    <button class="btn-accent btn-full" id="btn-save-notes-${uid}" style="font-size:12px;padding:8px">
      💾 Guardar notas
    </button>
    <div class="sh-info-title" style="margin-top:14px">🩺 Nota médica rápida</div>
    <textarea class="sh-textarea" id="sh-med-note-${uid}" rows="2" placeholder="Nota médica de sesión..."></textarea>
    <button class="btn-primary btn-full" id="btn-save-med-note-${uid}" style="font-size:12px;padding:8px">
      🩺 Añadir nota médica
    </button>
    <div class="sh-info-title" style="margin-top:14px">🧠 Nota psicológica rápida</div>
    <textarea class="sh-textarea" id="sh-psy-note-${uid}" rows="2" placeholder="Nota de sesión psicológica..."></textarea>
    <button class="btn-primary btn-full" id="btn-save-psy-note-${uid}" style="font-size:12px;padding:8px">
      🧠 Añadir nota psicológica
    </button>`;

  el.querySelector(`#btn-save-notes-${uid}`)?.addEventListener('click', async () => {
    const notes = el.querySelector(`#sh-notes-ta-${uid}`)?.value.trim() || '';
    await db.collection('users').doc(uid).update({ coachNotes: notes, updatedAt: timestamp() });
    toast('Notas guardadas ✅', 'success');
  });

  el.querySelector(`#btn-save-med-note-${uid}`)?.addEventListener('click', async () => {
    const note = el.querySelector(`#sh-med-note-${uid}`)?.value.trim();
    if (!note) return;
    await collections.health(uid).add({ notes: note, type: 'medico', date: timestamp(), addedBy: _profile.uid, createdAt: timestamp() });
    toast('Nota médica guardada ✅', 'success');
    el.querySelector(`#sh-med-note-${uid}`).value = '';
  });

  el.querySelector(`#btn-save-psy-note-${uid}`)?.addEventListener('click', async () => {
    const note = el.querySelector(`#sh-psy-note-${uid}`)?.value.trim();
    if (!note) return;
    await collections.notes(uid).add({ text: note, type: 'psicologo', authorUid: _profile.uid, createdAt: timestamp() });
    toast('Nota psicológica guardada ✅', 'success');
    el.querySelector(`#sh-psy-note-${uid}`).value = '';
  });
}

async function loadTeamTab(infoEl, client) {
  const uid = client.uid;
  const el  = infoEl.querySelector(`#blk-team-${uid}`) || infoEl.querySelector('[id^="blk-team-"]');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  // Load current specialist assignments
  const fields = { Coach: 'assignedCoach', Médico: 'assignedMedico', Fisio: 'assignedFisio', Psicólogo: 'assignedPsicologo', Nutricionista: 'assignedNutricionista' };
  const icons  = { Coach: '🏋️', Médico: '🩺', Fisio: '🦴', Psicólogo: '🧠', Nutricionista: '🥗' };

  let rows = '';
  for (const [label, field] of Object.entries(fields)) {
    const assignedUid = client[field];
    let name = assignedUid ? '...' : '—';
    if (assignedUid) {
      try { const s = await db.collection('users').doc(assignedUid).get(); name = s.data()?.name || assignedUid; } catch {}
    }
    rows += `
      <div class="sh-stat-row" style="border-bottom:1px solid rgba(255,255,255,.05);padding:6px 0">
        <span>${icons[label]} ${label}</span>
        <span style="font-size:11px;color:${assignedUid ? 'var(--cyan)' : 'var(--color-text-muted)'}">${name}</span>
      </div>`;
  }

  // Load staff list for assignment
  let staffOpts = '';
  try {
    const staffSnap = await db.collection('users')
      .where('role', 'in', ['coach','medico','fisio','psicologo','nutricionista'])
      .limit(40).get();
    const staffList = staffSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const byRole    = staffList.reduce((acc, s) => { (acc[s.role] = acc[s.role] || []).push(s); return acc; }, {});

    staffOpts = Object.entries({ coach: '🏋️ Coach', medico: '🩺 Médico', fisio: '🦴 Fisio', psicologo: '🧠 Psicólogo', nutricionista: '🥗 Nutricionista' })
      .map(([role, label]) => {
        const members = byRole[role] || [];
        const roleField = `assigned${role.charAt(0).toUpperCase() + role.slice(1)}`;
        return `
          <div style="margin-top:10px">
            <div style="font-size:11px;font-weight:700;color:var(--color-text-muted);margin-bottom:4px">${label}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${members.map(m => `
                <button class="btn-icon" data-assign-uid="${m.uid}" data-assign-field="${roleField}"
                  style="font-size:11px;padding:4px 8px;border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-border);cursor:pointer;color:var(--color-text)">
                  ${getInitials(m.name)} ${m.name?.split(' ')[0]}
                </button>`).join('')}
              ${members.length === 0 ? `<span style="font-size:11px;color:var(--color-text-muted)">Sin personal de este rol</span>` : ''}
            </div>
          </div>`;
      }).join('');
  } catch {}

  el.innerHTML = `
    <div class="sh-info-title">👥 Equipo asignado</div>
    ${rows}
    <div class="sh-info-title" style="margin-top:14px">➕ Reasignar especialistas</div>
    ${staffOpts}`;

  el.querySelectorAll('[data-assign-uid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const field = btn.dataset.assignField;
      const sUid  = btn.dataset.assignUid;
      await db.collection('users').doc(uid).update({ [field]: sUid, updatedAt: timestamp() });
      // Update local client reference
      const idx = _clients.findIndex(c => c.uid === uid);
      if (idx >= 0) _clients[idx][field] = sUid;
      toast('Especialista asignado ✅', 'success');
      el.dataset.loaded = '';
      loadTeamTab(infoEl, _clients[idx] || client);
    });
  });
}

// ── Wire blocks (specialist mode) ─────────────
function wireActionsBlock(infoEl, uid, tabName, clientName) {
  // Already handled per-tab in admin mode
}

function wireAllBlocks(infoEl, uid, clientName) {
  // Routines block
  const rb = infoEl.querySelector(`#blk-routines-${uid}`);
  if (rb) {
    loadRoutinesTab({ querySelector: sel => sel.includes(`blk-routines-${uid}`) ? rb : null }, uid);
    // rewire using container as the infoEl
    _loadBlockInto(rb, uid, clientName, 'routines');
  }
  // Diet block
  const db2 = infoEl.querySelector(`#blk-diet-${uid}`);
  if (db2) _loadBlockInto(db2, uid, clientName, 'diet');
  // Health block
  const hb = infoEl.querySelector(`#blk-health-${uid}`);
  if (hb) _loadBlockInto(hb, uid, clientName, 'health');

  // Fisio notes
  infoEl.querySelector(`[data-save-fisio="${uid}"]`)?.addEventListener('click', async () => {
    const notes = infoEl.querySelector(`#sh-fisio-notes-${uid}`)?.value.trim();
    if (!notes) return;
    await collections.health(uid).add({ notes, type: 'fisio', date: timestamp(), addedBy: _profile.uid, createdAt: timestamp() });
    toast('Nota fisio guardada ✅', 'success');
  });
  // Psych notes
  infoEl.querySelector(`[data-save-psych="${uid}"]`)?.addEventListener('click', async () => {
    const notes = infoEl.querySelector(`#sh-psych-notes-${uid}`)?.value.trim();
    if (!notes) return;
    await collections.notes(uid).add({ text: notes, type: 'psicologo', authorUid: _profile.uid, createdAt: timestamp() });
    toast('Nota psicológica guardada ✅', 'success');
  });
  // Team notes
  infoEl.querySelector(`[data-save-notes="${uid}"]`)?.addEventListener('click', async () => {
    const notes = infoEl.querySelector(`#sh-team-notes-${uid}`)?.value.trim() || '';
    await db.collection('users').doc(uid).update({ coachNotes: notes, updatedAt: timestamp() });
    toast('Notas guardadas ✅', 'success');
  });
}

// Inline block loader for specialist mode
async function _loadBlockInto(el, uid, clientName, type) {
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  if (type === 'routines') {
    try {
      const snap = await collections.assignments(uid).orderBy('assignedAt','desc').limit(10).get();
      const list  = snap.docs.map(d => d.data());
      el.innerHTML = `
        <div class="sh-info-title">💪 Rutinas asignadas</div>
        ${list.length ? list.map(r => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
            <span>📋</span>
            <div style="flex:1;font-size:12px">${_esc(r.name || r.routineId)}</div>
          </div>`).join('')
        : `<p style="font-size:12px;color:var(--color-text-muted)">Sin rutinas asignadas</p>`}
        <button class="btn-primary btn-full" id="btn-asign-r-${uid}" style="margin-top:8px;font-size:12px;padding:8px">
          📋 Asignar rutina
        </button>`;
      el.querySelector(`#btn-asign-r-${uid}`)?.addEventListener('click', () => openAssignRoutineModal(uid));
    } catch {}
  }

  if (type === 'diet') {
    try {
      const snap = await collections.dietas(uid).orderBy('assignedAt','desc').limit(5).get();
      const list  = snap.docs.map(d => d.data());
      el.innerHTML = `
        <div class="sh-info-title">🥗 Plan nutricional</div>
        ${list.length ? list.map(d => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
            <span>🥗</span>
            <div style="flex:1;font-size:12px">${_esc(d.name||d.type)}</div>
            <span class="badge badge-gray" style="font-size:10px">${d.type||''}</span>
          </div>`).join('')
        : `<p style="font-size:12px;color:var(--color-text-muted)">Sin planes asignados</p>`}
        <button class="btn-primary btn-full" id="btn-asign-d-${uid}" style="margin-top:8px;font-size:12px;padding:8px">
          🥗 Asignar menú
        </button>`;
      el.querySelector(`#btn-asign-d-${uid}`)?.addEventListener('click', () => openAssignDietModal(uid, clientName));
    } catch {}
  }

  if (type === 'health') {
    try {
      const snap = await collections.health(uid).orderBy('date','desc').limit(5).get();
      el.innerHTML = `
        <div class="sh-info-title">🩺 Historial médico</div>
        ${snap.docs.length ? snap.docs.map(doc => {
          const d = doc.data();
          return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px">
            <div style="font-weight:600">${formatDate(d.date?.toDate?.() || new Date(d.date))}</div>
            ${d.notes ? `<div style="color:var(--color-text-muted)">${_esc(d.notes)}</div>` : ''}
          </div>`;
        }).join('')
        : `<p style="font-size:12px;color:var(--color-text-muted)">Sin registros</p>`}
        <textarea class="sh-textarea" id="sh-hlt-${uid}" rows="2" placeholder="Añadir nota médica..." style="margin-top:8px"></textarea>
        <button class="btn-primary btn-full" id="btn-add-h-${uid}" style="font-size:12px;padding:8px">🩺 Guardar nota</button>`;
      el.querySelector(`#btn-add-h-${uid}`)?.addEventListener('click', async () => {
        const n = el.querySelector(`#sh-hlt-${uid}`)?.value.trim(); if (!n) return;
        await collections.health(uid).add({ notes: n, type: 'medico', date: timestamp(), addedBy: _profile.uid, createdAt: timestamp() });
        toast('Nota guardada ✅', 'success');
        el.querySelector(`#sh-hlt-${uid}`).value = '';
        el.dataset.loaded = ''; _loadBlockInto(el, uid, clientName, 'health');
      });
    } catch {}
  }
}

// ── Modals ─────────────────────────────────────
async function openAssignRoutineModal(clientUid) {
  const snap     = await db.collection('routines').limit(50).get();
  const routines = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    ${routines.length
      ? routines.map(r => `
          <div class="admin-user-card" data-rid="${r.id}" data-rname="${_escAttr(r.name)}" style="cursor:pointer">
            <span style="font-size:20px">💪</span>
            <div style="flex:1">
              <div style="font-weight:700">${_esc(r.name)}</div>
              <div class="text-muted">${r.exercises?.length || 0} ejercicios · ${_esc(r.createdByName || '')}</div>
            </div>
            <span class="badge badge-cyan">Asignar</span>
          </div>`).join('')
      : `<p class="text-muted" style="padding:16px">No hay rutinas creadas.</p>`}
  `;
  openModal(html);
  document.getElementById('modal-content')?.querySelectorAll('[data-rid]').forEach(card => {
    card.addEventListener('click', async () => {
      await collections.assignments(clientUid).add({
        routineId: card.dataset.rid, name: card.dataset.rname,
        assignedBy: _profile.uid, assignedAt: timestamp(), createdAt: timestamp(),
      });
      toast('Rutina asignada ✅', 'success');
      closeModal();
    });
  });
}

async function openAssignDietModal(clientUid, clientName) {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">🥗 Asignar menú — ${_esc(clientName || 'Cliente')}</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="form-row">
      <label class="field-label">Tipo de dieta</label>
      <select id="diet-type" class="input-solo" style="margin-top:4px">
        <option value="volumen">🏋️ Volumen</option>
        <option value="definicion">🔥 Definición</option>
        <option value="mantenimiento">⚖️ Mantenimiento</option>
        <option value="terapeutica">💊 Terapéutica</option>
      </select>
    </div>
    <div class="form-row">
      <label class="field-label">Nombre del menú</label>
      <input type="text" id="diet-name" class="input-solo" placeholder="Ej: Menú semana 1">
    </div>
    <div class="form-row">
      <label class="field-label">Calorías objetivo (opcional)</label>
      <input type="number" id="diet-kcal" class="input-solo" placeholder="Ej: 2200">
    </div>
    <button class="btn-primary btn-full" id="btn-confirm-diet" style="margin-top:var(--space-md)">Asignar</button>
  `;
  openModal(html);
  const mc = document.getElementById('modal-content');
  mc?.querySelector('#btn-confirm-diet')?.addEventListener('click', async () => {
    const type = mc.querySelector('#diet-type')?.value || 'volumen';
    const name = mc.querySelector('#diet-name')?.value.trim() || `Menú ${type}`;
    const kcal = parseInt(mc.querySelector('#diet-kcal')?.value) || null;
    await collections.dietas(clientUid).add({
      type, name, kcal: kcal || undefined,
      assignedBy: _profile.uid, assignedAt: timestamp(), createdAt: timestamp(),
    });
    toast(`Menú "${name}" asignado ✅`, 'success');
    closeModal();
  });
}

// ── My Routines Panel ──────────────────────────
async function openMyRoutinesPanel() {
  const html = `
    <div class="modal-header">
      <h3 class="modal-title">💪 Mis Rutinas</h3>
      <button class="modal-close">✕</button>
    </div>
    <button class="btn-primary btn-full" id="btn-create-new-routine" style="margin-bottom:var(--space-md)">+ Nueva rutina</button>
    <div id="my-routines-list">${_spinnerHtml()}</div>
  `;
  openModal(html, { noClickClose: false });
  const mc = document.getElementById('modal-content');
  mc.querySelector('#btn-create-new-routine')?.addEventListener('click', () => openRoutineEditor(null, mc));
  await _renderMyRoutines(mc);
}

async function _renderMyRoutines(mc) {
  const el = mc.querySelector('#my-routines-list');
  if (!el) return;
  try {
    const snap = await db.collection('routines').where('createdBy', '==', _profile.uid).limit(30).get();
    if (snap.empty) {
      el.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px;padding:8px 0">Sin rutinas creadas aún.</p>`;
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const muscles = [...new Set((r.exercises||[]).map(e=>e.muscleGroup).filter(Boolean))].slice(0,3).join(' · ');
      return `
        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:12px;margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
            <span style="font-size:22px">💪</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px">${_esc(r.name)}</div>
              <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">${r.exercises?.length||0} ejercicios${muscles?' · '+muscles:''}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button style="flex:1;padding:7px;font-size:12px;background:rgba(255,255,255,.07);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--color-text);cursor:pointer" data-edit="${doc.id}">✏️ Editar</button>
            <button style="flex:1;padding:7px;font-size:12px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);border-radius:var(--radius-sm);color:#ef4444;cursor:pointer" data-assign="${doc.id}" data-rname="${_escAttr(r.name)}">📋 Asignar</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openRoutineEditor(btn.dataset.edit, mc))
    );
    el.querySelectorAll('[data-assign]').forEach(btn =>
      btn.addEventListener('click', () => openAssignClientPickerModal(btn.dataset.assign, btn.dataset.rname))
    );
  } catch(e) { el.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`; }
}

async function openRoutineEditor(routineId, mc) {
  let routine = { name:'', description:'', exercises:[], tags:[] };
  if (routineId) {
    const snap = await db.collection('routines').doc(routineId).get();
    if (snap.exists) routine = { id: snap.id, ...snap.data() };
  }

  const { EXERCISES } = await import('../../data/data.js');
  const muscleGroups = [...new Set(EXERCISES.map(e => e.m).filter(Boolean))];

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">${routineId ? 'Editar' : 'Nueva'} Rutina</h3>
      <button class="modal-close" id="btn-back-routines">✕</button>
    </div>
    <input type="text" id="re-name" class="input-solo" placeholder="Nombre de la rutina" value="${_esc(routine.name)}" style="margin-bottom:8px">
    <textarea id="re-desc" class="input-solo" rows="2" placeholder="Descripción..." style="padding:10px;width:100%;margin-bottom:12px;box-sizing:border-box">${_esc(routine.description||'')}</textarea>
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">Ejercicios</div>
    <div id="re-ex-list"></div>
    <div style="position:relative;margin:8px 0 4px">
      <input type="text" id="re-ex-search" class="input-solo" placeholder="🔍 Buscar ejercicio o músculo..." style="font-size:12px" autocomplete="off">
      <div id="re-ex-results" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:#1a1a2e;border:1px solid var(--glass-border);border-radius:var(--radius-sm);z-index:200;margin-top:2px"></div>
    </div>
    <button class="btn-accent btn-full" id="re-add-ex" style="margin-bottom:12px">+ Añadir ejercicio seleccionado</button>
    <button class="btn-primary btn-full" id="re-save">💾 Guardar rutina</button>
  `;

  openModal(html, { noClickClose: true });
  const m = document.getElementById('modal-content');
  let exercises = [...(routine.exercises||[])];
  let _selEx = null;

  const renderExList = () => {
    const el = m.querySelector('#re-ex-list');
    if (!exercises.length) { el.innerHTML=`<p style="color:var(--color-text-muted);font-size:12px;margin-bottom:4px">Sin ejercicios aún</p>`; return; }
    el.innerHTML = exercises.map((ex,i)=>`
      <div style="display:flex;align-items:center;gap:6px;padding:7px;background:var(--glass-bg);border-radius:var(--radius-sm);margin-bottom:4px">
        <span style="font-size:11px;font-weight:700;color:var(--color-text-muted);min-width:18px">${i+1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(ex.name||ex.n||'')}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">${_esc(ex.muscleGroup||ex.m||'')}</div>
        </div>
        <input type="number" value="${ex.sets||3}" min="1" max="20" style="width:36px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--white);font-size:11px;text-align:center;padding:2px" data-sets="${i}">
        <span style="font-size:10px;color:var(--color-text-muted)">×</span>
        <input type="text" value="${ex.reps||'10'}" style="width:36px;background:transparent;border:1px solid var(--glass-border);border-radius:4px;color:var(--white);font-size:11px;text-align:center;padding:2px" data-reps="${i}">
        <button style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:15px;padding:0 2px" data-rm="${i}">✕</button>
      </div>`).join('');
    el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', ()=>{ exercises.splice(+b.dataset.rm,1); renderExList(); }));
    el.querySelectorAll('[data-sets]').forEach(b => b.addEventListener('change', ()=>{ exercises[+b.dataset.sets].sets = parseInt(b.value)||3; }));
    el.querySelectorAll('[data-reps]').forEach(b => b.addEventListener('change', ()=>{ exercises[+b.dataset.reps].reps = b.value; }));
  };
  renderExList();

  const searchEl  = m.querySelector('#re-ex-search');
  const resultsEl = m.querySelector('#re-ex-results');
  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase().trim();
    if (!q) { resultsEl.style.display='none'; return; }
    const hits = EXERCISES.filter(e => e.n.toLowerCase().includes(q) || e.m.toLowerCase().includes(q)).slice(0,20);
    if (!hits.length) { resultsEl.innerHTML=`<div style="padding:10px;color:var(--color-text-muted);font-size:12px">Sin resultados</div>`; resultsEl.style.display=''; return; }
    resultsEl.innerHTML = hits.map(e=>`
      <div data-exn="${e.n.replace(/"/g,'&quot;')}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)">
        <div style="flex:1;font-size:12px;font-weight:600;color:#e2e8f0">${_esc(e.n)}</div>
        <span style="font-size:10px;background:rgba(239,68,68,.2);color:#ef4444;padding:2px 7px;border-radius:10px;white-space:nowrap">${_esc(e.m)}</span>
      </div>`).join('');
    resultsEl.style.display='';
    resultsEl.querySelectorAll('[data-exn]').forEach(item=>{
      item.addEventListener('mouseenter',()=>item.style.background='rgba(255,255,255,.07)');
      item.addEventListener('mouseleave',()=>item.style.background='');
      item.addEventListener('click',()=>{ _selEx=EXERCISES.find(e=>e.n===item.dataset.exn); searchEl.value=_selEx?.n||''; resultsEl.style.display='none'; });
    });
  });
  document.addEventListener('click', e=>{ if(!m.contains(e.target)) resultsEl.style.display='none'; });

  m.querySelector('#re-add-ex')?.addEventListener('click', ()=>{
    if (!_selEx) { toast('Selecciona un ejercicio del buscador','info'); return; }
    exercises.push({ id:_selEx.n, name:_selEx.n, muscleGroup:_selEx.m, videoUrl:_selEx.v||'', setupNotes:(_selEx.instructions||[]).join(' '), sets:3, reps:'10', weight:0, restSeconds:60 });
    renderExList(); searchEl.value=''; _selEx=null;
  });

  m.querySelector('#btn-back-routines')?.addEventListener('click', ()=>{ openMyRoutinesPanel(); });

  m.querySelector('#re-save')?.addEventListener('click', async ()=>{
    const name = m.querySelector('#re-name').value.trim();
    if (!name) { toast('Introduce un nombre','warning'); return; }
    const data = { name, description: m.querySelector('#re-desc').value.trim(), exercises, createdBy: _profile.uid, updatedAt: timestamp() };
    try {
      if (routineId) { await db.collection('routines').doc(routineId).update(data); toast('Rutina actualizada ✅','success'); }
      else { data.createdAt = timestamp(); await db.collection('routines').add(data); toast('Rutina creada ✅','success'); }
      openMyRoutinesPanel();
    } catch(e) { toast('Error: '+e.message,'error'); }
  });
}

async function openAssignClientPickerModal(routineId, routineName) {
  let clients = [];
  try {
    const snap = await db.collection('users').where('assignedCoach','==',_profile.uid).get();
    clients = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {}

  const selfUid = _profile.uid;
  const selfCard = `
    <div class="admin-user-card" data-cuid="${selfUid}" data-cname="${_escAttr(_profile.name||'Yo')}" style="cursor:pointer;margin-bottom:6px;border-color:var(--cyan)">
      <div class="admin-user-avatar" style="background:rgba(0,200,255,.2);color:var(--cyan)">${getInitials(_profile.name||'?')}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${_esc(_profile.name||'Yo')} <span style="font-size:11px;color:var(--cyan)">(yo)</span></div>
        <div style="font-size:12px;color:var(--color-text-muted)">${_esc(_profile.email||'')}</div>
      </div>
      <span class="badge" style="background:rgba(0,200,255,.15);color:var(--cyan)">Asignarme</span>
    </div>`;

  const clientCards = clients
    .filter(c => (c.uid||c.id) !== selfUid)
    .map(c=>`
      <div class="admin-user-card" data-cuid="${c.uid||c.id}" data-cname="${_escAttr(c.name||'Cliente')}" style="cursor:pointer;margin-bottom:6px">
        <div class="admin-user-avatar">${getInitials(c.name||'?')}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${_esc(c.name||'Cliente')}</div>
          <div style="font-size:12px;color:var(--color-text-muted)">${_esc(c.email||'')}</div>
        </div>
        <span class="badge badge-cyan">Asignar</span>
      </div>`).join('');

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📋 Asignar rutina</h3>
      <button class="modal-close">✕</button>
    </div>
    <p style="color:var(--color-text-muted);font-size:13px;margin-bottom:12px">"<strong>${_esc(routineName)}</strong>" → selecciona destinatario:</p>
    ${selfCard}
    ${clients.length ? `<div style="border-top:1px solid var(--glass-border);margin:8px 0 10px"></div>${clientCards}` : ''}
  `;
  openModal(html);
  document.getElementById('modal-content')?.querySelectorAll('[data-cuid]').forEach(card=>{
    card.addEventListener('click', async ()=>{
      await collections.assignments(card.dataset.cuid).add({
        routineId, name: routineName,
        assignedBy: _profile.uid, assignedAt: timestamp(), createdAt: timestamp(),
      });
      toast(`Rutina asignada a ${card.dataset.cname} ✅`,'success');
      closeModal();
    });
  });
}

// ── Cleanup ────────────────────────────────────
export function destroy() {
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
  _clients = []; _chatId = null;
}

// ── Helpers ────────────────────────────────────
function _spinnerHtml() {
  return `<div style="display:flex;justify-content:center;padding:24px"><div style="width:20px;height:20px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--cyan);border-radius:50%;animation:spin .6s linear infinite"></div></div>`;
}
function _fmtTime(ts) {
  if (!ts) return '';
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch { return ''; }
}
function _esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _escAttr(str) { return (str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
