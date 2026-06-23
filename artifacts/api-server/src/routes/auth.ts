import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, userTable, tradingAccountTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    return;
  }

  const existing = await db.select().from(userTable).where(eq(userTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(userTable).values({
    email: email.toLowerCase(),
    passwordHash,
  }).returning();

  req.session.userId = user!.id;
  req.session.save((err) => {
    if (err) req.log.error({ err }, "Session save failed after register");
    res.json({ id: user!.id, email: user!.email, hasAccount: false });
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis." });
    return;
  }

  const [user] = await db.select().from(userTable).where(eq(userTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  // Check if trading account exists
  const [account] = await db.select().from(tradingAccountTable).where(eq(tradingAccountTable.userId, user.id)).limit(1);

  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) req.log.error({ err }, "Session save failed after login");
    res.json({ id: user.id, email: user.email, hasAccount: !!account });
  });
});

// POST /auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /auth/me
router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }
  const [user] = await db.select({ id: userTable.id, email: userTable.email }).from(userTable).where(eq(userTable.id, req.session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable." });
    return;
  }
  const [account] = await db.select().from(tradingAccountTable).where(eq(tradingAccountTable.userId, user.id)).limit(1);
  res.json({ id: user.id, email: user.email, hasAccount: !!account });
});

export { router as authRouter };
