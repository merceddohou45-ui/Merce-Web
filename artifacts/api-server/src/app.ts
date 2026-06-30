import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const PgSession = connectPgSimple(session);

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) throw new Error("SESSION_SECRET environment variable is required");

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) throw new Error("DATABASE_URL environment variable is required");

const isProd = process.env["NODE_ENV"] === "production";

// Build the exact set of allowed origins from the environment.
// REPLIT_DOMAINS is the precise hostname Replit assigns to this repl
// (e.g. "abc123.spock.replit.dev") — not a wildcard. In production we
// accept only that exact origin; in development we allow all origins for
// convenience (dev is not publicly trusted).
//
// To add a custom domain, set FRONTEND_ORIGINS=https://yourdomain.com
// (comma-separated for multiple).
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) {
    for (const d of replitDomains.split(",")) {
      const h = d.trim();
      if (h) {
        origins.add(`https://${h}`);
        origins.add(`http://${h}`); // Replit proxies handle TLS; keep HTTP for health checks
      }
    }
  }

  const extra = process.env["FRONTEND_ORIGINS"];
  if (extra) {
    for (const o of extra.split(",")) {
      const h = o.trim();
      if (h) origins.add(h);
    }
  }

  return origins;
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Trust the Replit reverse proxy so Express sees the real protocol/IP.
app.set("trust proxy", 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production: exact allowlist only — no regex, no wildcards.
// Development: open for local tooling convenience.
if (isProd) {
  const allowedOrigins = buildAllowedOrigins();
  logger.info({ origins: [...allowedOrigins] }, "CORS allowlist");
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin and server-to-server requests (no Origin header)
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, "CORS blocked");
          callback(new Error(`CORS: origin '${origin}' not allowed`), false);
        }
      },
      credentials: true,
    }),
  );
} else {
  app.use(cors({ origin: true, credentials: true }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessions ──────────────────────────────────────────────────────────────────
// sameSite:"lax" is correct for both environments:
//   - In production, the frontend and API are served through the same Replit
//     proxy domain, so they are same-origin — no need for sameSite:"none".
//   - In development, Vite proxies API calls through the same dev domain.
// sameSite:"none" would require CSRF protection on all state-changing routes
// and is unnecessary here.
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 60,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,          // true behind Replit HTTPS proxy, false in dev HTTP
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",         // works for same-origin Replit proxy in both envs
    },
  }),
);

app.use("/api", router);

export default app;
