import { APIEvent, json } from 'solid-start';
import { allow, getClientIp } from '../../../rateLimit';
import { getScalekit } from '../../../scalekit';

export async function POST(event: APIEvent) {
  const started = Date.now();
  let parsed: any = {};
  try { parsed = await event.request.json(); } catch {}
  const authRequestId = parsed.authRequestId;
  if (!authRequestId) {
    console.error('[RESEND] missing authRequestId body=%s', JSON.stringify(parsed));
    return json({ success: false, error: 'authRequestId required' }, { status: 400 });
  }
  const ip = getClientIp(event.request);
  const allowed = allow(ip, 'resend', 2, 60_000);
  if (!allowed) {
    console.warn('[RESEND] rate-limit ip=%s authRequestId=%s', ip, authRequestId);
    return json({ success: false, error: 'Too many resends, please wait.' }, { status: 429 });
  }
  console.log('[RESEND] attempt ip=%s authRequestId=%s', ip, authRequestId);
  try {
    const scalekit = getScalekit();
    const resp = await scalekit.passwordless.resendPasswordlessEmail(authRequestId);
    console.log('[RESEND] success authRequestId=%s latencyMs=%d', authRequestId, Date.now()-started);
  return json({ success: true, data: resp });
  } catch (e: any) {
    console.error('[RESEND] error authRequestId=%s latencyMs=%d err=%o', authRequestId, Date.now()-started, e);
    const friendly = mapFriendlyResendError(e);
  return json({ success: false, error: friendly }, { status: 400 });
  }
}

function mapFriendlyResendError(e: any): string {
  const raw = (e?.message || '').toLowerCase();
  if (raw.includes('expired')) return 'Original request expired. Start a new sign-in.';
  if (raw.includes('rate') || raw.includes('too many')) return 'Too many resends. Wait a minute and try again.';
  if (raw.includes('not found')) return 'Cannot resend. Start a new sign-in.';
  return 'Resend failed. Please start over.';
}
