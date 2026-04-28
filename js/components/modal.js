/* ═══════════════════════════════════════════════
   TGWL — components/modal.js
   Modal & Sheet System
═══════════════════════════════════════════════ */

// ── Modal (centered overlay) ──────────────────
export function openModal(html, options = {}) {
  const overlay   = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  const content   = document.getElementById('modal-content');

  if (!overlay || !container || !content) return;

  content.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.classList.add('active');

  // Close on overlay click (unless prevented)
  if (!options.noClickClose) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  } else {
    overlay.onclick = null;
  }

  // Close button
  const closeBtn = content.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Custom on-open hook
  if (options.onOpen) options.onOpen(container);

  return container;
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
    document.getElementById('modal-content').innerHTML = '';
  }
}

// ── Sheet (iOS-style bottom slide) ───────────
export function openSheet(html, options = {}) {
  const overlay   = document.getElementById('sheet-overlay');
  const container = document.getElementById('sheet-container');
  const content   = document.getElementById('sheet-content');

  if (!overlay || !container || !content) return;

  content.innerHTML = html;
  overlay.classList.remove('hidden');

  if (!options.noClickClose) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeSheet();
    };
  } else {
    overlay.onclick = null;
  }

  // Swipe to close
  let startY = 0;
  container.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 60) closeSheet();
  }, { passive: true });

  if (options.onOpen) options.onOpen(container);
  return container;
}

export function closeSheet() {
  const overlay = document.getElementById('sheet-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    document.getElementById('sheet-content').innerHTML = '';
  }
}

// ── Confirm Dialog ────────────────────────────
export function confirm(title, message, opts = {}) {
  return new Promise((resolve) => {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close">✕</button>
      </div>
      <p style="color:var(--color-text-muted);margin-bottom:var(--space-lg);line-height:1.6">${message}</p>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn-secondary btn-full" id="confirm-cancel">${opts.cancelText || 'Cancelar'}</button>
        <button class="${opts.danger ? 'btn-danger' : 'btn-primary'} btn-full" id="confirm-ok">${opts.okText || 'Confirmar'}</button>
      </div>
    `;
    openModal(html, { noClickClose: false });
    const modal = document.getElementById('modal-content');
    modal.querySelector('#confirm-cancel').addEventListener('click', () => { closeModal(); resolve(false); });
    modal.querySelector('#confirm-ok').addEventListener('click', () => { closeModal(); resolve(true); });
  });
}

// ── Alert ─────────────────────────────────────
export function alert(title, message, type = 'info') {
  const _icons = {
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  };
  return new Promise((resolve) => {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${_icons[type] || ''} ${title}</h3>
        <button class="modal-close">✕</button>
      </div>
      <p style="color:var(--color-text-muted);margin-bottom:var(--space-lg);line-height:1.6">${message}</p>
      <button class="btn-primary btn-full" id="alert-ok">Entendido</button>
    `;
    openModal(html);
    document.getElementById('alert-ok')?.addEventListener('click', () => { closeModal(); resolve(); });
  });
}

// ── Input Dialog ──────────────────────────────
export function promptModal(title, placeholder = '', value = '') {
  return new Promise((resolve) => {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="input-group" style="margin-bottom:var(--space-lg)">
        <textarea id="prompt-input" class="input-solo" placeholder="${placeholder}" rows="3" style="padding:var(--space-md);resize:vertical">${value}</textarea>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn-secondary btn-full" id="prompt-cancel">Cancelar</button>
        <button class="btn-primary btn-full" id="prompt-ok">Guardar</button>
      </div>
    `;
    openModal(html);
    const modal = document.getElementById('modal-content');
    const input = modal.querySelector('#prompt-input');
    input.focus();
    modal.querySelector('#prompt-cancel').addEventListener('click', () => { closeModal(); resolve(null); });
    modal.querySelector('#prompt-ok').addEventListener('click', () => {
      closeModal();
      resolve(input.value.trim());
    });
  });
}

// ── Rating Sheet (RPE) ────────────────────────
export function openRPESheet(currentRPE = null) {
  return new Promise((resolve) => {
    const btns = Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const labels = ['','Muy fácil','Fácil','Moderado','Algo duro','Duro','','Muy duro','','Máximo',''];
      return `
        <button class="rpe-btn ${currentRPE === n ? 'selected' : ''}" data-rpe="${n}" title="${labels[n] || ''}">
          ${n}
        </button>`;
    }).join('');

    const html = `
      <div style="padding-bottom:var(--space-sm)">
        <h4 style="margin-bottom:4px">¿Cuál fue tu RPE?</h4>
        <p class="text-muted" style="margin-bottom:var(--space-md)">Escala de esfuerzo percibido (1 = muy fácil, 10 = máximo)</p>
        <div class="rpe-scale" style="margin-bottom:var(--space-lg)">${btns}</div>
        <div id="rpe-label" style="text-align:center;font-size:var(--fs-sm);color:var(--color-text-muted);min-height:20px;margin-bottom:var(--space-md)"></div>
        <button class="btn-secondary btn-full" id="rpe-skip">Omitir</button>
      </div>
    `;
    openSheet(html, { noClickClose: false });
    const sheetContent = document.getElementById('sheet-content');
    const rpeLabels = ['','Muy fácil','Fácil','Ligero','Moderado','Algo duro','Duro','Muy duro','Extremo','Casi máximo','Máximo'];

    sheetContent.querySelectorAll('.rpe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sheetContent.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const n = parseInt(btn.dataset.rpe);
        const labelEl = sheetContent.querySelector('#rpe-label');
        if (labelEl) labelEl.textContent = rpeLabels[n] || '';
        setTimeout(() => { closeSheet(); resolve(n); }, 400);
      });
    });

    sheetContent.querySelector('#rpe-skip')?.addEventListener('click', () => { closeSheet(); resolve(null); });
  });
}
