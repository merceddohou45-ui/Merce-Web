import { useState, useEffect, useCallback } from "react";

const SW_READY_TIMEOUT = 5000;

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT)),
    ]);
    return reg as ServiceWorkerRegistration | null;
  } catch {
    return null;
  }
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL ?? "/";
    const res = await fetch(`${base}api/push/vapid-public-key`);
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey: string };
    return data.publicKey;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeOnServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const base = import.meta.env.BASE_URL ?? "/";
    const res = await fetch(`${base}api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type PushState = "unsupported" | "denied" | "granted" | "prompt" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }

    navigator.serviceWorker.ready
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setSubscription(existing);
          setState("granted");
        } else {
          setState(perm === "granted" ? "prompt" : "prompt");
        }
      })
      .catch(() => setState("prompt"));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState("loading");
    const sw = await getSwRegistration();
    if (!sw) { setState("unsupported"); return false; }

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) { setState("prompt"); return false; }

    try {
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      setSubscription(sub);
      const ok = await subscribeOnServer(sub);
      setState(ok ? "granted" : "prompt");
      return ok;
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "prompt");
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      await fetch(`${base}api/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setState("prompt");
    } catch {
      /* ignore */
    }
  }, [subscription]);

  return { state, subscription, subscribe, unsubscribe };
}
