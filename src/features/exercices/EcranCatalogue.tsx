// Fiche d'un exercice du catalogue : images, muscles, explications, ajout à ma bibliothèque.
import { useEffect, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien, naviguer } from '../../core/router';
import { chargerCatalogue, NIVEAUX, urlImage, type EntreeCatalogue } from '../../data/catalogue';
import { EQUIPEMENTS, libelleGroupe } from '../../data/groupes';
import { Bouton, Carte, PanneauConseils, Puce } from '../../ui';
import { CONSEILS_GROUPES } from '../../data/conseils';
import { CorpsMuscles } from './CorpsMuscles';
import { ajouterDepuisCatalogue, idCatalogue, liensCatalogue, normaliser, tousLesExercices } from './exercices';
import './exercices.css';

export function EcranCatalogue({ id }: { id: string }) {
  const [c, setC] = useState<EntreeCatalogue | null>();
  useEffect(() => void chargerCatalogue().then((cat) => setC(cat.find((x) => x.id === id) ?? null)), [id]);
  const dansBibliotheque = useRequete(async () => {
    const [exs, liens] = await Promise.all([tousLesExercices(), liensCatalogue()]);
    const parNom = c ? new Map([[normaliser(c.nom), c.id]]) : undefined;
    return exs.find((e) => !e.archive && idCatalogue(e, liens, parNom) === id);
  }, [id, c]);

  if (c === undefined) return null;
  if (c === null) {
    return (
      <p>
        Exercice introuvable. <a href={lien('/exercices')}>Retour</a>
      </p>
    );
  }

  return (
    <section class="ui-pile">
      <a class="ex-retour" href={lien('/exercices')}>‹ Catalogue</a>
      <h1>{c.nom}</h1>
      <div class="ui-ligne" style={{ flexWrap: 'wrap', gap: 'var(--e-2)' }}>
        <Puce>{EQUIPEMENTS[c.eq]}</Puce>
        <Puce>{NIVEAUX[c.niv]}</Puce>
      </div>
      {c.img > 0 && (
        <div class="ex-images">
          {Array.from({ length: c.img }, (_, i) => (
            <img key={i} src={urlImage(c.id, i)} alt={i === 0 ? 'Position de départ' : "Position d'arrivée"} loading="lazy" />
          ))}
        </div>
      )}
      {dansBibliotheque ? (
        <Bouton variante="secondaire" taille="geant" href={lien(`/exercices/${dansBibliotheque.id}`)}>
          Dans ma bibliothèque : {dansBibliotheque.nom}
        </Bouton>
      ) : (
        <Bouton taille="geant" icone="plus" onClick={async () => naviguer(`/exercices/${await ajouterDepuisCatalogue(c)}`)}>
          Ajouter à ma bibliothèque
        </Bouton>
      )}
      <Carte titre="Muscles travaillés">
        <div class="ui-pile">
          <CorpsMuscles actifs={c.p} secondaires={c.s} />
          <p style={{ margin: 0 }}>
            <strong>{c.p.map(libelleGroupe).join(', ')}</strong>
            {c.s.length > 0 && <span class="ui-attenue"> · aussi : {c.s.map(libelleGroupe).join(', ')}</span>}
          </p>
        </div>
      </Carte>
      {c.p.map((g) => {
        const f = CONSEILS_GROUPES[g as keyof typeof CONSEILS_GROUPES];
        return f && <PanneauConseils key={g} fiche={f} titre={`Le muscle : ${libelleGroupe(g)}`} />;
      })}
      {c.inst.length > 0 && (
        <Carte titre="Explications (en anglais)">
          <ol class="ex-etapes" lang="en">
            {c.inst.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </Carte>
      )}
    </section>
  );
}
