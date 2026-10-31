// Lecture des données pour la progression. Propriétaire : 05-progression.
import { db } from '../../core/db';
import { useRequete } from '../../core/requetes';
import type { Exercice, Id, Seance, Serie, Variante } from '../../core/types';
import { libelleRecord, poidsParSeance, recordsBattusPar, type RecordPerso } from './calculs';

export interface DonneesProgression {
  seances: Seance[];
  seancesParId: Map<Id, Seance>;
  series: Serie[];
  exercices: Map<Id, Exercice>;
  variantes: Map<Id, Variante>;
  poids: Map<Id, number | undefined>;
}

async function charger(): Promise<DonneesProgression> {
  const [seances, series, exercices, variantes] = await Promise.all([
    db.seances.toArray(),
    db.series.toArray(),
    db.exercices.toArray(),
    db.variantes.toArray(),
  ]);
  return {
    seances,
    seancesParId: new Map(seances.map((s) => [s.id, s])),
    series,
    exercices: new Map(exercices.map((e) => [e.id, e])),
    variantes: new Map(variantes.map((v) => [v.id, v])),
    poids: poidsParSeance(seances),
  };
}

/** Toutes les séances, séries, exercices et variantes, recalculés à chaque changement de la base. */
export const useDonneesProgression = () => useRequete(charger);

/**
 * Pour 04 (séance en cours), juste après l'enregistrement d'une série :
 *   const recs = await recordsDeLaSerie(serie);
 *   if (recs[0]) afficher <ToastRecord texte={recs[0].texte} … />
 * Renvoie les records battus, le plus important d'abord (vide si aucun).
 */
export async function recordsDeLaSerie(serie: Serie): Promise<(RecordPerso & { texte: string })[]> {
  const [historique, seances, exercice] = await Promise.all([
    db.series.where('exerciceId').equals(serie.exerciceId).toArray(),
    db.seances.toArray(),
    db.exercices.get(serie.exerciceId),
  ]);
  let nom = exercice?.nom ?? 'Exercice';
  if (serie.varianteId) {
    const v = await db.variantes.get(serie.varianteId);
    if (v) nom += ` (${v.nom})`;
  }
  return recordsBattusPar(serie, historique, poidsParSeance(seances)).map((r) => ({ ...r, texte: libelleRecord(r, nom) }));
}
