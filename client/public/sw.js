// Secure Service Worker for Arabic Learning Platform
const CACHE_NAME = 'arabic-learning-secure-v1';
const AUTH_CACHE_PATTERNS = ['sb-auth', 'supabase', 'auth-token', 'user-session'];

// Security: Validate origin before performing operations
function isValidOrigin(origin) {
  // Allow localhost for development and your production domain
  const allowedOrigins = [
    'https://localhost:5000',
    'http://localhost:5000',
    'https://*.replit.app',
    'https://*.replit.dev'
  ];
  
  return allowedOrigins.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(origin);
    }
    return pattern === origin;
  });
}

self.addEventListener('install', (event) => {
  console.log('🔒 Secure service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔒 Secure service worker activating...');
  
  // Security: Clear old caches but preserve authentication
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Don't clear current cache or auth-related caches
          if (cacheName !== CACHE_NAME && !AUTH_CACHE_PATTERNS.some(pattern => cacheName.includes(pattern))) {
            console.log('🧹 Clearing old cache:', cacheName);
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
  // CRITICAL FIX: Don't intercept authentication requests
  const url = new URL(event.request.url);
  
  // Skip service worker for authentication-related requests
  if (url.hostname.includes('supabase.co') || 
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/rest/') ||
      url.pathname.includes('/realtime/') ||
      event.request.method !== 'GET') {
    // Let these requests go through normally without any interference
    return;
  }

  // Only handle static assets and page requests
  if (event.request.destination === 'document' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image') {
    
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Simple offline fallback only for static resources
          if (event.request.destination === 'document') {
            return new Response('Offline - Please check your connection', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
          // For other resources, just fail normally
          throw new Error('Resource unavailable offline');
        })
    );
  }
});

// Security: Enhanced message handling with validation
self.addEventListener('message', (event) => {
  // Security: Validate message source
  if (!event.source || !event.origin) {
    console.warn('🚨 Received message without valid source/origin');
    return;
  }

  // Security: Validate timestamp to prevent replay attacks
  const messageTimestamp = event.data?.timestamp;
  if (messageTimestamp && (Date.now() - messageTimestamp > 60000)) {
    console.warn('🚨 Received stale message, ignoring');
    return;
  }

  if (event.data && event.data.type === 'SELECTIVE_CACHE_CLEAR' && event.data.preserveAuth) {
    console.log('🔒 Performing secure selective cache clear...');
    
    // Enhanced selective cache clearing with better validation
    caches.keys().then((cacheNames) => {
      // Filter out auth-related and essential caches
      const safeToClearCaches = cacheNames.filter(cacheName => {
        return !AUTH_CACHE_PATTERNS.some(pattern => cacheName.includes(pattern)) &&
               cacheName !== CACHE_NAME; // Don't clear current working cache
      });
      
      safeToClearCaches.forEach((cacheName) => {
        console.log('🧹 Clearing safe cache:', cacheName);
        caches.delete(cacheName);
      });
    });
  } else if (event.data && event.data.type === 'HEALTH_CHECK') {
    // Health check endpoint for monitoring
    event.source.postMessage({
      type: 'HEALTH_RESPONSE',
      status: 'healthy',
      timestamp: Date.now(),
      version: CACHE_NAME
    });
  } else {
    console.warn('🚨 Received unknown or invalid message type:', event.data?.type);
  }
});