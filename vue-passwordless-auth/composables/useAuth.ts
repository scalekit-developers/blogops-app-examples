import { useAuthStore } from '~/stores/auth';

export function useAuth() {
  const store = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const verifying = ref(false); // specifically for code/link verification actions
  const LS_KEY = 'pw_auth_req';
  // Safety: ensure not stuck in loading (e.g. HMR edge case)
  if (loading.value) loading.value = false;

  async function fetchSession() {
    try {
      const data = await $fetch('/api/auth/session');
      store.setSession(data);
    } catch (e: any) {
      // ignore
    }
  }

  async function send(email: string) {
    loading.value = true; error.value = null;
    const controller = new AbortController();
    const t = setTimeout(()=> controller.abort(), 15000);
    let navigateAfter = false;
    try {
      const resp = await $fetch('/api/passwordless/send', { method: 'POST', body: { email }, signal: controller.signal });
      store.setAuthRequest(resp);
  // persist minimal data
  try { localStorage.setItem(LS_KEY, JSON.stringify({ a: store.authRequestId, t: store.passwordlessType, e: store.expiresAt })); } catch {}
      // If mode includes OTP, navigate to dedicated page
      if (store.passwordlessType === 'OTP' || store.passwordlessType === 'LINK_OTP') {
        navigateAfter = true;
      }
      return resp;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        error.value = 'Request timed out. Try again.';
      } else {
        error.value = e?.data?.statusMessage || e?.message || 'Failed to send';
      }
    } finally {
      clearTimeout(t);
      loading.value = false;
      // Reset verifying each new flow start
      verifying.value = false;
      if (navigateAfter && process.client) navigateTo('/passwordless/code');
    }
  }

  async function resend() {
    if (!store.authRequestId) return;
    loading.value = true; error.value = null;
    try {
      const resp = await $fetch('/api/passwordless/resend', { method: 'POST', body: { authRequestId: store.authRequestId } });
      store.setAuthRequest(resp);
  try { localStorage.setItem(LS_KEY, JSON.stringify({ a: store.authRequestId, t: store.passwordlessType, e: store.expiresAt })); } catch {}
    } catch (e: any) {
      error.value = e?.data?.statusMessage || 'Failed to resend';
    } finally { loading.value = false; }
  }

  async function verifyCode(code: string) {
    if (!store.authRequestId) throw new Error('No auth request');
    if (verifying.value) return; // guard double clicks
    verifying.value = true; error.value = null;
    try {
      const resp = await $fetch('/api/passwordless/verify', { method: 'POST', body: { code, authRequestId: store.authRequestId } });
      await fetchSession();
  try { localStorage.removeItem(LS_KEY); } catch {}
      return resp;
    } catch (e: any) {
      error.value = e?.data?.statusMessage || 'Verification failed';
  } finally { verifying.value = false; }
  }

  async function verifyLink(linkToken: string, authRequestId?: string) {
    if (verifying.value) return;
    verifying.value = true; error.value = null;
    try {
  const id = authRequestId || store.authRequestId || (() => { try { const v = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return v?.a; } catch { return undefined; } })();
  const resp = await $fetch('/api/passwordless/verify', { method: 'POST', body: { linkToken, authRequestId: id } });
      await fetchSession();
  try { localStorage.removeItem(LS_KEY); } catch {}
      return resp;
    } catch (e: any) {
      error.value = e?.data?.statusMessage || 'Verification failed';
  } finally { verifying.value = false; }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    store.reset();
  }

  function resetFlow() {
    // Only clear the current auth request, keep session user if any
    store.authRequestId = null;
    store.passwordlessType = null;
    store.expiresAt = null;
    error.value = null;
    loading.value = false;
    try { localStorage.removeItem(LS_KEY); } catch {}
  }

  // Hydrate from localStorage if we have stale request (e.g. navigation or reload)
  if (process.client && !store.authRequestId) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v?.a) {
          store.authRequestId = v.a;
          store.passwordlessType = v.t;
          store.expiresAt = v.e;
        }
      }
    } catch {}
  }

  return { ...store, loading, error, verifying, send, resend, verifyCode, verifyLink, fetchSession, logout, resetFlow };
  // verifying kept separate from generic loading
}
