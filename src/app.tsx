import { BarreOnglets, Coquille } from './ui';
import { correspond, lien, useChemin } from './core/router';
import { routes } from './core/routes';
import { seanceEnCours, useRequete } from './core/requetes';
import { TransitionEcran } from './anim';
import { BanniereMiseAJour } from './core/ecrans/MiseAJour';

export function App() {
  const chemin = useChemin();
  const enCours = useRequete(seanceEnCours);

  let contenu = null;
  for (const r of routes) {
    const p = correspond(r.motif, chemin);
    if (p) {
      contenu = r.rendu(p);
      break;
    }
  }

  // Barre masquée pendant une séance en cours (écrans /seance…).
  const masquerBarre = chemin.startsWith('/seance') && !!enCours;
  const barre = masquerBarre ? undefined : (
    <BarreOnglets
      onglets={routes
        .filter((r) => r.onglet && r.icone)
        .map((r) => ({
          href: lien(r.motif),
          libelle: r.onglet!,
          icone: r.icone!,
          actif: !!correspond(r.motif, chemin),
        }))}
    />
  );

  return (
    <Coquille barre={barre}>
      <BanniereMiseAJour />
      <TransitionEcran chemin={chemin}>
        {contenu ?? (
          <p>
            Page introuvable. <a href={lien('/')}>Accueil</a>
          </p>
        )}
      </TransitionEcran>
    </Coquille>
  );
}
