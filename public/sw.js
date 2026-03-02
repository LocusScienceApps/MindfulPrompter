/**
 * Service Worker for MindfulPrompter PWA.
 * v2: Bumped cache name to force refresh after timer/promptCount fixes.
 */

const CACHE_NAME = 'mindful-prompter-v2';

// In development (localhost), skip all caching so changes load immediately.
const IS_DEV = self.location.hostname === 'localhost';

// Cache the app shell on install
self.addEventListener('install', (event) => {
  if (IS_DEV) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/timer-worker.js',
      ]);
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  if (IS_DEV) { self.clients.claim(); return; }
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', (event) => {
  // In dev, never intercept — let the browser fetch normally so changes are always fresh
  if (IS_DEV) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle notification clicks: focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
