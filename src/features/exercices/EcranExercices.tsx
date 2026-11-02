// Exercices : ma bibliothèque et le catalogue libre, recherche texte, filtres (favoris, muscle, matériel) et tri.
// Propriétaire : 03-exercices.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien } from '../../core/router';
import type { Equipement, Exercice } from '../../core/types';
import { chargerCatalogue, NIVEAUX, type EntreeCatalogue } from '../../data/catalogue';
import { EQUIPEMENTS, GROUPES, libelleGroupe } from '../../data/groupes';
import { Bouton, ElementListe, Liste, Onglets, PanneauConseils, Puce } from '../../ui';
import { CONSEILS_GROUPES } from '../../data/conseils';
import { CorpsMuscles } from './CorpsMuscles';
import { BoutonFavori } from './BoutonFavori';
import { derniersUsages, idCatalogue, liensCatalogue, normaliser, proposerNom, tousLesExercices } from './exercices';
import { passeFiltres, trierExercices, TRIS, type Tri } from './tri';
import { Vignette } from './Vignette';
import './exercices.css';

type Source = 'perso' | 'catalogue';
const PAGE = 40;

// Gardé entre deux visites de l'écran (retour depuis une fiche).
const memo = {
  source: 'perso' as Source,
  texte: '',
  muscles: [] as string[],
  corps: true,
  masques: false,
  favoris: false,
  equipement: '' as Equipement | '',
  tri: 'nom' as Tri,
};

export function EcranExercices() {
  const exercices = useRequete(tousLesExercices);
  const liens = useRequete(liensCatalogue) ?? {};
  const [catalogue, setCatalogue] = useState<EntreeCatalogue[]>();
  const [source, setSource] = useState(memo.source);
  const [texte, setTexte] = useState(memo.texte);
  const [muscles, setMuscles] = useState(memo.muscles);
  const [corps, setCorps] = useState(memo.corps);
  const [masques, setMasques] = useState(memo.masques);
  const [favoris, setFavoris] = useState(memo.favoris);
  const [equipement, setEquipement] = useState(memo.equipement);
  const [tri, setTri] = useState(memo.tri);
  const [nbAffiches, setNbAffiches] = useState(PAGE);
  Object.assign(memo, { source, texte, muscles, corps, masques, favoris, equipement, tri });
  const derniers = useRequete(() => (tri === 'recent' ? derniersUsages() : undefined), [tri]);

  useEffect(() => void chargerCatalogue().then(setCatalogue), []);
  useEffect(() => setNbAffiches(PAGE), [source, texte, muscles, equipement]);

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
      trierExercices(
        (exercices ?? []).filter(
          (e) => e.archive === masques && passeFiltres(e, { favoris, muscles, equipement }) && correspondTexte(e.nom, e.groupesMusculaires, e.equipement),
        ),
        tri,
        derniers,
      ),
    [exercices, masques, muscles, q, favoris, equipement, tri, derniers],
  );
  const duCatalogue = useMemo(
    () =>
      (catalogue ?? []).filter(
        (c) =>
          (!muscles.length || c.p.some((g) => muscles.includes(g))) &&
          (!equipement || c.eq === equipement) &&
          correspondTexte(c.nom, [...c.p, ...c.s], c.eq),
      ),
    [catalogue, muscles, q, equipement],
  );

  const nbMasques = exercices?.filter((e) => e.archive).length ?? 0;
  const nbFavoris = exercices?.filter((e) => e.favori && !e.archive).length ?? 0;
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

      <div class="ex-outils">
        {source === 'perso' && (
          <button type="button" class="ex-filtre" aria-pressed={favoris} onClick={() => setFavoris(!favoris)}>
            ★ Favoris{nbFavoris ? ` (${nbFavoris})` : ''}
          </button>
        )}
        <select class="ex-select" aria-label="Filtrer par matériel" value={equipement} onChange={(e) => setEquipement(e.currentTarget.value as Equipement | '')}>
          <option value="">Tout matériel</option>
          {Object.entries(EQUIPEMENTS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        {source === 'perso' && (
          <select class="ex-select" aria-label="Trier" value={tri} onChange={(e) => setTri(e.currentTarget.value as Tri)}>
            {Object.entries(TRIS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        )}
      </div>

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

      {muscles.map((g) => {
        const f = CONSEILS_GROUPES[g as keyof typeof CONSEILS_GROUPES];
        return f && <PanneauConseils key={g} fiche={f} titre={libelleGroupe(g)} />;
      })}

      {source === 'perso' && nbMasques > 0 && (
        <button type="button" class="ex-filtre" style={{ justifySelf: 'start' }} aria-pressed={masques} onClick={() => setMasques(!masques)}>
          {masques ? 'Voir les exercices actifs' : `Voir les masqués (${nbMasques})`}
        </button>
      )}

      {source === 'perso' && q && !(exercices ?? []).some((e) => normaliser(e.nom) === q) && (
        <Bouton variante="secondaire" icone="plus" href={lien('/exercices/nouveau')} onClick={() => proposerNom(texte)}>
          Créer « {texte.trim()} »
        </Bouton>
      )}

      <p class="ui-attenue" style={{ margin: 0, fontSize: 'var(--t-sm)' }}>
        {nb} exercice{nb > 1 ? 's' : ''}
      </p>

      {source === 'perso' ? (
        exercices === undefined ? null : persos.length === 0 ? (
          <p class="ui-attenue">
            {favoris && !nbFavoris ? 'Aucun favori : touche l’étoile d’un exercice pour l’épingler en haut. ' : 'Aucun exercice ici. '}
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
      action={<BoutonFavori e={e} />}
    />
  );
}
