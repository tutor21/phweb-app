const CACHE_NAME = 'phweb-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip caching for API, Supabase, or ad requests
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co') || event.request.url.includes('googlesyndication')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});