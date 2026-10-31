// Bibliothèque de départ, tirée du carnet de Romain (exercices-actuels.csv).
// Propriétaire : 03-exercices. Les charges ne sont pas reprises ici (point de départ optionnel, voir amorcage.ts).
import type { Equipement, ModeCharge } from '../core/types';
import type { Groupe } from './groupes';

export interface ExerciceDepart {
  /** Clé stable interne au fichier, sert à relier modèles et variantes. */
  cle: string;
  nom: string;
  equipement: Equipement;
  modeCharge: ModeCharge;
  groupes: Groupe[];
  reglagesMachine?: string;
  note?: string;
  variantes?: string[];
  /** Séance d'origine et cibles (nombre de séries, reps habituelles). */
  seance: 'Push' | 'Pull' | 'Jambes';
  series?: number;
  reps?: string;
}

/**
 * Repos par défaut des modèles de départ (10-coach). Polyarticulaires lourds : 2 min 30 ;
 * isolation : 90 s (REPOS_DEFAUT_SEC). Des repos ≥ 2 min sur les gros exercices préservent
 * les reps des séries suivantes et donc le volume utile (Schoenfeld 2016, Singer 2024).
 */
export const REPOS_POLYARTICULAIRE_SEC = 150;
const POLYARTICULAIRES = new Set([
  'chest-press', 'bench-plate', 'dc', 'dips', 'vertical-chest', 'dev-incline-halt', 'dev-incline-barre', 'dc-halt', 'dc-decline',
  'lat-pulldown', 'tractions', 'seated-row', 'rowing-barre', 'plate-lat', 'one-arm-row',
  'shoulder-press', 'leg-press', 'bulgares', 'hack-squat',
]);
export const reposDepart = (cle: string): number | undefined => (POLYARTICULAIRES.has(cle) ? REPOS_POLYARTICULAIRE_SEC : undefined);

const e = (x: ExerciceDepart) => x;

export const BIBLIOTHEQUE: ExerciceDepart[] = [
  // Push
  e({ cle: 'pec-fly', nom: 'Pec fly', equipement: 'machine', modeCharge: 'total', groupes: ['pectoraux'], reglagesMachine: 'chaise 4', seance: 'Push', series: 4, reps: '7-9' }),
  e({ cle: 'chest-press', nom: 'Chest press', equipement: 'machine', modeCharge: 'total', groupes: ['pectoraux', 'triceps'], seance: 'Push', reps: '8' }),
  e({ cle: 'bench-plate', nom: 'Bench press (plate)', equipement: 'machine', modeCharge: 'par_main', groupes: ['pectoraux', 'triceps'], variantes: ['prise large'], seance: 'Push', reps: '7' }),
  e({ cle: 'dc', nom: 'Développé couché', equipement: 'barre', modeCharge: 'total', groupes: ['pectoraux', 'triceps', 'epaules'], seance: 'Push', reps: '8' }),
  e({ cle: 'dips', nom: 'Dips', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['pectoraux', 'triceps'], seance: 'Push', series: 2, reps: '8-11' }),
  e({ cle: 'seated-triceps', nom: 'Seated triceps press', equipement: 'machine', modeCharge: 'total', groupes: ['triceps'], seance: 'Push' }),
  e({ cle: 'vertical-chest', nom: 'Vertical chest press', equipement: 'machine', modeCharge: 'total', groupes: ['pectoraux'], seance: 'Push' }),
  e({ cle: 'extension-poulie', nom: 'Extension poulie', equipement: 'poulie', modeCharge: 'total', groupes: ['triceps'], seance: 'Push' }),
  e({ cle: 'dev-incline-halt', nom: 'Développé incliné haltères', equipement: 'halteres', modeCharge: 'par_main', groupes: ['pectoraux', 'epaules'], seance: 'Push', series: 3, reps: '7-8' }),
  e({ cle: 'dev-incline-barre', nom: 'Développé incliné barre', equipement: 'barre', modeCharge: 'total', groupes: ['pectoraux', 'epaules'], seance: 'Push', reps: '7' }),
  e({ cle: 'dc-halt', nom: 'Développé couché haltères', equipement: 'halteres', modeCharge: 'par_main', groupes: ['pectoraux', 'triceps'], seance: 'Push' }),
  e({ cle: 'ext-concentree', nom: 'Extension concentrée triceps', equipement: 'halteres', modeCharge: 'total', groupes: ['triceps'], seance: 'Push' }),
  e({ cle: 'dev-diamant', nom: 'Développé haltères diamant', equipement: 'halteres', modeCharge: 'par_main', groupes: ['pectoraux', 'triceps'], note: 'Haltères collées au milieu.', seance: 'Push' }),
  e({ cle: 'dc-decline', nom: 'Développé couché décliné', equipement: 'barre', modeCharge: 'total', groupes: ['pectoraux', 'triceps'], note: 'Pour le bas des pecs. Charge notée avec la barre.', seance: 'Push' }),
  // Pull
  e({ cle: 'lat-pulldown', nom: 'Lat pulldown', equipement: 'machine', modeCharge: 'total', groupes: ['dos', 'biceps'], note: 'Barre tirée vers le bas.', seance: 'Pull', series: 4, reps: '5-8' }),
  e({ cle: 'tractions', nom: 'Tractions', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['dos', 'biceps'], seance: 'Pull', series: 4, reps: '4-7' }),
  e({ cle: 'seated-row', nom: 'Seated row (poulie assise)', equipement: 'poulie', modeCharge: 'total', groupes: ['dos', 'biceps'], note: "Rester droit, voire un peu vers l'avant.", variantes: ['machine'], seance: 'Pull', series: 4, reps: '9-10' }),
  e({ cle: 'rear-delt', nom: 'Rear delt fly', equipement: 'machine', modeCharge: 'total', groupes: ['epaules', 'dos'], note: 'Pec fly inversé.', seance: 'Pull' }),
  e({ cle: 'curl-incline', nom: 'Curl incliné', equipement: 'halteres', modeCharge: 'par_main', groupes: ['biceps'], note: '−2 kg sur les 2 dernières séries.', seance: 'Pull', series: 4, reps: '7-10' }),
  e({ cle: 'arm-curl', nom: 'Arm curl', equipement: 'machine', modeCharge: 'total', groupes: ['biceps'], seance: 'Pull', series: 4, reps: '6-10' }),
  e({ cle: 'poulie-biceps', nom: 'Poulie biceps', equipement: 'poulie', modeCharge: 'total', groupes: ['biceps'], seance: 'Pull' }),
  e({ cle: 'plate-lat', nom: 'Plate lateral pulldown', equipement: 'machine', modeCharge: 'par_main', groupes: ['dos'], note: 'Avec les poids machine. Charge par bras.', seance: 'Pull' }),
  e({ cle: 'rowing-barre', nom: 'Rowing barre', equipement: 'barre', modeCharge: 'total', groupes: ['dos', 'lombaires'], note: 'Bien le dos.', seance: 'Pull' }),
  e({ cle: 'curl-barre', nom: 'Curl barre', equipement: 'barre', modeCharge: 'total', groupes: ['biceps'], seance: 'Pull' }),
  e({ cle: 'curl-poulie', nom: 'Curl biceps poulie', equipement: 'poulie', modeCharge: 'total', groupes: ['biceps'], note: 'Entre les jambes.', seance: 'Pull' }),
  e({ cle: 'one-arm-row', nom: 'One arm cable row', equipement: 'poulie', modeCharge: 'total', groupes: ['dos'], seance: 'Pull', reps: '10' }),
  e({ cle: 'avant-bras', nom: 'Avant-bras', equipement: 'halteres', modeCharge: 'total', groupes: ['avant-bras'], note: 'Pouce comme au tennis, très lentement.', variantes: ['sans le pouce'], seance: 'Pull', reps: '8' }),
  // Jambes / épaules / abdos
  e({ cle: 'shoulder-press', nom: 'Shoulder press', equipement: 'machine', modeCharge: 'total', groupes: ['epaules', 'triceps'], note: '−4 kg après la 1re série.', seance: 'Jambes', series: 3, reps: '7-11' }),
  e({ cle: 'crunch', nom: 'Abdominal crunch', equipement: 'machine', modeCharge: 'total', groupes: ['abdos'], seance: 'Jambes' }),
  e({ cle: 'leg-press', nom: 'Leg press', equipement: 'machine', modeCharge: 'total', groupes: ['quadriceps', 'fessiers'], reglagesMachine: 'chaise 3', seance: 'Jambes', series: 3, reps: '7-10' }),
  e({ cle: 'leg-extension', nom: 'Leg extension', equipement: 'machine', modeCharge: 'total', groupes: ['quadriceps'], note: 'Bien tirer avec les bras, ne pas monter trop haut ni trop vite.', seance: 'Jambes', series: 3, reps: '8-10' }),
  e({ cle: 'mollets', nom: 'Mollets', equipement: 'machine', modeCharge: 'total', groupes: ['mollets'], seance: 'Jambes', series: 3, reps: '7-9' }),
  e({ cle: 'hip-abduction', nom: 'Hip abduction', equipement: 'machine', modeCharge: 'total', groupes: ['abducteurs', 'fessiers'], note: 'Moyen fessier (abducteurs), pas les adducteurs.', seance: 'Jambes', reps: '10' }),
  e({ cle: 'bulgares', nom: 'Fentes bulgares', equipement: 'halteres', modeCharge: 'par_main', groupes: ['quadriceps', 'fessiers'], seance: 'Jambes' }),
  e({ cle: 'leg-curl', nom: 'Leg curl', equipement: 'machine', modeCharge: 'total', groupes: ['ischios'], note: 'Ramener vers le bas.', seance: 'Jambes', series: 3, reps: '7-8' }),
  e({ cle: 'hack-squat', nom: 'Hack squat', equipement: 'machine', modeCharge: 'total', groupes: ['quadriceps', 'fessiers'], seance: 'Jambes' }),
];

export interface ModeleDepart {
  nom: string;
  /** Séance d'origine : tous ses exercices, dans l'ordre du carnet. */
  seance?: ExerciceDepart['seance'];
  /** Ou liste explicite (modèle composé, ex. Full body) : clé d'exercice + cibles. */
  blocs?: { cle: string; series: number; reps: string }[];
}

export const MODELES_DEPART: ModeleDepart[] = [
  { nom: 'Push', seance: 'Push' },
  { nom: 'Pull', seance: 'Pull' },
  { nom: 'Jambes · épaules · abdos', seance: 'Jambes' },
  {
    // Tout le corps en une séance (~60 min) : un polyarticulaire par grand mouvement, puis un peu d'isolation.
    nom: 'Full body',
    blocs: [
      { cle: 'leg-press', series: 3, reps: '8-10' },
      { cle: 'dc', series: 3, reps: '6-8' },
      { cle: 'lat-pulldown', series: 3, reps: '8-10' },
      { cle: 'shoulder-press', series: 3, reps: '8-10' },
      { cle: 'seated-row', series: 3, reps: '8-12' },
      { cle: 'leg-curl', series: 3, reps: '10-12' },
      { cle: 'curl-incline', series: 2, reps: '10-12' },
      { cle: 'extension-poulie', series: 2, reps: '10-12' },
      { cle: 'crunch', series: 2, reps: '12-15' },
    ],
  },
];

/** Blocs d'un modèle de départ (clé d'exercice + cibles), quelle que soit sa forme. */
export const blocsDepart = (m: ModeleDepart): { cle: string; series?: number; reps?: string }[] =>
  m.blocs ?? BIBLIOTHEQUE.filter((x) => x.seance === m.seance).map((x) => ({ cle: x.cle, series: x.series, reps: x.reps }));
