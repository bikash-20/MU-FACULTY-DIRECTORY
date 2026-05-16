const CACHE_NAME = 'classcraft-v1';
const OFFLINE_URL = '/index.html';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap'
];

/* ═══════════════════════════════════════════════════════════════
   INSTALL - Cache static assets
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skipping waiting');
        return self.skipWaiting();
      })
  );
});

/* ═══════════════════════════════════════════════════════════════
   ACTIVATE - Clean old caches
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

/* ═══════════════════════════════════════════════════════════════
   FETCH - Network first, fallback to cache
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version but update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline placeholder for images
            if (request.destination === 'image') {
              return caches.match('/icons/icon-192.png');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

/* ═══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS (Ready for future use)
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from MU ClassCraft',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MU ClassCraft', options)
  );
});

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION CLICK
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

/* ═══════════════════════════════════════════════════════════════
   UPDATE READY - Notify users of new version
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (event.data === 'checkForUpdates') {
    self.registration.update();
  }
  
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Periodic background sync (for future features)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-faculty') {
    event.waitUntil(syncFacultyData());
  }
});

async function syncFacultyData() {
  // Future: Sync faculty data from server
  console.log('[SW] Syncing faculty data...');
}