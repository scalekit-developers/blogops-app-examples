import { JSX } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', loading, children, class: cls, ...rest } = props as any;
  const classes = ['btn'];
  if (variant === 'secondary') classes.push('btn-secondary');
  else if (variant === 'ghost') classes.push('btn-ghost');
  if (cls) classes.push(cls);
  return (
    <button class={classes.join(' ')} disabled={loading || rest.disabled} {...rest}>
      {loading ? '...' : children}
    </button>
  );
}
