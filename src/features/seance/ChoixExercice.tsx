import { useState } from 'preact/hooks';
import { Bouton, ElementListe, Icone, Liste } from '../../ui';
import { db } from '../../core/db';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import type { Exercice } from '../../core/types';
import { GROUPES, libelleGroupe } from '../../data/groupes';
import { normaliser } from '../exercices/exercices';
import { passeFiltres, trierExercices } from '../exercices/tri';
import '../exercices/exercices.css';

/** Liste d'exercices filtrable, pour la séance et l'éditeur de modèles. Favoris en haut. */
export function ChoixExercice({ onChoix, onAnnuler }: { onChoix: (e: Exercice) => void; onAnnuler: () => void }) {
  const [q, setQ] = useState('');
  const [favoris, setFavoris] = useState(false);
  const [muscle, setMuscle] = useState('');
  const tous = useRequete(() => db.exercices.orderBy('nom').filter((e) => !e.archive).toArray());
  const f = normaliser(q);
  const liste = trierExercices(
    (tous ?? []).filter(
      (e) =>
        passeFiltres(e, { favoris, muscles: muscle ? [muscle] : [] }) &&
        (!f || normaliser(e.nom).includes(f) || e.groupesMusculaires.some((g) => normaliser(libelleGroupe(g)).includes(f))),
    ),
    'nom',
  );
  const nbFavoris = tous?.filter((e) => e.favori).length ?? 0;
  const musclesPresents = Object.entries(GROUPES).filter(([g]) => tous?.some((e) => e.groupesMusculaires.includes(g)));

  return (
    <div class="sc-choix" role="dialog" aria-label="Choisir un exercice">
      <div class="sc-entete">
        <h2>Ajouter un exercice</h2>
        <Bouton variante="secondaire" onClick={onAnnuler}>
          Fermer
        </Bouton>
      </div>
      <input
        class="sc-champ"
        type="search"
        placeholder="Chercher (nom, muscle)"
        aria-label="Chercher un exercice"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        autoFocus
      />
      {tous && tous.length > 0 && (
        <div class="ex-filtres" role="group" aria-label="Filtres">
          {nbFavoris > 0 && (
            <button type="button" class="ex-filtre" aria-pressed={favoris} onClick={() => setFavoris(!favoris)}>
              ★ Favoris ({nbFavoris})
            </button>
          )}
          {musclesPresents.map(([g, l]) => (
            <button key={g} type="button" class="ex-filtre" aria-pressed={muscle === g} onClick={() => setMuscle(muscle === g ? '' : g)}>
              {l}
            </button>
          ))}
        </div>
      )}
      {tous && tous.length === 0 ? (
        <p class="sc-attenue">
          La bibliothèque est vide. <a href={lien('/exercices')}>Ajouter des exercices</a>
        </p>
      ) : (
        <Liste label="Exercices">
          {liste.map((e) => (
            <ElementListe
              key={e.id}
              titre={e.nom}
              detail={e.groupesMusculaires.map(libelleGroupe).join(', ')}
              fin={
                e.favori ? (
                  <span class="ex-etoile" title="Favori">
                    <Icone nom="etoile" titre="Favori" />
                  </span>
                ) : undefined
              }
              onClick={() => onChoix(e)}
            />
          ))}
        </Liste>
      )}
    </div>
  );
}
