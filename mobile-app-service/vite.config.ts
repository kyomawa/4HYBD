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
      clientPort: 8100,
      host: "localhost",
      protocol: "ws",
      timeout: 30000
    },
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
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
