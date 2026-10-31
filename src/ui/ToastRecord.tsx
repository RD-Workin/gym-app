import { useEffect } from 'preact/hooks';
import { celebrer } from '../anim';
import { Icone } from './Icone';

interface Props {
  /** Ex. « Pec fly · 1RM estimé 97 kg ». */
  texte: string;
  /** Appelé à la fin de l'affichage (≈ 2,6 s) : le parent retire le toast. */
  onFin: () => void;
}

/** Célébration d'un record : toast doré, confettis (src/anim) et vibration. À afficher seulement pour un record. */
export function ToastRecord({ texte, onFin }: Props) {
  useEffect(() => {
    try {
      navigator.vibrate?.([30, 60, 30]);
    } catch {
      /* non supporté */
    }
    celebrer();
    const t = window.setTimeout(onFin, 2600);
    return () => window.clearTimeout(t);
  }, [texte]);

  return (
    <div class="ui-toast" role="status" aria-live="polite">
      <span class="ui-medaille anim-zoom">
        <Icone nom="records" />
      </span>
      <div>
        <span class="ui-toast-titre">Nouveau record !</span>
        <span class="ui-toast-texte">{texte}</span>
      </div>
    </div>
  );
}
