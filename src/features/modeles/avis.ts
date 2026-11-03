// Avis sur le format d'un modèle de séance, calculé par des règles (sans IA). Propriétaire : 04-seance (seuils relus par 10-coach).
// Repères : ~3 à 10 séries par muscle et par séance ; au-delà, chaque série en plus rapporte peu (Schoenfeld 2017, Pelland 2024).
// Gros exercices d'abord, repos ≥ 2 min sur les polyarticulaires (Schoenfeld 2016).
import type { BlocModele, Id } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';

export type TypeSeance = 'push' | 'pull' | 'jambes' | 'full' | 'autre';
export type Verdict = 'vide' | 'adaptee' | 'a-ajuster' | 'incomplete' | 'trop-chargee';

export interface Remarque {
  /** ok = point fort ; conseil = à améliorer ; probleme = rend la séance incomplète ou trop lourde. */
  ton: 'ok' | 'conseil' | 'probleme';
  texte: string;
}

/** Séries par muscle : un muscle travaillé en second compte pour une demi-série. */
export function seriesParMuscle(blocs: BlocModele[], exercices: Map<Id, InfoExercice>): Record<string, number> {
  const parMuscle: Record<string, number> = {};
  for (const b of blocs) {
    const n = b.seriesCibles ?? SERIES_PAR_DEFAUT;
    const gs = exercices.get(b.exerciceId)?.groupesMusculaires ?? [];
    gs.forEach((g, i) => (parMuscle[g] = (parMuscle[g] ?? 0) + (i === 0 ? n : n / 2)));
  }
  return parMuscle;
}

export interface AvisModele {
  verdict: Verdict;
  type: TypeSeance;
  series: number;
  dureeMin: number;
  /** Séries par muscle (un muscle travaillé en second compte pour une demi-série). */
  parMuscle: Record<string, number>;
  remarques: Remarque[];
}

export interface InfoExercice {
  nom: string;
  groupesMusculaires: string[];
}

export const LIBELLES_VERDICT: Record<Verdict, string> = {
  vide: 'Vide',
  adaptee: 'Adaptée',
  'a-ajuster': 'À ajuster',
  incomplete: 'Incomplète',
  'trop-chargee': 'Trop chargée',
};

export const LIBELLES_TYPE: Record<TypeSeance, string> = {
  push: 'Push (pousser : pecs, épaules, triceps)',
  pull: 'Pull (tirer : dos, biceps)',
  jambes: 'Jambes',
  full: 'Full body (tout le corps)',
  autre: 'Séance libre',
};

export const POUSSER = ['pectoraux', 'epaules', 'triceps'];
export const TIRER = ['dos', 'biceps', 'avant-bras', 'trapezes'];
export const BAS = ['quadriceps', 'ischios', 'fessiers', 'mollets', 'adducteurs', 'abducteurs'];

/** Muscles attendus par type de séance. */
export const ATTENDUS: Record<TypeSeance, string[]> = {
  push: ['pectoraux', 'epaules', 'triceps'],
  pull: ['dos', 'biceps'],
  jambes: ['quadriceps', 'ischios', 'fessiers'],
  full: ['pectoraux', 'dos', 'quadriceps', 'ischios', 'epaules'],
  autre: [],
};

export const SERIES_PAR_DEFAUT = 3;
const EFFORT_SEC = 40;
const INSTALLATION_SEC = 60;
const REPOS_SANS_CIBLE_SEC = 90;
export const SEUILS = {
  seriesMin: 9,
  seriesMax: 30,
  dureeMax: 90,
  exercicesMax: 10,
  /** Par muscle et par séance. */
  muscleMin: 3,
  muscleMax: 12,
  reposPolyMin: 90,
};

const ISOLATION = /\b(fly|curl|extension|[ée]l[ée]vation|abduction|adduction|crunch|kickback|mollet|calf|triceps|biceps|avant-bras|shrug|oiseau|pull-?over)/i;
const POLYARTICULAIRE = /(d[ée]velopp[ée]|press|tirage|pulldown|row|traction|dips|squat|fente|soulev[ée]|deadlift|hip thrust|pompe|tractions|chin|pull-?up|push-?up|clean|snatch)/i;
/** Gros exercice (polyarticulaire) : d'après le nom s'il est parlant, sinon plusieurs muscles travaillés. */
export const poly = (e?: InfoExercice) => {
  if (!e) return false;
  if (ISOLATION.test(e.nom)) return false;
  if (POLYARTICULAIRE.test(e.nom)) return true;
  return e.groupesMusculaires.length >= 2;
};

/** Type de séance : d'après le nom s'il est parlant, sinon d'après la répartition des séries. */
export function typeSeance(nom: string, parMuscle: Record<string, number>, choisi?: TypeSeance): TypeSeance {
  if (choisi) return choisi;
  const n = nom.toLowerCase();
  if (/full|tout le corps|corps entier/.test(n)) return 'full';
  if (/push|pouss/.test(n)) return 'push';
  if (/pull|tirag|tirer/.test(n)) return 'pull';
  if (/jambe|leg|cuisse|bas du corps/.test(n)) return 'jambes';
  const somme = (gs: string[]) => gs.reduce((s, g) => s + (parMuscle[g] ?? 0), 0);
  const p = somme(POUSSER);
  const t = somme(TIRER);
  const b = somme(BAS);
  const total = p + t + b;
  if (total === 0) return 'autre';
  if (p / total >= 0.7) return 'push';
  if (t / total >= 0.7) return 'pull';
  if (b / total >= 0.7) return 'jambes';
  if (p / total >= 0.15 && t / total >= 0.15 && b / total >= 0.15) return 'full';
  return 'autre';
}

const arrondi = (x: number) => Math.round(x * 2) / 2;
const nb = (x: number) => String(arrondi(x)).replace('.', ',');
const liste = (xs: string[], max = 3) => {
  if (xs.length > max) return `${xs.slice(0, max).join(', ')} et ${xs.length - max} autre${xs.length - max > 1 ? 's' : ''}`;
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`;
};
const repsMax = (cible?: string) => {
  const ns = (cible ?? '').match(/\d+/g)?.map(Number) ?? [];
  return ns.length ? Math.max(...ns) : undefined;
};

/** Durée estimée en secondes : effort + repos par série (un repos par tour en superset) + installation par exercice. */
export function dureeEstimeeSec(blocs: BlocModele[]): number {
  let sec = 0;
  blocs.forEach((b, i) => {
    const series = b.seriesCibles ?? SERIES_PAR_DEFAUT;
    const suivantMemeSuperset = !!b.supersetId && blocs[i + 1]?.supersetId === b.supersetId;
    sec += INSTALLATION_SEC + series * (EFFORT_SEC + (suivantMemeSuperset ? 0 : (b.reposSec ?? REPOS_SANS_CIBLE_SEC)));
  });
  return sec;
}

export function analyserModele(nom: string, blocs: BlocModele[], exercices: Map<Id, InfoExercice>, choisi?: TypeSeance): AvisModele {
  const parMuscle = seriesParMuscle(blocs, exercices);
  const series = blocs.reduce((s, b) => s + (b.seriesCibles ?? SERIES_PAR_DEFAUT), 0);
  const dureeMin = Math.round(dureeEstimeeSec(blocs) / 60);
  const type = typeSeance(nom, parMuscle, choisi);
  const remarques: Remarque[] = [];
  const probleme = (texte: string) => remarques.push({ ton: 'probleme', texte });
  const conseil = (texte: string) => remarques.push({ ton: 'conseil', texte });
  const ok = (texte: string) => remarques.push({ ton: 'ok', texte });

  if (blocs.length === 0) {
    return { verdict: 'vide', type, series: 0, dureeMin: 0, parMuscle, remarques: [{ ton: 'conseil', texte: 'Ajoute des exercices pour voir l’avis sur ta séance.' }] };
  }

  let incomplete = false;
  let tropChargee = false;

  // Exercices introuvables
  const absents = blocs.filter((b) => !exercices.has(b.exerciceId)).length;
  if (absents) conseil(`${absents} exercice${absents > 1 ? 's' : ''} supprimé${absents > 1 ? 's' : ''} de ta bibliothèque : retire-le${absents > 1 ? 's' : ''} ou remplace-le${absents > 1 ? 's' : ''}.`);

  // Muscles attendus selon le type
  const attendus = ATTENDUS[type];
  const manquants = attendus.filter((g) => !parMuscle[g]);
  const faibles = attendus.filter((g) => parMuscle[g] && parMuscle[g] < SEUILS.muscleMin);
  const typeCourt = LIBELLES_TYPE[type].split(' (')[0];
  if (manquants.length) {
    incomplete = true;
    probleme(`Aucun exercice pour ${liste(manquants.map((g) => libelleGroupe(g).toLowerCase()))}, attendu${manquants.length > 1 ? 's' : ''} dans une séance ${typeCourt}.`);
  }
  if (faibles.length) {
    conseil(`Peu de séries pour ${liste(faibles.map((g) => `${libelleGroupe(g).toLowerCase()} (${nb(parMuscle[g])})`))} : vise au moins ${SEUILS.muscleMin} séries par muscle travaillé.`);
  }
  if (attendus.length && !manquants.length && !faibles.length) ok(`Tous les muscles clés d’une séance ${typeCourt} sont travaillés.`);

  // Trop de séries pour un même muscle
  const surcharges = Object.entries(parMuscle).filter(([, n]) => n > SEUILS.muscleMax);
  if (surcharges.length) {
    conseil(
      `Beaucoup de séries pour ${liste(surcharges.map(([g, n]) => `${libelleGroupe(g).toLowerCase()} (${nb(n)})`))} : au-delà d’une dizaine par séance, les séries en plus rapportent peu. Retire-en ou garde-les pour une autre séance.`,
    );
  }

  // Volume total et durée
  if (series < SEUILS.seriesMin) {
    incomplete = true;
    probleme(`Seulement ${series} séries en tout : une séance complète en compte plutôt ${SEUILS.seriesMin} à 25.`);
  } else if (series > SEUILS.seriesMax) {
    tropChargee = true;
    probleme(`${series} séries en tout, c’est beaucoup : la fatigue fait baisser la qualité des dernières. Vise 25 au maximum.`);
  }
  if (dureeMin > SEUILS.dureeMax) {
    tropChargee = true;
    probleme(`Durée estimée : environ ${dureeTexteMin(dureeMin)}. Au-delà d’1 h 30, la fin de séance est rarement efficace : retire des exercices ou des séries.`);
  } else if (series >= SEUILS.seriesMin && series <= SEUILS.seriesMax) {
    ok(`${series} séries, environ ${dureeTexteMin(dureeMin)} : une durée raisonnable.`);
  }
  if (blocs.length > SEUILS.exercicesMax) {
    conseil(`${blocs.length} exercices, c’est beaucoup pour une séance : mieux vaut moins d’exercices avec plus de séries chacun (5 à 8 suffisent).`);
  }

  // Équilibre
  const somme = (gs: string[]) => gs.reduce((s, g) => s + (parMuscle[g] ?? 0), 0);
  if (type === 'full') {
    const p = somme(POUSSER);
    const t = somme(TIRER);
    if (p && t && p > 2 * t) conseil('Plus de « pousser » que de « tirer » : ajoute un tirage ou un rowing pour équilibrer (dos et épaules).');
    else if (p && t && t > 2 * p) conseil('Plus de « tirer » que de « pousser » : ajoute un développé pour équilibrer.');
  }
  if (type === 'jambes' || type === 'full') {
    const q = parMuscle.quadriceps ?? 0;
    const i = parMuscle.ischios ?? 0;
    if (q && i && q > 3 * i) conseil(`Les quadriceps (${nb(q)} séries) travaillent bien plus que les ischios (${nb(i)}) : ajoute un leg curl pour protéger les genoux et équilibrer la cuisse.`);
  }

  // Doublons
  const vus = new Set<string>();
  const doublons = new Set<string>();
  for (const b of blocs) (vus.has(b.exerciceId) ? doublons : vus).add(b.exerciceId);
  if (doublons.size) conseil(`${liste([...doublons].map((id) => exercices.get(id)?.nom ?? 'Un exercice'))} apparaî${doublons.size > 1 ? 'ssent' : 't'} deux fois : regroupe les séries sur une seule ligne.`);

  // Ordre : un exercice d'isolation placé avant un gros exercice du même muscle
  for (let i = 0; i < blocs.length; i++) {
    const iso = exercices.get(blocs[i].exerciceId);
    if (!iso || poly(iso)) continue;
    const g = iso.groupesMusculaires[0];
    const apres = blocs.slice(i + 1).find((b) => {
      const e = exercices.get(b.exerciceId);
      return poly(e) && e!.groupesMusculaires.includes(g);
    });
    if (apres) {
      conseil(`Place ${exercices.get(apres.exerciceId)!.nom} avant ${iso.nom} : les gros exercices d’abord, quand tu es frais.`);
      break;
    }
  }

  // Repos court sur les gros exercices
  const reposCourts = blocs.filter((b, i) => {
    const enchaine = !!b.supersetId && (blocs[i + 1]?.supersetId === b.supersetId || blocs[i - 1]?.supersetId === b.supersetId);
    return !enchaine && poly(exercices.get(b.exerciceId)) && b.reposSec != null && b.reposSec < SEUILS.reposPolyMin;
  });
  if (reposCourts.length) {
    conseil(`Repos court sur ${liste(reposCourts.map((b) => exercices.get(b.exerciceId)!.nom))} : 2 min ou plus sur les gros exercices aide à garder tes reps d’une série à l’autre.`);
  }

  // Cibles
  const sansCible = blocs.filter((b) => b.seriesCibles == null || !b.repsCibles);
  if (sansCible.length) {
    conseil(`Séries ou reps à remplir pour ${liste(sansCible.map((b) => exercices.get(b.exerciceId)?.nom ?? 'un exercice'))} (${SERIES_PAR_DEFAUT} séries comptées par défaut).`);
  }
  const longues = blocs.filter((b) => (repsMax(b.repsCibles) ?? 0) > 20);
  if (longues.length) conseil(`Plus de 20 reps sur ${liste(longues.map((b) => exercices.get(b.exerciceId)?.nom ?? 'un exercice'))} : c’est surtout de l’endurance. Ajoute de la charge pour rester sous 15-20.`);

  const aConseils = remarques.some((r) => r.ton !== 'ok');
  const verdict: Verdict = incomplete ? 'incomplete' : tropChargee ? 'trop-chargee' : aConseils ? 'a-ajuster' : 'adaptee';
  // Problèmes d'abord, puis conseils, puis points forts.
  const rang = { probleme: 0, conseil: 1, ok: 2 } as const;
  remarques.sort((a, b) => rang[a.ton] - rang[b.ton]);
  return { verdict, type, series, dureeMin, parMuscle, remarques };
}

export function dureeTexteMin(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
