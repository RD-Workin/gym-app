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
  /** Séance d'origine dans le carnet de Romain et cibles habituelles (absent = exercice ajouté par 10-coach). */
  seance?: 'Push' | 'Pull' | 'Jambes';
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
  'shoulder-press', 'leg-press', 'bulgares', 'hack-squat', 'sdt-roumain',
]);
/** Gros exercices au poids du corps de la séance Home Gym : 2 min suffisent (charges plus légères, séance plus courte). */
const POLYARTICULAIRES_MAISON = new Set(['pompes', 'pompes-piquees', 'tractions-aus', 'dips-chaises', 'bulgares-maison', 'pont-fessier', 'rowing-sac']);
export const reposDepart = (cle: string): number | undefined =>
  POLYARTICULAIRES.has(cle) ? REPOS_POLYARTICULAIRE_SEC : POLYARTICULAIRES_MAISON.has(cle) ? 120 : undefined;

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
  // Ajoutés par 10-coach (2026-11-03) pour des séances types complètes : ils manquaient au carnet.
  e({ cle: 'elevations-laterales', nom: 'Élévations latérales', equipement: 'halteres', modeCharge: 'par_main', groupes: ['epaules'], note: 'Coudes légèrement fléchis, monter jusqu’à l’horizontale, sans élan.' }),
  e({ cle: 'ext-tete-poulie', nom: 'Extension triceps au-dessus de la tête', equipement: 'poulie', modeCharge: 'total', groupes: ['triceps'], note: 'Dos à la poulie, coudes vers le haut : le triceps travaille étiré.' }),
  // Home Gym : au poids du corps, avec ce qu'on trouve à la maison. Lest = sac à dos chargé (livres, bouteilles d'eau).
  e({ cle: 'bulgares-maison', nom: 'Squat bulgare au poids du corps', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['quadriceps', 'fessiers'], note: 'Pied arrière sur une chaise, le canapé ou un banc du parc. Reps par jambe. Lest : sac à dos.' }),
  e({ cle: 'pompes', nom: 'Pompes', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['pectoraux', 'triceps', 'epaules'], note: 'Trop dur : mains sur une table. Trop facile : pieds sur une chaise ou sac à dos.', variantes: ['mains surélevées', 'pieds surélevés', 'diamant'] }),
  e({ cle: 'tractions-aus', nom: 'Tractions australiennes', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['dos', 'biceps'], note: 'Allongé sous une table solide, tirer la poitrine vers le bord. Ou serviette coincée dans une porte fermée.', variantes: ['serviette dans une porte'] }),
  e({ cle: 'rowing-sac', nom: 'Rowing sac à dos', equipement: 'autre', modeCharge: 'total', groupes: ['dos', 'biceps'], note: 'Un genou et une main sur une chaise, tirer le sac à dos chargé vers la hanche. Charge : peser le sac.' }),
  e({ cle: 'pont-fessier', nom: 'Hip thrust sur canapé', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['fessiers', 'ischios'], note: 'Haut du dos contre le canapé, pousser les hanches vers le plafond, 1 s en haut. Plus dur : sur une jambe.', variantes: ['une jambe'] }),
  e({ cle: 'pompes-piquees', nom: 'Pompes piquées', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['epaules', 'triceps'], note: 'Fesses hautes en V inversé, tête qui descend entre les mains. Plus dur : pieds sur une chaise.', variantes: ['pieds sur une chaise'] }),
  e({ cle: 'leg-curl-serviette', nom: 'Leg curl glissé', equipement: 'poids_du_corps', modeCharge: 'sans_charge', groupes: ['ischios'], note: 'Sur le dos, talons sur une serviette (parquet, carrelage) ou en chaussettes : bassin levé, ramener les talons.' }),
  e({ cle: 'dips-chaises', nom: 'Dips entre deux chaises', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['triceps', 'pectoraux'], note: 'Deux chaises solides calées contre un mur, ou l’angle d’un plan de travail. Descendre seulement tant que l’épaule est à l’aise.' }),
  e({ cle: 'mollets-marche', nom: 'Mollets sur une marche', equipement: 'poids_du_corps', modeCharge: 'lest', groupes: ['mollets'], note: 'Avant du pied sur une marche, talon qui descend sous la marche, 1 s en bas. Une main au mur. Plus dur : sur un pied.' }),
  e({ cle: 'crunch-sol', nom: 'Crunch au sol', equipement: 'poids_du_corps', modeCharge: 'sans_charge', groupes: ['abdos'], note: 'Enrouler le dos, bas du dos au sol. Plus dur : un livre ou une bouteille contre la poitrine.' }),
  // Callisthénie (parc de street workout) : barre fixe, barres parallèles, barre basse, banc.
  e({ cle: 'nordic', nom: 'Nordic curl', equipement: 'poids_du_corps', modeCharge: 'sans_charge', groupes: ['ischios'], note: 'À genoux, talons calés sous une barre basse ou un banc : se laisser descendre vers l’avant le plus lentement possible, mains pour amortir.' }),
  e({ cle: 'releves-jambes', nom: 'Relevés de jambes à la barre', equipement: 'poids_du_corps', modeCharge: 'sans_charge', groupes: ['abdos'], note: 'Suspendu à la barre fixe, enrouler le bassin pour monter les genoux (puis les jambes tendues), sans balancer.', variantes: ['jambes tendues'] }),
  e({ cle: 'sdt-roumain', nom: 'Soulevé de terre roumain', equipement: 'barre', modeCharge: 'total', groupes: ['ischios', 'fessiers', 'lombaires'], note: 'Genoux à peine fléchis, hanches vers l’arrière, dos neutre ; descendre jusqu’à l’étirement des ischios.' }),
];

export interface ModeleDepart {
  nom: string;
  /** Séance d'origine : tous ses exercices, dans l'ordre du carnet. */
  seance?: ExerciceDepart['seance'];
  /** Ou liste explicite (modèle composé, ex. Full body) : clé d'exercice + cibles. */
  blocs?: { cle: string; series: number; reps: string }[];
}

// Séances types (10-coach, revue 2026-11-03) : 45 min à 1 h 15, 17 à 24 séries, 6 à 9 exercices.
// Repères croisés (consensus, pas une étude isolée) : gros exercices d'abord (Nunes 2021) ; 3 à 11 séries par muscle et par séance
// (Pelland 2024, Remmert 2025) ; chaque muscle au moins 2 fois par semaine en enchaînant les séances (ACSM 2026, Schoenfeld 2016/2019) ;
// exercices qui chargent le muscle étiré (curl incliné, extension au-dessus de la tête, écarté, RDL : Maeo 2021/2023, Wolf 2023) ;
// élévations latérales car les développés touchent peu le deltoïde latéral ; tirage vertical + horizontal ; quadriceps et ischios équilibrés.
export const MODELES_DEPART: ModeleDepart[] = [
  {
    // Pecs, épaules (avant et côté), triceps : ~55 min, 19 séries.
    nom: 'Push',
    blocs: [
      { cle: 'dc', series: 4, reps: '6-8' },
      { cle: 'dev-incline-halt', series: 3, reps: '8-10' },
      { cle: 'pec-fly', series: 3, reps: '10-12' },
      { cle: 'elevations-laterales', series: 4, reps: '10-15' },
      { cle: 'ext-tete-poulie', series: 3, reps: '10-12' },
      { cle: 'extension-poulie', series: 2, reps: '10-12' },
    ],
  },
  {
    // Dos (largeur et épaisseur), arrière d'épaule, biceps : ~55 min, 18 séries.
    nom: 'Pull',
    blocs: [
      { cle: 'tractions', series: 3, reps: '6-10' },
      { cle: 'seated-row', series: 3, reps: '8-12' },
      { cle: 'lat-pulldown', series: 3, reps: '10-12' },
      { cle: 'rear-delt', series: 3, reps: '12-15' },
      { cle: 'curl-incline', series: 3, reps: '8-12' },
      { cle: 'arm-curl', series: 3, reps: '10-12' },
    ],
  },
  {
    // Quadriceps, ischios, fessiers, mollets + épaules (côté) et abdos : ~1 h, 21 séries.
    nom: 'Jambes · épaules · abdos',
    blocs: [
      { cle: 'hack-squat', series: 3, reps: '6-10' },
      { cle: 'sdt-roumain', series: 3, reps: '6-10' },
      { cle: 'leg-extension', series: 3, reps: '10-12' },
      { cle: 'leg-curl', series: 3, reps: '10-12' },
      { cle: 'mollets', series: 3, reps: '10-15' },
      { cle: 'elevations-laterales', series: 3, reps: '12-15' },
      { cle: 'crunch', series: 3, reps: '10-15' },
    ],
  },
  {
    // Tout le corps en une séance (~1 h 10, 24 séries) : un gros exercice par grand mouvement, puis un peu d'isolation.
    nom: 'Full body',
    blocs: [
      { cle: 'leg-press', series: 3, reps: '8-10' },
      { cle: 'dc', series: 3, reps: '6-8' },
      { cle: 'lat-pulldown', series: 3, reps: '8-10' },
      { cle: 'seated-row', series: 3, reps: '8-12' },
      { cle: 'leg-curl', series: 3, reps: '10-12' },
      { cle: 'elevations-laterales', series: 3, reps: '12-15' },
      { cle: 'curl-incline', series: 2, reps: '10-12' },
      { cle: 'ext-tete-poulie', series: 2, reps: '10-12' },
      { cle: 'crunch', series: 2, reps: '10-15' },
    ],
  },
  {
    // Tout le haut du corps, sans les jambes (~1 h, 21 séries) : pousser et tirer en alternance, puis épaules et bras.
    nom: 'Full Upper',
    blocs: [
      { cle: 'dc', series: 3, reps: '6-8' },
      { cle: 'lat-pulldown', series: 3, reps: '8-10' },
      { cle: 'dev-incline-halt', series: 3, reps: '8-10' },
      { cle: 'seated-row', series: 3, reps: '8-12' },
      { cle: 'elevations-laterales', series: 3, reps: '12-15' },
      { cle: 'rear-delt', series: 2, reps: '12-15' },
      { cle: 'curl-incline', series: 2, reps: '10-12' },
      { cle: 'ext-tete-poulie', series: 2, reps: '10-12' },
    ],
  },
  {
    // Bonus sans matériel de salle (~1 h 05, 23 séries) : poids du corps et objets de la maison (chaise, table, canapé, serviette, sac à dos).
    // Près de l'échec, 5 à 30 reps font autant de muscle (Schoenfeld 2021) : on monte les reps ou on rend la variante plus dure.
    nom: 'Home Gym',
    blocs: [
      { cle: 'bulgares-maison', series: 3, reps: '8-15' },
      { cle: 'pompes', series: 3, reps: '8-20' },
      { cle: 'tractions-aus', series: 3, reps: '8-15' },
      { cle: 'pont-fessier', series: 3, reps: '10-20' },
      { cle: 'pompes-piquees', series: 2, reps: '6-12' },
      { cle: 'rowing-sac', series: 3, reps: '10-15' },
      { cle: 'leg-curl-serviette', series: 2, reps: '8-12' },
      { cle: 'mollets-marche', series: 2, reps: '12-20' },
      { cle: 'crunch-sol', series: 2, reps: '12-20' },
    ],
  },
  {
    // Bonus street workout (~1 h 05, 22 séries) : un parc avec barre fixe, barres parallèles, barre basse et banc.
    nom: 'Callisthénie',
    blocs: [
      { cle: 'tractions', series: 4, reps: '5-10' },
      { cle: 'dips', series: 3, reps: '6-12' },
      { cle: 'tractions-aus', series: 3, reps: '8-15' },
      { cle: 'pompes-piquees', series: 3, reps: '6-12' },
      { cle: 'bulgares-maison', series: 3, reps: '8-15' },
      { cle: 'nordic', series: 3, reps: '3-8' },
      { cle: 'releves-jambes', series: 3, reps: '8-15' },
    ],
  },
];

/**
 * Versions précédentes des séances types (avant la revue 10-coach du 2026-11-03), pour le correctif qui ne remplace
 * une séance que si elle n'a pas été modifiée. Exercices par nom, avec séries et reps.
 */
const carnet = (seance: ExerciceDepart['seance']) => BIBLIOTHEQUE.filter((x) => x.seance === seance).map((x) => ({ cle: x.cle, series: x.series, reps: x.reps }));
export const MODELES_DEPART_V1: { nom: string; blocs: { cle: string; series?: number; reps?: string }[] }[] = [
  { nom: 'Push', blocs: carnet('Push') },
  { nom: 'Pull', blocs: carnet('Pull') },
  { nom: 'Jambes · épaules · abdos', blocs: carnet('Jambes') },
  {
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
  {
    nom: 'Full Upper',
    blocs: [
      { cle: 'dc', series: 3, reps: '6-8' },
      { cle: 'lat-pulldown', series: 3, reps: '8-10' },
      { cle: 'dev-incline-halt', series: 3, reps: '8-10' },
      { cle: 'seated-row', series: 3, reps: '8-12' },
      { cle: 'shoulder-press', series: 3, reps: '8-10' },
      { cle: 'curl-incline', series: 2, reps: '10-12' },
      { cle: 'extension-poulie', series: 2, reps: '10-12' },
      { cle: 'rear-delt', series: 2, reps: '12-15' },
    ],
  },
];

/** Séances bonus (sans salle) : jamais proposées en premier dans la rotation, on les choisit soi-même. */
export const SEANCES_BONUS = new Set(['Home Gym', 'Callisthénie']);
/** Rang d'une séance type dans la liste de départ (Push d'abord) ; une séance créée par l'utilisateur vient après. */
export const rangDepart = (origine?: string) => {
  const i = MODELES_DEPART.findIndex((m) => m.nom === origine);
  return i < 0 ? MODELES_DEPART.length : i;
};

/** Blocs d'un modèle de départ (clé d'exercice + cibles), quelle que soit sa forme. */
export const blocsDepart = (m: ModeleDepart): { cle: string; series?: number; reps?: string }[] =>
  m.blocs ?? BIBLIOTHEQUE.filter((x) => x.seance === m.seance).map((x) => ({ cle: x.cle, series: x.series, reps: x.reps }));
