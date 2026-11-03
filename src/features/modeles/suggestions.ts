// Propositions d'exercices pour « Composer ma séance » (sans IA). Propriétaire : 04-seance (repères relus par 10-coach).
// Principe : on propose ce qui manque à la séance. D'abord un gros exercice (polyarticulaire) pour le muscle
// principal du type, puis les muscles attendus pas encore assez travaillés, puis l'isolation.
import type { BlocModele, Id } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';
import { OBJECTIFS, type Objectif } from '../seance/logique';
import { ATTENDUS, SEUILS, poly, seriesParMuscle, type InfoExercice, type TypeSeance } from './avis';

export interface ExerciceCandidat extends InfoExercice {
  id: Id;
  favori?: boolean;
  archive?: boolean;
}

export interface Proposition {
  exercice: ExerciceCandidat;
  /** Pourquoi il est proposé, en mots simples (« Pour les pectoraux, encore peu travaillés »). */
  raison: string;
  gros: boolean;
}

/** Séries visées par muscle et par séance, selon le type. Le premier muscle attendu est le muscle principal. */
function cibles(type: TypeSeance): Record<string, number> {
  const c: Record<string, number> = {};
  const attendus = ATTENDUS[type];
  attendus.forEach((g, i) => (c[g] = type === 'full' ? 4 : i === 0 ? 10 : 6));
  const bonus: Record<TypeSeance, string[]> = {
    push: [],
    pull: ['avant-bras'],
    jambes: ['mollets', 'abducteurs', 'abdos'],
    full: ['fessiers', 'biceps', 'triceps', 'abdos'],
    autre: [],
  };
  for (const g of bonus[type]) c[g] ??= 2;
  return c;
}

const PRINCIPAL: Record<TypeSeance, string | undefined> = { push: 'pectoraux', pull: 'dos', jambes: 'quadriceps', full: undefined, autre: undefined };

/**
 * 3 ou 4 exercices de la bibliothèque à ajouter ensuite. Liste vide = la séance couvre déjà tout ce qui est attendu.
 * `frequence` : nombre de séances où l'exercice a été fait (les habitudes passent un peu devant).
 */
export function proposerExercices(
  type: TypeSeance,
  blocs: BlocModele[],
  bibliotheque: ExerciceCandidat[],
  { nombre = 4, frequence = new Map<Id, number>(), exclus = new Set<Id>() }: { nombre?: number; frequence?: Map<Id, number>; exclus?: Set<Id> } = {},
): Proposition[] {
  const parId = new Map(bibliotheque.map((e) => [e.id, e]));
  const fait = seriesParMuscle(blocs, parId);
  const vise = cibles(type);
  const dejaLa = new Set(blocs.map((b) => b.exerciceId));
  const besoin = (g: string) => Math.max(0, (vise[g] ?? 0) - (fait[g] ?? 0));
  // Gros exercices déjà présents par muscle : le premier exercice d'un muscle doit être un gros exercice.
  const grosPour = (g: string) =>
    blocs.some((b) => {
      const e = parId.get(b.exerciceId);
      return poly(e) && e!.groupesMusculaires[0] === g;
    });
  const principal = PRINCIPAL[type];

  const notes = bibliotheque
    .filter((e) => !e.archive && !dejaLa.has(e.id) && !exclus.has(e.id) && e.groupesMusculaires.length > 0)
    .map((e) => {
      const gs = e.groupesMusculaires;
      // Séance libre : tout est permis, on suit seulement les habitudes et l'équilibre.
      let score = type === 'autre' ? 1 : 0;
      gs.forEach((g, i) => (score += besoin(g) * (i === 0 ? 1 : 0.4)));
      // Un muscle déjà très chargé : on n'en rajoute pas.
      if (gs.some((g, i) => i === 0 && (fait[g] ?? 0) >= SEUILS.muscleMax - 2)) score -= 10;
      // Hors sujet pour le type (ex. leg press dans un Push).
      const gros = poly(e);
      // (un exercice d'isolation qui aide un muscle attendu reste permis, ex. rear delt fly pour le dos)
      if (type !== 'autre' && vise[gs[0]] == null && (gros || !gs.slice(1).some((g) => vise[g] != null))) score -= 6;
      if (gros && !grosPour(gs[0]) && besoin(gs[0]) > 0) score += 3;
      if (gros && principal === gs[0] && !grosPour(principal)) score += 4;
      // Le muscle a déjà son gros exercice : on varie avec de l'isolation plutôt qu'un 3e développé.
      if (grosPour(gs[0]) && besoin(gs[0]) > 0) score += gros ? -2 : 1.5;
      // En début de séance, les gros exercices ; une fois les gros faits, l'isolation finit le travail.
      if (!gros && blocs.length < 2 && type !== 'autre') score -= 2;
      if (type === 'autre' && gros) score += 1;
      if (e.favori) score += 1.5;
      score += Math.min(2, (frequence.get(e.id) ?? 0) * 0.25);
      return { e, score, gros };
    })
    .filter((x) => x.score > 0.5)
    .sort((a, b) => b.score - a.score || a.e.nom.localeCompare(b.e.nom));

  // Variété : pas plus de deux propositions pour le même muscle principal (une seule en full body).
  const maxParMuscle = type === 'full' ? 1 : 2;
  const choisis: typeof notes = [];
  const parMuscle = new Map<string, number>();
  for (const x of notes) {
    const g = x.e.groupesMusculaires[0];
    if ((parMuscle.get(g) ?? 0) >= maxParMuscle) continue;
    parMuscle.set(g, (parMuscle.get(g) ?? 0) + 1);
    choisis.push(x);
    if (choisis.length >= nombre) break;
  }
  return choisis.map(({ e, gros }) => ({ exercice: e, gros, raison: raison(e, fait, vise, gros, blocs.length > 0) }));
}

function raison(e: ExerciceCandidat, fait: Record<string, number>, vise: Record<string, number>, gros: boolean, commencee: boolean): string {
  const g = e.groupesMusculaires[0];
  const nom = (x: string) => libelle(x);
  const autres = e.groupesMusculaires.slice(1).map(nom);
  const travail = autres.length ? `${nom(g)}, avec ${autres.join(', ')}` : nom(g);
  if (commencee && !fait[g] && vise[g] != null) return `${gros ? 'Gros exercice' : 'Isolation'} · ${travail} (pas encore travaillé)`;
  return `${gros ? 'Gros exercice' : 'Isolation'} · ${travail}`;
}

const libelle = (g: string) => libelleGroupe(g).toLowerCase();

/** Objectifs en mots simples (« Muscle » plutôt qu'« Hypertrophie »). */
/** Le but de chaque objectif, en mots simples (libellés relus par 11). */
export const BUT_OBJECTIF: Record<Objectif, string> = { force: 'Soulever plus lourd', hypertrophie: 'Prendre du muscle', endurance: 'Tenir plus longtemps' };
export const NOMS_OBJECTIF: Record<Objectif, string> = { force: 'Force', hypertrophie: 'Masse', endurance: 'Endurance' };

/** Cibles proposées pour un exercice ajouté depuis les propositions. */
export function blocPropose(exerciceId: Id, gros: boolean, objectif: Objectif, id: Id): BlocModele {
  const o = OBJECTIFS[objectif];
  const reposSec = objectif === 'force' ? o.reposSec : objectif === 'endurance' ? o.reposSec : gros ? 150 : 90;
  const reps = objectif === 'hypertrophie' ? (gros ? '6-10' : '10-12') : o.reps;
  return { id, exerciceId, seriesCibles: gros ? 4 : 3, repsCibles: reps, reposSec };
}
