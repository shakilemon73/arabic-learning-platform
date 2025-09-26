import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: ["b0b5d4cf-af70-4ea9-808a-207b0f254306-00-2uiigz2w484m6.picard.replit.dev"], // ✅ Correct - array
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // Proxy API requests to backend server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections to backend server
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      }
    }
  },
});