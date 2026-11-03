// « Quoi de neuf » affiché une fois après chaque mise à jour. Propriétaire : 01.
// Pour annoncer une nouveauté : ajouter une entrée EN TÊTE avec un numéro plus grand (demander à 01).

export interface Nouveaute {
  numero: number;
  date: string;
  points: string[];
}

export const NOUVEAUTES: Nouveaute[] = [
  {
    numero: 8,
    date: '2026-11-03',
    points: [
      'Séances types refaites d’après les études récentes : Push, Pull et Jambes durent environ 1 h et travaillent tous les muscles (élévations latérales, extension triceps au-dessus de la tête, soulevé de terre roumain…). Si tu as déjà modifié une séance, elle reste comme tu l’as faite.',
      'Deux séances bonus : « Home Gym », sans matériel, avec une chaise, une table, une serviette et un sac à dos ; « Callisthénie », au parc avec barre fixe et barres parallèles. Les conseils de chaque exercice disent comment faire.',
    ],
  },
  {
    numero: 9,
    date: '2026-11-03',
    points: ['Toucher une séance ne la lance plus tout de suite : tu vois d’abord ses exercices, les séries prévues, la durée et ce que tu as fait la dernière fois. De là, « Démarrer » ou « Modifier la séance ».'],
  },
  {
    numero: 8,
    date: '2026-11-03',
    points: [
      'Tractions, dips, pompes, muscle-up… : tu notes le lest, c’est-à-dire seulement ce que tu ajoutes à ton poids (+10 kg à la ceinture). Aidé par un élastique ou une machine ? Note-le en négatif (−15 kg). L’app affiche la charge réelle si tu as noté ton poids du corps.',
    ],
  },
  {
    numero: 7,
    date: '2026-11-03',
    points: ['Conseils du coach relus d’après les dernières études : pour la masse, 6 à 12 reps restent un bon repère (5 à 30 marchent si tu vas près de l’échec), au moins 10 séries par muscle et par semaine, et une semaine plus légère quand la fatigue s’accumule.'],
  },
  {
    numero: 6,
    date: '2026-11-03',
    points: ['Nouvelle séance type « Full Upper » : tout le haut du corps (pecs, dos, épaules, bras) sans les jambes, environ 1 h. Aussi proposée dans « Composer ma séance ».'],
  },
  {
    numero: 5,
    date: '2026-11-03',
    points: [
      'Composer ma séance : choisis Push, Pull, Jambes, Full body ou libre, puis l’app te propose les exercices un par un. Tu gardes ceux qui te plaisent, tu changes l’ordre, et tu enregistres.',
      'Chaque séance type se modifie depuis l’écran Séance (« Modifier ») : exercices, ordre, séries, reps. Push, Pull, Jambes et Full body peuvent revenir au modèle d’origine.',
      'Avis sur ta séance : adaptée, à ajuster, incomplète ou trop chargée, avec les raisons (muscle oublié, trop de séries, durée…).',
    ],
  },
  {
    numero: 4,
    date: '2026-11-03',
    points: [
      'App plus claire pour qui la découvre : accueil avec les 3 étapes pour démarrer, et un « ? » à côté des mots techniques (RIR, 1RM, modèle, superset…).',
      'Réglages › Aide : le guide de démarrage et tous les mots de l’app expliqués.',
      'Fiche exercice : la modification (nom, muscles, photo, variantes) est repliée sous « Modifier l’exercice ».',
    ],
  },
  {
    numero: 3,
    date: '2026-11-02',
    points: [
      'Noter une perf sans lancer de séance : ouvre un exercice, note chaque série avec ses reps et sa charge (ex. 10 × 28, 8 × 28, 9 × 26), c’est ajouté à ta séance libre du jour et compté dans tes stats.',
      'La fiche exercice affiche en haut ta dernière fois, ton 1RM estimé, un max projeté et une charge à tester.',
      'Recherche d’exercice : « Créer » reprend le nom tapé.',
    ],
  },
  {
    numero: 2,
    date: '2026-10-31',
    points: ['Nouveau modèle de séance « Full body » : tout le corps en une séance d’environ 1 h 10.'],
  },
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
