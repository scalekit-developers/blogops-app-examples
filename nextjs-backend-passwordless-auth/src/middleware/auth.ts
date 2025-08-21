
import { NextResponse } from 'next/server';

// Minimal JWT decode (no signature verification) for Edge middleware to avoid heavy libs.
// Full verification still happens in API routes using jsonwebtoken.
function decodeJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload + '='.repeat((4 - (payload.length % 4)) % 4), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

// Basic JWT auth middleware. In production, move secret to env and add audience/issuer.
export function authMiddleware(req: any) {
  const url = req.nextUrl;
  const res = NextResponse.next();
  const authHeader = req.headers.get('authorization');
  const cookie = req.cookies.get('sk_session')?.value;
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7).trim();
  else if (cookie) token = cookie;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized', correlationId: 'n/a' }, { status: 401 });
  const payload: any = decodeJwt(token);
  if (!payload || (payload.exp && Date.now()/1000 > payload.exp)) {
    return NextResponse.json({ success: false, error: 'Invalid session', correlationId: 'n/a' }, { status: 401 });
  }
  res.headers.set('x-auth-user', payload.sub || 'unknown');
  return res;
}
