// Courbe SVG maison : 0 dépendance, lisible en sombre sur petit écran. Propriétaire : 05-progression.
import { useState } from 'preact/hooks';

export interface PointCourbe {
  date: string;
  valeur: number;
  /** Point doré (record). */
  record?: boolean;
  /** Point creux (valeur incertaine, ex. poids du corps inconnu). */
  incertain?: boolean;
}

interface Props {
  points: PointCourbe[];
  /** Formatage des valeurs (axe et bulle). */
  format: (v: number) => string;
  label: string;
  couleur?: string;
}

const L = 340;
const H = 170;
const M = { h: 14, b: 24, g: 4, d: 44 };
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function Courbe({ points, format, label, couleur = 'var(--c-action)' }: Props) {
  const [choisi, setChoisi] = useState<number | null>(null);
  if (points.length === 0) return <p class="ui-attenue prog-vide">Pas encore de données.</p>;

  const ts = points.map((p) => new Date(p.date).getTime());
  const vs = points.map((p) => p.valeur);
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  let v0 = Math.min(...vs);
  let v1 = Math.max(...vs);
  const marge = (v1 - v0) * 0.15 || Math.max(1, v1 * 0.1);
  v0 = Math.max(0, v0 - marge);
  v1 += marge;
  const x = (t: number) => (t1 === t0 ? (M.g + L - M.d) / 2 : M.g + ((t - t0) / (t1 - t0)) * (L - M.g - M.d));
  const y = (v: number) => M.h + (1 - (v - v0) / (v1 - v0)) * (H - M.h - M.b);
  const xy = points.map((p, i) => [x(ts[i]), y(p.valeur)] as const);
  const trace = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
  const aire = `${trace}L${xy[xy.length - 1][0].toFixed(1)},${H - M.b}L${xy[0][0].toFixed(1)},${H - M.b}Z`;
  const vMax = Math.max(...vs);
  const vMin = Math.min(...vs);
  const graduations = vMax === vMin ? [vMax] : [vMax, vMin];
  const sel = choisi ?? points.length - 1;
  const [sx, sy] = xy[sel];

  const toucher = (e: PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * L;
    let best = 0;
    xy.forEach(([a], i) => {
      if (Math.abs(a - px) < Math.abs(xy[best][0] - px)) best = i;
    });
    setChoisi(best);
  };

  return (
    <figure class="prog-courbe">
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={label} onPointerDown={toucher} onPointerMove={(e) => e.buttons && toucher(e)}>
        <defs>
          <linearGradient id="prog-degrade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color={couleur} stop-opacity="0.28" />
            <stop offset="1" stop-color={couleur} stop-opacity="0" />
          </linearGradient>
        </defs>
        {graduations.map((g) => (
          <g key={g}>
            <line x1={M.g} x2={L - M.d} y1={y(g)} y2={y(g)} class="prog-grille" />
            <text x={L - M.d + 6} y={y(g) + 4} class="prog-axe">{format(g)}</text>
          </g>
        ))}
        {points.length > 1 && <path d={aire} fill="url(#prog-degrade)" />}
        <path d={trace} fill="none" stroke={couleur} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xy[i][0]}
            cy={xy[i][1]}
            r={p.record ? 4.5 : 3}
            class={p.record ? 'prog-pt-record' : p.incertain ? 'prog-pt-incertain' : undefined}
            fill={p.record ? 'var(--c-record)' : p.incertain ? 'var(--c-fond)' : couleur}
            stroke={p.incertain ? couleur : 'none'}
          />
        ))}
        <line x1={sx} x2={sx} y1={M.h} y2={H - M.b} class="prog-curseur" />
        <circle cx={sx} cy={sy} r="6" fill="none" stroke="var(--c-texte)" stroke-width="2" />
        <text x={M.g} y={H - 6} class="prog-axe">{dateCourte(points[0].date)}</text>
        {points.length > 1 && <text x={L - M.d} y={H - 6} text-anchor="end" class="prog-axe">{dateCourte(points[points.length - 1].date)}</text>}
      </svg>
      <figcaption class="prog-bulle" aria-live="polite">
        <span class="ui-chiffre">{format(points[sel].valeur)}</span> · {dateCourte(points[sel].date)}
        {points[sel].record && <span class="prog-or"> ★ record</span>}
        {points[sel].incertain && <span class="ui-attenue"> · poids du corps inconnu</span>}
      </figcaption>
    </figure>
  );
}

/** Barres verticales simples (séances par semaine). */
export function Barres({ valeurs, libelles, label }: { valeurs: number[]; libelles: string[]; label: string }) {
  const max = Math.max(1, ...valeurs);
  return (
    <div class="prog-barres" role="img" aria-label={label}>
      {valeurs.map((v, i) => (
        <div key={i} class="prog-barre">
          <span class="prog-barre-val">{v || ''}</span>
          <span class="prog-barre-fill" style={{ height: `${(v / max) * 100}%`, opacity: v ? 1 : 0.25 }} />
          <span class="prog-barre-lib">{libelles[i]}</span>
        </div>
      ))}
    </div>
  );
}
