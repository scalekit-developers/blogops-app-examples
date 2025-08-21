/**
 * @openapi
 * /api/send-magic-link:
 *   post:
 *     summary: Send a magic link to the user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Magic link sent successfully
 *       500:
 *         description: Error sending magic link
 */
import { NextRequest } from 'next/server';
import { createCorrelationId, fail, ok } from '../../../lib/apiResponse';
import { getScalekit } from '../../../lib/backend';
import logger, { createChild, redact } from '../../../lib/logger';

export async function POST(req: NextRequest) {
  const raw = await req.json();
  const email = raw.email;
  const state = raw.state;
  const template = raw.template || 'SIGNIN';
  const expiresIn = raw.expiresIn ?? raw.expires_in; // accept snake_case
  const templateVariables = raw.templateVariables || raw.template_variables;
  const magiclinkAuthUri = raw.magiclinkAuthUri || raw.magiclink_auth_uri || process.env.PASSWORDLESS_MAGICLINK_VERIFY_URL || 'http://localhost:3000/passwordless/verify';
  const correlationId = createCorrelationId();
  const child = createChild({ route: 'send-magic-link', email, correlationId });
  try {
    // Send magic link using Scalekit
    const sdk = getScalekit();
    // Using passwordless email send API (magic link or link+otp depending on dashboard config)
  if (!email) return fail('Email is required', correlationId, 400, 'VALIDATION');
    child.info('Sending passwordless email');
    const sendResponse = await sdk.passwordless.sendPasswordlessEmail(email, {
      template,
      state,
      expiresIn,
      magiclinkAuthUri,
      templateVariables
    });
  child.info('Passwordless email sent', redact(sendResponse));
  // Normalize response keys to snake_case to stay identical to docs when proxying via our API
  const docStyle = {
    auth_request_id: (sendResponse as any).authRequestId ?? (sendResponse as any).auth_request_id,
    expires_at: (sendResponse as any).expiresAt ?? (sendResponse as any).expires_at,
    expires_in: (sendResponse as any).expiresIn ?? (sendResponse as any).expires_in,
    passwordless_type: (sendResponse as any).passwordlessType ?? (sendResponse as any).passwordless_type,
  } as any;
  // Attach auth_request_id in an httpOnly, short-lived cookie to help magic link verification without exposing in URL if not present
  const res = ok(docStyle, correlationId);
  const cookieExpires = new Date(Date.now() + (Number(docStyle.expires_in) || 600) * 1000);
  res.cookies.set('sk_auth_request_id', String(docStyle.auth_request_id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: cookieExpires,
  });
  return res;
  } catch (error: any) {
    logger.error('send-magic-link failed: %s', error.message, { stack: error.stack });
  return fail(error.message, correlationId, 500, 'SEND_FAILED');
  }
}
