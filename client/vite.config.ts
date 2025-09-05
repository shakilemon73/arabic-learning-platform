import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@shared": path.resolve(__dirname, "..", "shared"),
        "@assets": path.resolve(__dirname, "..", "attached_assets"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
            supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react']
          }
        }
      }
    },
    base: "/",
    define: {
      global: "globalThis",
      // Properly expose environment variables
      __VITE_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL),
      __VITE_SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: [
        "localhost",
        "127.0.0.1", 
        "*.replit.dev",
        "*.replit.app",
        "*.replit.co"
      ],
    },
    // Ensure environment variables are properly loaded
    envDir: '.',
    envPrefix: ['VITE_'],
  }
});