import { mouvementReduit } from './mouvement';

export interface OptionsEclat {
  /** Nombre de particules (défaut 24, plafonné à 160). */
  nombre?: number;
  couleurs?: string[];
  /** 'etincelle' : points lumineux ; 'confetti' : rectangles qui tombent. */
  forme?: 'etincelle' | 'confetti';
  /** Vitesse initiale en px par image (défaut 6). */
  force?: number;
}

interface Particule {
  x: number; y: number; vx: number; vy: number;
  taille: number; angle: number; vie: number; couleur: string;
}

const COULEURS = ['#ffd45e', '#ff7a3d', '#3ddc97', '#eef2f6'];
let toile: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particules: (Particule & { forme: string })[] = [];
let raf = 0;

function preparerToile() {
  if (!toile) {
    toile = document.createElement('canvas');
    toile.className = 'anim-particules';
    toile.setAttribute('aria-hidden', 'true');
    document.body.appendChild(toile);
    ctx = toile.getContext('2d');
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  toile.width = innerWidth * dpr;
  toile.height = innerHeight * dpr;
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tic() {
  if (!ctx || !toile) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particules) {
    p.x += p.vx;
    p.y += p.vy;
    p.vie -= 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vie / 30));
    ctx.fillStyle = p.couleur;
    if (p.forme === 'confetti') {
      p.vy += 0.25;
      p.vx *= 0.99;
      p.angle += 0.15;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillRect(-p.taille / 2, -p.taille / 4, p.taille, p.taille / 2);
      ctx.restore();
    } else {
      p.vy += 0.12;
      p.vx *= 0.94;
      p.vy *= 0.94;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille * (p.vie / 60), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  particules = particules.filter((p) => p.vie > 0 && p.y < innerHeight + 20);
  if (particules.length) raf = requestAnimationFrame(tic);
  else {
    // Plus rien à dessiner : on retire la toile (0 coût au repos).
    toile.remove();
    toile = null;
    ctx = null;
    raf = 0;
  }
}

/** Gerbe de particules depuis un point de l'écran. Sans effet si « mouvement réduit ». */
export function eclat(x: number, y: number, o: OptionsEclat = {}) {
  if (mouvementReduit() || typeof document === 'undefined') return;
  preparerToile();
  const couleurs = o.couleurs ?? COULEURS;
  const forme = o.forme ?? 'etincelle';
  const force = o.force ?? 6;
  const n = Math.min(o.nombre ?? 24, 160);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = force * (0.4 + Math.random() * 0.8);
    particules.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - (forme === 'confetti' ? force * 0.6 : 0),
      taille: forme === 'confetti' ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
      angle: Math.random() * 6,
      vie: 50 + Math.random() * 40,
      couleur: couleurs[i % couleurs.length],
      forme,
    });
  }
  if (!raf) raf = requestAnimationFrame(tic);
}

/** Gerbe depuis le centre d'un élément (ex. le bouton « Valider la série »). */
export function eclatSur(el: Element | null | undefined, o?: OptionsEclat) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  eclat(r.left + r.width / 2, r.top + r.height / 2, o);
}

/** Pluie de confettis pour un record. */
export const celebrer = () =>
  eclat(innerWidth / 2, innerHeight * 0.18, { forme: 'confetti', nombre: 110, force: 9 });
