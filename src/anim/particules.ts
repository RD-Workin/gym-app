import { mouvementReduit } from './mouvement';

export type FormeParticule = 'etincelle' | 'confetti' | 'etoile' | 'braise';

export interface OptionsEclat {
  /** Nombre de particules (défaut 24, plafonné à 160 par appel). */
  nombre?: number;
  couleurs?: string[];
  /** etincelle : points lumineux ; confetti : rubans qui tombent ; etoile : étoiles qui tournent ; braise : points qui montent. */
  forme?: FormeParticule;
  /** Vitesse initiale en px par image à 60 i/s (défaut 6). */
  force?: number;
  /** Ajoute une onde de choc (anneau qui s'élargit) au point de départ. */
  onde?: boolean;
}

interface Particule {
  x: number; y: number; vx: number; vy: number;
  taille: number; angle: number; vr: number; vie: number; vieMax: number;
  couleur: string; forme: FormeParticule | 'anneau';
}

export const COULEURS = ['#ffd45e', '#ff7a3d', '#3ddc97', '#eef2f6'];
export const COULEURS_OR = ['#ffd45e', '#fff1b8', '#ffb547', '#ffffff'];
export const COULEURS_PROGRES = ['#3ddc97', '#b6f5d8', '#eef2f6', '#ffd45e'];
/** Plafond global : au-delà, les plus anciennes particules sont retirées (fluidité sur iPhone). */
const MAX = 420;

let toile: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particules: Particule[] = [];
let raf = 0;
let avant = 0;

function preparerToile() {
  if (!toile) {
    toile = document.createElement('canvas');
    toile.className = 'anim-particules';
    toile.setAttribute('aria-hidden', 'true');
    document.body.appendChild(toile);
    ctx = toile.getContext('2d');
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (toile.width !== innerWidth * dpr || toile.height !== innerHeight * dpr) {
    toile.width = innerWidth * dpr;
    toile.height = innerHeight * dpr;
  }
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function etoile(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

function tic(t: number) {
  if (!ctx || !toile) return;
  // Pas de temps normalisé à 60 i/s : même vitesse sur un écran 120 Hz (ProMotion).
  const k = Math.min(3, avant ? (t - avant) / 16.67 : 1);
  avant = t;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particules) {
    p.vie -= k;
    const a = Math.max(0, Math.min(1, p.vie / Math.min(30, p.vieMax * 0.5)));
    ctx.globalAlpha = a;
    if (p.forme === 'anneau') {
      const prog = 1 - p.vie / p.vieMax;
      ctx.strokeStyle = p.couleur;
      ctx.lineWidth = 3 * (1 - prog) + 0.5;
      ctx.globalAlpha = (1 - prog) * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille * (0.25 + prog * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    p.x += p.vx * k;
    p.y += p.vy * k;
    ctx.fillStyle = p.couleur;
    if (p.forme === 'confetti') {
      p.vy += 0.22 * k;
      p.vx *= 0.99 ** k;
      p.vy = Math.min(p.vy, 5);
      p.angle += p.vr * k;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      // Le ruban tourne sur lui-même : sa largeur apparente oscille.
      ctx.scale(Math.cos(p.angle * 1.7), 1);
      ctx.fillRect(-p.taille / 2, -p.taille / 4, p.taille, p.taille / 2);
      ctx.restore();
    } else if (p.forme === 'etoile') {
      p.vy += 0.1 * k;
      p.vx *= 0.97 ** k;
      p.vy *= 0.98 ** k;
      p.angle += p.vr * k;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      etoile(ctx, p.taille);
      ctx.restore();
    } else if (p.forme === 'braise') {
      p.vy -= 0.04 * k;
      p.vx += (Math.random() - 0.5) * 0.2 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille * Math.max(0, p.vie / p.vieMax), 0, Math.PI * 2);
      ctx.fill();
    } else {
      p.vy += 0.12 * k;
      p.vx *= 0.94 ** k;
      p.vy *= 0.94 ** k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille * Math.max(0.2, p.vie / p.vieMax), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  particules = particules.filter((p) => p.vie > 0 && p.y < innerHeight + 30 && p.y > -60);
  if (particules.length) raf = requestAnimationFrame(tic);
  else {
    // Plus rien à dessiner : on retire la toile (0 coût au repos).
    toile.remove();
    toile = null;
    ctx = null;
    raf = 0;
    avant = 0;
  }
}

function lancer() {
  if (particules.length > MAX) particules.splice(0, particules.length - MAX);
  if (!raf) raf = requestAnimationFrame(tic);
}

/** Gerbe de particules depuis un point de l'écran. Sans effet si « mouvement réduit ». */
export function eclat(x: number, y: number, o: OptionsEclat = {}) {
  if (mouvementReduit() || typeof document === 'undefined') return;
  preparerToile();
  const couleurs = o.couleurs ?? COULEURS;
  const forme = o.forme ?? 'etincelle';
  const force = o.force ?? 6;
  const n = Math.min(o.nombre ?? 24, 160);
  if (o.onde) particules.push({ x, y, vx: 0, vy: 0, taille: 90, angle: 0, vr: 0, vie: 28, vieMax: 28, couleur: couleurs[0], forme: 'anneau' });
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = force * (0.4 + Math.random() * 0.8);
    const vie = (forme === 'confetti' ? 90 : forme === 'braise' ? 55 : 45) + Math.random() * 40;
    particules.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - (forme === 'confetti' ? force * 0.6 : forme === 'braise' ? force * 0.4 : 0),
      taille: forme === 'confetti' ? 5 + Math.random() * 6 : forme === 'etoile' ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
      angle: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      vie,
      vieMax: vie,
      couleur: couleurs[i % couleurs.length],
      forme,
    });
  }
  lancer();
}

/** Centre d'un élément à l'écran (ou `undefined`). */
export function centre(el: Element | null | undefined): [number, number] | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

/** Gerbe depuis le centre d'un élément (ex. le bouton « Valider la série »). */
export function eclatSur(el: Element | null | undefined, o?: OptionsEclat) {
  const c = centre(el);
  if (c) eclat(c[0], c[1], o);
}

/** Pluie de confettis + étoiles dorées pour un record. */
export const celebrer = () => {
  eclat(innerWidth / 2, innerHeight * 0.16, { forme: 'confetti', nombre: 110, force: 10 });
  eclat(innerWidth / 2, innerHeight * 0.16, { forme: 'etoile', nombre: 18, force: 7, couleurs: COULEURS_OR, onde: true });
};

/** Feu d'artifice en plusieurs salves (objectif atteint, fin de séance). */
export function feuArtifice(salves = 4) {
  if (mouvementReduit()) return;
  for (let i = 0; i < salves; i++) {
    window.setTimeout(() => {
      const x = innerWidth * (0.2 + Math.random() * 0.6);
      const y = innerHeight * (0.12 + Math.random() * 0.25);
      const palette = [COULEURS, COULEURS_OR, COULEURS_PROGRES][i % 3];
      eclat(x, y, { nombre: 60, force: 8, couleurs: palette, onde: true });
      eclat(x, y, { forme: 'etoile', nombre: 8, force: 5, couleurs: COULEURS_OR });
    }, i * 320);
  }
}

/** Braises qui montent d'un élément (flamme de régularité, exercice bouclé). */
export const braisesSur = (el: Element | null | undefined, nombre = 18) =>
  eclatSur(el, { forme: 'braise', nombre, force: 2.5, couleurs: ['#ff7a3d', '#ffb547', '#ffd45e'] });
