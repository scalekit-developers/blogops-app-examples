import { AUTH_SECRET } from "@/lib/authSecret";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Define public routes that do not require authentication
const PUBLIC_PATHS = [
  "/", // login page
  "/api/auth/send-passwordless",
  // Allow all NextAuth routes (providers, callback, csrf, session, signout, etc.)
  "/api/auth",
  "/verify-magic-link",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow Next internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$/.test(pathname)
  ) {
    return NextResponse.next();
  }
  // Allow public routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  const token = await getToken({ req, secret: AUTH_SECRET });
  if (!token?.email) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// Exclude api, Next.js internals, and common static assets from middleware by default
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)).*)",
  ],
};
