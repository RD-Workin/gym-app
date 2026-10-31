import { describe, expect, it } from 'vitest';
import { chargeEffective, unRmEstime, volume } from '../../src/core/calculs';

describe('chargeEffective', () => {
  it('total : charge telle quelle', () => {
    expect(chargeEffective({ chargeKg: 80, modeCharge: 'total' })).toBe(80);
    expect(chargeEffective({ modeCharge: 'total' })).toBeNull();
  });
  it('par main : charge doublée', () => {
    expect(chargeEffective({ chargeKg: 20, modeCharge: 'par_main' })).toBe(40);
  });
  it('lest : poids du corps + lest', () => {
    expect(chargeEffective({ chargeKg: 10, modeCharge: 'lest' }, 75)).toBe(85);
    expect(chargeEffective({ chargeKg: 10, modeCharge: 'lest' })).toBe(10);
  });
  it('sans charge : poids du corps', () => {
    expect(chargeEffective({ modeCharge: 'sans_charge' }, 75)).toBe(75);
  });
});

describe('unRmEstime (Epley)', () => {
  it('1 rep = charge', () => {
    expect(unRmEstime({ chargeKg: 100, modeCharge: 'total', reps: 1, type: 'travail' })).toBe(100);
  });
  it('10 reps à 100 kg ≈ 133,3 kg', () => {
    expect(unRmEstime({ chargeKg: 100, modeCharge: 'total', reps: 10, type: 'travail' })).toBeCloseTo(133.33, 1);
  });
  it('null pour échauffement, > 12 reps ou sans charge', () => {
    expect(unRmEstime({ chargeKg: 100, modeCharge: 'total', reps: 5, type: 'echauffement' })).toBeNull();
    expect(unRmEstime({ chargeKg: 100, modeCharge: 'total', reps: 13, type: 'travail' })).toBeNull();
    expect(unRmEstime({ modeCharge: 'total', reps: 5, type: 'travail' })).toBeNull();
  });
});

describe('volume', () => {
  it('charge × reps', () => {
    expect(volume({ chargeKg: 50, modeCharge: 'total', reps: 8 })).toBe(400);
    expect(volume({ modeCharge: 'total', reps: 8 })).toBe(0);
  });
});
