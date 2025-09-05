import { Show, createEffect, createSignal } from 'solid-js';
import { useNavigate } from 'solid-start';
import { useAuth } from '../context/AuthContext';

export const Protected: (props: { children: any }) => any = (props) => {
  const { user, initialized, loading } = useAuth();
  const nav = useNavigate();
  const [attempted, setAttempted] = createSignal(false);
  createEffect(() => {
    if (attempted()) return;
    if (initialized() && !loading()) {
      if (!user()) {
        setAttempted(true);
        setTimeout(() => nav('/'), 50);
      }
    }
  });
  return (
    <Show when={user()} fallback={<div style="padding:2rem;font-size:.8rem;">Checking session...</div>}>
      {props.children}
    </Show>
  );
};
