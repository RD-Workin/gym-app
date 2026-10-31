import { useEffect, useRef } from 'preact/hooks';
import { Icone } from './Icone';

interface Props {
  /** Ex. « Pec fly · 1RM estimé 97 kg ». */
  texte: string;
  /** Appelé à la fin de l'affichage (≈ 2,6 s) : le parent retire le toast. */
  onFin: () => void;
}

const mouvementReduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Célébration d'un record : toast doré, confettis et vibration. À afficher seulement pour un record. */
export function ToastRecord({ texte, onFin }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      navigator.vibrate?.([30, 60, 30]);
    } catch {
      /* non supporté */
    }
    const t = window.setTimeout(onFin, 2600);
    const c = toile.current;
    let raf = 0;
    if (c && !mouvementReduit()) {
      const dpr = devicePixelRatio || 1;
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        const couleurs = ['#ffd45e', '#ff7a3d', '#3ddc97', '#eef2f6'];
        const ps = Array.from({ length: 90 }, (_, i) => ({
          x: innerWidth / 2,
          y: 90,
          vx: (Math.random() - 0.5) * 10,
          vy: -Math.random() * 7 - 2,
          s: Math.random() * 5 + 3,
          r: Math.random() * 6,
          c: couleurs[i % couleurs.length],
        }));
        let image = 0;
        const tic = () => {
          ctx.clearRect(0, 0, innerWidth, innerHeight);
          for (const p of ps) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25;
            p.r += 0.15;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.r);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
            ctx.restore();
          }
          if (++image < 110) raf = requestAnimationFrame(tic);
          else ctx.clearRect(0, 0, innerWidth, innerHeight);
        };
        raf = requestAnimationFrame(tic);
      }
    }
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [texte]);

  return (
    <>
      <div class="ui-toast" role="status" aria-live="polite">
        <span class="ui-medaille">
          <Icone nom="records" />
        </span>
        <div>
          <span class="ui-toast-titre">Nouveau record !</span>
          <span class="ui-toast-texte">{texte}</span>
        </div>
      </div>
      <canvas class="ui-confettis" ref={toile} aria-hidden="true" />
    </>
  );
}
