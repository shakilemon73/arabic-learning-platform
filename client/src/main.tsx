import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for cache management
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🔧 Cache management service registered');
        
        // Clear cache on page load
        if (registration.active) {
          registration.active.postMessage({ type: 'CLEAR_CACHE' });
        }
      })
      .catch((error) => {
        console.log('Service worker registration failed:', error);
      });
  });
}

// Additional cache clearing on app start
if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
