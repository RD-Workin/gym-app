import { render } from 'preact';
import { App } from './app';
import { demanderStockagePersistant } from './core/persistance';
import { demarrerMiseAJour } from './core/miseAJour';
import { amorcerBibliotheque } from './data/amorcage';

demarrerMiseAJour();
void demanderStockagePersistant();
void amorcerBibliotheque(); // idempotent : bibliothèque + modèles dès le 1er lancement (03)

render(<App />, document.getElementById('app')!);
