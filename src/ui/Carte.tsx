import type { ComponentChildren } from 'preact';

interface Props {
  /** Surtitre en petites capitales. */
  titre?: ComponentChildren;
  /** Élément aligné à droite du titre (souvent une Puce). */
  aside?: ComponentChildren;
  /** mise-en-avant : action du moment. alerte : à renforcer. progres : objectif. */
  ton?: 'neutre' | 'mise-en-avant' | 'alerte' | 'progres';
  children?: ComponentChildren;
}

export function Carte({ titre, aside, ton = 'neutre', children }: Props) {
  return (
    <section class={`ui-carte${ton !== 'neutre' ? ` ${ton}` : ''}`}>
      {(titre || aside) && (
        <div class="ui-carte-titre">
          {titre && <span class="ui-surtitre">{titre}</span>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
