# Données : export, import, rappel (propriétaire : 06-donnees)

## Sauvegarde JSON
`gym-sauvegarde_AAAA-MM-JJ_HHhMM.json` = `{ schemaVersion, exporteLe, donnees: { exercices, variantes, modeles, seances, series, reglages } }`, format décrit dans `docs/modele-donnees.md`. C'est la seule sauvegarde restaurable.
Photos d'exercices (schéma v2) : encodées en `data:image/jpeg;base64,…` dans le JSON (JPEG, PNG ou WebP acceptés à l'import, ~6 Mo max par photo), absentes du CSV.
Restauration : validation stricte (types, bornes, dates ISO, identifiants, liens entre tables, 50 Mo max), aperçu, puis remplacement complet en une transaction. Les réglages propres à l'appareil (`stockagePersistant`, `derniereSauvegarde`, `schemaVersion`) ne sont ni exportés ni écrasés.

## Tableau CSV (pour un coach ou une IA)
Période au choix avant l'export : 2 semaines, 30 jours, 3 mois (jours glissants, aujourd'hui inclus), tout, ou dates libres (bornes incluses, jour de début de séance). Le nombre de séances et séries est affiché avant l'export ; le nom du fichier porte la période (`gym-series_2026-10-05_au_2026-11-03_….csv`).

`gym-series_….csv` : UTF-8, séparateur virgule, décimales avec un point, une ligne par série, triée par date.

| Colonne | Sens |
|---|---|
| date, heure | jour (AAAA-MM-JJ) et heure de la série |
| seance | nom du modèle (Push, Pull…) ou « Libre » |
| exercice, variante | nom de l'exercice et de la variante éventuelle |
| serie | n° de la série pour cet exercice dans la séance (1, 2, 3…) |
| type_serie | travail, echauffement, degressive, echec |
| mode_charge | total (barre/machine), par_main (poids d'un haltère), lest (poids ajouté au corps), sans_charge |
| poids_kg | charge saisie (vide si lest) |
| lest_kg | lest ajouté au poids du corps (mode lest) |
| reps | répétitions faites |
| rir | répétitions en réserve (vide si non noté) |
| poids_corps_kg | poids de corps du jour |
| charge_effective_kg | charge réellement déplacée (par_main × 2, lest + poids de corps) |
| un_rm_estime_kg | 1RM estimé (Epley, ≤ 12 reps, hors échauffement) |
| temperature_c | température de la séance |
| reglage_machine | réglage noté (siège, poulie…) |
| superset | même code = séries enchaînées |
| note_serie, note_seance | notes libres (la note de séance est sur la 1re ligne de la séance) |

Les textes commençant par `= + - @` sont préfixés d'une apostrophe (pas de formule à l'ouverture dans un tableur).

## Résumé texte (pour une IA ou un coach)
« Copier le résumé pour l'IA » (`resume.ts`, même période que le CSV) copie un texte Markdown : vue d'ensemble (séances par modèle, fréquence par semaine, séries de travail, poids de corps à la 1re et à la dernière pesée), puis par exercice le nombre de séances et de séries, la 1re et la dernière fois, l'évolution (1RM estimé, charge ou lest max tel que saisi, reps max, volume de la séance) et la meilleure séance si elle est entre les deux, puis le détail séance par séance et une question pour l'IA. Le texte est calculé à l'avance pour que la copie reste dans le geste (Safari) ; si le presse-papier est refusé, il est partagé en `.txt`.

## Rappel
`<RappelSauvegarde />` (`rappel.tsx`) affiche une carte si des séries existent et que la dernière sauvegarde JSON date de 7 jours ou plus (ou n'existe pas). `useEtatSauvegarde()` donne l'état.
