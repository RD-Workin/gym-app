// Étoile favori (liste et fiche). Propriétaire : 03-exercices.
import type { Exercice } from '../../core/types';
import { Icone } from '../../ui';
import { basculerFavori } from './exercices';

export function BoutonFavori({ e }: { e: Pick<Exercice, 'id' | 'nom' | 'favori'> }) {
  return (
    <button
      type="button"
      class="ex-favori"
      aria-pressed={!!e.favori}
      aria-label={`Favori : ${e.nom}`}
      title={e.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={() => void basculerFavori(e.id, !e.favori)}
    >
      <Icone nom="etoile" />
    </button>
  );
}
