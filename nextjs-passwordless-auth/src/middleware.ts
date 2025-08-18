import { getSessionEmail } from "@/lib/session-store";
import { NextRequest, NextResponse } from "next/server";

// Define public routes that do not require authentication
const PUBLIC_PATHS = [
  "/", // login page
  "/api/auth/send-passwordless",
  "/api/auth/verify-otp",
  "/api/auth/verify-magic-link",
  "/verify-magic-link",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow public routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  // Check for session cookie
  const session = req.cookies.get("session")?.value;
  if (!session) {
    // Redirect unauthenticated users to login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  // Validate JWT session
  const email = getSessionEmail(session);
  if (!email) {
    // Invalid or expired session, redirect to login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  // Authenticated, allow access
  return NextResponse.next();
}
