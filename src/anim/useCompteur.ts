import { useEffect, useRef, useState } from 'preact/hooks';
import { mouvementReduit } from './mouvement';

/**
 * Nombre qui défile jusqu'à sa valeur (ex. 1RM, volume, records).
 * Au premier rendu, part de 0 ; ensuite, part de l'ancienne valeur.
 */
export function useCompteur(cible: number, duree = 700, decimales = 0): number {
  const [valeur, setValeur] = useState(mouvementReduit() ? cible : 0);
  const depart = useRef(valeur);
  useEffect(() => {
    if (mouvementReduit() || !Number.isFinite(cible)) {
      setValeur(cible);
      return;
    }
    const de = depart.current;
    const t0 = performance.now();
    const f = 10 ** decimales;
    let raf = 0;
    const tic = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = 1 - (1 - k) ** 3; // ease-out cubique
      const v = Math.round((de + (cible - de) * e) * f) / f;
      depart.current = v;
      setValeur(v);
      if (k < 1) raf = requestAnimationFrame(tic);
    };
    raf = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree, decimales]);
  return valeur;
}
