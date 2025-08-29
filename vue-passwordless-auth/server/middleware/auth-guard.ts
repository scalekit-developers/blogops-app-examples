import { defineEventHandler } from 'h3';
import { getUserSession } from '../utils/session';

// Server-side protection for /api/protected routes or pages like /dashboard SSR
export default defineEventHandler((event) => {
  const path = event.path || '';
  if (path.startsWith('/dashboard')) {
    const sess = getUserSession(event);
    if (!sess) {
      // For page requests, redirect (Nitro auto handles HTML). For data fetch, return 401.
      if (event.node.req.headers.accept?.includes('text/html')) {
        return sendRedirect(event, '/login');
      }
      throw createError({ statusCode: 401, statusMessage: 'unauthorized' });
    }
  }
});
