from fastapi import (APIRouter, Depends, HTTPException, Request, Response,
                     status)
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token, decode_access_token
from app.core.scalekit import (send_passwordless_email,
                               verify_passwordless_email)
from app.db.session import get_db
from app.models.auth import (EmailRequest, MagicLinkVerifyRequest,
                             OTPVerifyRequest, PasswordlessSendResponse,
                             PasswordlessVerifyResponse)

router = APIRouter()


def get_current_user(request: Request):
    """Dependency to extract current user email from JWT cookie (returns None if absent/invalid)."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    return payload.get("sub")

# Send passwordless email (magic link or OTP)
@router.post("/send-passwordless", response_model=PasswordlessSendResponse)
async def send_passwordless(
    req: EmailRequest,
    request: Request,
    current_user: str | None = Depends(get_current_user)
):
    try:
        # Block if already authenticated with a valid token
        if current_user:
            raise HTTPException(status_code=409, detail="Already authenticated. Please log out before starting a new sign-in.")

        # Validate magiclink_auth_uri using urllib.parse for reliability
        magiclink_auth_uri = req.magiclink_auth_uri if req.magiclink_auth_uri is not None else "http://localhost:3000/passwordless/verify"
        from urllib.parse import urlparse
        parsed = urlparse(magiclink_auth_uri)
        # Strictly require http(s) and netloc for any user-provided value
        if req.magiclink_auth_uri is not None:
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise HTTPException(status_code=400, detail=f"Invalid magiclink_auth_uri: {magiclink_auth_uri}. Must be a valid http(s) URL.")

        template = "SIGNIN"
        state = None
        expires_in = 300
        template_variables = None
        resp = await send_passwordless_email(
            email=req.email,
            template=template,
            state=state,
            expires_in=expires_in,
            magiclink_auth_uri=magiclink_auth_uri,
            template_variables=template_variables
        )
        resp_data = resp[0] if isinstance(resp, tuple) else resp
        # If the response is an object, use attribute access
        if hasattr(resp_data, "auth_request_id"):
            return PasswordlessSendResponse(
                auth_request_id=resp_data.auth_request_id,
                expires_at=resp_data.expires_at,
                expires_in=resp_data.expires_in,
                passwordless_type=str(resp_data.passwordless_type)
            )
        # Fallback for dict response
        return PasswordlessSendResponse(
            auth_request_id=resp_data["authRequestId"],
            expires_at=resp_data["expiresAt"],
            expires_in=resp_data["expiresIn"],
            passwordless_type=str(resp_data["passwordlessType"])
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("[ERROR] /send-passwordless exception:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

# Verify OTP
@router.post("/verify-otp", response_model=PasswordlessVerifyResponse)
async def verify_otp(
    req: OTPVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),  # Example DI; not used yet but shows pattern
):
    # Defensive: check for missing auth_request_id
    if not req.auth_request_id:
        raise HTTPException(
            status_code=422,
            detail="Missing required field: auth_request_id. You must send both 'code' and 'auth_request_id' in the request body. Example: { 'code': '123456', 'auth_request_id': 'YOUR_AUTH_REQUEST_ID' }"
        )
    try:
        resp = await verify_passwordless_email(code=req.code, auth_request_id=req.auth_request_id)
        # Handle tuple or object response
        resp_data = resp[0] if isinstance(resp, tuple) else resp
        # Support both attribute and dict access
        if hasattr(resp_data, "email"):
            # Issue JWT
            token = create_access_token({"sub": resp_data.email})
            response.set_cookie(
                key="access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                path="/"
            )
            return PasswordlessVerifyResponse(
                email=resp_data.email,
                state=getattr(resp_data, "state", None),
                template=str(getattr(resp_data, "template", None)),
                passwordless_type=str(getattr(resp_data, "passwordless_type", getattr(resp_data, "passwordlessType", None)))
            )
        else:
            token = create_access_token({"sub": resp_data["email"]})
            response.set_cookie(
                key="access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                path="/"
            )
            return PasswordlessVerifyResponse(
                email=resp_data["email"],
                state=resp_data.get("state"),
                template=str(resp_data.get("template")),
                passwordless_type=str(resp_data.get("passwordlessType") or resp_data.get("passwordless_type"))
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Verify magic link
@router.post("/verify-magic-link", response_model=PasswordlessVerifyResponse)
async def verify_magic_link(
    req: MagicLinkVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),  # Example DI; not used yet but shows pattern
):
    try:
        resp = await verify_passwordless_email(
            link_token=req.link_token,
            auth_request_id=req.auth_request_id
        )
        resp_data = resp[0] if isinstance(resp, tuple) else resp
        # Object style response
        if hasattr(resp_data, "email"):
            token = create_access_token({"sub": resp_data.email})
            response.set_cookie(
                key="access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                path="/"
            )
            return PasswordlessVerifyResponse(
                email=resp_data.email,
                state=getattr(resp_data, "state", None),
                template=str(getattr(resp_data, "template", None)),
                passwordless_type=str(getattr(resp_data, "passwordless_type", getattr(resp_data, "passwordlessType", None)))
            )
        # Dict style response
        token = create_access_token({"sub": resp_data["email"]})
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/"
        )
        return PasswordlessVerifyResponse(
            email=resp_data["email"],
            state=resp_data.get("state"),
            template=str(resp_data.get("template")),
            passwordless_type=str(resp_data.get("passwordlessType") or resp_data.get("passwordless_type"))
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/session")
async def get_session(current_user: str | None = Depends(get_current_user)):
    if not current_user:
        return JSONResponse({"email": None}, status_code=200)
    return {"email": current_user}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}


@router.get("/db-ping")
def db_ping(db: Session = Depends(get_db)):
    """Simple DB dependency usage (executes a trivial statement)."""
    db.execute(text("SELECT 1"))
    return {"ok": True}


@router.get("/protected")
def protected(current_user: str | None = Depends(get_current_user)):
    """Example protected endpoint requiring an authenticated user."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return {"email": current_user, "message": "Protected content"}
