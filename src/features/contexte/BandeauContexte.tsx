import { useState } from 'preact/hooks';
import { Bouton, Carte, Icone, Puce } from '../../ui';
import { db } from '../../core/db';
import { useRequete } from '../../core/requetes';
import type { Seance } from '../../core/types';
import { CLE_AUTO, majContexte, majDebut, reglerContexteAuto, remplirContexte } from './contexte';

const pad = (n: number) => String(n).padStart(2, '0');
/** Valeur pour <input type="datetime-local"> (heure locale). */
const versChamp = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const lireNombre = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Date, heure, température et poids du corps d'une séance. Toucher pour tout corriger à la main. */
export function BandeauContexte({ seance }: { seance: Seance }) {
  const [ouvert, setOuvert] = useState(false);
  const auto = useRequete(async () => (await db.reglages.get(CLE_AUTO))?.valeur !== false);
  const c = seance.contexte;
  const date = new Date(seance.debut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const heure = new Date(seance.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <button type="button" class="sc-contexte sc-puce-btn" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} aria-label="Modifier le contexte de la séance">
        <Puce>
          {date} · {heure}
        </Puce>
        <Puce>
          <span class="sc-ico">
            <Icone nom="meteo" />
          </span>
          {c.temperatureC != null ? `${c.temperatureC} °C` : '— °C'}
        </Puce>
        <Puce>{c.poidsCorporelKg != null ? `${c.poidsCorporelKg.toLocaleString('fr-FR')} kg PdC` : 'Poids du corps ?'}</Puce>
      </button>
      {ouvert && (
        <Carte titre="Contexte de la séance">
          <div class="sc-form">
            <label>
              Date et heure de début
              <input
                class="sc-champ"
                type="datetime-local"
                value={versChamp(seance.debut)}
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  if (v) void majDebut(seance.id, new Date(v));
                }}
              />
            </label>
            <div class="sc-grille deux">
              <label>
                Température (°C)
                <input
                  class="sc-champ"
                  inputMode="decimal"
                  placeholder="—"
                  value={c.temperatureC ?? ''}
                  onChange={(e) => void majContexte(seance.id, { temperatureC: lireNombre((e.target as HTMLInputElement).value) })}
                />
              </label>
              <label>
                Poids du corps (kg)
                <input
                  class="sc-champ"
                  inputMode="decimal"
                  placeholder="—"
                  value={c.poidsCorporelKg ?? ''}
                  onChange={(e) => void majContexte(seance.id, { poidsCorporelKg: lireNombre((e.target as HTMLInputElement).value) })}
                />
              </label>
            </div>
            {c.temperatureC != null && <span class="sc-attenue">Température {c.source === 'auto' ? 'récupérée automatiquement' : 'saisie à la main'}.</span>}
            <label class="sc-interrupteur">
              <input type="checkbox" checked={auto !== false} onChange={(e) => void reglerContexteAuto((e.target as HTMLInputElement).checked)} />
              <span>
                Météo automatique
                <span class="sc-attenue" style={{ display: 'block' }}>
                  {auto !== false ? 'Température récupérée au début de chaque séance (position approximative).' : 'Désactivée : aucune localisation, aucun appel réseau.'}
                </span>
              </span>
            </label>
            <div class="sc-ligne">
              {auto !== false && (
                <Bouton variante="contour" onClick={() => void remplirContexte(seance.id, true)}>
                  Récupérer la météo
                </Bouton>
              )}
              <Bouton variante="secondaire" onClick={() => setOuvert(false)}>
                OK
              </Bouton>
            </div>
          </div>
        </Carte>
      )}
    </>
  );
}
