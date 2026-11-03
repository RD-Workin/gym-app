import { useEffect } from 'preact/hooks';
import { celebrer, feuArtifice, flash, vibrer } from '../anim';
import { Icone } from './Icone';

interface Props {
  /** Ex. « Pec fly · 1RM estimé 97 kg ». Un texte qui commence par 🎯 est un objectif atteint. */
  texte: string;
  /** Appelé à la fin de l'affichage (≈ 3 s) : le parent retire le toast. */
  onFin: () => void;
}

/** Célébration d'un record ou d'un objectif : toast doré, flash, confettis ou feu d'artifice (src/anim), vibration. */
export function ToastRecord({ texte, onFin }: Props) {
  const objectif = texte.startsWith('🎯');
  const propre = objectif ? texte.replace(/^🎯\s*/, '').replace(/^Objectif atteint\s*:\s*/, '') : texte;
  useEffect(() => {
    vibrer([30, 60, 30]);
    flash(objectif ? 'progres' : 'record');
    if (objectif) feuArtifice(4);
    else celebrer();
    const t = window.setTimeout(onFin, objectif ? 3400 : 2900);
    return () => window.clearTimeout(t);
  }, [texte]);

  return (
    <div class={`ui-toast anim-reflet${objectif ? ' objectif' : ''}`} role="status" aria-live="polite">
      <span class="ui-medaille anim-medaille-tourne">
        <Icone nom={objectif ? 'etoile' : 'records'} />
      </span>
      <div>
        <span class="ui-toast-titre">{objectif ? 'Objectif atteint !' : 'Nouveau record !'}</span>
        <span class="ui-toast-texte">{propre}</span>
      </div>
    </div>
  );
}
