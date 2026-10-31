import { correspond, lien, useChemin } from './core/router';
import { routes } from './core/routes';
import './app.css';

// Coquille minimale : 02-design remplacera la navigation et le style par les composants de src/ui/.
export function App() {
  const chemin = useChemin();
  let contenu = null;
  for (const r of routes) {
    const p = correspond(r.motif, chemin);
    if (p) {
      contenu = r.rendu(p);
      break;
    }
  }
  return (
    <>
      <main>{contenu ?? <p>Page introuvable. <a href={lien('/')}>Accueil</a></p>}</main>
      <nav>
        {routes
          .filter((r) => r.onglet)
          .map((r) => (
            <a key={r.motif} href={lien(r.motif)} aria-current={correspond(r.motif, chemin) ? 'page' : undefined}>
              {r.onglet}
            </a>
          ))}
      </nav>
    </>
  );
}
