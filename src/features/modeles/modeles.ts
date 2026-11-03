// Modèles de séance (propriétaire : 04-seance).
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { BlocModele, Exercice, Id, Modele } from '../../core/types';
import { BIBLIOTHEQUE, MODELES_DEPART, blocsDepart, reposDepart } from '../../data/bibliotheque';

export async function enregistrerModele(m: Omit<Modele, 'creeLe' | 'modifieLe'> & Partial<Modele>) {
  const t = maintenant();
  await db.modeles.put({ ...m, creeLe: m.creeLe ?? t, modifieLe: t } as Modele);
}

export const nouveauModele = (nom = ''): Modele => {
  const t = maintenant();
  return { id: nouvelId(), nom, blocs: [], archive: false, creeLe: t, modifieLe: t };
};

/** Un bloc par exercice (ordre de la séance) ; séries = nombre fait, reps = plage faite. */
export async function creerModeleDepuisSeance(seanceId: Id, nom: string): Promise<Id> {
  const series = (await db.series.where('seanceId').equals(seanceId).sortBy('ordre')).filter((s) => s.type !== 'echauffement');
  const blocs: BlocModele[] = [];
  const supersets = new Map<string, string>();
  for (const s of series) {
    if (blocs.some((b) => b.exerciceId === s.exerciceId)) continue;
    const sx = series.filter((x) => x.exerciceId === s.exerciceId);
    // Séries tenues : la plage de secondes (« 30-45 »), sinon la plage de reps.
    const vals = sx.map((x) => x.dureeSec ?? x.reps);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    let supersetId: string | undefined;
    if (s.supersetId) {
      if (!supersets.has(s.supersetId)) supersets.set(s.supersetId, nouvelId());
      supersetId = supersets.get(s.supersetId);
    }
    blocs.push({ id: nouvelId(), exerciceId: s.exerciceId, varianteId: s.varianteId, supersetId, seriesCibles: sx.length, repsCibles: min === max ? String(min) : `${min}-${max}` });
  }
  const m = { ...nouveauModele(nom), blocs };
  await db.modeles.add(m);
  return m.id;
}

/** Nom du modèle de départ d'un modèle (champ `origine`, ou même nom qu'un modèle de départ pour les installations d'avant). */
export const origineDe = (m: Pick<Modele, 'nom' | 'origine'>): string | undefined =>
  m.origine ?? (MODELES_DEPART.some((d) => d.nom === m.nom) ? m.nom : undefined);

/** Blocs du modèle de départ `origine`, reliés aux exercices de la bibliothèque par leur nom. Un exercice supprimé est sauté. */
export function blocsOrigine(origine: string, exercices: Pick<Exercice, 'id' | 'nom' | 'archive'>[]): BlocModele[] {
  const depart = MODELES_DEPART.find((d) => d.nom === origine);
  if (!depart) return [];
  const parNom = new Map(exercices.filter((x) => !x.archive).map((x) => [x.nom, x.id]));
  return blocsDepart(depart).flatMap((b) => {
    const nom = BIBLIOTHEQUE.find((x) => x.cle === b.cle)?.nom;
    const exerciceId = nom ? parNom.get(nom) : undefined;
    return exerciceId ? [{ id: nouvelId(), exerciceId, seriesCibles: b.series, repsCibles: b.reps, reposSec: reposDepart(b.cle) }] : [];
  });
}

/** Mêmes exercices, dans le même ordre, avec les mêmes cibles. */
export const memesBlocs = (a: BlocModele[], b: BlocModele[]) =>
  a.length === b.length &&
  a.every((x, i) => x.exerciceId === b[i].exerciceId && x.seriesCibles === b[i].seriesCibles && x.repsCibles === b[i].repsCibles && x.reposSec === b[i].reposSec);
