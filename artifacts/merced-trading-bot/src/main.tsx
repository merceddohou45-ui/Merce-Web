import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force dark mode
document.documentElement.classList.add("dark");

// Register service worker — only available in production build (vite-plugin-pwa)
// In development, the import virtual:pwa-register doesn't expose the SW to avoid dev overhead
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // Auto-update silently
        },
        onOfflineReady() {
          console.info("[PWA] Prête pour utilisation hors ligne");
        },
        onRegistered() {
          console.info("[PWA] Service Worker enregistré");
        },
        onRegisterError(error: unknown) {
          console.warn("[PWA] Erreur Service Worker:", error);
        },
        immediate: true,
      });
    })
    .catch(() => {
      // SW registration not available in this environment
    });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
