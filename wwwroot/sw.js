const CACHE = 'pharmachain-v4';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg'
];

// ── Install: cache only icons & manifest (NOT JS/CSS — fetched fresh each time) ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete ALL old caches ──
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

  // 2. HTML + JS + CSS → Network-First
  //    Always get latest from server; only fall back to cache when offline
  const ext = url.pathname.split('.').pop().toLowerCase();
  if (url.pathname.endsWith('.html') || url.pathname === '/' ||
      ext === 'js' || ext === 'css') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3. Everything else (icons, fonts, images) → Cache-First
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
