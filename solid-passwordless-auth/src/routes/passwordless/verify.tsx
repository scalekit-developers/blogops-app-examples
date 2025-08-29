import { createSignal, onMount, Show } from 'solid-js';
import { useLocation, useNavigate } from 'solid-start';
import { AuthFormBoundary } from '../../components/AuthFormBoundary';
import { OTPVerifyForm } from '../../components/OTPVerifyForm';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';

export default function Verify() {
  const [status, setStatus] = createSignal<string | null>(null);
  const [info, setInfo] = createSignal<string | null>(null);
  const loc = useLocation();
  const nav = useNavigate();
  const linkToken = () => new URLSearchParams(loc.search).get('link_token');
  const auth = useAuth();

  onMount(() => {
    // If redirected from send flow show helpful instructions
    const from = new URLSearchParams(loc.search).get('from');
    const pendingEmail = auth.pendingEmail();
    if (from === 'send' && pendingEmail) {
      setInfo(`We sent an email to ${pendingEmail}. Enter the code below or click the magic link in your inbox.`);
    }
    if (linkToken()) verifyMagic();
  });

  async function verifyMagic() {
    setStatus('Verifying magic link...');
    try {
  const authRequestId = auth.authRequestId();
  const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkToken: linkToken(), authRequestId })
      });
  const data = await r.json();
  if (!data.success) throw new Error(data.error || 'Verification failed');
  const user = data.data?.user;
  if (user) auth.setUserUnsafe(user);
  setStatus('Success! Redirecting...');
  setTimeout(() => nav('/dashboard'), 200);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
    }
  }

  return (
    <div class="layout-center">
      <main class="stack" style="width:100%;max-width:460px;">
        <Card subTitle="Step 2" title="Verify your sign-in">
          <Show when={info()}>{msg => <Alert kind="info" >{msg()}</Alert>}</Show>
          {/* Extra spacer to give breathing room between instructions and the code input form */}
          <div style="height:.35rem;" />
          <Show when={!linkToken()} fallback={<Alert kind={status()?.startsWith('Error') ? 'error' : 'info'}>{status()}</Alert>}>
            <AuthFormBoundary>
              <OTPVerifyForm />
            </AuthFormBoundary>
          </Show>
          {linkToken() && <p class="muted small" style="margin-top:1rem;">If verification doesn't continue automatically you can return to the code entry.</p>}
        </Card>
  <p class="footer-note"><a href="/">&larr; Back to sign-in</a></p>
      </main>
    </div>
  );
}
