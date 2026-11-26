import { describe, expect, it } from 'vitest';
import type { Serie } from '../../src/core/types';
import { barreTexte, detailTraction, hauteurMax, hauteurTexte, sembleTraction, suitHauteur } from '../../src/core/hauteur';
import { hauteurDeY, yDeHauteur } from '../../src/ui/SchemaHauteur';
import { barresDesSeries } from '../../src/features/seance/HauteursSeries';
import { preremplir } from '../../src/features/seance/logique';
import { construireResumeSeance } from '../../src/features/donnees/resume';
import { COLONNES_CSV, lignesCsv } from '../../src/features/donnees/exporter';

describe('hauteur atteinte (tractions)', () => {
  it('repère les tractions par leur nom, réglage de la fiche prioritaire', () => {
    for (const nom of ['Tractions', 'Tractions australiennes', 'Pull-up', 'Chin up', 'Muscle-up']) expect(sembleTraction(nom)).toBe(true);
    for (const nom of ['Lat pulldown', 'Dips', 'Développé couché']) expect(sembleTraction(nom)).toBe(false);
    expect(suitHauteur({ nom: 'Tractions', suiviHauteur: false })).toBe(false);
    expect(suitHauteur({ nom: 'Dips', suiviHauteur: true })).toBe(true);
    expect(suitHauteur(undefined)).toBe(false);
  });

  it('texte approximatif : repère proche, sinon « entre … et … »', () => {
    expect(hauteurTexte(60)).toBe('pecs');
    expect(hauteurTexte(57)).toBe('pecs');
    expect(hauteurTexte(50)).toBe('entre clavicules et pecs');
    expect(hauteurTexte(0)).toBe('yeux');
    expect(hauteurTexte(100)).toBe('nombril');
    expect(barreTexte(20)).toBe('barre au menton');
    expect(barreTexte(30)).toBe('barre entre menton et clavicules');
    expect(detailTraction({ hauteur: 40, explosif: true })).toBe('barre aux clavicules · explosive');
    expect(detailTraction({})).toBe('');
  });

  it('schéma : position ↔ valeur, aller-retour', () => {
    for (const v of [0, 13, 20, 47, 60, 85, 100]) expect(hauteurDeY(yDeHauteur(v))).toBe(v);
    expect(hauteurDeY(-50)).toBe(0);
    expect(hauteurDeY(999)).toBe(100);
  });

  it('plus haute barre et barres du schéma (hors échauffement)', () => {
    const s = (hauteur: number | undefined, type: Serie['type'] = 'travail') => ({ hauteur, type }) as Serie;
    const l = [s(10, 'echauffement'), s(40), s(60), s(40), s(undefined)];
    expect(hauteurMax(l)).toBe(60);
    expect(barresDesSeries(l)).toEqual([{ valeur: 60, legende: 'S2' }, { valeur: 40, legende: 'S1 S3' }]);
    expect(barresDesSeries(l, 80).at(-1)).toEqual({ valeur: 80, legende: 'record', ton: 'record' });
  });

  it('préremplit la hauteur et l’explosivité de la série de même rang', () => {
    const avant = [{ reps: 8, chargeKg: 0, hauteur: 60, explosif: true, type: 'travail', modeCharge: 'lest' }] as Serie[];
    const bloc = { id: 'b', exerciceId: 'tr' };
    expect(preremplir({ nom: 'Tractions', modeCharge: 'lest' } as never, bloc, [], avant)).toMatchObject({ reps: 8, hauteur: 60, explosif: true });
    expect(preremplir({ nom: 'Dips', modeCharge: 'lest' } as never, bloc, [], avant).hauteur).toBeUndefined();
  });

  it('export IA/coach et CSV : hauteur en mots, explosive', () => {
    const ex = { id: 'tr', nom: 'Tractions', equipement: 'poids_du_corps', modeCharge: 'lest', groupesMusculaires: [], archive: false } as never;
    const seance = { id: 's1', debut: '2026-11-20T18:00:00+01:00', fin: '2026-11-20T19:00:00+01:00', contexte: { poidsCorporelKg: 75 } } as never;
    const series = [
      { id: 'a', seanceId: 's1', exerciceId: 'tr', ordre: 1, chargeKg: 10, modeCharge: 'lest', reps: 6, hauteur: 60, explosif: true, type: 'travail', faiteLe: '2026-11-20T18:10:00+01:00' },
      { id: 'b', seanceId: 's1', exerciceId: 'tr', ordre: 2, chargeKg: 0, modeCharge: 'lest', reps: 8, type: 'travail', faiteLe: '2026-11-20T18:15:00+01:00' },
    ] as never[];
    const d = { exercices: [ex], variantes: [], modeles: [], seances: [seance], series };
    const txt = construireResumeSeance(d, 's1');
    expect(txt).toContain('+10×6 (barre ≈ pecs, explosive)');
    expect(txt).toContain('« barre ≈ pecs » = hauteur atteinte');
    const [l1, l2] = lignesCsv(d);
    const col = (c: string) => (COLONNES_CSV as readonly string[]).indexOf(c);
    expect(l1.length).toBe(COLONNES_CSV.length);
    expect(l1[col('hauteur_atteinte')]).toBe('pecs');
    expect(l1[col('explosive')]).toBe('oui');
    expect(l2[col('hauteur_atteinte')]).toBe('');
  });

  it('résumé sans traction notée : pas de légende de hauteur', () => {
    const d = {
      exercices: [{ id: 'dc', nom: 'DC', equipement: 'barre', modeCharge: 'total', groupesMusculaires: [], archive: false }],
      variantes: [],
      modeles: [],
      seances: [{ id: 's', debut: '2026-11-20T18:00:00+01:00', contexte: {} }],
      series: [{ id: 'x', seanceId: 's', exerciceId: 'dc', ordre: 1, chargeKg: 60, modeCharge: 'total', reps: 8, type: 'travail', faiteLe: '2026-11-20T18:00:00+01:00' }],
    } as never;
    expect(construireResumeSeance(d, 's')).not.toContain('barre ≈');
  });
});

import { nomStandard, sontDipsAuxBarres } from '../../src/core/variantes';
describe('dips : barres parallèles ou barre droite', () => {
  it('la version standard des dips, ce sont les barres parallèles', () => {
    expect(sontDipsAuxBarres('Dips')).toBe(true);
    expect(sontDipsAuxBarres('Dips entre deux chaises')).toBe(false);
    expect(nomStandard({ nom: 'Dips' })).toBe('Barres parallèles');
    expect(nomStandard({ nom: 'Développé couché' })).toBe('Standard');
  });
});
