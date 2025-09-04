# Passwordless Auth Backend (Next.js + Scalekit)

A minimal, production-conscious Next.js (App Router) backend showcasing passwordless authentication (magic link / OTP) with the Scalekit Node SDK. Includes structured logging, security headers, rate limiting, JWT session cookies, and OpenAPI (Swagger UI) docs.

## Features
- Passwordless email flow: send magic link / OTP, verify, issue session, introspect, logout.
- Scalekit SDK integration with strict env validation.
- JWT session cookie (`sk_session`) + httpOnly `sk_auth_request_id` cookie to support magic link origin validation.
- In‑memory verification store (email marked verified after successful link/OTP verification).
- Simple in‑memory rate limiter (per IP + route) via edge middleware.
- Security headers (CSP, HSTS in production, frame, referrer, X-Content-Type-Options, etc.).
- Structured logging (Winston) with correlation IDs & BigInt-safe serialization.
- OpenAPI 3 spec + Swagger UI page at `/api-docs`.
- Consistent JSON response envelope: `{ success, data? | error?, correlationId, errorCode? }`.

> NOTE: In-memory stores reset on redeploy. For production, replace with Redis / database persistence (see "Production Hardening").

## Project Structure

```text
.
├─ package.json                    # Scripts & deps
├─ tsconfig.json                   # TypeScript config
├─ next-env.d.ts                   # Next.js type augmentations
├─ README.md
├─ .gitignore
├─ src
│  ├─ app
│  │  ├─ api
│  │  │  ├─ send-magic-link
│  │  │  │  └─ route.ts            # POST /api/send-magic-link
│  │  │  ├─ verify-magic-link
│  │  │  │  └─ route.ts            # POST/GET /api/verify-magic-link
│  │  │  ├─ session
│  │  │  │  └─ route.ts            # GET /api/session (issue JWT)
│  │  │  ├─ logout
│  │  │  │  └─ route.ts            # POST /api/logout
│  │  │  ├─ protected
│  │  │  │  └─ session-info
│  │  │  │     └─ route.ts         # GET /api/protected/session-info
│  │  │  └─ swagger.json
│  │  │     └─ route.ts            # GET /api/swagger.json (OpenAPI spec)
│  │  ├─ api-docs
│  │  │  └─ page.tsx               # Swagger UI React page
│  │  ├─ layout.tsx                # App layout (imports global css & swagger css)
│  │  ├─ page.tsx                  # Root landing page
│  │  └─ globals.css               # Global styles
│  ├─ lib
│  │  ├─ backend.ts                # Scalekit client init & env validation
│  │  ├─ logger.ts                 # Winston logger setup
│  │  ├─ apiResponse.ts            # ok()/fail() helpers & correlation IDs
│  │  ├─ swaggerSpec.ts            # swagger-jsdoc definition
│  │  └─ verificationStore.ts      # In-memory verified email store
│  ├─ middleware
│  │  ├─ security.ts               # Security headers helper
│  │  └─ auth.ts                   # Lightweight JWT decode for protected routes
│  └─ middleware.ts                # Global middleware: security, rate limit, auth guard
└─ public (optional)               # Static assets

```

## Environment Variables

Create a `.env.local` (never commit real secrets) with:

```bash
SCALEKIT_ENVIRONMENT_URL=https://<your-env>.scalekit.com
SCALEKIT_CLIENT_ID=xxxxxxxx
SCALEKIT_CLIENT_SECRET=xxxxxxxx
# Optional session signing secret (dev fallback used if omitted)
SESSION_JWT_SECRET=dev-change-me
# Optional override for magic link verify page (frontend) if different
PASSWORDLESS_MAGICLINK_VERIFY_URL=http://localhost:3000/passwordless/verify
LOG_LEVEL=info
```
The server will throw early if required Scalekit variables are missing or malformed.

## Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open Swagger UI
# Visit: http://localhost:3000/api-docs
```

## API Overview

All responses share an envelope:

```json
{
  success: boolean,
  data?: any,
  error?: string,
  correlationId: string,
  errorCode?: string
}
```
Errors use `errorCode` (e.g. VALIDATION, VERIFY_FAILED, RATE_LIMIT, UNAUTHORIZED).

### 1. Send Magic Link / OTP

POST `/api/send-magic-link`

Body:

```json
{
  "email": "user@example.com",
  "state": "optional string",          # echoed back after verification
  "template": "SIGNIN",                # or custom template
  "expiresIn": 600,                     # seconds (also accepts expires_in)
  "magiclinkAuthUri": "http://...",    # override verify URL (snake/camel accepted)
  "templateVariables": { "name": "Ada" }
}
```

Success (keys normalized to snake_case):

```json
{
  "success": true,
  "data": {
    "auth_request_id": "...",
    "expires_at": 1720000000,
    "expires_in": 600,
    "passwordless_type": "MAGIC_LINK"
  },
  "correlationId": "..."
}
```
Also sets httpOnly cookie `sk_auth_request_id` for follow‑up verification if not passed explicitly.

### 2. Verify Magic Link / OTP

`POST` or `GET` `/api/verify-magic-link`

Accepts either magic link token or OTP code. Parameters can be sent via JSON body (POST) or query string (GET).

Supported parameter names (aliases accepted):

- Magic link token: `link_token`, `linkToken`, `token`
- OTP code: `code`
- Auth request id: `auth_request_id`, `authRequestId` (or implicit via cookie fallback)

Examples:

```http
POST /api/verify-magic-link
Content-Type: application/json

{ "link_token": "<token>", "auth_request_id": "<id>" }
```

Or OTP:

```http
POST /api/verify-magic-link
Content-Type: application/json

{ "code": "123456", "auth_request_id": "<id>" }
```

If the magic link enforces same-origin and `auth_request_id` is omitted, the cookie `sk_auth_request_id` is used automatically.

Response:

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "state": "optional string",
    "template": "SIGNIN",
    "passwordless_type": "MAGIC_LINK"
  },
  "correlationId": "..."
}
```

On success the email is marked verified server-side (in-memory).

### 3. Issue Session

GET `/api/session?email=user@example.com`

Requires the email to have been verified (previous step). Issues a JWT (30m expiry) returned in response and set as cookie `sk_session` (httpOnly, lax, secure in prod).

Response:

```json
{
  "success": true,
  "data": { "session": "<jwt>", "expiresIn": 1800 },
  "correlationId": "..."
}
```

### 4. Protected Session Introspection

GET `/api/protected/session-info`

Checks the session JWT from either:

- Authorization: `Bearer <token>` header (recommended for Swagger UI)
- `sk_session` cookie (browser client)

Response:

```json
{
  "success": true,
  "data": { "message": "active", "user": "user@example.com", "issuedAt": 1700000000, "expiresAt": 1700001800 },
  "correlationId": "..."
}
```

### 5. Logout

POST `/api/logout`

Body:

```json
{ "email": "user@example.com" }
```

Clears verification state and invalidates cookies client-side (stateless JWT can't be force-revoked without a blacklist). Response:

```json
{ "success": true, "data": { "message": "Logged out user@example.com" }, "correlationId": "..." }
```

### 6. OpenAPI JSON

GET `/api/swagger.json` – Raw OpenAPI 3 JSON (generated by swagger-jsdoc).

## Swagger UI Usage

Visit `http://localhost:3000/api-docs`.

For protected endpoint tests:

1. Acquire session JWT via `/api/session` after verification.
2. Click "Authorize" in Swagger UI, choose Bearer and paste the JWT.
3. Call `/api/protected/session-info`.


## Logging

Each request flow generates a `correlationId` included in responses. Winston outputs structured logs (human-friendly in dev). Sensitive fields (tokens, secrets) can be redacted with `redact()` helper when logging raw objects.

## Production Hardening (Next Steps)

- Persistence: Replace in-memory verification + rate limit structures with Redis or DB.
- JWT Rotation & Revocation: Add refresh tokens or jti blacklist.
- Stronger CSP: Remove `unsafe-inline` once UI script/style hashing in place.
- Edge Auth: Implement full signature verification (auth middleware currently does a lightweight decode for performance / compatibility).
- Metrics: Add Prometheus / OpenTelemetry instrumentation.
- Tests: Add unit + integration tests (Jest / Vitest) for auth flows & error cases.

## Development Tips

- If you change environment variables, restart dev server (Next does not hot-reload env).
- Correlate client errors with server logs via the `correlationId` field.
- Adjust rate limits in `src/middleware.ts` (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`).

Happy hacking! 🚀
