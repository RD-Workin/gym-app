import { lien } from '../router';
import { RappelSauvegarde } from '../../features/donnees/rappel';
import { CarteNouveautes } from './MiseAJour';

export function EcranAccueil() {
  return (
    <section>
      <h1>Gym App</h1>
      <CarteNouveautes />
      <RappelSauvegarde />
      <p>
        <a href={lien('/seance')}>Commencer une séance</a>
      </p>
      <p>
        <a href={lien('/exercices')}>Noter un exercice (sans séance)</a>
      </p>
    </section>
  );
}
