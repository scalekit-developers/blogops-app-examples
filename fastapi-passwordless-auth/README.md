# FastAPI Passwordless Auth Example

A modern, backend-only passwordless authentication system built with FastAPI and [ScaleKit](https://www.scalekit.com/). Implements secure passwordless login via email magic links and OTPs, robust JWT management, async route handlers, Pydantic models, and production-ready structure.

## Project Structure
```
README.md
requirements.txt
app
├── main.py
├── core
│   ├── jwt.py
│   └── scalekit.py
├── db
│   └── session.py
├── models
│   └── auth.py
├── routes
│   └── auth.py
├── tests
│   └── test_auth.py
```

## Quickstart & Documentation
- [ScaleKit Passwordless Quickstart](https://docs.scalekit.com/passwordless/quickstart/)
- [ScaleKit Official Website](https://www.scalekit.com/)
- [ScaleKit Documentation](https://docs.scalekit.com/)
- [ScaleKit Blog](https://www.scalekit.com/blog)

## Features
- Passwordless authentication (magic link & OTP)
- ScaleKit Python SDK integration
- Async FastAPI route handlers
- Pydantic models for request/response validation
- JWT token management (secure, timezone-aware)
- Database integration (SQLAlchemy, ready for user/session models)
- Dependency injection for DB session
- Error handling and input validation
- Pytest-based testing (comprehensive suite)
- Production deployment ready (CORS, middleware, structure)

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
3. Copy `.env.example` to `.env` and set your environment variables (ScaleKit keys, JWT secret, DB URI, etc).
4. Run the app:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Usage
All endpoints are under `/api/auth/`:
- `POST /api/auth/send-passwordless` — Start passwordless login (email only required)
- `POST /api/auth/verify-otp` — Verify OTP
- `POST /api/auth/verify-magic-link` — Verify magic link
- `GET /api/auth/session` — Get current session
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
