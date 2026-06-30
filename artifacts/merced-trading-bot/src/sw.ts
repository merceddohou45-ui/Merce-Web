/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// ─── Precache manifest (injected by Vite PWA at build time) ──────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Runtime caching strategies ──────────────────────────────────────────────

// API calls: network-first, fall back to cache (max 10s network timeout)
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "mtb-api-cache",
    networkTimeoutSeconds: 10,
  })
);

// Icons and images: cache-first (long-lived assets)
registerRoute(
  ({ url }) => url.pathname.startsWith("/icons/") || url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/),
  new CacheFirst({ cacheName: "mtb-icon-cache" })
);

// Static JS/CSS chunks: stale-while-revalidate for fast loads
registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({ cacheName: "mtb-static-cache" })
);

// ─── Push Notifications ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
  } = {};

  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { title: "Merced Trading Bot", body: event.data.text() };
  }

  const title = payload.title ?? "Merced Trading Bot";
  const options: NotificationOptions = {
    body: payload.body ?? "Nouveau signal de trading disponible",
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    tag: payload.tag ?? "signal",
    data: { url: payload.url ?? "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList): Promise<unknown> => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Skip waiting immediately on update ──────────────────────────────────────
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string })?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
