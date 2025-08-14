

import asyncio
import os

from dotenv import load_dotenv
from scalekit import ScalekitClient

load_dotenv()

SCALEKIT_ENVIRONMENT_URL = os.getenv("SCALEKIT_ENVIRONMENT_URL")
SCALEKIT_CLIENT_ID = os.getenv("SCALEKIT_CLIENT_ID")
SCALEKIT_CLIENT_SECRET = os.getenv("SCALEKIT_CLIENT_SECRET")
NEXT_PUBLIC_BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")


sc = ScalekitClient(
    SCALEKIT_ENVIRONMENT_URL,
    SCALEKIT_CLIENT_ID,
    SCALEKIT_CLIENT_SECRET
)

async def send_passwordless_email(email: str, template: str = "SIGNIN", state: str = None, expires_in: int = 300, magiclink_auth_uri: str = None, template_variables: dict = None):
    loop = asyncio.get_event_loop()
    kwargs = {
        "email": email,
        "template": template,
        "expires_in": expires_in,
    }
    if state:
        kwargs["state"] = state
    if magiclink_auth_uri:
        kwargs["magiclink_auth_uri"] = magiclink_auth_uri
    if template_variables:
        kwargs["template_variables"] = template_variables

    response = await loop.run_in_executor(None, lambda: sc.passwordless.send_passwordless_email(**kwargs))
    return response

async def resend_passwordless_email(auth_request_id: str):
    loop = asyncio.get_event_loop()

    response = await loop.run_in_executor(None, lambda: sc.passwordless.resend_passwordless_email(auth_request_id))
    return response

async def verify_passwordless_email(code: str = None, link_token: str = None, auth_request_id: str = None):
    loop = asyncio.get_event_loop()
    def call():
        kwargs = {}
        if code:
            kwargs["code"] = code
        if link_token:
            kwargs["link_token"] = link_token
        if auth_request_id:
            kwargs["auth_request_id"] = auth_request_id
        return sc.passwordless.verify_passwordless_email(**kwargs)
    response = await loop.run_in_executor(None, call)
    return response
