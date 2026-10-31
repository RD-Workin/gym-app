# Données : export, import, rappel (propriétaire : 06-donnees)

## Sauvegarde JSON
`gym-sauvegarde_AAAA-MM-JJ_HHhMM.json` = `{ schemaVersion, exporteLe, donnees: { exercices, variantes, modeles, seances, series, reglages } }`, format décrit dans `docs/modele-donnees.md`. C'est la seule sauvegarde restaurable.
Restauration : validation stricte (types, bornes, dates ISO, identifiants, liens entre tables, 50 Mo max), aperçu, puis remplacement complet en une transaction. Les réglages propres à l'appareil (`stockagePersistant`, `derniereSauvegarde`, `schemaVersion`) ne sont ni exportés ni écrasés.

## Tableau CSV (pour un coach ou une IA)
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

## Rappel
`<RappelSauvegarde />` (`rappel.tsx`) affiche une carte si des séries existent et que la dernière sauvegarde JSON date de 7 jours ou plus (ou n'existe pas). `useEtatSauvegarde()` donne l'état.
