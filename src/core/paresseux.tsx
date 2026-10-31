import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/**
 * Charge un écran à la demande (code splitting) : l'accueil démarre vite sur iPhone.
 * Les morceaux restent précachés par le service worker, donc disponibles hors ligne.
 */
export function paresseux<P extends object>(charger: () => Promise<ComponentType<P>>): ComponentType<P> {
  let cache: ComponentType<P> | undefined;
  let promesse: Promise<ComponentType<P>> | undefined;
  const obtenir = () => (promesse ??= charger().then((c) => (cache = c)));
  function Paresseux(props: P) {
    const [C, setC] = useState(() => cache);
    useEffect(() => {
      if (!C) void obtenir().then((c) => setC(() => c));
    }, []);
    return C ? <C {...props} /> : null;
  }
  return Paresseux;
}
