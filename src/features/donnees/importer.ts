// Import JSON (restauration) avec validation stricte. Propriétaire : 06-donnees. Relu par 07.
import { db, SCHEMA_VERSION } from '../../core/db';
import { migrerExport, type ExportJson } from '../../core/migrations';
import type { BlocModele, Contexte, Exercice, Modele, Reglage, Seance, Serie, Variante } from '../../core/types';
import { REGLAGES_LOCAUX, noterSauvegarde } from './exporter';

export const TAILLE_MAX_OCTETS = 50 * 1024 * 1024;
const MAX_LIGNES = 500_000;
const MAX_TEXTE = 2000;

export interface Apercu {
  exporteLe: string;
  schemaVersion: number;
  donnees: {
    exercices: Exercice[];
    variantes: Variante[];
    modeles: Modele[];
    seances: Seance[];
    series: Serie[];
    reglages: Reglage[];
  };
  premiereSeance?: string;
  derniereSeance?: string;
}

class ErreurImport extends Error {}

// ---- Validateurs : chaque objet est reconstruit champ par champ (aucun champ inconnu conservé). ----

type Obj = Record<string, unknown>;
const estObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function echec(ou: string, msg: string): never {
  throw new ErreurImport(`${ou} : ${msg}`);
}

function texte(o: Obj, cle: string, ou: string, requis: true): string;
function texte(o: Obj, cle: string, ou: string, requis?: false): string | undefined;
function texte(o: Obj, cle: string, ou: string, requis = false): string | undefined {
  const v = o[cle];
  if (v == null) return requis ? echec(ou, `« ${cle} » manquant`) : undefined;
  if (typeof v !== 'string') echec(ou, `« ${cle} » doit être un texte`);
  if (v.length > MAX_TEXTE) echec(ou, `« ${cle} » trop long`);
  if (requis && v.trim() === '') echec(ou, `« ${cle} » vide`);
  return v;
}

function nombre(o: Obj, cle: string, ou: string, min: number, max: number, requis = false): number | undefined {
  const v = o[cle];
  if (v == null) return requis ? echec(ou, `« ${cle} » manquant`) : undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) echec(ou, `« ${cle} » hors limites (${min} à ${max})`);
  return v;
}

function choix<T extends string>(o: Obj, cle: string, ou: string, valeurs: readonly T[]): T {
  const v = o[cle];
  if (typeof v !== 'string' || !(valeurs as readonly string[]).includes(v)) echec(ou, `« ${cle} » invalide`);
  return v as T;
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
function date(o: Obj, cle: string, ou: string, requis: true): string;
function date(o: Obj, cle: string, ou: string, requis?: false): string | undefined;
function date(o: Obj, cle: string, ou: string, requis = false): string | undefined {
  const v = requis ? texte(o, cle, ou, true) : texte(o, cle, ou);
  if (v != null && (!RE_ISO.test(v) || Number.isNaN(Date.parse(v)))) echec(ou, `« ${cle} » n'est pas une date ISO`);
  return v;
}

const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function id(o: Obj, cle: string, ou: string, requis: true): string;
function id(o: Obj, cle: string, ou: string, requis?: false): string | undefined;
function id(o: Obj, cle: string, ou: string, requis = false): string | undefined {
  const v = o[cle];
  if (v == null) return requis ? echec(ou, `« ${cle} » manquant`) : undefined;
  if (typeof v !== 'string' || !RE_ID.test(v)) echec(ou, `« ${cle} » n'est pas un identifiant valide`);
  return v;
}

function booleen(o: Obj, cle: string, ou: string): boolean {
  const v = o[cle] ?? false;
  if (typeof v !== 'boolean') echec(ou, `« ${cle} » doit être vrai/faux`);
  return v;
}

function horodatage(o: Obj, ou: string) {
  return { creeLe: date(o, 'creeLe', ou, true), modifieLe: date(o, 'modifieLe', ou, true) };
}

/** Retire les clés à valeur undefined (objets propres en base). */
function propre<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
}

const EQUIPEMENTS = ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'kettlebell', 'autre'] as const;
const MODES = ['total', 'par_main', 'lest', 'sans_charge'] as const;
const TYPES = ['travail', 'echauffement', 'degressive', 'echec'] as const;

function exercice(o: Obj, ou: string): Exercice {
  const g = o.groupesMusculaires ?? [];
  if (!Array.isArray(g) || g.length > 30 || g.some((x) => typeof x !== 'string' || x.length > 100)) echec(ou, '« groupesMusculaires » invalide');
  return propre({
    id: id(o, 'id', ou, true),
    nom: texte(o, 'nom', ou, true),
    equipement: choix(o, 'equipement', ou, EQUIPEMENTS),
    modeCharge: choix(o, 'modeCharge', ou, MODES),
    groupesMusculaires: [...(g as string[])],
    reglagesMachine: texte(o, 'reglagesMachine', ou),
    note: texte(o, 'note', ou),
    archive: booleen(o, 'archive', ou),
    ...horodatage(o, ou),
  });
}

function variante(o: Obj, ou: string): Variante {
  return propre({
    id: id(o, 'id', ou, true),
    exerciceId: id(o, 'exerciceId', ou, true),
    nom: texte(o, 'nom', ou, true),
    note: texte(o, 'note', ou),
    ...horodatage(o, ou),
  });
}

function bloc(o: unknown, ou: string): BlocModele {
  if (!estObj(o)) echec(ou, 'bloc invalide');
  return propre({
    id: id(o, 'id', ou, true),
    supersetId: id(o, 'supersetId', ou),
    exerciceId: id(o, 'exerciceId', ou, true),
    varianteId: id(o, 'varianteId', ou),
    seriesCibles: nombre(o, 'seriesCibles', ou, 0, 100),
    repsCibles: texte(o, 'repsCibles', ou),
    reposSec: nombre(o, 'reposSec', ou, 0, 3600),
    note: texte(o, 'note', ou),
  });
}

function modele(o: Obj, ou: string): Modele {
  if (!Array.isArray(o.blocs) || o.blocs.length > 200) echec(ou, '« blocs » invalide');
  return propre({
    id: id(o, 'id', ou, true),
    nom: texte(o, 'nom', ou, true),
    blocs: o.blocs.map((b, i) => bloc(b, `${ou}, bloc ${i + 1}`)),
    archive: booleen(o, 'archive', ou),
    ...horodatage(o, ou),
  });
}

function contexte(v: unknown, ou: string): Contexte {
  if (v == null) return {};
  if (!estObj(v)) echec(ou, '« contexte » invalide');
  const source = v.source == null ? undefined : choix(v, 'source', ou, ['auto', 'manuel'] as const);
  return propre({
    temperatureC: nombre(v, 'temperatureC', ou, -60, 70),
    source,
    lieu: texte(v, 'lieu', ou),
    poidsCorporelKg: nombre(v, 'poidsCorporelKg', ou, 20, 400),
  });
}

function seance(o: Obj, ou: string): Seance {
  return propre({
    id: id(o, 'id', ou, true),
    modeleId: id(o, 'modeleId', ou),
    debut: date(o, 'debut', ou, true),
    fin: date(o, 'fin', ou),
    contexte: contexte(o.contexte, ou),
    note: texte(o, 'note', ou),
    ...horodatage(o, ou),
  });
}

function serie(o: Obj, ou: string): Serie {
  return propre({
    id: id(o, 'id', ou, true),
    seanceId: id(o, 'seanceId', ou, true),
    exerciceId: id(o, 'exerciceId', ou, true),
    varianteId: id(o, 'varianteId', ou),
    ordre: nombre(o, 'ordre', ou, 0, 100_000, true)!,
    supersetId: id(o, 'supersetId', ou),
    chargeKg: nombre(o, 'chargeKg', ou, -500, 1000),
    modeCharge: choix(o, 'modeCharge', ou, MODES),
    reps: nombre(o, 'reps', ou, 0, 1000, true)!,
    rir: nombre(o, 'rir', ou, 0, 50),
    type: choix(o, 'type', ou, TYPES),
    reglagesMachine: texte(o, 'reglagesMachine', ou),
    note: texte(o, 'note', ou),
    faiteLe: date(o, 'faiteLe', ou, true),
    ...horodatage(o, ou),
  });
}

function reglage(o: Obj, ou: string): Reglage {
  const cle = texte(o, 'cle', ou, true);
  if (!/^[A-Za-z0-9_]{1,64}$/.test(cle)) echec(ou, '« cle » invalide');
  const v = o.valeur;
  // Valeurs simples uniquement : pas d'objet arbitraire en base.
  if (!(v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= MAX_TEXTE))) {
    echec(ou, '« valeur » doit être un texte, un nombre ou vrai/faux');
  }
  return { cle, valeur: v };
}

function table<T>(d: Obj, nom: string, libelle: string, f: (o: Obj, ou: string) => T): T[] {
  const v = d[nom] ?? [];
  if (!Array.isArray(v)) echec(nom, 'doit être une liste');
  if (v.length > MAX_LIGNES) echec(nom, 'trop de lignes');
  return v.map((o, i) => {
    const ou = `${libelle} n° ${i + 1}`;
    if (!estObj(o)) echec(ou, 'objet attendu');
    return f(o, ou);
  });
}

function unique(liste: { id: string }[], libelle: string) {
  const vus = new Set<string>();
  for (const o of liste) {
    if (vus.has(o.id)) echec(libelle, `identifiant en double (${o.id})`);
    vus.add(o.id);
  }
  return vus;
}

/** Lit et valide un fichier de sauvegarde. Lève une erreur lisible si le fichier est refusé. */
export async function lireSauvegarde(fichier: File): Promise<Apercu> {
  if (fichier.size > TAILLE_MAX_OCTETS) throw new ErreurImport('Fichier trop gros (50 Mo maximum).');
  let brut: unknown;
  try {
    brut = JSON.parse(await fichier.text());
  } catch {
    throw new ErreurImport("Ce fichier n'est pas une sauvegarde JSON valide.");
  }
  if (!estObj(brut) || !estObj(brut.donnees)) throw new ErreurImport("Ce fichier n'est pas une sauvegarde Gym App.");
  const v = brut.schemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new ErreurImport('Version de sauvegarde inconnue.');
  const ex = date(brut, 'exporteLe', 'Sauvegarde', true);
  const donneesBrutes = brut.donnees;
  for (const k of Object.keys(donneesBrutes)) if (!['exercices', 'variantes', 'modeles', 'seances', 'series', 'reglages'].includes(k)) throw new ErreurImport(`Table inconnue : ${k}`);

  const exp = migrerExport({ schemaVersion: v, exporteLe: ex, donnees: donneesBrutes as ExportJson['donnees'] });
  const d = exp.donnees as unknown as Obj;

  const donnees = {
    exercices: table(d, 'exercices', 'Exercice', exercice),
    variantes: table(d, 'variantes', 'Variante', variante),
    modeles: table(d, 'modeles', 'Modèle', modele),
    seances: table(d, 'seances', 'Séance', seance),
    series: table(d, 'series', 'Série', serie),
    reglages: table(d, 'reglages', 'Réglage', reglage).filter((r) => !REGLAGES_LOCAUX.has(r.cle)),
  };

  // Cohérence des liens (une sauvegarde abîmée ne doit pas casser l'app).
  const idsExo = unique(donnees.exercices, 'Exercices');
  const idsVar = unique(donnees.variantes, 'Variantes');
  const idsMod = unique(donnees.modeles, 'Modèles');
  const idsSea = unique(donnees.seances, 'Séances');
  unique(donnees.series, 'Séries');
  for (const x of donnees.variantes) if (!idsExo.has(x.exerciceId)) echec('Variante', `exercice introuvable (${x.exerciceId})`);
  for (const m of donnees.modeles)
    for (const b of m.blocs) {
      if (!idsExo.has(b.exerciceId)) echec(`Modèle « ${m.nom} »`, 'exercice introuvable');
      if (b.varianteId && !idsVar.has(b.varianteId)) echec(`Modèle « ${m.nom} »`, 'variante introuvable');
    }
  for (const s of donnees.seances) if (s.modeleId && !idsMod.has(s.modeleId)) delete s.modeleId; // modèle effacé : séance libre
  for (const s of donnees.series) {
    if (!idsSea.has(s.seanceId)) echec('Série', `séance introuvable (${s.seanceId})`);
    if (!idsExo.has(s.exerciceId)) echec('Série', `exercice introuvable (${s.exerciceId})`);
    if (s.varianteId && !idsVar.has(s.varianteId)) echec('Série', 'variante introuvable');
  }

  const debuts = donnees.seances.map((s) => s.debut).sort();
  return {
    exporteLe: ex,
    schemaVersion: v,
    donnees,
    premiereSeance: debuts[0],
    derniereSeance: debuts[debuts.length - 1],
  };
}

/** Remplace toutes les données de l'appareil par celles de l'aperçu (une seule transaction). */
export async function restaurer(a: Apercu): Promise<void> {
  if (a.schemaVersion > SCHEMA_VERSION) throw new ErreurImport('Sauvegarde trop récente.');
  const d = a.donnees;
  await db.transaction('rw', [db.exercices, db.variantes, db.modeles, db.seances, db.series, db.reglages], async () => {
    await Promise.all([db.exercices.clear(), db.variantes.clear(), db.modeles.clear(), db.seances.clear(), db.series.clear()]);
    const locaux = await db.reglages.where('cle').anyOf([...REGLAGES_LOCAUX]).toArray();
    await db.reglages.clear();
    await db.exercices.bulkAdd(d.exercices);
    await db.variantes.bulkAdd(d.variantes);
    await db.modeles.bulkAdd(d.modeles);
    await db.seances.bulkAdd(d.seances);
    await db.series.bulkAdd(d.series);
    await db.reglages.bulkPut([...d.reglages, ...locaux]);
  });
  // Les données restaurées existent dans un fichier : c'est une sauvegarde valable.
  await noterSauvegarde();
}
