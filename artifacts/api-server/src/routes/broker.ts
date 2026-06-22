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

  // Mask the API key for storage
  const maskedKey = apiKey.length > 8
    ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
    : "****";

  // Simulate broker connection — assign mock account details
  const mockBalances: Record<string, number> = {
    binance: 10000 + Math.random() * 5000,
    bybit: 5000 + Math.random() * 3000,
    exness: 15000 + Math.random() * 8000,
    metatrader: 8000 + Math.random() * 4000,
  };

  const brokerKey = broker.toLowerCase().replace(/[^a-z]/g, "");
  let matchedKey = "default";
  for (const k of Object.keys(mockBalances)) {
    if (brokerKey.includes(k)) { matchedKey = k; break; }
  }
  const balance = mockBalances[matchedKey] ?? 10000 + Math.random() * 5000;

  const [session] = await db.insert(brokerSessionTable).values({
    broker,
    apiKey: apiKey.substring(0, 64),
    apiKeyMasked: maskedKey,
    accountId: `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    balance: balance.toFixed(2),
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
