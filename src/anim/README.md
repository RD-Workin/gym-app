# src/anim : animations et dynamisme (propriétaire : 09-animations)

`import { celebrer, eclatSur, useCompteur } from '../../anim'`. Zéro dépendance, respecte « mouvement réduit », compatible CSP (pas de style inline).

| Outil | Usage |
|---|---|
| `TransitionEcran` | Entrée de chaque écran (glisse avant/arrière, fondu-zoom entre onglets). Branché dans `app.tsx`. |
| `celebrer()` | Pluie de confettis plein écran (record). |
| `eclat(x, y, opts)`, `eclatSur(el, opts)` | Gerbe d'étincelles depuis un point ou un élément (ex. série validée). |
| `useCompteur(valeur)` | Nombre qui défile jusqu'à sa valeur (1RM, volume, total). |
| `mouvementReduit()` | Vrai si l'iPhone demande moins d'animations. |

Classes CSS :

| Classe | Effet |
|---|---|
| `anim-cascade` | Sur un conteneur : les enfants apparaissent l'un après l'autre. |
| `anim-zoom` | Zoom d'apparition (médaille, chiffre clé). |
| `anim-pulse` | Rebond quand une valeur change (changer la `key` pour rejouer). |
| `anim-tremble` | Refus d'une saisie. |
| `anim-lueur-record` | Halo doré d'un record. |
| `anim-appui` | Retour visuel à l'appui (hors `Bouton`, qui l'a déjà). |
