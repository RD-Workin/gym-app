// Exercices tenus en secondes (gainage, dead hang…). Propriétaire : 01 (utilisé par 03 et par les correctifs).
import { db } from './db';
import { maintenant } from './ids';
import type { Id } from './types';

/**
 * Passe un exercice en secondes (ou le remet en reps) et convertit ses séries déjà notées, nombre pour nombre :
 * « 45 reps » devient « 45 s » (souvent noté ainsi faute de mieux), et inversement. Réversible.
 * À appeler dans une transaction qui couvre `exercices` et `series`. Renvoie le nombre de séries converties.
 */
export async function basculerEnSecondes(exerciceId: Id, enSecondes: boolean): Promise<number> {
  const t = maintenant();
  await db.exercices.update(exerciceId, { enSecondes: enSecondes || undefined, modifieLe: t });
  const series = await db.series.where('exerciceId').equals(exerciceId).toArray();
  let n = 0;
  for (const s of series) {
    if (enSecondes && s.dureeSec == null) {
      await db.series.update(s.id, { dureeSec: s.reps, reps: 0, rir: undefined, modifieLe: t });
      n++;
    } else if (!enSecondes && s.dureeSec != null) {
      await db.series.update(s.id, { reps: s.dureeSec, dureeSec: undefined, modifieLe: t });
      n++;
    }
  }
  return n;
}

/** Noms d'exercices qui se tiennent en secondes (gainage, planche, dead hang, chaise murale…), sans accents ni casse. */
const TENUS = /\b(gainage|planche|plank|side bridge|dead ?hang|suspension|chaise (murale|contre)|wall ?sit|l-?sit|hollow( body)?( hold)?|superman hold)\b/;
export const semblerTenu = (nom: string) => TENUS.test(nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
