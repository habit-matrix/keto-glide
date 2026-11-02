/* Service worker: lets the app open offline.
   Strategy: serve from cache instantly, refresh the cache in the background
   (so updates appear the NEXT time you open the app).
   Open Food Facts lookups are never cached - they always go to the network. */
const CACHE = 'ketofast-v1';   // bump this number to force a full refresh
const SHELL = [
  './', './index.html', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', e => {
  // Cache each file separately so one failure doesn't block the install
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(SHELL.map(u => c.add(u).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove old cache versions
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('openfoodfacts.org')) return; // network only
  e.respondWith(
    caches.match(req).then(hit => {
      const refresh = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
