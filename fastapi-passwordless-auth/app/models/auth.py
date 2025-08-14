from pydantic import BaseModel, EmailStr, Field


# Request to send passwordless email
class EmailRequest(BaseModel):
    email: EmailStr
    magiclink_auth_uri: str | None = None


# Request to verify OTP
class OTPVerifyRequest(BaseModel):
    code: str
    auth_request_id: str = Field(..., alias="authRequestId")

    model_config = {
        "populate_by_name": True
    }


# Request to verify magic link
class MagicLinkVerifyRequest(BaseModel):
    link_token: str = Field(..., alias="linkToken")
    auth_request_id: str | None = Field(None, alias="authRequestId")

    model_config = {
        "populate_by_name": True
    }


# Response from sending passwordless email
class PasswordlessSendResponse(BaseModel):
    auth_request_id: str
    expires_at: int
    expires_in: int
    passwordless_type: str


# Response from verification
class PasswordlessVerifyResponse(BaseModel):
    email: EmailStr
    state: str = None
    template: str = None
    passwordless_type: str = None
