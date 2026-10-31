// Calculs de progression : fonctions pures, sans accès à la base. Propriétaire : 05-progression.
// Charge effective et 1RM : règles partagées de src/core/calculs.ts (01).
import { chargeEffective, unRmEstime } from '../../core/calculs';
import type { Exercice, Id, Seance, Serie } from '../../core/types';

export type Mesure = 'un_rm' | 'charge_max' | 'volume';

/** Filtre de variante : `undefined` = toutes, `null` = sans variante, sinon l'id. */
export type FiltreVariante = Id | null | undefined;

export interface PointSeance {
  seanceId: Id;
  date: string;
  unRm: number | null;
  chargeMax: number | null;
  volume: number;
  /** Poids corporel inconnu pour une série lestée ou au poids du corps : valeurs sous-estimées. */
  poidsInconnu: boolean;
  /** Séries de travail, dans l'ordre. */
  series: Serie[];
}

export const estDeTravail = (s: Pick<Serie, 'type'>) => s.type !== 'echauffement';
const dependDuPoids = (s: Pick<Serie, 'modeCharge'>) => s.modeCharge === 'lest' || s.modeCharge === 'sans_charge';
const arrondi = (n: number, pas = 0.1) => Math.round(n / pas) * pas;

/**
 * Poids corporel à utiliser pour chaque séance : celui de la séance, sinon le dernier connu avant elle.
 */
export function poidsParSeance(seances: Pick<Seance, 'id' | 'debut' | 'contexte'>[]): Map<Id, number | undefined> {
  const tri = [...seances].sort((a, b) => a.debut.localeCompare(b.debut));
  const res = new Map<Id, number | undefined>();
  let dernier: number | undefined;
  for (const s of tri) {
    if (s.contexte?.poidsCorporelKg != null) dernier = s.contexte.poidsCorporelKg;
    res.set(s.id, dernier);
  }
  return res;
}

const correspondVariante = (s: Serie, f: FiltreVariante) => f === undefined || (f === null ? !s.varianteId : s.varianteId === f);

/** Un point par séance pour un exercice (séries d'échauffement exclues), du plus ancien au plus récent. */
export function pointsExercice(
  series: Serie[],
  seances: Map<Id, Pick<Seance, 'debut'>>,
  poids: Map<Id, number | undefined>,
  exerciceId: Id,
  variante?: FiltreVariante,
): PointSeance[] {
  const parSeance = new Map<Id, Serie[]>();
  for (const s of series) {
    if (s.exerciceId !== exerciceId || !estDeTravail(s) || !correspondVariante(s, variante)) continue;
    const l = parSeance.get(s.seanceId) ?? [];
    l.push(s);
    parSeance.set(s.seanceId, l);
  }
  const points: PointSeance[] = [];
  for (const [seanceId, l] of parSeance) {
    l.sort((a, b) => a.ordre - b.ordre || a.faiteLe.localeCompare(b.faiteLe));
    const p = poids.get(seanceId);
    let unRm: number | null = null;
    let chargeMax: number | null = null;
    let vol = 0;
    for (const s of l) {
      const c = chargeEffective(s, p);
      const r = unRmEstime(s, p);
      if (c != null && (chargeMax == null || c > chargeMax)) chargeMax = c;
      if (r != null && (unRm == null || r > unRm)) unRm = r;
      vol += (c ?? 0) * s.reps;
    }
    points.push({
      seanceId,
      date: seances.get(seanceId)?.debut ?? l[0].faiteLe,
      unRm,
      chargeMax,
      volume: vol,
      poidsInconnu: p == null && l.some(dependDuPoids),
      series: l,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function valeurMesure(p: PointSeance, m: Mesure): number | null {
  return m === 'un_rm' ? p.unRm : m === 'charge_max' ? p.chargeMax : p.volume || null;
}

/** Écart entre la dernière valeur et la première valeur des `jours` derniers jours. `null` si moins de 2 points. */
export function tendance(points: PointSeance[], m: Mesure, jours = 84, maintenant = new Date()): { delta: number; semaines: number } | null {
  const debut = maintenant.getTime() - jours * 864e5;
  const pts = points.filter((p) => new Date(p.date).getTime() >= debut && valeurMesure(p, m) != null);
  if (pts.length < 2) return null;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const semaines = Math.max(1, Math.round((new Date(b.date).getTime() - new Date(a.date).getTime()) / (7 * 864e5)));
  return { delta: valeurMesure(b, m)! - valeurMesure(a, m)!, semaines };
}

// ---------------------------------------------------------------- Records

export type TypeRecord = 'un_rm' | 'charge_max' | 'reps_a_charge' | 'volume_seance';

export interface RecordPerso {
  type: TypeRecord;
  exerciceId: Id;
  varianteId?: Id;
  valeur: number;
  /** Pour `reps_a_charge` : la charge effective (kg). */
  chargeKg?: number;
  serieId?: Id;
  seanceId: Id;
  date: string;
  /** Lest seul, pour un libellé « +10 kg ». */
  lestKg?: number;
}

const cleVariante = (s: Pick<Serie, 'exerciceId' | 'varianteId'>) => `${s.exerciceId}|${s.varianteId ?? ''}`;

/** État courant des meilleurs résultats d'un exercice (ou d'une variante). */
interface Meilleurs {
  unRm?: RecordPerso;
  chargeMax?: RecordPerso;
  /** Clé = charge effective arrondie à 0,5 kg. */
  repsACharge: Map<number, RecordPerso>;
  volumeSeance?: RecordPerso;
  volumeEnCours: Map<Id, number>;
}

const nouveauxMeilleurs = (): Meilleurs => ({ repsACharge: new Map(), volumeEnCours: new Map() });

/**
 * Applique une série à l'état et renvoie les records battus. Rien n'est renvoyé pour la toute première
 * série d'un exercice : un record suppose un précédent.
 */
function appliquer(m: Meilleurs, s: Serie, poids: number | undefined, date: string): RecordPerso[] {
  if (!estDeTravail(s)) return [];
  const premiere = m.chargeMax == null && m.unRm == null && m.volumeEnCours.size === 0;
  const battus: RecordPerso[] = [];
  const base = { exerciceId: s.exerciceId, varianteId: s.varianteId, serieId: s.id, seanceId: s.seanceId, date, lestKg: s.modeCharge === 'lest' ? s.chargeKg : undefined };
  const c = chargeEffective(s, poids);
  const r = unRmEstime(s, poids);
  const eps = 1e-9;

  if (r != null && (!m.unRm || r > m.unRm.valeur + eps)) {
    m.unRm = { ...base, type: 'un_rm', valeur: r };
    battus.push(m.unRm);
  }
  if (c != null && c > 0 && (!m.chargeMax || c > m.chargeMax.valeur + eps)) {
    m.chargeMax = { ...base, type: 'charge_max', valeur: c };
    battus.push(m.chargeMax);
  }
  if (c != null && c > 0 && s.reps > 0) {
    const cle = arrondi(c, 0.5);
    const avant = m.repsACharge.get(cle);
    if (!avant || s.reps > avant.valeur) {
      const rec: RecordPerso = { ...base, type: 'reps_a_charge', valeur: s.reps, chargeKg: cle };
      m.repsACharge.set(cle, rec);
      // Seulement si la charge était déjà connue : sinon c'est juste une nouvelle charge.
      if (avant) battus.push(rec);
    }
  }
  const vol = (m.volumeEnCours.get(s.seanceId) ?? 0) + (c ?? 0) * s.reps;
  m.volumeEnCours.set(s.seanceId, vol);
  if (vol > 0 && (!m.volumeSeance || vol > m.volumeSeance.valeur + eps)) {
    const ancien = m.volumeSeance;
    m.volumeSeance = { ...base, type: 'volume_seance', valeur: vol };
    // Le volume d'une séance grimpe série après série : on ne signale que le passage au-dessus d'une autre séance.
    if (ancien && ancien.seanceId !== s.seanceId) battus.push(m.volumeSeance);
  }
  return premiere ? [] : battus;
}

function trierSeries(series: Serie[]) {
  return [...series].sort((a, b) => a.faiteLe.localeCompare(b.faiteLe) || a.ordre - b.ordre);
}

export interface BilanRecords {
  /** Records actuels, par clé `exerciceId|varianteId`. */
  actuels: Map<string, { unRm?: RecordPerso; chargeMax?: RecordPerso; volumeSeance?: RecordPerso; repsACharge: RecordPerso[] }>;
  /** Chaque record battu, dans l'ordre chronologique (première série de chaque exercice exclue). */
  evenements: RecordPerso[];
}

/** Rejoue tout l'historique pour retrouver les records actuels et les moments où ils ont été battus. */
export function bilanRecords(series: Serie[], poids: Map<Id, number | undefined>): BilanRecords {
  const etats = new Map<string, Meilleurs>();
  const evenements: RecordPerso[] = [];
  for (const s of trierSeries(series)) {
    const cle = cleVariante(s);
    let m = etats.get(cle);
    if (!m) etats.set(cle, (m = nouveauxMeilleurs()));
    evenements.push(...appliquer(m, s, poids.get(s.seanceId), s.faiteLe));
  }
  const actuels: BilanRecords['actuels'] = new Map();
  for (const [cle, m] of etats) {
    actuels.set(cle, { unRm: m.unRm, chargeMax: m.chargeMax, volumeSeance: m.volumeSeance, repsACharge: [...m.repsACharge.values()].sort((a, b) => b.chargeKg! - a.chargeKg!) });
  }
  return { actuels, evenements };
}

/**
 * Pour l'écran de séance (04) : records battus par `nouvelle`, d'après l'historique du même exercice
 * et de la même variante (les séries de la séance en cours déjà validées comprises).
 * Ordre d'importance : 1RM, charge max, reps à une charge, volume de séance.
 */
export function recordsBattusPar(
  nouvelle: Serie,
  historique: Serie[],
  poids: Map<Id, number | undefined>,
): RecordPerso[] {
  const m = nouveauxMeilleurs();
  const cle = cleVariante(nouvelle);
  for (const s of trierSeries(historique)) {
    if (s.id !== nouvelle.id && cleVariante(s) === cle) appliquer(m, s, poids.get(s.seanceId), s.faiteLe);
  }
  return appliquer(m, nouvelle, poids.get(nouvelle.seanceId), nouvelle.faiteLe);
}

// ---------------------------------------------------------------- Libellés

export const kg = (n: number) => `${arrondi(n, n >= 100 ? 1 : 0.5).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`;
export const nombre = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function libelleRecord(r: RecordPerso, nomExercice: string): string {
  switch (r.type) {
    case 'un_rm':
      return `${nomExercice} · 1RM estimé ${kg(r.valeur)}`;
    case 'charge_max':
      return `${nomExercice} · charge max ${kg(r.valeur)}`;
    case 'reps_a_charge':
      return `${nomExercice} · ${r.valeur} reps à ${r.lestKg != null ? `+${kg(r.lestKg)}` : kg(r.chargeKg!)}`;
    case 'volume_seance':
      return `${nomExercice} · volume ${nombre(r.valeur)} kg`;
  }
}

export const NOM_TYPE_RECORD: { [t in TypeRecord]: string } = {
  un_rm: '1RM estimé',
  charge_max: 'Charge max',
  reps_a_charge: 'Reps à une charge',
  volume_seance: 'Volume de séance',
};

// ---------------------------------------------------------------- Vue globale

/** Lundi 00:00 (heure locale) de la semaine de `d`. */
export function debutSemaine(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

/** Nombre de séances par semaine, des `n` dernières semaines (la plus ancienne d'abord). */
export function seancesParSemaine(seances: Pick<Seance, 'debut'>[], n = 12, maintenant = new Date()): { semaine: Date; nb: number }[] {
  const lundi = debutSemaine(maintenant);
  const res = Array.from({ length: n }, (_, i) => {
    const s = new Date(lundi);
    s.setDate(s.getDate() - 7 * (n - 1 - i));
    return { semaine: s, nb: 0 };
  });
  const t0 = res[0].semaine.getTime();
  for (const s of seances) {
    const t = debutSemaine(new Date(s.debut)).getTime();
    if (t < t0) continue;
    const i = res.findIndex((r) => r.semaine.getTime() === t);
    if (i >= 0) res[i].nb++;
  }
  return res;
}

/**
 * Semaines consécutives avec au moins une séance, en remontant depuis aujourd'hui.
 * La semaine en cours ne casse pas la série si elle est encore vide.
 */
export function semainesDAffilee(seances: Pick<Seance, 'debut'>[], maintenant = new Date()): number {
  const semaines = new Set(seances.map((s) => debutSemaine(new Date(s.debut)).getTime()));
  const cur = debutSemaine(maintenant);
  if (!semaines.has(cur.getTime())) cur.setDate(cur.getDate() - 7);
  let n = 0;
  while (semaines.has(cur.getTime())) {
    n++;
    cur.setDate(cur.getDate() - 7);
  }
  return n;
}

/** Volume (charge effective × reps, hors échauffement) par groupe musculaire depuis `depuis`. Un exercice compte pour chacun de ses groupes. */
export function volumeParGroupe(
  series: Serie[],
  exercices: Map<Id, Pick<Exercice, 'groupesMusculaires'>>,
  poids: Map<Id, number | undefined>,
  depuis: Date,
): { groupe: string; volume: number; series: number }[] {
  const t = depuis.toISOString();
  const acc = new Map<string, { volume: number; series: number }>();
  for (const s of series) {
    if (!estDeTravail(s) || s.faiteLe < t) continue;
    const groupes = exercices.get(s.exerciceId)?.groupesMusculaires;
    if (!groupes?.length) continue;
    const v = (chargeEffective(s, poids.get(s.seanceId)) ?? 0) * s.reps;
    for (const g of groupes) {
      const a = acc.get(g) ?? { volume: 0, series: 0 };
      a.volume += v;
      a.series++;
      acc.set(g, a);
    }
  }
  return [...acc].map(([groupe, a]) => ({ groupe, ...a })).sort((a, b) => b.volume - a.volume || b.series - a.series);
}

/** Résumé d'une séance pour l'historique. */
export function resumeSeance(series: Serie[], poids: number | undefined) {
  const travail = series.filter(estDeTravail);
  return {
    nbSeries: travail.length,
    nbExercices: new Set(travail.map((s) => s.exerciceId)).size,
    volume: travail.reduce((v, s) => v + (chargeEffective(s, poids) ?? 0) * s.reps, 0),
  };
}
