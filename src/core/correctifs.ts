// Corrections du contenu de départ pour les installations existantes. Propriétaire : 01.
// Règle : un correctif ne modifie une valeur QUE si elle est encore égale à l'ancienne valeur par défaut.
// Ce que Romain a modifié lui-même n'est jamais touché. Chaque correctif n'est proposé qu'une fois.
import { db } from './db';
import { maintenant } from './ids';
import { BIBLIOTHEQUE, MODELES_DEPART, REPOS_POLYARTICULAIRE_SEC, blocsDepart, reposDepart } from '../data/bibliotheque';
import { nouvelId } from './ids';

export interface Correctif {
  id: string;
  description: string;
  /** Applique la correction (dans une transaction) et renvoie le nombre d'éléments modifiés. `simuler` = ne rien écrire. */
  executer: (simuler: boolean) => Promise<number>;
}

export const CLE_CORRECTIFS = 'correctifsAppliques';

const memesElements = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Remet les groupes musculaires d'un exercice de départ à leur nouvelle valeur par défaut (et sa note si vide),
 * seulement s'ils valent encore `ancien`. Repérage par le nom de départ : un exercice renommé n'est pas touché.
 */
function correctifGroupes(id: string, cle: string, ancien: string[], description: string): Correctif {
  const depart = BIBLIOTHEQUE.find((x) => x.cle === cle);
  if (!depart) throw new Error(`Correctif ${id} : exercice de départ « ${cle} » introuvable`);
  return {
    id,
    description,
    async executer(simuler) {
      const cibles = (await db.exercices.where('nom').equals(depart.nom).toArray()).filter((x) => memesElements(x.groupesMusculaires, ancien));
      if (!simuler) {
        const t = maintenant();
        for (const x of cibles) {
          await db.exercices.update(x.id, { groupesMusculaires: [...depart.groupes], note: x.note || depart.note, modifieLe: t });
        }
      }
      return cibles.length;
    },
  };
}

/**
 * Ajoute un modèle de départ absent (créé après la 1re installation). Rien si un modèle du même nom existe.
 * Chaque bloc pointe vers l'exercice de départ du même nom (non archivé) ; un exercice introuvable est sauté.
 */
function correctifAjoutModele(id: string, nomModele: string, description: string): Correctif {
  const depart = MODELES_DEPART.find((m) => m.nom === nomModele);
  if (!depart) throw new Error(`Correctif ${id} : modèle de départ « ${nomModele} » introuvable`);
  return {
    id,
    description,
    async executer(simuler) {
      if ((await db.modeles.where('nom').equals(nomModele).count()) > 0) return 0;
      const parNom = new Map((await db.exercices.toArray()).filter((x) => !x.archive).map((x) => [x.nom, x.id]));
      const blocs = blocsDepart(depart).flatMap((b) => {
        const nom = BIBLIOTHEQUE.find((x) => x.cle === b.cle)?.nom;
        const exerciceId = nom ? parNom.get(nom) : undefined;
        return exerciceId
          ? [{ id: nouvelId(), exerciceId, seriesCibles: b.series, repsCibles: b.reps, reposSec: reposDepart(b.cle) }]
          : [];
      });
      if (blocs.length === 0) return 0;
      if (!simuler) {
        const t = maintenant();
        await db.modeles.add({ id: nouvelId(), nom: nomModele, blocs, archive: false, creeLe: t, modifieLe: t });
      }
      return 1;
    },
  };
}

export const CORRECTIFS: Correctif[] = [
  correctifGroupes('2026-10-31-hip-abduction', 'hip-abduction', ['fessiers', 'adducteurs'], 'Hip abduction : muscles corrigés (abducteurs et fessiers, pas les adducteurs).'),
  correctifAjoutModele('2026-10-31-modele-full-body', 'Full body', 'Nouveau modèle de séance « Full body » (9 exercices, environ 1 h 10).'),
  correctifGroupes('2026-10-31-rowing-barre', 'rowing-barre', ['dos'], 'Rowing barre : lombaires ajoutés aux muscles travaillés.'),
  {
    id: '2026-10-31-repos-polyarticulaires',
    description: `Modèles de départ : repos de ${Math.floor(REPOS_POLYARTICULAIRE_SEC / 60)} min ${String(REPOS_POLYARTICULAIRE_SEC % 60).padStart(2, "0")} sur les gros exercices (développés, tirages, presses…).`,
    async executer(simuler) {
      const nomsPoly = new Set(BIBLIOTHEQUE.filter((x) => reposDepart(x.cle) != null).map((x) => x.nom));
      const idsPoly = new Set((await db.exercices.toArray()).filter((x) => nomsPoly.has(x.nom)).map((x) => x.id));
      const nomsModeles = new Set(MODELES_DEPART.map((m) => m.nom));
      const modeles = (await db.modeles.toArray()).filter((m) => nomsModeles.has(m.nom));
      let n = 0;
      const t = maintenant();
      for (const m of modeles) {
        let change = false;
        const blocs = m.blocs.map((b) => {
          if (b.reposSec == null && idsPoly.has(b.exerciceId)) {
            n++;
            change = true;
            return { ...b, reposSec: REPOS_POLYARTICULAIRE_SEC };
          }
          return b;
        });
        if (change && !simuler) await db.modeles.update(m.id, { blocs, modifieLe: t });
      }
      return n;
    },
  },
];

async function dejaAppliques(): Promise<string[]> {
  return ((await db.reglages.get(CLE_CORRECTIFS))?.valeur as string[] | undefined) ?? [];
}

/** Correctifs pas encore traités qui modifieraient au moins un élément. */
export async function correctifsEnAttente(): Promise<{ correctif: Correctif; nombre: number }[]> {
  const faits = new Set(await dejaAppliques());
  const res: { correctif: Correctif; nombre: number }[] = [];
  for (const c of CORRECTIFS) {
    if (faits.has(c.id)) continue;
    const nombre = await c.executer(true);
    if (nombre > 0) res.push({ correctif: c, nombre });
  }
  return res;
}

/** Applique (ou ignore si `appliquer` = false) tous les correctifs en attente, puis les marque comme traités. */
export async function traiterCorrectifs(appliquer: boolean): Promise<number> {
  return db.transaction('rw', db.exercices, db.modeles, db.reglages, async () => {
    let total = 0;
    if (appliquer) for (const c of CORRECTIFS) if (!(await dejaAppliques()).includes(c.id)) total += await c.executer(false);
    await db.reglages.put({ cle: CLE_CORRECTIFS, valeur: CORRECTIFS.map((c) => c.id) });
    return total;
  });
}
