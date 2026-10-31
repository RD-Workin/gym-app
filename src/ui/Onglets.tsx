import { useRef } from 'preact/hooks';

interface Props<T extends string> {
  options: { valeur: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
  label: string;
}

/** Contrôle segmenté (ex. 1RM / Charge max / Volume). Flèches gauche/droite au clavier. */
export function Onglets<T extends string>({ options, valeur, onChange, label }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const clavier = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = options.findIndex((o) => o.valeur === valeur);
    const n = (i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length;
    onChange(options[n].valeur);
    (ref.current?.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div class="ui-onglets" role="tablist" aria-label={label} ref={ref} onKeyDown={clavier}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button key={o.valeur} type="button" role="tab" aria-selected={actif} tabIndex={actif ? 0 : -1} onClick={() => onChange(o.valeur)}>
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
