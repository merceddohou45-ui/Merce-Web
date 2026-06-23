---
name: connect-pg-simple session table setup
description: Why user_sessions must be created manually and how to pass the pool correctly in this monorepo
---

## Rule
The `user_sessions` table for connect-pg-simple must be created manually with SQL before first use. `createTableIfMissing: true` silently fails in this monorepo setup.

**Why:** connect-pg-simple v10 creates the table using its internal `pg` Pool. When `pool` is passed from `@workspace/db`, the pool works for queries but `createTableIfMissing` internally tries to require `pg` which isn't in api-server's direct `node_modules`, so the table creation step errors silently.

**How to apply:** Any time a new environment needs sessions (new deployment, cleared DB, etc.), run this SQL before starting the API server:
```sql
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
```

Also: always pass `pool` (from `@workspace/db`) not `conString` to the PgSession constructor. The `conString` option creates a brand-new internal `pg.Pool`, which fails because `pg` is not a direct dependency of `artifacts/api-server` — it lives in `lib/db/node_modules`.
