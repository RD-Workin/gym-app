// « Quoi de neuf » affiché une fois après chaque mise à jour. Propriétaire : 01.
// Pour annoncer une nouveauté : ajouter une entrée EN TÊTE avec un numéro plus grand (demander à 01).

export interface Nouveaute {
  numero: number;
  date: string;
  points: string[];
}

export const NOUVEAUTES: Nouveaute[] = [
  {
    numero: 1,
    date: '2026-10-31',
    points: [
      'Séances guidées à partir de tes modèles Push, Pull et Jambes, avec minuteur de repos.',
      'Bibliothèque d’exercices avec photos, variantes et catalogue illustré.',
      'Progression : courbes, 1RM estimé et records (avec célébration en séance).',
      'Météo automatique au début de la séance (désactivable dans Réglages).',
      'Sauvegarde et restauration de tes données, avec un rappel tous les 7 jours.',
    ],
  },
];

export const DERNIERE_NOUVEAUTE = Math.max(...NOUVEAUTES.map((n) => n.numero));
export const CLE_NOUVEAUTES_VUES = 'nouveautesVues';
