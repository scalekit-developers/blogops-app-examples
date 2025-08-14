
import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .routes import auth

app = FastAPI(title="FastAPI Passwordless Auth")

# Allow CORS for frontend (adjust origins as needed)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"]
)

# Middleware to log raw request body for /api/auth/verify-otp
class LogVerifyOTPMiddleware(BaseHTTPMiddleware):
	async def dispatch(self, request: Request, call_next):
		if request.url.path == "/api/auth/verify-otp" and request.method == "POST":
			body = await request.body()
			print("[MIDDLEWARE] Raw /verify-otp body:", body)
			try:
				print("[MIDDLEWARE] Parsed JSON:", json.loads(body))
			except Exception:
				pass
		response = await call_next(request)
		return response

app.add_middleware(LogVerifyOTPMiddleware)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Root route for health check or welcome message
@app.get("/")
async def root():
	return {"message": "Welcome to the FastAPI Passwordless Auth API!"}
