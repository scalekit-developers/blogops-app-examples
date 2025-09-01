import { deleteCookie, getCookie, H3Event, setCookie } from 'h3';
import jwt from 'jsonwebtoken';

// Include optional passwordless flow metadata so UI can display Mode/Auth Request after reload
// Only non-sensitive, non-PII values should be added here. Avoid putting secrets/tokens.
interface SessionPayload { email: string; createdAt: number; passwordlessType?: string | null; authRequestId?: string | null; }

const COOKIE_NAME = 'pw_sess';

export function setUserSession(event: H3Event, email: string, meta?: { passwordlessType?: string | null; authRequestId?: string | null }) {
  const cfg = useRuntimeConfig();
  const payload: SessionPayload = { email, createdAt: Date.now(), passwordlessType: meta?.passwordlessType || null, authRequestId: meta?.authRequestId || null };
  const token = jwt.sign(payload, cfg.jwtSecret, { expiresIn: '1d' });
  setCookie(event, COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60*60*24 });
}

export function getUserSession(event: H3Event): SessionPayload | null {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;
  try {
    const cfg = useRuntimeConfig();
    const decoded = jwt.verify(token, cfg.jwtSecret) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' });
}
