import { lien } from '../router';

export function EcranAccueil() {
  return (
    <section>
      <h1>Gym App</h1>
      <p>
        <a href={lien('/seance')}>Commencer une séance</a>
      </p>
    </section>
  );
}
