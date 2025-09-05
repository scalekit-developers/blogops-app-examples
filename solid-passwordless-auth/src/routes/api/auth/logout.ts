import { APIEvent } from 'solid-start';
import { destroySession, getSession } from '../../../session';

export async function POST(event: APIEvent) {
  const started = Date.now();
  console.log('[LOGOUT] attempt');
  try {
    const session = await getSession(event.request);
  const sessionCookie = await destroySession(session);
  const flashValue = encodeURIComponent('Logged out');
  const flashCookie = `flash=${flashValue}; Path=/; Max-Age=10; SameSite=Lax`;
  console.log('[LOGOUT] success latencyMs=%d', Date.now()-started);
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie);
  headers.append('Set-Cookie', flashCookie);
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
  } catch (e: any) {
    console.error('[LOGOUT] error latencyMs=%d err=%o', Date.now()-started, e);
    return new Response(e?.message || 'logout failed', { status: 500 });
  }
}
