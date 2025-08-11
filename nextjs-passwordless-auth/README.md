
# Passwordless Authentication Sample App

A modern Next.js application demonstrating passwordless authentication using Scalekit, supporting both verification codes (OTP) and magic links.

## Features

- **Dual Authentication**: Choose between One-Time Password (OTP) and Magic Link authentication
- **Flexible Flow**: Users can enter a code or click a magic link for login
- **Simple UI**: Clean, responsive interface with a step-by-step flow
- **Secure Sessions**: HTTP-only cookies and robust session management
- **User-Friendly**: Clear error messages and input validation

## How it Works

1. **Email Entry**: User submits their email address
2. **Email Delivery**: A verification email is sent with a code and/or magic link
3. **Authentication Options**:
  - Enter the 6-digit verification code in the app, **or**
  - Click the magic link in the email
4. **Dashboard Access**: Upon successful authentication, users are redirected to a protected dashboard

## Authentication Types

Configure your Scalekit environment to support one of the following passwordless authentication types:

- **OTP**: Only verification codes (6-digit numbers)
- **LINK**: Only magic links (clickable URLs)
- **LINK_OTP**: Both verification codes and magic links

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **Authentication**: Scalekit SDK for passwordless flows

## Getting Started

### Prerequisites

- Node.js 18+
- A Scalekit account and environment

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Scalekit Configuration
SCALEKIT_ENVIRONMENT_URL=your_environment_url
SCALEKIT_CLIENT_ID=your_client_id
SCALEKIT_CLIENT_SECRET=your_client_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

1. Install dependencies:

  ```bash
  npm install
  # or
  pnpm install
  ```

2. Start the development server:

  ```bash
  npm run dev
  # or
  pnpm dev
  ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── send-passwordless/    # API route to send magic link/OTP
│   │   │   ├── verify-otp/           # API route to verify OTP
│   │   │   ├── logout/               # API route to log out
│   │   │   └── session/              # API route to get session info
│   │   ├── send-passwordless/        # (legacy/alias) API route
│   │   ├── verify-magic-link/        # API route to verify magic link
│   │   └── verify-otp/               # (legacy/alias) API route
│   ├── dashboard/                    # Protected dashboard page
│   │   └── page.tsx
│   ├── verify-magic-link/            # Magic link verification page
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Home/login page
├── lib/
│   └── session-store.ts              # JWT session helpers
├── middleware.ts                     # Auth middleware
```

## API Endpoints

- `POST /api/auth/send-passwordless` - Start passwordless authentication (send code/magic link)
- `POST /api/auth/verify-otp` - Verify OTP codes
- `GET /api/verify-magic-link` - Handle magic link verification
- `POST /api/auth/logout` - Log out user (clear session)
- `GET /api/auth/session` - Get current session info

## Scalekit Configuration

To enable different authentication types, configure your Scalekit dashboard:

1. Go to **Authentication > Auth Methods**
2. Find the **Passwordless** section
3. Select your preferred authentication type:
  - **OTP**: Only verification codes
  - **LINK**: Only magic links
  - **LINK_OTP**: Both codes and magic links

## Customization

This sample app is designed for learning and rapid prototyping. You can:

- Modify UI components in the `app/` directory
- Add new authentication flows
- Implement user management features
- Add more protected routes
- Customize error handling and validation
- Change passwordless types in the Scalekit dashboard

## Learn More

- [Scalekit Documentation](https://docs.scalekit.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

This project is open source and available under the [MIT License](LICENSE).
