import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';

export type SensTransition = 'avant' | 'arriere' | 'onglet';

/** Sens d'une navigation : plus profond = avant, moins profond = arrière, autre onglet = fondu-zoom. */
export function sensTransition(depuis: string, vers: string): SensTransition {
  const a = depuis.split('/').filter(Boolean);
  const b = vers.split('/').filter(Boolean);
  if (a[0] !== b[0]) return 'onglet';
  return b.length >= a.length ? 'avant' : 'arriere';
}

/**
 * Anime l'entrée de chaque écran (transform + opacity seulement, ~260 ms).
 * Pas d'animation au premier affichage : le contenu s'affiche tout de suite (LCP, Lighthouse).
 */
export function TransitionEcran({ chemin, children }: { chemin: string; children: ComponentChildren }) {
  const precedent = useRef<string | null>(null);
  const sens = useRef<SensTransition | null>(null);
  if (precedent.current !== chemin) {
    sens.current = precedent.current === null ? null : sensTransition(precedent.current, chemin);
    precedent.current = chemin;
  }
  return (
    <div key={chemin} class={sens.current ? `anim-ecran ${sens.current}` : 'anim-ecran'}>
      {children}
    </div>
  );
}
