import { describe, expect, it } from 'vitest';
import { bornesPeriode, dansPeriode, lignesCsv } from '../../src/features/donnees/exporter';

const auj = new Date(2026, 10, 3, 9, 0); // 3 novembre 2026, heure locale

describe('export CSV : période (06)', () => {
  it('choix rapides : derniers jours, aujourd’hui inclus', () => {
    expect(bornesPeriode('2s', {}, auj)).toEqual({ du: '2026-10-21', au: '2026-11-03' });
    expect(bornesPeriode('1m', {}, auj)).toEqual({ du: '2026-10-05', au: '2026-11-03' });
    expect(bornesPeriode('3m', {}, auj)).toEqual({ du: '2026-08-06', au: '2026-11-03' });
    expect(bornesPeriode('tout', {}, auj)).toEqual({});
  });
  it('dates libres : remises dans l’ordre, borne vide = sans limite', () => {
    expect(bornesPeriode('dates', { du: '2026-10-31', au: '2026-10-01' })).toEqual({ du: '2026-10-01', au: '2026-10-31' });
    expect(bornesPeriode('dates', { du: '2026-10-01' })).toEqual({ du: '2026-10-01', au: undefined });
  });
  it('bornes incluses, jour de la séance tel qu’enregistré', () => {
    const p = { du: '2026-10-01', au: '2026-10-31' };
    expect(dansPeriode('2026-10-01T07:00:00+02:00', p)).toBe(true);
    expect(dansPeriode('2026-10-31T23:30:00+01:00', p)).toBe(true);
    expect(dansPeriode('2026-11-01T00:10:00+01:00', p)).toBe(false);
    expect(dansPeriode('2026-09-30T20:00:00+02:00', p)).toBe(false);
  });
  it('le CSV ne garde que les séances de la période', () => {
    const exo = { id: 'e', nom: 'Leg press', equipement: 'machine', modeCharge: 'total', groupesMusculaires: [], archive: false } as never;
    const seance = (id: string, debut: string) => ({ id, debut, contexte: {} }) as never;
    const serie = (id: string, seanceId: string, faiteLe: string) =>
      ({ id, seanceId, exerciceId: 'e', ordre: 0, chargeKg: 100, modeCharge: 'total', reps: 10, type: 'travail', faiteLe }) as never;
    const d = {
      exercices: [exo],
      variantes: [],
      modeles: [],
      seances: [seance('a', '2026-09-28T18:00:00+02:00'), seance('b', '2026-10-15T18:00:00+02:00')],
      series: [serie('1', 'a', '2026-09-28T18:05:00+02:00'), serie('2', 'b', '2026-10-15T18:05:00+02:00')],
    };
    expect(lignesCsv(d).map((l) => l[0])).toEqual(['2026-09-28', '2026-10-15']);
    expect(lignesCsv(d, { du: '2026-10-01', au: '2026-10-31' }).map((l) => l[0])).toEqual(['2026-10-15']);
  });
});
