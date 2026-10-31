// Exercices : ma bibliothèque et le catalogue libre, recherche texte et par muscle (corps 2D).
// Propriétaire : 03-exercices.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien } from '../../core/router';
import type { Exercice } from '../../core/types';
import { chargerCatalogue, NIVEAUX, type EntreeCatalogue } from '../../data/catalogue';
import { EQUIPEMENTS, GROUPES, libelleGroupe } from '../../data/groupes';
import { Bouton, ElementListe, Liste, Onglets, Puce } from '../../ui';
import { CorpsMuscles } from './CorpsMuscles';
import { idCatalogue, liensCatalogue, normaliser, tousLesExercices } from './exercices';
import { Vignette } from './Vignette';
import './exercices.css';

type Source = 'perso' | 'catalogue';
const PAGE = 40;

// Gardé entre deux visites de l'écran (retour depuis une fiche).
const memo = { source: 'perso' as Source, texte: '', muscles: [] as string[], corps: true, masques: false };

export function EcranExercices() {
  const exercices = useRequete(tousLesExercices);
  const liens = useRequete(liensCatalogue) ?? {};
  const [catalogue, setCatalogue] = useState<EntreeCatalogue[]>();
  const [source, setSource] = useState(memo.source);
  const [texte, setTexte] = useState(memo.texte);
  const [muscles, setMuscles] = useState(memo.muscles);
  const [corps, setCorps] = useState(memo.corps);
  const [masques, setMasques] = useState(memo.masques);
  const [nbAffiches, setNbAffiches] = useState(PAGE);
  Object.assign(memo, { source, texte, muscles, corps, masques });

  useEffect(() => void chargerCatalogue().then(setCatalogue), []);
  useEffect(() => setNbAffiches(PAGE), [source, texte, muscles]);

  const parNom = useMemo(() => new Map(catalogue?.map((c) => [normaliser(c.nom), c.id])), [catalogue]);
  const dejaAjoutes = useMemo(
    () => new Set((exercices ?? []).filter((e) => !e.archive).map((e) => idCatalogue(e, liens, parNom)).filter(Boolean)),
    [exercices, liens, parNom],
  );

  const basculer = (g: string) => setMuscles((m) => (m.includes(g) ? m.filter((x) => x !== g) : [...m, g]));
  const q = normaliser(texte);
  const correspondTexte = (nom: string, groupes: string[], eq: keyof typeof EQUIPEMENTS) =>
    !q || normaliser(nom).includes(q) || normaliser(EQUIPEMENTS[eq]).includes(q) || groupes.some((g) => normaliser(libelleGroupe(g)).includes(q));

  const persos = useMemo(
    () =>
      (exercices ?? []).filter(
        (e) =>
          e.archive === masques &&
          (!muscles.length || e.groupesMusculaires.some((g) => muscles.includes(g))) &&
          correspondTexte(e.nom, e.groupesMusculaires, e.equipement),
      ),
    [exercices, masques, muscles, q],
  );
  const duCatalogue = useMemo(
    () =>
      (catalogue ?? []).filter(
        (c) => (!muscles.length || c.p.some((g) => muscles.includes(g))) && correspondTexte(c.nom, [...c.p, ...c.s], c.eq),
      ),
    [catalogue, muscles, q],
  );

  const nbMasques = exercices?.filter((e) => e.archive).length ?? 0;
  const nb = source === 'perso' ? persos.length : duCatalogue.length;

  return (
    <section class="ui-pile">
      <div class="ui-ligne-entre">
        <h1>Exercices</h1>
        <Bouton variante="contour" icone="plus" href={lien('/exercices/nouveau')}>
          Créer
        </Bouton>
      </div>
      <Onglets
        label="Source"
        valeur={source}
        onChange={setSource}
        options={[
          { valeur: 'perso', libelle: 'Ma bibliothèque' },
          { valeur: 'catalogue', libelle: `Catalogue${catalogue ? ` (${catalogue.length})` : ''}` },
        ]}
      />
      <input
        class="ex-recherche"
        type="search"
        placeholder="Rechercher (nom, muscle, équipement)"
        aria-label="Rechercher un exercice"
        value={texte}
        onInput={(e) => setTexte(e.currentTarget.value)}
        autocomplete="off"
      />

      <div class="ui-ligne-entre">
        <span class="ui-surtitre">{muscles.length ? muscles.map(libelleGroupe).join(' · ') : 'Touche un muscle'}</span>
        <span class="ui-ligne" style={{ gap: 'var(--e-2)' }}>
          {muscles.length > 0 && (
            <button type="button" class="ex-filtre" onClick={() => setMuscles([])}>
              Effacer
            </button>
          )}
          <button type="button" class="ex-filtre" aria-pressed={corps} onClick={() => setCorps(!corps)}>
            Corps
          </button>
        </span>
      </div>
      {corps && <CorpsMuscles actifs={muscles} onBasculer={basculer} />}
      <div class="ex-filtres" role="group" aria-label="Filtrer par muscle">
        {Object.entries(GROUPES).map(([g, l]) => (
          <button key={g} type="button" class="ex-filtre" aria-pressed={muscles.includes(g)} onClick={() => basculer(g)}>
            {l}
          </button>
        ))}
      </div>

      {source === 'perso' && nbMasques > 0 && (
        <button type="button" class="ex-filtre" style={{ justifySelf: 'start' }} aria-pressed={masques} onClick={() => setMasques(!masques)}>
          {masques ? 'Voir les exercices actifs' : `Voir les masqués (${nbMasques})`}
        </button>
      )}

      <p class="ui-attenue" style={{ margin: 0, fontSize: 'var(--t-sm)' }}>
        {nb} exercice{nb > 1 ? 's' : ''}
      </p>

      {source === 'perso' ? (
        exercices === undefined ? null : persos.length === 0 ? (
          <p class="ui-attenue">
            Aucun exercice ici.{' '}
            <button type="button" class="ex-filtre" onClick={() => setSource('catalogue')}>
              Chercher dans le catalogue
            </button>
          </p>
        ) : (
          <Liste label="Ma bibliothèque">
            {persos.map((e) => (
              <LignePerso key={e.id} e={e} catalogueId={idCatalogue(e, liens, parNom)} />
            ))}
          </Liste>
        )
      ) : !catalogue ? (
        <p class="ui-attenue">Chargement du catalogue…</p>
      ) : (
        <>
          <Liste label="Catalogue">
            {duCatalogue.slice(0, nbAffiches).map((c) => (
              <ElementListe
                key={c.id}
                href={lien(`/exercices/cat:${c.id}`)}
                debut={<Vignette catalogueId={c.img ? c.id : undefined} groupes={c.p} />}
                titre={c.nom}
                detail={`${EQUIPEMENTS[c.eq]} · ${c.p.map(libelleGroupe).join(', ')} · ${NIVEAUX[c.niv]}`}
                fin={dejaAjoutes.has(c.id) ? <Puce ton="progres">Ajouté</Puce> : undefined}
              />
            ))}
          </Liste>
          {duCatalogue.length > nbAffiches && (
            <Bouton variante="secondaire" class="ex-plus" onClick={() => setNbAffiches((n) => n + PAGE)}>
              Afficher plus ({duCatalogue.length - nbAffiches})
            </Bouton>
          )}
          <p class="ui-attenue" style={{ fontSize: 'var(--t-xs)' }}>
            Catalogue : free-exercise-db (domaine public). Noms et explications en anglais.
          </p>
        </>
      )}
    </section>
  );
}

function LignePerso({ e, catalogueId }: { e: Exercice; catalogueId?: string }) {
  return (
    <ElementListe
      href={lien(`/exercices/${e.id}`)}
      debut={<Vignette photo={e.photo} catalogueId={catalogueId} groupes={e.groupesMusculaires} />}
      titre={e.nom}
      detail={[EQUIPEMENTS[e.equipement], e.groupesMusculaires.map(libelleGroupe).join(', ')].filter(Boolean).join(' · ')}
      fin={e.reglagesMachine ? <Puce>{e.reglagesMachine}</Puce> : undefined}
    />
  );
}
