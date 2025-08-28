# Nuxt Passwordless Auth (Scalekit)

Minimal, end‑to‑end example of email passwordless auth (OTP, magic link, hybrid) with Nuxt + Scalekit. Focus: clarity, small surface area, understandable flow.

![Dashboard](/public/dashboard.png)

## What You Get (In Plain Words)

* Send + resend passwordless email
* Verify via code OR link
* Session cookie (httpOnly JWT) + SSR hydration
* Single composable (`useAuth`) + Pinia store
* Simple UI components (email form, status pill, code entry)
* Route protection via middleware
* Friendly error messages

## Folder Structure

```text
vue-passwordless-auth/
├─ .env.example                # Template env vars
├─ nuxt.config.ts              # Runtime config (Scalekit + public settings)
├─ app.vue                     # Root + global theme/styles
├─ layouts/
│  └─ default.vue              # Global shell (header/footer/error boundary)
├─ components/
│  ├─ AuthEmailForm.vue        # Email capture + send
│  ├─ AuthStatus.vue           # Auth pill + logout/login
│  └─ ui/                      # Small primitive components
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

## Setup (5 Steps)

1. Copy env file: `cp .env.example .env`
2. Fill: `SCALEKIT_ENV_URL`, `SCALEKIT_CLIENT_ID`, `SCALEKIT_CLIENT_SECRET`, `JWT_SECRET`
3. (Optional) Set `PASSWORDLESS_TYPE` (OTP | LINK | LINK_OTP)
4. Install deps: `pnpm install` (or npm / yarn)
5. Run dev: `pnpm dev` → open <http://localhost:3000>

Scalekit dashboard magic link redirect should point to: `/passwordless/verify`

## How It Works (In 6 Lines)

1. User enters email → `/api/passwordless/send`
![Email](/public/email.png)
2. Email arrives (code +/or link)
3. User enters code at `/passwordless/code` OR clicks link to `/passwordless/verify`
![OTP](/public/OTP.png)
1. Server verifies → sets httpOnly session cookie
2. Client fetches `/api/auth/session` → Pinia store hydrates
3. Protected pages check store (middleware)

Nuances: link verification enforces `auth_request_id`; localStorage keeps in‑progress request; separate `verifying` vs `loading` states.

## SSR

`plugins/session.server.ts` reads the cookie and seeds Pinia on first paint.

## Security (Short)

Secrets server-side only; JWT 1d expiry; add rate limiting + revocation + HTTPS hardening for prod.

## Troubleshooting (Quick)

500 send → env vars wrong. 400 link → missing auth_request_id or redirect mismatch. Invalid code → expired/too many attempts. Build Invalid URL → empty env vars.

## BigInt

Server coerces BigInt to string in JSON responses.
