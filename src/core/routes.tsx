import type { ComponentChildren } from 'preact';
import { EcranAccueil } from './ecrans/EcranAccueil';
import { EcranReglages } from './ecrans/EcranReglages';
import { EcranExercices } from '../features/exercices/EcranExercices';
import { EcranExercice } from '../features/exercices/EcranExercice';
import { EcranSeanceEnCours } from '../features/seance/EcranSeanceEnCours';
import { EcranSeance } from '../features/seance/EcranSeance';
import { EcranModeles } from '../features/modeles/EcranModeles';
import { EcranProgression } from '../features/progression/EcranProgression';
import { EcranDonnees } from '../features/donnees/EcranDonnees';

export interface DefRoute {
  motif: string;
  rendu: (p: Record<string, string>) => ComponentChildren;
  /** Présent = affiché dans la barre de navigation. */
  onglet?: string;
}

// Ajouter une route : une ligne ici, demander à 01.
export const routes: DefRoute[] = [
  { motif: '/', rendu: () => <EcranAccueil />, onglet: 'Accueil' },
  { motif: '/seance', rendu: () => <EcranSeanceEnCours />, onglet: 'Séance' },
  { motif: '/seance/:id', rendu: (p) => <EcranSeance id={p.id} /> },
  { motif: '/modeles', rendu: () => <EcranModeles /> },
  { motif: '/exercices', rendu: () => <EcranExercices />, onglet: 'Exercices' },
  { motif: '/exercices/:id', rendu: (p) => <EcranExercice id={p.id} /> },
  { motif: '/progression', rendu: () => <EcranProgression />, onglet: 'Progrès' },
  { motif: '/donnees', rendu: () => <EcranDonnees /> },
  { motif: '/reglages', rendu: () => <EcranReglages />, onglet: 'Réglages' },
];
