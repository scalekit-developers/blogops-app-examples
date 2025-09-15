import { JSX } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export function Input(props: InputProps) {
  const { class: cls, ...rest } = props as any;
  return <input class={['input', cls].filter(Boolean).join(' ')} {...rest} />;
}
