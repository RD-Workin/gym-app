import { Bouton } from '../../ui';
import { dureeTexte, OBJECTIFS, REPOS_RAPIDES, type Objectif } from './logique';

interface Props {
  valeur: number;
  onChange: (sec: number) => void;
  /** Présent = bouton « Garder dans le modèle ». */
  onGarder?: () => void;
  onFermer: () => void;
}

/** Réglage manuel du repos : durées en un tap, ±15 s, et rappel des tendances par objectif. */
export function ChoixRepos({ valeur, onChange, onGarder, onFermer }: Props) {
  return (
    <div class="sc-choix-repos" role="group" aria-label="Durée du repos">
      <div class="sc-ligne">
        <button type="button" class="sc-option" onClick={() => onChange(Math.max(15, valeur - 15))}>
          −15 s
        </button>
        <b class="sc-num sc-repos-valeur">{dureeTexte(valeur)}</b>
        <button type="button" class="sc-option" onClick={() => onChange(Math.min(900, valeur + 15))}>
          +15 s
        </button>
      </div>
      <div class="sc-options sc-options-wrap">
        {REPOS_RAPIDES.map((s) => (
          <button key={s} type="button" class="sc-option" aria-pressed={s === valeur} onClick={() => onChange(s)}>
            {dureeTexte(s)}
          </button>
        ))}
      </div>
      <p class="sc-attenue">
        {(Object.keys(OBJECTIFS) as Objectif[]).map((o, i) => (
          <span key={o}>
            {i > 0 && ' · '}
            {OBJECTIFS[o].libelle} : {OBJECTIFS[o].plage}
          </span>
        ))}
      </p>
      <div class="sc-ligne">
        {onGarder && (
          <Bouton variante="contour" onClick={onGarder}>
            Garder dans le modèle
          </Bouton>
        )}
        <Bouton variante="secondaire" onClick={onFermer}>
          OK
        </Bouton>
      </div>
    </div>
  );
}
