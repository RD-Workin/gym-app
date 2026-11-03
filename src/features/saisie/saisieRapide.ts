// Saisie rapide depuis la fiche d'un exercice, sans lancer de séance. Propriétaire : 04-seance.
// Les séries vont dans la séance en cours s'il y en a une, sinon dans la « séance libre du jour »
// (créée au besoin, déjà terminée) : elles comptent partout (stats, records, export).
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { Id, ModeCharge, Seance, Serie } from '../../core/types';
import { remplirContexte } from '../contexte/contexte';
import { CLE_PLAN, type PlanSeance } from '../seance/logique';

/** Id de la dernière séance créée par la saisie rapide (pour regrouper les saisies d'une même journée). */
export const CLE_SEANCE_RAPIDE = 'saisie.seanceDuJour';

/** Une série : reps et charge propres (ex. 10 × 28, 8 × 28, 9 × 26). */
export interface LigneSet {
  reps: number;
  chargeKg?: number;
  /** Série tenue (exercice en secondes) : secondes ; `reps` est alors ignoré. */
  dureeSec?: number;
}

export interface SetRapide {
  exerciceId: Id;
  varianteId?: Id;
  series: LigneSet[];
  modeCharge: ModeCharge;
  /** Exercice tenu (gainage, dead hang…) : les lignes portent des secondes. */
  enSecondes?: boolean;
}

const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export interface ResultatRapide {
  seanceId: Id;
  enCours: boolean;
  series: Serie[];
}

export async function enregistrerSetRapide(s: SetRapide): Promise<ResultatRapide> {
  const t = maintenant();
  const lignes = s.series.filter((l) => (s.enSecondes ? (l.dureeSec ?? 0) >= 1 : l.reps >= 1)).slice(0, 30);
  if (!lignes.length) throw new Error('Aucune série à enregistrer');
  let creee: Seance | undefined;
  const res = await db.transaction('rw', db.seances, db.series, db.reglages, async () => {
    const enCours = await db.seances.filter((x) => !x.fin).first();
    let seance = enCours;
    if (!seance) {
      const id = (await db.reglages.get(CLE_SEANCE_RAPIDE))?.valeur as Id | undefined;
      const du = id ? await db.seances.get(id) : undefined;
      if (du && memeJour(new Date(du.debut), new Date())) {
        seance = du;
        await db.seances.update(du.id, { fin: t, modifieLe: t });
      }
    }
    if (!seance) {
      const precedente = await db.seances.orderBy('debut').reverse().first();
      seance = {
        id: nouvelId(),
        debut: t,
        fin: t,
        contexte: precedente?.contexte.poidsCorporelKg ? { poidsCorporelKg: precedente.contexte.poidsCorporelKg } : {},
        creeLe: t,
        modifieLe: t,
      };
      await db.seances.add(seance);
      await db.reglages.put({ cle: CLE_SEANCE_RAPIDE, valeur: seance.id });
      creee = seance;
    }
    const existantes = await db.series.where('seanceId').equals(seance.id).toArray();
    let ordre = existantes.reduce((m, x) => Math.max(m, x.ordre), 0);
    const series: Serie[] = lignes.map((l) => ({
      id: nouvelId(),
      seanceId: seance!.id,
      exerciceId: s.exerciceId,
      varianteId: s.varianteId,
      ordre: ++ordre,
      chargeKg: s.modeCharge === 'sans_charge' ? undefined : l.chargeKg,
      modeCharge: s.modeCharge,
      reps: s.enSecondes ? 0 : l.reps,
      ...(s.enSecondes ? { dureeSec: l.dureeSec } : {}),
      type: 'travail',
      faiteLe: t,
      creeLe: t,
      modifieLe: t,
    }));
    await db.series.bulkAdd(series);
    // Séance en cours : l'exercice apparaît aussi dans l'écran de séance.
    if (enCours) {
      const plan = (await db.reglages.get(CLE_PLAN))?.valeur as PlanSeance | undefined;
      if (plan?.seanceId === enCours.id && !plan.blocs.some((b) => b.exerciceId === s.exerciceId)) {
        await db.reglages.put({ cle: CLE_PLAN, valeur: { ...plan, blocs: [...plan.blocs, { id: nouvelId(), exerciceId: s.exerciceId, varianteId: s.varianteId }] } });
      }
    }
    return { seanceId: seance.id, enCours: !!enCours, series };
  });
  if (creee) void remplirContexte(creee.id);
  return res;
}

/** Annule une saisie rapide (bouton « Annuler ») ; supprime la séance du jour si elle devient vide. */
export async function annulerSetRapide(r: ResultatRapide) {
  await db.transaction('rw', db.seances, db.series, async () => {
    await db.series.bulkDelete(r.series.map((s) => s.id));
    if (!r.enCours && (await db.series.where('seanceId').equals(r.seanceId).count()) === 0) await db.seances.delete(r.seanceId);
  });
}
