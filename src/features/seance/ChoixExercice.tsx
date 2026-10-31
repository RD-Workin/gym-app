import { useState } from 'preact/hooks';
import { Bouton, ElementListe, Liste } from '../../ui';
import { db } from '../../core/db';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import type { Exercice } from '../../core/types';

const sansAccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Liste d'exercices filtrable, pour la séance et l'éditeur de modèles. */
export function ChoixExercice({ onChoix, onAnnuler }: { onChoix: (e: Exercice) => void; onAnnuler: () => void }) {
  const [q, setQ] = useState('');
  const tous = useRequete(() => db.exercices.orderBy('nom').filter((e) => !e.archive).toArray());
  const f = sansAccent(q.trim());
  const liste = (tous ?? []).filter((e) => !f || sansAccent(e.nom).includes(f) || e.groupesMusculaires.some((g) => sansAccent(g).includes(f)));

  return (
    <div class="sc-choix" role="dialog" aria-label="Choisir un exercice">
      <div class="sc-entete">
        <h2>Ajouter un exercice</h2>
        <Bouton variante="secondaire" onClick={onAnnuler}>
          Fermer
        </Bouton>
      </div>
      <input class="sc-champ" type="search" placeholder="Chercher (nom, muscle)" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} autoFocus />
      {tous && tous.length === 0 ? (
        <p class="sc-attenue">
          La bibliothèque est vide. <a href={lien('/exercices')}>Ajouter des exercices</a>
        </p>
      ) : (
        <Liste label="Exercices">
          {liste.map((e) => (
            <ElementListe key={e.id} titre={e.nom} detail={e.groupesMusculaires.join(', ')} onClick={() => onChoix(e)} />
          ))}
        </Liste>
      )}
    </div>
  );
}
