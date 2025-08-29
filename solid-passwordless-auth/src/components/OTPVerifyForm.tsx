import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from 'solid-start';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';

export function OTPVerifyForm() {
  const [code, setCode] = createSignal('');
  const [status, setStatus] = createSignal<string | null>(null);
  const nav = useNavigate();
  const auth = useAuth();
  let inputRef: HTMLInputElement | undefined;

  onMount(() => { inputRef?.focus(); });

  async function verify(e: Event) {
    e.preventDefault();
    setStatus('Verifying...');
    try {
  const authRequestId = auth.authRequestId();
  const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code(), authRequestId })
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

  async function resend() {
  const authRequestId = auth.authRequestId();
    if (!authRequestId) { setStatus('Error: no pending request'); return; }
    setStatus('Resending...');
    try {
  const r = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authRequestId })
      });
  const data = await r.json();
  if (!data.success) throw new Error(data.error || 'Resend failed');
      setStatus('Sent again. Check inbox.');
    } catch (e: any) {
      setStatus('Error: ' + e.message);
    }
  }

  return (
    <form onSubmit={verify} class="otp-grid">
      <FormField label="One-Time Code" requiredMark>
        <Input ref={el => (inputRef = el)} placeholder="123456" inputmode="numeric" autocomplete="one-time-code" value={code()} onInput={e => setCode(e.currentTarget.value)} />
      </FormField>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <Button type="submit">Verify Code</Button>
        <Button type="button" variant="secondary" onClick={resend}>Resend</Button>
      </div>
      <Show when={status()}>
        <Alert kind={status()?.startsWith('Error') ? 'error' : status()?.startsWith('Success') ? 'success' : status()?.startsWith('Sent') ? 'success' : status()?.startsWith('Resending') ? 'info' : 'info'} live>{status()!}</Alert>
      </Show>
    </form>
  );
}
