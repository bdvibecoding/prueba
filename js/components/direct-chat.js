/* ═══════════════════════════════════════════════
   TGWL — components/direct-chat.js
   Real-time 1-on-1 direct chat (onSnapshot)
═══════════════════════════════════════════════ */

import { db, timestamp } from '../firebase-config.js';
import { t } from '../i18n.js';

let _unsubscribe = null;
let _overlay     = null;

/**
 * Opens a full-screen direct chat between two users.
 * @param {{ myUid, myName, otherUid, otherName, otherRole }} params
 */
export function openDirectChat({ myUid, myName, otherUid, otherName, otherRole = '' }) {
  closeDirectChat(); // clean up any previous instance

  const chatId  = [myUid, otherUid].sort().join('_');
  const initials = (otherName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const overlay = document.createElement('div');
  overlay.id    = 'direct-chat-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:800',
    'display:flex', 'flex-direction:column',
    'background:var(--color-bg)',
    'animation:pageIn 0.25s ease',
  ].join(';');

  overlay.innerHTML = `
    <!-- Header -->
    <div style="
      height:calc(56px + env(safe-area-inset-top,0px));
      padding-top:env(safe-area-inset-top,0px);
      padding-left:16px; padding-right:16px;
      display:flex; align-items:center; gap:12px;
      border-bottom:1px solid var(--glass-border);
      background:var(--color-bg);
      flex-shrink:0;
    ">
      <button id="dc-close" style="
        background:none; border:none; cursor:pointer;
        color:var(--cyan); font-size:14px; font-weight:600;
        display:flex; align-items:center; gap:4px; padding:8px 0;
        white-space:nowrap;
      ">${t('dc_back')}</button>

      <div style="
        width:36px; height:36px; border-radius:50%; flex-shrink:0;
        background:linear-gradient(135deg,var(--red),var(--cyan));
        display:flex; align-items:center; justify-content:center;
        font-weight:800; font-size:13px; color:#fff;
      ">${initials}</div>

      <div style="flex:1; min-width:0">
        <div style="font-weight:700; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
          ${otherName || 'Chat'}
        </div>
        ${otherRole ? `<div style="font-size:11px; color:var(--color-text-muted)">${otherRole}</div>` : ''}
      </div>
    </div>

    <!-- Messages area -->
    <div id="dc-messages" style="
      flex:1; overflow-y:auto; padding:16px;
      display:flex; flex-direction:column; gap:8px;
      -webkit-overflow-scrolling:touch;
    ">
      <div style="text-align:center; padding:32px 0">
        <div style="width:28px;height:28px;border:2px solid rgba(255,255,255,0.1);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.6s linear infinite;margin:0 auto"></div>
      </div>
    </div>

    <!-- Input area -->
    <div style="
      padding:12px 16px;
      padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));
      border-top:1px solid var(--glass-border);
      display:flex; gap:8px; align-items:center;
      background:var(--color-bg);
      flex-shrink:0;
    ">
      <input
        id="dc-input"
        type="text"
        placeholder="${t('dc_placeholder')}"
        style="
          flex:1;
          background:var(--glass-bg);
          border:1px solid var(--glass-border);
          border-radius:22px;
          padding:10px 16px;
          color:var(--color-text);
          font-size:14px;
          font-family:inherit;
          outline:none;
        "
        autocomplete="off"
      >
      <button id="dc-send" style="
        width:44px; height:44px; border-radius:50%; flex-shrink:0;
        background:linear-gradient(135deg,var(--red-light),var(--red));
        border:none; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 2px 12px rgba(148,10,10,0.4);
        transition:transform 0.15s ease, opacity 0.15s;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  _overlay = overlay;

  // ── Wire up controls ──────────────────────────
  overlay.querySelector('#dc-close').addEventListener('click', closeDirectChat);

  const input  = overlay.querySelector('#dc-input');
  const sendBtn = overlay.querySelector('#dc-send');

  sendBtn.addEventListener('click', () => sendMessage(chatId, myUid, myName, input));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatId, myUid, myName, input); }
  });
  sendBtn.addEventListener('mousedown', () => { sendBtn.style.transform = 'scale(0.93)'; });
  sendBtn.addEventListener('mouseup',   () => { sendBtn.style.transform = 'scale(1)'; });

  // Focus input on mobile after short delay
  setTimeout(() => input.focus(), 300);

  // ── Subscribe to messages ──────────────────────
  _unsubscribe = db
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(100)
    .onSnapshot(snapshot => {
      renderMessages(snapshot, myUid, otherName, overlay);
    }, err => {
      console.error('[DirectChat] onSnapshot error:', err);
    });
}

export function closeDirectChat() {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  if (_overlay)     { _overlay.remove(); _overlay = null; }
}

// ── Internal helpers ────────────────────────────

function renderMessages(snapshot, myUid, otherName, overlay) {
  const el = overlay.querySelector('#dc-messages');
  if (!el) return;

  if (snapshot.empty) {
    el.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 24px; gap:12px; opacity:0.5">
        <div style="font-size:40px">💬</div>
        <div style="font-size:14px; color:var(--color-text-muted); text-align:center">
          ${t('dc_start_convo')}${otherName || ''}
        </div>
      </div>
    `;
    return;
  }

  const initials = (otherName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;

  el.innerHTML = snapshot.docs.map(doc => {
    const m    = doc.data();
    const mine = m.senderId === myUid;
    const time = _formatTime(m.createdAt);

    if (mine) {
      return `
        <div style="display:flex; justify-content:flex-end">
          <div style="
            max-width:75%; padding:10px 14px;
            background:linear-gradient(135deg,var(--red-light),var(--red));
            border-radius:18px 18px 4px 18px;
            font-size:14px; color:#fff; line-height:1.45;
            word-break:break-word;
          ">
            ${_escapeHtml(m.text || '')}
            <div style="font-size:10px; opacity:0.65; margin-top:4px; text-align:right">${time}</div>
          </div>
        </div>
      `;
    } else {
      return `
        <div style="display:flex; gap:8px; align-items:flex-end">
          <div style="
            width:28px; height:28px; border-radius:50%; flex-shrink:0;
            background:linear-gradient(135deg,var(--red),var(--cyan));
            display:flex; align-items:center; justify-content:center;
            font-size:10px; font-weight:800; color:#fff;
          ">${initials}</div>
          <div style="
            max-width:75%; padding:10px 14px;
            background:var(--glass-bg-strong);
            border:1px solid var(--glass-border);
            border-radius:18px 18px 18px 4px;
            font-size:14px; color:var(--color-text); line-height:1.45;
            word-break:break-word;
          ">
            ${_escapeHtml(m.text || '')}
            <div style="font-size:10px; color:var(--color-text-muted); margin-top:4px">${time}</div>
          </div>
        </div>
      `;
    }
  }).join('');

  if (wasAtBottom || snapshot.docChanges().some(c => c.type === 'added')) {
    el.scrollTop = el.scrollHeight;
  }
}

async function sendMessage(chatId, myUid, myName, input) {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  try {
    await db.collection('chats').doc(chatId).collection('messages').add({
      text,
      senderId:   myUid,
      senderName: myName || '',
      createdAt:  timestamp(),
    });
  } catch (e) {
    console.error('[DirectChat] send error:', e);
    input.value = text; // restore on error
  }
}

function _formatTime(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function _escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
