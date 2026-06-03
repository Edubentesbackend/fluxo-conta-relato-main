self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.delete(cacheName))))
      .then(() => self.clients.claim())
  )
})

// Keep this file temporarily so older installations can update and clear
// stale caches. No request, especially /api, is cached.
