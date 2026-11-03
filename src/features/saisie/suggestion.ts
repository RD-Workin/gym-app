// Suggestions de la saisie rapide : fonctions pures, testées. Propriétaire : 05-progression.
import { signeLest } from '../../core/calculs';
import type { ModeCharge, Serie } from '../../core/types';
import type { PointSeance } from '../progression/calculs';

/** Charge effective équivalente à un 1RM pour `reps` répétitions (Epley inversé). */
export const chargePourReps = (unRm: number, reps: number) => (reps <= 1 ? unRm : unRm / (1 + reps / 30));

/** Charge effective (kg réellement déplacés) → valeur à noter selon le mode de charge. */
export function versChargeNotee(effective: number, mode: ModeCharge, poidsCorporelKg?: number): number {
  if (mode === 'par_main') return effective / 2;
  // Lest : négatif si la charge visée est sous le poids du corps (aide d'un élastique ou d'une machine).
  if (mode === 'lest') return poidsCorporelKg != null ? effective - poidsCorporelKg : Math.max(0, effective);
  return effective;
}

export const arrondirAuPas = (v: number, pas: number, min = 0) => Math.max(min, Math.round(v / pas) * pas);

/** 1RM de référence : le meilleur des `n` dernières séances (forme récente, pas un vieux record). */
export function unRmRecent(points: PointSeance[], n = 3): number | null {
  const r = points.slice(-n).map((p) => p.unRm).filter((v): v is number => v != null);
  return r.length ? Math.max(...r) : null;
}

/** Max projeté sur les ~3 derniers mois : meilleur 1RM + tendance hebdo prolongée de 4 semaines (borné à +10 %). */
export function maxProjete(points: PointSeance[], maintenant = new Date()): number | null {
  const depuis = maintenant.getTime() - 84 * 86400000;
  const pts = points.filter((p) => p.unRm != null && new Date(p.date).getTime() >= depuis);
  const ref = unRmRecent(points);
  if (ref == null) return null;
  if (pts.length < 3) return ref;
  // Régression linéaire du 1RM en fonction du temps (en semaines).
  const xs = pts.map((p) => new Date(p.date).getTime() / (7 * 86400000));
  const ys = pts.map((p) => p.unRm!);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const pente = den ? num / den : 0;
  if (pente <= 0) return ref;
  return Math.min(ref * 1.1, ref + pente * 4);
}

export interface LignePrerempli {
  reps: number;
  chargeKg?: number;
  dureeSec?: number;
}

/** Dernière séance de l'exercice → les mêmes séries, chacune avec ses reps (ou secondes) et sa charge. */
export function depuisDerniereFois(derniere: Pick<Serie, 'reps' | 'chargeKg' | 'dureeSec'>[] | undefined): LignePrerempli[] | null {
  if (!derniere?.length) return null;
  return derniere.map((s) => ({ reps: s.reps, chargeKg: s.chargeKg, ...(s.dureeSec != null ? { dureeSec: s.dureeSec } : {}) }));
}

/** « 28 kg · 10-8 / 26 kg · 9 » : charges groupées dans l'ordre, reps de chaque série (« 45-40 s » pour des séries tenues). */
export function resumeLignes(l: LignePrerempli[], unite = 'kg'): string {
  const parts: { c?: number; reps: number[] }[] = [];
  for (const x of l) {
    const v = x.dureeSec ?? x.reps;
    const d = parts[parts.length - 1];
    if (d && d.c === x.chargeKg) d.reps.push(v);
    else parts.push({ c: x.chargeKg, reps: [v] });
  }
  const s = l.some((x) => x.dureeSec != null) ? ' s' : '';
  return parts.map((p) => `${p.c == null ? '' : `${unite.includes('lest') ? signeLest(p.c) : ''}${fmt(p.c)} ${unite} · `}${p.reps.join('-')}${s}`).join(' / ');
}

export interface Suggestion {
  /** Charge à noter (même unité que le mode de charge). */
  chargeKg: number;
  /** Même effort que ta meilleure forme récente. */
  solide: number;
  texte: string;
  source: 'historique' | 'force_generale';
}

/**
 * Charge suggérée pour `reps` répétitions.
 * - Avec historique : 1RM récent → charge équivalente, plus un cran « à tester » pour progresser.
 * - Sans historique : 1RM des autres exercices du même muscle (médiane), avec une marge prudente.
 */
export function suggererCharge(o: {
  points: PointSeance[];
  reps: number;
  mode: ModeCharge;
  pas: number;
  poidsCorporelKg?: number;
  /** 1RM récents des autres exercices du même muscle principal (charge effective), même équipement en priorité. */
  autres?: { unRm: number; memeEquipement: boolean }[];
  nomMuscle?: string;
  /** Unité affichée (« kg/main », « kg lest »). */
  unite?: string;
}): Suggestion | null {
  const u = o.unite ?? 'kg';
  if (o.mode === 'sans_charge' || o.reps < 1 || o.reps > 12) return null;
  const f = (v: number) => (o.mode === 'lest' ? signeLest(v) : '') + fmt(v);
  const minNote = o.mode === 'lest' && o.poidsCorporelKg != null ? -o.poidsCorporelKg : 0;
  const ref = unRmRecent(o.points);
  if (ref != null) {
    const solide = arrondirAuPas(versChargeNotee(chargePourReps(ref, o.reps), o.mode, o.poidsCorporelKg), o.pas, minNote);
    return {
      chargeKg: solide + o.pas,
      solide,
      texte: `D'après ton 1RM estimé récent (${Math.round(ref)} kg${o.mode === 'lest' ? ', poids du corps compris' : ''}) : ${f(solide)} ${u} pour ${o.reps} reps, ${f(solide + o.pas)} ${u} pour tenter de progresser.`,
      source: 'historique',
    };
  }
  const autres = o.autres ?? [];
  const pool = autres.some((a) => a.memeEquipement) ? autres.filter((a) => a.memeEquipement) : autres;
  if (!pool.length) return null;
  const tri = pool.map((a) => a.unRm).sort((a, b) => a - b);
  const mediane = tri[Math.floor(tri.length / 2)];
  // Exercice nouveau : marge de 30 % (technique, angle, machine différente).
  const est = mediane * 0.7;
  const solide = arrondirAuPas(versChargeNotee(chargePourReps(est, o.reps), o.mode, o.poidsCorporelKg), o.pas, minNote);
  return {
    chargeKg: solide,
    solide,
    texte: `Pas encore d'historique : estimation prudente d'après tes autres exercices${o.nomMuscle ? ` (${o.nomMuscle})` : ''}. Commence à ${f(solide)} ${u} et ajuste.`,
    source: 'force_generale',
  };
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
