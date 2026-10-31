import type { Plugin } from 'vite';

/**
 * Politique CSP (propriété de 07-sécurité).
 * Seules l'origine propre et l'API météo (Open-Meteo, gratuite, sans clé) sont autorisées.
 * Pas de CDN, pas d'analytics, pas de script inline.
 * Posée en <meta> au build seulement : le serveur de dev de Vite injecte des styles inline.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.open-meteo.com",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export function cspPlugin(): Plugin {
  return {
    name: 'gym-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ],
    },
  };
}
