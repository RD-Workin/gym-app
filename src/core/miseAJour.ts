// Détection d'une nouvelle version (service worker en mode « prompt »). Propriétaire : 01.
import { registerSW } from 'virtual:pwa-register';
import { useEffect, useState } from 'preact/hooks';

const HEURE = 60 * 60 * 1000;
let disponible = false;
const abonnes = new Set<(v: boolean) => void>();
let majSW: ((recharger?: boolean) => Promise<void>) | undefined;

export function demarrerMiseAJour() {
  majSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      disponible = true;
      abonnes.forEach((f) => f(true));
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // L'app reste souvent ouverte en arrière-plan sur iPhone : vérifier au retour et toutes les heures.
      const verifier = () => navigator.onLine && reg.update().catch(() => {});
      setInterval(verifier, HEURE);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && verifier());
    },
  });
}

export function useMiseAJourDisponible(): boolean {
  const [v, setV] = useState(disponible);
  useEffect(() => {
    abonnes.add(setV);
    return () => void abonnes.delete(setV);
  }, []);
  return v;
}

export const installerMiseAJour = () => majSW?.(true);
