import { getScalekit } from '../../plugins/scalekit';
import { logError, logInfo } from '../../utils/logger';

interface Body { email: string; template?: 'SIGNIN' | 'SIGNUP'; }

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event);
  if (!body.email) {
    logError(event, 'passwordless.send missing email');
    throw createError({ statusCode: 400, statusMessage: 'Email required' });
  }
  const reqMeta = { email: body.email };
  const sk = getScalekit();
  try {
    const base = getRequestURL(event); // ensures host available
  // Use configured public passwordless verify path (nuxt.config public.passwordlessVerifyPath)
  const verifyPath = useRuntimeConfig().public.passwordlessVerifyPath;
    const magiclinkAuthUri = new URL(verifyPath, base).toString();
    logInfo(event, 'passwordless.send start', { ...reqMeta, magiclinkAuthUri });
  // SDK expects (email: string, options: { magiclinkAuthUri, ... })
  const resp = await sk.passwordless.sendPasswordlessEmail(body.email, { magiclinkAuthUri });
  // Attach configured type if SDK response omits it (some environments may not echo type)
  const passwordlessType = (resp as any).passwordless_type || (resp as any).passwordlessType || useRuntimeConfig().public.passwordlessType;
  const shapedRaw = { ...resp, passwordless_type: passwordlessType } as any;
  // Remove or stringify BigInt fields to avoid serialization error
  const shaped = JSON.parse(JSON.stringify(shapedRaw, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
  logInfo(event, 'passwordless.send success', { ...reqMeta, authRequestId: (shaped as any).auth_request_id || (shaped as any).authRequestId, passwordless_type: passwordlessType });
  return shaped; // raw enough for store mapping
  } catch (e: any) {
    logError(event, 'passwordless.send error', { ...reqMeta, err: e?.message });
    throw createError({ statusCode: 500, statusMessage: e?.message || 'send failed' });
  }
});
