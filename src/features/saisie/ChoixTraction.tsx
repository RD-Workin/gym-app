// Hauteur atteinte (schéma) et répétitions explosives, pour les tractions et exercices proches. Propriétaire : 04-seance.
// Utilisé en séance, dans « Noter une perf » et dans la correction d'une séance faite.
import { useState } from 'preact/hooks';
import { Aide, SchemaHauteur } from '../../ui';
import { hauteurCourte, hauteurTexte } from '../../core/hauteur';
import '../seance/seance.css';
import './saisie.css';

export interface ValeursTraction {
  hauteur?: number;
  explosif?: boolean;
}

export function ChoixTraction({ hauteur, explosif, onChange }: ValeursTraction & { onChange: (v: ValeursTraction) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div class="tr-choix">
      <div class="sc-options">
        <button type="button" class="sc-option" aria-expanded={ouvert} aria-pressed={hauteur != null} onClick={() => setOuvert(!ouvert)}>
          Barre : {hauteur != null ? hauteurCourte(hauteur) : 'à noter'} {ouvert ? '▴' : '▾'}
        </button>
        <button type="button" class="sc-option" aria-pressed={!!explosif} onClick={() => onChange({ hauteur, explosif: explosif ? undefined : true })}>
          ⚡ Explosives
        </button>
        <Aide mot="hauteurBarre" />
      </div>
      {ouvert && (
        <div class="tr-schema">
          <p class="sr-intro ui-attenue">Glisse la barre jusqu’où tu es monté, ou touche un repère à droite.</p>
          <SchemaHauteur
            barres={hauteur != null ? [{ valeur: hauteur }] : []}
            onChange={(v) => onChange({ hauteur: v, explosif })}
            label={`Hauteur atteinte : ${hauteur != null ? hauteurTexte(hauteur) : 'pas notée'}`}
          />
          <div class="sc-options">
            <button type="button" class="sc-option" onClick={() => setOuvert(false)}>
              OK
            </button>
            {hauteur != null && (
              <button type="button" class="sc-option" onClick={() => onChange({ hauteur: undefined, explosif })}>
                Ne pas noter la hauteur
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
