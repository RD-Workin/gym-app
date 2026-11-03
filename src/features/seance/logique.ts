// Logique de la séance en cours (propriétaire : 04-seance).
// Toute saisie est écrite tout de suite dans IndexedDB : fermer l'app ne perd rien.
import Dexie from 'dexie';
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import { signeLest, uniteCharge } from '../../core/calculs';
import type { BlocModele, Exercice, Id, Modele, ModeCharge, Seance, Serie, TypeSerie } from '../../core/types';
import { remplirContexte } from '../contexte/contexte';

/** État de l'écran gardé dans `reglages` (clé ci-dessous) : plan, exercice affiché, repos. */
export interface PlanSeance {
  seanceId: Id;
  blocs: BlocModele[];
  actif: number;
  /** Fin du repos en ms (Date.now()). */
  reposFin?: number;
  reposDuree?: number;
  /** Échauffement accepté pour un bloc : séries à faire avant les séries de travail. */
  echauffement?: { blocId: Id; etapes: EtapeEchauffement[] };
  /** Blocs dont l'échauffement proposé a été passé (ou fini) : on ne le repropose pas. */
  echauffementPasse?: Id[];
}

export const CLE_PLAN = 'seance.plan';
export const REPOS_DEFAUT_SEC = 90;

export async function lirePlan(seance: Seance): Promise<PlanSeance> {
  const r = await db.reglages.get(CLE_PLAN);
  const plan = r?.valeur as PlanSeance | undefined;
  if (plan && plan.seanceId === seance.id) return plan;
  // Plan absent (ancienne version, autre appareil) : reconstruit depuis le modèle et les séries faites.
  const modele = seance.modeleId ? await db.modeles.get(seance.modeleId) : undefined;
  const blocs = [...(modele?.blocs ?? [])];
  const series = await db.series.where('seanceId').equals(seance.id).sortBy('ordre');
  for (const s of series) {
    if (!blocs.some((b) => b.exerciceId === s.exerciceId)) {
      blocs.push({ id: nouvelId(), exerciceId: s.exerciceId, supersetId: s.supersetId });
    }
  }
  const p: PlanSeance = { seanceId: seance.id, blocs, actif: 0 };
  await ecrirePlan(p);
  return p;
}

export const ecrirePlan = (p: PlanSeance) => db.reglages.put({ cle: CLE_PLAN, valeur: p });

export async function demarrerSeance(modele?: Modele): Promise<Id> {
  const enCours = await db.seances.filter((s) => !s.fin).first();
  if (enCours) return enCours.id;
  const t = maintenant();
  const precedente = await db.seances.orderBy('debut').reverse().first();
  const seance: Seance = {
    id: nouvelId(),
    modeleId: modele?.id,
    debut: t,
    contexte: precedente?.contexte.poidsCorporelKg ? { poidsCorporelKg: precedente.contexte.poidsCorporelKg } : {},
    creeLe: t,
    modifieLe: t,
  };
  await db.transaction('rw', db.seances, db.reglages, async () => {
    await db.seances.add(seance);
    await ecrirePlan({ seanceId: seance.id, blocs: (modele?.blocs ?? []).map((b) => ({ ...b })), actif: 0 });
  });
  void remplirContexte(seance.id);
  return seance.id;
}

export async function terminerSeance(seanceId: Id): Promise<'terminee' | 'supprimee'> {
  const n = await db.series.where('seanceId').equals(seanceId).count();
  await db.transaction('rw', db.seances, db.reglages, async () => {
    if (n === 0) await db.seances.delete(seanceId);
    else await db.seances.update(seanceId, { fin: maintenant(), modifieLe: maintenant() });
    await db.reglages.delete(CLE_PLAN);
  });
  return n === 0 ? 'supprimee' : 'terminee';
}

export async function supprimerSeance(seanceId: Id) {
  await db.transaction('rw', db.seances, db.series, db.reglages, async () => {
    await db.series.where('seanceId').equals(seanceId).delete();
    await db.seances.delete(seanceId);
    const p = (await db.reglages.get(CLE_PLAN))?.valeur as PlanSeance | undefined;
    if (p?.seanceId === seanceId) await db.reglages.delete(CLE_PLAN);
  });
}

export interface Saisie {
  chargeKg?: number;
  reps: number;
  rir?: number;
  type: TypeSerie;
  modeCharge: ModeCharge;
  reglagesMachine?: string;
}

export async function enregistrerSerie(seanceId: Id, bloc: BlocModele, saisie: Saisie, existante?: Serie): Promise<Serie | undefined> {
  const t = maintenant();
  if (existante) {
    await db.series.update(existante.id, { ...saisie, modifieLe: t });
    return;
  }
  const dernier = await db.series.where('seanceId').equals(seanceId).reverse().sortBy('ordre');
  const serie: Serie = {
    id: nouvelId(),
    seanceId,
    exerciceId: bloc.exerciceId,
    varianteId: bloc.varianteId,
    supersetId: bloc.supersetId,
    ordre: (dernier[0]?.ordre ?? 0) + 1,
    ...saisie,
    faiteLe: t,
    creeLe: t,
    modifieLe: t,
  };
  await db.series.add(serie);
  return serie;
}

/** Séries de travail de la dernière séance (hors séance courante) qui contient cet exercice. */
export async function derniereFois(exerciceId: Id, saufSeanceId?: Id): Promise<Serie[]> {
  const recentes = await db.series
    .where('[exerciceId+faiteLe]')
    .between([exerciceId, Dexie.minKey], [exerciceId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.seanceId !== saufSeanceId)
    .limit(1)
    .toArray();
  const seanceId = recentes[0]?.seanceId;
  if (!seanceId) return [];
  const toutes = await db.series.where('seanceId').equals(seanceId).sortBy('ordre');
  return toutes.filter((s) => s.exerciceId === exerciceId && s.type !== 'echauffement');
}

/** Premier nombre de « 8-10 », « 12 », sinon `undefined`. */
export const repsDepuisCible = (cible?: string) => {
  const m = cible?.match(/\d+/);
  return m ? Number(m[0]) : undefined;
};

/**
 * Valeurs préremplies pour la prochaine série : la série de même rang la dernière fois
 * (ex. S2 = 8 × 70 si c'était S2 la semaine d'avant). Si la charge a été changée aujourd'hui
 * sur la série précédente, on garde la charge du jour avec les reps de la dernière fois.
 * Sans dernière fois : la série d'avant dans cette séance, sinon la cible du modèle.
 */
export function preremplir(exercice: Exercice | undefined, bloc: BlocModele, faites: Serie[], avant: Serie[], echauffement?: EtapeEchauffement[]): Saisie {
  const modeCharge = exercice?.modeCharge ?? 'total';
  // Échauffement accepté et pas fini : la prochaine série est l'étape suivante.
  const etape = echauffement?.[faites.filter((s) => s.type === 'echauffement').length];
  if (etape && !faites.some((s) => s.type !== 'echauffement')) {
    return { chargeKg: etape.chargeKg, reps: etape.reps, type: 'echauffement', modeCharge };
  }
  // L'échauffement ne sert pas de référence : la 1re série de travail reprend la charge de travail d'avant.
  const travail = faites.filter((s) => s.type !== 'echauffement');
  const n = travail.length;
  const precJour = travail[n - 1];
  const memeRang = avant[n];
  let ref: Pick<Serie, 'chargeKg' | 'reps' | 'modeCharge' | 'reglagesMachine'> | undefined = memeRang ?? precJour ?? avant[avant.length - 1];
  if (memeRang && precJour && avant[n - 1] && precJour.chargeKg !== avant[n - 1].chargeKg) {
    ref = { ...memeRang, chargeKg: precJour.chargeKg, reglagesMachine: precJour.reglagesMachine ?? memeRang.reglagesMachine };
  }
  return {
    chargeKg: ref?.chargeKg ?? (modeCharge === 'sans_charge' ? undefined : 0),
    reps: ref?.reps ?? repsDepuisCible(bloc.repsCibles) ?? 10,
    type: 'travail',
    modeCharge: ref?.modeCharge ?? modeCharge,
    reglagesMachine: ref?.reglagesMachine,
  };
}

const kg = (v?: number) => (v == null ? '' : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }));

/** « 73 kg · 9-8-8-7 » ou « 70/73 kg · 10-8 ». */
export function resumeSeries(series: Serie[]): string {
  if (!series.length) return '';
  const charges = [...new Set(series.map((s) => s.chargeKg))];
  const lest = series[0].modeCharge === 'lest';
  const unite = ` ${uniteCharge(series[0].modeCharge)}`;
  const ch = charges.every((c) => c == null) ? 'PdC' : charges.map((c) => (lest && c != null ? signeLest(c) : '') + kg(c)).join('/') + unite;
  return `${ch} · ${series.map((s) => s.reps).join('-')}`;
}

export const formatCharge = (s: Pick<Serie, 'chargeKg' | 'modeCharge'>) =>
  s.modeCharge === 'sans_charge' || s.chargeKg == null
    ? 'PdC'
    : `${s.modeCharge === 'lest' ? signeLest(s.chargeKg) : ''}${kg(s.chargeKg)} kg${s.modeCharge === 'lest' ? ' de lest' : s.modeCharge === 'par_main' ? '/main' : ''}`;

/** Groupes d'affichage : blocs consécutifs au même `supersetId` = un superset. */
export function groupes(blocs: BlocModele[]): number[][] {
  const g: number[][] = [];
  blocs.forEach((b, i) => {
    const prec = g[g.length - 1];
    if (prec && b.supersetId && blocs[prec[0]].supersetId === b.supersetId) prec.push(i);
    else g.push([i]);
  });
  return g;
}

export const dureeTexte = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

/* ---- Repos selon l'objectif (valeurs à valider par 10-coach) ---- */
export type Objectif = 'force' | 'hypertrophie' | 'endurance';
export const OBJECTIFS: Record<Objectif, { libelle: string; reposSec: number; plage: string; reps: string }> = {
  force: { libelle: 'Force', reposSec: 180, plage: '3 à 5 min', reps: '1-6' },
  // 10-coach (revue 2026-11-03) : 6-12 en pratique, 5-30 près de l'échec marchent aussi (Schoenfeld 2021, ACSM 2026) ;
  // ≥ 2 min sur les polyarticulaires, 1 min 30 sur l'isolation (Singer 2024).
  hypertrophie: { libelle: 'Hypertrophie', reposSec: 120, plage: '1 min 30 à 3 min', reps: '6-12' },
  endurance: { libelle: 'Endurance', reposSec: 45, plage: '30 à 60 s', reps: '15-20' },
};
/** Durées proposées en un tap (secondes). */
export const REPOS_RAPIDES = [45, 60, 90, 120, 180, 240];
/** Objectif le plus proche d'une durée de repos. */
export const objectifDepuisRepos = (sec?: number): Objectif => (sec == null ? 'hypertrophie' : sec >= 180 ? 'force' : sec <= 60 ? 'endurance' : 'hypertrophie');

/**
 * Progrès d'une série de travail par rapport à la série de même rang la dernière fois (bulle « Strava »).
 * Plus de charge (ou moins d'aide) d'abord, sinon plus de reps à charge égale. `undefined` sinon.
 */
export function progresVsDerniereFois(serie: Pick<Serie, 'chargeKg' | 'reps' | 'type' | 'modeCharge'>, avant: Serie[], rang: number): string | undefined {
  if (serie.type === 'echauffement') return undefined;
  const ref = avant[rang];
  if (!ref) return undefined;
  const dc = Math.round(((serie.chargeKg ?? 0) - (ref.chargeKg ?? 0)) * 100) / 100;
  if (serie.modeCharge !== 'sans_charge' && dc > 0 && serie.reps >= Math.max(1, ref.reps - 2)) {
    return `+${dc.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg vs la dernière fois`;
  }
  const dr = serie.reps - ref.reps;
  if (dr > 0 && dc >= 0) return `+${dr} rep${dr > 1 ? 's' : ''} vs la dernière fois`;
  return undefined;
}

/* ---- Échauffement proposé (pourcentages à valider par 10-coach) ---- */
export interface EtapeEchauffement {
  chargeKg: number;
  reps: number;
}
/**
 * Montée progressive vers la charge de travail : 40 % × 8, 60 % × 5, 80 % × 3.
 * Principe courant : quelques séries légères, reps en baisse quand la charge monte, sans fatigue avant
 * les séries de travail. Valeurs et sources à confirmer par 10-coach.
 */
export const ECHAUFFEMENT: { pourcentage: number; reps: number }[] = [
  { pourcentage: 0.4, reps: 8 },
  { pourcentage: 0.6, reps: 5 },
  { pourcentage: 0.8, reps: 3 },
];
/** Repos court entre deux séries d'échauffement. */
export const REPOS_ECHAUFFEMENT_SEC = 60;
/** Charge de travail sous laquelle on ne propose rien (une série légère suffit, l'utilisateur la fait de lui-même). */
const CHARGE_MIN_ECHAUFFEMENT = 20;
const BARRE_VIDE_KG = 20;

/** Pas de charge par équipement (barre, machine, poulie : 2,5 kg ; haltères et autres : 1 kg). */
export const pasCharge = (e?: Exercice['equipement']) => (e === 'barre' || e === 'machine' || e === 'poulie' ? 2.5 : 1);

/**
 * Séries d'échauffement pour une charge de travail : arrondies au pas de l'équipement, barre vide au minimum
 * à la barre, sans doublon ni étape aussi lourde que le travail. Vide si la charge est trop faible.
 */
export function etapesEchauffement(chargeTravailKg: number | undefined, equipement?: Exercice['equipement']): EtapeEchauffement[] {
  if (!chargeTravailKg || chargeTravailKg < CHARGE_MIN_ECHAUFFEMENT) return [];
  const pas = pasCharge(equipement);
  const min = equipement === 'barre' ? BARRE_VIDE_KG : pas;
  const etapes: EtapeEchauffement[] = [];
  for (const { pourcentage, reps } of ECHAUFFEMENT) {
    const c = Math.max(min, Math.round((chargeTravailKg * pourcentage) / pas) * pas);
    if (c >= chargeTravailKg) continue;
    const prec = etapes[etapes.length - 1];
    if (prec && c <= prec.chargeKg) continue;
    etapes.push({ chargeKg: Math.round(c * 100) / 100, reps });
  }
  return etapes;
}

/**
 * L'échauffement est proposé au premier exercice de la séance et à chaque exercice à la barre,
 * avec une charge de travail connue (pas de lest ni de poids du corps), avant toute série notée.
 */
export function echauffementAProposer(
  exercice: Exercice | undefined,
  premierExercice: boolean,
  faites: Serie[],
  chargeTravailKg: number | undefined,
): EtapeEchauffement[] {
  if (!exercice || faites.length) return [];
  if (exercice.modeCharge !== 'total' && exercice.modeCharge !== 'par_main') return [];
  if (!premierExercice && exercice.equipement !== 'barre') return [];
  return etapesEchauffement(chargeTravailKg, exercice.equipement);
}

export const CLE_ECHAUFFEMENT = 'seance.echauffement';
/** Réglage « Proposer un échauffement » (oui par défaut). */
export const echauffementActif = async () => (await db.reglages.get(CLE_ECHAUFFEMENT))?.valeur !== false;
export const reglerEchauffement = (actif: boolean) => db.reglages.put({ cle: CLE_ECHAUFFEMENT, valeur: actif });
