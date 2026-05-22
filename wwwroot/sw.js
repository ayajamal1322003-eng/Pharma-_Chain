const CACHE = 'pharmachain-v3';

// Static assets that rarely change — CSS, JS, icons only
const STATIC_ASSETS = [
  '/pharma-styles.css',
  '/pharma-lang.js',
  '/manifest.json',
  '/icon.svg'
];

// ── Install: cache only static assets (NOT HTML pages) ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete all old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. API calls → always network, never cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('offline', { status: 503 }))
    );
    return;
  }

  // 2. HTML pages → Network-First
  //    Always fetch fresh from server; fall back to cache only if offline
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with latest version
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3. CSS / JS / icons → Cache-First (these change only on version bump)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
