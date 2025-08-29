import { JSX } from 'solid-js';

interface CardProps {
  title?: string;
  subTitle?: string;
  actions?: JSX.Element;
  children: JSX.Element;
  class?: string;
}

export function Card(props: CardProps) {
  return (
    <section class={['card', props.class].filter(Boolean).join(' ')}>
      {props.subTitle && <div class="card-sub">{props.subTitle}</div>}
      {props.title && <h3 class="card-header">{props.title}</h3>}
      {props.children}
      {props.actions && <div style="margin-top:1rem;display:flex;gap:.6rem;">{props.actions}</div>}
    </section>
  );
}
