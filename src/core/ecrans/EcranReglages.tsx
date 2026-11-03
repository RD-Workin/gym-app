import { useEffect, useState } from 'preact/hooks';
import { Bouton, Carte } from '../../ui';
import { SCHEMA_VERSION } from '../db';
import { lien } from '../router';
import { useRequete } from '../requetes';
import { contexteAutoActif, reglerContexteAuto } from '../../features/contexte/contexte';
import { LEXIQUE } from '../../data/lexique';
import { EtapesDemarrage } from './EcranAccueil';
import './accueil.css';

export function EcranReglages() {
  const [persistant, setPersistant] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistant);
  }, []);
  const meteoAuto = useRequete(contexteAutoActif);

  return (
    <section class="ui-pile acc">
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

      <Carte titre="Tes données">
        <p>Tout est enregistré sur ce téléphone, sans compte. Pense à faire une sauvegarde de temps en temps.</p>
        {persistant === false && (
          <p class="ui-attenue">
            Pour que le téléphone ne les efface pas : ajoute l'app à l'écran d'accueil (Safari › Partager › Sur l'écran d'accueil).
          </p>
        )}
        <Bouton variante="secondaire" icone="donnees" href={lien('/donnees')}>
          Sauvegarder, restaurer, exporter
        </Bouton>
      </Carte>

      <Carte titre="Aide">
        <details class="reg-aide">
          <summary>Pour bien démarrer</summary>
          <EtapesDemarrage />
        </details>
        <details class="reg-aide">
          <summary>Les mots de l'app</summary>
          <dl class="reg-lexique">
            {Object.values(LEXIQUE).map((m) => (
              <div key={m.terme}>
                <dt>{m.terme}</dt>
                <dd>{m.definition}</dd>
              </div>
            ))}
          </dl>
        </details>
      </Carte>

      <p class="ui-attenue" style={{ fontSize: 'var(--t-xs)', margin: 0 }}>
        Version des données : {SCHEMA_VERSION}
        {persistant ? ' · stockage protégé' : ''}
      </p>
    </section>
  );
}
