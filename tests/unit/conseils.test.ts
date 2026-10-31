import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE } from '../../src/data/bibliotheque';
import { CONSEILS_EXERCICES, CONSEILS_GROUPES } from '../../src/data/conseils';
import { GROUPES } from '../../src/data/groupes';

describe('conseils du coach', () => {
  it('couvre chaque exercice de départ et chaque groupe', () => {
    expect(BIBLIOTHEQUE.filter((x) => !CONSEILS_EXERCICES[x.nom]).map((x) => x.nom)).toEqual([]);
    expect(Object.keys(GROUPES).filter((g) => !(g in CONSEILS_GROUPES))).toEqual([]);
  });
});
