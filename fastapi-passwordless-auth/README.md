# FastAPI Passwordless Auth

A modern, backend-only passwordless authentication system built with FastAPI and Scalekit. Implements secure passwordless login via email magic links and OTPs, with robust JWT management, async route handlers, Pydantic models, and production-ready structure.

## Features
- Passwordless authentication (magic link & OTP)
- [Scalekit Python SDK](https://docs.scalekit.com/) integration
- Async FastAPI route handlers
- Pydantic models for request/response validation
- JWT token management (secure, timezone-aware)
- Database integration (SQLAlchemy, ready for user/session models)
- Dependency injection for DB session
- Dependency injection for DB session & current user context
- Error handling and input validation
- Pytest-based testing (comprehensive suite)
- Production deployment ready (CORS, middleware, structure)

## Project Structure

```text
fastapi-passwordless-auth-copy/
├─ .env.example              # Environment variable template
├─ .env                      # Local environment variables (not committed)
├─ app/                      # FastAPI backend application
│  ├─ main.py                # App entrypoint (FastAPI instance)
│  ├─ core/                  # Core utilities & integrations
│  │  ├─ jwt.py              # JWT creation/validation helpers
│  │  └─ scalekit.py         # Scalekit SDK wrapper/integration
│  ├─ db/                    # Database/session related code
│  │  └─ session.py          # SQLAlchemy session setup
│  ├─ models/                # Pydantic/data models
│  │  └─ auth.py             # Auth-related models (requests/responses)
│  └─ routes/                # API route definitions
│     └─ auth.py             # Auth endpoints (passwordless flows)
├─ frontend/                 # Frontend (Next.js / React app structure)
│  └─ src/
│     └─ app/                # App router
│        ├─ page.tsx         # Landing / index page
│        ├─ dashboard/
│        │  └─ page.tsx      # Example protected dashboard page
│        └─ verify-magic-link/
│           └─ VerifyMagicLinkPage.tsx  # Magic link verification UI
├─ tests/                    # Pytest test suite
│  └─ test_auth.py           # Auth flow tests
├─ requirements.txt          # Python dependencies
├─ README.md                 # Documentation
└─ venv/                     # (Local) Virtual environment (excluded from VCS)
```

## Setup

1. Create a virtual environment:

   ```bash
   python -m venv venv
   venv\Scripts\activate  # On Windows
   # Or: source venv/bin/activate  # On Linux/Mac
   ```
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and set your environment variables (Scalekit keys, JWT secret, DB URI, etc).
4. Run the app:

   ```bash
   uvicorn app.main:app --reload
   ```

## API Usage

- All endpoints are under `/api/auth/`
- Main flows:
   - `POST /api/auth/send-passwordless` — Start passwordless login (email only required)
   - `POST /api/auth/verify-otp` — Verify OTP
   - `POST /api/auth/verify-magic-link` — Verify magic link
   - `GET /api/auth/session` — Get current session
   - `GET /api/auth/protected` — Example protected endpoint (requires cookie JWT)
   - `GET /api/auth/db-ping` — DB connectivity & DI demo
   - `POST /api/auth/logout` — Log out

## Testing

Run all tests with:

```bash
python -m pytest
```

All main and edge cases are covered.

## Deployment

- CORS and middleware are production-ready.
- For full production, add a Dockerfile or ASGI server config if needed.

## References & Further Reading

- [Scalekit Passwordless Quickstart](https://docs.scalekit.com/passwordless/quickstart/)
- [Scalekit Docs (all products)](https://docs.scalekit.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [SQLAlchemy 2.0 ORM Tutorial](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [python-jose (JWT) Docs](https://python-jose.readthedocs.io/)
- [Pytest Docs](https://docs.pytest.org/)
