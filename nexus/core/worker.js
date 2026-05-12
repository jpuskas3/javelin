/**
 * nexus/core/worker.js — Service Worker
 * ============================================================================
 * NEXUS Offline-First Interceptor
 *
 * Register via:
 *   navigator.serviceWorker.register('/nexus/core/worker.js')
 *
 * Responsibilities
 * ----------------
 *   • Cache static assets (nexus.html, nexus.css, core/*.js)
 *   • Intercept fetch calls to /api/* and provide offline fallback
 *   • Background sync for pending mutations when connectivity restores
 *   • Push notification relay for project/task alerts
 */

const CACHE_NAME    = 'nexus-v1';
const STATIC_ASSETS = [
  '/nexus/nexus.html',
  '/nexus/nexus.css',
  '/nexus/core/bus.js',
  '/nexus/core/store.js',
  '/nexus/core/gateway.js',
  '/nexus/core/governance.js',
  '/nexus/integrations/airtable.js',
  '/nexus/integrations/ai.js',
  '/nexus/integrations/portals.js',
  '/nexus/integrations/github.js',
];

// --- Install ------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// --- Activate -----------------------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --- Fetch intercept ----------------------------------------------------

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first with offline queue fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkWithOfflineQueue(event.request));
    return;
  }

  // Static: cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ?? fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      })
    )
  );
});

async function networkWithOfflineQueue(request) {
  try {
    return await fetch(request);
  } catch {
    // Register for background sync when connection restores
    self.registration.sync?.register('nexus-pending-mutations').catch(() => {});
    return new Response(
      JSON.stringify({ error: 'offline', queued: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- Background sync ----------------------------------------------------

self.addEventListener('sync', (event) => {
  if (event.tag === 'nexus-pending-mutations') {
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'nexus:sync_ready' }))
      )
    );
  }
});

// --- Push notifications -------------------------------------------------

self.addEventListener('push', (event) => {
  const data    = event.data?.json() ?? {};
  const title   = data.title ?? 'Nexus';
  const options = {
    body:    data.body ?? '',
    icon:    '/nexus/ui/icon-192.png',
    badge:   '/nexus/ui/badge-72.png',
    data:    data,
    actions: data.actions ?? [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) {
        clients[0].focus();
        clients[0].postMessage({ type: 'nexus:notification_click', data: event.notification.data });
      } else {
        self.clients.openWindow('/nexus/nexus.html');
      }
    })
  );
});
