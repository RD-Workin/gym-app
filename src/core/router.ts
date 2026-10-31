import { useEffect, useState } from 'preact/hooks';

/**
 * Routage par hash (#/seance/123) : aucun 404 sur GitHub Pages, fonctionne hors ligne.
 * Une route = un motif avec des paramètres « :nom ».
 */
export interface Route {
  motif: string;
  titre: string;
}

export function lireChemin(): string {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

export function useChemin(): string {
  const [chemin, setChemin] = useState(lireChemin);
  useEffect(() => {
    const maj = () => setChemin(lireChemin());
    addEventListener('hashchange', maj);
    return () => removeEventListener('hashchange', maj);
  }, []);
  return chemin;
}

export function correspond(motif: string, chemin: string): Record<string, string> | null {
  const m = motif.split('/').filter(Boolean);
  const c = chemin.split('/').filter(Boolean);
  if (m.length !== c.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < m.length; i++) {
    if (m[i].startsWith(':')) params[m[i].slice(1)] = decodeURIComponent(c[i]);
    else if (m[i] !== c[i]) return null;
  }
  return params;
}

export const naviguer = (chemin: string) => {
  location.hash = chemin;
};

export const lien = (chemin: string) => `#${chemin}`;
