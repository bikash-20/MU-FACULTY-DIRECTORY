/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   MU ClassCraft — Service Worker  v1.1.0                ║
 * ║   Metropolitan University Faculty Directory             ║
 * ║                                                          ║
 * ║   Strategy:                                              ║
 * ║   • App Shell  → Cache-First (instant load)             ║
 * ║   • Pages      → Network-First with cache fallback      ║
 * ║   • Assets     → Stale-While-Revalidate                 ║
 * ║   • Updates    → skipWaiting for instant deployment     ║
 * ║                                                          ║
 * ║   IndexedDB sync hooks are ready — add your logic       ║
 * ║   inside the 'sync' event handler below.                ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── BUMP THIS VERSION EVERY DEPLOY ─────────────────────────────────────────
const CACHE_VERSION = 'v1.1.0';
// ───────────────────────────────────────────────────────────────────────────

const CACHE_STATIC  = `mu-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `mu-dynamic-${CACHE_VERSION}`;
const CACHE_IMAGES  = `mu-images-${CACHE_VERSION}`;

// Files to precache on install (App Shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/faculty.json',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-square.png',
  // CDN assets cached at runtime (listed here for documentation only)
  // bootstrap, bootstrap-icons, google fonts → cached on first visit
];

// CDN origins to cache dynamically
const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        // Use individual add() calls so one failure doesn't break the rest
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] Precache skip:', url, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete — calling skipWaiting');
        // ✅ Instantly activate new SW on every deploy
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);

  const KEEP_CACHES = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(name => name.startsWith('mu-') && !KEEP_CACHES.includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => {
        console.log('[SW] Claiming all clients');
        // ✅ Take control of all open tabs immediately
        return self.clients.claim();
      })
      .then(() => {
        // ✅ Notify all open tabs that a new version is active
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach(client =>
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
        );
      })
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, and data URLs
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // ── Strategy 1: faculty.json → Network-First (always fresh data) ────────
  if (url.pathname.endsWith('faculty.json')) {
    event.respondWith(networkFirstWithFallback(request, CACHE_STATIC));
    return;
  }

  // ── Strategy 2: App Shell (HTML pages) → Network-First ──────────────────
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithFallback(request, CACHE_STATIC));
    return;
  }

  // ── Strategy 2: CDN assets → Stale-While-Revalidate ─────────────────────
  if (CDN_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  // ── Strategy 3: Images → Cache-First (long TTL) ───────────────────────
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithNetwork(request, CACHE_IMAGES));
    return;
  }

  // ── Strategy 4: Local JS/CSS/fonts → Cache-First ─────────────────────────
  if (['script', 'style', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirstWithNetwork(request, CACHE_STATIC));
    return;
  }

  // ── Default: Network-First ───────────────────────────────────────────────
  event.respondWith(networkFirstWithFallback(request, CACHE_DYNAMIC));
});

// ─────────────────────────────────────────────────────────────────────────────
// CACHING STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Network-First: try network, fall back to cache.
 * Ideal for HTML pages — always fresh when online.
 */
async function networkFirstWithFallback(request, cacheName) {
  try {
    const networkResponse = await fetchAndCache(request, cacheName);
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Ultimate fallback for navigation requests
    if (request.destination === 'document') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline — please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Cache-First: serve from cache, fetch & update if missing.
 * Ideal for images and stable assets.
 */
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return fetchAndCache(request, cacheName);
}

/**
 * Stale-While-Revalidate: serve cache immediately, update in background.
 * Ideal for CDN assets (fonts, icons, Bootstrap).
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetchAndCache(request, cacheName).catch(() => null);
  return cached || fetchPromise;
}

/**
 * Fetch a request and store the response in the specified cache.
 */
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response && response.status === 200 && response.type !== 'opaque') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC  (IndexedDB integration point)
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'mu-data-sync') {
    event.waitUntil(syncPendingData());
  }

  if (event.tag === 'mu-faculty-sync') {
    event.waitUntil(syncFacultyData());
  }
});

/**
 * Placeholder: sync any pending IndexedDB writes to the server.
 * Replace with your real IndexedDB → API logic when ready.
 */
async function syncPendingData() {
  console.log('[SW] syncPendingData() — add your IndexedDB logic here');
  // Example pattern:
  // const db = await openDB('mu-app', 1);
  // const pending = await db.getAll('pending-updates');
  // for (const item of pending) {
  //   await fetch('/api/faculty', { method: 'POST', body: JSON.stringify(item) });
  //   await db.delete('pending-updates', item.id);
  // }
}

async function syncFacultyData() {
  console.log('[SW] syncFacultyData() — ready for your IndexedDB faculty sync');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'MU ClassCraft', body: 'New update available', icon: '/icons/icon-192.png' };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch { data.body = event.data.text(); }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(c => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLER  (from main thread)
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] skipWaiting requested by client');
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;

    case 'CLEAR_CACHE':
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k.startsWith('mu-')).map(k => caches.delete(k)))
      ).then(() => {
        console.log('[SW] All MU caches cleared');
        event.ports[0]?.postMessage({ cleared: true });
      });
      break;
  }
});

console.log('[SW] Script loaded —', CACHE_VERSION);
