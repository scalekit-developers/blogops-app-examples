import { NextResponse } from 'next/server';
import { authMiddleware } from './middleware/auth';
import { securityHeaders } from './middleware/security';

// Simple in-memory rate limiter (per IP + route key) - resets on redeploy.
// key = ip|path  (optionally include method)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests / minute / route / ip
const g: any = globalThis as any;
if (!g.__rateLimiterStore) g.__rateLimiterStore = new Map<string, { ts: number; count: number }>();
const store: Map<string, { ts: number; count: number }> = g.__rateLimiterStore;

function rateLimit(req: any) {
  const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}|${req.nextUrl.pathname}`;
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    store.set(key, { ts: now, count: 1 });
    return null;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const retry = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.ts)) / 1000);
    return NextResponse.json({ success: false, error: 'Rate limit exceeded', retry_after: retry }, { status: 429, headers: { 'Retry-After': String(retry) } });
  }
  return null;
}

export default function middleware(req: any) {
  // Security headers first
  const security = securityHeaders();
  // Apply rate limiting for API routes except static assets
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const limited = rateLimit(req);
    if (limited) return limited;
  }
  // Apply auth check for protected routes (example pattern)
  if (req.nextUrl.pathname.startsWith('/api/protected')) {
    return authMiddleware(req);
  }
  return security;
}

export const config = {
  matcher: ['/api/:path*'],
};
