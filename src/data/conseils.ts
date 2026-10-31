// Conseils du coach : contenu des panneaux « Conseils du coach » (objectifs, séance, muscles, matériel, exercices).
// Propriétaire du contenu : 10-coach. L'affichage appartient aux écrans (02 composant, 03 fiches, 04 séance/modèles).
// Fondé sur les consensus actuels (ACSM 2009/2026, Schoenfeld, Helms, Israetel, Pelland 2024, Singer 2024).
import type { Equipement } from '../core/types';
import type { Groupe } from './groupes';

/** Un panneau : titre de section → liste de points courts. */
export interface FicheConseil {
  /** Résumé en une phrase, affiché panneau fermé ou en tête. */
  resume: string;
  sections: { titre: string; points: string[] }[];
}

// ---------------------------------------------------------------- Objectifs (force, hypertrophie, endurance)

export const CONSEILS_OBJECTIFS: Record<'force' | 'hypertrophie' | 'endurance', FicheConseil> = {
  force: {
    resume: 'Soulever plus lourd : charges élevées, peu de reps, longs repos.',
    sections: [
      { titre: 'Cible', points: ['1 à 6 reps à 80–95 % du 1RM.', 'RIR 1 à 3 : on garde 1 à 3 reps en réserve, l’échec est rarement utile en force.', '3 à 5 séries par exercice principal.'] },
      { titre: 'Repos', points: ['3 à 5 min entre les séries lourdes : le système nerveux et la phosphocréatine doivent récupérer.', 'Couper le repos fait perdre des reps et de la qualité technique.'] },
      { titre: 'Astuces', points: ['La force est spécifique : pour progresser au développé couché, il faut pratiquer le développé couché lourd.', 'Échauffement progressif obligatoire (voir « Séance »).', 'Progresser par petits sauts (1–2,5 kg) quand toutes les reps cibles sont faites.'] },
    ],
  },
  hypertrophie: {
    resume: 'Prendre du muscle : séries proches de l’échec, volume suffisant, repos complets.',
    sections: [
      { titre: 'Cible', points: ['6 à 12 reps en pratique ; de 5 à 30 reps fonctionnent si la série est menée près de l’échec.', 'RIR 0 à 3 : la proximité de l’échec compte plus que le nombre exact de reps.', '10 à 20 séries par muscle et par semaine, réparties sur 2 séances ou plus.'] },
      { titre: 'Repos', points: ['2 à 3 min sur les polyarticulaires, 1 min 30 à 2 min sur l’isolation.', 'Des repos plus longs gardent plus de reps par série, donc plus de volume utile (Schoenfeld 2016, Singer 2024).'] },
      { titre: 'Astuces', points: ['Surcharge progressive : ajouter une rep ou un peu de charge d’une séance à l’autre.', 'Contrôler la descente (2–3 s) et travailler en amplitude complète, surtout en position étirée.', 'Garder les mêmes exercices quelques semaines pour mesurer la progression.'] },
    ],
  },
  endurance: {
    resume: 'Tenir l’effort : charges légères, beaucoup de reps, repos courts.',
    sections: [
      { titre: 'Cible', points: ['15 à 25 reps à 40–60 % du 1RM.', '2 à 4 séries.'] },
      { titre: 'Repos', points: ['30 à 60 s : l’objectif est justement de travailler fatigué.', 'Les supersets et circuits conviennent bien.'] },
      { titre: 'Astuces', points: ['La technique se dégrade avec la fatigue : arrêter la série quand la forme casse.', 'Peu efficace pour la force maximale, mais utile pour la capacité de travail et la récupération.'] },
    ],
  },
};

// ---------------------------------------------------------------- Séance

export const CONSEILS_SEANCE: FicheConseil = {
  resume: 'Échauffement, effort, progression : les règles qui comptent le plus.',
  sections: [
    {
      titre: 'Échauffement',
      points: [
        '5 min de cardio léger pour monter en température.',
        'Sur le 1er exercice lourd : 2 à 4 séries de montée (ex. 40 %, 60 %, 80 % de la charge de travail, reps décroissantes).',
        'Les exercices suivants du même muscle demandent 0 ou 1 série d’approche.',
        'Les étirements statiques longs avant la séance n’aident pas et peuvent réduire la force ; les garder pour après ou un autre moment.',
      ],
    },
    {
      titre: 'RIR (reps en réserve)',
      points: [
        'RIR 2 = tu aurais pu faire 2 reps de plus en bonne technique.',
        'Viser RIR 0–3 sur les séries de travail ; l’échec total plutôt sur la dernière série d’un exercice d’isolation.',
        'On sous-estime souvent ce qui reste : tester parfois l’échec sur une machine sûre recalibre le ressenti.',
      ],
    },
    {
      titre: 'Progression',
      points: [
        'Double progression : rester sur une charge jusqu’au haut de la fourchette de reps sur toutes les séries, puis augmenter de 2,5–5 %.',
        'Si les reps baissent deux séances de suite : sommeil, alimentation, ou besoin d’une semaine plus légère (deload).',
        'Le 1RM affiché est une estimation (formule d’Epley, séries de 12 reps au plus).',
      ],
    },
    {
      titre: 'Supersets',
      points: [
        'Enchaîner deux muscles opposés (ex. biceps / triceps) fait gagner du temps sans perte de performance.',
        'Éviter de mettre en superset deux exercices lourds qui sollicitent les mêmes muscles.',
      ],
    },
    {
      titre: 'Récupération',
      points: ['7 à 9 h de sommeil.', '1,6 à 2,2 g de protéines par kg de poids de corps et par jour.', 'Laisser 48 h environ avant de retravailler lourdement le même muscle.'],
    },
  ],
};

// ---------------------------------------------------------------- Muscles

export const CONSEILS_GROUPES: Record<Groupe, FicheConseil> = {
  pectoraux: {
    resume: 'Grand et petit pectoral : rapprochent le bras du corps et le poussent vers l’avant.',
    sections: [
      { titre: 'Rôle', points: ['Faisceau claviculaire (haut) : sollicité par les développés inclinés.', 'Faisceau sterno-costal (milieu et bas) : développés à plat, déclinés et dips.'] },
      { titre: 'Récupération', points: ['Moyenne : 48 à 72 h après une séance lourde.'] },
      { titre: 'Bien le travailler', points: ['Un développé lourd (barre ou haltères) + un écarté (pec fly, poulie) pour la position étirée.', 'Omoplates serrées et basses, léger arc : protège les épaules et met les pecs au travail.', 'Descendre en contrôle jusqu’à un bon étirement.'] },
    ],
  },
  epaules: {
    resume: 'Deltoïdes antérieur, latéral et postérieur : lèvent et tournent le bras.',
    sections: [
      { titre: 'Rôle', points: ['Antérieur : très sollicité par tous les développés (pecs et épaules).', 'Latéral : donne la largeur, travaillé par les élévations latérales.', 'Postérieur : souvent négligé, travaillé par le rear delt fly et les tirages hauts.'] },
      { titre: 'Récupération', points: ['Rapide pour les faisceaux latéral et postérieur : supportent 2 à 3 séances par semaine.'] },
      { titre: 'Bien le travailler', points: ['Ajouter des élévations latérales : les développés ne travaillent presque pas le faisceau latéral.', 'Garder au moins autant de tirages que de poussées pour l’équilibre de l’épaule.'] },
    ],
  },
  trapezes: {
    resume: 'Haut, milieu et bas : élèvent, rapprochent et abaissent les omoplates.',
    sections: [
      { titre: 'Rôle', points: ['Haut : haussements d’épaules (shrugs).', 'Milieu et bas : tous les rowings, coudes écartés.'] },
      { titre: 'Récupération', points: ['Rapide, muscle endurant.'] },
      { titre: 'Bien le travailler', points: ['Shrugs : monter droit, tenir 1 s en haut, sans rouler les épaules.', 'Les soulevés et rowings lourds les travaillent déjà beaucoup.'] },
    ],
  },
  cou: {
    resume: 'Fléchisseurs, extenseurs et inclinateurs de la tête.',
    sections: [
      { titre: 'Bien le travailler', points: ['Charges légères, mouvements lents, 15 à 25 reps.', 'Toujours progressif : une zone sensible, pas de mouvements brusques.'] },
    ],
  },
  dos: {
    resume: 'Grand dorsal, rhomboïdes, grand rond : tirent le bras vers le bas et vers l’arrière.',
    sections: [
      { titre: 'Rôle', points: ['Tirages verticaux (tractions, lat pulldown) : surtout le grand dorsal, la largeur.', 'Tirages horizontaux (rowings) : rhomboïdes, trapèzes moyens, l’épaisseur.'] },
      { titre: 'Récupération', points: ['Moyenne : 48 à 72 h.'] },
      { titre: 'Bien le travailler', points: ['Faire les deux types de tirage chaque semaine.', 'Penser « tirer avec les coudes », la main n’est qu’un crochet.', 'Laisser les omoplates s’ouvrir en position étirée, puis les serrer en fin de tirage.'] },
    ],
  },
  lombaires: {
    resume: 'Érecteurs du rachis : tiennent le dos droit, surtout en gainage.',
    sections: [
      { titre: 'Récupération', points: ['Lente : beaucoup sollicités indirectement (rowing barre, soulevés, squats).'] },
      { titre: 'Bien le travailler', points: ['Extensions au banc à 45° ou good mornings légers.', 'Dos neutre sur tous les exercices : ni rond ni hyper-cambré sous charge.'] },
    ],
  },
  biceps: {
    resume: 'Biceps et brachial : fléchissent le coude et tournent l’avant-bras paume vers le haut.',
    sections: [
      { titre: 'Récupération', points: ['Rapide : 2 à 3 séances par semaine possibles, en comptant les tirages.'] },
      { titre: 'Bien le travailler', points: ['Curl incliné ou pupitre pour la position étirée, curl marteau pour le brachial.', 'Coudes fixes, pas d’élan du buste.', 'Descente complète et contrôlée : c’est là que l’on perd souvent la moitié du mouvement.'] },
    ],
  },
  triceps: {
    resume: 'Trois chefs : étendent le coude ; le chef long passe aussi par l’épaule.',
    sections: [
      { titre: 'Rôle', points: ['Deux tiers du volume du bras.', 'Chef long : mieux étiré bras au-dessus de la tête (extension nuque, poulie derrière la tête).'] },
      { titre: 'Récupération', points: ['Rapide, mais déjà très sollicités par tous les développés.'] },
      { titre: 'Bien le travailler', points: ['Combiner une extension bras en l’air et une extension bras le long du corps (poulie).', 'Coudes fixes, verrouiller sans claquer l’articulation.'] },
    ],
  },
  'avant-bras': {
    resume: 'Fléchisseurs et extenseurs du poignet, et la force de préhension.',
    sections: [
      { titre: 'Récupération', points: ['Très rapide, muscles endurants : supportent beaucoup de reps.'] },
      { titre: 'Bien le travailler', points: ['Curls poignets paumes vers le haut et vers le bas, 12 à 20 reps, amplitude complète.', 'Les tirages lourds sans sangles travaillent déjà la préhension.'] },
    ],
  },
  abdos: {
    resume: 'Grand droit, obliques, transverse : fléchissent, tournent et gainent le tronc.',
    sections: [
      { titre: 'Récupération', points: ['Rapide.'] },
      { titre: 'Bien le travailler', points: ['Les traiter comme les autres muscles : charge progressive, 8 à 15 reps.', 'Enrouler la colonne (crunch) plutôt que tirer sur la nuque ou les hanches.', 'Les abdos visibles dépendent surtout du taux de masse grasse.'] },
    ],
  },
  quadriceps: {
    resume: 'Quatre chefs à l’avant de la cuisse : étendent le genou ; le droit fémoral fléchit aussi la hanche.',
    sections: [
      { titre: 'Récupération', points: ['Lente : 72 h après une séance lourde de squat ou de presse.'] },
      { titre: 'Bien le travailler', points: ['Un mouvement lourd (squat, hack squat, presse) + leg extension pour le droit fémoral.', 'Descendre profond : le gain est plus grand en position étirée.', 'Genoux dans l’axe des pieds ; ils peuvent dépasser les orteils, c’est normal.'] },
    ],
  },
  ischios: {
    resume: 'Arrière de la cuisse : fléchissent le genou et étendent la hanche.',
    sections: [
      { titre: 'Récupération', points: ['Lente, surtout après des soulevés de terre jambes tendues.'] },
      { titre: 'Bien le travailler', points: ['Deux types de mouvement : flexion du genou (leg curl) et extension de hanche (soulevé jambes tendues).', 'Le leg curl assis étire mieux les ischios que le couché : légèrement plus efficace.', 'Muscles souvent touchés par les déchirures : progression régulière, sans à-coups.'] },
    ],
  },
  fessiers: {
    resume: 'Grand, moyen et petit fessier : étendent la hanche, l’écartent et la stabilisent.',
    sections: [
      { titre: 'Rôle', points: ['Grand fessier : squats profonds, fentes, hip thrust.', 'Moyen et petit fessier : écartent la jambe (hip abduction) et stabilisent le bassin sur une jambe.'] },
      { titre: 'Récupération', points: ['Moyenne à lente.'] },
      { titre: 'Bien le travailler', points: ['Fentes bulgares et squats profonds pour la position étirée.', 'Hip thrust ou pont pour la contraction en haut.'] },
    ],
  },
  mollets: {
    resume: 'Gastrocnémiens et soléaire : montent sur la pointe des pieds.',
    sections: [
      { titre: 'Rôle', points: ['Jambe tendue : gastrocnémiens et soléaire.', 'Genou plié (mollets assis) : surtout le soléaire.'] },
      { titre: 'Récupération', points: ['Rapide.'] },
      { titre: 'Bien le travailler', points: ['Amplitude complète, pause de 1 à 2 s en bas en étirement : c’est là que se fait le gain.', 'Pas de rebond, montée contrôlée.', '8 à 15 reps, menées près de l’échec.'] },
    ],
  },
  adducteurs: {
    resume: 'Intérieur de la cuisse : rapprochent les jambes et aident à l’extension de hanche.',
    sections: [
      { titre: 'Bien le travailler', points: ['Le grand adducteur travaille beaucoup dans les squats profonds et les fentes.', 'Machine adducteurs : amplitude contrôlée, sans forcer l’écart en début de série.'] },
    ],
  },
  abducteurs: {
    resume: 'Moyen et petit fessier, tenseur du fascia lata : écartent la jambe.',
    sections: [
      { titre: 'Bien le travailler', points: ['Hip abduction machine, buste légèrement penché en avant pour mieux cibler les fessiers.', 'Utiles pour la stabilité du genou et du bassin.'] },
    ],
  },
};

// ---------------------------------------------------------------- Matériel

export const CONSEILS_EQUIPEMENTS: Partial<Record<Equipement, FicheConseil>> = {
  machine: {
    resume: 'Trajectoire guidée : sûr, facile à mener près de l’échec.',
    sections: [{ titre: 'Astuces', points: ['Régler le siège pour aligner l’articulation travaillée sur l’axe de la machine ; noter le réglage dans l’app.', 'Idéal pour finir un muscle à RIR 0 sans risque.'] }],
  },
  poulie: {
    resume: 'Tension constante sur toute l’amplitude.',
    sections: [{ titre: 'Astuces', points: ['Placer la poulie pour que la résistance soit maximale là où le muscle est étiré.', 'Rester stable : ne pas se laisser tirer par la charge.'] }],
  },
  barre: {
    resume: 'Les charges les plus lourdes, idéal pour la force.',
    sections: [{ titre: 'Astuces', points: ['Échauffement progressif indispensable.', 'Utiliser les sécurités ou un pareur pour les séries lourdes au banc.', 'La charge notée inclut la barre (20 kg pour une barre olympique).'] }],
  },
  halteres: {
    resume: 'Amplitude plus grande, chaque côté travaille seul.',
    sections: [{ titre: 'Astuces', points: ['Corrige les déséquilibres gauche/droite.', 'Charge notée par main : l’app la double pour le volume et le 1RM.'] }],
  },
  poids_du_corps: {
    resume: 'Le poids du corps compte dans la charge.',
    sections: [{ titre: 'Astuces', points: ['Renseigner son poids dans la séance : sinon le 1RM et le volume sont sous-estimés.', 'Progresser en ajoutant un lest une fois 10 à 12 reps propres atteintes.'] }],
  },
  kettlebell: {
    resume: 'Centre de gravité décalé : très bon pour les mouvements balistiques.',
    sections: [{ titre: 'Astuces', points: ['Swings : la force vient des hanches, pas des bras.'] }],
  },
};

// ---------------------------------------------------------------- Exercices de départ (clé = nom exact de la bibliothèque)

const ex = (resume: string, execution: string[], optimiser: string[], erreurs: string[]): FicheConseil => ({
  resume,
  sections: [
    { titre: 'Exécution', points: execution },
    { titre: 'Optimiser', points: optimiser },
    { titre: 'Erreurs fréquentes', points: erreurs },
  ],
});

export const CONSEILS_EXERCICES: Record<string, FicheConseil> = {
  'Pec fly': ex(
    'Isolation des pectoraux, surtout en position étirée.',
    ['Siège réglé pour que les poignées soient à hauteur de poitrine.', 'Coudes légèrement fléchis et fixes, rapprocher les bras en arc de cercle.', 'Revenir lentement jusqu’à sentir l’étirement des pecs.'],
    ['Omoplates serrées contre le dossier.', 'L’ouverture (étirement) est la partie la plus utile : 2 à 3 s.'],
    ['Plier et tendre les coudes pendant le mouvement (cela devient un développé).', 'Décoller les épaules du dossier.'],
  ),
  'Chest press': ex(
    'Développé guidé : pectoraux, deltoïdes antérieurs, triceps.',
    ['Poignées à hauteur du milieu de la poitrine.', 'Pousser sans verrouiller sèchement les coudes, revenir jusqu’à un bon étirement.'],
    ['Omoplates serrées et basses, poitrine sortie.', 'Coudes à environ 45–60° du buste.'],
    ['Épaules qui avancent en fin de poussée.', 'Amplitude coupée au retour.'],
  ),
  'Bench press (plate)': ex(
    'Développé couché sur machine à disques : pectoraux, deltoïdes antérieurs, triceps.',
    ['Même placement qu’au développé couché : omoplates serrées, pieds au sol.', 'Descendre jusqu’à la poitrine ou à l’étirement, pousser de façon contrôlée.'],
    ['Prise large : plus de pecs, amplitude plus courte ; prise moyenne : bon compromis.', 'Charge notée par côté.'],
    ['Fesses qui décollent du banc.', 'Rebond en bas.'],
  ),
  'Développé couché': ex(
    'L’exercice de référence en force du haut du corps : pectoraux, deltoïdes antérieurs, triceps.',
    ['Yeux sous la barre, omoplates serrées et basses, léger arc, pieds ancrés.', 'Prise un peu plus large que les épaules, poignets droits au-dessus des coudes.', 'Descendre la barre sur le bas des pecs, coudes à 45–70°, puis pousser vers le haut et légèrement vers l’arrière.'],
    ['Toucher la poitrine sans rebond, garder la tension.', 'Utiliser les sécurités ou un pareur pour les séries lourdes.'],
    ['Coudes à 90° (stress sur l’épaule).', 'Fesses qui décollent.', 'Barre qui descend sur le cou.'],
  ),
  Dips: ex(
    'Poussée au poids du corps : pectoraux (bas), triceps, deltoïdes antérieurs.',
    ['Partir bras tendus, épaules basses.', 'Descendre jusqu’à ce que les épaules soient au niveau des coudes, ou un peu en dessous si l’épaule est à l’aise.', 'Remonter sans verrouiller sèchement.'],
    ['Buste penché en avant = plus de pecs ; buste droit = plus de triceps.', 'Ajouter du lest une fois 12 reps propres atteintes.'],
    ['Descendre trop bas sans contrôle (épaule en avant).', 'Hausser les épaules vers les oreilles.'],
  ),
  'Seated triceps press': ex(
    'Extension des triceps sur machine.',
    ['Coudes alignés avec l’axe de la machine.', 'Étendre complètement, revenir jusqu’à un bon étirement.'],
    ['Idéal en fin de séance pour aller près de l’échec.'],
    ['Pousser avec les épaules ou le buste.'],
  ),
  'Vertical chest press': ex(
    'Développé assis guidé : pectoraux, deltoïdes antérieurs, triceps.',
    ['Siège réglé pour que les poignées soient à hauteur du milieu de la poitrine.', 'Pousser devant soi, revenir jusqu’à l’étirement.'],
    ['Poignées hautes ou basses : un réglage plus bas cible légèrement le haut des pecs.'],
    ['Épaules qui montent ou avancent.'],
  ),
  'Extension poulie': ex(
    'Triceps à la poulie haute (pushdown).',
    ['Coudes collés au corps et fixes.', 'Pousser jusqu’à l’extension complète, remonter jusqu’à environ 90° ou plus.'],
    ['Corde : écarter les mains en bas pour une meilleure contraction.', 'Compléter par une extension au-dessus de la tête pour le chef long.'],
    ['Coudes qui avancent, buste qui se penche pour pousser.'],
  ),
  'Développé incliné haltères': ex(
    'Développé incliné : haut des pectoraux, deltoïdes antérieurs.',
    ['Banc à 30–45° ; au-delà, les épaules prennent le relais.', 'Descendre les haltères sur les côtés de la poitrine, coudes à 45–60°.', 'Pousser en rapprochant légèrement les haltères.'],
    ['Les haltères permettent de descendre plus bas qu’une barre : en profiter.'],
    ['Banc trop incliné.', 'Haltères qui s’entrechoquent en haut en relâchant la tension.'],
  ),
  'Développé incliné barre': ex(
    'Développé incliné à la barre : haut des pectoraux, deltoïdes antérieurs, triceps.',
    ['Banc à 30–45°, omoplates serrées, pieds ancrés.', 'Descendre la barre sous les clavicules, pousser à la verticale.'],
    ['Charges plus légères qu’à plat : c’est normal.'],
    ['Barre qui descend trop bas sur le ventre.', 'Bassin qui décolle.'],
  ),
  'Développé couché haltères': ex(
    'Développé à plat aux haltères : pectoraux, deltoïdes antérieurs, triceps.',
    ['Omoplates serrées, haltères au-dessus de la poitrine.', 'Descendre jusqu’à un bon étirement, coudes à 45–60°, puis pousser.'],
    ['Amplitude plus grande et plus libre pour l’épaule que la barre.'],
    ['Coudes trop écartés.', 'Laisser tomber les haltères en bas.'],
  ),
  'Extension concentrée triceps': ex(
    'Extension d’un bras avec un haltère : triceps, surtout le chef long si le bras est au-dessus de la tête.',
    ['Bras au-dessus de la tête, coude pointé vers le plafond et fixe.', 'Descendre l’haltère derrière la tête jusqu’à l’étirement, remonter.'],
    ['La position étirée du chef long favorise sa croissance.'],
    ['Coude qui s’écarte vers l’extérieur.', 'Cambrer le dos.'],
  ),
  'Développé haltères diamant': ex(
    'Squeeze press : haltères serrés l’un contre l’autre ; pectoraux et triceps.',
    ['Allongé, haltères collés au-dessus de la poitrine, presser les haltères l’un contre l’autre pendant tout le mouvement.', 'Descendre jusqu’à la poitrine, remonter.'],
    ['La pression latérale garde les pecs en tension même en haut.'],
    ['Relâcher la pression entre les haltères.'],
  ),
  'Développé couché décliné': ex(
    'Développé décliné : pectoraux (faisceau sterno-costal, partie basse), triceps.',
    ['Banc décliné de 15 à 30°, jambes bloquées.', 'Descendre la barre sur le bas des pecs, pousser.'],
    ['Amplitude plus courte qu’à plat : charges souvent un peu plus lourdes.', 'Le développé à plat et les dips sollicitent déjà bien le bas des pecs.'],
    ['Se relever brusquement entre les séries (vertiges) : se redresser lentement.'],
  ),
  'Lat pulldown': ex(
    'Tirage vertical : grand dorsal, biceps.',
    ['Cuisses bloquées, prise un peu plus large que les épaules.', 'Tirer la barre vers le haut de la poitrine en abaissant les coudes.', 'Remonter bras tendus en laissant les omoplates s’élever (étirement).'],
    ['Penser « coudes vers les poches ».', 'Buste légèrement incliné en arrière (10–20°), pas plus.'],
    ['Se balancer en arrière pour tirer.', 'Tirer derrière la nuque.', 'Ne pas remonter complètement.'],
  ),
  Tractions: ex(
    'Tirage vertical au poids du corps : grand dorsal, biceps, milieu du dos.',
    ['Partir bras tendus, épaules engagées (ne pas pendre relâché).', 'Monter jusqu’à ce que le menton passe la barre, coudes vers les hanches.', 'Redescendre en contrôle jusqu’à bras tendus.'],
    ['Lest quand 10–12 reps propres sont faciles ; élastique ou négatives lentes si moins de 5.', 'Renseigner son poids de corps pour un 1RM juste.'],
    ['Demi-reps sans descendre.', 'Balancer les jambes (kipping).'],
  ),
  'Seated row (poulie assise)': ex(
    'Rowing horizontal : milieu du dos (rhomboïdes, trapèzes), grand dorsal, biceps.',
    ['Dos droit et gainé, buste stable (au plus une légère inclinaison avant au retour).', 'Tirer la poignée vers le bas du ventre en serrant les omoplates.', 'Revenir bras tendus en laissant les omoplates s’ouvrir.'],
    ['Prise neutre et coudes près du corps : plus de grand dorsal ; coudes écartés : plus de haut du dos.'],
    ['Basculer le buste d’avant en arrière pour tirer.', 'Arrondir le bas du dos.'],
  ),
  'Rear delt fly': ex(
    'Deltoïdes postérieurs (pec fly inversé).',
    ['Poitrine contre le dossier, bras tendus à hauteur d’épaule.', 'Ouvrir les bras vers l’arrière en arc de cercle, sans serrer fort les omoplates.'],
    ['Charges légères, 12 à 20 reps, focus sur l’arrière de l’épaule.', 'Paumes vers le bas ou vers l’intérieur : les deux fonctionnent.'],
    ['Tirer avec les trapèzes en serrant les omoplates.', 'Charge trop lourde avec élan.'],
  ),
  'Curl incliné': ex(
    'Curl aux haltères sur banc incliné : biceps en position étirée.',
    ['Banc à 45–60°, bras pendants derrière le buste.', 'Fléchir le coude sans avancer le bras, paume vers le haut.', 'Redescendre jusqu’à l’extension complète.'],
    ['L’étirement du chef long en fait un des meilleurs curls pour l’hypertrophie.'],
    ['Avancer les coudes en montant.', 'Couper l’amplitude en bas.'],
  ),
  'Arm curl': ex(
    'Curl biceps sur machine pupitre.',
    ['Aisselles calées en haut du pupitre, coudes alignés avec l’axe.', 'Monter en contrôle, redescendre jusqu’à bras presque tendus.'],
    ['Très bon en position étirée : ne pas négliger le bas du mouvement.'],
    ['Décoller les coudes ou le buste.'],
  ),
  'Poulie biceps': ex(
    'Curl biceps à la poulie basse.',
    ['Debout, coudes près du corps et fixes.', 'Fléchir jusqu’en haut, redescendre lentement.'],
    ['Tension constante : bon exercice de finition.', 'Corde = travail du brachial et du brachio-radial (prise marteau).'],
    ['Avancer les coudes, balancer le buste.'],
  ),
  'Plate lateral pulldown': ex(
    'Tirage convergent sur machine à disques : grand dorsal.',
    ['Cuisses bloquées, tirer les poignées vers le bas et vers les côtés.', 'Remonter jusqu’à l’étirement complet.'],
    ['Un bras à la fois possible pour corriger un déséquilibre.', 'Charge notée par bras.'],
    ['Tirer avec les biceps sans abaisser les coudes.'],
  ),
  'Rowing barre': ex(
    'Rowing buste penché : milieu et haut du dos, grand dorsal, lombaires en gainage.',
    ['Buste penché à 30–45° de l’horizontale, dos plat, genoux légèrement fléchis.', 'Tirer la barre vers le nombril, coudes vers l’arrière.', 'Redescendre bras tendus sans bouger le buste.'],
    ['Si le bas du dos fatigue avant le dos, passer à un rowing appuyé (poitrine sur banc).'],
    ['Dos rond.', 'Redresser le buste à chaque rep pour tricher.'],
  ),
  'Curl barre': ex(
    'Curl debout à la barre : biceps, brachial.',
    ['Debout, prise largeur d’épaules, coudes le long du corps.', 'Monter sans élan, redescendre jusqu’à bras tendus.'],
    ['Barre EZ si les poignets sont inconfortables.'],
    ['Balancer le buste.', 'Avancer les coudes en haut.'],
  ),
  'Curl biceps poulie': ex(
    'Curl à la poulie basse, câble entre les jambes.',
    ['Coudes près du corps, buste fixe.', 'Fléchir jusqu’en haut, redescendre lentement.'],
    ['Reculer d’un pas pour garder de la tension en bas du mouvement.'],
    ['Se pencher en arrière.'],
  ),
  'One arm cable row': ex(
    'Rowing à un bras à la poulie : grand dorsal, milieu du dos.',
    ['Buste stable, tirer la poignée vers la hanche, coude près du corps.', 'Laisser l’épaule avancer au retour pour l’étirement.'],
    ['Un côté à la fois : corrige les déséquilibres et allonge l’amplitude.'],
    ['Tourner le buste pour tirer.'],
  ),
  'Avant-bras': ex(
    'Curl poignet aux haltères : fléchisseurs de l’avant-bras.',
    ['Avant-bras posés sur la cuisse ou un banc, poignet dans le vide.', 'Descendre lentement en laissant l’haltère rouler vers les doigts, puis remonter en fléchissant le poignet.'],
    ['12 à 20 reps, très contrôlé.', 'Alterner avec la version paume vers le bas (extenseurs).'],
    ['Mouvement trop court ou trop rapide.'],
  ),
  'Shoulder press': ex(
    'Développé épaules sur machine : deltoïdes antérieurs et latéraux, triceps.',
    ['Siège réglé pour que les poignées partent au niveau des épaules.', 'Pousser vers le haut sans cambrer, redescendre au moins jusqu’au menton.'],
    ['Dos plaqué au dossier.', 'Compléter par des élévations latérales pour le faisceau latéral.'],
    ['Cambrer fort le bas du dos.', 'Demi-amplitude en haut seulement.'],
  ),
  'Abdominal crunch': ex(
    'Crunch sur machine : grand droit de l’abdomen.',
    ['Enrouler la colonne vertèbre par vertèbre, comme pour rapprocher les côtes du bassin.', 'Revenir lentement jusqu’à l’étirement.'],
    ['Expirer en enroulant.', 'Charges progressives, 8 à 15 reps.'],
    ['Tirer avec les bras.', 'Plier seulement les hanches sans enrouler le dos.'],
  ),
  'Leg press': ex(
    'Presse à cuisses : quadriceps, fessiers.',
    ['Pieds largeur d’épaules au milieu de la plateforme.', 'Descendre aussi bas que possible sans que le bassin décolle du dossier.', 'Pousser sans verrouiller sèchement les genoux.'],
    ['Pieds bas = plus de quadriceps ; pieds hauts = plus de fessiers et ischios.', 'La profondeur compte plus que la charge.'],
    ['Bassin qui s’enroule et décolle en bas (stress lombaire).', 'Genoux qui rentrent vers l’intérieur.'],
  ),
  'Leg extension': ex(
    'Extension de jambes : quadriceps, seul exercice qui cible bien le droit fémoral.',
    ['Genou aligné avec l’axe de la machine, boudin au-dessus de la cheville.', 'Étendre complètement, redescendre lentement jusqu’à la flexion maximale.'],
    ['Tenir les poignées pour rester assis au fond du siège.', 'Dossier plus incliné vers l’arrière = droit fémoral plus étiré.'],
    ['Donner de l’élan, laisser retomber la charge.'],
  ),
  Mollets: ex(
    'Extension des chevilles : gastrocnémiens et soléaire.',
    ['Avant-pieds sur le bord, talons dans le vide.', 'Descendre au maximum, pause de 1 à 2 s en bas, monter le plus haut possible.'],
    ['L’étirement en bas est la partie la plus efficace.', 'Genou tendu pour les gastrocnémiens, genou fléchi (assis) pour le soléaire.'],
    ['Rebondir, amplitude courte.'],
  ),
  'Hip abduction': ex(
    'Abduction de hanche sur machine : moyen et petit fessier.',
    ['Dos contre le dossier, écarter les jambes en contrôle, revenir lentement.'],
    ['Buste penché en avant : le moyen fessier travaille plus en étirement.', 'Pause de 1 s jambes écartées.'],
    ['Laisser claquer la charge au retour.'],
  ),
  'Fentes bulgares': ex(
    'Fente avec le pied arrière surélevé : quadriceps, fessiers.',
    ['Pied arrière posé sur un banc, pied avant assez loin pour que le genou reste stable.', 'Descendre à la verticale jusqu’à ce que le genou arrière frôle le sol.', 'Pousser par le pied avant.'],
    ['Buste droit = plus de quadriceps ; buste penché en avant = plus de fessiers.', 'Commencer par le côté le plus faible.'],
    ['Pied avant trop proche (talon qui décolle).', 'Pousser avec la jambe arrière.'],
  ),
  'Leg curl': ex(
    'Flexion de jambes : ischios.',
    ['Genou aligné avec l’axe, boudin juste au-dessus des talons.', 'Fléchir complètement, redescendre lentement jusqu’à jambes presque tendues.'],
    ['Version assise : ischios plus étirés, légèrement plus efficace.', 'Pointes de pieds vers soi pour mieux engager.'],
    ['Lever le bassin (couché) ou donner de l’élan.'],
  ),
  'Hack squat': ex(
    'Squat guidé dos appuyé : quadriceps, fessiers.',
    ['Dos et bassin plaqués, pieds largeur d’épaules.', 'Descendre profond (cuisses sous la parallèle si la mobilité le permet), pousser sans verrouiller.'],
    ['Pieds bas sur la plateforme = plus de quadriceps.', 'Descente lente, pas de rebond.'],
    ['Talons qui décollent.', 'Genoux qui rentrent.'],
  ),
};

/** Conseils d'un exercice : propres à l'exercice s'ils existent, sinon `undefined` (afficher ceux des muscles). */
export const conseilsExercice = (nom: string): FicheConseil | undefined => CONSEILS_EXERCICES[nom];
