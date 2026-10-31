// Accès aux données des exercices (propriétaire : 03-exercices).
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { Exercice, Variante } from '../../core/types';

export type BrouillonExercice = Pick<Exercice, 'nom' | 'equipement' | 'modeCharge' | 'groupesMusculaires' | 'reglagesMachine' | 'note'>;

/** Minuscules sans accents, pour la recherche. */
export const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const tousLesExercices = () => db.exercices.orderBy('nom').toArray();

export const exerciceEtVariantes = async (id: string) => ({
  exercice: await db.exercices.get(id),
  variantes: await db.variantes.where('exerciceId').equals(id).sortBy('nom'),
});

const nettoyer = (b: BrouillonExercice): BrouillonExercice => ({
  ...b,
  nom: b.nom.trim(),
  reglagesMachine: b.reglagesMachine?.trim() || undefined,
  note: b.note?.trim() || undefined,
});

export async function creerExercice(b: BrouillonExercice): Promise<string> {
  const t = maintenant();
  const id = nouvelId();
  await db.exercices.add({ ...nettoyer(b), id, archive: false, creeLe: t, modifieLe: t });
  return id;
}

export const modifierExercice = (id: string, b: BrouillonExercice) =>
  db.exercices.update(id, { ...nettoyer(b), modifieLe: maintenant() });

export const masquerExercice = (id: string, archive: boolean) =>
  db.exercices.update(id, { archive, modifieLe: maintenant() });

export async function ajouterVariante(exerciceId: string, nom: string): Promise<void> {
  const t = maintenant();
  const v: Variante = { id: nouvelId(), exerciceId, nom: nom.trim(), creeLe: t, modifieLe: t };
  await db.variantes.add(v);
}

/** Une variante déjà utilisée par des séries n'est pas supprimée. */
export async function supprimerVariante(id: string): Promise<boolean> {
  return db.transaction('rw', db.variantes, db.series, async () => {
    const utilisee = await db.series.filter((s) => s.varianteId === id).count();
    if (utilisee > 0) return false;
    await db.variantes.delete(id);
    return true;
  });
}
