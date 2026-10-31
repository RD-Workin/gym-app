// Types du schéma v1. Source de vérité : docs/modele-donnees.md (propriétaire : 01-architecture).

export type Id = string;
export type IsoDate = string;

export type Equipement = 'barre' | 'halteres' | 'machine' | 'poulie' | 'poids_du_corps' | 'kettlebell' | 'autre';
export type ModeCharge = 'total' | 'par_main' | 'lest' | 'sans_charge';
export type TypeSerie = 'travail' | 'echauffement' | 'degressive' | 'echec';

interface Horodatage {
  creeLe: IsoDate;
  modifieLe: IsoDate;
}

export interface Exercice extends Horodatage {
  id: Id;
  nom: string;
  equipement: Equipement;
  modeCharge: ModeCharge;
  groupesMusculaires: string[];
  reglagesMachine?: string;
  note?: string;
  archive: boolean;
}

export interface Variante extends Horodatage {
  id: Id;
  exerciceId: Id;
  nom: string;
  note?: string;
}

export interface BlocModele {
  id: Id;
  supersetId?: Id;
  exerciceId: Id;
  varianteId?: Id;
  seriesCibles?: number;
  repsCibles?: string;
  reposSec?: number;
  note?: string;
}

export interface Modele extends Horodatage {
  id: Id;
  nom: string;
  blocs: BlocModele[];
  archive: boolean;
}

export interface Contexte {
  temperatureC?: number;
  source?: 'auto' | 'manuel';
  lieu?: string;
  poidsCorporelKg?: number;
}

export interface Seance extends Horodatage {
  id: Id;
  modeleId?: Id;
  debut: IsoDate;
  fin?: IsoDate;
  contexte: Contexte;
  note?: string;
}

export interface Serie extends Horodatage {
  id: Id;
  seanceId: Id;
  exerciceId: Id;
  varianteId?: Id;
  ordre: number;
  supersetId?: Id;
  chargeKg?: number;
  modeCharge: ModeCharge;
  reps: number;
  rir?: number;
  type: TypeSerie;
  reglagesMachine?: string;
  note?: string;
  faiteLe: IsoDate;
}

export interface Reglage {
  cle: string;
  valeur: unknown;
}
