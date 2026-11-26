// Hauteur atteinte et explosivité (tractions et exercices proches). Partagé : saisie (04), progression (05), export (06).
// La hauteur est une position de la barre sur le haut du corps, réglée à l'appréciation de l'utilisateur :
// 0 = barre aux yeux (menton sous la barre) … 100 = barre au nombril (passage de muscle-up).
import type { Exercice, Serie } from './types';

export interface Repere {
  valeur: number;
  /** Nom court, sert dans les puces et l'export (« pecs »). */
  nom: string;
  /** Avec article : « aux pecs ». */
  au: string;
}

/** Repères du schéma, du plus bas atteint (barre aux yeux) au plus haut (barre au nombril). */
export const REPERES: Repere[] = [
  { valeur: 0, nom: 'yeux', au: 'aux yeux' },
  { valeur: 20, nom: 'menton', au: 'au menton' },
  { valeur: 40, nom: 'clavicules', au: 'aux clavicules' },
  { valeur: 60, nom: 'pecs', au: 'aux pecs' },
  { valeur: 80, nom: 'bas du sternum', au: 'au bas du sternum' },
  { valeur: 100, nom: 'nombril', au: 'au nombril' },
];

export const HAUTEUR_MIN = 0;
export const HAUTEUR_MAX = 100;

/** Tractions, chin-ups, muscle-ups… (le nom suffit, l'utilisateur peut changer dans la fiche). */
export const sembleTraction = (nom: string) => /traction|pull[- ]?up|chin[- ]?up|muscle[- ]?up/i.test(nom);

/** L'exercice propose de noter la hauteur et l'explosivité : choix de la fiche, sinon d'après le nom. */
export const suitHauteur = (e?: Pick<Exercice, 'nom' | 'suiviHauteur'>) => (e ? (e.suiviHauteur ?? sembleTraction(e.nom)) : false);

export const bornerHauteur = (v: number) => Math.max(HAUTEUR_MIN, Math.min(HAUTEUR_MAX, Math.round(v)));

/**
 * Hauteur en mots, approximative (l'export IA/coach n'a pas le schéma) :
 * « pecs » sur un repère (±4), sinon « entre clavicules et pecs ».
 */
export function hauteurTexte(v: number): string {
  const proche = REPERES.find((r) => Math.abs(r.valeur - v) <= 4);
  if (proche) return proche.nom;
  const haut = REPERES.find((r) => r.valeur > v) ?? REPERES[REPERES.length - 1];
  const bas = [...REPERES].reverse().find((r) => r.valeur < v) ?? REPERES[0];
  return `entre ${bas.nom} et ${haut.nom}`;
}

/**
 * Version courte pour les puces : « pecs » sur un repère, sinon le repère le plus proche avec « ≈ » (« ≈ pecs »).
 * Pas de « clavicules-pecs » : lu comme une plage, pas comme une position (relecture 11).
 */
export function hauteurCourte(v: number): string {
  const court = (r: Repere) => (r.nom === 'bas du sternum' ? 'sternum' : r.nom);
  const proche = REPERES.find((r) => Math.abs(r.valeur - v) <= 4);
  if (proche) return court(proche);
  const plusProche = REPERES.reduce((m, r) => (Math.abs(r.valeur - v) <= Math.abs(m.valeur - v) ? r : m));
  return `≈ ${court(plusProche)}`;
}

/** « barre aux pecs », « barre entre menton et clavicules ». */
export function barreTexte(v: number): string {
  const proche = REPERES.find((r) => Math.abs(r.valeur - v) <= 4);
  return proche ? `barre ${proche.au}` : `barre ${hauteurTexte(v)}`;
}

/** Détail d'une série : « barre aux pecs · explosive » ; vide si rien de noté. */
export function detailTraction(s: Pick<Serie, 'hauteur' | 'explosif'>): string {
  const p: string[] = [];
  if (s.hauteur != null) p.push(barreTexte(s.hauteur));
  if (s.explosif) p.push('explosive');
  return p.join(' · ');
}

/** Plus haute barre atteinte d'une liste de séries (séries de travail), sinon `undefined`. */
export function hauteurMax(series: Pick<Serie, 'hauteur' | 'type'>[]): number | undefined {
  let m: number | undefined;
  for (const s of series) if (s.type !== 'echauffement' && s.hauteur != null && (m == null || s.hauteur > m)) m = s.hauteur;
  return m;
}
