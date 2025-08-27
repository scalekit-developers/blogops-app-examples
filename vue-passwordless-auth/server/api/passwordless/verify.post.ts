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
    await setUserSession(event, verifyResp.email);
    logInfo(event, 'passwordless.verify success', { email: verifyResp.email });
    return { ok: true, email: safe.email };
  } catch (e: any) {
    if (e?.status === 429) {
      logError(event, 'passwordless.verify rate limit', { ...meta });
      throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Restart flow.' });
    }
    logError(event, 'passwordless.verify error', { ...meta, err: e?.message });
    throw createError({ statusCode: 400, statusMessage: e?.message || 'verification failed' });
  }
});
