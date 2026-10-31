import { Icone, Puce } from '../../ui';
import type { Seance } from '../../core/types';
import { majContexte } from './contexte';

const lireNombre = (question: string, actuel?: number) => {
  const r = prompt(question, actuel != null ? String(actuel) : '');
  if (r == null) return undefined;
  const v = parseFloat(r.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

/** Date, température et poids du corps d'une séance. Toucher une puce pour corriger. */
export function BandeauContexte({ seance }: { seance: Seance }) {
  const c = seance.contexte;
  const date = new Date(seance.debut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const heure = new Date(seance.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const temp = () => {
    const v = lireNombre('Température (°C)', c.temperatureC);
    if (v !== undefined) void majContexte(seance.id, { temperatureC: v ?? undefined });
  };
  const poids = () => {
    const v = lireNombre('Poids du corps (kg)', c.poidsCorporelKg);
    if (v !== undefined) void majContexte(seance.id, { poidsCorporelKg: v ?? undefined });
  };

  return (
    <div class="sc-contexte">
      <Puce>
        {date} · {heure}
      </Puce>
      <button type="button" class="sc-puce-btn" onClick={temp} aria-label="Modifier la température">
        <Puce>
          <span class="sc-ico">
            <Icone nom="meteo" />
          </span>
          {c.temperatureC != null ? `${c.temperatureC} °C` : '— °C'}
        </Puce>
      </button>
      <button type="button" class="sc-puce-btn" onClick={poids} aria-label="Modifier le poids du corps">
        <Puce>{c.poidsCorporelKg != null ? `${c.poidsCorporelKg.toLocaleString('fr-FR')} kg PdC` : 'Poids du corps ?'}</Puce>
      </button>
    </div>
  );
}
