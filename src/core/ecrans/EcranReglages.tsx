import { useEffect, useState } from 'preact/hooks';
import { SCHEMA_VERSION } from '../db';

export function EcranReglages() {
  const [persistant, setPersistant] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistant);
  }, []);
  return (
    <section>
      <h1>Réglages</h1>
      <p>
        Stockage protégé :{' '}
        {persistant == null ? '…' : persistant ? 'oui' : "non (installe l'app sur l'écran d'accueil)"}
      </p>
      <p>Version du schéma : {SCHEMA_VERSION}</p>
    </section>
  );
}
