import { APIEvent } from 'solid-start';
import { getScalekit } from '../../../scalekit';
import { commitSession, getSession } from '../../../session';

export async function POST(event: APIEvent) {
  const started = Date.now();
  let body: any = {};
  try { body = await event.request.json(); } catch {}
  const { code, linkToken, authRequestId } = body;
  if (!code && !linkToken) {
    console.error('[VERIFY] missing code/linkToken body=%s', JSON.stringify(body));
    return new Response(JSON.stringify({ success: false, error: 'code or linkToken required' }), { status: 400 });
  }
  console.log('[VERIFY] attempt authRequestId=%s mode=%s', authRequestId, code ? 'code' : 'link');
  try {
    const scalekit = getScalekit();
    const verifyResp = await scalekit.passwordless.verifyPasswordlessEmail(
      code ? { code } : { linkToken },
      authRequestId
    );
  const session = await getSession(event.request);
  const user = { email: verifyResp.email, createdAt: Date.now() };
  session.set('user', user);
  const cookie = await commitSession(session);
    console.log('[VERIFY] success email=%s authRequestId=%s latencyMs=%d', verifyResp.email, authRequestId, Date.now()-started);
  return new Response(JSON.stringify({ success: true, data: { user } }), { headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[VERIFY] error authRequestId=%s latencyMs=%d err=%o', authRequestId, Date.now()-started, e);
    const friendly = mapFriendlyVerifyError(e);
  return new Response(JSON.stringify({ success: false, error: friendly }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}

function mapFriendlyVerifyError(e: any): string {
  const raw = (e?.message || '').toLowerCase();
  if (raw.includes('auth request expired')) return 'Your verification request expired. Please start again.';
  if (raw.includes('verification failed')) return 'Invalid or expired code / link. Request a new one.';
  if (raw.includes('too many') || raw.includes('rate')) return 'Too many attempts. Please wait and retry.';
  if (raw.includes('not found')) return 'Verification session not found. Start a new sign-in.';
  return 'Verification failed. Please try again.';
}
