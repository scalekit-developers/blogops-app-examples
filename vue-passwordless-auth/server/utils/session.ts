import { deleteCookie, getCookie, H3Event, setCookie } from 'h3';
import jwt from 'jsonwebtoken';

interface SessionPayload { email: string; createdAt: number; }

const COOKIE_NAME = 'pw_sess';

export function setUserSession(event: H3Event, email: string) {
  const cfg = useRuntimeConfig();
  const payload: SessionPayload = { email, createdAt: Date.now() };
  const token = jwt.sign(payload, cfg.jwtSecret, { expiresIn: '1d' });
  setCookie(event, COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export function getUserSession(event: H3Event): SessionPayload | null {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;
  try {
    const cfg = useRuntimeConfig();
    return jwt.verify(token, cfg.jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' });
}
