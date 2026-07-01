import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error("BASE_PATH environment variable is required but was not provided.");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      // injectManifest: you write your own SW (src/sw.ts) and Workbox injects
      // the precache manifest into self.__WB_MANIFEST at build time.
      // The `workbox` property only controls glob patterns for manifest injection.
      // All runtime caching logic belongs inside sw.ts itself.
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: "auto",
      // Enable in dev so the install flow can be tested locally
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "Merced Trading Bot",
        short_name: "MTB",
        description: "Signaux de trading professionnels basés sur l'analyse technique multi-timeframe en temps réel",
        start_url: basePath,
        scope: basePath,
        display: "standalone",
        background_color: "#0B0B0B",
        theme_color: "#D4AF37",
        orientation: "portrait-primary",
        lang: "fr",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: `${basePath}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${basePath}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: `${basePath}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${basePath}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Tableau de bord",
            url: `${basePath}dashboard`,
            description: "Voir les signaux en direct",
            icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192" }],
          },
          {
            name: "Signaux",
            url: `${basePath}signaux`,
            description: "Historique des signaux",
            icons: [{ src: `${basePath}icons/icon-192.png`, sizes: "192x192" }],
          },
        ],
      },
      // With injectManifest, only globPatterns matters here.
      // Runtime caching logic is defined directly in src/sw.ts.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
