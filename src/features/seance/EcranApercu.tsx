// Aperçu d'une séance type avant de la lancer (propriétaire : 04-seance).
// Toucher une séance sur l'écran Séance ouvre cet aperçu : exercices, séries, dernière fois,
// avec « Démarrer » et « Modifier la séance » (éditeur de modèle).
import { useState } from 'preact/hooks';
import { Bouton } from '../../ui';
import { useCompteur, vibrer } from '../../anim';
import { db } from '../../core/db';
import { lien, naviguer } from '../../core/router';
import { seanceEnCours, useRequete } from '../../core/requetes';
import type { BlocModele, Exercice, Serie } from '../../core/types';
import { idCatalogue, liensCatalogue } from '../exercices/exercices';
import { Vignette } from '../exercices/Vignette';
import { dureeEstimeeSec, dureeTexteMin, SERIES_PAR_DEFAUT } from '../modeles/avis';
import { cibleSansUnite, demarrerSeance, derniereFois, dureeTexte, groupes, resumeSeries, uniteCible } from './logique';
import './seance.css';

async function charger(id: string) {
  const modele = await db.modeles.get(id);
  if (!modele || modele.archive) return null;
  const ids = [...new Set(modele.blocs.map((b) => b.exerciceId))];
  const exercices = new Map((await db.exercices.bulkGet(ids)).filter((e): e is Exercice => !!e).map((e) => [e.id, e]));
  // Dernière fois, par exercice : séries de travail de la séance la plus récente qui le contient.
  const avant = new Map<string, Serie[]>();
  await Promise.all(
    ids.map(async (exId) => {
      const s = await derniereFois(exId);
      if (s.length) avant.set(exId, s);
    }),
  );
  const derniere = (await db.seances.where('modeleId').equals(id).reverse().sortBy('debut')).find((s) => s.fin);
  const enCours = await seanceEnCours();
  const liens = await liensCatalogue();
  return { modele, exercices, avant, derniere, enCours, liens };
}

const ilYa = (iso?: string) => {
  if (!iso) return 'Jamais faite';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return `Faite ${j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} jours`}`;
};

export function EcranApercu({ id }: { id: string }) {
  const d = useRequete(() => charger(id), [id]);
  const [occupe, setOccupe] = useState(false);
  const blocs = d?.modele.blocs ?? [];
  const nbSeries = blocs.reduce((t, b) => t + (b.seriesCibles ?? SERIES_PAR_DEFAUT), 0);
  const minutes = Math.round(dureeEstimeeSec(blocs) / 60);
  const nbExos = useCompteur(blocs.length, 600);
  const nbS = useCompteur(nbSeries, 800);
  const nbMin = useCompteur(minutes, 900);

  if (d === undefined) return null;
  if (d === null)
    return (
      <section class="sc">
        <p>
          Séance introuvable. <a href={lien('/seance')}>Retour aux séances</a>
        </p>
      </section>
    );
  const { modele, exercices, avant, derniere, enCours, liens } = d;

  const demarrer = async () => {
    if (occupe) return;
    setOccupe(true);
    vibrer(15);
    await demarrerSeance(modele);
    naviguer('/seance');
  };

  return (
    <section class="sc ap">
      <div class="sc-entete">
        <a class="sc-lien" href={lien('/seance')}>
          ‹ Séances
        </a>
      </div>
      <div class="ap-tete">
        <span class="ui-surtitre">Aperçu de la séance</span>
        <h1 class="ap-titre anim-entree-titre">{modele.nom}</h1>
        <span class="sc-attenue">{ilYa(derniere?.debut)}</span>
      </div>
      <div class="bil-tuiles ap-tuiles anim-cascade">
        <div>
          <span class="bil-chiffre">{nbExos}</span>
          <span class="bil-lib">exercice{blocs.length > 1 ? 's' : ''}</span>
        </div>
        <div>
          <span class="bil-chiffre">{nbS}</span>
          <span class="bil-lib">séries</span>
        </div>
        <div>
          <span class="bil-chiffre">≈ {minutes >= 60 ? dureeTexteMin(minutes) : nbMin}</span>
          <span class="bil-lib">{minutes >= 60 ? 'durée estimée' : 'min estimées'}</span>
        </div>
      </div>
      <Bouton variante="contour" href={lien(`/modeles/${modele.id}`)} detail="Ajouter, retirer ou déplacer des exercices, changer séries et reps">
        Modifier la séance
      </Bouton>

      <span class="ui-surtitre">Au programme</span>
      {blocs.length === 0 ? (
        <p class="sc-attenue">Aucun exercice dans cette séance. Touche « Modifier la séance » pour en ajouter.</p>
      ) : (
        <ol class="ap-liste anim-cascade">
          {groupes(blocs).map((g) => (
            <li key={blocs[g[0]].id} class={g.length > 1 ? 'ap-superset' : undefined}>
              {g.length > 1 && <span class="ap-superset-lib">Superset : enchaîne sans repos</span>}
              {g.map((i) => (
                <LigneExo key={blocs[i].id} n={i + 1} bloc={blocs[i]} exercice={exercices.get(blocs[i].exerciceId)} avant={avant.get(blocs[i].exerciceId)} catalogueId={idCatalogue({ id: blocs[i].exerciceId, nom: exercices.get(blocs[i].exerciceId)?.nom ?? '' }, liens)} />
              ))}
            </li>
          ))}
        </ol>
      )}

      <div class="ap-bas">
        {enCours ? (
          <Bouton taille="geant" href={lien('/seance')} detail="Termine-la avant d’en démarrer une autre">
            Reprendre la séance en cours
          </Bouton>
        ) : (
          <Bouton taille="geant" icone="seance" class="anim-reflet" onClick={demarrer} disabled={occupe || blocs.length === 0}>
            Démarrer {modele.nom}
          </Bouton>
        )}
      </div>
    </section>
  );
}

function LigneExo({ n, bloc, exercice, avant, catalogueId }: { n: number; bloc: BlocModele; exercice?: Exercice; avant?: Serie[]; catalogueId?: string }) {
  const series = bloc.seriesCibles ?? SERIES_PAR_DEFAUT;
  const cible = `${series} série${series > 1 ? 's' : ''}${bloc.repsCibles ? ` de ${cibleSansUnite(bloc.repsCibles)} ${uniteCible(exercice?.enSecondes)}` : ''}`;
  return (
    <a class="ap-exo anim-appui" href={lien(`/exercices/${bloc.exerciceId}`)}>
      <span class="ap-num">{n}</span>
      <Vignette photo={exercice?.photo} catalogueId={catalogueId} groupes={exercice?.groupesMusculaires ?? []} />
      <span class="ap-texte">
        <span class="ap-nom">{exercice?.nom ?? 'Exercice supprimé'}</span>
        <span class="ap-cible">
          {cible}
          {bloc.reposSec ? ` · repos ${dureeTexte(bloc.reposSec)}` : ''}
        </span>
        {avant?.length ? (
          <span class="ap-avant">
            Dernière fois : <b>{resumeSeries(avant)}</b>
          </span>
        ) : null}
        {bloc.note && <span class="ap-note">{bloc.note}</span>}
      </span>
    </a>
  );
}
