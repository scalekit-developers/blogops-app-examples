import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { scalekit } from '../scalekitClient.js';
import { createSession, getSessionEmail } from '../session.js';

const router = Router();
const authRequests = new Map<string, { email: string; expiresAt: number; passwordlessType: string }>();

const sendLimiter = rateLimit({ windowMs: 60_000, limit: 2, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => req.body?.email || req.ip });

router.post('/send', sendLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email(), template: z.enum(['SIGNIN','SIGNUP']).optional(), state: z.string().min(4).max(128).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { email, template='SIGNIN', state } = parsed.data;
  try {
    const magiclinkAuthUri = `${process.env.APP_BASE_URL}${process.env.MAGIC_LINK_VERIFY_PATH}`;
    const raw = await scalekit.passwordless.sendPasswordlessEmail(email, { template, state, expiresIn:300, magiclinkAuthUri, templateVariables: { appName: 'DemoApp' } });
    // Normalize in case library returns BigInt fields
    const sendResponse = JSON.parse(JSON.stringify(raw, (_k, v) => typeof v === 'bigint' ? Number(v) : v));
    authRequests.set(sendResponse.authRequestId, { email, expiresAt: sendResponse.expiresAt, passwordlessType: sendResponse.passwordlessType });
    res.json({ ...sendResponse, maskedEmail: email.replace(/(^.).+(@.+)/, '$1***$2') });
  } catch (e: any) {
    console.error('Passwordless /send failed', {
      message: e?.message,
      status: e?.response?.status,
      data: e?.response?.data
    });
    res.status(e?.response?.status || 500).json({ error: 'SEND_FAILED', message: 'Unable to send passwordless email' });
  }
});

router.post('/resend', async (req, res) => {
  const schema = z.object({ authRequestId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  try {
    const { authRequestId } = parsed.data;
    const resendResponse = await scalekit.passwordless.resendPasswordlessEmail(authRequestId);
    const existing = authRequests.get(authRequestId);
    if (existing) authRequests.set(authRequestId, { ...existing, expiresAt: resendResponse.expiresAt, passwordlessType: resendResponse.passwordlessType });
    res.json(resendResponse);
  } catch (e: any) { res.status(e?.response?.status || 500).json({ error: 'RESEND_FAILED', message: e.message }); }
});

router.post('/verify-code', async (req, res) => {
  const schema = z.object({ authRequestId: z.string(), code: z.string().length(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { authRequestId, code } = parsed.data;
  try {
    const raw = await scalekit.passwordless.verifyPasswordlessEmail({ code }, authRequestId);
    const verify = JSON.parse(JSON.stringify(raw, (_k,v)=> typeof v === 'bigint' ? Number(v) : v));
    createSession(res, verify.email);
    res.json({ email: verify.email, passwordlessType: verify.passwordlessType });
  } catch (e: any) {
    console.error('Passwordless /verify-code failed', { message: e?.message, status: e?.response?.status, data: e?.response?.data });
    res.status(e?.response?.status || 500).json({ error: 'VERIFY_FAILED', message: 'Unable to verify code' });
  }
});

// Cache verified magic links briefly to avoid duplicate upstream calls / race causing 'expired'
const verifiedLinkCache = new Map<string, { email: string; passwordlessType: string; ts: number }>();
const VERIFIED_LINK_TTL_MS = 5 * 60 * 1000; // 5 minutes
function pruneVerifiedLinkCache() {
  const now = Date.now();
  for (const [k,v] of verifiedLinkCache) if (now - v.ts > VERIFIED_LINK_TTL_MS) verifiedLinkCache.delete(k);
}

router.post('/verify-link', async (req, res) => {
  const schema = z.object({ linkToken: z.string(), authRequestId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { linkToken, authRequestId } = parsed.data;
  pruneVerifiedLinkCache();
  const cached = verifiedLinkCache.get(linkToken);
  if (cached) {
    console.log('[verify-link] cache-hit', { linkToken: linkToken.slice(0,8)+'…', email: cached.email });
    // Already verified earlier; ensure session alive (if missing, recreate with cached email)
    const hasSession = !!req.cookies?.[process.env.SESSION_COOKIE_NAME || 'app_session'];
    if (!hasSession) createSession(res, cached.email);
    return res.status(200).json({ email: cached.email, passwordlessType: cached.passwordlessType });
  }
  // Local pre-expiry guard if we still have the authRequest metadata
  if (authRequestId) {
    const reqMeta = authRequests.get(authRequestId);
    if (reqMeta && reqMeta.expiresAt * 1000 < Date.now()) {
      console.warn('[verify-link] pre-expiry-block', { authRequestId, expiresAt: reqMeta.expiresAt, now: Math.floor(Date.now()/1000) });
      return res.status(410).json({ error: 'AUTH_REQUEST_EXPIRED', message: 'The sign-in link has expired. Please start again.' });
    }
  }
  try {
    const start = Date.now();
    const raw = await scalekit.passwordless.verifyPasswordlessEmail({ linkToken }, authRequestId);
    const verify = JSON.parse(JSON.stringify(raw, (_k,v)=> typeof v === 'bigint' ? Number(v) : v));
    createSession(res, verify.email);
    verifiedLinkCache.set(linkToken, { email: verify.email, passwordlessType: verify.passwordlessType, ts: Date.now() });
    console.log('[verify-link] success', { linkToken: linkToken.slice(0,8)+'…', email: verify.email, ms: Date.now()-start });
    res.json({ email: verify.email, passwordlessType: verify.passwordlessType });
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase();
    if (msg.includes('auth_request_id is required')) {
      return res.status(400).json({ error: 'AUTH_REQUEST_ID_REQUIRED', message: 'auth_request_id required (origin enforcement enabled). Retry sign-in.' });
    }
    if (msg.includes('expired')) {
      console.warn('[verify-link] upstream-expired', { linkToken: linkToken.slice(0,8)+'…', authRequestId });
      // Always treat as expired (no silent success). Client must initiate a new sign-in.
      return res.status(410).json({ error: 'AUTH_REQUEST_EXPIRED', message: 'The sign-in link has expired. Please request a new one.' });
    }
    console.error('Passwordless /verify-link failed', { message: e?.message, status: e?.response?.status, data: e?.response?.data });
    res.status(e?.response?.status || 500).json({ error: 'VERIFY_FAILED', message: 'Unable to verify link' });
  }
});

router.get('/session', (req, res) => {
  const email = getSessionEmail(req);
  return res.json({ authenticated: !!email, email: email || undefined });
});
router.post('/logout', (req, res) => { res.clearCookie(process.env.SESSION_COOKIE_NAME || 'app_session'); res.json({ ok: true }); });

export default router;
