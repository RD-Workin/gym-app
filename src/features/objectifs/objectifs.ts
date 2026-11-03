// Objectifs : lecture et écriture en base. Calculs dans calculs.ts. Plusieurs objectifs par exercice.
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { Id, MesureObjectif, Objectif, Serie } from '../../core/types';
import { poidsParSeance } from '../progression/calculs';
import { evaluerObjectif, libelleCible } from './calculs';

export interface BrouillonObjectif {
  mesure: MesureObjectif;
  cible: number;
  /** Reps visées (mesure serie). */
  reps?: number;
  echeance?: string;
}

/** Crée un objectif, ou modifie `existant`. */
export async function enregistrerObjectif(exerciceId: Id, b: BrouillonObjectif, existant?: Objectif): Promise<void> {
  const t = maintenant();
  const echeance = b.echeance || undefined;
  const reps = b.mesure === 'serie' ? Math.max(1, Math.round(b.reps ?? 1)) : undefined;
  const champs = { mesure: b.mesure, cible: b.cible, ...(reps ? { reps } : {}), ...(echeance ? { echeance } : {}) };
  if (existant) {
    const change = existant.mesure !== b.mesure || existant.cible !== b.cible || existant.reps !== reps;
    const { echeance: _e, atteintLe: _a, reps: _r, ...reste } = existant;
    await db.objectifs.put({
      ...reste,
      ...champs,
      // Nouvelle cible : le toast « objectif atteint » pourra revenir.
      ...(!change && existant.atteintLe ? { atteintLe: existant.atteintLe } : {}),
      modifieLe: t,
    });
    return;
  }
  await db.objectifs.add({ id: nouvelId(), exerciceId, ...champs, creeLe: t, modifieLe: t });
}

export const supprimerObjectif = (id: Id) => db.objectifs.delete(id);

/** Objectifs d'un exercice, du plus ancien au plus récent. */
export const objectifsDe = async (exerciceId: Id) =>
  (await db.objectifs.where('exerciceId').equals(exerciceId).toArray()).sort((a, b) => a.creeLe.localeCompare(b.creeLe));

/**
 * Après l'enregistrement d'une série : texte du toast si elle fait atteindre un objectif pour la première fois
 * (les objectifs atteints sont marqués). `undefined` sinon.
 */
export async function objectifAtteintPar(serie: Serie): Promise<string | undefined> {
  const objectifs = (await objectifsDe(serie.exerciceId)).filter((o) => !o.atteintLe);
  if (!objectifs.length) return undefined;
  const [series, seances, exercice] = await Promise.all([
    db.series.where('exerciceId').equals(serie.exerciceId).toArray(),
    db.seances.toArray(),
    db.exercices.get(serie.exerciceId),
  ]);
  const d = { series, seancesParId: new Map(seances.map((s) => [s.id, s])), poids: poidsParSeance(seances) };
  let texte: string | undefined;
  for (const o of objectifs) {
    if (!evaluerObjectif(o, d).etat.atteint) continue;
    await db.objectifs.update(o.id, { atteintLe: maintenant() });
    texte ??= `🎯 Objectif atteint : ${exercice?.nom ?? 'exercice'}, ${libelleCible(o)} !`;
  }
  return texte;
}
