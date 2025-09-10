# Scalekit + Firebase Passwordless Auth (Minimal)

A minimal, production-ready Express.js backend implementing passwordless authentication using **Scalekit** for email verification and **Firebase** for user management and secure token generation. Designed for clarity, simplicity, and easy onboarding.

## Features

- **Scalekit Integration:** Send, resend, and verify passwordless emails (OTP or magic link).
- **Firebase Integration:** Firestore for user management, custom token generation for secure client authentication.
- **Endpoints:** RESTful API for passwordless flows, session management, and health checks.
- **Security:** Helmet, compression, CORS, rate limiting, and recommended Firestore rules.
- **Session Management:** Express-session (Redis support for production).
- **Swagger UI:** Auto-generated OpenAPI spec for API exploration.
- **Lean Structure:** Few files, modular design, easy to browse and extend.

## Quick Start

1. **Install dependencies**

  ```sh
  npm install
  ```

2. **Add Firebase credentials to `.env`**
  Copy your Firebase service account values to `.env` as shown in `.env.example`.

3. **Create `.env` file**
  See `.env.example` for required variables:

- `SCALEKIT_ENVIRONMENT_URL`
- `SCALEKIT_CLIENT_ID`
- `SCALEKIT_CLIENT_SECRET`
- `JWT_SECRET` (for demo, not used in Firebase flow)
- `SESSION_SECRET` (optional, auto-generated in dev)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_CLIENT_X509_CERT_URL`
- `FIREBASE_DATABASE_URL`
- Other optional variables for CORS, logging, etc.

1. **Run in development**

  ```sh
  npm run dev
  ```

5. **Open Swagger UI**
  [http://localhost:3000/docs](http://localhost:3000/docs)

## API Endpoints

| Method | Path                                         | Purpose                        |
|--------|----------------------------------------------|--------------------------------|
| POST   | `/api/auth/passwordless/email/send`          | Send passwordless email        |
| POST   | `/api/auth/passwordless/email/resend`        | Resend verification email      |
| POST   | `/api/auth/passwordless/email/verify/code`   | Verify OTP code                |
| GET    | `/api/auth/passwordless/verify`              | Verify magic link              |
| GET    | `/api/me`                                    | Get current session user       |
| POST   | `/api/auth/logout`                           | Destroy session                |
| GET    | `/api/health`                                | Health check                   |

## Authentication Flow

1. **Send Email:**
  `POST /api/auth/passwordless/email/send` with `{ email }`
  → Scalekit sends OTP or magic link to user.

2. **Verify:**

- **OTP:** `POST /api/auth/passwordless/email/verify/code` with `{ code, authRequestId }`
- **Magic Link:** `GET /api/auth/passwordless/verify?link_token=...&auth_request_id=...`

3. **Session & Token:**
  On successful verification, user record (`id`, `email`) is upserted in Firestore and a Firebase custom token is issued.

4. **Session User:**
  `GET /api/me` returns the current session user.

5. **Logout:**
  `POST /api/auth/logout` destroys the session.

## Project Structure

```text
.
├── nodemon.json
├── package.json
├── README.md
├── docs
│   └── supabase_edge_function_template.js
└── src
  ├── app.js                Express app setup and routing
  ├── server.js             HTTP server and graceful shutdown
  ├── config
  │   ├── env.js            Environment variable validation
  │   ├── firebase.js       Firebase Admin SDK initialization
  │   └── scalekit.js       Scalekit SDK lazy initialization
  ├── docs
  │   ├── generate-openapi.js Script to generate OpenAPI spec
  │   └── openapi.json      OpenAPI spec (auto-generated)
  ├── middleware
  │   ├── security.js       Helmet, compression
  │   ├── cors.js           CORS setup
  │   ├── rateLimits.js     Global and per-email rate limiting
  │   └── session.js        Express-session (in-memory or Redis)
  ├── routes
  │   ├── auth.js           Passwordless auth endpoints
  │   └── health.js         Health and session endpoints
  ├── services
  │   └── authService.js    Scalekit/Firebase integration logic
  └── utils
    ├── logger.js         HTTP logging (morgan)
    └── errors.js         Centralized error handling
```

## Redis Session Store (Optional)

By default, sessions are stored in memory (not recommended for production). To use Redis for session management:

1. Install Redis and dependencies:

  ```sh
  npm install ioredis connect-redis
  ```

2. Set `REDIS_URL` in your `.env` file:

  ```env
  REDIS_URL=redis://localhost:6379/0
  ```

3. The app will automatically use Redis for session storage if `REDIS_URL` is set and dependencies are installed.

**Note:** If Redis is not available, the app will fall back to in-memory sessions.
<!-- Folder structure is shown above in tree format -->

## Security Notes

- Set strict Firestore security rules in Firebase Console.
- Store secrets securely; never expose service account keys to the client.
- Tighten CORS (`CORS_ALLOWED_ORIGINS`).
- Add CSP, CSRF, and audit logging as needed.

## Rate Limiting

- **Global:** Configurable via env (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).
- **Per Email:** Default 2/minute on send endpoint.

## Design Rationale

- **Minimal, modular files:** Easy to browse and extend.
- **Service layer:** Isolates SDK calls for maintainability.
- **Lazy SDK init:** Fast startup, avoids boot failures.
- **Session checks:** Inline for simplicity.
- **Rate limiting:** Protects email channel and API.
- **Swagger UI:** Lowers barrier for API testing.


For further details, see the [Scalekit docs](https://docs.scalekit.com/) and the OpenAPI spec in [`src/docs/openapi.json`](src/docs/openapi.json).
