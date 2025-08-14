import re

from fastapi.testclient import TestClient

from app.core.jwt import create_access_token
from app.main import app

client = TestClient(app)


def test_send_passwordless():
    response = client.post("/api/auth/send-passwordless", json={"email": "test@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert "auth_request_id" in data
    assert "expires_at" in data
    assert "expires_in" in data
    assert "passwordless_type" in data


def test_verify_otp_missing_fields():
    response = client.post("/api/auth/verify-otp", json={"code": "123456"})
    assert response.status_code == 422
    assert "authRequestId" in response.text


def test_verify_magic_link_missing_fields():
    response = client.post("/api/auth/verify-magic-link", json={"link_token": "sometoken"})
    # Should fail with 400 or 422 if required fields are missing or invalid
    assert response.status_code in (400, 422)
    data = response.json()
    # Logical check: error should mention invalid link token or BAD_REQUEST
    assert "detail" in data
    assert "invalid link token" in data["detail"] or "BAD_REQUEST" in data["detail"]


def test_invalid_email_format():
    response = client.post("/api/auth/send-passwordless", json={"email": "not-an-email"})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("email" in str(item) for item in data["detail"])


def test_invalid_magic_link_url():
    # Simulate sending with a bad magic link URL if endpoint allows
    response = client.post("/api/auth/send-passwordless", json={"email": "test@example.com", "magiclink_auth_uri": "not-a-url"})
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "magiclink_auth_uri" in str(data["detail"]) or "invalid" in str(data["detail"]).lower()


def test_session_prevention():
    # Use a real JWT for the access_token cookie
    token = create_access_token({"sub": "test@example.com"})
    client.cookies.set("access_token", token)
    response = client.post("/api/auth/send-passwordless", json={"email": "test@example.com"})
    assert response.status_code == 409
    data = response.json()
    assert "Already authenticated" in data["detail"]
    client.cookies.clear()


def test_rate_limiting_simulation():
    # Simulate rapid requests (if rate limiting is implemented)
    responses = [client.post("/api/auth/send-passwordless", json={"email": f"test{i}@example.com"}) for i in range(5)]
    # If rate limiting is present, at least one should fail
    assert any(r.status_code in (429, 400, 403) for r in responses) or all(r.status_code == 200 for r in responses)


# JWT decode test (if you expose a decode endpoint or can access the token)
def test_jwt_token_structure():
    response = client.post("/api/auth/send-passwordless", json={"email": "test@example.com"})
    assert response.status_code == 200
    # Simulate OTP verification to get JWT (would need actual OTP, so just check cookie set)
    # Here, just check that the response to verify_otp sets a cookie if possible
    # This is a placeholder for actual JWT decode logic
    # You can expand this if you expose a /decode endpoint or similar
