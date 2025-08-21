/**
 * @openapi
 * /api/session:
 *   get:
 *     summary: Get session for a user by email
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: User's email
 *     responses:
 *       200:
 *         description: Session data
 *       400:
 *         description: Missing email
 */
// Mock DB integration
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { createCorrelationId, fail, ok } from '../../../lib/apiResponse';
import logger from '../../../lib/logger';
import { isEmailVerified } from '../../../lib/verificationStore';

// Verification state now handled in shared verificationStore

export async function GET(req: NextRequest) {
  const correlationId = createCorrelationId();
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return fail('Missing email', correlationId, 400, 'VALIDATION');

  if (!isEmailVerified(email)) {
    return fail('Email not verified yet', correlationId, 403, 'NOT_VERIFIED');
  }

  const secret = process.env.SESSION_JWT_SECRET || 'dev-insecure-secret';
  const token = jwt.sign({ sub: email, type: 'session' }, secret, { expiresIn: '30m' });
  logger.info('Issued session token', { route: 'session', correlationId, email });
  const res = ok({ session: token, expiresIn: 1800 }, correlationId);
  res.cookies.set('sk_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1800,
  });
  return res;
}
