import { ParentComponent, createContext, createSignal, onMount, useContext } from 'solid-js';

interface AuthState {
  user: () => { email: string; createdAt?: number } | null;
  setUserUnsafe: (u: { email: string; createdAt?: number } | null) => void;
  loading: () => boolean;
  error: () => string | null;
  initialized: () => boolean;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthed: () => boolean;
  pendingEmail: () => string | null;
  setPendingEmail: (v: string | null) => void;
  authRequestId: () => string | null;
  setAuthRequestId: (v: string | null) => void;
}

const AuthCtx = createContext<AuthState>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<{ email: string; createdAt?: number } | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [initialized, setInitialized] = createSignal(false);
  const [pendingEmail, setPendingEmail] = createSignal<string | null>(null);
  const [authRequestId, setAuthRequestId] = createSignal<string | null>(null);

  let lastFetch = 0;
  let lastSuccess = 0;
  const CACHE_TTL = 10_000; // 10s
  async function fetchMe(force = false) {
    const now = Date.now();
    if (loading()) return; // prevent overlap
    // caching rules
    if (!force) {
      if (initialized() && user() && now - lastSuccess < CACHE_TTL) return; // recent good data
      if (now - lastFetch < 500) return; // debounce overlapping triggers
    }
    lastFetch = now;
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/auth/me');
      if (r.status === 401) { setUser(null); return; }
      const payload = await r.json().catch(() => ({}));
      if (!r.ok || payload.success === false) {
        const errMsg = payload.error || (typeof payload === 'string' ? payload : 'failed');
        throw new Error(errMsg);
      }
  const userData = payload.data?.user || payload.user; // support legacy & new shapes
      setUser(userData || null);
  lastSuccess = Date.now();
      // Schedule background SWR refresh if data gets older than TTL but tab still active
      if (!force) {
        setTimeout(() => {
          // Only revalidate if still mounted and user present
          if (user() && Date.now() - lastSuccess >= CACHE_TTL) fetchMe(false);
        }, CACHE_TTL + 50);
      }
    } catch (e: any) {
      setError(e.message || 'failed');
    } finally {
      setLoading(false); setInitialized(true);
    }
  }

  async function refresh(opts?: { force?: boolean }) { await fetchMe(!!opts?.force); }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setUser(null);
  }

  onMount(() => {
    const pe = localStorage.getItem('pendingEmail');
    if (pe) setPendingEmail(pe);
    const ar = localStorage.getItem('authRequestId');
    if (ar) setAuthRequestId(ar);
    fetchMe();
  });

  // Sync helpers
  function syncPendingEmail(v: string | null) {
    setPendingEmail(v);
    if (v) localStorage.setItem('pendingEmail', v); else localStorage.removeItem('pendingEmail');
  }
  function syncAuthRequestId(v: string | null) {
    setAuthRequestId(v);
    if (v) localStorage.setItem('authRequestId', v); else localStorage.removeItem('authRequestId');
  }

  const value: AuthState = {
  user, setUserUnsafe: setUser, loading, error, initialized, refresh, logout, isAuthed: () => !!user(),
    pendingEmail, setPendingEmail: syncPendingEmail,
    authRequestId, setAuthRequestId: syncAuthRequestId
  };
  return <AuthCtx.Provider value={value}>{props.children}</AuthCtx.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
