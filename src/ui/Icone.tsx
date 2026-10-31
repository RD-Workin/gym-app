// Icônes en trait (24 × 24), dessinées pour l'app. Couleur = currentColor.
const traces = {
  accueil: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  seance: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  exercices: 'M4 6h16M4 12h16M4 18h10',
  progres: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  records: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  donnees: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  importer: 'M12 21V9M7 14l5-5 5 5M4 5h16',
  tableau: 'M4 4h16v16H4zM4 10h16M10 4v16',
  reglages:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  alerte: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  chevron: 'M9 6l6 6-6 6',
  retour: 'M15 6l-6 6 6 6',
  valider: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  meteo: 'M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z',
} as const;

export type NomIcone = keyof typeof traces | 'etoile';

export function Icone({ nom, titre }: { nom: NomIcone; titre?: string }) {
  const aria = titre ? { role: 'img' as const, 'aria-label': titre } : { 'aria-hidden': true as const };
  if (nom === 'etoile') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...aria}>
        <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" {...aria}>
      <path d={traces[nom]} />
    </svg>
  );
}
