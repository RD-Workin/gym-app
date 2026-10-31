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
  e({ cle: 'rowing-barre', nom: 'Rowing barre', equipement: 'barre', modeCharge: 'total', groupes: ['dos'], note: 'Bien le dos.', seance: 'Pull' }),
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
  e({ cle: 'hip-abduction', nom: 'Hip abduction', equipement: 'machine', modeCharge: 'total', groupes: ['fessiers', 'adducteurs'], seance: 'Jambes', reps: '10' }),
  e({ cle: 'bulgares', nom: 'Fentes bulgares', equipement: 'halteres', modeCharge: 'par_main', groupes: ['quadriceps', 'fessiers'], seance: 'Jambes' }),
  e({ cle: 'leg-curl', nom: 'Leg curl', equipement: 'machine', modeCharge: 'total', groupes: ['ischios'], note: 'Ramener vers le bas.', seance: 'Jambes', series: 3, reps: '7-8' }),
  e({ cle: 'hack-squat', nom: 'Hack squat', equipement: 'machine', modeCharge: 'total', groupes: ['quadriceps', 'fessiers'], seance: 'Jambes' }),
];

export const MODELES_DEPART: { nom: string; seance: ExerciceDepart['seance'] }[] = [
  { nom: 'Push', seance: 'Push' },
  { nom: 'Pull', seance: 'Pull' },
  { nom: 'Jambes · épaules · abdos', seance: 'Jambes' },
];
