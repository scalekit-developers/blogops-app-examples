import { createMemo, createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from 'solid-start';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';

interface Props {
  onSent?: (authRequestId: string, passwordlessType: string) => void;
}

export function EmailRequestForm(props: Props) {
  const [email, setEmail] = createSignal('');
  const [status, setStatus] = createSignal<string | null>(null);
  const [sending, setSending] = createSignal(false);
  // We only show validation feedback after the user explicitly tries to submit.
  const [submitted, setSubmitted] = createSignal(false);
  const nav = useNavigate();
  const auth = useAuth();

  onMount(() => {
    const prev = auth.pendingEmail();
    if (prev) setEmail(prev);
  });

  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const valid = createMemo(() => emailPattern.test(email().trim()));
  const showError = createMemo(() => submitted() && email().length > 0 && !valid());

  async function send(e: Event) {
    e.preventDefault();
    setSubmitted(true);
  // Clear any prior status so we don't show two error messages.
  setStatus(null);
    // Only now (after user action) do we check validity.
    if (!valid()) {
      return;
    }
    setSending(true);
    setStatus('Sending email...');
    try {
  const r = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email().trim() })
      });
  const data = await r.json();
  if (!data.success) throw new Error(data.error || 'Send failed');
  const payload = data.data;
  auth.setAuthRequestId(payload.authRequestId);
  auth.setPendingEmail(email());
      setStatus('Sent. Redirecting...');
  props.onSent?.(payload.authRequestId, payload.passwordlessType);
      setTimeout(() => nav('/passwordless/verify?from=send'), 400);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section class="inline-stack">
      <form onSubmit={send} class="inline-stack">
        <FormField label="Email Address" error={showError() ? 'Enter a valid email (example: user@domain.com).' : null} requiredMark>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email()}
            onInput={e => setEmail(e.currentTarget.value)}
            autocomplete="email"
            aria-invalid={showError() ? 'true' : 'false'}
          />
        </FormField>
        <Button
          type="submit"
            // Only disable while actively sending so user can always attempt submit and see validation feedback.
          loading={sending()}
          disabled={sending()}
        >
          Send Link / Code
        </Button>
      </form>
      <Show when={status()}>
        <Alert kind={status()?.startsWith('Error') ? 'error' : status()?.startsWith('Sent') ? 'success' : 'info'} live>{status()!}</Alert>
      </Show>
    </section>
  );
}
