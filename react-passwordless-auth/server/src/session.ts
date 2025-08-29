import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'app_session';
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '3600', 10);
const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET || 'dev_secret';

export interface SessionPayload { email: string; iat?: number; exp?: number; }

export function createSession(res: Response, email: string) {
  const token = jwt.sign({ email } as SessionPayload, SESSION_JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_TTL_SECONDS * 1000,
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    path: '/',
  });
}

export function destroySession(res: Response) { res.clearCookie(SESSION_COOKIE_NAME, { path: '/' }); }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.[SESSION_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    const payload = jwt.verify(token, SESSION_JWT_SECRET) as SessionPayload;
    (req as any).session = payload;
    next();
  } catch { return res.status(401).json({ error: 'INVALID_SESSION' }); }
}

export function getSessionEmail(req: Request): string | null {
  try {
    const token = (req as any).cookies?.[SESSION_COOKIE_NAME];
    if (!token) return null;
    const payload = jwt.verify(token, SESSION_JWT_SECRET) as SessionPayload;
    return payload.email || null;
  } catch { return null; }
}
