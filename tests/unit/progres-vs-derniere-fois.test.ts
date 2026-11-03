import { describe, expect, it } from 'vitest';
import type { Serie } from '../../src/core/types';
import { progresVsDerniereFois } from '../../src/features/seance/logique';

const s = (reps: number, chargeKg: number, type: Serie['type'] = 'travail') => ({ reps, chargeKg, type, modeCharge: 'total' }) as Serie;
const avant = [s(10, 70), s(8, 70)];

describe('bulle « vs la dernière fois »', () => {
  it('plus de charge', () => expect(progresVsDerniereFois(s(9, 72.5), avant, 0)).toBe('+2,5 kg vs la dernière fois'));
  it('plus de reps à charge égale', () => expect(progresVsDerniereFois(s(10, 70), avant, 1)).toBe('+2 reps vs la dernière fois'));
  it('une rep de plus', () => expect(progresVsDerniereFois(s(11, 70), avant, 0)).toBe('+1 rep vs la dernière fois'));
  it('rien si moins bien ou pareil', () => {
    expect(progresVsDerniereFois(s(10, 70), avant, 0)).toBeUndefined();
    expect(progresVsDerniereFois(s(12, 65), avant, 0)).toBeUndefined();
  });
  it('rien si la charge monte mais les reps s’effondrent', () => expect(progresVsDerniereFois(s(4, 75), avant, 0)).toBeUndefined());
  it('rien pour un échauffement ou sans référence', () => {
    expect(progresVsDerniereFois(s(12, 80, 'echauffement'), avant, 0)).toBeUndefined();
    expect(progresVsDerniereFois(s(12, 80), avant, 5)).toBeUndefined();
  });
});
