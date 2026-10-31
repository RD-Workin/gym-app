# Gym App

Application de suivi de musculation pour iPhone : PWA installable, 100 % hors ligne, données uniquement sur le téléphone.

Adresse : https://rd-workin.github.io/gym-app/ (Safari → Partager → « Sur l'écran d'accueil »).

## Stack
Vite + TypeScript + Preact, Dexie (IndexedDB), vite-plugin-pwa (service worker). Routage par hash (`#/seance`).

## Développer
```sh
npm install
npm run dev      # serveur local
npm run build    # vérification des types + build dans dist/
```

## Organisation
| Dossier | Contenu |
|---|---|
| `src/core/` | stockage (`db.ts`), types du schéma, calculs (1RM…), routage, migrations |
| `src/ui/` | thème et composants partagés |
| `src/features/<domaine>/` | écrans par domaine (exercices, séance, modèles, progression, données) |
| `docs/modele-donnees.md` | modèle de données et règles de migration |

Chaque `push` sur `main` déploie sur GitHub Pages (`.github/workflows/deploy.yml`).
