# Go Fiber Passwordless Auth (Scalekit)

Minimal, session-based passwordless auth with Go Fiber and the Scalekit Go SDK. Single file app, Swagger UI, and Docker.

## Quick start

1. Prerequisites

- Go 1.21+
- Scalekit environment (Client ID/Secret)

2. Configure environment

Create a `.env` in the project root:

```env
SCALEKIT_CLIENT_ID=your_client_id
SCALEKIT_CLIENT_SECRET=your_client_secret
SCALEKIT_ENVIRONMENT_URL=https://api.scalekit.com/your-env
SCALEKIT_REDIRECT_URI=http://localhost:3000/callback
```

3. Run

```sh
go run main.go
```

Open <http://localhost:3000/docs> to try the API.

## How to use

- Start by calling `POST /request-auth` with your email (the server decides OTP or magic link).
- If OTP: `POST /verify-otp` with `{ "otp": "123456" }`.
- If magic link: either click the link (hits `GET /callback`) or `POST /verify-magic-link` with `{ "token": "<link_token>" }`.
- Check session: `GET /whoami`. Logout: `GET /logout`.

## Endpoints

- `POST /request-auth` — begin flow (email only)
- `POST /verify-otp` — verify OTP (otp only)
- `POST /verify-magic-link` — verify magic link (token only)
- `GET  /callback` — browser callback for magic links
- `GET  /whoami` — current session
- `GET  /logout` — end session
- `GET  /docs` — Swagger UI

## Files

- `main.go` — Fiber app, sessions, Scalekit send/verify, docs and callback
- `swagger.json` + `swagger-ui.html` — served at `/docs`
- `Dockerfile` — multi-stage, non-root runtime

## Docker

```sh
docker build -t scalekit-go-passwordless .
docker run -p 3000:3000 --env-file .env scalekit-go-passwordless
```
