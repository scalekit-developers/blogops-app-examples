/**
 * @openapi
 * /api/verify-magic-link:
 *   post:
 *     summary: Verify a magic link and create a session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Magic link verified, session created
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Error verifying magic link
 */
import { NextRequest } from 'next/server';
import { createCorrelationId, fail, ok } from '../../../lib/apiResponse';
import { getScalekit } from '../../../lib/backend';
import logger from '../../../lib/logger';
import { markEmailVerified } from '../../../lib/verificationStore';

interface VerifyBody {
  code?: string;          // OTP verification code
  link_token?: string;    // magic link token (snake_case to match docs)
  linkToken?: string;     // camelCase variant (client flexibility)
  auth_request_id?: string; // according to docs (snake_case)
  authRequestId?: string;   // camelCase variant
}

async function handleVerify(req: NextRequest, source: 'POST' | 'GET') {
  const correlationId = createCorrelationId();
  const sdk = getScalekit();
  const logMeta = { route: 'verify-magic-link', correlationId, source };
  let body: VerifyBody = {};
  if (source === 'POST') {
    try {
      body = await req.json();
    } catch {
      // ignore parse errors; we'll rely on query params
    }
  }
  const search = req.nextUrl.searchParams;
  const code = body.code || search.get('code') || undefined;
  // Accept multiple aliases for link token
  const linkToken = body.linkToken
    || body.link_token
    || body.token
    || search.get('link_token')
    || search.get('linkToken')
    || search.get('token')
    || undefined;
  let authRequestId = body.authRequestId || body.auth_request_id || search.get('auth_request_id') || search.get('authRequestId') || undefined;
  // If magic link requires auth_request_id and it's missing, attempt cookie fallback
  if (!authRequestId && linkToken) {
    const cookieVal = req.cookies.get('sk_auth_request_id')?.value;
    if (cookieVal) authRequestId = cookieVal;
  }

  if (!code && !linkToken) {
    logger.warn('Verification validation failed - no code or link token provided', { ...logMeta, bodyKeys: Object.keys(body || {}), query: Object.fromEntries(search.entries()) });
    return fail('Provide either code or link_token', correlationId, 400, 'VALIDATION');
  }

  try {
  logger.info('Verifying passwordless request', { ...logMeta, mode: linkToken ? 'magic_link' : 'otp', hasAuthRequestId: !!authRequestId, provided: { hasCode: !!code, hasLinkToken: !!linkToken } });
    const verifyResponse = await sdk.passwordless.verifyPasswordlessEmail(
      linkToken ? { linkToken } : { code },
      authRequestId
    );
    if (verifyResponse?.email) markEmailVerified(verifyResponse.email);
    logger.info('Passwordless verification success', { ...logMeta, email: verifyResponse?.email });
    const docStyle = {
      email: (verifyResponse as any).email,
      state: (verifyResponse as any).state,
      template: (verifyResponse as any).template,
      passwordless_type: (verifyResponse as any).passwordlessType ?? (verifyResponse as any).passwordless_type
    };
    return ok(docStyle, correlationId);
  } catch (error: any) {
    const msg = error?.response?.data?.error || error.message;
    const status = error?.response?.status === 429 ? 429 : 400;
    const codeStr = status === 429 ? 'RATE_LIMIT' : 'VERIFY_FAILED';
    logger.error('Passwordless verification failed %s', msg, { ...logMeta, stack: error.stack, status });
    return fail(msg, correlationId, status, codeStr);
  }
}

export async function POST(req: NextRequest) {
  return handleVerify(req, 'POST');
}

export async function GET(req: NextRequest) {
  return handleVerify(req, 'GET');
}
