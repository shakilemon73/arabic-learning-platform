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
    // Legacy cache clearing - clear all caches
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  } else if (event.data && event.data.type === 'SELECTIVE_CACHE_CLEAR') {
    // Selective cache clearing - preserve authentication-related caches
    caches.keys().then((cacheNames) => {
      // Only clear non-auth related caches
      const nonAuthCaches = cacheNames.filter(cacheName => 
        !cacheName.includes('sb-auth') && 
        !cacheName.includes('supabase') && 
        !cacheName.includes('auth-token') &&
        !cacheName.includes('session')
      );
      
      nonAuthCaches.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});