import { describe, expect, it } from 'vitest';
import { semainesDAffilee } from './regularite';

const mer = new Date(2026, 10, 4, 12); // mercredi 4 novembre 2026
const le = (m: number, j: number) => new Date(2026, m, j, 10).toISOString();

describe('semainesDAffilee', () => {
  it('vaut 0 sans séance', () => expect(semainesDAffilee([], mer)).toBe(0));
  it('3 semaines consécutives, semaine en cours comprise', () =>
    expect(semainesDAffilee([le(10, 2), le(9, 28), le(9, 30), le(9, 20)], mer)).toBe(3));
  it('semaine en cours vide : la série continue depuis la précédente', () =>
    expect(semainesDAffilee([le(9, 27), le(9, 21)], mer)).toBe(2));
  it('un trou casse la série', () => expect(semainesDAffilee([le(10, 2), le(9, 20)], mer)).toBe(1));
});
