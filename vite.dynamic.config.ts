import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Disable cartographer plugin to avoid traverse function errors
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
    allowedHosts: [
      // Current known Replit domains
      "6692d1bd-0682-4fda-81a4-bbcc258f1606-00-2yi5s6673es4l.spock.replit.dev", 
      "7ae9adfb-5f19-4518-ba2e-cd90a8e8fc72-00-37rpnnco1rqyc.riker.replit.dev",
      // Wildcards for all Replit domains
      "*.replit.dev", 
      "*.replit.app",
      "*.replit.co",
      // Local development
      "localhost",
      "127.0.0.1",
      // Allow all for development (less restrictive approach)
      "all"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});