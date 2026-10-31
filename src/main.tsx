import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { demanderStockagePersistant } from './core/persistance';

registerSW({ immediate: true });
void demanderStockagePersistant();

render(<App />, document.getElementById('app')!);
