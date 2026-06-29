import { Router, type IRouter } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Configure web-push
const VAPID_PUBLIC_KEY = process.env["VAPID_PUBLIC_KEY"];
const VAPID_PRIVATE_KEY = process.env["VAPID_PRIVATE_KEY"];
const VAPID_CONTACT = process.env["VAPID_CONTACT"] ?? "mailto:admin@merced.io";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// GET /api/push/vapid-public-key
router.get("/push/vapid-public-key", (_req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(503).json({ error: "Push notifications non configurées" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post("/push/subscribe", async (req, res): Promise<void> => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Subscription invalide" });
    return;
  }

  const userId: number | undefined = req.session.userId;

  try {
    await db.execute(sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${userId ?? null}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      ON CONFLICT (endpoint) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            p256dh  = EXCLUDED.p256dh,
            auth    = EXCLUDED.auth
    `);
    res.json({ success: true });
  } catch (err) {
    console.error("push subscribe error", err);
    res.status(500).json({ error: "Erreur enregistrement subscription" });
  }
});

// POST /api/push/unsubscribe
router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ error: "endpoint requis" }); return; }
  try {
    await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur suppression" });
  }
});

// Helper exported for use in signal broadcast
export async function sendPushNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  let rows: Array<{ endpoint: string; p256dh: string; auth: string }> = [];
  try {
    const result = await db.execute(sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
    rows = result.rows as typeof rows;
  } catch {
    return;
  }

  const notifPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag ?? "signal",
    url: payload.url ?? "/dashboard",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });

  const results = await Promise.allSettled(
    rows.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notifPayload,
        { TTL: 60 }
      )
    )
  );

  // Remove stale subscriptions (410 Gone)
  const stale = rows.filter(
    (_, i) =>
      results[i].status === "rejected" &&
      (results[i] as PromiseRejectedResult).reason?.statusCode === 410
  );
  if (stale.length > 0) {
    await Promise.allSettled(
      stale.map((sub) =>
        db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`)
      )
    );
  }
}

export { router as pushRouter };
