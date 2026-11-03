// Bilan animé de fin de séance (04-seance, effets : 09-animations).
import { db } from '../../core/db';
import { volume } from '../../core/calculs';
import type { Id, Seance } from '../../core/types';
import { semainesDAffilee } from '../../anim/regularite';
import { libelleRecord, poidsParSeance, recordsBattusPar } from '../progression/calculs';

/** Séance qui vient d'être terminée : son écran de détail joue le bilan une seule fois. */
let aJouer: Id | undefined;
export const marquerBilan = (id: Id) => {
  aJouer = id;
};
export function bilanAJouer(id: Id): boolean {
  if (aJouer !== id) return false;
  aJouer = undefined;
  return true;
}

export interface Bilan {
  volumeKg: number;
  series: number;
  records: string[];
  semaines: number;
}

/** Volume, séries de travail, records battus pendant la séance (rejoués dans l'ordre) et régularité. */
export async function calculerBilan(seance: Seance): Promise<Bilan> {
  const [seances, toutes] = await Promise.all([db.seances.toArray(), db.series.toArray()]);
  const poids = poidsParSeance(seances);
  const p = poids.get(seance.id);
  const dela = toutes.filter((s) => s.seanceId === seance.id).sort((a, b) => a.ordre - b.ordre || a.faiteLe.localeCompare(b.faiteLe));
  const travail = dela.filter((s) => s.type !== 'echauffement');
  // Historique antérieur + séries de la séance au fur et à mesure : un record battu puis rebattu compte une fois.
  const anterieures = toutes.filter((s) => s.seanceId !== seance.id && s.faiteLe < seance.debut);
  const exercices = new Map((await db.exercices.bulkGet([...new Set(dela.map((s) => s.exerciceId))])).filter((e) => !!e).map((e) => [e!.id, e!.nom]));
  const meilleurs = new Map<string, string>();
  const vus: typeof dela = [];
  for (const s of travail) {
    const recs = recordsBattusPar(s, [...anterieures, ...vus], poids);
    vus.push(s);
    for (const r of recs) meilleurs.set(`${r.exerciceId}|${r.varianteId ?? ''}|${r.type}`, libelleRecord(r, exercices.get(r.exerciceId) ?? 'Exercice'));
  }
  return {
    volumeKg: Math.round(travail.reduce((t, s) => t + volume(s, p), 0)),
    series: travail.length,
    records: [...meilleurs.values()],
    semaines: semainesDAffilee(seances.filter((s) => s.fin).map((s) => s.debut)),
  };
}
