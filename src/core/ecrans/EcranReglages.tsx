import { useEffect, useState } from 'preact/hooks';
import { SCHEMA_VERSION } from '../db';
import { lien } from '../router';
import { useRequete } from '../requetes';
import { contexteAutoActif, reglerContexteAuto } from '../../features/contexte/contexte';

export function EcranReglages() {
  const [persistant, setPersistant] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistant);
  }, []);
  const meteoAuto = useRequete(contexteAutoActif);

  return (
    <section>
      <h1>Réglages</h1>
      <label style={{ display: 'flex', gap: 'var(--e-3, 12px)', alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          style={{ width: '24px', height: '24px', margin: 0, flex: 'none', accentColor: 'var(--c-action)' }}
          checked={meteoAuto !== false}
          disabled={meteoAuto === undefined}
          onChange={(e) => void reglerContexteAuto((e.target as HTMLInputElement).checked)}
        />
        <span>
          Météo automatique
          <small style={{ display: 'block', opacity: 0.7 }}>
            {meteoAuto !== false
              ? 'Température récupérée au début de chaque séance (position approximative).'
              : 'Désactivée : aucune localisation, aucun appel réseau.'}
          </small>
        </span>
      </label>
      <p>
        <a href={lien('/donnees')}>Sauvegarde et restauration</a>
      </p>
      <p>
        Stockage protégé :{' '}
        {persistant == null ? '…' : persistant ? 'oui' : "non (installe l'app sur l'écran d'accueil)"}
      </p>
      <p>Version du schéma : {SCHEMA_VERSION}</p>
    </section>
  );
}
