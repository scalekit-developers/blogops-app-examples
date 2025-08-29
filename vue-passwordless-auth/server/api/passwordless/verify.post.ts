import { getScalekit } from '../../plugins/scalekit';
import { logError, logInfo } from '../../utils/logger';
import { setUserSession } from '../../utils/session';

interface Body { authRequestId?: string; code?: string; linkToken?: string; }

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event);
  if (!body.code && !body.linkToken) {
    logError(event, 'passwordless.verify missing code/linkToken');
    throw createError({ statusCode: 400, statusMessage: 'code or linkToken required' });
  }
  const meta: any = { hasCode: !!body.code, hasLinkToken: !!body.linkToken, authRequestId: body.authRequestId };
  const sk = getScalekit();
  try {
    logInfo(event, 'passwordless.verify start', meta);
    if (body.linkToken && !body.authRequestId) {
      // Enforce passing authRequestId for link token to satisfy deployments that pair them
      logError(event, 'passwordless.verify link missing authRequestId');
      throw createError({ statusCode: 400, statusMessage: 'auth_request_id is required for link token verification' });
    }
    const verifyResp = await sk.passwordless.verifyPasswordlessEmail(
      body.code ? { code: body.code } : { linkToken: body.linkToken! },
      body.authRequestId
    );
    if (!verifyResp?.email) throw createError({ statusCode: 400, statusMessage: 'No email in verification response' });
    // Ensure no BigInt fields leak
    const safe = JSON.parse(JSON.stringify(verifyResp, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
  // Persist minimal passwordless metadata so dashboard can show Mode/Auth Request after reload.
  // (authRequestId is not a secret; it identifies the flow instance)
    let passwordlessType: any = (verifyResp as any).passwordless_type || (verifyResp as any).passwordlessType || null;
    if (typeof passwordlessType === 'number') {
      const map: Record<number, string> = { 1: 'OTP', 2: 'LINK', 3: 'LINK_OTP' };
      passwordlessType = map[passwordlessType] || passwordlessType;
    }
  const authRequestId = (verifyResp as any).auth_request_id || (verifyResp as any).authRequestId || null;
  await setUserSession(event, verifyResp.email, { passwordlessType, authRequestId });
    logInfo(event, 'passwordless.verify success', { email: verifyResp.email });
    return { ok: true, email: safe.email };
  } catch (e: any) {
    if (e?.status === 429) {
      logError(event, 'passwordless.verify rate limit', { ...meta });
      throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please wait a few minutes then start over.' });
    }
    const rawMsg = (e?.data?.statusMessage || e?.message || '').toString().toLowerCase();
    let friendly = 'Verification failed. Please try again.';
    if (rawMsg.includes('expired')) friendly = 'Code expired. Click Start Over to request a new one.';
    else if (rawMsg.includes('invalid') || rawMsg.includes('mismatch')) friendly = 'Incorrect code. Double‑check and try again.';
    else if (rawMsg.includes('too many') || rawMsg.includes('rate')) friendly = 'Too many attempts. Wait a bit then restart the flow.';
    else if (rawMsg.includes('not found')) friendly = 'This sign‑in request was not found or already used. Start over.';
    else if (rawMsg.includes('auth_request_id')) friendly = 'Missing or mismatched sign‑in request. Use the original browser or start over.';
    logError(event, 'passwordless.verify error', { ...meta, err: e?.message, friendly });
    throw createError({ statusCode: 400, statusMessage: friendly });
  }
});
