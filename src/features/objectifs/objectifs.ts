// Objectifs : lecture et écriture en base. Calculs dans calculs.ts.
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { Id, MesureObjectif, Objectif, Serie } from '../../core/types';
import { poidsParSeance } from '../progression/calculs';
import { evaluerObjectif, NOM_MESURE, uniteMesure } from './calculs';

export interface BrouillonObjectif {
  mesure: MesureObjectif;
  cible: number;
  echeance?: string;
}

/** Un seul objectif par exercice : crée ou remplace. */
export async function enregistrerObjectif(exerciceId: Id, b: BrouillonObjectif, existant?: Objectif): Promise<void> {
  const t = maintenant();
  const echeance = b.echeance || undefined;
  if (existant) {
    const change = existant.mesure !== b.mesure || existant.cible !== b.cible;
    const { echeance: _e, atteintLe: _a, ...reste } = existant;
    await db.objectifs.put({
      ...reste,
      mesure: b.mesure,
      cible: b.cible,
      ...(echeance ? { echeance } : {}),
      // Nouvelle cible : le toast « objectif atteint » pourra revenir.
      ...(!change && existant.atteintLe ? { atteintLe: existant.atteintLe } : {}),
      modifieLe: t,
    });
    return;
  }
  await db.objectifs.add({ id: nouvelId(), exerciceId, mesure: b.mesure, cible: b.cible, ...(echeance ? { echeance } : {}), creeLe: t, modifieLe: t });
}

export const supprimerObjectif = (id: Id) => db.objectifs.delete(id);

export const objectifDe = (exerciceId: Id) => db.objectifs.where('exerciceId').equals(exerciceId).first();

/**
 * Après l'enregistrement d'une série : renvoie le texte du toast si elle fait atteindre un objectif
 * pour la première fois (et le marque atteint). `undefined` sinon.
 */
export async function objectifAtteintPar(serie: Serie): Promise<string | undefined> {
  const o = await objectifDe(serie.exerciceId);
  if (!o || o.atteintLe) return undefined;
  const [series, seances, exercice] = await Promise.all([
    db.series.where('exerciceId').equals(serie.exerciceId).toArray(),
    db.seances.toArray(),
    db.exercices.get(serie.exerciceId),
  ]);
  const { etat } = evaluerObjectif(o, { series, seancesParId: new Map(seances.map((s) => [s.id, s])), poids: poidsParSeance(seances) });
  if (!etat.atteint) return undefined;
  await db.objectifs.update(o.id, { atteintLe: maintenant() });
  const v = `${String(o.cible).replace('.', ',')} ${uniteMesure(o.mesure)}`;
  return `🎯 Objectif atteint : ${exercice?.nom ?? 'exercice'}, ${NOM_MESURE[o.mesure].toLowerCase()} ${v} !`;
}
