# Next.js Passwordless Auth with Scalekit

This project demonstrates a production-ready passwordless authentication flow using Next.js 15 (App Router), NextAuth v5 (JWT sessions), and [Scalekit](https://scalekit.com) for sending magic links or OTPs to users' email addresses.

## ⚡ Quickstart

1. Install

- Clone the repo and install deps.

2. Configure

- Create `.env.local` (see template below) with your Scalekit creds and `AUTH_SECRET`.

3. Run

- `npm run dev` and open <http://localhost:3000>

4. Try it

- Enter your email → check inbox for magic link/OTP → verify → land on dashboard.

## 📸 Screenshots

Below are screenshots of the main flows:

### Sign-In Screen

![Sign-In](public/sign-in.png)

### OTP Screen

![OTP](public/otp.png)

### Dashboard

![Dashboard](public/dashboard.png)

### Magic Link Mail

![Magic Link Mail](public/magil-link-mail.png)

**Frontend:**

- Built with Next.js App Router and React.
- Users enter their email, receive a magic link or OTP, and verify their identity.
- No dashboard or session-persisted UI is included (demo stops at login success).

**Backend/API:**

- NextAuth v5 is mounted at `/api/auth/[...nextauth]` with a custom Credentials provider that delegates verification to Scalekit.
- A route `/api/auth/send-passwordless` triggers sending the OTP/magic link.
- Sessions use NextAuth's JWT strategy by default; an optional Prisma adapter can be enabled with environment variables and installed deps.

**Flow:**

1. User enters email and submits.
2. `/api/auth/send-passwordless` sends a magic link/OTP to the email using Scalekit.
3. User enters OTP (or clicks magic link).
4. The app calls `signIn('scalekit', ...)` (NextAuth) to verify OTP or magic link token and establish a session.

## 🛠️ Tech Stack & Libraries

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [Scalekit Node SDK](https://www.npmjs.com/package/@scalekit-sdk/node)
- [NextAuth v5 (beta)](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/) for styling

## ✅ What’s Included (DoD Coverage)

- Custom NextAuth Credentials provider that integrates with Scalekit for passwordless (send email, verify OTP or magic link)
- Session callbacks to project `email` from JWT to `session.user.email`
- JWT session strategy with a centralized `AUTH_SECRET`
- Optional Prisma adapter activation when `DATABASE_URL` and deps are present (no code edits required)
- Optional GitHub OAuth provider auto-enables when `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are set
- TypeScript module augmentation for `Session` and `JWT`
- Middleware that protects routes, allows NextAuth endpoints, `/_next`, and static assets
- Minimal automated tests (Vitest) covering authorize branches and session endpoint

## 🚀 Getting Started

1. **Clone the repo:**

 ```bash
 git clone <repo-url>
 cd nextjs-passwordless-auth
 ```

2. **Install dependencies:**

 ```bash
 npm install
 # or yarn or pnpm
 ```

3. **Configure environment variables:**

- Create `.env.local` and fill in your credentials:

   ```env
   # Scalekit (required)
   SCALEKIT_ENVIRONMENT_URL=...
   SCALEKIT_CLIENT_ID=...
   SCALEKIT_CLIENT_SECRET=...

   # App URLs
   AUTH_URL=http://localhost:3000              # Preferred by NextAuth v5 (used for magic link callback)
   NEXTAUTH_URL=http://localhost:3000          # Backward-compat fallback if AUTH_URL not set
   NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Used as last-resort fallback for magic link URL

   # Secrets
   AUTH_SECRET=replace-with-a-strong-random-string      # Preferred by NextAuth v5
   # NEXTAUTH_SECRET=replace-with-a-strong-random-string  # Optional fallback

   # Optional: GitHub OAuth (auto-enables when both are set)
   # AUTH_GITHUB_ID=...
   # AUTH_GITHUB_SECRET=...

   # Optional: Prisma adapter (auto-enables when set and deps installed)
   # DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

4. **Run the dev server:**

 ```bash
 npm run dev
 ```

5. **Open the app:**

- Visit [http://localhost:3000](http://localhost:3000)

## 📝 How It Works

- We use the v5 root `auth.ts` pattern in `src/auth.ts`: `export const { auth, handlers, signIn, signOut } = NextAuth(config)`.
- The App Router route `/api/auth/[...nextauth]` simply re-exports `{ GET, POST }` from `handlers`.
- For server-side session, prefer `auth()` in v5 instead of `getServerSession()`.

### How the files connect (at a glance)

- `src/lib/authOptions.ts`: NextAuth config — custom provider + callbacks + optional OAuth/Prisma
- `src/auth.ts`: Boots NextAuth and exports `{ auth, handlers, signIn, signOut }`
- `src/app/api/auth/[...nextauth]/route.ts`: Re-exports `{ GET, POST }` from `handlers`
- `src/app/api/auth/send-passwordless/route.ts`: Triggers Scalekit email with magic link/OTP
- `src/app/api/auth/session/route.ts`: Returns `{ user, expires }` by decoding the JWT
- `src/middleware.ts`: Protects routes, allows public/static/Next internals

1. **Email Submission:**

- User enters their email and submits the form.
- The frontend calls `/api/auth/send-passwordless`.
- The API route uses Scalekit to send a magic link or OTP to the email.

2. **OTP Verification:**

- User enters the OTP received in their email.
- The frontend calls `signIn('scalekit', { email, code, authRequestId, redirect: false })`.
- The NextAuth Credentials provider verifies the code with Scalekit and, on success, creates a session.

3. **Magic Link Verification:**

- If the user clicks the magic link, they land on `/verify-magic-link`.
- The page reads `link_token` from the URL and calls `signIn('scalekit', { linkToken, authRequestId, redirect: false })`.
- On success, the user is redirected to the dashboard.

## 📦 File Structure

```txt
src/
├── app/
│   ├── page.tsx                  # Main login UI
│   ├── dashboard/
│   │   └── page.tsx              # Dashboard page
│   ├── verify-magic-link/
│   │   └── page.tsx              # Magic link verification UI (client page)
│   ├── api/
│   │   └── auth/                 # Auth API namespace
│   │       ├── [...nextauth]/    # NextAuth route (providers, callbacks, etc.)
│   │       │   └── route.ts
│   │       ├── send-passwordless/ # Send magic link / OTP
│   │       │   └── route.ts
│   │       └── session/          # (Optional) proxy to NextAuth session (GET/POST)
│   │           └── route.ts
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── favicon.ico               # Favicon
├── lib/
│   ├── authOptions.ts            # NextAuth configuration (Credentials provider, optional OAuth/Prisma)
│   ├── authSecret.ts             # Centralized secret resolution (AUTH_SECRET preferred)
│   └── scalekit.ts               # Scalekit client init
├── middleware.ts                 # Route protection with token decode and safe public/static bypass
├── types/
│   └── next-auth.d.ts            # Type augmentation for Session and JWT
tests/
├── auth.authorize.test.ts        # Unit tests for authorize (send/verify flows)
└── session.route.test.ts         # Session endpoint tests
vitest.config.ts                  # Vitest setup (alias, CSS/postcss disabled)
public/
├── sign-in.png                   # Screenshot: Sign-In
├── otp.png                       # Screenshot: OTP
├── dashboard.png                 # Screenshot: Dashboard
├── magil-link-mail.png           # Screenshot: Magic Link Mail
├── scalekit.png                  # Scalekit logo
└── ...                           # Other public assets
```

## 🧩 Optional Integrations

### GitHub OAuth

- Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` to automatically enable the GitHub provider. No code changes required.

### Prisma Adapter

- Set `DATABASE_URL` and install the dependencies to automatically enable the Prisma adapter:

   ```bash
   npm i @prisma/client @auth/prisma-adapter
   ```

- If not present, the app remains JWT-only.

## 🔐 Middleware Notes

- Public routes include `/`, `/api/auth/*`, `/verify-magic-link`, and static assets like `/_next/*`, `favicon.ico`, images, CSS/JS.
- All other routes require a valid token; unauthenticated users are redirected to `/`.

## 🧪 Testing

- This repo includes a minimal Vitest setup:
  - `npm run test` runs all tests once.
  - `npm run test:watch` for watch mode.
  - Tests mock Scalekit and Auth.js token decoding for deterministic behavior.

## 📚 References

- [Scalekit Quickstart](https://docs.scalekit.com/passwordless/quickstart/)
- [Scalekit Docs](https://docs.scalekit.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
