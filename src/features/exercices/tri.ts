// Tri et filtres des listes d'exercices (bibliothèque, choix en séance / modèles). Propriétaire : 03-exercices.
// Fonctions pures, testées dans tests/unit/tri.test.ts.
import type { Equipement, Exercice } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';

export type Tri = 'nom' | 'recent' | 'muscle';
export const TRIS: Record<Tri, string> = { nom: 'A → Z', recent: 'Récents', muscle: 'Par muscle' };

type Trié = Pick<Exercice, 'id' | 'nom' | 'groupesMusculaires'> & { favori?: boolean };

const comparerNom = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

/** Favoris en haut, puis selon le tri choisi. `derniers` : exerciceId → date ISO de la dernière série. */
export function trierExercices<T extends Trié>(liste: T[], tri: Tri, derniers?: Map<string, string>): T[] {
  return [...liste].sort((a, b) => {
    if (!!a.favori !== !!b.favori) return a.favori ? -1 : 1;
    if (tri === 'recent') {
      const da = derniers?.get(a.id) ?? '';
      const db = derniers?.get(b.id) ?? '';
      if (da !== db) return da < db ? 1 : -1;
    } else if (tri === 'muscle') {
      const ma = a.groupesMusculaires[0] ? libelleGroupe(a.groupesMusculaires[0]) : '￿';
      const mb = b.groupesMusculaires[0] ? libelleGroupe(b.groupesMusculaires[0]) : '￿';
      const c = comparerNom(ma, mb);
      if (c) return c;
    }
    return comparerNom(a.nom, b.nom);
  });
}

export interface Filtres {
  favoris?: boolean;
  muscles?: string[];
  equipement?: Equipement | '';
}

export const passeFiltres = (e: Pick<Exercice, 'groupesMusculaires' | 'equipement'> & { favori?: boolean }, f: Filtres) =>
  (!f.favoris || !!e.favori) &&
  (!f.muscles?.length || e.groupesMusculaires.some((g) => f.muscles!.includes(g))) &&
  (!f.equipement || e.equipement === f.equipement);
