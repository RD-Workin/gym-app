import type { ComponentChildren } from 'preact';
import type { NomIcone } from '../ui';
import { EcranAccueil } from './ecrans/EcranAccueil';
import { EcranReglages } from './ecrans/EcranReglages';
import { paresseux } from './paresseux';

// Écrans des features chargés à la demande (seul l'accueil est dans le bundle principal).
const EcranExercices = paresseux(() => import('../features/exercices/EcranExercices').then((m) => m.EcranExercices));
const EcranExercice = paresseux(() => import('../features/exercices/EcranExercice').then((m) => m.EcranExercice));
const EcranSeanceEnCours = paresseux(() => import('../features/seance/EcranSeanceEnCours').then((m) => m.EcranSeanceEnCours));
const EcranApercu = paresseux(() => import('../features/seance/EcranApercu').then((m) => m.EcranApercu));
const EcranSeance = paresseux(() => import('../features/seance/EcranSeance').then((m) => m.EcranSeance));
const EcranModeles = paresseux(() => import('../features/modeles/EcranModeles').then((m) => m.EcranModeles));
const EcranComposer = paresseux(() => import('../features/modeles/EcranComposer').then((m) => m.EcranComposer));
const EcranProgression = paresseux(() => import('../features/progression/EcranProgression').then((m) => m.EcranProgression));
const EcranDonnees = paresseux(() => import('../features/donnees/EcranDonnees').then((m) => m.EcranDonnees));

export interface DefRoute {
  motif: string;
  rendu: (p: Record<string, string>) => ComponentChildren;
  /** Présent = affiché dans la barre de navigation. */
  onglet?: string;
  /** Obligatoire si `onglet` est présent. */
  icone?: NomIcone;
}

// Ajouter une route : une ligne ici, demander à 01.
export const routes: DefRoute[] = [
  { motif: '/', rendu: () => <EcranAccueil />, onglet: 'Accueil', icone: 'accueil' },
  { motif: '/seance', rendu: () => <EcranSeanceEnCours />, onglet: 'Séance', icone: 'seance' },
  { motif: '/seance/apercu/:id', rendu: (p) => <EcranApercu id={p.id} /> },
  { motif: '/seance/:id', rendu: (p) => <EcranSeance id={p.id} /> },
  { motif: '/modeles', rendu: () => <EcranModeles /> },
  { motif: '/modeles/composer', rendu: () => <EcranComposer /> },
  { motif: '/modeles/:id', rendu: (p) => <EcranModeles id={p.id} /> },
  { motif: '/exercices', rendu: () => <EcranExercices />, onglet: 'Exercices', icone: 'exercices' },
  { motif: '/exercices/:id', rendu: (p) => <EcranExercice id={p.id} /> },
  { motif: '/progression', rendu: () => <EcranProgression />, onglet: 'Progrès', icone: 'progres' },
  { motif: '/donnees', rendu: () => <EcranDonnees /> },
  { motif: '/reglages', rendu: () => <EcranReglages />, onglet: 'Réglages', icone: 'reglages' },
];
