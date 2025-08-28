import { APIEvent, json } from 'solid-start';
import { getSession } from '../../../session';

export async function GET(event: APIEvent) {
  const started = Date.now();
  try {
    const session = await getSession(event.request);
    const user = session.get('user');
    if (!user) {
      console.warn('[ME] unauth latencyMs=%d', Date.now()-started);
      return json({ success: false, error: 'unauthenticated' }, { status: 401 });
    }
    console.log('[ME] success email=%s latencyMs=%d', user.email, Date.now()-started);
  return json({ success: true, data: { user } });
  } catch (e: any) {
    console.error('[ME] error latencyMs=%d err=%o', Date.now()-started, e);
  return json({ success: false, error: e?.message || 'me failed' }, { status: 500 });
  }
}
