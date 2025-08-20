import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// CRITICAL FIX: Disable service worker to prevent auth interference
// Service worker was causing authentication issues by intercepting requests
console.log('🔧 Service worker disabled to prevent authentication issues');

// Optional: Unregister existing service worker if it exists
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().then(() => {
        console.log('🧹 Unregistered problematic service worker');
      });
    });
  });
}

// CRITICAL FIX: Minimal cache management to prevent auth issues
if ('caches' in window && import.meta.env.DEV) {
  // Only clear non-essential caches and avoid touching auth-related storage
  caches.keys().then((cacheNames) => {
    // Very conservative cache clearing - only clear obviously safe caches
    const safeCaches = cacheNames.filter(name => 
      name.includes('vite') || 
      name.includes('assets') ||
      (name.includes('workbox') && !name.includes('auth'))
    );
    
    safeCaches.forEach((cacheName) => {
      caches.delete(cacheName).catch(error => {
        console.warn('Safe cache deletion failed:', cacheName, error);
      });
    });
  }).catch(error => {
    console.warn('Cache check failed:', error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
