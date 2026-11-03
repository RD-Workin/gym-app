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

## Dynamisme v2 (2026-11-03)

| Outil | Usage |
|---|---|
| `vibrer(motif)` | Retour haptique (Android : vibrate ; iPhone Safari 18+ : interrupteur natif caché). |
| `bulle(el, texte, ton)` | Texte qui s'envole d'un bouton (« +2,5 kg vs la dernière fois »). |
| `flash(ton)` | Halo plein écran bref (record doré, objectif vert). |
| `ecraser(el)`, `rouler(el, sens)`, `sauter(el)` | Micro-rebonds en Web Animations API (bouton validé, chiffre du stepper, pastille). |
| `feuArtifice(salves)` | Salves de particules (objectif atteint, bilan avec records). |
| `braisesSur(el)` | Braises qui montent (exercice bouclé). |
| `<Anneau valeur max>` | Anneau qui se remplit, doré une fois bouclé (accueil : séances de la semaine). |
| `<Flamme allumee>` | Flamme de régularité. `semainesDAffilee(debuts)` donne le compte. |

Classes : `anim-tampon` (ligne qui s'imprime), `anim-coche trace` (coche qui se dessine), `anim-reflet` (reflet qui balaie un bouton), `anim-respire`, `anim-bat`, `anim-entree-titre`, `anim-medaille-tourne`.

Particules : formes `etincelle`, `confetti`, `etoile`, `braise`, option `onde` (anneau de choc). Pas de temps normalisé (même vitesse à 60 et 120 Hz), 420 particules max.
