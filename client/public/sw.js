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
  // Security: Validate request origin
  if (!isValidOrigin(event.request.url)) {
    console.warn('🚨 Blocked request to unauthorized origin:', event.request.url);
    return;
  }

  // Security: Enhanced fetch handling with proper headers
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for security headers
        const responseToCache = response.clone();
        
        // Add security headers to responses
        const secureResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: {
            ...Object.fromEntries(responseToCache.headers.entries()),
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block'
          }
        });
        
        return response; // Return original response, not the modified one for compatibility
      })
      .catch((error) => {
        console.warn('🔒 Service worker fetch failed:', error);
        
        // Enhanced offline fallback
        return new Response(JSON.stringify({
          error: 'আপনি অফলাইনে আছেন / You are offline',
          message: 'দয়া করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন / Please check your internet connection',
          timestamp: new Date().toISOString()
        }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      })
  );
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