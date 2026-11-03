// Chrono d'une série tenue (gainage, dead hang…). Propriétaire : 04-seance.
// Décompte de 3 s pour se mettre en place, puis le temps monte ; « Arrêter » reporte les secondes dans la saisie.
import { useEffect, useState } from 'preact/hooks';
import { vibrer } from '../../anim';
import { dureeTexte } from './logique';

const DECOMPTE_SEC = 3;

export function Chrono({ onFin }: { onFin: (sec: number) => void }) {
  /** Instant (ms) où le temps commence à compter, décompte compris ; `undefined` = arrêté. */
  const [depart, setDepart] = useState<number>();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (depart == null) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [depart]);

  const ecoule = depart == null ? 0 : (now - depart) / 1000;
  const decompte = depart != null && ecoule < 0;
  useEffect(() => {
    if (depart != null && !decompte) vibrer(30);
  }, [decompte, depart]);

  if (depart == null) {
    return (
      <button
        type="button"
        class="sc-option sc-chrono-lancer"
        onClick={() => {
          setNow(Date.now());
          setDepart(Date.now() + DECOMPTE_SEC * 1000);
        }}
      >
        ⏱ Lancer le chrono
      </button>
    );
  }
  return (
    <div class="sc-chrono-tenue" role="timer" aria-live="off">
      <span class="sc-chrono-valeur sc-num">{decompte ? Math.ceil(-ecoule) : dureeTexte(ecoule)}</span>
      <span class="sc-attenue">{decompte ? 'Mets-toi en place…' : 'Tiens bon !'}</span>
      <button
        type="button"
        class="sc-option sc-echauf-oui"
        onClick={() => {
          if (!decompte) onFin(Math.round(ecoule));
          setDepart(undefined);
        }}
      >
        {decompte ? 'Annuler' : 'Arrêter'}
      </button>
    </div>
  );
}
