import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  valeur: number;
  onChange: (v: number) => void;
  /** Ex. « kg », « reps ». */
  unite: string;
  pas?: number;
  min?: number;
  max?: number;
  /** Nombre de décimales affichées (0 pour les reps, 1 pour les kg). */
  decimales?: number;
  id: string;
}

const arrondir = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const formater = (v: number, d: number) => arrondir(v, d).toLocaleString('fr-FR', { maximumFractionDigits: d });

/**
 * Stepper +/− à gros boutons. Appui long = répétition. Le chiffre est aussi saisissable au clavier
 * numérique (virgule acceptée).
 */
export function Stepper({ valeur, onChange, unite, pas = 1, min = 0, max = 999, decimales = 1, id }: Props) {
  const [texte, setTexte] = useState(formater(valeur, decimales));
  const minuterie = useRef<number | undefined>(undefined);
  const courant = useRef(valeur);
  courant.current = valeur;

  useEffect(() => setTexte(formater(valeur, decimales)), [valeur, decimales]);

  const borner = (v: number) => Math.min(max, Math.max(min, arrondir(v, decimales)));
  const bouger = (sens: 1 | -1) => {
    const v = borner(courant.current + sens * pas);
    courant.current = v;
    onChange(v);
  };
  const debut = (sens: 1 | -1) => {
    bouger(sens);
    try {
      navigator.vibrate?.(8);
    } catch {
      /* non supporté */
    }
    let delai = 400;
    const repeter = () => {
      bouger(sens);
      delai = Math.max(60, delai * 0.8);
      minuterie.current = window.setTimeout(repeter, delai);
    };
    minuterie.current = window.setTimeout(repeter, delai);
  };
  const fin = () => window.clearTimeout(minuterie.current);
  useEffect(() => fin, []);

  const valider = () => {
    const v = parseFloat(texte.replace(',', '.'));
    if (Number.isFinite(v)) onChange(borner(v));
    else setTexte(formater(valeur, decimales));
  };

  const bouton = (sens: 1 | -1) => (
    <button
      type="button"
      aria-label={`${sens > 0 ? 'Plus' : 'Moins'} ${formater(pas, decimales)} ${unite}`}
      disabled={sens > 0 ? valeur >= max : valeur <= min}
      onPointerDown={(e) => {
        e.preventDefault();
        debut(sens);
      }}
      onPointerUp={fin}
      onPointerLeave={fin}
      onPointerCancel={fin}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          bouger(sens);
        }
      }}
    >
      {sens > 0 ? '+' : '−'}
    </button>
  );

  return (
    <div class="ui-stepper">
      {bouton(-1)}
      <label class="ui-stepper-valeur" for={id}>
        <input
          id={id}
          inputMode="decimal"
          enterKeyHint="done"
          value={texte}
          onInput={(e) => setTexte((e.target as HTMLInputElement).value)}
          onBlur={valider}
          onFocus={(e) => (e.target as HTMLInputElement).select()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span class="ui-stepper-unite">{unite}</span>
      </label>
      {bouton(1)}
    </div>
  );
}
