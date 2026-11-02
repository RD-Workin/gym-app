import { describe, expect, it } from 'vitest';
import type { Serie } from '../../src/core/types';
import { preremplir } from '../../src/features/seance/logique';

const s = (reps: number, chargeKg: number, type: Serie['type'] = 'travail') => ({ reps, chargeKg, type, modeCharge: 'total' }) as Serie;
const bloc = { id: 'b', exerciceId: 'dc', repsCibles: '8-10' };
const ex = { modeCharge: 'total' } as never;

describe('préremplissage en séance', () => {
  const avant = [s(10, 70), s(8, 70), s(9, 67.5)];
  it('série 1 = série 1 de la dernière fois', () => {
    expect(preremplir(ex, bloc, [], avant)).toMatchObject({ reps: 10, chargeKg: 70 });
  });
  it('chaque série reprend la série de même rang', () => {
    expect(preremplir(ex, bloc, [s(10, 70)], avant)).toMatchObject({ reps: 8, chargeKg: 70 });
    expect(preremplir(ex, bloc, [s(10, 70), s(8, 70)], avant)).toMatchObject({ reps: 9, chargeKg: 67.5 });
  });
  it("charge changée aujourd'hui : on la garde, avec les reps de la dernière fois", () => {
    expect(preremplir(ex, bloc, [s(10, 72.5)], avant)).toMatchObject({ reps: 8, chargeKg: 72.5 });
  });
  it("plus de séries qu'avant : reprend la série précédente du jour", () => {
    expect(preremplir(ex, bloc, [s(10, 70), s(8, 70), s(9, 67.5)], avant)).toMatchObject({ reps: 9, chargeKg: 67.5 });
  });
  it("l'échauffement ne compte pas dans le rang", () => {
    expect(preremplir(ex, bloc, [s(12, 40, 'echauffement')], avant)).toMatchObject({ reps: 10, chargeKg: 70 });
  });
  it('jamais fait : cible du modèle', () => {
    expect(preremplir(ex, bloc, [], [])).toMatchObject({ reps: 8, chargeKg: 0 });
  });
});
