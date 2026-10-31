import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE, blocsDepart, MODELES_DEPART } from '../../src/data/bibliotheque';

describe('modèles de départ (03)', () => {
  const cles = new Set(BIBLIOTHEQUE.map((x) => x.cle));
  it.each(MODELES_DEPART.map((m) => [m.nom, m]))('%s : blocs non vides, exercices connus', (_, m) => {
    const blocs = blocsDepart(m);
    expect(blocs.length).toBeGreaterThan(0);
    for (const b of blocs) expect(cles.has(b.cle)).toBe(true);
  });
  it('contient un Full body', () => {
    expect(MODELES_DEPART.some((m) => m.nom === 'Full body')).toBe(true);
  });
});
