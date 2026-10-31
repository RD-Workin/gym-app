// Logique de la séance en cours (propriétaire : 04-seance).
// Toute saisie est écrite tout de suite dans IndexedDB : fermer l'app ne perd rien.
import Dexie from 'dexie';
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
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
 * Valeurs préremplies pour la prochaine série : la série d'avant dans cette séance,
 * sinon la série de même rang la dernière fois, sinon la cible du modèle.
 */
export function preremplir(exercice: Exercice | undefined, bloc: BlocModele, faites: Serie[], avant: Serie[]): Saisie {
  const modeCharge = exercice?.modeCharge ?? 'total';
  const ref = faites[faites.length - 1] ?? avant[faites.length] ?? avant[avant.length - 1];
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
  const unite = series[0].modeCharge === 'par_main' ? ' kg/main' : series[0].modeCharge === 'lest' ? ' kg lest' : ' kg';
  const ch = charges.every((c) => c == null) ? 'PdC' : charges.map(kg).join('/') + unite;
  return `${ch} · ${series.map((s) => s.reps).join('-')}`;
}

export const formatCharge = (s: Pick<Serie, 'chargeKg' | 'modeCharge'>) =>
  s.modeCharge === 'sans_charge' || s.chargeKg == null
    ? 'PdC'
    : `${s.modeCharge === 'lest' ? '+' : ''}${kg(s.chargeKg)} kg${s.modeCharge === 'par_main' ? '/main' : ''}`;

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
