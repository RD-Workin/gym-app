import type { Serie } from './types';

/** Charge réellement déplacée, en kg. `null` si non calculable. */
export function chargeEffective(serie: Pick<Serie, 'chargeKg' | 'modeCharge'>, poidsCorporelKg?: number): number | null {
  const c = serie.chargeKg ?? 0;
  switch (serie.modeCharge) {
    case 'total':
      return serie.chargeKg ?? null;
    case 'par_main':
      return serie.chargeKg == null ? null : c * 2;
    case 'lest':
      // Lest négatif = assistance (élastique, machine) : la charge réelle est le poids du corps moins l'aide.
      // Sans poids du corps connu, un lest négatif ne dit rien de la charge réelle.
      if (poidsCorporelKg != null) return Math.max(0, poidsCorporelKg + c);
      return c >= 0 ? c : null;
    case 'sans_charge':
      return poidsCorporelKg ?? 0;
  }
}

/** Série tenue en secondes (gainage, dead hang…) plutôt qu'en reps. */
export const enDuree = (serie: Pick<Serie, 'dureeSec'>) => serie.dureeSec != null;

/** « 45 s », « 1 min », « 1 min 30 ». */
export function fmtDuree(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} s`;
  const r = s % 60;
  return `${Math.floor(s / 60)} min${r ? ` ${String(r).padStart(2, '0')}` : ''}`;
}

/** 1RM estimé (Epley). `null` au-delà de 12 reps, pour l'échauffement, sans charge ou pour une série en durée. */
export function unRmEstime(serie: Pick<Serie, 'chargeKg' | 'modeCharge' | 'reps' | 'type' | 'dureeSec'>, poidsCorporelKg?: number): number | null {
  if (serie.type === 'echauffement' || serie.dureeSec != null || serie.reps < 1 || serie.reps > 12) return null;
  const charge = chargeEffective(serie, poidsCorporelKg);
  if (!charge) return null;
  return serie.reps === 1 ? charge : charge * (1 + serie.reps / 30);
}

export function volume(serie: Pick<Serie, 'chargeKg' | 'modeCharge' | 'reps'>, poidsCorporelKg?: number): number {
  return (chargeEffective(serie, poidsCorporelKg) ?? 0) * serie.reps;
}

/** Bornes du lest saisi : négatif jusqu'à −150 kg d'assistance, positif jusqu'à 300 kg ajoutés. */
export const LEST_MIN_KG = -150;
export const LEST_MAX_KG = 300;

/** Signe à placer devant un lest affiché (« +10 », « −15 », « 0 ») : le « − » vient déjà du nombre. */
export const signeLest = (lestKg: number) => (lestKg > 0 ? '+' : '');

/** Unité affichée à côté de la charge saisie. */
export const uniteCharge = (mode: Serie['modeCharge']) => (mode === 'par_main' ? 'kg/main' : mode === 'lest' ? 'kg de lest' : 'kg');
