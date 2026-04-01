const CACHE_NAME = 'metabolic-tracker-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/insights.js',
  './js/morning.js',
  './js/feeding.js',
  './js/water.js',
  './js/weight.js',
  './js/carbs.js',
  './js/walking.js',
  './js/craving.js',
  './js/morning-checkin.js',
  './js/phases.js',
  './js/calendar.js',
  './js/dashboard.js',
  './js/vendor/chart.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
