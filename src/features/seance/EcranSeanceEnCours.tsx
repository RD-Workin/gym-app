// Séance en cours (propriétaire : 04-seance).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { PanneauConseils } from '../../ui';
import { CONSEILS_SEANCE, conseilsExercice } from '../../data/conseils';
import { Bouton, Carte, ElementListe, Liste, Onglets, Puce, Stepper, ToastRecord } from '../../ui';
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import { lien, naviguer } from '../../core/router';
import { seanceEnCours, useRequete } from '../../core/requetes';
import { eclatSur } from '../../anim';
import { recordsDeLaSerie } from '../progression/donnees';
import type { Equipement, Exercice, Modele, Seance, Serie } from '../../core/types';
import { BandeauContexte } from '../contexte/BandeauContexte';
import { ChoixExercice } from './ChoixExercice';
import { Repos } from './Repos';
import { ChoixRepos } from './ChoixRepos';
import {
  REPOS_DEFAUT_SEC,
  demarrerSeance,
  derniereFois,
  dureeTexte,
  ecrirePlan,
  enregistrerSerie,
  formatCharge,
  groupes,
  lirePlan,
  preremplir,
  resumeSeries,
  terminerSeance,
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
    // Rotation : le modèle le moins récemment fait d'abord (jamais fait = en premier).
    modeles.sort((a, b) => (derniere.get(a.id) ?? '').localeCompare(derniere.get(b.id) ?? ''));
    return { modeles, derniere, recentes: seances.filter((s) => s.fin).slice(0, 5) };
  });
  const [occupe, setOccupe] = useState(false);
  if (!donnees) return null;
  const { modeles, derniere, recentes } = donnees;

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
      {modeles.length > 0 ? (
        <>
          <Carte titre="Prochaine séance" aside={<Puce>{ilYa(derniere.get(modeles[0].id))}</Puce>} ton="mise-en-avant">
            <Bouton taille="geant" onClick={() => lancer(modeles[0])} disabled={occupe}>
              Démarrer {modeles[0].nom}
            </Bouton>
          </Carte>
          {modeles.slice(1).map((m) => (
            <Bouton key={m.id} variante="secondaire" taille="large" detail={`${m.blocs.length} exercices · ${ilYa(derniere.get(m.id))}`} onClick={() => lancer(m)}>
              {m.nom}
            </Bouton>
          ))}
          <Bouton variante="contour" onClick={() => lancer()}>
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
      <Bouton variante="contour" href={lien('/modeles')}>
        Gérer les modèles
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

/* ---------------- Séance active ---------------- */

const pasCharge = (e?: Equipement) => (e === 'barre' || e === 'machine' || e === 'poulie' ? 2.5 : 1);

function SeanceActive({ seance }: { seance: Seance }) {
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

  const [choix, setChoix] = useState(false);
  const [edition, setEdition] = useState<Serie>();
  const [rirVisible, setRirVisible] = useState(false);
  const [saisie, setSaisie] = useState<Saisie>();
  const [toast, setToast] = useState<string>();
  const [reglerRepos, setReglerRepos] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Préremplissage à chaque changement d'exercice ou de série.
  useEffect(() => {
    if (!bloc || !exercices || !avant) return;
    if (edition) {
      setSaisie({ chargeKg: edition.chargeKg, reps: edition.reps, rir: edition.rir, type: edition.type, modeCharge: edition.modeCharge, reglagesMachine: edition.reglagesMachine });
      setRirVisible(edition.rir != null);
    } else {
      setSaisie(preremplir(exercice, bloc, faites, avant));
    }
  }, [bloc?.id, faites.length, avant, exercices, edition?.id]);

  const grps = useMemo(() => groupes(plan?.blocs ?? []), [plan?.blocs]);
  if (!plan || !exercices) return null;
  const gi = grps.findIndex((g) => g.includes(plan.actif));
  const grp = grps[gi] ?? [];
  const nom = (i: number) => exercices.get(plan.blocs[i]?.exerciceId)?.nom ?? 'Exercice';
  const nbFaites = (i: number) => series.filter((s) => s.exerciceId === plan.blocs[i].exerciceId).length;
  const groupeFini = (g: number[]) => g.every((i) => nbFaites(i) >= (plan.blocs[i].seriesCibles ?? Infinity));

  const terminer = async () => {
    const msg = series.length ? 'Terminer la séance ?' : 'Aucune série notée : abandonner cette séance ?';
    if (!confirm(msg)) return;
    const r = await terminerSeance(seance.id);
    if (r === 'terminee') naviguer(`/seance/${seance.id}`);
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
      const serie = await enregistrerSerie(seance.id, bloc, saisie);
      eclatSur(bouton);
      if (serie) {
        const recs = await recordsDeLaSerie(serie);
        if (recs.length) setToast(recs[0].texte);
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

  if (choix) return <ChoixExercice onChoix={ajouterExercice} onAnnuler={() => setChoix(false)} />;

  const titre = modele?.nom ?? 'Séance libre';
  const reglageAffiche = saisie?.reglagesMachine ?? exercice?.reglagesMachine;
  const cible = bloc && (bloc.seriesCibles || bloc.repsCibles) ? `${bloc.seriesCibles ?? '?'} × ${bloc.repsCibles ?? '?'}` : undefined;
  const notes = [exercice?.note, bloc?.note].filter(Boolean);
  const sansCharge = saisie?.modeCharge === 'sans_charge';

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
          <p class="sc-attenue">Ajoute un premier exercice.</p>
        </Carte>
      ) : (
        <>
          <div class="sc-exo">
            <div class="sc-ligne">
              <span class="ui-surtitre">
                Exercice {gi + 1} / {grps.length}
                {grp.length > 1 ? ' · superset' : exercice ? ` · ${exercice.equipement.replace('_', ' ')}` : ''}
              </span>
              <button type="button" class="sc-puce-btn" onClick={reglage} aria-label="Réglage machine">
                <Puce>{reglageAffiche || 'Réglage ?'}</Puce>
              </button>
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
                Cible du jour : <b class="sc-num">{cible}</b>
              </div>
            )}
            <div class="sc-attenue">
              Repos :{' '}
              <button type="button" class="sc-lien sc-lien-inline" onClick={() => setReglerRepos(!reglerRepos)} aria-label="Régler la durée du repos">
                {dureeTexte(reposBloc)} ✎
              </button>
            </div>
            {notes.map((n) => (
              <p key={n} class="sc-note">{n}</p>
            ))}

            {conseilsExercice(nom(plan.actif)) && <PanneauConseils key={nom(plan.actif)} fiche={conseilsExercice(nom(plan.actif))!} titre={`Conseils · ${nom(plan.actif)}`} />}          </div>

          <ol class="sc-series">
            {faites.map((s, i) => (
              <li key={s.id}>
                <button type="button" class={`sc-serie fait${edition?.id === s.id ? ' cur' : ''}`} onClick={() => setEdition(edition?.id === s.id ? undefined : s)}>
                  <span class="sc-n">{i + 1}</span>
                  <span class="sc-num">
                    {formatCharge(s)} × {s.reps}
                    {s.rir != null ? ` · RIR ${s.rir}` : ''}
                  </span>
                  <span class="sc-ok">{s.type === 'echauffement' ? 'échauf.' : '✓'}</span>
                </button>
              </li>
            ))}
            {!edition && (
              <li>
                <div class="sc-serie cur">
                  <span class="sc-n">{faites.length + 1}</span>
                  <span class="sc-attenue">en cours</span>
                  <span />
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
                    unite={saisie.modeCharge === 'par_main' ? 'kg/main' : saisie.modeCharge === 'lest' ? 'kg lest' : 'kg'}
                    pas={pasCharge(exercice?.equipement)}
                    decimales={2}
                  />
                )}
                <Stepper id="sc-reps" valeur={saisie.reps} onChange={(v) => setSaisie({ ...saisie, reps: v })} unite="reps" min={0} max={200} decimales={0} />
              </div>
              {rirVisible && (
                <Stepper id="sc-rir" valeur={saisie.rir ?? 2} onChange={(v) => setSaisie({ ...saisie, rir: v })} unite="reps en réserve" min={0} max={10} decimales={0} />
              )}
              <div class="sc-options">
                <button type="button" class="sc-option" aria-pressed={saisie.type === 'echauffement'} onClick={() => setSaisie({ ...saisie, type: saisie.type === 'echauffement' ? 'travail' : 'echauffement' })}>
                  Échauffement
                </button>
                <button
                  type="button"
                  class="sc-option"
                  aria-pressed={rirVisible}
                  onClick={() => {
                    setRirVisible(!rirVisible);
                    setSaisie({ ...saisie, rir: rirVisible ? undefined : (saisie.rir ?? 2) });
                  }}
                >
                  RIR
                </button>
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
          <Bouton taille="geant" onClick={valider} disabled={occupe || !saisie}>
            Valider la série
          </Bouton>
        ) : null}
        <div class="sc-ligne sc-nav">
          <button type="button" class="sc-lien" disabled={gi <= 0} onClick={() => allerGroupe(gi - 1)}>
            {gi > 0 ? `‹ ${grps[gi - 1].map(nom).join(' + ')}` : ''}
          </button>
          <button type="button" class="sc-lien" disabled={gi >= grps.length - 1} onClick={() => allerGroupe(gi + 1)}>
            {gi < grps.length - 1 ? `${grps[gi + 1].map(nom).join(' + ')} ›` : ''}
          </button>
        </div>
        <div class="sc-ligne">
          <Bouton variante="contour" icone="plus" onClick={() => setChoix(true)}>
            Exercice
          </Bouton>
          {bloc && !faites.length && (
            <Bouton variante="danger" onClick={retirerExercice}>
              Retirer
            </Bouton>
          )}
        </div>
        <PanneauConseils fiche={CONSEILS_SEANCE} titre="Conseils de séance" />
      </div>
    </section>
  );
}
