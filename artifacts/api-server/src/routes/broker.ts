import { Router, type IRouter } from "express";
import { db, brokerSessionTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  ConnectBrokerBody,
  ConnectBrokerResponse,
  GetBrokerStatusResponse,
  DisconnectBrokerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/broker/connect", async (req, res): Promise<void> => {
  const parsed = ConnectBrokerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { broker, apiKey, apiSecret } = parsed.data;

  // Disconnect any existing session
  await db
    .update(brokerSessionTable)
    .set({ connected: false, disconnectedAt: new Date() })
    .where(eq(brokerSessionTable.connected, true));

  // Mask the API key for storage — never log or expose raw credentials
  const maskedKey = apiKey.length > 8
    ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
    : "****";

  // Account ID: derive from broker name + masked key for determinism (no Math.random)
  // In a real integration this would come from the broker's API response.
  const shortHash = Buffer.from(`${broker}:${apiKey.slice(-8)}`).toString("base64").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
  const accountId = `${broker.slice(0, 3).toUpperCase()}-${shortHash}`;

  // Balance is unknown until verified by the real broker API — set to 0 to be honest.
  // Traders will see their actual balance inside their platform.
  const balance = "0.00";

  const [session] = await db.insert(brokerSessionTable).values({
    broker,
    apiKey: apiKey.substring(0, 64),
    apiKeyMasked: maskedKey,
    accountId,
    balance,
    currency: "USD",
    connected: true,
  }).returning();

  req.log.info({ broker, sessionId: session.id }, "Broker connected");

  res.json(ConnectBrokerResponse.parse({
    connected: true,
    broker: session.broker,
    accountId: session.accountId,
    balance: parseFloat(session.balance ?? "0"),
    currency: session.currency,
    connectedAt: session.connectedAt.toISOString(),
  }));
});

router.get("/broker/status", async (req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(brokerSessionTable)
    .where(eq(brokerSessionTable.connected, true))
    .orderBy(desc(brokerSessionTable.connectedAt))
    .limit(1);

  if (!session) {
    res.json(GetBrokerStatusResponse.parse({
      connected: false,
      broker: "",
      accountId: null,
      balance: null,
      currency: null,
      connectedAt: null,
    }));
    return;
  }

  res.json(GetBrokerStatusResponse.parse({
    connected: true,
    broker: session.broker,
    accountId: session.accountId,
    balance: session.balance ? parseFloat(session.balance) : null,
    currency: session.currency,
    connectedAt: session.connectedAt.toISOString(),
  }));
});

router.post("/broker/disconnect", async (req, res): Promise<void> => {
  await db
    .update(brokerSessionTable)
    .set({ connected: false, disconnectedAt: new Date() })
    .where(eq(brokerSessionTable.connected, true));

  req.log.info("Broker disconnected");

  res.json(DisconnectBrokerResponse.parse({ status: "disconnected" }));
});

export default router;
