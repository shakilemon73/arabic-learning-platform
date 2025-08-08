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
    allowedHosts: [
      "localhost",
      "127.0.0.1", 
      "*.replit.dev",
      "*.replit.app",
      "*.replit.co",
      "a48d1007-ae0a-4978-b42c-1ecc63b0f78b-00-3a7j0py8wouxk.kirk.replit.dev"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});