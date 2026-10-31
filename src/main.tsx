import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { demanderStockagePersistant } from './core/persistance';
import { amorcerBibliotheque } from './data/amorcage';

registerSW({ immediate: true });
void demanderStockagePersistant();
void amorcerBibliotheque(); // idempotent : bibliothèque + modèles dès le 1er lancement (03)

render(<App />, document.getElementById('app')!);
