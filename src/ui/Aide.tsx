import { useState } from 'preact/hooks';
import { LEXIQUE, type MotLexique } from '../data/lexique';

interface Props {
  /** Terme du lexique (src/data/lexique.ts). */
  mot?: MotLexique;
  /** Ou un texte libre. */
  texte?: string;
  /** Nom lu par les lecteurs d'écran (« Explication : … »). */
  libelle?: string;
}

/** Petit « ? » à côté d'un terme : un toucher affiche une explication d'une phrase juste en dessous. */
export function Aide({ mot, texte, libelle }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const def = mot ? LEXIQUE[mot] : undefined;
  const contenu = texte ?? def?.definition;
  if (!contenu) return null;
  return (
    <span class={`ui-aide${ouvert ? ' ouvert' : ''}`}>
      <button
        type="button"
        class="ui-aide-btn"
        aria-expanded={ouvert}
        aria-label={`Explication : ${libelle ?? def?.terme ?? ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOuvert(!ouvert);
        }}
      >
        ?
      </button>
      {ouvert && (
        <span class="ui-aide-bulle" role="note">
          {contenu}
        </span>
      )}
    </span>
  );
}
