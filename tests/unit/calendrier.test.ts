import { describe, expect, it } from 'vitest';
import type { Serie } from '../../src/core/types';
import { joursDuMois, progresParSeance } from '../../src/features/progression/calculs';

let n = 0;
const s = (seanceId: string, exerciceId: string, chargeKg: number, reps: number, jour: string): Serie =>
  ({ id: `s${n++}`, seanceId, exerciceId, chargeKg, reps, type: 'travail', modeCharge: 'total', ordre: n, faiteLe: `${jour}T10:00:00Z` }) as Serie;

describe('progrès par séance', () => {
  const seances = new Map([
    ['a', { debut: '2026-11-01T10:00:00Z' }],
    ['b', { debut: '2026-11-03T10:00:00Z' }],
  ]);
  it('compare chaque exercice à la séance précédente, et compte les records', () => {
    const series = [s('a', 'dc', 80, 8, '2026-11-01'), s('a', 'sq', 100, 5, '2026-11-01'), s('b', 'dc', 82.5, 8, '2026-11-03'), s('b', 'sq', 95, 5, '2026-11-03'), s('b', 'curl', 12, 10, '2026-11-03')];
    const p = progresParSeance(series, seances, new Map());
    expect(p.get('a')).toMatchObject({ compares: 0, enHausse: 0, records: 0 });
    expect(p.get('b')).toMatchObject({ compares: 2, enHausse: 1, enBaisse: 1, records: 1 });
  });
});

describe('grille du mois', () => {
  it('commence le lundi et complète la dernière semaine', () => {
    const c = joursDuMois(2026, 10); // novembre 2026 : le 1er est un dimanche
    expect(c.slice(0, 7).map((d) => d?.getDate() ?? null)).toEqual([null, null, null, null, null, null, 1]);
    expect(c.length % 7).toBe(0);
    expect(c.filter(Boolean)).toHaveLength(30);
  });
});
