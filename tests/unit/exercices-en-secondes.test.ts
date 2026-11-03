import { describe, expect, it } from 'vitest';
import type { Exercice, Serie } from '../../src/core/types';
import { fmtDuree, unRmEstime } from '../../src/core/calculs';
import { semblerTenu } from '../../src/core/duree';
import { bilanRecords, libelleRecord, pointsExercice, progresParSeance, recordsBattusPar } from '../../src/features/progression/calculs';
import { etatObjectif, libelleCible } from '../../src/features/objectifs/calculs';
import { cibleSansUnite, formatSerie, preremplir, progresVsDerniereFois, resumeSeries } from '../../src/features/seance/logique';

let n = 0;
const tenue = (seanceId: string, dureeSec: number, p: Partial<Serie> = {}): Serie => ({
  id: `t${++n}`,
  seanceId,
  exerciceId: 'gainage',
  ordre: n,
  modeCharge: 'lest',
  chargeKg: 0,
  reps: 0,
  dureeSec,
  type: 'travail',
  faiteLe: `2026-10-0${seanceId.slice(-1)}T10:${String(n % 60).padStart(2, '0')}:00Z`,
  creeLe: '',
  modifieLe: '',
  ...p,
});
const seances = new Map([
  ['j1', { debut: '2026-10-01T10:00:00Z' }],
  ['j2', { debut: '2026-10-02T10:00:00Z' }],
  ['j3', { debut: '2026-10-03T10:00:00Z' }],
]);
const poids = new Map<string, number | undefined>([['j1', 75], ['j2', 75], ['j3', 75]]);

describe('exercices en secondes', () => {
  it('formate les durées', () => {
    expect(fmtDuree(45)).toBe('45 s');
    expect(fmtDuree(60)).toBe('1 min');
    expect(fmtDuree(95)).toBe('1 min 35');
  });

  it('repère les exercices tenus par leur nom', () => {
    for (const nom of ['Gainage', 'Gainage latéral', 'Planche', 'Plank', 'Side Bridge', 'Dead hang', 'Deadhang', 'Chaise murale', 'L-sit']) expect(semblerTenu(nom)).toBe(true);
    for (const nom of ['Développé couché', 'Dips entre deux chaises', 'Relevés de jambes à la barre', 'Hanging Leg Raise']) expect(semblerTenu(nom)).toBe(false);
  });

  it('pas de 1RM ni de volume pour une série tenue, même lestée', () => {
    expect(unRmEstime(tenue('j1', 40, { chargeKg: 10 }), 75)).toBeNull();
    const [p] = pointsExercice([tenue('j1', 40), tenue('j1', 55)], seances, poids, 'gainage');
    expect(p.dureeMax).toBe(55);
    expect(p.unRm).toBeNull();
    expect(p.chargeMax).toBeNull();
    expect(p.volume).toBe(0);
  });

  it('record de temps tenu, puis record à une charge', () => {
    const histo = [tenue('j1', 45), tenue('j2', 50)];
    const r = recordsBattusPar(tenue('j3', 60), histo, poids);
    expect(r.map((x) => x.type)).toEqual(['duree_max']);
    expect(libelleRecord(r[0], 'Gainage')).toBe('Gainage · tenu 1 min');
    // Plus court qu'avant mais à +10 kg, déjà tenté une fois : record à cette charge.
    const histo2 = [tenue('j1', 60), tenue('j2', 20, { chargeKg: 10 })];
    const r2 = recordsBattusPar(tenue('j3', 30, { chargeKg: 10 }), histo2, poids);
    expect(r2.map((x) => x.type)).toEqual(['duree_a_charge']);
    expect(libelleRecord(r2[0], 'Gainage')).toBe('Gainage · 30 s à +10 kg de lest');
    expect(bilanRecords([...histo2], poids).actuels.get('gainage|')?.dureeMax?.valeur).toBe(60);
  });

  it('le calendrier compte un progrès quand on tient plus longtemps', () => {
    const p = progresParSeance([tenue('j1', 40), tenue('j2', 50)], seances, poids);
    expect(p.get('j2')).toMatchObject({ compares: 1, enHausse: 1 });
  });

  it('objectif « tenir 1 min »', () => {
    const points = pointsExercice([tenue('j1', 40), tenue('j2', 62)], seances, poids, 'gainage');
    const e = etatObjectif({ mesure: 'duree', cible: 60 }, points, new Date('2026-10-04T10:00:00Z'));
    expect(e.atteint).toBe(true);
    expect(libelleCible({ mesure: 'duree', cible: 60 })).toBe('tenir 1 min');
  });

  it('séance : prérempli en secondes, affichage et progrès', () => {
    const ex = { modeCharge: 'lest', enSecondes: true, equipement: 'poids_du_corps' } as Exercice;
    const bloc = { id: 'b', exerciceId: 'gainage', repsCibles: '30-45 s' };
    expect(preremplir(ex, bloc, [], [])).toMatchObject({ reps: 0, dureeSec: 30 });
    expect(preremplir(ex, bloc, [], [tenue('j1', 50)])).toMatchObject({ dureeSec: 50 });
    expect(cibleSansUnite('30-45 s')).toBe('30-45');
    expect(formatSerie(tenue('j1', 45))).toBe('45 s');
    expect(formatSerie(tenue('j1', 45, { chargeKg: 10 }))).toBe('45 s · +10 kg de lest');
    expect(resumeSeries([tenue('j1', 45), tenue('j1', 40)])).toBe('45-40 s');
    expect(progresVsDerniereFois(tenue('j2', 50), [tenue('j1', 45)], 0)).toBe('+5 s vs la dernière fois');
  });
});
