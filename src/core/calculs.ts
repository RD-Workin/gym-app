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
      return poidsCorporelKg != null ? poidsCorporelKg + c : c;
    case 'sans_charge':
      return poidsCorporelKg ?? 0;
  }
}

/** 1RM estimé (Epley). `null` au-delà de 12 reps, pour l'échauffement ou sans charge. */
export function unRmEstime(serie: Pick<Serie, 'chargeKg' | 'modeCharge' | 'reps' | 'type'>, poidsCorporelKg?: number): number | null {
  if (serie.type === 'echauffement' || serie.reps < 1 || serie.reps > 12) return null;
  const charge = chargeEffective(serie, poidsCorporelKg);
  if (!charge) return null;
  return serie.reps === 1 ? charge : charge * (1 + serie.reps / 30);
}

export function volume(serie: Pick<Serie, 'chargeKg' | 'modeCharge' | 'reps'>, poidsCorporelKg?: number): number {
  return (chargeEffective(serie, poidsCorporelKg) ?? 0) * serie.reps;
}
