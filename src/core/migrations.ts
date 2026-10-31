import { SCHEMA_VERSION } from './db';

/**
 * Migre un export JSON d'une ancienne version vers SCHEMA_VERSION.
 * Ajouter une étape par nouvelle version, dans l'ordre. Utilisé par l'import (06).
 */
export interface ExportJson {
  schemaVersion: number;
  exporteLe: string;
  donnees: Record<string, unknown[]>;
}

const etapes: Record<number, (d: ExportJson['donnees']) => ExportJson['donnees']> = {
  // 2: (d) => ({ ...d, ... }),
};

export function migrerExport(exp: ExportJson): ExportJson {
  if (exp.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Export créé par une version plus récente de l'app (schéma ${exp.schemaVersion}). Mets l'app à jour.`);
  }
  let donnees = exp.donnees;
  for (let v = exp.schemaVersion + 1; v <= SCHEMA_VERSION; v++) {
    const etape = etapes[v];
    if (etape) donnees = etape(donnees);
  }
  return { ...exp, schemaVersion: SCHEMA_VERSION, donnees };
}
