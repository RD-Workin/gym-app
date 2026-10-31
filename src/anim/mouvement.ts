/** Vrai si l'utilisateur a demandé moins d'animations (Réglages iOS › Accessibilité › Mouvement). */
export const mouvementReduit = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
