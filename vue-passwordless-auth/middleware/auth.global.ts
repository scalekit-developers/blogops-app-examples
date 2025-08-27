// Protect /dashboard and any route with meta.requiresAuth
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return; // skip server-side (could enhance with SSR session check)
  const store = useAuthStore();
  if (!store.isAuthenticated && (to.path.startsWith('/dashboard') || to.meta.requiresAuth)) {
    return navigateTo('/login');
  }
});
