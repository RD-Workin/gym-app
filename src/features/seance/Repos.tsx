import { useEffect, useRef, useState } from 'preact/hooks';
import { bulle, COULEURS_PROGRES, eclatSur, vibrer } from '../../anim';
import { dureeTexte } from './logique';

interface Props {
  fin: number;
  duree: number;
  onAjouter: (sec: number) => void;
  onPasser: () => void;
  /** Toucher la durée = la régler à la main. */
  onRegler: () => void;
}

/** Minuteur de repos. Basé sur l'heure de fin : il reste juste après une fermeture de l'app. */
export function Repos({ fin, duree, onAjouter, onPasser, onRegler }: Props) {
  const [now, setNow] = useState(Date.now());
  const vibre = useRef(false);
  useEffect(() => {
    vibre.current = fin <= Date.now();
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [fin]);

  const anneau = useRef<SVGSVGElement>(null);
  const reste = Math.max(0, (fin - now) / 1000);
  useEffect(() => {
    if (reste === 0 && !vibre.current) {
      vibre.current = true;
      vibrer([200, 100, 200]);
      // Fin du repos vécue en direct : l'anneau éclate, et on relance.
      eclatSur(anneau.current, { nombre: 22, force: 4, couleurs: COULEURS_PROGRES, onde: true });
      bulle(anneau.current, "C'est reparti !", 'progres');
    }
  }, [reste]);

  const r = 16;
  const tour = 2 * Math.PI * r;
  const part = duree > 0 ? reste / duree : 0;
  const fini = reste === 0;
  const imminent = !fini && reste <= 3.2;

  return (
    <div class={`sc-repos${fini ? ' fini' : ''}`} role="timer" aria-live="off">
      <svg ref={anneau} class={imminent ? 'anim-bat' : undefined} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--c-surface-2)" stroke-width="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={fini ? 'var(--c-progres)' : 'var(--c-action)'}
          stroke-width="4"
          stroke-dasharray={tour}
          stroke-dashoffset={tour * (1 - part)}
          transform="rotate(-90 20 20)"
          stroke-linecap="round"
        />
      </svg>
      <span class="sc-repos-texte">
        {fini ? (
          'Repos terminé'
        ) : (
          <>
            Repos <b key={Math.ceil(reste)} class="sc-num anim-pulse">{dureeTexte(reste)}</b> /{' '}
            <button type="button" class="sc-lien sc-lien-inline" onClick={onRegler} aria-label="Régler la durée du repos">
              {dureeTexte(duree)} ✎
            </button>
          </>
        )}
      </span>
      {!fini && (
        <button type="button" class="sc-lien" onClick={() => onAjouter(30)}>
          +30 s
        </button>
      )}
      <button type="button" class="sc-lien" onClick={onPasser}>
        {fini ? 'OK' : 'Passer'}
      </button>
    </div>
  );
}
