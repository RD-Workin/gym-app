import { describe, expect, it } from 'vitest';
import type { Exercice, Serie } from '../../src/core/types';
import { echauffementAProposer, etapesEchauffement, preremplir } from '../../src/features/seance/logique';

const ex = (equipement: Exercice['equipement'], modeCharge: Exercice['modeCharge'] = 'total') => ({ equipement, modeCharge }) as Exercice;

describe('échauffement proposé', () => {
  it('barre : 40/60/80 %, arrondi à 2,5 kg, barre vide au minimum', () => {
    expect(etapesEchauffement(100, 'barre')).toEqual([
      { chargeKg: 40, reps: 8 },
      { chargeKg: 60, reps: 5 },
      { chargeKg: 80, reps: 3 },
    ]);
    expect(etapesEchauffement(40, 'barre')).toEqual([
      { chargeKg: 20, reps: 8 },
      { chargeKg: 25, reps: 5 },
      { chargeKg: 32.5, reps: 3 },
    ]);
  });
  it('pas de doublon ni d’étape aussi lourde que le travail', () => {
    expect(etapesEchauffement(25, 'barre')).toEqual([{ chargeKg: 20, reps: 8 }]);
  });
  it('charge trop faible ou inconnue : rien', () => {
    expect(etapesEchauffement(15, 'halteres')).toEqual([]);
    expect(etapesEchauffement(undefined, 'barre')).toEqual([]);
  });
  it('premier exercice ou barre seulement, jamais au lest ni après une série', () => {
    expect(echauffementAProposer(ex('machine'), true, [], 60)).toHaveLength(3);
    expect(echauffementAProposer(ex('machine'), false, [], 60)).toEqual([]);
    expect(echauffementAProposer(ex('barre'), false, [], 60)).toHaveLength(3);
    expect(echauffementAProposer(ex('poids_du_corps', 'lest'), true, [], 30)).toEqual([]);
    expect(echauffementAProposer(ex('barre'), true, [{ type: 'travail' } as Serie], 60)).toEqual([]);
  });
  it('accepté : la saisie suit les étapes, puis reprend la série de travail', () => {
    const etapes = etapesEchauffement(100, 'barre');
    const bloc = { id: 'b', exerciceId: 'sq' };
    const avant = [{ reps: 5, chargeKg: 100, type: 'travail', modeCharge: 'total' } as Serie];
    const e = (c: number) => ({ reps: 8, chargeKg: c, type: 'echauffement', modeCharge: 'total' }) as Serie;
    expect(preremplir(ex('barre'), bloc, [], avant, etapes)).toMatchObject({ chargeKg: 40, reps: 8, type: 'echauffement' });
    expect(preremplir(ex('barre'), bloc, [e(40)], avant, etapes)).toMatchObject({ chargeKg: 60, reps: 5, type: 'echauffement' });
    expect(preremplir(ex('barre'), bloc, [e(40), e(60), e(80)], avant, etapes)).toMatchObject({ chargeKg: 100, reps: 5, type: 'travail' });
  });
});
