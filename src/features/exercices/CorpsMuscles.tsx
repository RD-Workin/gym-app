// Corps 2D avant / arrière : affiche les muscles travaillés, et sert de filtre quand on touche une zone.
import { AVANT, ARRIERE, type ZoneCorps } from '../../data/corps';
import { libelleGroupe } from '../../data/groupes';

interface Props {
  /** Groupes en couleur pleine (principaux ou sélection). */
  actifs: string[];
  /** Groupes en couleur atténuée (secondaires). */
  secondaires?: string[];
  /** Présent = zones touchables. */
  onBasculer?: (groupe: string) => void;
  /** Vignette : une seule vue (avant), sans légende. */
  mini?: boolean;
}

function Vue({ zones, titre, actifs, secondaires, onBasculer, mini }: Props & { zones: ZoneCorps[]; titre: string }) {
  return (
    <figure class="ex-corps-vue">
      <svg viewBox="0 0 100 200" role={onBasculer ? 'group' : 'img'} aria-label={`${titre} : ${actifs.map(libelleGroupe).join(', ') || 'aucun muscle'}`}>
        {zones.map((z, i) => {
          const etat = z.g && actifs.includes(z.g) ? 'actif' : z.g && secondaires?.includes(z.g) ? 'secondaire' : '';
          const touchable = !!(onBasculer && z.g);
          return (
            <g
              key={i}
              class={`ex-zone ${etat}${touchable ? ' touchable' : ''}`}
              onClick={touchable ? () => onBasculer!(z.g!) : undefined}
            >
              {touchable && <title>{libelleGroupe(z.g!)}</title>}
              {z.pts.map((p, j) => (
                <polygon key={j} points={p} />
              ))}
            </g>
          );
        })}
      </svg>
      {!mini && <figcaption class="ui-surtitre">{titre}</figcaption>}
    </figure>
  );
}

export function CorpsMuscles(props: Props) {
  if (props.mini) return <Vue {...props} zones={AVANT} titre="Avant" />;
  return (
    <div class="ex-corps">
      <Vue {...props} zones={AVANT} titre="Avant" />
      <Vue {...props} zones={ARRIERE} titre="Arrière" />
    </div>
  );
}
