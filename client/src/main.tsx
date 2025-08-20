import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Security: Enhanced service worker registration
if ('serviceWorker' in navigator && 'https:' === window.location.protocol || window.location.hostname === 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🔧 Secure cache management service registered');
        
        // Enhanced security: Validate service worker before sending messages
        if (registration.active && registration.scope === window.location.origin + '/') {
          registration.active.postMessage({ 
            type: 'SELECTIVE_CACHE_CLEAR',
            preserveAuth: true,
            timestamp: Date.now()
          });
        }
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
  });
}

// Security: Controlled cache management - preserve authentication
if ('caches' in window && import.meta.env.DEV) {
  // Only perform cache clearing in development
  caches.keys().then((cacheNames) => {
    // Preserve critical authentication and user data caches
    const safeToDeleteCaches = cacheNames.filter(name => 
      !name.includes('sb-auth') && 
      !name.includes('supabase') && 
      !name.includes('auth-token') &&
      !name.includes('user-session') &&
      !name.includes('workbox') // Preserve service worker caches
    );
    
    safeToDeleteCaches.forEach((cacheName) => {
      caches.delete(cacheName).catch(error => {
        console.warn('Cache deletion failed:', cacheName, error);
      });
    });
  }).catch(error => {
    console.warn('Cache management failed:', error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
