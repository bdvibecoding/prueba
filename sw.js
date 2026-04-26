/* ═══════════════════════════════════════════════
   TGWL Service Worker — PWA offline support
═══════════════════════════════════════════════ */
const CACHE_NAME = 'tgwl-v1.54';
const STATIC_CACHE = 'tgwl-static-v25.0';
const DYNAMIC_CACHE = 'tgwl-dynamic-v25.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/fonts.css',
  '/css/main.css',
  '/css/glassmorphism.css',
  '/css/animations.css',
  '/css/components.css',
  '/js/firebase-config.js',
  '/js/app.js',
  '/js/state.js',
  '/js/router.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/modules/home.js',
  '/js/modules/entreno.js',
  '/js/modules/alimentacion.js',
  '/js/modules/biomedidas.js',
  '/js/modules/salud.js',
  '/js/modules/progreso.js',
  '/js/modules/perfil.js',
  '/js/modules/suscripcion.js',
  '/js/modules/configuracion.js',
  '/js/components/nav.js',
  '/js/components/modal.js',
  '/js/components/timer.js',
  '/js/components/charts.js',
  '/js/components/muscle-map.js',
  '/js/components/before-after-slider.js',
  '/js/admin/admin-panel.js',
  '/js/admin/specialist-hub.js',
  '/admin/index.html',
  '/admin/js/admin-app.js',
  '/admin/js/panels/users.js',
  '/admin/js/panels/routines.js',
  '/admin/js/panels/diet.js',
  '/admin/js/panels/health.js',
  '/admin/js/panels/fisio.js',
  '/admin/js/panels/psych.js',
  '/data/data.js',
  '/assets/fonts/SF-Pro-Display/SFPRODISPLAYREGULAR.OTF',
  '/assets/fonts/SF-Pro-Display/SFPRODISPLAYMEDIUM.OTF',
  '/assets/fonts/SF-Pro-Display/SFPRODISPLAYBOLD.OTF',
  '/assets/fonts/SF-Pro-Text/SFProText-Regular.ttf',
  '/assets/fonts/SF-Pro-Text/SFProText-Medium.ttf',
  '/assets/fonts/SF-Pro-Text/SFProText-Semibold.ttf',
  '/assets/fonts/SF-Pro-Text/SFProText-Bold.ttf',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// ── Install ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => console.warn('[SW] Cache failed:', err))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch Strategy: Cache-first for static, Network-first for API ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and Chrome extensions
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Firebase / external API — network first
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets — cache first
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    if (response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('<h1>Sin conexión</h1>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    if (response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Message: skip waiting ─────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Push Notifications ────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'TGWL', body: 'Tienes una notificación' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-96.png',
      vibrate: [200, 100, 200],
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'Abrir app' },
        { action: 'close', title: 'Cerrar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});
