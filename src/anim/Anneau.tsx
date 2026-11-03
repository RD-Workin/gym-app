import type { ComponentChildren } from 'preact';

interface Props {
  valeur: number;
  max: number;
  /** Diamètre en px (défaut 92). */
  taille?: number;
  /** Contenu au centre (chiffre). */
  children?: ComponentChildren;
  label: string;
}

/** Anneau qui se remplit en tournant (façon anneaux d'activité). Doré et lumineux une fois bouclé. */
export function Anneau({ valeur, max, taille = 92, children, label }: Props) {
  const r = 40;
  const tour = 2 * Math.PI * r;
  const part = max > 0 ? Math.min(1, valeur / max) : 0;
  const complet = part >= 1;
  return (
    <div class={`anim-anneau${complet ? ' complet' : ''}`} role="img" aria-label={label} style={{ width: `${taille}px`, height: `${taille}px` }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="anim-anneau-fond" cx="50" cy="50" r={r} />
        <circle
          class="anim-anneau-trait"
          cx="50"
          cy="50"
          r={r}
          stroke-dasharray={tour}
          transform="rotate(-90 50 50)"
          style={{ '--plein': String(tour), strokeDashoffset: String(tour * (1 - part)) }}
        />
      </svg>
      <div class="anim-anneau-centre">{children}</div>
    </div>
  );
}
