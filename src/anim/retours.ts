// Retours immédiats d'un geste : vibration, bulle qui s'envole, flash, rebonds (Web Animations API).
// Rien ne bloque la saisie : tout est en pointer-events: none et se retire tout seul.
import { mouvementReduit } from './mouvement';
import { centre } from './particules';

let interrupteur: HTMLLabelElement | null = null;

/**
 * Petit retour haptique. Android : navigator.vibrate. iPhone (Safari 18+, qui ignore vibrate) :
 * un interrupteur natif caché basculé dans le même geste déclenche le « tic » du Taptic Engine.
 */
export function vibrer(motif: number | number[] = 12) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && navigator.vibrate(motif)) return;
  } catch {
    /* non supporté */
  }
  if (typeof document === 'undefined') return;
  try {
    if (!interrupteur) {
      interrupteur = document.createElement('label');
      interrupteur.className = 'anim-haptique';
      interrupteur.setAttribute('aria-hidden', 'true');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      interrupteur.appendChild(input);
      document.body.appendChild(interrupteur);
    }
    const n = Array.isArray(motif) ? Math.ceil(motif.length / 2) : 1;
    // Le premier « tic » doit partir dans le geste lui-même (synchrone).
    interrupteur.click();
    for (let i = 1; i < n; i++) window.setTimeout(() => interrupteur?.click(), i * 90);
  } catch {
    /* non supporté */
  }
}

export type TonBulle = 'progres' | 'record' | 'action';

/** Texte court qui s'envole depuis un élément (« +2,5 kg vs la dernière fois »). */
export function bulle(el: Element | null | undefined, texte: string, ton: TonBulle = 'progres', delaiMs = 0) {
  if (typeof document === 'undefined') return;
  const c = centre(el);
  if (!c) return;
  const b = document.createElement('div');
  b.className = `anim-bulle ${ton}`;
  b.setAttribute('role', 'status');
  b.textContent = texte;
  // CSSOM (pas d'attribut style) : compatible avec la CSP.
  b.style.setProperty('--x', `${Math.round(c[0])}px`);
  b.style.setProperty('--y', `${Math.round(c[1])}px`);
  if (delaiMs) b.style.setProperty('animation-delay', `${delaiMs}ms`);
  document.body.appendChild(b);
  const retirer = () => b.remove();
  b.addEventListener('animationend', retirer);
  window.setTimeout(retirer, (mouvementReduit() ? 1800 : 1600) + delaiMs);
}

/** Flash plein écran très bref (doré pour un record, vert pour un objectif). */
export function flash(ton: 'record' | 'progres' = 'record') {
  if (mouvementReduit() || typeof document === 'undefined') return;
  const f = document.createElement('div');
  f.className = `anim-flash ${ton}`;
  f.setAttribute('aria-hidden', 'true');
  document.body.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
  window.setTimeout(() => f.remove(), 900);
}

const jouer = (el: Element | null | undefined, images: Keyframe[], o: KeyframeAnimationOptions) => {
  if (!el || mouvementReduit() || typeof (el as HTMLElement).animate !== 'function') return;
  (el as HTMLElement).animate(images, o);
};

/** Le bouton s'écrase puis rebondit (validation). */
export const ecraser = (el: Element | null | undefined) =>
  jouer(el, [{ transform: 'scale(1)' }, { transform: 'scale(0.92)', offset: 0.25 }, { transform: 'scale(1.04)', offset: 0.6 }, { transform: 'scale(1)' }], {
    duration: 420,
    easing: 'ease-out',
  });

/** Le chiffre roule vers le haut (+) ou le bas (−). */
export const rouler = (el: Element | null | undefined, sens: 1 | -1) =>
  jouer(el, [{ transform: `translateY(${sens * 45}%)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }], {
    duration: 170,
    easing: 'cubic-bezier(0.2, 1.3, 0.4, 1)',
  });

/** Petit saut (pastille qui se remplit, chiffre qui change). */
export const sauter = (el: Element | null | undefined, ampleur = 1.25) =>
  jouer(el, [{ transform: 'scale(1)' }, { transform: `scale(${ampleur})`, offset: 0.4 }, { transform: 'scale(1)' }], {
    duration: 380,
    easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)',
  });
