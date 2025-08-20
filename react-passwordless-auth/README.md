# React Passwordless Auth (Scalekit)

End‑to‑end sample implementing email passwordless authentication (Magic Link, OTP, and combined LINK_OTP) with Scalekit. Includes:

- TypeScript Express API (send / verify code / verify link / session / logout)
- React 18 + Vite client with a reusable `usePasswordlessAuth` hook
- OTP auto-submit component, magic link detection, local persistence
- Secure HttpOnly session cookie (JWT) + logout
- Basic tests (hook, magic link, OTP smoke) with Vitest / Testing Library
- Error boundary, inline email validation, restart/reset flows

> Goal: Demonstrate a clean, backend‑agnostic hook & component pattern you can adapt while remaining minimal and readable.

![Access](/public/access.png)

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd react-passwordless-auth
pnpm install   # or npm / yarn (uses a pnpm workspace)
```

### 2. Configure Server Env

Copy server environment template and fill in Scalekit credentials:

```bash
cd server
cp .env.example .env   # Windows: copy .env.example .env
```

Required variables (`server/.env`):

| Variable | Purpose |
|----------|---------|
| SCALEKIT_ENVIRONMENT_URL | Scalekit environment base URL |
| SCALEKIT_CLIENT_ID | Scalekit client id |
| SCALEKIT_CLIENT_SECRET | Scalekit client secret |
| SESSION_JWT_SECRET | Secret for signing session JWT cookie |
| PORT | API port (default 4000) |
| APP_BASE_URL | Client origin (default <http://localhost:5173>) for CORS & magic link base |
| COOKIE_DOMAIN | Domain for cookie (localhost in dev) |
| MAGIC_LINK_VERIFY_PATH | Path appended to base for magic link redirect (e.g. /passwordless/verify) |
| SESSION_COOKIE_NAME | Cookie name (default app_session) |
| SESSION_TTL_SECONDS | Session lifetime in seconds |

### 3. Run Dev Servers

From the project root a single command starts both API & client:

```bash
pnpm run dev
```

![sign-in](/public/sign-in.png)

Default ports:

- Client: <http://localhost:5173>
- API: <http://localhost:4000>

Magic link verification path: `http://localhost:5173/passwordless/verify` (APP_BASE_URL + MAGIC_LINK_VERIFY_PATH).

### 4. Flow

1. Enter email on Sign In.
2. Hook calls `/api/auth/passwordless/send` (Scalekit triggers email).
3. Depending on `passwordlessType`:
	- `LINK`: Wait for magic link (auto-verifies when opened).
	- `OTP`: Navigate to Verify page & enter/paste 6-digit code (auto submit).
	- `LINK_OTP`: Either click link or enter code.
4. On success: server sets HttpOnly JWT cookie; UI shows welcome with email.
5. Logout clears cookie and local state.

![otp](/public/otp.png)

Restart / Recovery:

- Start Over / Restart buttons clear stale or expired state.
- Expired OTP automatically clears and returns to idle.

---

## Project Structure

```text
react-passwordless-auth
├─ package.json              # root scripts (dev runs both)
├─ pnpm-workspace.yaml
├─ README.md
├─ client
│  ├─ package.json
│  ├─ index.html
│  ├─ public
│  │  └─ scalekit.png
│  └─ src
│     ├─ main.tsx            # mounts providers & router
│     ├─ auth
│     │  ├─ usePasswordlessAuth.ts
│     │  └─ AuthProvider.tsx
│     ├─ components
│     │  ├─ EmailForm.tsx
│     │  ├─ OtpForm.tsx
│     │  ├─ MagicLinkHandler.tsx
│     │  └─ AppErrorBoundary.tsx
│     ├─ router
│     │  └─ Router.tsx
│     ├─ styles
│     │  └─ global.css
│     ├─ types
│     │  └─ auth.ts
│     └─ __tests__
│        ├─ usePasswordlessAuth.test.tsx
│        ├─ MagicLinkHandler.test.tsx
│        └─ OtpForm.test.tsx
└─ server
	├─ package.json
	├─ .env.example
	└─ src
		├─ index.ts
		├─ session.ts
		├─ scalekitClient.ts
		└─ routes
			└─ passwordless.ts
```

`/resend` endpoint exists; client resend UI intentionally omitted for simplicity.

---

## API Endpoints (prefix: `/api/auth/passwordless`)

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | /send | `{ email, template? }` | Request passwordless email (magic link / OTP) |
| POST | /resend | `{ authRequestId }` | Resend email (not wired in UI) |
| POST | /verify-link | `{ linkToken, authRequestId? }` | Verify magic link token |
| GET | /session | — | Returns `{ authenticated, email? }` |
| POST | /logout | — | Clears session cookie |

Responses containing BigInt are normalized to numbers before JSON.

Status codes: 200 success; 400 invalid input / missing auth_request_id; 401 unauthenticated; 410 expired; 500 server error.

---

## Hook Contract (`usePasswordlessAuth`)

| Key / Function | Description |
|----------------|-------------|
| phase | `idle`, `sending`, `codeSent`, `verifying`, `authenticated`, `error` |
| error | Last error string (if any) |
| email | Authenticated email (session) or in-flight email |
| sendResult | Metadata from /send (authRequestId, expiresAt, type) |
| timeLeft | Seconds until OTP expiry (0 when expired) |
| send(email) | Initiate passwordless flow |
| verifyCode(code) | Verify OTP |
| handleMagicLink(token, authRequestId?) | Process magic link (auto-called) |
| logout() | Invalidate server session + reset state |
| reset() | Clear local flow state (restart) |

Persistence keys (localStorage): `pw_auth_request_id`, `pl.sendResult`, `pl.sessionEmail`

---
## Testing

Run tests:

```bash
pnpm -F client test
```

Included tests:

- Hook: send + verify + invalid code branch
- MagicLinkHandler: auto verification flow
- OTP form: basic render (expand as needed)

---

## Security Notes

- Expired links return 410 (never silently succeed) to avoid ambiguous state.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| AUTH_REQUEST_EXPIRED on link | Reused / consumed or expired link | Re-initiate sign-in; avoid old email |
| CORS error | APP_BASE_URL mismatch | Set APP_BASE_URL to client origin |
| 400 auth_request_id required | Link verification without stored ID | Start sign-in in same browser first |

---

## Production Hardening (Out of Scope Here)

- Move authRequests / verifiedLinkCache to Redis / DB for multi-instance scale.
- Structured logging (JSON) + request IDs.
- CSRF defenses (double submit token) if adding non-auth JSON endpoints relying on cookie auth.
- Add resend UI with cooldown display.
- Broader test coverage (edge cases, error boundary, accessibility).
