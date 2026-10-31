// Export JSON (sauvegarde fidèle) et CSV (lecture coach / IA). Propriétaire : 06-donnees.
import { db, SCHEMA_VERSION } from '../../core/db';
import { chargeEffective, unRmEstime } from '../../core/calculs';
import { maintenant } from '../../core/ids';
import type { ExportJson } from '../../core/migrations';
import type { Exercice, Seance, Serie, Variante, Modele } from '../../core/types';

/** Réglages propres à l'appareil : ni exportés ni restaurés. */
export const REGLAGES_LOCAUX = new Set(['stockagePersistant', 'derniereSauvegarde', 'schemaVersion']);

export const TABLES = ['exercices', 'variantes', 'modeles', 'seances', 'series', 'reglages'] as const;
export type NomTable = (typeof TABLES)[number];

export async function construireExportJson(): Promise<ExportJson> {
  const [exercices, variantes, modeles, seances, series, reglages] = await Promise.all([
    db.exercices.toArray(),
    db.variantes.toArray(),
    db.modeles.toArray(),
    db.seances.toArray(),
    db.series.toArray(),
    db.reglages.toArray(),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exporteLe: maintenant(),
    donnees: {
      exercices,
      variantes,
      modeles,
      seances,
      series,
      reglages: reglages.filter((r) => !REGLAGES_LOCAUX.has(r.cle)),
    },
  };
}

/** Colonnes du CSV, dans l'ordre. Documentées dans README.md (même dossier). */
export const COLONNES_CSV = [
  'date',
  'heure',
  'seance',
  'exercice',
  'variante',
  'serie',
  'type_serie',
  'mode_charge',
  'poids_kg',
  'lest_kg',
  'reps',
  'rir',
  'poids_corps_kg',
  'charge_effective_kg',
  'un_rm_estime_kg',
  'temperature_c',
  'reglage_machine',
  'superset',
  'note_serie',
  'note_seance',
] as const;

function champCsv(v: string | number | undefined | null): string {
  if (v == null || v === '') return '';
  let s = typeof v === 'number' ? String(Math.round(v * 100) / 100) : v;
  // Neutralise les formules (=, +, -, @) à l'ouverture dans un tableur.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function lignesCsv(d: {
  exercices: Exercice[];
  variantes: Variante[];
  modeles: Modele[];
  seances: Seance[];
  series: Serie[];
}): string[][] {
  const exo = new Map(d.exercices.map((e) => [e.id, e]));
  const vari = new Map(d.variantes.map((v) => [v.id, v.nom]));
  const mod = new Map(d.modeles.map((m) => [m.id, m.nom]));
  const seanceParId = new Map(d.seances.map((s) => [s.id, s]));
  const seancesTriees = [...d.seances].sort((a, b) => a.debut.localeCompare(b.debut));
  const seriesParSeance = new Map<string, Serie[]>();
  for (const s of d.series) {
    if (!seanceParId.has(s.seanceId)) continue;
    (seriesParSeance.get(s.seanceId) ?? seriesParSeance.set(s.seanceId, []).get(s.seanceId)!).push(s);
  }
  const lignes: string[][] = [];
  for (const seance of seancesTriees) {
    const liste = (seriesParSeance.get(seance.id) ?? []).sort((a, b) => a.ordre - b.ordre);
    const compteur = new Map<string, number>();
    const pc = seance.contexte?.poidsCorporelKg;
    for (const s of liste) {
      const n = (compteur.get(s.exerciceId) ?? 0) + 1;
      compteur.set(s.exerciceId, n);
      const lest = s.modeCharge === 'lest';
      const valeurs: (string | number | undefined | null)[] = [
        s.faiteLe.slice(0, 10),
        s.faiteLe.slice(11, 16),
        seance.modeleId ? mod.get(seance.modeleId) ?? '' : 'Libre',
        exo.get(s.exerciceId)?.nom ?? '(exercice supprimé)',
        s.varianteId ? vari.get(s.varianteId) : '',
        n,
        s.type,
        s.modeCharge,
        lest ? null : s.chargeKg,
        lest ? s.chargeKg : null,
        s.reps,
        s.rir,
        pc,
        chargeEffective(s, pc),
        unRmEstime(s, pc),
        seance.contexte?.temperatureC,
        s.reglagesMachine,
        s.supersetId ? s.supersetId.slice(0, 8) : '',
        s.note,
        s === liste[0] ? seance.note : '', // note de séance sur sa 1re ligne
      ];
      lignes.push(valeurs.map(champCsv));
    }
  }
  return lignes;
}

export async function construireCsv(): Promise<string> {
  const [exercices, variantes, modeles, seances, series] = await Promise.all([
    db.exercices.toArray(),
    db.variantes.toArray(),
    db.modeles.toArray(),
    db.seances.toArray(),
    db.series.toArray(),
  ]);
  const lignes = [COLONNES_CSV.join(','), ...lignesCsv({ exercices, variantes, modeles, seances, series }).map((l) => l.join(','))];
  // BOM UTF-8 : accents corrects dans Excel / Numbers.
  return '﻿' + lignes.join('\r\n') + '\r\n';
}

const horodatageFichier = () => maintenant().slice(0, 16).replace('T', '_').replace(':', 'h');

/**
 * Feuille de partage iPhone si possible (Mail, Fichiers, AirDrop, ChatGPT…), sinon téléchargement.
 * Renvoie false si l'utilisateur a annulé le partage.
 */
export async function partagerOuTelecharger(contenu: string, nom: string, type: string): Promise<boolean> {
  const fichier = new File([contenu], nom, { type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false;
      // Autre échec (ex. permission) : on bascule sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export async function noterSauvegarde(): Promise<void> {
  await db.reglages.put({ cle: 'derniereSauvegarde', valeur: maintenant() });
}

export async function exporterJson(): Promise<boolean> {
  const exp = await construireExportJson();
  const ok = await partagerOuTelecharger(JSON.stringify(exp, null, 1), `gym-sauvegarde_${horodatageFichier()}.json`, 'application/json');
  if (ok) await noterSauvegarde();
  return ok;
}

export async function exporterCsv(): Promise<boolean> {
  const csv = await construireCsv();
  return partagerOuTelecharger(csv, `gym-series_${horodatageFichier()}.csv`, 'text/csv');
}
