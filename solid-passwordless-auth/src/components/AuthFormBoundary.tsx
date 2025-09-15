import { ErrorBoundary, JSX } from 'solid-js';
import { Alert } from './ui/Alert';

export function AuthFormBoundary(props: { children: JSX.Element }) {
  return (
    <ErrorBoundary fallback={(err) => <Alert kind="error">Form error: {String(err)}</Alert>}>
      {props.children}
    </ErrorBoundary>
  );
}
