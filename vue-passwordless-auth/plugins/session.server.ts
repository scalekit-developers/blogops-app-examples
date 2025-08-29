import { getUserSession } from '~/server/utils/session';
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(() => {
  if (process.server) {
    try {
      const event = useRequestEvent();
      if (!event) return;
      const sess = getUserSession(event);
      if (sess) {
        const store = useAuthStore();
        store.setSession({ user: { email: sess.email }, passwordlessType: sess.passwordlessType, authRequestId: sess.authRequestId });
      }
    } catch {
      // ignore
    }
  }
});
