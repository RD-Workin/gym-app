// Écran qui reste allumé pendant la séance (propriétaire : 04-seance).
// Screen Wake Lock : Safari iOS 16.4+ (app installée sur l'écran d'accueil : iOS 18.4+).
// Le téléphone peut toujours être verrouillé avec le bouton ; le verrou est relâché quand l'écran
// séance se ferme (séance terminée) et redemandé au retour dans l'app.
import { useEffect } from 'preact/hooks';

export function useEcranAllume(actif = true) {
  useEffect(() => {
    if (!actif || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let verrou: WakeLockSentinel | null = null;
    let fini = false;
    let enCours = false;

    const demander = async () => {
      if (fini || enCours || verrou || document.visibilityState !== 'visible') return;
      enCours = true;
      try {
        const v = await navigator.wakeLock.request('screen');
        if (fini) {
          void v.release();
          return;
        }
        verrou = v;
        v.addEventListener('release', () => {
          if (verrou === v) verrou = null;
        });
      } catch {
        // Refusé (économie d'énergie, navigateur) : l'écran se met en veille comme d'habitude.
      } finally {
        enCours = false;
      }
    };
    const auRetour = () => {
      if (document.visibilityState === 'visible') void demander();
    };

    void demander();
    // Le verrou saute quand l'app passe en arrière-plan : on le reprend au retour, ou au premier toucher.
    document.addEventListener('visibilitychange', auRetour);
    document.addEventListener('pointerdown', auRetour);
    return () => {
      fini = true;
      document.removeEventListener('visibilitychange', auRetour);
      document.removeEventListener('pointerdown', auRetour);
      void verrou?.release();
      verrou = null;
    };
  }, [actif]);
}
