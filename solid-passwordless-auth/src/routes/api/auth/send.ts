import { APIEvent, json } from 'solid-start';
import { allow, getClientIp } from '../../../rateLimit';
import { getScalekit } from '../../../scalekit';

export async function POST(event: APIEvent) {
  const started = Date.now();
  let parsed: any = {};
  try { parsed = await event.request.json(); } catch { /* ignore */ }
  const email = parsed.email;
  if (!email) {
    console.error('[SEND] missing email body=%s', JSON.stringify(parsed));
    return json({ success: false, error: 'email required' }, { status: 400 });
  }
  const ip = getClientIp(event.request);
  const allowed = allow(ip, 'send', 3, 60_000);
  if (!allowed) {
    console.warn('[SEND] rate-limit ip=%s email=%s', ip, email);
    return json({ success: false, error: 'Too many requests, slow down.' }, { status: 429 });
  }
  const scalekit = getScalekit();
  const options = {
    template: 'SIGNIN',
    expiresIn: 300,
    magiclinkAuthUri: (process.env.APP_BASE_URL || 'http://localhost:3000') + '/passwordless/verify'
  } as const;
  console.log('[SEND] attempt ip=%s email=%s opts=%o', ip, email, options);
  try {
    const resp = await scalekit.passwordless.sendPasswordlessEmail(email, options);
    console.log('[SEND] success email=%s authRequestId=%s type=%s latencyMs=%d', email, resp.authRequestId, resp.passwordlessType, Date.now()-started);
  return json({ success: true, data: resp });
  } catch (e: any) {
    console.error('[SEND] error email=%s latencyMs=%d err=%o', email, Date.now()-started, e);
    const friendly = mapFriendlyError(e, 'send');
  return json({ success: false, error: friendly }, { status: 400 });
  }
}

function mapFriendlyError(e: any, ctx: string): string {
  const raw = (e?.message || '').toLowerCase();
  if (raw.includes('rate') || raw.includes('too many')) return 'Too many requests. Please wait a moment and try again.';
  if (raw.includes('invalid_email')) return 'That email address is not valid.';
  if (raw.includes('blocked')) return 'Email temporarily blocked. Try again later.';
  return 'Failed to send email. Please retry.';
}
