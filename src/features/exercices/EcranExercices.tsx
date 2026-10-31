// Liste des exercices : recherche, filtre par groupe musculaire, masqués. Propriétaire : 03-exercices.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien } from '../../core/router';
import { amorcerBibliotheque } from '../../data/amorcage';
import { EQUIPEMENTS, GROUPES, libelleGroupe } from '../../data/groupes';
import { Bouton, ElementListe, Liste, Puce } from '../../ui';
import { normaliser, tousLesExercices } from './exercices';
import './exercices.css';

type Filtre = 'tous' | 'masques' | keyof typeof GROUPES;

export function EcranExercices() {
  useEffect(() => void amorcerBibliotheque(), []);
  const exercices = useRequete(tousLesExercices);
  const [texte, setTexte] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');

  const visibles = useMemo(() => {
    const q = normaliser(texte);
    return (exercices ?? []).filter((e) => {
      if (filtre === 'masques' ? !e.archive : e.archive) return false;
      if (filtre !== 'tous' && filtre !== 'masques' && !e.groupesMusculaires.includes(filtre)) return false;
      return !q || normaliser(e.nom).includes(q) || e.groupesMusculaires.some((g) => normaliser(libelleGroupe(g)).includes(q));
    });
  }, [exercices, texte, filtre]);

  const nbMasques = exercices?.filter((e) => e.archive).length ?? 0;
  const filtres: { v: Filtre; l: string }[] = [
    { v: 'tous', l: 'Tous' },
    ...Object.entries(GROUPES).map(([v, l]) => ({ v: v as Filtre, l })),
    ...(nbMasques ? [{ v: 'masques' as Filtre, l: `Masqués (${nbMasques})` }] : []),
  ];

  return (
    <section class="ui-pile">
      <div class="ui-ligne-entre">
        <h1>Exercices</h1>
        <Bouton variante="contour" icone="plus" href={lien('/exercices/nouveau')}>
          Ajouter
        </Bouton>
      </div>
      <input
        class="ex-recherche"
        type="search"
        placeholder="Rechercher (nom, muscle)"
        aria-label="Rechercher un exercice"
        value={texte}
        onInput={(e) => setTexte(e.currentTarget.value)}
        autocomplete="off"
      />
      <div class="ex-filtres" role="group" aria-label="Filtrer">
        {filtres.map((f) => (
          <button key={f.v} type="button" class="ex-filtre" aria-pressed={filtre === f.v} onClick={() => setFiltre(f.v)}>
            {f.l}
          </button>
        ))}
      </div>
      {exercices === undefined ? null : visibles.length === 0 ? (
        <p class="ui-attenue">Aucun exercice. {texte && <a href={lien('/exercices/nouveau')}>Créer « {texte} »</a>}</p>
      ) : (
        <Liste label="Exercices">
          {visibles.map((e) => (
            <ElementListe
              key={e.id}
              href={lien(`/exercices/${e.id}`)}
              titre={e.nom}
              detail={[EQUIPEMENTS[e.equipement], e.groupesMusculaires.map(libelleGroupe).join(', ')].filter(Boolean).join(' · ')}
              fin={e.reglagesMachine ? <Puce>{e.reglagesMachine}</Puce> : undefined}
            />
          ))}
        </Liste>
      )}
      {exercices && <p class="ui-attenue" style={{ fontSize: 'var(--t-sm)' }}>{visibles.length} exercice{visibles.length > 1 ? 's' : ''}</p>}
    </section>
  );
}
