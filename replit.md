# Merced's Trading Bot

An intelligent trading signal bot with real technical analysis, French UI, and PWA support for mobile installation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — secret for express-session

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, TailwindCSS, framer-motion
- PWA: vite-plugin-pwa, installable on Android/iPhone

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract (NEVER change `info.title: Api`)
- `lib/db/src/schema/` — all Drizzle schema files
- `artifacts/api-server/src/` — Express API server
- `artifacts/merced-trading-bot/src/` — React frontend
- `artifacts/merced-trading-bot/public/icons/` — PWA icons (192px, 512px)

## Architecture decisions

- **French-only UI**: no i18n library — all labels are hardcoded in French
- **Email/password auth**: email + bcryptjs, sessions in PostgreSQL via connect-pg-simple v10
- **Session storage**: `user_sessions` table must be created manually — `createTableIfMissing` does NOT auto-create it; run the SQL in the Gotchas section if the table is missing
- **Market engine**: generates signals only when ≥4 TA conditions met (RSI, EMA20/50, MACD, support/resistance, momentum); active position lock per asset
- **Signals**: always labeled ACHAT/VENTE (not BUY/SELL) in the UI
- **PWA icons**: generated with pure Node.js (no canvas module available) at startup

## Product

- Landing page → Register / Login → Trading account setup → Dashboard
- Dashboard: live signal feed via WebSocket, ACHAT/VENTE labels, 4-condition minimum
- Signals history page with French labels
- Portfolio: track open/closed positions, equity curve, P&L
- Psychology: journal with emotional tags, win-rate by emotion charts
- Mobile: bottom tab bar, touch-optimized, installable as PWA

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **`user_sessions` table**: must exist before the API server starts sessions. If sessions aren't persisting, run:
  ```sql
  CREATE TABLE IF NOT EXISTS "user_sessions" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
  );
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
  ```
- **connect-pg-simple v10**: pass `pool` (from `@workspace/db`) instead of `conString` — the `conString` option creates its own pg.Pool which fails in the monorepo because `pg` isn't in api-server's direct dependencies
- **TanStack Query v5 + Orval hooks**: the generated `query` option type requires `queryKey`. Cast with `as any` for partial options — this is a known TQ v5 + Orval generated type quirk
- **pnpm run dev at root**: do NOT run at root — use workflows instead
- `pnpm --filter @workspace/db run push` — use for dev schema changes only, does NOT create `user_sessions`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
