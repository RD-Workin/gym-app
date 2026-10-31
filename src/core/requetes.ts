import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';
import { db } from './db';

/**
 * Équivalent Preact de useLiveQuery (dexie-react-hooks) : relance la requête
 * à chaque changement des tables lues. `undefined` tant que le premier résultat n'est pas là.
 */
export function useRequete<T>(requete: () => Promise<T> | T, deps: unknown[] = []): T | undefined {
  const [valeur, setValeur] = useState<T>();
  useEffect(() => {
    const abo = liveQuery(requete).subscribe({ next: setValeur, error: (e) => console.error(e) });
    return () => abo.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valeur;
}

/** Séance commencée et pas encore terminée (`fin` absent), la plus récente. */
export const seanceEnCours = () =>
  db.seances
    .orderBy('debut')
    .reverse()
    .filter((s) => !s.fin)
    .first();
