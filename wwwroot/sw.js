const CACHE = 'pharmachain-v1';
const ASSETS = [
  '/login.html', '/dashboard.html', '/add-drug.html', '/transfer.html',
  '/blockchain.html', '/verify.html', '/audit.html', '/attack-demo.html',
  '/risk-analyst.html', '/supply-advisor.html', '/qr-control.html',
  '/drug-info.html', '/patient-chat.html',
  '/pharma-styles.css', '/pharma-lang.js', '/manifest.json', '/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API calls — always go to network
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline', { status: 503 })));
    return;
  }
  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
