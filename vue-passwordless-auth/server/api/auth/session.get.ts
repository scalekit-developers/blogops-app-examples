import { getUserSession } from '../../utils/session';

export default defineEventHandler((event) => {
  const sess = getUserSession(event);
  return { authenticated: !!sess, user: sess ? { email: sess.email } : null, passwordlessType: sess?.passwordlessType || null, authRequestId: sess?.authRequestId || null };
});
