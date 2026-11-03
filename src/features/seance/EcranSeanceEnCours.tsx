// Séance en cours (propriétaire : 04-seance).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Aide, PanneauConseils } from '../../ui';
import { EQUIPEMENTS } from '../../data/groupes';
import { CONSEILS_SEANCE, conseilsExercice } from '../../data/conseils';
import { Bouton, Carte, ElementListe, IndicationLest, Liste, Onglets, Puce, Stepper, ToastRecord } from '../../ui';
import { LEST_MAX_KG, LEST_MIN_KG, uniteCharge } from '../../core/calculs';
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import { lien, naviguer } from '../../core/router';
import { seanceEnCours, useRequete } from '../../core/requetes';
import { braisesSur, bulle, COULEURS_PROGRES, ecraser, eclatSur, feuArtifice, sauter, vibrer } from '../../anim';
import { objectifAtteintPar } from '../objectifs/objectifs';
import { recordsDeLaSerie } from '../progression/donnees';
import type { Exercice, Modele, Seance, Serie } from '../../core/types';
import { BandeauContexte } from '../contexte/BandeauContexte';
import { SEANCES_BONUS, rangDepart } from '../../data/bibliotheque';
import { origineDe } from '../modeles/modeles';
import { ChoixExercice } from './ChoixExercice';
import { Repos } from './Repos';
import { Chrono } from './Chrono';
import { marquerBilan } from './bilan';
import { ChoixRepos } from './ChoixRepos';
import { useEcranAllume } from './ecranAllume';
import {
  REPOS_DEFAUT_SEC,
  REPOS_ECHAUFFEMENT_SEC,
  REPOS_APRES_ECHAUFFEMENT_SEC,
  demarrerSeance,
  echauffementActif,
  echauffementAProposer,
  pasCharge,
  reglerEchauffement,
  derniereFois,
  dureeTexte,
  ecrirePlan,
  enregistrerSerie,
  cibleSansUnite,
  formatCharge,
  formatSerie,
  groupes,
  lirePlan,
  preremplir,
  progresVsDerniereFois,
  resumeSeries,
  terminerSeance,
  uniteCible,
  type PlanSeance,
  type Saisie,
} from './logique';
import './seance.css';

export function EcranSeanceEnCours() {
  const enCours = useRequete(async () => (await seanceEnCours()) ?? null);
  if (enCours === undefined) return null;
  return enCours ? <SeanceActive seance={enCours} /> : <Demarrage />;
}

/* ---------------- Démarrage : un geste pour relancer une séance type ---------------- */

function Demarrage() {
  const donnees = useRequete(async () => {
    const modeles = await db.modeles.orderBy('nom').filter((m) => !m.archive).toArray();
    const seances = await db.seances.orderBy('debut').reverse().toArray();
    const derniere = new Map<string, string>();
    for (const s of seances) if (s.modeleId && !derniere.has(s.modeleId)) derniere.set(s.modeleId, s.debut);
    // Rotation : le modèle le moins récemment fait d'abord (jamais fait = en premier, dans l'ordre Push, Pull, Jambes…).
    // Les séances bonus (Home Gym, Callisthénie) passent après : on les choisit soi-même.
    const bonus = (m: Modele) => (SEANCES_BONUS.has(origineDe(m) ?? '') ? 1 : 0);
    modeles.sort(
      (a, b) =>
        bonus(a) - bonus(b) ||
        (derniere.get(a.id) ?? '').localeCompare(derniere.get(b.id) ?? '') ||
        rangDepart(origineDe(a)) - rangDepart(origineDe(b)) ||
        a.nom.localeCompare(b.nom),
    );
    return { modeles, derniere, recentes: seances.filter((s) => s.fin).slice(0, 5), premiere: seances.length === 0 };
  });
  const [occupe, setOccupe] = useState(false);
  if (!donnees) return null;
  const { modeles, derniere, recentes, premiere } = donnees;

  const lancer = async (m?: Modele) => {
    if (occupe) return;
    setOccupe(true);
    await demarrerSeance(m);
    setOccupe(false);
  };
  const ilYa = (iso?: string) => {
    if (!iso) return 'jamais faite';
    const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return j === 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} j`;
  };

  return (
    <section class="sc">
      <h1>Séance</h1>
      <p class="sc-attenue sc-intro">
        Choisis une séance type <Aide mot="modele" /> pour voir ses exercices, la modifier ou la démarrer. Pendant la séance, l'app te guide exercice par exercice, avec le minuteur de repos.
      </p>
      {premiere && (
        <Carte titre="Ta première séance" ton="mise-en-avant">
          <p class="sc-attenue sc-intro">
            Compose-la à ton goût <Aide mot="composer" /> : l’app te propose les exercices un par un. Ou démarre directement une séance type ci-dessous.
          </p>
          <Bouton taille="geant" icone="plus" href={lien('/modeles/composer')}>
            Composer ma séance
          </Bouton>
        </Carte>
      )}
      {modeles.length > 0 ? (
        <>
          <Carte titre={premiere ? 'Séances types prêtes' : 'À faire ensuite'} aside={premiere ? undefined : <Puce>{ilYa(derniere.get(modeles[0].id))}</Puce>} ton={premiere ? 'neutre' : 'mise-en-avant'}>
            <Bouton
              taille={premiere ? 'large' : 'geant'}
              variante={premiere ? 'secondaire' : 'primaire'}
              href={lien(`/seance/apercu/${modeles[0].id}`)}
              detail={`${quoi(modeles[0])}${modeles[0].blocs.length} exercices`}
            >
              {modeles[0].nom}
            </Bouton>
          </Carte>
          {modeles.length > 1 && <span class="ui-surtitre">Autres séances types</span>}
          {modeles.slice(1).map((m) => (
            <Bouton key={m.id} variante="secondaire" taille="large" detail={`${quoi(m)}${m.blocs.length} exercices · ${ilYa(derniere.get(m.id))}`} href={lien(`/seance/apercu/${m.id}`)}>
              {m.nom}
            </Bouton>
          ))}
          <Bouton variante="contour" taille="large" onClick={() => lancer()} detail="Sans modèle : tu ajoutes les exercices au fur et à mesure">
            Séance libre
          </Bouton>
        </>
      ) : (
        <Carte titre="Aucun modèle">
          <p class="sc-attenue">Crée un modèle (Push, Pull, Jambes…) pour relancer une séance en un geste.</p>
          <Bouton taille="geant" onClick={() => lancer()} disabled={occupe}>
            Séance libre
          </Bouton>
        </Carte>
      )}
      <Bouton variante="contour" taille="large" href={lien('/exercices')} detail="Une perf faite sans lancer de séance ni de chrono">
        Noter un exercice
      </Bouton>
      {!premiere && (
        <Bouton variante="contour" icone="plus" href={lien('/modeles/composer')} detail="L’app te propose les exercices un par un">
          Composer une nouvelle séance
        </Bouton>
      )}
      <Bouton variante="contour" href={lien('/modeles')}>
        Toutes mes séances types
      </Bouton>
      {recentes.length > 0 && (
        <>
          <span class="ui-surtitre">Dernières séances</span>
          <Liste label="Dernières séances">
            {recentes.map((s) => (
              <ElementListe
                key={s.id}
                titre={new Date(s.debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                detail={modeles.find((m) => m.id === s.modeleId)?.nom ?? 'Séance libre'}
                href={lien(`/seance/${s.id}`)}
              />
            ))}
          </Liste>
        </>
      )}
    </section>
  );
}

/** Ce que travaille chaque séance fournie, en quelques mots (libellés : 11). Une séance renommée garde sa description d'origine. */
const QUOI: Record<string, string> = {
  Push: 'pectoraux, épaules, triceps',
  Pull: 'dos, biceps',
  'Full body': 'tout le corps',
  'Full Upper': 'tout le haut du corps',
  'Home Gym': 'à la maison, sans matériel',
  Callisthénie: 'au parc : barre fixe, barres parallèles',
};
const quoi = (m: Modele) => {
  const q = QUOI[origineDe(m) ?? ''];
  return q ? `${q} · ` : '';
};

/* ---------------- Séance active ---------------- */

function SeanceActive({ seance }: { seance: Seance }) {
  // Écran allumé tant que la séance est ouverte (relâché quand elle se termine).
  useEcranAllume();
  const [plan, setPlanLocal] = useState<PlanSeance>();
  useEffect(() => {
    void lirePlan(seance).then(setPlanLocal);
  }, [seance.id]);
  const setPlan = (p: PlanSeance) => {
    setPlanLocal(p);
    void ecrirePlan(p);
  };

  const series = useRequete(() => db.series.where('seanceId').equals(seance.id).sortBy('ordre'), [seance.id]) ?? [];
  const exercices = useRequete(async () => new Map((await db.exercices.toArray()).map((e) => [e.id, e])));
  const modele = useRequete(async () => (seance.modeleId ? ((await db.modeles.get(seance.modeleId)) ?? null) : null), [seance.modeleId]);

  const bloc = plan?.blocs[plan.actif];
  const exercice = bloc ? exercices?.get(bloc.exerciceId) : undefined;
  const avant = useRequete(() => (bloc ? derniereFois(bloc.exerciceId, seance.id) : []), [bloc?.exerciceId, seance.id]);
  const faites = bloc ? series.filter((s) => s.exerciceId === bloc.exerciceId) : [];
  const travailFaites = faites.filter((s) => s.type !== 'echauffement');
  const proposerEchauffement = useRequete(echauffementActif);
  const etapesEchauf = bloc && plan?.echauffement?.blocId === bloc.id ? plan.echauffement.etapes : undefined;

  const [choix, setChoix] = useState(false);
  const [edition, setEdition] = useState<Serie>();
  const [rirVisible, setRirVisible] = useState(false);
  const [saisie, setSaisie] = useState<Saisie>();
  const [toast, setToast] = useState<string>();
  const [reglerRepos, setReglerRepos] = useState(false);
  const [occupe, setOccupe] = useState(false);
  /** Dernière série validée : elle « s'imprime » dans la liste. */
  const [nouvelle, setNouvelle] = useState<string>();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Préremplissage à chaque changement d'exercice ou de série.
  useEffect(() => {
    if (!bloc || !exercices || !avant) return;
    if (edition) {
      setSaisie({ chargeKg: edition.chargeKg, reps: edition.reps, dureeSec: edition.dureeSec, rir: edition.rir, type: edition.type, modeCharge: edition.modeCharge, reglagesMachine: edition.reglagesMachine });
      setRirVisible(edition.rir != null);
    } else {
      setSaisie(preremplir(exercice, bloc, faites, avant, etapesEchauf));
    }
  }, [bloc?.id, faites.length, avant, exercices, edition?.id, etapesEchauf]);

  const grps = useMemo(() => groupes(plan?.blocs ?? []), [plan?.blocs]);
  if (!plan || !exercices) return null;
  const gi = grps.findIndex((g) => g.includes(plan.actif));
  const grp = grps[gi] ?? [];
  const nom = (i: number) => exercices.get(plan.blocs[i]?.exerciceId)?.nom ?? 'Exercice';
  // Seules les séries de travail comptent pour la cible (l'échauffement est en plus).
  const nbFaites = (i: number) => series.filter((s) => s.exerciceId === plan.blocs[i].exerciceId && s.type !== 'echauffement').length;
  const groupeFini = (g: number[]) => g.every((i) => nbFaites(i) >= (plan.blocs[i].seriesCibles ?? Infinity));

  const terminer = async () => {
    const msg = series.length ? 'Terminer la séance ?' : 'Aucune série notée : abandonner cette séance ?';
    if (!confirm(msg)) return;
    const r = await terminerSeance(seance.id);
    if (r === 'terminee') {
      marquerBilan(seance.id);
      naviguer(`/seance/${seance.id}`);
    }
  };

  const ajouterExercice = (e: Exercice) => {
    const blocs = [...plan.blocs, { id: nouvelId(), exerciceId: e.id }];
    setPlan({ ...plan, blocs, actif: blocs.length - 1 });
    setChoix(false);
  };

  const retirerExercice = () => {
    if (!bloc || faites.length) return;
    const blocs = plan.blocs.filter((_, i) => i !== plan.actif);
    setPlan({ ...plan, blocs, actif: Math.max(0, Math.min(plan.actif, blocs.length - 1)) });
  };

  const valider = async (e?: Event) => {
    const bouton = e?.currentTarget as Element | undefined;
    if (!bloc || !saisie || occupe) return;
    setOccupe(true);
    try {
      if (edition) {
        await enregistrerSerie(seance.id, bloc, saisie, edition);
        setEdition(undefined);
        return;
      }
      // Retour immédiat, avant les calculs : le geste « claque ».
      ecraser(bouton);
      vibrer(15);
      eclatSur(bouton, { nombre: 30, onde: true });
      const rang = travailFaites.length;
      const serie = await enregistrerSerie(seance.id, bloc, saisie);
      // Échauffement : on reste sur l'exercice. Repos court entre les étapes ; après la dernière étape
      // proposée, repos normal du bloc (au moins 2 min) avant la 1re série de travail (avis 10-coach).
      if (serie?.type === 'echauffement') {
        setNouvelle(serie.id);
        const nbFaits = faites.filter((s) => s.type === 'echauffement').length + 1;
        const derniere = !!etapesEchauf && nbFaits >= etapesEchauf.length;
        const duree = derniere ? Math.max(REPOS_APRES_ECHAUFFEMENT_SEC, plan.blocs[grp[0]]?.reposSec ?? 0) : REPOS_ECHAUFFEMENT_SEC;
        setPlan({ ...plan, reposFin: Date.now() + duree * 1000, reposDuree: duree });
        return;
      }
      if (serie) {
        setNouvelle(serie.id);
        const mieux = avant ? progresVsDerniereFois(serie, avant, rang) : undefined;
        if (mieux) bulle(bouton, mieux, 'progres');
        // Exercice bouclé : toutes les séries cibles faites, à l'instant.
        const cibles = bloc.seriesCibles;
        if (cibles && travailFaites.length + 1 === cibles) {
          const point = document.querySelectorAll('.sc-points button')[gi];
          window.setTimeout(() => {
            sauter(point, 1.6);
            eclatSur(point, { nombre: 26, force: 5, couleurs: COULEURS_PROGRES, onde: true });
            braisesSur(point, 10);
          }, 120);
          const toutFini = grps.every((g, k) => g.every((i) => nbFaites(i) + (k === gi && i === plan.actif ? 1 : 0) >= (plan.blocs[i].seriesCibles ?? Infinity)));
          if (toutFini) {
            bulle(bouton, 'Séance complète !', 'record', mieux ? 650 : 0);
            feuArtifice(3);
            vibrer([20, 80, 20, 80, 40]);
          } else bulle(bouton, "Exercice bouclé", "action", mieux ? 650 : 0);
        }
        const recs = await recordsDeLaSerie(serie);
        const obj = await objectifAtteintPar(serie);
        if (obj) setToast(obj);
        else if (recs.length) setToast(recs[0].texte);
      }
      if (exercice && saisie.reglagesMachine && saisie.reglagesMachine !== exercice.reglagesMachine) {
        await db.exercices.update(exercice.id, { reglagesMachine: saisie.reglagesMachine, modifieLe: maintenant() });
      }
      // Suite : superset = exercice suivant du bloc sans repos ; sinon repos, et exercice suivant si la cible est atteinte.
      const pos = grp.indexOf(plan.actif);
      let actif = plan.actif;
      let repos = true;
      if (grp.length > 1 && pos < grp.length - 1) {
        actif = grp[pos + 1];
        repos = false;
      } else if (grp.length > 1) actif = grp[0];
      const compte = (i: number) => nbFaites(i) + (i === plan.actif ? 1 : 0);
      const fini = grp.every((i) => compte(i) >= (plan.blocs[i].seriesCibles ?? Infinity));
      if (repos && fini && grps[gi + 1]) actif = grps[gi + 1][0];
      const duree = plan.blocs[grp[0]].reposSec ?? REPOS_DEFAUT_SEC;
      setPlan({ ...plan, actif, ...(repos ? { reposFin: Date.now() + duree * 1000, reposDuree: duree } : {}) });
    } finally {
      setOccupe(false);
    }
  };

  // Repos réglé à la main : vaut pour ce bloc jusqu'à la fin de la séance, et pour le repos en cours.
  const reposBloc = plan.blocs[grp[0]]?.reposSec ?? REPOS_DEFAUT_SEC;
  const changerRepos = (sec: number) => {
    const blocs = plan.blocs.map((b, i) => (i === grp[0] ? { ...b, reposSec: sec } : b));
    const enCours = plan.reposFin && plan.reposFin > Date.now();
    const debutRepos = enCours ? plan.reposFin! - (plan.reposDuree ?? REPOS_DEFAUT_SEC) * 1000 : 0;
    setPlan({ ...plan, blocs, ...(enCours ? { reposFin: debutRepos + sec * 1000, reposDuree: sec } : {}) });
  };
  const garderRepos = async () => {
    if (!modele) return;
    const b = plan.blocs[grp[0]];
    const blocs = modele.blocs.map((x) => (x.id === b.id ? { ...x, reposSec: b.reposSec } : x));
    await db.modeles.update(modele.id, { blocs, modifieLe: maintenant() });
    setReglerRepos(false);
  };

  const supprimer = async () => {
    if (!edition || !confirm('Supprimer cette série ?')) return;
    await db.series.delete(edition.id);
    setEdition(undefined);
  };

  const reglage = () => {
    if (!saisie) return;
    const v = prompt('Réglage machine', saisie.reglagesMachine ?? exercice?.reglagesMachine ?? '');
    if (v != null) setSaisie({ ...saisie, reglagesMachine: v.trim() || undefined });
  };

  const allerGroupe = (g: number) => {
    setEdition(undefined);
    setPlan({ ...plan, actif: grps[g][0] });
  };

  // Échauffement proposé : premier exercice ou exercice à la barre, avant la 1re série, jamais imposé.
  const chargeTravail = bloc && avant ? preremplir(exercice, bloc, travailFaites, avant).chargeKg : undefined;
  const etapesProposees =
    bloc && proposerEchauffement && !edition && !etapesEchauf && !plan.echauffementPasse?.includes(bloc.id)
      ? echauffementAProposer(exercice, gi === 0, faites, chargeTravail)
      : [];
  const passerEchauffement = () => {
    if (!bloc) return;
    setPlan({ ...plan, echauffement: undefined, echauffementPasse: [...(plan.echauffementPasse ?? []), bloc.id] });
  };
  const faireEchauffement = () => {
    if (!bloc) return;
    setPlan({ ...plan, echauffement: { blocId: bloc.id, etapes: etapesProposees } });
  };
  const nePlusProposer = async () => {
    if (!confirm("Ne plus proposer d'échauffement ? Tu pourras le remettre dans Réglages.")) return;
    passerEchauffement();
    await reglerEchauffement(false);
  };
  const nbEchauf = faites.filter((s) => s.type === 'echauffement').length;
  const echauffementEnCours = !!etapesEchauf && saisie?.type === 'echauffement' && !travailFaites.length && nbEchauf < etapesEchauf.length;

  if (choix) return <ChoixExercice onChoix={ajouterExercice} onAnnuler={() => setChoix(false)} />;

  const titre = modele?.nom ?? 'Séance libre';
  const reglageAffiche = saisie?.reglagesMachine ?? exercice?.reglagesMachine;
  const cible = bloc && (bloc.seriesCibles || bloc.repsCibles) ? `${bloc.seriesCibles ?? '?'} × ${bloc.repsCibles ?? '?'}` : undefined;
  const cibleTexte = bloc?.seriesCibles && bloc.repsCibles ? `${bloc.seriesCibles} séries de ${cibleSansUnite(bloc.repsCibles)} ${uniteCible(exercice?.enSecondes)}` : cible;
  const notes = [exercice?.note, bloc?.note].filter(Boolean);
  const sansCharge = saisie?.modeCharge === 'sans_charge';
  const lest = saisie?.modeCharge === 'lest';
  // Exercice tenu (gainage, dead hang…) : on note des secondes au lieu de reps.
  const tenu = saisie?.dureeSec != null;

  return (
    <section class="sc sc-active">
      {toast && <ToastRecord texte={toast} onFin={() => setToast(undefined)} />}
      <div class="sc-entete">
        <h2 class="sc-titre-seance">{titre}</h2>
        <span class="sc-num sc-chrono">{dureeTexte((now - new Date(seance.debut).getTime()) / 1000)}</span>
        <Bouton variante="secondaire" onClick={terminer}>
          Terminer
        </Bouton>
      </div>
      <BandeauContexte seance={seance} />

      {grps.length > 0 && (
        <div class="sc-points" aria-label={`Exercice ${gi + 1} sur ${grps.length}`}>
          {grps.map((g, i) => (
            <button key={i} type="button" aria-label={g.map(nom).join(' + ')} class={i === gi ? 'cur' : groupeFini(g) ? 'fait' : g.some((j) => nbFaites(j)) ? 'entame' : ''} onClick={() => allerGroupe(i)} />
          ))}
        </div>
      )}

      {!bloc ? (
        <Carte titre="Séance libre">
          <p class="sc-attenue">Touche « Ajouter un exercice » en bas pour commencer.</p>
        </Carte>
      ) : (
        <>
          <div class="sc-exo">
            <div class="sc-ligne">
              <span class="ui-surtitre">
                Exercice {gi + 1} / {grps.length}
                {grp.length > 1 ? ' · superset' : exercice ? ` · ${EQUIPEMENTS[exercice.equipement]}` : ''}
                {grp.length > 1 && <Aide mot="superset" />}
              </span>
              {/* Réglage machine : inutile au poids du corps, sauf s'il est déjà noté (11). */}
              {(reglageAffiche || exercice?.equipement !== 'poids_du_corps') && (
                <button type="button" class="sc-puce-btn" onClick={reglage} aria-label="Réglage machine">
                  <Puce>{reglageAffiche ? `Réglage : ${reglageAffiche}` : '+ Réglage machine'}</Puce>
                </button>
              )}
            </div>
            {grp.length > 1 && (
              <Onglets
                label="Exercices du superset"
                options={grp.map((i) => ({ valeur: String(i), libelle: nom(i) }))}
                valeur={String(plan.actif)}
                onChange={(v) => {
                  setEdition(undefined);
                  setPlan({ ...plan, actif: Number(v) });
                }}
              />
            )}
            <div class="sc-nom-exo">{nom(plan.actif)}</div>
            <div class="sc-attenue">
              Dernière fois : <b class="sc-num">{avant?.length ? resumeSeries(avant) : '—'}</b>
            </div>
            {cible && (
              <div class="sc-attenue">
                Cible : <b class="sc-num">{cibleTexte}</b> <Aide mot="cible" />
              </div>
            )}
            <div class="sc-attenue">
              Repos entre les séries :{' '}
              <button type="button" class="sc-lien sc-lien-inline" onClick={() => setReglerRepos(!reglerRepos)} aria-label="Régler la durée du repos">
                {dureeTexte(reposBloc)} ✎
              </button>
            </div>
            {notes.map((n) => (
              <p key={n} class="sc-note">{n}</p>
            ))}

          </div>

          {etapesProposees.length > 0 && (
            <div class="sc-echauf" role="group" aria-label="Échauffement proposé">
              <div class="sc-ligne">
                <span class="sc-echauf-titre">
                  Échauffement proposé <Aide mot="echauffement" />
                </span>
                <button type="button" class="sc-lien sc-lien-inline sc-echauf-jamais" onClick={nePlusProposer}>
                  Ne plus proposer
                </button>
              </div>
              <p class="sc-attenue">
                <b class="sc-num">{etapesProposees.map((e) => `${formatCharge({ chargeKg: e.chargeKg, modeCharge: saisie?.modeCharge ?? 'total' })}\u00a0×\u00a0${e.reps}`).join(' · ')}</b>, avant tes{' '}
                {formatCharge({ chargeKg: chargeTravail, modeCharge: saisie?.modeCharge ?? 'total' })}
              </p>
              <div class="sc-echauf-actions">
                <button type="button" class="sc-option sc-echauf-oui" onClick={faireEchauffement}>
                  Faire l'échauffement
                </button>
                <button type="button" class="sc-option" onClick={passerEchauffement}>
                  Passer
                </button>
              </div>
            </div>
          )}

          <ol class="sc-series">
            {faites.map((s) => (
              <li key={s.id} class={s.id === nouvelle ? 'anim-tampon' : undefined}>
                <button type="button" class={`sc-serie fait${edition?.id === s.id ? ' cur' : ''}`} onClick={() => setEdition(edition?.id === s.id ? undefined : s)}>
                  <span class="sc-n">{s.type === 'echauffement' ? 'É' : travailFaites.indexOf(s) + 1}</span>
                  <span class="sc-num">
                    {formatSerie(s)}
                    {s.rir != null ? ` · RIR ${s.rir}` : ''}
                  </span>
                  <span class={s.type === 'echauffement' ? 'sc-ok sc-echauf-fait' : 'sc-ok'}>
                    {s.type === 'echauffement' ? (
                      'échauf.'
                    ) : (
                      <svg class={`anim-coche${s.id === nouvelle ? ' trace' : ''}`} viewBox="0 0 24 24" aria-label="faite">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {!edition && (
              <li>
                <div class="sc-serie cur">
                  <span class="sc-n">{echauffementEnCours ? 'É' : travailFaites.length + 1}</span>
                  <span class="sc-attenue">
                    {echauffementEnCours ? `échauffement ${nbEchauf + 1} sur ${etapesEchauf!.length}` : `série ${travailFaites.length + 1} : règle puis valide`}
                  </span>
                  {echauffementEnCours ? (
                    <button type="button" class="sc-lien sc-lien-inline" onClick={passerEchauffement}>
                      Passer l'échauffement
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              </li>
            )}
          </ol>

          {plan.reposFin && !edition && (
            <Repos
              fin={plan.reposFin}
              duree={plan.reposDuree ?? REPOS_DEFAUT_SEC}
              onAjouter={(s) => setPlan({ ...plan, reposFin: plan.reposFin! + s * 1000, reposDuree: (plan.reposDuree ?? REPOS_DEFAUT_SEC) + s })}
              onPasser={() => setPlan({ ...plan, reposFin: undefined })}
              onRegler={() => setReglerRepos(!reglerRepos)}
            />
          )}
          {reglerRepos && (
            <ChoixRepos valeur={reposBloc} onChange={changerRepos} onGarder={modele ? garderRepos : undefined} onFermer={() => setReglerRepos(false)} />
          )}

          {saisie && (
            <>
              <div class={`sc-steppers${sansCharge ? ' seul' : ''}`}>
                {!sansCharge && (
                  <Stepper
                    id="sc-kg"
                    valeur={saisie.chargeKg ?? 0}
                    onChange={(v) => setSaisie({ ...saisie, chargeKg: v })}
                    unite={uniteCharge(saisie.modeCharge)}
                    pas={pasCharge(exercice?.equipement)}
                    min={lest ? LEST_MIN_KG : 0}
                    max={lest ? LEST_MAX_KG : 999}
                    decimales={2}
                  />
                )}
                {tenu ? (
                  <Stepper id="sc-duree" valeur={saisie.dureeSec ?? 0} onChange={(v) => setSaisie({ ...saisie, dureeSec: v })} unite="secondes" pas={5} min={0} max={3600} decimales={0} />
                ) : (
                  <Stepper id="sc-reps" valeur={saisie.reps} onChange={(v) => setSaisie({ ...saisie, reps: v })} unite="reps" min={0} max={200} decimales={0} />
                )}
              </div>
              {tenu && !edition && <Chrono key={travailFaites.length} onFin={(sec) => setSaisie({ ...saisie, dureeSec: sec })} />}
              {lest && <IndicationLest lestKg={saisie.chargeKg ?? 0} poidsCorporelKg={seance.contexte?.poidsCorporelKg} />}
              {rirVisible && (
                <Stepper id="sc-rir" valeur={saisie.rir ?? 2} onChange={(v) => setSaisie({ ...saisie, rir: v })} unite="reps en réserve" min={0} max={10} decimales={0} />
              )}
              <div class="sc-options">
                <button type="button" class="sc-option" aria-pressed={saisie.type === 'echauffement'} onClick={() => setSaisie({ ...saisie, type: saisie.type === 'echauffement' ? 'travail' : 'echauffement' })}>
                  Série d'échauffement
                </button>
                {!tenu && (
                  <>
                    <button
                      type="button"
                      class="sc-option"
                      aria-pressed={rirVisible}
                      onClick={() => {
                        setRirVisible(!rirVisible);
                        setSaisie({ ...saisie, rir: rirVisible ? undefined : (saisie.rir ?? 2) });
                      }}
                    >
                      Noter le RIR
                    </button>
                    <Aide mot="rir" />
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div class="sc-bas">
        {bloc && edition ? (
          <>
            <Bouton taille="geant" onClick={valider} disabled={occupe}>
              Enregistrer la série
            </Bouton>
            <div class="sc-ligne">
              <Bouton variante="danger" onClick={supprimer}>
                Supprimer
              </Bouton>
              <Bouton variante="secondaire" onClick={() => setEdition(undefined)}>
                Annuler
              </Bouton>
            </div>
          </>
        ) : bloc ? (
          <Bouton taille="geant" class="anim-reflet" onClick={valider} disabled={occupe || !saisie}>
            Valider la série
          </Bouton>
        ) : null}
        <div class="sc-ligne sc-nav">
          <button type="button" class="sc-lien" disabled={gi <= 0} onClick={() => allerGroupe(gi - 1)}>
            {gi > 0 ? `‹ Précédent : ${grps[gi - 1].map(nom).join(' + ')}` : ''}
          </button>
          <button type="button" class="sc-lien" disabled={gi >= grps.length - 1} onClick={() => allerGroupe(gi + 1)}>
            {gi < grps.length - 1 ? `Suivant : ${grps[gi + 1].map(nom).join(' + ')} ›` : ''}
          </button>
        </div>
        <div class="sc-ligne">
          <Bouton variante="contour" icone="plus" onClick={() => setChoix(true)}>
            Ajouter un exercice
          </Bouton>
          {bloc && !faites.length && (
            <Bouton variante="contour" onClick={retirerExercice} aria-label={`Retirer ${nom(plan.actif)} de cette séance`}>
              Passer cet exercice
            </Bouton>
          )}
        </div>
        {/* Sous « Valider » : la saisie reste visible sans défiler (11). */}
        {bloc && conseilsExercice(nom(plan.actif)) && <PanneauConseils key={nom(plan.actif)} fiche={conseilsExercice(nom(plan.actif))!} titre={`Conseils · ${nom(plan.actif)}`} />}
        <PanneauConseils fiche={CONSEILS_SEANCE} titre="Conseils de séance" />
      </div>
    </section>
  );
}
