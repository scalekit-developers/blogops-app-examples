/**
 * @openapi
 * /api/logout:
 *   post:
 *     summary: Logout a user by email
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
 *         description: User logged out
 */
// Mock DB integration
import { NextRequest } from 'next/server';
import { createCorrelationId, fail, ok } from '../../../lib/apiResponse';
import logger from '../../../lib/logger';
import { clearEmailVerified } from '../../../lib/verificationStore';

// Since we use stateless JWT, 'logout' just signals client to discard token. We also remove from verified set.

export async function POST(req: NextRequest) {
  const correlationId = createCorrelationId();
  const { email } = await req.json();
  if (!email) return fail('Missing email', correlationId, 400, 'VALIDATION');
  clearEmailVerified(email);
  logger.info('Logout clearing verification state', { route: 'logout', correlationId, email });
  const res = ok({ message: `Logged out ${email}` }, correlationId);
  res.cookies.set('sk_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('sk_auth_request_id', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
