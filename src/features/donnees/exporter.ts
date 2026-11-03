// Export JSON (sauvegarde fidèle) et CSV (lecture coach / IA). Propriétaire : 06-donnees.
import { db, SCHEMA_VERSION } from '../../core/db';
import { chargeEffective, unRmEstime } from '../../core/calculs';
import { maintenant } from '../../core/ids';
import type { ExportJson } from '../../core/migrations';
import type { Exercice, Objectif, Seance, Serie, Variante, Modele } from '../../core/types';
import { poidsParSeance } from '../progression/calculs';
import { evaluerObjectif, NOM_MESURE } from '../objectifs/calculs';

/** Réglages propres à l'appareil : ni exportés ni restaurés. */
export const REGLAGES_LOCAUX = new Set(['stockagePersistant', 'derniereSauvegarde', 'schemaVersion']);

export const TABLES = ['exercices', 'variantes', 'modeles', 'seances', 'series', 'reglages', 'objectifs'] as const;
export type NomTable = (typeof TABLES)[number];

export async function construireExportJson(): Promise<ExportJson> {
  const [exercices, variantes, modeles, seances, series, reglages, objectifs] = await Promise.all([
    db.exercices.toArray(),
    db.variantes.toArray(),
    db.modeles.toArray(),
    db.seances.toArray(),
    db.series.toArray(),
    db.reglages.toArray(),
    db.objectifs.toArray(),
  ]);
  const exercicesJson = await Promise.all(
    exercices.map(async (e) => (e.photo ? { ...e, photo: await blobVersDataUrl(e.photo) } : e)),
  );
  return {
    schemaVersion: SCHEMA_VERSION,
    exporteLe: maintenant(),
    donnees: {
      exercices: exercicesJson,
      variantes,
      modeles,
      seances,
      series,
      reglages: reglages.filter((r) => !REGLAGES_LOCAUX.has(r.cle)),
      objectifs,
    },
  };
}

/** Photo (Blob) → `data:image/jpeg;base64,…` pour le JSON. */
export function blobVersDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
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
  'objectif',
  'objectif_cible',
  'objectif_actuel',
  'objectif_reste',
  'objectif_date_visee',
  'objectif_date_estimee',
] as const;

function champCsv(v: string | number | undefined | null): string {
  if (v == null || v === '') return '';
  let s = typeof v === 'number' ? String(Math.round(v * 100) / 100) : v;
  // Neutralise les formules (=, +, -, @) à l'ouverture dans un tableur.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Période d'export : jours AAAA-MM-JJ inclus ; une borne absente = pas de limite de ce côté. */
export interface Periode {
  du?: string;
  au?: string;
}
export type ChoixPeriode = '2s' | '1m' | '3m' | 'tout' | 'dates';

const jourLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bornes d'un choix : 14, 30 ou 90 derniers jours (aujourd'hui inclus), tout, ou dates libres (remises dans l'ordre). */
export function bornesPeriode(choix: ChoixPeriode, dates: Periode = {}, aujourdhui = new Date()): Periode {
  const jours: Partial<Record<ChoixPeriode, number>> = { '2s': 14, '1m': 30, '3m': 90 };
  const n = jours[choix];
  if (n) {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() - (n - 1));
    return { du: jourLocal(d), au: jourLocal(aujourdhui) };
  }
  if (choix === 'tout') return {};
  const du = dates.du || undefined;
  const au = dates.au || undefined;
  return du && au && du > au ? { du: au, au: du } : { du, au };
}

/** Le jour de la séance (tel qu'enregistré, heure locale) est-il dans la période ? */
export function dansPeriode(debut: string, p: Periode): boolean {
  const jour = debut.slice(0, 10);
  return (!p.du || jour >= p.du) && (!p.au || jour <= p.au);
}

export function lignesCsv(d: {
  exercices: Exercice[];
  variantes: Variante[];
  modeles: Modele[];
  seances: Seance[];
  series: Serie[];
  objectifs?: Objectif[];
}, periode: Periode = {}, aujourdhui = new Date()): string[][] {
  const exo = new Map(d.exercices.map((e) => [e.id, e]));
  const vari = new Map(d.variantes.map((v) => [v.id, v.nom]));
  const mod = new Map(d.modeles.map((m) => [m.id, m.nom]));
  const seanceParId = new Map(d.seances.map((s) => [s.id, s]));
  const seancesTriees = d.seances.filter((s) => dansPeriode(s.debut, periode)).sort((a, b) => a.debut.localeCompare(b.debut));
  const seriesParSeance = new Map<string, Serie[]>();
  for (const s of d.series) {
    if (!seanceParId.has(s.seanceId)) continue;
    (seriesParSeance.get(s.seanceId) ?? seriesParSeance.set(s.seanceId, []).get(s.seanceId)!).push(s);
  }
  // Objectif de chaque exercice, état à la date de l'export (mêmes valeurs sur toutes ses lignes).
  const poids = poidsParSeance(d.seances);
  const colonnesObjectif = new Map<string, (string | number | undefined | null)[]>();
  for (const o of d.objectifs ?? []) {
    const { etat } = evaluerObjectif(o, { series: d.series, seancesParId: seanceParId, poids }, aujourdhui);
    colonnesObjectif.set(o.exerciceId, [
      NOM_MESURE[o.mesure],
      o.cible,
      etat.actuel,
      etat.actuel == null ? null : etat.reste,
      o.echeance,
      etat.atteint ? 'atteint' : etat.projection,
    ]);
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
        ...(colonnesObjectif.get(s.exerciceId) ?? ['', '', '', '', '', '']),
      ];
      lignes.push(valeurs.map(champCsv));
    }
  }
  return lignes;
}

export async function construireCsv(periode: Periode = {}): Promise<string> {
  const [exercices, variantes, modeles, seances, series, objectifs] = await Promise.all([
    db.exercices.toArray(),
    db.variantes.toArray(),
    db.modeles.toArray(),
    db.seances.toArray(),
    db.series.toArray(),
    db.objectifs.toArray(),
  ]);
  const lignes = [COLONNES_CSV.join(','), ...lignesCsv({ exercices, variantes, modeles, seances, series, objectifs }, periode).map((l) => l.join(','))];
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

/** Nombre de séances et de séries dans la période (aperçu avant export). */
export async function compterPeriode(periode: Periode): Promise<{ seances: number; series: number }> {
  const ids = (await db.seances.toArray()).filter((s) => dansPeriode(s.debut, periode)).map((s) => s.id);
  const series = ids.length ? await db.series.where('seanceId').anyOf(ids).count() : 0;
  return { seances: ids.length, series };
}

/** Résumé texte de la période (voir resume.ts), calculé à l'avance pour que la copie reste dans le geste de l'utilisateur (Safari). */
export async function construireResumePeriode(periode: Periode): Promise<string> {
  const { construireResume } = await import('./resume');
  const [exercices, variantes, modeles, seances, series, objectifs] = await Promise.all([
    db.exercices.toArray(),
    db.variantes.toArray(),
    db.modeles.toArray(),
    db.seances.toArray(),
    db.series.toArray(),
    db.objectifs.toArray(),
  ]);
  return construireResume({ exercices, variantes, modeles, seances, series, objectifs }, periode);
}

/** Copie le résumé ; si le presse-papier est refusé, le partage ou le télécharge en .txt. */
export async function copierResume(texte: string): Promise<'copie' | 'partage' | 'annule'> {
  try {
    await navigator.clipboard.writeText(texte);
    return 'copie';
  } catch {
    return (await partagerOuTelecharger(texte, `gym-resume_${horodatageFichier()}.txt`, 'text/plain')) ? 'partage' : 'annule';
  }
}

export async function exporterCsv(periode: Periode = {}): Promise<boolean> {
  const csv = await construireCsv(periode);
  const suffixe = periode.du || periode.au ? `_${periode.du ?? 'debut'}_au_${periode.au ?? 'fin'}` : '';
  return partagerOuTelecharger(csv, `gym-series${suffixe}_${horodatageFichier()}.csv`, 'text/csv');
}
