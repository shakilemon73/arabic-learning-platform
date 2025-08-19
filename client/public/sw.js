// Service Worker for cache management
const CACHE_NAME = 'arabic-learning-v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Don't cache - always fetch from network
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Add no-cache headers
        const responseToCache = response.clone();
        return response;
      })
      .catch(() => {
        // Fallback for offline
        return new Response('Offline - Please check your connection', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});