/* ═══════════════════════════════════════════════
   TGWL — components/before-after-slider.js
   Drag-to-compare Before/After Image Slider
═══════════════════════════════════════════════ */

/**
 * Init a before/after comparison slider on a container element.
 * @param {HTMLElement} container - Element with .ba-slider-wrap class
 */
export function initBeforeAfterSlider(container) {
  const wrap   = container.classList.contains('ba-slider-wrap')
    ? container
    : container.querySelector('.ba-slider-wrap');

  if (!wrap) return;

  const after    = wrap.querySelector('.ba-after');
  const divider  = wrap.querySelector('.ba-divider');
  const handle   = wrap.querySelector('.ba-handle');

  let isDragging = false;

  function setPosition(clientX) {
    const rect  = wrap.getBoundingClientRect();
    const x     = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct   = (x / rect.width) * 100;
    after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    divider.style.left   = `${pct}%`;
    if (handle) handle.style.left = `${pct}%`;
  }

  // Mouse events
  wrap.addEventListener('mousedown', (e) => {
    isDragging = true;
    setPosition(e.clientX);
    wrap.style.cursor = 'ew-resize';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    setPosition(e.clientX);
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    wrap.style.cursor = 'ew-resize';
  });

  // Touch events
  wrap.addEventListener('touchstart', (e) => {
    isDragging = true;
    setPosition(e.touches[0].clientX);
  }, { passive: true });
  wrap.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    setPosition(e.touches[0].clientX);
  }, { passive: true });
  wrap.addEventListener('touchend', () => { isDragging = false; });

  // Initial position at 50%
  setPosition(wrap.getBoundingClientRect().left + wrap.getBoundingClientRect().width / 2);
}

/**
 * Build before/after slider HTML
 * @param {string} beforeSrc - URL of "before" image
 * @param {string} afterSrc  - URL of "after" image
 * @param {string} beforeLabel
 * @param {string} afterLabel
 */
export function buildSliderHTML(beforeSrc, afterSrc, beforeLabel = 'Antes', afterLabel = 'Ahora') {
  const bSrc = beforeSrc || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="%23222"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="0.5" fill="%23555">Sin foto</text></svg>';
  const aSrc = afterSrc  || bSrc;

  return `
    <div class="ba-slider-wrap">
      <img class="ba-img ba-before" src="${bSrc}" alt="${beforeLabel}" loading="lazy"
           onerror="this.style.background='#111';this.removeAttribute('src')">
      <img class="ba-img ba-after"  src="${aSrc}" alt="${afterLabel}"  loading="lazy"
           onerror="this.style.background='#222';this.removeAttribute('src')">
      <div class="ba-divider"></div>
      <div class="ba-handle">⟺</div>
      <div class="ba-labels">
        <span class="ba-label">${beforeLabel}</span>
        <span class="ba-label">${afterLabel}</span>
      </div>
    </div>
  `;
}

/**
 * Update images in an existing slider
 */
export function updateSliderImages(wrap, beforeSrc, afterSrc) {
  const before = wrap.querySelector('.ba-before');
  const after  = wrap.querySelector('.ba-after');
  if (before && beforeSrc) before.src = beforeSrc;
  if (after  && afterSrc)  after.src  = afterSrc;
}
