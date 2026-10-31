import { lien } from '../router';
import { RappelSauvegarde } from '../../features/donnees/rappel';

export function EcranAccueil() {
  return (
    <section>
      <h1>Gym App</h1>
      <RappelSauvegarde />
      <p>
        <a href={lien('/seance')}>Commencer une séance</a>
      </p>
    </section>
  );
}
