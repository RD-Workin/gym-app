// Contexte d'une séance : température du jour (propriétaire : 04-seance).
// Open-Meteo : gratuit, sans clé. Position arrondie à 0,1° (~10 km), gardée sur le téléphone
// pour ne demander la localisation qu'une fois. Sans réseau ni autorisation : rien ne bloque,
// la température reste vide et peut être saisie à la main.
import { db } from '../../core/db';
import { maintenant } from '../../core/ids';
import type { Id } from '../../core/types';

const CLE_POSITION = 'contexte.position';
/** `false` = aucune météo automatique, aucune demande de localisation. Défaut : activé. */
export const CLE_AUTO = 'contexte.auto';

export async function contexteAutoActif(): Promise<boolean> {
  return (await db.reglages.get(CLE_AUTO))?.valeur !== false;
}

export async function reglerContexteAuto(actif: boolean) {
  await db.reglages.put({ cle: CLE_AUTO, valeur: actif });
  if (!actif) await db.reglages.delete(CLE_POSITION);
}
const DELAI_MS = 8000;

interface Position {
  lat: number;
  lon: number;
}

const arrondir = (v: number) => Math.round(v * 10) / 10;

async function position(): Promise<Position | null> {
  const memo = (await db.reglages.get(CLE_POSITION))?.valeur as Position | 'refus' | undefined;
  if (memo === 'refus') return null;
  if (memo) return memo;
  if (!navigator.geolocation) return null;
  return new Promise((ok) => {
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const pos = { lat: arrondir(p.coords.latitude), lon: arrondir(p.coords.longitude) };
        await db.reglages.put({ cle: CLE_POSITION, valeur: pos });
        ok(pos);
      },
      async (e) => {
        if (e.code === e.PERMISSION_DENIED) await db.reglages.put({ cle: CLE_POSITION, valeur: 'refus' });
        ok(null);
      },
      { enableHighAccuracy: false, timeout: DELAI_MS, maximumAge: 7 * 24 * 3600 * 1000 },
    );
  });
}

export async function temperatureActuelle(): Promise<number | null> {
  if (!navigator.onLine || !(await contexteAutoActif())) return null;
  const pos = await position();
  if (!pos) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m`;
    const r = await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    const v = (j as { current?: { temperature_2m?: unknown } })?.current?.temperature_2m;
    return typeof v === 'number' && Number.isFinite(v) && v > -60 && v < 60 ? Math.round(v) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Remplit la température (sauf saisie manuelle, ou si `forcer`). Silencieux en cas d'échec ou si désactivé. */
export async function remplirContexte(seanceId: Id, forcer = false) {
  const temp = await temperatureActuelle();
  if (temp == null) return;
  const s = await db.seances.get(seanceId);
  if (!s || (!forcer && s.contexte.source === 'manuel')) return;
  await db.seances.update(seanceId, { contexte: { ...s.contexte, temperatureC: temp, source: 'auto' }, modifieLe: maintenant() });
}

export async function majContexte(seanceId: Id, maj: { temperatureC?: number; poidsCorporelKg?: number }) {
  await db.transaction('rw', db.seances, async () => {
    const s = await db.seances.get(seanceId);
    if (!s) return;
    const contexte = { ...s.contexte, ...maj };
    if ('temperatureC' in maj) contexte.source = 'manuel';
    await db.seances.update(seanceId, { contexte, modifieLe: maintenant() });
  });
}

/** Change le début de la séance ; la fin et les séries sont décalées d'autant (durées gardées). */
export async function majDebut(seanceId: Id, debut: Date) {
  await db.transaction('rw', db.seances, db.series, async () => {
    const s = await db.seances.get(seanceId);
    if (!s || Number.isNaN(debut.getTime())) return;
    const delta = debut.getTime() - new Date(s.debut).getTime();
    if (!delta) return;
    const decale = (iso: string) => maintenant(new Date(new Date(iso).getTime() + delta));
    await db.seances.update(seanceId, { debut: maintenant(debut), fin: s.fin ? decale(s.fin) : undefined, modifieLe: maintenant() });
    await db.series
      .where('seanceId')
      .equals(seanceId)
      .modify((x) => {
        x.faiteLe = decale(x.faiteLe);
      });
  });
}

/** Oublie la position mémorisée (ou le refus) : la prochaine séance redemandera. */
export const oublierPosition = () => db.reglages.delete(CLE_POSITION);
