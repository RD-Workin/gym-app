# Modèle de données — v1

Propriétaire : 01-architecture. Toute évolution passe par 01 (nouvelle version + migration).
Code correspondant : `src/core/types.ts`, `src/core/db.ts`, `src/core/calculs.ts`.

## Principes
- Stockage : IndexedDB via Dexie, base `gym-app`. `navigator.storage.persist()` demandé au 1er lancement.
- Identifiants : `id` = chaîne UUID (`crypto.randomUUID()`), stable à l'export/import (fusion sans doublon).
- Dates : ISO 8601 (`2026-10-31T15:20:00+01:00`). Poids : toujours stockés en **kg** (nombre décimal). L'affichage gère l'unité.
- Chaque objet a `creeLe` et `modifieLe` (ISO). Suppression = `archive: true` pour les exercices et modèles (l'historique reste lisible) ; suppression réelle pour séances et séries.
- Le schéma porte une version entière `SCHEMA_VERSION` (départ : 1). Exports JSON : `{ schemaVersion, exporteLe, donnees: {...} }`.

## Tables (stores Dexie)

### `exercices`
| Champ | Type | Note |
|---|---|---|
| id | string | |
| nom | string | « Développé incliné haltères » |
| equipement | `'barre' \| 'halteres' \| 'machine' \| 'poulie' \| 'poids_du_corps' \| 'kettlebell' \| 'autre'` | |
| modeCharge | `'total' \| 'par_main' \| 'lest' \| 'sans_charge'` | défaut pour les séries ; `lest` = poids ajouté au poids du corps |
| groupesMusculaires | string[] | ex. `['pectoraux','triceps']` |
| reglagesMachine | string? | dernier réglage connu, ex. « chaise 4 » |
| note | string? | |
| archive | boolean | |
Index Dexie : `id, nom, equipement, *groupesMusculaires, archive`

### `variantes`
Variante d'un exercice (prise large, diamant…). Une série peut viser une variante ; les graphiques groupent par exercice, filtrables par variante.
| Champ | Type |
|---|---|
| id | string |
| exerciceId | string |
| nom | string (« prise large ») |
| note | string? |
Index : `id, exerciceId`

### `modeles` (modèle de séance : Push, Pull, Legs…)
| Champ | Type | Note |
|---|---|---|
| id | string | |
| nom | string | |
| blocs | `BlocModele[]` | ordre = ordre d'affichage |
| archive | boolean | |

`BlocModele` = `{ id, supersetId?, exerciceId, varianteId?, seriesCibles?, repsCibles?: string, reposSec?, note? }`
- `repsCibles` est un texte libre (« 8-10 », « max »).
- Deux blocs ou plus avec le même `supersetId` forment un superset (enchaînés sans repos).
Index : `id, nom, archive`

### `seances` (une séance réalisée)
| Champ | Type | Note |
|---|---|---|
| id | string | |
| modeleId | string? | null si séance libre |
| debut | ISO | |
| fin | ISO? | null = séance en cours |
| contexte | `Contexte` | |
| note | string? | ressenti général |

`Contexte` = `{ temperatureC?: number, source?: 'auto' \| 'manuel', lieu?: string, poidsCorporelKg?: number }`
- La date vient de `debut`. Température : saisie manuelle ou API météo gratuite sans clé (choix laissé à 04, revu par 07).
- `poidsCorporelKg` sert au calcul des exercices au poids du corps et lestés.
Index : `id, debut, modeleId`

### `series` (une série réalisée)
| Champ | Type | Note |
|---|---|---|
| id | string | |
| seanceId | string | |
| exerciceId | string | |
| varianteId | string? | |
| ordre | number | ordre global dans la séance |
| supersetId | string? | même valeur pour les séries enchaînées |
| chargeKg | number? | **propre à chaque série** ; pour `lest`, c'est le lest seul |
| modeCharge | `'total' \| 'par_main' \| 'lest' \| 'sans_charge'` | copié de l'exercice, modifiable |
| reps | number | |
| rir | number? | répétitions en réserve (optionnel) |
| type | `'travail' \| 'echauffement' \| 'degressive' \| 'echec'` | défaut `travail` |
| reglagesMachine | string? | si différent du réglage par défaut |
| note | string? | |
| faiteLe | ISO | |
Index : `id, seanceId, exerciceId, [exerciceId+faiteLe]`

### `reglages` (clé-valeur, une seule ligne par clé)
`{ cle: string, valeur: unknown }` — ex. `unite: 'kg'`, `formule1RM: 'epley'`, `derniereSauvegarde: ISO`, `stockagePersistant: boolean`, `schemaVersion: number`.

## Règles de calcul (partagées, dans `src/core/calculs.ts`)
- **Charge effective** d'une série :
  - `total` → `chargeKg`
  - `par_main` → `chargeKg × 2`
  - `lest` → `poidsCorporelKg + chargeKg` (si poids corporel inconnu : `chargeKg`, et le graphique le signale)
  - `sans_charge` → `poidsCorporelKg` ou 0
- **1RM estimé** : Epley `charge × (1 + reps/30)` pour reps ≤ 12 ; au-delà, non calculé. Séries `echauffement` exclues.
- **Record** : max de la charge effective, du 1RM estimé et du volume (charge × reps) par exercice.

## Données de départ
`exercices-actuels.csv` → importé une fois par 03 (bibliothèque + 3 modèles Push/Pull/Legs). Les reps « 9-8-8-7 » deviennent 4 séries d'une séance d'amorçage datée du jour de l'import (option, choix de 03).

## Migrations
- Dexie : `db.version(n).stores({...}).upgrade(tx => ...)`. Jamais modifier une version publiée, toujours en ajouter une.
- Un import JSON d'une version plus ancienne passe par les mêmes fonctions de migration (`src/core/migrations.ts`).
- Chaque version est listée ci-dessous.

| Version | Date | Changement |
|---|---|---|
| 1 | 2026-10-31 | Schéma initial |
