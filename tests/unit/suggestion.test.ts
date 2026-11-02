import { describe, expect, it } from 'vitest';
import type { PointSeance } from '../../src/features/progression/calculs';
import { arrondirAuPas, chargePourReps, depuisDerniereFois, maxProjete, resumeLignes, suggererCharge, unRmRecent, versChargeNotee } from '../../src/features/saisie/suggestion';

const pt = (date: string, unRm: number | null): PointSeance => ({ seanceId: date, date, unRm, chargeMax: null, volume: 0, poidsInconnu: false, series: [] });

describe('suggestion de charge', () => {
  it('inverse Epley', () => {
    expect(chargePourReps(100 * (1 + 10 / 30), 10)).toBeCloseTo(100);
    expect(chargePourReps(120, 1)).toBe(120);
  });
  it('convertit selon le mode de charge', () => {
    expect(versChargeNotee(40, 'par_main')).toBe(20);
    expect(versChargeNotee(100, 'lest', 80)).toBe(20);
    expect(versChargeNotee(70, 'lest', 80)).toBe(0);
    expect(arrondirAuPas(71.2, 2.5)).toBe(70);
  });
  it('1RM récent = meilleur des 3 dernières séances', () => {
    expect(unRmRecent([pt('2026-01-01', 150), pt('2026-02-01', 100), pt('2026-03-01', 110), pt('2026-04-01', null)])).toBe(110);
    expect(unRmRecent([])).toBeNull();
  });
  it('avec historique : charge équivalente et un cran à tester', () => {
    const s = suggererCharge({ points: [pt('2026-10-01', 100)], reps: 10, mode: 'total', pas: 2.5 })!;
    expect(s.source).toBe('historique');
    expect(s.solide).toBe(75);
    expect(s.chargeKg).toBe(77.5);
  });
  it('sans historique : estimation prudente depuis la force générale', () => {
    const s = suggererCharge({ points: [], reps: 10, mode: 'total', pas: 2.5, autres: [{ unRm: 100, memeEquipement: true }, { unRm: 300, memeEquipement: false }] })!;
    expect(s.source).toBe('force_generale');
    expect(s.chargeKg).toBe(52.5); // 100 × 0,7 / 1,333
  });
  it('rien à proposer sans charge ni données', () => {
    expect(suggererCharge({ points: [], reps: 10, mode: 'total', pas: 2.5 })).toBeNull();
    expect(suggererCharge({ points: [pt('2026-10-01', 100)], reps: 10, mode: 'sans_charge', pas: 1 })).toBeNull();
  });
  it('max projeté prolonge une progression, borné à +10 %', () => {
    const now = new Date('2026-11-01');
    const pts = [pt('2026-10-04', 100), pt('2026-10-11', 102), pt('2026-10-18', 104), pt('2026-10-25', 106)];
    expect(maxProjete(pts, now)).toBeCloseTo(106 + 2 * 4);
    expect(maxProjete([pt('2026-10-04', 110), pt('2026-10-11', 100), pt('2026-10-18', 100)], now)).toBe(110);
  });
  it('préremplit depuis la dernière fois', () => {
    expect(depuisDerniereFois([{ reps: 10, chargeKg: 28 }, { reps: 9, chargeKg: 26 }])).toEqual([{ reps: 10, chargeKg: 28 }, { reps: 9, chargeKg: 26 }]);
    expect(depuisDerniereFois([])).toBeNull();
  });
  it('résume des séries à charges différentes', () => {
    expect(resumeLignes([{ reps: 10, chargeKg: 28 }, { reps: 8, chargeKg: 28 }, { reps: 9, chargeKg: 26 }], 'kg/main')).toBe('28 kg/main · 10-8 / 26 kg/main · 9');
    expect(resumeLignes([{ reps: 12 }, { reps: 10 }])).toBe('12-10');
  });
});
