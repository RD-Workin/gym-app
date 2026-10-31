import { db } from './db';

/**
 * Demande à iOS de ne pas effacer les données (navigator.storage.persist).
 * Sur iPhone, l'accord est donné quand l'app est installée sur l'écran d'accueil.
 * Le résultat est gardé dans les réglages pour l'afficher à l'utilisateur.
 */
export async function demanderStockagePersistant(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const deja = await navigator.storage.persisted();
  const ok = deja || (await navigator.storage.persist());
  await db.reglages.put({ cle: 'stockagePersistant', valeur: ok });
  return ok;
}
