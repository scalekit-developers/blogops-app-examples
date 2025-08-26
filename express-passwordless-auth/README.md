# Express + Scalekit Passwordless Auth (Minimal)

Small, browseable Express.js sample showing core passwordless flows with **Scalekit**. Kept intentionally lean: few files, clear steps, minimal options.

## What’s Included

- Scalekit client lazy init (`config/scalekit.js`).
- Passwordless email endpoints: send, resend, verify by code, verify by magic link.
- Minimal middleware: security (helmet+compression), CORS, sessions, rate limits, logging.
- Central validation + error handler.
- Swagger UI (`/docs`) served from a pre-generated OpenAPI spec.
- Docker + compose examples (Redis placeholder not yet wired in code).
- JWT issued on verification.

## Quick Start

1. Install dependencies

  ```sh
  npm install
  ```

1. Create `.env` (see vars below) with your Scalekit credentials.

1. Run in dev (auto regenerates spec):

  ```sh
  npm run dev
  ```

1. Open Swagger UI: <http://localhost:3000/docs>

1. Send an email → verify via code or magic link.

## Environment Variables

Required:

- `SCALEKIT_ENVIRONMENT_URL`
- `SCALEKIT_CLIENT_ID`
- `SCALEKIT_CLIENT_SECRET`
- `JWT_SECRET` (remove JWT logic if you don’t need it)
- `JWT_SECRET` (remove JWT logic if you don’t need it)
- `JWT_ENABLED` (true/false, default true) – toggle JWT issuance

Optional:

- `SESSION_SECRET` (auto-generated outside production if missing)
- `NEXT_PUBLIC_BASE_URL` (for building magic link redirect; falls back to `http://localhost:<PORT>`)
- `CORS_ALLOWED_ORIGINS` (CSV)
- `PASSWORDLESS_MAGICLINK_URI_OVERRIDE` (force a redirect URI)
- `LOG_FORMAT` (`text` | `json`)
- `LOG_LEVEL` (`info` | `error`)

If `SESSION_SECRET` is omitted in dev/test an ephemeral one is logged (never do this in production).

## Passwordless Flow

1. POST `/api/auth/passwordless/email/send` with `{ email }`.
2. Email arrives (OTP and/or link — configured in Scalekit dashboard). Automatic retry adds `magiclinkAuthUri` if SDK requires it.
3. OTP path: POST `/api/auth/passwordless/email/verify/code` with `code` + `authRequestId`.
4. Magic link path: browser hits `/api/auth/passwordless/verify?link_token=...&auth_request_id=...` (fallback retry if auth request id expired).
5. Server sets `req.session.user` and returns `{ user, token }`.
6. Client optionally calls `/api/me` to fetch session user; `/api/auth/logout` to end session.

## Endpoints At A Glance

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/passwordless/email/send` | Dispatch passwordless email |
| POST | `/api/auth/passwordless/email/resend` | Resend email by `authRequestId` |
| POST | `/api/auth/passwordless/email/verify/code` | Verify OTP code |
| GET  | `/api/auth/passwordless/verify` | Verify magic link |
| GET  | `/api/me` | Current session user |
| POST | `/api/auth/logout` | Destroy session |
| GET  | `/api/health` | Health check |

Root `/` also returns a small JSON index.

## Folder Structure (Slim)

```text
express-passwordless-auth/
├─ .dockerignore
├─ .env
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ Dockerfile
├─ nodemon.json
├─ package.json
├─ package-lock.json
├─ README.md
├─ src/
│ ├─ app.js
│ ├─ server.js
│ ├─ config/
│ │ ├─ env.js
│ │ └─ scalekit.js
│ ├─ docs/
│ │ ├─ generate-openapi.js
│ │ └─ openapi.json
│ ├─ middleware/
│ │ ├─ authGuard.js (unused/legacy)
│ │ ├─ cors.js
│ │ ├─ rateLimits.js
│ │ ├─ security.js
│ │ └─ session.js
│ ├─ routes/
│ │ ├─ auth.js
│ │ └─ health.js
│ ├─ services/
│ │ └─ authService.js
│ └─ utils/
│ ├─ errors.js
│ └─ logger.js
└─ node_modules/ (dependencies)
```


## Session & User Handling

Demo simply stores a minimal user object on `req.session.user` (generate / fetch real users in production). Replace with DB upsert logic after verifying.

## Security Notes

- Replace memory session store with Redis (see `docker-compose.yml`).
- Provide real `SESSION_SECRET` / `JWT_SECRET` in production (no auto-gen).
- Tighten CORS (`CORS_ALLOWED_ORIGINS`).
- Add CSP, CSRF (if browser forms), audit logging as needed.

## Docker

Production image now runs `npm start` (prestart generates OpenAPI spec automatically):

```sh
docker build -t scalekit-passwordless .
docker run --env-file .env -p 3000:3000 scalekit-passwordless
```

Compose (adds Redis; sessions use it automatically if `REDIS_URL` is set):

```sh
docker compose up --build
```

To enable Redis session store set in `.env` (compose supplies hostname):

```env
REDIS_URL=redis://redis:6379/0
```

For live reload in a container, bind mount and override command:

```sh
docker compose run --service-ports app npm run dev
```

## Rate Limiting

- Global limiter (window / max configurable via env).
- Send limiter (per email, default 2/min) on the send endpoint.

## Testing via Swagger

1. Open `/docs`.
2. Execute send endpoint with email.
3. Resend if desired.
4. Verify with code OR follow magic link.
