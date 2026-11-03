// Modèles de séance : liste et éditeur (propriétaire : 04-seance).
import { useState } from 'preact/hooks';
import { Aide, Bouton, Carte, ElementListe, Liste, Onglets, PanneauConseils } from '../../ui';
import { CONSEILS_OBJECTIFS } from '../../data/conseils';
import { db } from '../../core/db';
import { lien, naviguer } from '../../core/router';
import { useRequete } from '../../core/requetes';
import { nouvelId } from '../../core/ids';
import type { BlocModele, Modele } from '../../core/types';
import { ChoixExercice } from '../seance/ChoixExercice';
import { OBJECTIFS, demarrerSeance, dureeTexte, groupes, objectifDepuisRepos, type Objectif } from '../seance/logique';
import { blocsOrigine, enregistrerModele, memesBlocs, nouveauModele, origineDe } from './modeles';
import { analyserModele, LIBELLES_VERDICT, type TypeSeance } from './avis';
import { CarteAvis } from './CarteAvis';
import { Propositions, useBibliotheque } from './Propositions';
import { BUT_OBJECTIF, NOMS_OBJECTIF, blocPropose } from './suggestions';
import '../seance/seance.css';
import './modeles.css';

export function EcranModeles({ id }: { id?: string }) {
  const modeles = useRequete(() => db.modeles.orderBy('nom').filter((m) => !m.archive).toArray());
  const biblio = useBibliotheque();
  const [edite, setEdite] = useState<Modele>();
  // Ouvert depuis « Modifier » sur l'écran Séance : éditeur direct, retour à la séance à la fin.
  const direct = id ? modeles?.find((m) => m.id === id) : undefined;
  if (direct && !edite) return <EditeurModele initial={direct} onFin={() => naviguer('/seance')} />;
  if (edite) return <EditeurModele initial={edite} onFin={() => setEdite(undefined)} />;
  if (!modeles || !biblio) return null;

  return (
    <section class="sc">
      <div class="sc-entete">
        <a class="sc-lien" href={lien('/seance')}>
          ‹ Séance
        </a>
      </div>
      <h1>Modèles de séance</h1>
      <p class="sc-attenue sc-intro">Une séance type = une liste d'exercices avec leurs séries et leur repos. Touche-en une pour la modifier : ajouter, retirer ou déplacer des exercices, changer les séries et les reps.</p>
      {modeles.length ? (
        <Liste label="Modèles">
          {modeles.map((m) => (
            <ElementListe
              key={m.id}
              titre={m.nom}
              detail={`${m.blocs.length} exercices · avis : ${LIBELLES_VERDICT[analyserModele(m.nom, m.blocs, biblio.parId, m.type as TypeSeance | undefined).verdict].toLowerCase()}`}
              onClick={() => setEdite(m)}
            />
          ))}
        </Liste>
      ) : (
        <p class="sc-attenue">Aucun modèle. Crée-en un, ou ouvre une séance faite et choisis « Créer un modèle depuis cette séance ».</p>
      )}
      <Bouton taille="geant" icone="plus" href={lien('/modeles/composer')} detail="L’app te propose les exercices un par un">
        Composer une séance
      </Bouton>
      <Bouton variante="contour" icone="plus" onClick={() => setEdite(nouveauModele())}>
        Créer une séance vide (tout à la main)
      </Bouton>
    </section>
  );
}

function EditeurModele({ initial, onFin }: { initial: Modele; onFin: () => void }) {
  const [m, setM] = useState<Modele>(initial);
  const [choix, setChoix] = useState(false);
  // Objectif : propose repos et reps par défaut ; chaque exercice reste modifiable à la main.
  const [objectif, setObjectif] = useState<Objectif>(() => {
    const r = initial.blocs.map((b) => b.reposSec).filter((x): x is number => x != null).sort((a, b) => a - b);
    return objectifDepuisRepos(r[Math.floor(r.length / 2)]);
  });
  const [suggestions, setSuggestions] = useState(false);
  const exercices = useRequete(async () => new Map((await db.exercices.toArray()).map((e) => [e.id, e])));
  const biblio = useBibliotheque();
  if (!exercices || !biblio) return null;
  const origine = origineDe(initial);
  const blocsDOrigine = origine ? blocsOrigine(origine, [...exercices.values()]) : [];
  const modifieDepuisOrigine = origine && blocsDOrigine.length > 0 && !memesBlocs(m.blocs, blocsDOrigine);
  const avis = analyserModele(m.nom, m.blocs, exercices, m.type as TypeSeance | undefined);
  if (choix)
    return (
      <ChoixExercice
        onAnnuler={() => setChoix(false)}
        onChoix={(e) => {
          setM({ ...m, blocs: [...m.blocs, { id: nouvelId(), exerciceId: e.id, seriesCibles: 3, repsCibles: OBJECTIFS[objectif].reps, reposSec: OBJECTIFS[objectif].reposSec }] });
          setChoix(false);
        }}
      />
    );

  const majBloc = (i: number, maj: Partial<BlocModele>) => setM({ ...m, blocs: m.blocs.map((b, j) => (j === i ? { ...b, ...maj } : b)) });
  const deplacer = (i: number, d: -1 | 1) => {
    const blocs = [...m.blocs];
    const j = i + d;
    if (j < 0 || j >= blocs.length) return;
    [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
    setM({ ...m, blocs });
  };
  const lier = (i: number) => {
    // Lie le bloc i au précédent (superset), ou le délie.
    const prec = m.blocs[i - 1];
    const b = m.blocs[i];
    if (b.supersetId && prec?.supersetId === b.supersetId) return majBloc(i, { supersetId: undefined });
    const sid = prec.supersetId ?? nouvelId();
    setM({ ...m, blocs: m.blocs.map((x, j) => (j === i - 1 || j === i ? { ...x, supersetId: sid } : x)) });
  };
  const nettoyer = (blocs: BlocModele[]) => {
    // Un superset d'un seul bloc n'en est pas un.
    const g = groupes(blocs);
    return blocs.map((b, i) => (b.supersetId && g.find((x) => x.includes(i))!.length < 2 ? { ...b, supersetId: undefined } : b));
  };
  const valide = m.nom.trim() && m.blocs.length;
  const enregistrer = async () => {
    if (!valide) return;
    await enregistrerModele({ ...m, nom: m.nom.trim(), blocs: nettoyer(m.blocs), origine });
    onFin();
  };
  const lancer = async () => {
    await enregistrer();
    const frais = await db.modeles.get(m.id);
    if (frais) await demarrerSeance(frais);
    naviguer('/seance');
  };
  const revenirOrigine = () => {
    if (!confirm(`Remettre les exercices du modèle « ${origine} » fourni avec l'app ? Tes changements sur cette séance seront remplacés (rien n'est enregistré avant « Enregistrer »).`)) return;
    setM({ ...m, blocs: blocsDOrigine });
  };
  const archiver = async () => {
    if (!confirm(`Supprimer le modèle « ${m.nom} » ? Les séances faites restent.`)) return;
    if (await db.modeles.get(m.id)) await enregistrerModele({ ...m, archive: true });
    onFin();
  };
  const num = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return (
    <section class="sc">
      <div class="sc-entete">
        <button type="button" class="sc-lien" onClick={onFin}>
          ‹ Annuler
        </button>
        <Bouton onClick={enregistrer} disabled={!valide}>
          Enregistrer
        </Bouton>
      </div>
      <input class="sc-champ sc-champ-titre" placeholder="Nom (Push, Pull, Jambes…)" value={m.nom} onInput={(e) => setM({ ...m, nom: (e.target as HTMLInputElement).value })} aria-label="Nom du modèle" />
      <p class="sc-attenue sc-intro">Ajoute, retire ou déplace des exercices, et règle les séries et les reps de chacun. Rien n’est gardé avant « Enregistrer ».</p>
      <CarteAvis avis={avis} max={1} />
      {modifieDepuisOrigine && (
        <Bouton variante="contour" onClick={revenirOrigine} detail={`Les exercices de « ${origine} » fournis avec l’app`}>
          Revenir au modèle d’origine
        </Bouton>
      )}
      {m.blocs.map((b, i) => {
        const enSuperset = !!b.supersetId && (m.blocs[i - 1]?.supersetId === b.supersetId || m.blocs[i + 1]?.supersetId === b.supersetId);
        return (
          <Carte key={b.id} titre={`${i + 1}${enSuperset ? ' · superset' : ''}`} ton={enSuperset ? 'mise-en-avant' : 'neutre'}>
            <div class="sc-nom-bloc">{exercices.get(b.exerciceId)?.nom ?? 'Exercice supprimé'}</div>
            <div class="sc-grille">
              <label>
                Séries
                <input class="sc-champ" inputMode="numeric" value={b.seriesCibles ?? ''} onInput={(e) => majBloc(i, { seriesCibles: num((e.target as HTMLInputElement).value) })} />
              </label>
              <label>
                Reps
                <input class="sc-champ" value={b.repsCibles ?? ''} placeholder="8-10" onInput={(e) => majBloc(i, { repsCibles: (e.target as HTMLInputElement).value.trim() || undefined })} />
              </label>
              <label>
                Repos (s)
                <input class="sc-champ" inputMode="numeric" value={b.reposSec ?? ''} placeholder="90" onInput={(e) => majBloc(i, { reposSec: num((e.target as HTMLInputElement).value) })} />
              </label>
            </div>
            <input class="sc-champ" placeholder="Note (technique, tempo…)" value={b.note ?? ''} onInput={(e) => majBloc(i, { note: (e.target as HTMLInputElement).value || undefined })} />
            <div class="sc-ligne sc-actions-bloc">
              <button type="button" class="sc-lien" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label="Monter">
                ↑
              </button>
              <button type="button" class="sc-lien" disabled={i === m.blocs.length - 1} onClick={() => deplacer(i, 1)} aria-label="Descendre">
                ↓
              </button>
              {i > 0 && (
                <button type="button" class="sc-lien" onClick={() => lier(i)}>
                  {b.supersetId && m.blocs[i - 1].supersetId === b.supersetId ? 'Délier' : 'Superset avec ↑'}
                </button>
              )}
              <button type="button" class="sc-lien danger" onClick={() => setM({ ...m, blocs: m.blocs.filter((_, j) => j !== i) })}>
                Retirer l’exercice
              </button>
            </div>
            {b.reposSec ? <span class="sc-attenue">Repos {dureeTexte(b.reposSec)}</span> : null}
          </Carte>
        );
      })}
      {suggestions ? (
        <Propositions
          titre="Ajouter un exercice"
          type={avis.type}
          blocs={m.blocs}
          bibliotheque={biblio.exercices}
          frequence={biblio.frequence}
          onChoix={(p) => setM({ ...m, blocs: [...m.blocs, blocPropose(p.exercice.id, p.gros, objectif, nouvelId())] })}
          onAutre={() => setChoix(true)}
        />
      ) : (
        <>
          <Bouton variante="contour" icone="plus" onClick={() => setSuggestions(true)} detail="Selon ce qui manque à ta séance">
            Ajouter un exercice proposé par l’app
          </Bouton>
          <Bouton variante="contour" icone="plus" onClick={() => setChoix(true)}>
            Chercher un exercice à ajouter
          </Bouton>
        </>
      )}
      <details class="mo-details">
        <summary>
          <span>
            Objectif : {NOMS_OBJECTIF[objectif]} <Aide mot="objectif" />
          </span>
          <span class="sc-attenue">Repos et reps proposés pour les exercices ajoutés</span>
        </summary>
        <Onglets
          label="Objectif de la séance"
          options={(Object.keys(OBJECTIFS) as Objectif[]).map((o) => ({ valeur: o, libelle: NOMS_OBJECTIF[o] }))}
          valeur={objectif}
          onChange={setObjectif}
        />
        <p class="sc-attenue">
          {BUT_OBJECTIF[objectif]}. Repos conseillé : {OBJECTIFS[objectif].plage} (proposé : {dureeTexte(OBJECTIFS[objectif].reposSec)}), {OBJECTIFS[objectif].reps} reps. Utilisé pour les exercices ajoutés.
        </p>
        <PanneauConseils key={objectif} fiche={CONSEILS_OBJECTIFS[objectif]} titre={`Conseils · ${NOMS_OBJECTIF[objectif]}`} />
        {m.blocs.length > 0 && (
          <Bouton variante="contour" onClick={() => setM({ ...m, blocs: m.blocs.map((b) => ({ ...b, reposSec: OBJECTIFS[objectif].reposSec })) })}>
            Repos {dureeTexte(OBJECTIFS[objectif].reposSec)} pour tous les exercices
          </Bouton>
        )}
      </details>
      {valide && (
        <Bouton variante="secondaire" onClick={lancer}>
          Enregistrer et démarrer
        </Bouton>
      )}
      <Bouton variante="danger" onClick={archiver}>
        Supprimer le modèle
      </Bouton>
    </section>
  );
}
