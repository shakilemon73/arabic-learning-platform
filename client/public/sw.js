// DISABLED SERVICE WORKER TO PREVENT AUTH ISSUES
// This service worker is intentionally disabled to prevent authentication interference

console.log('🔧 Service worker file loaded but disabled for authentication stability');

// Immediately unregister any existing service worker
self.addEventListener('install', (event) => {
  console.log('🧹 Service worker install - immediately skipping waiting to unregister');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🧹 Service worker activate - clearing all caches and unregistering');
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🧹 Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Unregister this service worker
      self.registration.unregister().then(() => {
        console.log('🧹 Service worker unregistered successfully');
      })
    ])
  );
});

// Don't handle any fetch events to prevent auth interference
self.addEventListener('fetch', (event) => {
  // Let all requests pass through normally without caching
  return;
});