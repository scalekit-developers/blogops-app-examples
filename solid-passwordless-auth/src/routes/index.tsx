import { createEffect, createSignal, Show } from 'solid-js';
import { Title, useNavigate } from 'solid-start';
import { AuthFormBoundary } from '../components/AuthFormBoundary';
import { EmailRequestForm } from '../components/EmailRequestForm';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const nav = useNavigate();
  const [flash, setFlash] = createSignal<string | null>(null);

  const { user, initialized } = useAuth();

  // One-time flash extraction (no auth fetch here)
  if (typeof document !== 'undefined') {
    const cookie = document.cookie || '';
    const match = cookie.split(/;\s*/).find(c => c.startsWith('flash='));
    if (match) {
      const val = decodeURIComponent(match.split('=')[1] || '');
      setFlash(val);
      // clear cookie
      document.cookie = 'flash=; Path=/; Max-Age=0; SameSite=Lax';
    }
  }

  createEffect(() => {
    if (initialized() && user()) nav('/dashboard');
  });

  return (
    <div class="layout-center">
      <main class="stack" style="width:100%;max-width:480px;">
        <Title>Scalekit Passwordless</Title>
        <Show when={flash()}>{m => <Alert kind={m().includes('out') ? 'info' : 'success'}>{m()}</Alert>}</Show>
        <Card subTitle="Welcome" title="Sign in">
          <p class="muted" style="margin:0 0 1rem;font-size:.8rem;">Use passwordless email authentication. We'll send you an OTP and a magic link.</p>
          <AuthFormBoundary>
            <EmailRequestForm />
          </AuthFormBoundary>
        </Card>
        <Card title="How it works" class="muted">
          <ol style="padding-left:1.1rem;margin:0;font-size:.7rem;display:flex;flex-direction:column;gap:.4rem;">
            <li>Enter your email above.</li>
            <li>Check your inbox for the code / link.</li>
            <li>Enter the code or click the link.</li>
            <li>You're in. Session stored via secure cookie.</li>
          </ol>
          <p style="margin:.85rem 0 0;font-size:.7rem;">Need to enter a code manually? <a href="/passwordless/verify">Go to verify page &rarr;</a></p>
        </Card>
  <p class="footer-note">Demo passwordless flow &bull; Scalekit Integration</p>
      </main>
    </div>
  );
}
