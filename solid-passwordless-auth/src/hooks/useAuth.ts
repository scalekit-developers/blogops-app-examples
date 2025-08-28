import { createSignal } from 'solid-js';

const [user, setUser] = createSignal<{ email: string } | null>(null);
const [initialized, setInitialized] = createSignal(false);

export function initAuth() {
  if (initialized()) return;
  fetch('/api/auth/me').then(async r => {
    if (r.ok) { const data = await r.json(); setUser(data.user); }
  }).finally(() => setInitialized(true));
}

export function useAuth() {
  return { user, initialized, setUser } as const;
}
