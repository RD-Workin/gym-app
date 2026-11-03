// Les mots de l'app expliqués en une phrase, pour un nouvel utilisateur. Propriétaire : 11-ergonomie (contenu sportif relu par 10-coach).
// Utilisé par <Aide mot="…" /> près du terme, et listé en entier dans Réglages.

export const LEXIQUE = {
  serie: { terme: 'Série', definition: 'Un passage sur l’exercice : tu fais tes répétitions d’affilée, puis tu te reposes.' },
  reps: { terme: 'Reps', definition: 'Répétitions : le nombre de mouvements faits d’affilée dans une série.' },
  rir: {
    terme: 'RIR',
    definition: 'Reps en réserve : combien de répétitions tu aurais encore pu faire à la fin de la série. 0 = à fond, 2 = il en restait deux. Facultatif.',
  },
  unRm: {
    terme: '1RM',
    definition: 'La charge maximale que tu pourrais soulever une seule fois. L’app l’estime à partir de tes séries, sans que tu aies à la tester.',
  },
  modele: {
    terme: 'Modèle',
    definition: 'Une séance type déjà préparée (liste d’exercices, séries, repos). Push, Pull, Jambes, Full Upper, Full body, et en bonus Home Gym (à la maison) et Callisthénie (au parc) sont fournis ; tu peux les modifier ou en créer.',
  },
  composer: {
    terme: 'Composer ma séance',
    definition: 'L’app te propose 3 ou 4 exercices selon ce qui manque à ta séance ; tu en choisis un, puis elle propose le suivant, jusqu’à ce que ta séance te plaise.',
  },
  grosExercice: {
    terme: 'Gros exercice',
    definition: 'Un exercice qui fait travailler plusieurs muscles à la fois (développé, tirage, presse, squat). À faire en début de séance, quand tu es frais. Le contraire : l’isolation, un seul muscle (curl, leg extension).',
  },
  objectif: {
    terme: 'Objectif',
    definition: 'Force : charges lourdes, 1 à 6 reps, longs repos. Masse (hypertrophie) : 6 à 12 reps menées près de l’échec, pour prendre du muscle. Endurance : 15 à 20 reps, repos courts.',
  },
  avisSeance: {
    terme: 'Avis sur ta séance',
    definition: 'Calculé par l’app à partir de repères d’entraînement : muscles travaillés, nombre de séries par muscle (un muscle travaillé en second compte pour une demi-série), durée, ordre et repos. C’est un conseil, tu restes libre.',
  },
  seanceLibre: { terme: 'Séance libre', definition: 'Une séance sans modèle : tu ajoutes les exercices au fur et à mesure.' },
  noterExercice: {
    terme: 'Noter un exercice',
    definition: 'Enregistrer une perf sans lancer de séance ni de chrono. Elle est rangée dans la séance libre du jour et comptée dans tes progrès.',
  },
  cible: { terme: 'Cible', definition: 'Ce que prévoit le modèle, par exemple 3 × 8-10 : 3 séries de 8 à 10 répétitions.' },
  superset: { terme: 'Superset', definition: 'Deux exercices enchaînés sans repos entre eux ; le repos vient après le second.' },
  echauffement: { terme: 'Échauffement', definition: 'Série légère avant les vraies séries. Notée à part, elle ne compte pas dans tes records.' },
  repos: { terme: 'Repos', definition: 'Le minuteur se lance tout seul après chaque série validée. Touche la durée pour la changer.' },
  reglageMachine: { terme: 'Réglage machine', definition: 'Ta position sur la machine (siège, dossier…), par exemple « chaise 4 ». Gardée pour la prochaine fois.' },
  pdc: { terme: 'Poids du corps', definition: 'Ton poids le jour de la séance. Facultatif, il sert à suivre ton évolution et les exercices au poids du corps.' },
  chargeTotale: { terme: 'Charge totale', definition: 'Tu notes le poids total soulevé (barre comprise, ou ce qu’affiche la machine).' },
  parMain: { terme: 'Par main', definition: 'Tu notes le poids d’un seul haltère.' },
  lest: {
    terme: 'Lest',
    definition:
      'Pour un exercice au poids du corps (tractions, dips, pompes, muscle-up…) : tu notes seulement ce que tu ajoutes, pas ton poids. +10 = 10 kg à la ceinture, 0 = poids du corps seul, −15 = aidé de 15 kg (élastique, machine). L’app ajoute ton poids du corps pour le 1RM et les records.',
  },
  variante: { terme: 'Variante', definition: 'Une façon différente de faire l’exercice (prise large, unilatéral…). Ses progrès sont suivis à part.' },
  bibliotheque: {
    terme: 'Bibliothèque et catalogue',
    definition: 'Ma bibliothèque = tes exercices, ceux que tu notes. Le catalogue = plus de 600 exercices illustrés à ajouter à ta bibliothèque.',
  },
  enSecondes: {
    terme: 'En secondes',
    definition: 'Pour les exercices qu’on tient sans bouger (gainage, dead hang, chaise contre un mur) : tu notes combien de secondes tu as tenu, au lieu de répétitions. Un lest reste possible.',
  },
  chargeMax: { terme: 'Charge max', definition: 'Le poids le plus lourd soulevé ce jour-là, quel que soit le nombre de répétitions.' },
  volume: { terme: 'Volume', definition: 'Poids × répétitions, additionnés sur toutes les séries de la séance. Il monte quand tu en fais plus.' },
  record: { terme: 'Record', definition: 'Ta meilleure perf sur un exercice (charge, répétitions ou 1RM estimé). Une célébration s’affiche quand tu en bats un.' },
  progres: {
    terme: 'Séance en progrès',
    definition: 'Au moins un exercice fait mieux que la dernière fois : 1RM estimé plus haut, sinon charge plus lourde, sinon plus de répétitions.',
  },
} as const;

export type MotLexique = keyof typeof LEXIQUE;
