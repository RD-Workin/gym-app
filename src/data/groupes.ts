// Groupes musculaires de la bibliothèque (propriétaire : 03-exercices).
// La valeur stockée est la clé ; le libellé sert à l'affichage.
export const GROUPES = {
  pectoraux: 'Pectoraux',
  epaules: 'Épaules',
  trapezes: 'Trapèzes',
  cou: 'Cou',
  dos: 'Dos',
  lombaires: 'Lombaires',
  biceps: 'Biceps',
  triceps: 'Triceps',
  'avant-bras': 'Avant-bras',
  abdos: 'Abdos',
  quadriceps: 'Quadriceps',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
  adducteurs: 'Adducteurs',
  abducteurs: 'Abducteurs',
} as const;

export type Groupe = keyof typeof GROUPES;
export const libelleGroupe = (g: string) => (GROUPES as Record<string, string>)[g] ?? g;

export const EQUIPEMENTS = {
  machine: 'Machine',
  poulie: 'Poulie',
  barre: 'Barre',
  halteres: 'Haltères',
  poids_du_corps: 'Poids du corps',
  kettlebell: 'Kettlebell',
  autre: 'Autre',
} as const;

export const MODES_CHARGE = {
  total: 'Charge totale',
  par_main: 'Par main',
  lest: 'Lest (poids du corps +)',
  sans_charge: 'Sans charge',
} as const;
