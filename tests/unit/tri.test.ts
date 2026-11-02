import { describe, expect, it } from 'vitest';
import { passeFiltres, trierExercices } from '../../src/features/exercices/tri';

const ex = (id: string, nom: string, groupes: string[], favori?: boolean) => ({ id, nom, groupesMusculaires: groupes, favori, equipement: 'machine' as const });
const liste = [ex('a', 'Tirage vertical', ['dos']), ex('b', 'Curl barre', ['biceps'], true), ex('c', 'Écarté poulie', ['pectoraux']), ex('d', 'Abduction', ['abducteurs'])];

describe('tri des exercices (03)', () => {
  it('favoris en haut, puis par nom (accents ignorés)', () => {
    expect(trierExercices(liste, 'nom').map((e) => e.id)).toEqual(['b', 'd', 'c', 'a']);
  });
  it('derniers faits : plus récent en premier, jamais faits à la fin', () => {
    const derniers = new Map([
      ['a', '2026-11-01T10:00:00Z'],
      ['c', '2026-11-02T10:00:00Z'],
    ]);
    expect(trierExercices(liste, 'recent', derniers).map((e) => e.id)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('filtres favoris et muscle', () => {
    expect(liste.filter((e) => passeFiltres(e, { favoris: true })).map((e) => e.id)).toEqual(['b']);
    expect(liste.filter((e) => passeFiltres(e, { muscles: ['dos', 'pectoraux'] })).map((e) => e.id)).toEqual(['a', 'c']);
    expect(liste.filter((e) => passeFiltres(e, { equipement: 'barre' }))).toEqual([]);
  });
});
