/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 8100,
    strictPort: true,
    hmr: {
      // Permet le HMR (Hot Module Replacement) sur Docker
      clientPort: 8100,
      host: "localhost",
    },
    cors: true,
    proxy: {
      // Configurer un proxy pour éviter les problèmes CORS
      "/api": {
        target: "http://192.168.1.11",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    minify: "terser",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    outDir: "dist",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
