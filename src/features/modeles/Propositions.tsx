// 3 ou 4 exercices proposés pour compléter une séance (propriétaire : 04-seance, libellés relus par 11).
import { useState } from 'preact/hooks';
import { Aide, Bouton, Carte } from '../../ui';
import { db } from '../../core/db';
import { useRequete } from '../../core/requetes';
import type { BlocModele, Exercice, Id } from '../../core/types';
import { LIBELLES_TYPE, type TypeSeance } from './avis';
import { proposerExercices, type Proposition } from './suggestions';

/** Bibliothèque et nombre de séances où chaque exercice a été fait (les habitudes passent devant). */
export function useBibliotheque() {
  return useRequete(async () => {
    const exercices = await db.exercices.filter((e) => !e.archive).toArray();
    const frequence = new Map<Id, number>();
    const vus = new Set<string>();
    await db.series.each((s) => {
      const cle = `${s.seanceId}|${s.exerciceId}`;
      if (vus.has(cle)) return;
      vus.add(cle);
      frequence.set(s.exerciceId, (frequence.get(s.exerciceId) ?? 0) + 1);
    });
    return { exercices, frequence, parId: new Map<Id, Exercice>(exercices.map((e) => [e.id, e])) };
  });
}

interface Props {
  type: TypeSeance;
  blocs: BlocModele[];
  bibliotheque: Exercice[];
  frequence: Map<Id, number>;
  onChoix: (p: Proposition) => void;
  onAutre: () => void;
  titre?: string;
}

export function Propositions({ type, blocs, bibliotheque, frequence, onChoix, onAutre, titre }: Props) {
  // « Proposer d'autres » écarte les propositions déjà vues.
  const [exclus, setExclus] = useState<Set<Id>>(new Set());
  let props = proposerExercices(type, blocs, bibliotheque, { frequence, exclus });
  const epuise = props.length === 0 && exclus.size > 0;
  if (epuise) props = proposerExercices(type, blocs, bibliotheque, { frequence });
  const premier = blocs.length === 0;
  const typeCourt = LIBELLES_TYPE[type].split(' (')[0];

  return (
    <Carte titre={titre ?? (premier ? 'Choisis ton premier exercice' : 'Exercice suivant')} ton="mise-en-avant">
      {props.length > 0 ? (
        <>
          <p class="sc-attenue sc-intro">
            {premier ? 'On commence par un gros exercice' : 'Proposé selon ce qui manque à ta séance'} <Aide mot="grosExercice" />. Touche celui que tu veux ajouter.
          </p>
          <div class="mo-propositions">
            {props.map((p) => (
              <Bouton key={p.exercice.id} variante="secondaire" taille="large" icone="plus" detail={p.raison} onClick={() => onChoix(p)}>
                {p.exercice.nom}
                {p.exercice.favori ? ' ★' : ''}
              </Bouton>
            ))}
          </div>
          <div class="sc-ligne">
            <button type="button" class="sc-lien" onClick={() => setExclus(new Set([...(epuise ? [] : exclus), ...props.map((p) => p.exercice.id)]))}>
              Proposer d’autres exercices
            </button>
          </div>
        </>
      ) : (
        <p class="sc-attenue sc-intro">
          {type === 'autre' || bibliotheque.length === 0
            ? 'Plus rien à proposer dans ta bibliothèque. Cherche un autre exercice ou enregistre ta séance.'
            : `Ta séance couvre déjà tout ce qu’il faut pour une séance ${typeCourt}. Enregistre-la, ou ajoute un exercice de ton choix.`}
        </p>
      )}
      <Bouton variante="contour" icone="plus" onClick={onAutre}>
        Autre exercice (chercher)
      </Bouton>
    </Carte>
  );
}
