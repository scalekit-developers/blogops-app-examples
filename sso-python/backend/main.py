import json
import os
import pathlib

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from scalekit import (AuthorizationUrlOptions, CodeAuthenticationOptions,
                      ScalekitClient)

# Get the absolute path to the .env file
env_path = pathlib.Path(__file__).parent.absolute() / ".env"
print(f"Looking for .env file at: {env_path}")

# Load environment variables from the specified path
load_dotenv(dotenv_path=env_path, override=True, verbose=True)

# Print environment variables for debugging
print(f"SCALEKIT_ENVIRONMENT_URL: {os.getenv('SCALEKIT_ENVIRONMENT_URL')}")
print(f"SCALEKIT_CLIENT_ID: {os.getenv('SCALEKIT_CLIENT_ID')}")
print(f"SCALEKIT_CLIENT_SECRET: {os.getenv('SCALEKIT_CLIENT_SECRET', 'SECRET_HIDDEN')[:10]}...")
print(f"REDIRECT_URI: {os.getenv('REDIRECT_URI')}")

# Get environment variables with validation
env_url = os.getenv("SCALEKIT_ENVIRONMENT_URL")
client_id = os.getenv("SCALEKIT_CLIENT_ID")
client_secret = os.getenv("SCALEKIT_CLIENT_SECRET")
connection_id = os.getenv("SCALEKIT_CONNECTION_ID")
organization_id = os.getenv("SCALEKIT_ORGANIZATION_ID")
redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:3000/callback")

# Validate required environment variables
if not env_url or not client_id or not client_secret:
    raise ValueError(
        "Missing required environment variables. "
        "Please ensure SCALEKIT_ENVIRONMENT_URL, SCALEKIT_CLIENT_ID, and "
        "SCALEKIT_CLIENT_SECRET are set in your .env file."
    )

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Scalekit client
sc = ScalekitClient(env_url, client_id, client_secret)

@app.get("/auth/login")
async def login(provider: str = Query("google")):
    options = AuthorizationUrlOptions()

    print(f"Login request with provider: {provider}")
    print(f"Using connection_id: {connection_id}")
    print(f"Using organization_id: {organization_id}")
    print(f"Using redirect_uri: {redirect_uri}")

    if provider.lower() == "saml":
        # Use SAML authentication with enterprise connection
        if not connection_id or not organization_id:
            return JSONResponse(
                status_code=400,
                content={"error": "SAML authentication requires connection_id and organization_id"}
            )
        options.connection_id = connection_id
        options.organization_id = organization_id
    else:
        # Use OAuth provider (default to Google if not specified)
        options.provider = provider

    try:
        url = sc.get_authorization_url(redirect_uri=redirect_uri, options=options)
        print(f"Generated authorization URL: {url}")
        return JSONResponse(content={"authorization_url": url})
    except Exception as e:
        print(f"Error generating authorization URL: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate authorization URL: {str(e)}"}
        )

@app.get("/auth/callback")
async def callback(request: Request):
    code = request.query_params.get("code")
    error = request.query_params.get("error")
    error_description = request.query_params.get("error_description")

    if error:
        return JSONResponse(
            status_code=400,
            content={"error": f"Authorization error: {error_description}"}
        )

    if not code:
        return JSONResponse(
            status_code=400,
            content={"error": "No authorization code provided"}
        )

    # Simple cache to prevent duplicate code usage errors
    # In a production app, you'd use Redis or another cache mechanism
    if hasattr(app, "auth_cache") and code in app.auth_cache:
        print(f"Using cached result for code: {code[:5]}...")
        return JSONResponse(content=app.auth_cache[code])

    try:
        print(f"Authenticating with code: {code}")
        print(f"Using redirect_uri: {redirect_uri}")

        # Create options for authenticate_with_code
        options = CodeAuthenticationOptions()

        # Authenticate with the code
        result = sc.authenticate_with_code(code, redirect_uri, options)

        # Debug the result structure
        print(f"Authentication result keys: {result.keys() if isinstance(result, dict) else 'Not a dict'}")

        # Initialize user_info with default values
        user_info = {
            "email": "",
            "name": "",
            "id": "",
            "provider": "unknown"
        }

        # The result seems to be a dictionary instead of an object with attributes
        if isinstance(result, dict):
            # Extract user info from the id_token if possible
            if 'id_token' in result:
                import jwt
                # Try to decode the JWT token
                try:
                    # Note: This is just for development, in production you should verify the token
                    user_claims = jwt.decode(result['id_token'], options={"verify_signature": False})
                    print(f"Decoded id_token: {user_claims}")

                    # Extract user information from claims
                    user_info = {
                        "email": user_claims.get("email", ""),
                        "name": f"{user_claims.get('given_name', '')} {user_claims.get('family_name', '')}".strip(),
                        "id": user_claims.get("sub", ""),
                        "employee_number": user_claims.get("employee_number", ""),
                        "provider": user_claims.get("iss", "").split('/')[-1] if user_claims.get("iss") else "unknown"
                    }
                except Exception as jwt_error:
                    print(f"Error decoding JWT: {jwt_error}")

            # If we have a user key in the result, use it as a backup
            if 'user' in result:
                user_data = result['user']
                if isinstance(user_data, dict):
                    if not user_info["email"] and user_data.get("email"):
                        user_info["email"] = user_data["email"]

                    if not user_info["name"]:
                        name_parts = []
                        if user_data.get("given_name"):
                            name_parts.append(user_data["given_name"])
                        if user_data.get("family_name"):
                            name_parts.append(user_data["family_name"])
                        user_info["name"] = " ".join(name_parts)

                    if not user_info["id"] and user_data.get("id"):
                        user_info["id"] = user_data["id"]
        else:
            # If result is not a dictionary, try to extract user information as an object
            if hasattr(result, 'user'):
                user = result.user
                user_info = {
                    "email": getattr(user, "email", ""),
                    "name": f"{getattr(user, 'givenName', '')} {getattr(user, 'familyName', '')}".strip(),
                    "id": getattr(user, "id", ""),
                    "provider": getattr(user, "provider", "unknown")
                }

        print(f"User info: {json.dumps(user_info)}")

        # Cache the result to prevent duplicate authentication attempts
        if not hasattr(app, "auth_cache"):
            app.auth_cache = {}
        app.auth_cache[code] = user_info

        return JSONResponse(content=user_info)
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        import traceback
        traceback.print_exc()

        # If it's just a reused code error, return a more friendly message
        if "'id_token'" in str(e):
            return JSONResponse(
                status_code=400,
                content={"error": "Authorization code already used. Please login again."}
            )

        return JSONResponse(
            status_code=500,
            content={"error": f"Authentication failed: {str(e)}"}
        )

@app.get("/")
async def root():
    return {"message": "ScaleKit SSO API is running"}
