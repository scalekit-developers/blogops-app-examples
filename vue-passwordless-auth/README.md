# Nuxt 3 / Vue 3 Passwordless Authentication (Scalekit) Sample

Production‑style passwordless authentication demo (OTP, Magic Link, Hybrid) using Scalekit + Nuxt 3 (Nuxt 4 ready). It showcases clear separation of concerns (API routes, composables, Pinia store, middleware), robust verification logic, SSR session hydration, logging, and a themed UI.

> Runs on Nuxt 3 today. Folder + runtime config layout is forward compatible with Nuxt 4.

## Highlights

| Area | What This Example Shows |
|------|-------------------------|
| Auth Methods | OTP, Magic Link, and LINK_OTP hybrid (user can use either) |
| Scalekit Integration | Thin server wrappers around `@scalekit-sdk/node` (`send`, `resend`, `verify`) |
| API Design | `/api/passwordless/*` + `/api/auth/*` isolated from UI concerns |
| Session | httpOnly JWT cookie (1d expiry) + server plugin hydration (`plugins/session.server.ts`) |
| State | Pinia store manages: user, authRequestId, passwordlessType, expiry |
| Client Logic | `useAuth` composable encapsulates send/resend/verify, error + verifying states, localStorage persistence |
| Magic Link Safety | Enforces presence of `auth_request_id` when verifying link tokens (defensive) |
| BigInt Handling | Responses normalized to avoid JSON serialization errors |
| Enum Mapping | Numeric passwordless_type values mapped to human‑readable strings |
| Logging | Structured JSON logger (request id, contextual meta) in `server/utils/logger.ts` |
| UI/UX | Gradient themed layout, dedicated OTP page, resilient buttons, clear status & error messaging |
| Middleware | `auth.global` guards protected routes + `definePageMeta({ requiresAuth: true })` support |
| Resilience | Abort + timeout guarding send, duplicate click prevention for verify, localStorage recovery |

## Folder Structure

```text
vue-passwordless-auth/
├─ .env.example                # Template env vars
├─ nuxt.config.ts              # Runtime config (Scalekit + public settings)
├─ app.vue                     # Root + global theme/styles
├─ layouts/
│  └─ default.vue              # Global shell (header/footer/error boundary)
├─ components/
│  ├─ AuthEmailForm.vue        # Email capture + send action
│  ├─ AuthStatus.vue           # Header auth pill + logout/login
│  └─ OtpForm.vue              # (Legacy placeholder, flow now uses dedicated page)
├─ composables/
│  └─ useAuth.ts               # Core client auth logic (send/resend/verify, persistence)
├─ middleware/
│  └─ auth.global.ts           # Client-side route protection
├─ plugins/
│  └─ session.server.ts        # SSR session hydration plugin
├─ server/
│  ├─ plugins/
│  │  └─ scalekit.ts           # Safely initialize Scalekit SDK
│  ├─ api/
│  │  ├─ passwordless/
│  │  │  ├─ send.post.ts       # Initiate passwordless flow (build magiclinkAuthUri)
│  │  │  ├─ resend.post.ts     # Resend email
│  │  │  └─ verify.post.ts     # Verify (code or link), create session
│  │  └─ auth/
│  │     ├─ session.get.ts     # Return current session (email)
│  │     └─ logout.post.ts     # Clear session cookie
│  └─ utils/
│     ├─ logger.ts             # Structured logging helpers
│     └─ session.ts            # JWT cookie helpers
├─ stores/
│  └─ auth.ts                  # Pinia store (user + request metadata)
├─ pages/
│  ├─ index.vue                # (Optional landing/home)
│  ├─ login.vue                # Start flow; link + OTP guidance
│  ├─ dashboard.vue            # Protected page (requires session)
│  └─ passwordless/
│     ├─ code.vue              # Dedicated OTP entry page
│     └─ verify.vue            # Magic link landing (link_token)
├─ package.json
├─ tsconfig.json
└─ README.md
```

## Environment Variables

Add these to `.env` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| SCALEKIT_ENV_URL | Your Scalekit environment base URL (https://...). |
| SCALEKIT_CLIENT_ID | Scalekit client id for the environment. |
| SCALEKIT_CLIENT_SECRET | Scalekit client secret (server-only). |
| JWT_SECRET | Secret for signing session JWT (change in production). |
| PASSWORDLESS_TYPE | Preferred type hint if SDK response omits (OTP, LINK, LINK_OTP). |

Magic Link Redirect (configure in Scalekit dashboard):
`https://localhost:3000/passwordless/verify`

## Quick Start

```bash
# Install deps
pnpm install      # or npm install / yarn

# Copy env file
cp .env.example .env
# Fill in the values from your Scalekit dashboard

# Run dev
pnpm dev
```

Open <http://localhost:3000> → Login → enter email. Depending on configured mode:

* OTP: You receive a code → redirected to `/passwordless/code`
* LINK: You click the magic link → `/passwordless/verify` processes token
* LINK_OTP: Either method works; both link and code are sent

Successful verification sets a session cookie and dashboard becomes available.

## Flow Overview

```text
send (email) ──> user inbox ──> (resend?) ──> verify (code OR link)
   │                                         │
   └─────────────────────────────────────────┴── set httpOnly session cookie
                                  fetch /api/auth/session → Pinia
```

Key nuances:

* Magic link verification requires `auth_request_id` (defensive; some backends demand origin pairing).
* LocalStorage retains in‑progress request (`authRequestId`, type, expiry) after reload.
* `verifying` state distinct from generic `loading` to avoid UI lockups.

## SSR & Hydration

The session cookie (JWT) is read on the server by `plugins/session.server.ts` during SSR and seeds the Pinia store for initial render. After verification the client still calls `/api/auth/session` to rehydrate immediately.

## Security Considerations

| Concern | Current Measure | Hardening Ideas |
|---------|-----------------|-----------------|
| Secrets | Only server reads `clientSecret` | Use secret manager (Vault, SSM) |
| Rate Limiting | Not implemented | Add IP+email throttling (Redis / edge proxy) |
| Session Replay | 1d JWT expiry | Rotate secrets, maintain revocation list |
| Brute Force OTP | SDK side + optional rate limit | Add attempt counter + lockout |
| Transport | Assume HTTPS in deployment | Enforce HSTS, secure cookies with `secure: true` in prod |

## Extending Ideas

| Goal | Approach |
|------|----------|
| Resend Cooldown | Track last send timestamp; disable button (store/composable) |
| Toast Notifications | Add a lightweight emitter (e.g., tiny event bus) + component |
| Dark/Light Toggle | Expose CSS variables, persist preference in localStorage |
| Refresh Tokens | Add `/api/auth/refresh` issuing short-lived access token |
| Additional Factors | Chain WebAuthn after passwordless verification |

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|-----------|
| 500 on send | Bad `SCALEKIT_*` vars or invalid ENV URL | Verify .env values & that ENV URL is absolute https:// |
| 400 magic link | Missing `auth_request_id` or mismatched redirect URL | Ensure link includes both query params; match dashboard config |
| Code always invalid | Expired or too many attempts | Resend and ensure within expiry window |
| Build fails `Invalid URL` | SDK initialized with empty env vars | Provide all env vars before starting dev |

## Notes on BigInt Fields

Some SDK responses may contain BigInt values; routes JSON.stringify with a replacer to convert them to strings, avoiding runtime serialization errors.

## License

MIT. Harden (rate limiting, refresh/revocation, audit logging) before production use.

---

Made for rapid learning of passwordless patterns with Scalekit + Nuxt. Feel free to adapt and iterate.
