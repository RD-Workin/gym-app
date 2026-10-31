// Modèles de séance (propriétaire : 04-seance).
import { db } from '../../core/db';
import { maintenant, nouvelId } from '../../core/ids';
import type { BlocModele, Id, Modele } from '../../core/types';

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
    const min = Math.min(...sx.map((x) => x.reps));
    const max = Math.max(...sx.map((x) => x.reps));
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
