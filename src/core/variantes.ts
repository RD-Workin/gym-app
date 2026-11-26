// Nom de la version « standard » d'un exercice (séries sans variante). Partagé : séance (04), progression (05), fiche (03).
import type { Exercice } from './types';

/** Dips : la version standard, ce sont les barres parallèles (la variante « barre droite » est suivie à part). */
export const sontDipsAuxBarres = (nom: string) => /\bdips?\b/i.test(nom) && !/chaise|banc|bench/i.test(nom);

export const nomStandard = (e?: Pick<Exercice, 'nom'>) => (e && sontDipsAuxBarres(e.nom) ? 'Barres parallèles' : 'Standard');

/** Variante ajoutée aux dips (bibliothèque de départ et correctif des installations existantes). */
export const VARIANTE_DIPS_BARRE_DROITE = 'barre droite';
