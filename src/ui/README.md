# src/ui : design system (propriétaire : 02-design)

`import { Bouton, Carte, Stepper } from '../../ui'` : ne pas copier ces composants, demander une évolution à 02.

| Composant | Usage |
|---|---|
| `Coquille`, `BarreOnglets` | Mise en page d'écran, zones sûres iPhone, barre du bas (masquée en séance) |
| `Bouton` | `primaire` (une seule action par écran), `secondaire`, `contour`, `danger` ; tailles `geant` et `large` |
| `Stepper` | Saisie kg / reps, gros +/−, appui long, saisie directe |
| `Carte`, `Puce` | Tons : `progres` (vert), `alerte` (ambre), `record` (or), `mise-en-avant` |
| `Liste`, `ElementListe`, `Medaille` | Listes tactiles (≥ 56 px) |
| `Onglets` | Contrôle segmenté |
| `ToastRecord` | Célébration d'un record uniquement |
| `Icone` | Icônes trait 24 px |

Couleurs, polices et espacements : variables de `theme.css`. Maquettes de référence : `design/maquettes-v1.html`.
