import { describe, expect, it } from 'vitest';
import type { Serie } from '../../core/types';
import {
  bilanRecords,
  pointsExercice,
  poidsParSeance,
  recordsBattusPar,
  semainesDAffilee,
  seancesParSemaine,
  tendance,
  volumeParGroupe,
} from './calculs';

let n = 0;
const serie = (p: Partial<Serie> & Pick<Serie, 'seanceId' | 'reps'>): Serie => ({
  id: `s${++n}`,
  exerciceId: 'dc',
  ordre: n,
  modeCharge: 'total',
  type: 'travail',
  faiteLe: `2026-10-0${p.seanceId.slice(-1)}T10:${String(n % 60).padStart(2, '0')}:00Z`,
  creeLe: '',
  modifieLe: '',
  ...p,
});
const seances = new Map([
  ['j1', { debut: '2026-10-01T10:00:00Z' }],
  ['j2', { debut: '2026-10-02T10:00:00Z' }],
  ['j3', { debut: '2026-10-03T10:00:00Z' }],
]);
const sansPoids = new Map<string, number | undefined>();

describe('pointsExercice', () => {
  it('calcule 1RM, charge max et volume par séance, hors échauffement', () => {
    const s = [
      serie({ seanceId: 'j1', chargeKg: 40, reps: 10, type: 'echauffement' }),
      serie({ seanceId: 'j1', chargeKg: 60, reps: 8 }),
      serie({ seanceId: 'j1', chargeKg: 60, reps: 6 }),
    ];
    const [p] = pointsExercice(s, seances, sansPoids, 'dc');
    expect(p.chargeMax).toBe(60);
    expect(p.unRm).toBeCloseTo(60 * (1 + 8 / 30));
    expect(p.volume).toBe(60 * 8 + 60 * 6);
    expect(p.series).toHaveLength(2);
  });

  it('double la charge par main et ajoute le poids du corps au lest', () => {
    const s = [
      serie({ seanceId: 'j1', exerciceId: 'curl', chargeKg: 12, modeCharge: 'par_main', reps: 10 }),
      serie({ seanceId: 'j2', exerciceId: 'dips', chargeKg: 10, modeCharge: 'lest', reps: 8 }),
    ];
    const poids = poidsParSeance([
      { id: 'j1', debut: '2026-10-01', contexte: { poidsCorporelKg: 80 } },
      { id: 'j2', debut: '2026-10-02', contexte: {} },
    ]);
    expect(poids.get('j2')).toBe(80);
    expect(pointsExercice(s, seances, poids, 'curl')[0].chargeMax).toBe(24);
    const dips = pointsExercice(s, seances, poids, 'dips')[0];
    expect(dips.chargeMax).toBe(90);
    expect(dips.poidsInconnu).toBe(false);
    expect(pointsExercice(s, seances, sansPoids, 'dips')[0].poidsInconnu).toBe(true);
  });

  it('sépare les variantes', () => {
    const s = [serie({ seanceId: 'j1', chargeKg: 60, reps: 5 }), serie({ seanceId: 'j1', chargeKg: 50, reps: 5, varianteId: 'large' })];
    expect(pointsExercice(s, seances, sansPoids, 'dc', null)[0].chargeMax).toBe(60);
    expect(pointsExercice(s, seances, sansPoids, 'dc', 'large')[0].chargeMax).toBe(50);
    expect(pointsExercice(s, seances, sansPoids, 'dc')[0].series).toHaveLength(2);
  });
});

describe('records', () => {
  const histo = [
    serie({ seanceId: 'j1', chargeKg: 60, reps: 8 }),
    serie({ seanceId: 'j1', chargeKg: 60, reps: 7 }),
    serie({ seanceId: 'j2', chargeKg: 62.5, reps: 8 }),
  ];

  it('ne célèbre pas la toute première série', () => {
    expect(recordsBattusPar(histo[0], [], sansPoids)).toEqual([]);
  });

  it('détecte 1RM, charge max et reps à une charge connue', () => {
    const r = recordsBattusPar(serie({ seanceId: 'j3', chargeKg: 60, reps: 9 }), histo, sansPoids).map((x) => x.type);
    expect(r).toContain('reps_a_charge');
    expect(r).not.toContain('charge_max');
    const r2 = recordsBattusPar(serie({ seanceId: 'j3', chargeKg: 65, reps: 8 }), histo, sansPoids).map((x) => x.type);
    expect(r2).toEqual(['un_rm', 'charge_max']);
  });

  it('ignore une série égale au record et un échauffement', () => {
    expect(recordsBattusPar(serie({ seanceId: 'j3', chargeKg: 62.5, reps: 8 }), histo, sansPoids)).toEqual([]);
    expect(recordsBattusPar(serie({ seanceId: 'j3', chargeKg: 100, reps: 5, type: 'echauffement' }), histo, sansPoids)).toEqual([]);
  });

  it('signale un volume de séance supérieur à une autre séance', () => {
    const j3 = [serie({ seanceId: 'j3', chargeKg: 60, reps: 8 })];
    const r = recordsBattusPar(serie({ seanceId: 'j3', chargeKg: 40, reps: 12 }), [...histo, ...j3], sansPoids).map((x) => x.type);
    expect(r).toEqual(['volume_seance']);
  });

  it('rejoue l’historique : records actuels et événements', () => {
    const b = bilanRecords(histo, sansPoids);
    const dc = b.actuels.get('dc|')!;
    expect(dc.chargeMax?.valeur).toBe(62.5);
    expect(dc.unRm?.seanceId).toBe('j2');
    expect(b.evenements.map((e) => e.type)).toEqual(['un_rm', 'charge_max']);
  });
});

describe('vue globale', () => {
  const maintenant = new Date('2026-10-29T12:00:00'); // jeudi
  const s = ['2026-10-27T10:00:00', '2026-10-21T10:00:00', '2026-10-19T10:00:00', '2026-10-05T10:00:00'].map((debut) => ({ debut }));

  it('compte les séances par semaine', () => {
    const r = seancesParSemaine(s, 4, maintenant).map((x) => x.nb);
    expect(r).toEqual([1, 0, 2, 1]);
  });

  it('compte les semaines d’affilée', () => {
    expect(semainesDAffilee(s, maintenant)).toBe(2);
    expect(semainesDAffilee(s, new Date('2026-11-04T12:00:00'))).toBe(2);
    expect(semainesDAffilee(s, new Date('2026-11-11T12:00:00'))).toBe(0);
  });

  it('répartit le volume par groupe musculaire', () => {
    const ex = new Map([['dc', { groupesMusculaires: ['pectoraux', 'triceps'] }]]);
    const r = volumeParGroupe([serie({ seanceId: 'j1', chargeKg: 50, reps: 10 })], ex, sansPoids, new Date('2026-09-01'));
    expect(r).toEqual([
      { groupe: 'pectoraux', volume: 500, series: 1 },
      { groupe: 'triceps', volume: 500, series: 1 },
    ]);
  });

  it('calcule la tendance sur la période', () => {
    const pts = pointsExercice([serie({ seanceId: 'j1', chargeKg: 60, reps: 1 }), serie({ seanceId: 'j3', chargeKg: 70, reps: 1 })], seances, sansPoids, 'dc');
    expect(tendance(pts, 'charge_max', 84, new Date('2026-10-10'))?.delta).toBe(10);
  });
});
