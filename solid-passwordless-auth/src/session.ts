import { createCookieSessionStorage } from 'solid-start/session';

const sessionSecret = process.env.SESSION_SECRET || 'dev_secret';

const storage = createCookieSessionStorage({
  cookie: {
    name: 'sid',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    maxAge: 60 * 60 * 24 * 7
  }
});

export async function getSession(request: Request) {
  return storage.getSession(request.headers.get('Cookie'));
}

export async function commitSession(session: any) {
  return storage.commitSession(session);
}

export async function destroySession(session: any) {
  return storage.destroySession(session);
}
