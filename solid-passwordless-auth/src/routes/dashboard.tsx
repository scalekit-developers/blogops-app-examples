import { createSignal, For, onMount, Show } from 'solid-js';
import { APIEvent } from 'solid-start';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { getSession } from '../session';

// Lightweight server guard (respond only to explicit data fetch trigger path)
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith('/dashboard')) return new Response(null, { status: 404 });
  const session = await getSession(event.request);
  const user = session.get('user');
  if (!user) return new Response(null, { status: 302, headers: { Location: '/' } });
  // Normal framework SSR will render component; embed user via global for hydration adoption.
  (globalThis as any).__SSR_USER__ = user; // ephemeral (per-request) for this render
  return undefined as any; // allow normal rendering
}

export default function Dashboard() {
  const { user, refresh, logout, loading, initialized } = useAuth();
  const [status, setStatus] = createSignal('');
  const [meRaw, setMeRaw] = createSignal<string>('');
  const [testStatus, setTestStatus] = createSignal<string | null>(null);
  const [copyMsg, setCopyMsg] = createSignal<string | null>(null);
  onMount(async () => {
    if (!initialized()) {
      const anyWin: any = window as any;
      if (anyWin.__SSR_USER__) {
        (useAuth() as any).setUserUnsafe(anyWin.__SSR_USER__);
      }
      await refresh();
    }
  });

  // Only load raw /me dump when user explicitly tests; not on mount.

  async function loadMeRaw() {
    try { const r = await fetch('/api/auth/me'); const t = await r.text(); setMeRaw(t); } catch {}
  }

  function since(ts?: number) {
    if (!ts) return 'unknown';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs/24);
    return days + 'd ago';
  }

  async function testProtected() {
    setTestStatus('Testing...');
    try {
      const r = await fetch('/api/auth/me');
      const text = await r.text();
      setTestStatus(r.ok ? 'Success' : 'Error');
      setMeRaw(text);
    } catch { setTestStatus('Network error'); }
  }

  function copyEmail() {
    const u = user(); if (!u) return; navigator.clipboard.writeText(u.email).then(() => { setCopyMsg('Copied'); setTimeout(()=>setCopyMsg(null), 1200); });
  }

  const resourceLinks = [
    { label: 'Scalekit Website', href: 'https://scalekit.com/' },
    { label: 'Passwordless Quickstart', href: 'https://docs.scalekit.com/passwordless/quickstart/' },
    { label: 'Scalekit Docs', href: 'https://docs.scalekit.com/' }
  ];

  return (
    <div class="layout-center">
      <main style="width:100%;max-width:720px;" class="stack">
        <Show when={user()} fallback={<Card title="Loading"><p class="muted" style="margin:0;">{status()}</p></Card>}>
          <div class="stack">
            <Card subTitle="Signed in" title="Welcome">
              <p style="margin:0 0 1rem;">Authenticated as <strong>{user()!.email}</strong></p>
              <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
                <Button type="button" variant="secondary" onClick={copyEmail}>{copyMsg() ? copyMsg() : 'Copy Email'}</Button>
                <Button type="button" variant="secondary" onClick={() => { refresh({ force: true }); loadMeRaw(); }}>Refresh</Button>
                <Button type="button" variant="ghost" onClick={() => { logout().then(()=> location.href='/'); }}>Logout</Button>
              </div>
            </Card>
            <Card title="Session Details">
              <ul style="list-style:none;padding:0;margin:0;font-size:.75rem;display:flex;flex-direction:column;gap:.4rem;">
                <li><span class="muted">Created:</span> {since(user()!.createdAt)}</li>
                <li><span class="muted">Email:</span> {user()!.email}</li>
                <li><span class="muted">Cookie:</span> HttpOnly SID <span title="HttpOnly means JavaScript can't read this session identifier cookie, protecting it from XSS.">(secure – hidden from JS)</span></li>
              </ul>
            </Card>
            <Card title="Protected API Test">
              <div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.75rem;">
                <Button type="button" onClick={testProtected}>Call /api/auth/me</Button>
                <Show when={testStatus()}><span class="muted" style="font-size:.7rem;">{testStatus()}</span></Show>
              </div>
              <Show when={meRaw()}>
                <pre style="margin:0;max-height:140px;overflow:auto;font-size:.65rem;background:#10161f;padding:.6rem;border:1px solid var(--border);border-radius:6px;">{meRaw()}</pre>
              </Show>
            </Card>
            <Card title="Scalekit Resources">
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5rem;font-size:.75rem;">
                <For each={resourceLinks}>{l => <li><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a></li>}</For>
              </ul>
            </Card>
          </div>
        </Show>
        <p class="footer-note">Passwordless demo • <a href="/">Home</a></p>
      </main>
    </div>
  );
}
