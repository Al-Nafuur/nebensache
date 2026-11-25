// Service Worker: App-Dateien für den Offline-Betrieb zwischenspeichern.
// Bei jeder neuen Version VERSION erhöhen (und APP_VERSION in js/app.js).
const VERSION = '1.0.0';
const CACHE = `nebenkosten-${VERSION}`;
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/calc.js',
  './js/format.js',
  './js/model.js',
  './js/print.js',
  './js/store.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nebenkosten-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(treffer =>
      treffer || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
    ),
  );
});
