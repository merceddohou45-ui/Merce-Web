---
name: MTB CORS + cookie configuration
description: Correct CORS and session cookie settings for the MTB API server in dev vs production
---

## Rule

In production: restrict CORS to trusted Replit origin patterns (`*.replit.app`, `*.replit.dev`, `*.repl.co`) using a callback. In development: allow all origins for convenience.

Session cookies: `secure: true, sameSite: "none"` in production (Replit HTTPS proxy requires this for cross-origin credentialed requests); `secure: false, sameSite: "lax"` in development.

Also set `app.set("trust proxy", 1)` in production so Express sees the real protocol from the Replit reverse proxy.

**Why:** `cors({ origin: true, credentials: true })` combined with `sameSite: "none"` in production allows credentialed XHR from any site — a CSRF/data-exposure risk. The allowlist pattern ensures only Replit-hosted frontends can make authenticated requests.

**How to apply:** See `artifacts/api-server/src/app.ts` for the `isProd` branching pattern. Never use `origin: true` in production with `credentials: true`.
