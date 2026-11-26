// Schéma du haut du corps face à la barre : on place la barre à la hauteur atteinte (tractions…).
// Édition : glisser ou toucher le schéma, ou un repère (menton, pecs…). Lecture : une ou plusieurs barres.
import { bornerHauteur, HAUTEUR_MAX, HAUTEUR_MIN, hauteurTexte, REPERES } from '../core/hauteur';

/** Position verticale (unités du dessin) de chaque repère, dans l'ordre de REPERES. */
const Y_REPERES = [38, 60, 82, 110, 138, 168];
const LARGEUR = 240;
const HAUTEUR = 196;
const CX = 88;
const EPAULE_Y = 84;

/** Valeur 0-100 → y du dessin (interpolation entre repères). */
export function yDeHauteur(v: number): number {
  const b = Math.max(HAUTEUR_MIN, Math.min(HAUTEUR_MAX, v));
  for (let i = 1; i < REPERES.length; i++) {
    const a = REPERES[i - 1];
    const c = REPERES[i];
    if (b <= c.valeur) return Y_REPERES[i - 1] + ((b - a.valeur) / (c.valeur - a.valeur)) * (Y_REPERES[i] - Y_REPERES[i - 1]);
  }
  return Y_REPERES[Y_REPERES.length - 1];
}

/** y du dessin → valeur 0-100 (bornée). */
export function hauteurDeY(y: number): number {
  if (y <= Y_REPERES[0]) return HAUTEUR_MIN;
  for (let i = 1; i < Y_REPERES.length; i++) {
    if (y <= Y_REPERES[i]) {
      const t = (y - Y_REPERES[i - 1]) / (Y_REPERES[i] - Y_REPERES[i - 1]);
      return bornerHauteur(REPERES[i - 1].valeur + t * (REPERES[i].valeur - REPERES[i - 1].valeur));
    }
  }
  return HAUTEUR_MAX;
}

export interface BarreSchema {
  valeur: number;
  /** Texte court à gauche de la barre (« S1-S2 », « record »). */
  legende?: string;
  ton?: 'action' | 'attenue' | 'record';
}

interface Props {
  /** La première barre porte les mains ; les autres sont des repères (autres séries, record). */
  barres: BarreSchema[];
  /** Présent = barre réglable (une seule barre). */
  onChange?: (v: number) => void;
  label: string;
  /** Version réduite (listes, historique). */
  compact?: boolean;
}

export function SchemaHauteur({ barres, onChange, label, compact }: Props) {
  const principale = barres[0];
  const yBarre = principale ? yDeHauteur(principale.valeur) : undefined;
  const actif = principale ? REPERES.findIndex((r) => Math.abs(r.valeur - principale.valeur) <= 4) : -1;

  const depuisPointeur = (e: PointerEvent) => {
    // Coordonnées du dessin, quelle que soit la taille affichée (marges de preserveAspectRatio comprises).
    const svg = e.currentTarget as SVGSVGElement;
    const m = svg.getScreenCTM?.();
    if (m) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      onChange!(hauteurDeY(p.y));
      return;
    }
    const r = svg.getBoundingClientRect();
    if (r.height) onChange!(hauteurDeY(((e.clientY - r.top) / r.height) * HAUTEUR));
  };
  const clavier = (e: KeyboardEvent) => {
    if (!onChange || !principale) return;
    // Flèche haut = barre plus haute sur l'écran = moins haut sur le corps : on suit l'écran.
    if (e.key === 'ArrowUp') onChange(bornerHauteur(principale.valeur - 5));
    else if (e.key === 'ArrowDown') onChange(bornerHauteur(principale.valeur + 5));
    else return;
    e.preventDefault();
  };

  // Bras : épaule → coude → main sur la barre (prise large).
  const bras = (cote: -1 | 1) => {
    if (yBarre == null) return null;
    const ex = CX + cote * 34;
    const main = CX + cote * 66;
    // Barre au-dessus des épaules : coudes sous les épaules ; en dessous (pecs, nombril) : coudes entre les deux.
    const coude = { x: CX + cote * 60, y: yBarre < EPAULE_Y ? EPAULE_Y + 18 : (EPAULE_Y + yBarre) / 2 - 4 };
    const d = `M${ex},${EPAULE_Y + 2} L${coude.x},${coude.y} L${main},${yBarre}`;
    return (
      <g>
        <path class="ui-sh-bras-contour" d={d} />
        <path class="ui-sh-bras" d={d} />
      </g>
    );
  };

  return (
    <svg
      class={`ui-sh${compact ? ' compact' : ''}${onChange ? ' reglable' : ''}`}
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role={onChange ? 'slider' : 'img'}
      aria-label={label}
      aria-valuemin={onChange ? HAUTEUR_MIN : undefined}
      aria-valuemax={onChange ? HAUTEUR_MAX : undefined}
      aria-valuenow={onChange ? principale?.valeur : undefined}
      aria-valuetext={onChange && principale ? hauteurTexte(principale.valeur) : undefined}
      tabIndex={onChange ? 0 : undefined}
      onKeyDown={onChange ? clavier : undefined}
      onPointerDown={
        onChange
          ? (e) => {
              (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
              depuisPointeur(e);
            }
          : undefined
      }
      onPointerMove={onChange ? (e) => e.buttons && depuisPointeur(e) : undefined}
    >
      {/* Corps : tête, cou, buste jusqu'à la taille. */}
      <g class="ui-sh-corps">
        <path d={`M${CX - 8},54 L${CX - 8},78 L${CX + 8},78 L${CX + 8},54 Z`} />
        <path d={`M${CX - 30},79 L${CX + 30},79 Q${CX + 40},80 ${CX + 41},92 L${CX + 32},140 Q${CX + 28},162 ${CX + 24},${HAUTEUR} L${CX - 24},${HAUTEUR} Q${CX - 28},162 ${CX - 32},140 L${CX - 41},92 Q${CX - 40},80 ${CX - 30},79 Z`} />
        <ellipse cx={CX} cy={38} rx={17} ry={21} />
      </g>
      <g class="ui-sh-traits">
        <circle cx={CX - 6} cy={37} r={1.8} />
        <circle cx={CX + 6} cy={37} r={1.8} />
        <path d={`M${CX - 26},84 Q${CX - 14},88 ${CX - 3},83 M${CX + 3},83 Q${CX + 14},88 ${CX + 26},84`} />
        <path d={`M${CX - 24},100 Q${CX - 14},118 ${CX - 1},110 M${CX + 1},110 Q${CX + 14},118 ${CX + 24},100`} />
        <path d={`M${CX},88 L${CX},138`} />
        <circle cx={CX} cy={168} r={2.4} />
      </g>
      {bras(-1)}
      {bras(1)}

      {/* Repères à droite : touchables en édition. */}
      {REPERES.map((r, i) => (
        <g
          key={r.nom}
          class={`ui-sh-repere${i === actif ? ' actif' : ''}`}
          onPointerDown={
            onChange
              ? (e) => {
                  e.stopPropagation();
                  onChange(r.valeur);
                }
              : undefined
          }
        >
          <line x1={168} x2={176} y1={Y_REPERES[i]} y2={Y_REPERES[i]} />
          <text x={180} y={Y_REPERES[i] + 4}>
            {r.nom === 'bas du sternum' ? 'sternum' : r.nom}
          </text>
          {onChange && <rect x={164} y={Y_REPERES[i] - 11} width={LARGEUR - 164} height={22} fill="transparent" />}
        </g>
      ))}

      {/* Barres secondaires d'abord, la principale par-dessus. */}
      {barres
        .map((b, i) => ({ b, i }))
        .reverse()
        .map(({ b, i }) => {
          const y = yDeHauteur(b.valeur);
          return (
            <g key={i} class={`ui-sh-barre ${b.ton ?? (i === 0 ? 'action' : 'attenue')}`}>
              <line x1={8} x2={164} y1={y} y2={y} />
              {i === 0 && (
                <>
                  <circle cx={CX - 66} cy={y} r={5} />
                  <circle cx={CX + 66} cy={y} r={5} />
                </>
              )}
              {b.legende && (
                <text x={10} y={y - 6}>
                  {b.legende}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
