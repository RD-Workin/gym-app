// Catalogue d'exercices libre (free-exercise-db, domaine public) : 622 exercices de musculation,
// images compressées dans public/catalogue/. Chargé à la demande. Propriétaire : 03-exercices.
import type { Equipement } from '../core/types';

export interface EntreeCatalogue {
  id: string;
  /** Nom d'origine (anglais, comme en salle). */
  nom: string;
  eq: Equipement;
  /** 1 débutant, 2 intermédiaire, 3 expert. */
  niv: 1 | 2 | 3;
  /** Groupes principaux et secondaires (clés de groupes.ts). */
  p: string[];
  s: string[];
  /** Explications (anglais). */
  inst: string[];
  /** Nombre d'images (0 à 2). */
  img: number;
}

export const NIVEAUX = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Expert' } as const;

let promesse: Promise<EntreeCatalogue[]> | undefined;
export const chargerCatalogue = () => (promesse ??= import('./catalogue-donnees').then((m) => m.default));

export const urlImage = (id: string, i = 0) => `${import.meta.env.BASE_URL}catalogue/${encodeURIComponent(id)}-${i}.webp`;

/** Exercices de départ (nom exact) → entrée du catalogue la plus proche. */
export const VISUELS_DEPART: Record<string, string> = {
  'Pec fly': 'Butterfly',
  'Chest press': 'Leverage_Chest_Press',
  'Bench press (plate)': 'Machine_Bench_Press',
  'Développé couché': 'Barbell_Bench_Press_-_Medium_Grip',
  Dips: 'Dips_-_Chest_Version',
  'Seated triceps press': 'Machine_Triceps_Extension',
  'Vertical chest press': 'Leverage_Chest_Press',
  'Extension poulie': 'Triceps_Pushdown',
  'Développé incliné haltères': 'Incline_Dumbbell_Press',
  'Développé incliné barre': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Développé couché haltères': 'Dumbbell_Bench_Press',
  'Extension concentrée triceps': 'Dumbbell_One-Arm_Triceps_Extension',
  'Développé haltères diamant': 'Close-Grip_Dumbbell_Press',
  'Développé couché décliné': 'Decline_Barbell_Bench_Press',
  'Lat pulldown': 'Wide-Grip_Lat_Pulldown',
  Tractions: 'Pullups',
  'Seated row (poulie assise)': 'Seated_Cable_Rows',
  'Rear delt fly': 'Reverse_Machine_Flyes',
  'Curl incliné': 'Incline_Dumbbell_Curl',
  'Arm curl': 'Machine_Bicep_Curl',
  'Poulie biceps': 'Standing_Biceps_Cable_Curl',
  'Plate lateral pulldown': 'Leverage_High_Row',
  'Rowing barre': 'Bent_Over_Barbell_Row',
  'Curl barre': 'Barbell_Curl',
  'Curl biceps poulie': 'Standing_Biceps_Cable_Curl',
  'One arm cable row': 'Seated_One-arm_Cable_Pulley_Rows',
  'Avant-bras': 'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench',
  'Shoulder press': 'Machine_Shoulder_Military_Press',
  'Abdominal crunch': 'Ab_Crunch_Machine',
  'Leg press': 'Leg_Press',
  'Leg extension': 'Leg_Extensions',
  Mollets: 'Standing_Calf_Raises',
  'Hip abduction': 'Thigh_Abductor',
  'Fentes bulgares': 'Split_Squat_with_Dumbbells',
  'Leg curl': 'Lying_Leg_Curls',
  'Hack squat': 'Hack_Squat',
};
