import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for selective cache management
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🔧 Cache management service registered');
        
        // Only clear non-auth related caches to preserve authentication
        if (registration.active) {
          registration.active.postMessage({ 
            type: 'SELECTIVE_CACHE_CLEAR',
            preserveAuth: true 
          });
        }
      })
      .catch((error) => {
        console.log('Service worker registration failed:', error);
      });
  });
}

// Selective cache clearing - preserve authentication tokens
if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    // Only clear non-essential caches, preserve auth-related storage
    const nonAuthCaches = cacheNames.filter(name => 
      !name.includes('sb-auth') && 
      !name.includes('supabase') && 
      !name.includes('auth-token')
    );
    
    nonAuthCaches.forEach((cacheName) => {
      caches.delete(cacheName);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
