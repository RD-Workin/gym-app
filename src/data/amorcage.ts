// Remplit la bibliothèque et les 3 modèles au premier lancement. Idempotent.
import { db } from '../core/db';
import { maintenant, nouvelId } from '../core/ids';
import type { Exercice, Modele, Variante } from '../core/types';
import { BIBLIOTHEQUE, MODELES_DEPART, reposDepart } from './bibliotheque';

const CLE = 'bibliothequeAmorcee';

export async function amorcerBibliotheque(): Promise<void> {
  await db.transaction('rw', db.exercices, db.variantes, db.modeles, db.reglages, async () => {
    if (await db.reglages.get(CLE)) return;
    // Base déjà remplie (ex. import d'une sauvegarde) : ne rien ajouter.
    if ((await db.exercices.count()) > 0) {
      await db.reglages.put({ cle: CLE, valeur: true });
      return;
    }
    const t = maintenant();
    const ids = new Map<string, string>();
    const exercices: Exercice[] = [];
    const variantes: Variante[] = [];
    for (const x of BIBLIOTHEQUE) {
      const id = nouvelId();
      ids.set(x.cle, id);
      exercices.push({
        id,
        nom: x.nom,
        equipement: x.equipement,
        modeCharge: x.modeCharge,
        groupesMusculaires: [...x.groupes],
        reglagesMachine: x.reglagesMachine,
        note: x.note,
        archive: false,
        creeLe: t,
        modifieLe: t,
      });
      for (const nom of x.variantes ?? []) {
        variantes.push({ id: nouvelId(), exerciceId: id, nom, creeLe: t, modifieLe: t });
      }
    }
    const modeles: Modele[] = MODELES_DEPART.map((m) => ({
      id: nouvelId(),
      nom: m.nom,
      archive: false,
      creeLe: t,
      modifieLe: t,
      blocs: BIBLIOTHEQUE.filter((x) => x.seance === m.seance).map((x) => ({
        id: nouvelId(),
        exerciceId: ids.get(x.cle)!,
        seriesCibles: x.series,
        repsCibles: x.reps,
        reposSec: reposDepart(x.cle),
      })),
    }));
    await db.exercices.bulkAdd(exercices);
    await db.variantes.bulkAdd(variantes);
    await db.modeles.bulkAdd(modeles);
    await db.reglages.put({ cle: CLE, valeur: true });
  });
}
