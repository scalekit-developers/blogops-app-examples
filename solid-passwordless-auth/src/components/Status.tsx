import { JSX } from 'solid-js';

export function Card(props: { title?: string; children: JSX.Element }) {
  return (
    <div style="border:1px solid #ddd;padding:1rem;border-radius:8px;">
      {props.title && <h3 style="margin-top:0">{props.title}</h3>}
      {props.children}
    </div>
  );
}
