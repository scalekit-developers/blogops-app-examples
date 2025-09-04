/**
 * @openapi
 * /api/protected/session-info:
 *   get:
 *     summary: Introspect current session
 *     description: Returns information about the authenticated session using the sk_session cookie or Bearer token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     user:
 *                       type: string
 *                     issuedAt:
 *                       type: integer
 *                     expiresAt:
 *                       type: integer
 *                     correlationId:
 *                       type: string
 *       401:
 *         description: Missing or invalid session token
 */
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { createCorrelationId, fail, ok } from '../../../../lib/apiResponse';
import logger from '../../../../lib/logger';

export async function GET(req: NextRequest) {
  const correlationId = createCorrelationId();
  try {
    const authHeader = req.headers.get('authorization');
    const cookie = req.cookies.get('sk_session')?.value;
    let token: string | undefined;
    if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7).trim();
    else if (cookie) token = cookie;

    if (!token) {
      logger.warn('Session introspection missing token', { route: 'session-info', correlationId, hasCookie: !!cookie, hasAuthHeader: !!authHeader });
      return fail('Missing token (Swagger UI does not send cookies; use Bearer token)', correlationId, 401, 'UNAUTHORIZED');
    }
    const secret = process.env.SESSION_JWT_SECRET || 'dev-insecure-secret';
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (err: any) {
      logger.error('Session introspection verify failed %s', err.message, { route: 'session-info', correlationId });
      return fail('Invalid session', correlationId, 401, 'UNAUTHORIZED');
    }
    logger.info('Session introspection success', { route: 'session-info', correlationId, user: payload.sub });
    return ok({ message: 'active', user: payload.sub, issuedAt: payload.iat, expiresAt: payload.exp }, correlationId);
  } catch (e: any) {
    logger.error('Session introspection unexpected error %s', e.message, { route: 'session-info', correlationId });
    return fail(e.message || 'Invalid token', correlationId, 500, 'INTROSPECT_ERROR');
  }
}
