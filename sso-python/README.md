# Enterprise SSO Python Example

This project demonstrates a Single Sign-On (SSO) implementation using ScaleKit Authentication, FastAPI for the backend API, and React for the frontend.

## Overview

This application showcases how to integrate ScaleKit's authentication services to enable:

- OAuth authentication (Google, etc.)
- SAML-based Enterprise SSO
- JWT token handling and user info extraction
- Simple session management

## Project Structure

```bash
sso-python/
├── backend/             # FastAPI backend server
│   ├── main.py          # Authentication endpoints and ScaleKit integration
│   └── .env             # Environment variables (not committed to repo)
├── frontend/            # React frontend application
│   ├── src/             # React components and application logic
│   ├── index.html       # HTML entry point
│   └── package.json     # Frontend dependencies
└── README.md            # This file
```

## Technology Stack

- **Backend**:
  - FastAPI (Python)
  - ScaleKit Authentication SDK
  - dotenv for environment configuration

- **Frontend**:
  - React 19
  - React Router
  - Axios for API requests
  - Vite for development and building

## ScaleKit Integration

This application leverages ScaleKit's authentication services for:

1. **Authorization URL Generation**: Creates customized login flows for different providers
2. **Authentication Code Handling**: Securely processes authentication codes
3. **User Information Extraction**: Parses JWT tokens to retrieve user details
4. **Enterprise SSO**: Supports SAML-based authentication for enterprise connections

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- ScaleKit account with configured connections
- uvicorn (`pip install uvicorn`)

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   uv pip install -r pyproject.toml
   ```

4. Create a `.env` file in the backend directory with the following variables:

   ```bash
   SCALEKIT_ENVIRONMENT_URL=your_environment_url
   SCALEKIT_CLIENT_ID=your_client_id
   SCALEKIT_CLIENT_SECRET=your_client_secret
   SCALEKIT_CONNECTION_ID=your_connection_id  # For SAML authentication
   SCALEKIT_ORGANIZATION_ID=your_org_id       # For SAML authentication
   REDIRECT_URI=http://localhost:5173/callback
   ```

5. Start the backend server:

   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to <http://localhost:3000>

## Authentication Flow

1. User clicks login button on the frontend
2. Frontend requests login URL from backend with provider preference
3. Backend generates an authorization URL using ScaleKit
4. User is redirected to the authentication provider
5. After successful authentication, the provider redirects back with an authorization code
6. Backend exchanges the code for tokens using ScaleKit's SDK
7. User information is extracted from the JWT token
8. User session is established

## Security Considerations

- JWT tokens are processed server-side to prevent token leakage
- Authorization codes are validated and used only once
- Environment variables are used for sensitive configuration
- CORS is configured to allow only specified origins

## Learn More

- [ScaleKit Documentation](https://docs.scalekit.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
