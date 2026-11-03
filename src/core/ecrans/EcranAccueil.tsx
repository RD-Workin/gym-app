// Accueil : dit ce que fait l'app et quoi faire maintenant. Propriétaire : 01 (contenu et clarté : 11-ergonomie).
import { Aide, Bouton, Carte, Puce } from '../../ui';
import { db } from '../db';
import { lien } from '../router';
import { seanceEnCours, useRequete } from '../requetes';
import { RappelSauvegarde } from '../../features/donnees/rappel';
import { useEffect } from 'preact/hooks';
import { Anneau, Flamme, semainesDAffilee, useCompteur } from '../../anim';
import { CarteNouveautes, marquerNouveautesVues } from './MiseAJour';
import './accueil.css';

export const CLE_BIENVENUE = 'bienvenueVue';
/** Repère de l'anneau de la semaine (3 séances : le minimum recommandé pour progresser). */
export const SEANCES_VISEES_SEMAINE = 3;

async function etatAccueil() {
  const [enCours, nbSeries, bienvenue, seances] = await Promise.all([
    seanceEnCours(),
    db.series.count(),
    db.reglages.get(CLE_BIENVENUE),
    db.seances.orderBy('debut').reverse().toArray(),
  ]);
  const finies = seances.filter((s) => s.fin);
  const lundi = new Date();
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const semaine = finies.filter((s) => new Date(s.debut) >= lundi).length;
  const derniere = finies[0];
  const modele = derniere?.modeleId ? await db.modeles.get(derniere.modeleId) : undefined;
  return {
    enCours: enCours ?? null,
    nouveau: nbSeries === 0,
    bienvenueVue: bienvenue?.valeur === true,
    semaine,
    affilee: semainesDAffilee(finies.map((s) => s.debut)),
    derniere: derniere ? { id: derniere.id, debut: derniere.debut, nom: modele?.nom ?? 'Séance libre' } : null,
  };
}

const ilYa = (iso: string) => {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} jours`;
};

export function EcranAccueil() {
  const e = useRequete(etatAccueil);
  if (!e) return null;
  const montrerBienvenue = e.nouveau && !e.bienvenueVue;

  return (
    <section class="ui-pile acc">
      <h1>Gym App</h1>
      {montrerBienvenue ? <Bienvenue /> : <CarteNouveautes />}
      <RappelSauvegarde />

      {e.enCours ? (
        <Carte titre="Séance en cours" ton="mise-en-avant" aside={<Puce>depuis {new Date(e.enCours.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Puce>}>
          <Bouton taille="geant" href={lien('/seance')}>
            Reprendre la séance
          </Bouton>
        </Carte>
      ) : (
        <Bouton taille="geant" icone="seance" class="anim-reflet" href={lien('/seance')}>
          Démarrer une séance
        </Bouton>
      )}
      <Bouton variante="secondaire" taille="large" icone="exercices" href={lien('/exercices')} detail="Une perf faite sans lancer de séance ni de chrono">
        Noter un exercice
      </Bouton>

      {!e.nouveau && (
        <Carte titre="Ton suivi">
          <div class="acc-stats">
            <Semaine fait={e.semaine} affilee={e.affilee} />
            {e.derniere && (
              <a href={lien(`/seance/${e.derniere.id}`)}>
                <span class="acc-derniere">{e.derniere.nom}</span>
                <span class="ui-attenue">dernière séance, {ilYa(e.derniere.debut)}</span>
              </a>
            )}
          </div>
          <Bouton variante="contour" icone="progres" href={lien('/progression')}>
            Voir mes progrès
          </Bouton>
        </Carte>
      )}

      {montrerBienvenue ? null : (
        <p class="ui-attenue acc-aide">
          Un mot pas clair (RIR, 1RM, modèle…) ? Touche le <span class="acc-q">?</span> à côté, ou vois <a href={lien('/reglages')}>Réglages › Aide</a>.
        </p>
      )}
    </section>
  );
}

/** Premier lancement : ce que fait l'app et les 3 gestes pour commencer. */
function Bienvenue() {
  useEffect(() => {
    void marquerNouveautesVues();
  }, []);
  return (
    <Carte titre="Bienvenue" ton="mise-en-avant">
      <p class="acc-intro">
        Note tes séances de muscu en quelques secondes, et vois tes charges progresser. Tout reste sur ce téléphone, sans compte.
      </p>
      <EtapesDemarrage />
      <p class="ui-attenue acc-astuce">
        Tu vois un <span class="acc-q">?</span> à côté d'un mot : touche-le pour une explication.
      </p>
      <Bouton variante="secondaire" onClick={() => void db.reglages.put({ cle: CLE_BIENVENUE, valeur: true })}>
        J'ai compris
      </Bouton>
    </Carte>
  );
}

/** Les 3 gestes pour commencer (aussi dans Réglages › Aide). */
export function EtapesDemarrage() {
  return (
    <ol class="acc-etapes">
      <li>
        <b>Prépare ta séance.</b> Compose-la avec l'aide de l'app (elle te propose les exercices un par un), ou prends une des cinq séances types prêtes (Push, Pull, Jambes, Full Upper, Full body) et modifie-la à ton goût.
      </li>
      <li>
        <b>Note chaque série.</b> Règle le poids et les répétitions avec + et −, puis « Valider la série ». Le minuteur de repos démarre tout seul.
      </li>
      <li>
        <b>Regarde tes progrès.</b> Après ta première séance, l'onglet Progrès montre tes courbes et tes records.
      </li>
    </ol>
  );
}

/** Anneau de la semaine qui se remplit + flamme de régularité. */
function Semaine({ fait, affilee }: { fait: number; affilee: number }) {
  const n = useCompteur(fait, 900);
  const vise = SEANCES_VISEES_SEMAINE;
  return (
    <div class="acc-semaine">
      <Anneau valeur={fait} max={vise} taille={84} label={`${fait} séance${fait > 1 ? 's' : ''} sur ${vise} cette semaine`}>
        <span class="ui-chiffre acc-chiffre">{n}</span>
        <span class="acc-sur">/ {vise}</span>
      </Anneau>
      <div class="acc-semaine-texte">
        <span class="ui-attenue">séance{fait > 1 ? 's' : ''} cette semaine{fait >= vise ? ' : semaine réussie !' : `, sur ${vise} conseillées`}{' '}
          <Aide texte="3 séances par semaine, c'est le repère conseillé pour progresser sur chaque muscle. L'anneau se remplit à chaque séance terminée." libelle="séances conseillées" />
        </span>
        {affilee >= 2 && (
          <span class="acc-affilee">
            <Flamme />
            <span>
              <b>{affilee}</b> semaine{affilee > 1 ? 's' : ''} d'affilée
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
