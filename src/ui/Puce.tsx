import type { ComponentChildren } from 'preact';

/** Petite étiquette d'état. progres = vert, alerte = ambre, record = or. */
export function Puce({ ton = 'neutre', children }: { ton?: 'neutre' | 'progres' | 'alerte' | 'record'; children: ComponentChildren }) {
  return <span class={`ui-puce${ton !== 'neutre' ? ` ${ton}` : ''}`}>{children}</span>;
}
