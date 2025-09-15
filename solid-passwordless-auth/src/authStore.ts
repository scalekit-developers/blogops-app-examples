import { createSignal } from 'solid-js';

// Simple reactive auth store (Solid analogue to a Pinia store)
const [user, setUser] = createSignal<{ email: string } | null>(null);

export function useAuth() {
  async function refresh() {
    try {
      const r = await fetch('/api/auth/me');
      if (r.ok) setUser(await r.json()); else setUser(null);
    } catch {
      setUser(null);
    }
  }
  return { user, setUser, refresh };
}
