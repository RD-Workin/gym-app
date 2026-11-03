// Régularité : semaines d'affilée avec au moins une séance (la « flamme »).

/** Lundi 00:00 (heure locale) de la semaine de `d`. */
export function debutSemaine(d: Date): Date {
  const l = new Date(d);
  l.setHours(0, 0, 0, 0);
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/**
 * Nombre de semaines consécutives avec au moins une séance, en comptant la semaine en cours.
 * La semaine en cours sans séance ne casse pas la série (elle n'est pas finie) : on part alors de la précédente.
 */
export function semainesDAffilee(debuts: string[], maintenant = new Date()): number {
  const semaines = new Set(debuts.map((iso) => debutSemaine(new Date(iso)).getTime()));
  const s = debutSemaine(maintenant);
  if (!semaines.has(s.getTime())) s.setDate(s.getDate() - 7);
  let n = 0;
  while (semaines.has(s.getTime())) {
    n++;
    s.setDate(s.getDate() - 7);
  }
  return n;
}
