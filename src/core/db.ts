import Dexie, { type EntityTable } from 'dexie';
import type { Exercice, Modele, Objectif, Reglage, Seance, Serie, Variante } from './types';

export const SCHEMA_VERSION = 3;

export class GymDb extends Dexie {
  exercices!: EntityTable<Exercice, 'id'>;
  variantes!: EntityTable<Variante, 'id'>;
  modeles!: EntityTable<Modele, 'id'>;
  seances!: EntityTable<Seance, 'id'>;
  series!: EntityTable<Serie, 'id'>;
  reglages!: EntityTable<Reglage, 'cle'>;
  objectifs!: EntityTable<Objectif, 'id'>;

  constructor() {
    super('gym-app');
    // Ne jamais modifier une version publiée : ajouter db.version(n + 1) avec .upgrade().
    // Voir docs/modele-donnees.md, section Migrations.
    this.version(1).stores({
      exercices: 'id, nom, equipement, *groupesMusculaires, archive',
      variantes: 'id, exerciceId',
      modeles: 'id, nom, archive',
      seances: 'id, debut, modeleId',
      series: 'id, seanceId, exerciceId, [exerciceId+faiteLe]',
      reglages: 'cle',
    });
    // v2 : champ optionnel exercices.photo (Blob, non indexé). Aucune donnée à transformer.
    this.version(2).stores({});
    // v3 : table objectifs (un objectif chiffré par exercice). Nouvelle table vide, rien à transformer.
    this.version(3).stores({ objectifs: 'id, exerciceId' });
  }
}

export const db = new GymDb();
