// Accès aux données des exercices (propriétaire : 03-exercices).
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { Exercice, ModeCharge, Variante } from '../../core/types';
import { VISUELS_DEPART, type EntreeCatalogue } from '../../data/catalogue';

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

export async function modifierExercice(id: string, b: BrouillonExercice) {
  await db.transaction('rw', db.exercices, db.reglages, async () => {
    const avant = await db.exercices.get(id);
    // Renommer un exercice de départ ne doit pas lui faire perdre son visuel.
    const depart = avant && VISUELS_DEPART[avant.nom];
    if (depart && !(await liensCatalogue())[id]) await lierAuCatalogue(id, depart);
    await db.exercices.update(id, { ...nettoyer(b), modifieLe: maintenant() });
  });
}

// Lien exercice → entrée du catalogue (visuel, explications), stocké dans `reglages`.
const CLE_LIENS = 'liensCatalogue';
export type Liens = Record<string, string>;

export const liensCatalogue = async (): Promise<Liens> => ((await db.reglages.get(CLE_LIENS))?.valeur as Liens) ?? {};

export async function lierAuCatalogue(exerciceId: string, catalogueId: string | null) {
  const liens = { ...(await liensCatalogue()) };
  if (catalogueId) liens[exerciceId] = catalogueId;
  else delete liens[exerciceId];
  await db.reglages.put({ cle: CLE_LIENS, valeur: liens });
}

/** Entrée du catalogue d'un exercice : lien explicite, sinon exercice de départ, sinon même nom. */
export function idCatalogue(ex: Pick<Exercice, 'id' | 'nom'>, liens: Liens, parNom?: Map<string, string>): string | undefined {
  return liens[ex.id] ?? VISUELS_DEPART[ex.nom] ?? parNom?.get(normaliser(ex.nom));
}

const modeDe = (eq: Exercice['equipement']): ModeCharge => (eq === 'halteres' ? 'par_main' : eq === 'poids_du_corps' ? 'lest' : 'total');

export async function ajouterDepuisCatalogue(c: EntreeCatalogue): Promise<string> {
  return db.transaction('rw', db.exercices, db.reglages, async () => {
    const id = await creerExercice({ nom: c.nom, equipement: c.eq, modeCharge: modeDe(c.eq), groupesMusculaires: [...c.p, ...c.s] });
    await lierAuCatalogue(id, c.id);
    return id;
  });
}

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
