# Sécurité et vie privée

Le code est public. Les données ne le sont jamais.

## Où sont les données
- Uniquement sur le téléphone (IndexedDB). Aucun serveur, aucun compte, aucun analytics, aucun CDN tiers.
- Seul appel réseau sortant autorisé : l'API météo Open-Meteo (`api.open-meteo.com`), avec une position arrondie et sans identifiant.
- Une politique CSP stricte (`securite/csp.ts`, posée au build) bloque tout autre domaine, tout script inline et tout `eval`.

## Risque de perte
- Supprimer l'icône de l'écran d'accueil ou les données de Safari **efface tout**.
- Le stockage persistant est demandé au lancement ; son état est visible dans Réglages.
- Seule vraie protection : exporter régulièrement (CSV + JSON) et garder le fichier ailleurs.

## Règles pour le code
- Pas de `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`.
- Import de fichier : taille limitée, JSON/CSV parsés puis validés champ par champ ; tout texte est affiché comme texte.
- Dépendances au minimum, versions figées (`.npmrc` : `save-exact`), mises à jour proposées par Dependabot sur `dev`.
- Aucun secret dans le dépôt.

## Signaler un problème
Utiliser « Report a vulnerability » (onglet Security du dépôt), sans y mettre de données personnelles.
