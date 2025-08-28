import { getScalekit } from '../../plugins/scalekit';
import { logError, logInfo } from '../../utils/logger';

interface Body { authRequestId: string; }

export default defineEventHandler( async (event) => {
  const body = await readBody<Body>(event);
  if (!body.authRequestId) {
    logError(event, 'passwordless.resend missing authRequestId');
    throw createError({ statusCode: 400, statusMessage: 'authRequestId required' });
  }
  try {
    const sk = getScalekit();
    logInfo(event, 'passwordless.resend start', { authRequestId: body.authRequestId });
  const resp = await sk.passwordless.resendPasswordlessEmail(body.authRequestId);
  const passwordlessType = (resp as any).passwordless_type || (resp as any).passwordlessType || useRuntimeConfig().public.passwordlessType;
  const shapedRaw = { ...resp, passwordless_type: passwordlessType } as any;
  const shaped = JSON.parse(JSON.stringify(shapedRaw, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
  logInfo(event, 'passwordless.resend success', { authRequestId: body.authRequestId, passwordless_type: passwordlessType });
  return shaped;
  } catch (e: any) {
    const rawMsg = (e?.data?.statusMessage || e?.message || '').toString().toLowerCase();
    let friendly = 'Could not resend email. Try again shortly.';
    if (rawMsg.includes('expired')) friendly = 'Request expired. Start over to get a fresh code.';
    else if (rawMsg.includes('too many') || rawMsg.includes('rate')) friendly = 'Too many resends. Please wait a bit.';
    else if (rawMsg.includes('not found')) friendly = 'This sign‑in request no longer exists. Start over.';
    logError(event, 'passwordless.resend error', { authRequestId: body.authRequestId, err: e?.message, friendly });
    throw createError({ statusCode: 500, statusMessage: friendly });
  }
});
