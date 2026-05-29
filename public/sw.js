const CACHE_NAME = 'finance-app-v1.0.0'
const STATIC_CACHE = 'static-v1.0.0'
const DYNAMIC_CACHE = 'dynamic-v1.0.0'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
]

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip external requests
  if (url.origin !== location.origin) return

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }

        return caches.open(DYNAMIC_CACHE)
          .then(cache => {
            return fetch(request)
              .then(response => {
                // Cache successful responses
                if (response.status === 200) {
                  cache.put(request, response.clone())
                }
                return response
              })
              .catch(() => {
                // Return offline fallback for navigation requests
                if (request.mode === 'navigate') {
                  return caches.match('/')
                }
                throw new Error('Network unavailable')
              })
          })
      })
  )
})

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  console.log('Performing background sync')
  // Sync offline data when connection is restored
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return

  const { title, body, icon, badge, tag } = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      tag,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Abrir App',
          icon: '/favicon.ico'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    })
  )
})

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      self.clients.matchAll()
        .then(clients => {
          // Focus existing tab if available
          const client = clients.find(c => c.visibilityState === 'visible')
          if (client) {
            client.navigate('/')
            client.focus()
          } else {
            // Open new tab
            self.clients.openWindow('/')
          }
        })
    )
  }
})