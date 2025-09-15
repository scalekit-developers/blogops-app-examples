import { JSX } from 'solid-js';

interface AlertProps {
  kind?: 'info' | 'success' | 'error';
  children: JSX.Element;
  class?: string;
  live?: boolean; // if true, announce via aria-live
}

export function Alert(props: AlertProps) {
  const kind = props.kind || 'info';
  const live = props.live !== false; // default true for dynamic status messages
  const ariaRole = kind === 'error' ? 'alert' : 'status';
  return (
    <div
      class={['alert', `alert-${kind}`, props.class].filter(Boolean).join(' ')}
      role={live ? ariaRole : undefined}
      aria-live={live ? (kind === 'error' ? 'assertive' : 'polite') : undefined}
    >
      {props.children}
    </div>
  );
}
