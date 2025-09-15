import { JSX, Show } from 'solid-js';

interface Props {
  label: string;
  error?: string | null;
  for?: string;
  helpText?: string;
  children: JSX.Element;
  requiredMark?: boolean;
}

export function FormField(props: Props) {
  return (
    <div class="form-field" style="display:flex;flex-direction:column;gap:.4rem;">
      <label for={props.for} style="font-size:.65rem;letter-spacing:.5px;font-weight:600;text-transform:uppercase;color:var(--text-dim);display:flex;align-items:center;gap:.25rem;">
        {props.label}{props.requiredMark && <span style="color:var(--danger)">*</span>}
      </label>
      {props.children}
      <Show when={props.error}><span style="color:#fca5a5;font-size:.65rem;">{props.error}</span></Show>
      <Show when={props.helpText && !props.error}><span class="muted" style="font-size:.6rem;">{props.helpText}</span></Show>
    </div>
  );
}
