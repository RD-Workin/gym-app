import type { ComponentChildren } from 'preact';
import { Icone, type NomIcone } from './Icone';

export interface OngletNav {
  href: string;
  libelle: string;
  icone: NomIcone;
  actif: boolean;
}

/** Barre d'onglets du bas. Masquée pendant une séance : ne pas la passer à Coquille. */
export function BarreOnglets({ onglets }: { onglets: OngletNav[] }) {
  return (
    <nav class="ui-barre-onglets" aria-label="Navigation principale">
      {onglets.map((o) => (
        <a key={o.href} href={o.href} aria-current={o.actif ? 'page' : undefined}>
          <Icone nom={o.icone} />
          {o.libelle}
        </a>
      ))}
    </nav>
  );
}

/** Mise en page d'un écran : zones sûres iPhone (encoche, barre d'accueil) et place de la barre d'onglets. */
export function Coquille({ barre, children }: { barre?: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class={`ui-coquille${barre ? ' avec-barre' : ''}`}>
      <main class="ui-coquille-contenu">{children}</main>
      {barre}
    </div>
  );
}
