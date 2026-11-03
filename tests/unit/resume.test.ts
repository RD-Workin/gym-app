import { describe, expect, it } from 'vitest';
import { construireResume, construireResumeSeance } from '../../src/features/donnees/resume';

let n = 0;
const id = () => `id-${++n}`;
const E = (nom: string, modeCharge: string) => ({ id: id(), nom, equipement: 'machine', modeCharge, groupesMusculaires: [], archive: false }) as never as { id: string; modeCharge: string };
const dc = E('Développé couché', 'total');
const inc = E('Développé incliné haltères', 'par_main');
const dips = E('Dips', 'lest');
const lp = E('Leg press', 'total');
const seances: unknown[] = [];
const series: unknown[] = [];
function seance(debut: string, poids: number | undefined, note: string | undefined, blocs: [typeof dc, [number, number, object?][]][]) {
  const s = { id: id(), modeleId: 'push', debut, contexte: { poidsCorporelKg: poids }, note };
  seances.push(s);
  let ordre = 0;
  for (const [e, l] of blocs)
    for (const [chargeKg, reps, o] of l)
      series.push({ id: id(), seanceId: s.id, exerciceId: e.id, ordre: ordre++, chargeKg, modeCharge: e.modeCharge, reps, type: 'travail', faiteLe: debut, ...o });
}
seance('2026-09-20T18:00:00+02:00', 79, undefined, [[dc, [[60, 8]]]]); // hors période
seance('2026-10-06T18:30:00+02:00', 78.4, 'Bonne forme', [
  [dc, [[40, 10, { type: 'echauffement' }], [65, 8, { rir: 2 }], [65, 7]]],
  [inc, [[30, 8], [28, 8]]],
  [dips, [[10, 11], [10, 8, { type: 'echec' }]]],
]);
seance('2026-10-15T18:30:00+02:00', undefined, undefined, [[dc, [[67.5, 8]]], [lp, [[113, 9]]]]);
seance('2026-10-30T18:45:00+01:00', 77.8, undefined, [
  [dc, [[40, 10, { type: 'echauffement' }], [67.5, 7, { rir: 1 }], [62.5, 8]]],
  [inc, [[30, 9], [30, 8]]],
  [dips, [[12.5, 9], [12.5, 8]]],
]);
// Séance libre (sans modèle), hors période d'octobre
seance('2026-11-02T18:00:00+01:00', 77.5, 'Fatigué', [[dc, [[70, 6, { rir: 0 }], [65, 8]]], [lp, [[120, 8]]]]);
const libre = seances[seances.length - 1] as { id: string; modeleId?: string; fin?: string };
delete libre.modeleId;
libre.fin = '2026-11-02T19:05:00+01:00';
const d = { exercices: [dc, inc, dips, lp], variantes: [], modeles: [{ id: 'push', nom: 'Push' }], seances, series } as never;

describe('résumé pour coach / IA (06)', () => {
  const t = construireResume(d, { du: '2026-10-01', au: '2026-10-31' });
  it('vue d’ensemble : séances, fréquence, poids de corps début → fin', () => {
    expect(t).toContain('du 01/10/2026 au 31/10/2026');
    expect(t).toContain('3 séances en 31 jours, soit 0,7 par semaine : Push ×3');
    expect(t).toContain('Poids de corps : 78,4 kg le 06/10 → 77,8 kg le 30/10 (-0,6 kg)');
    expect(t).not.toContain('20/09');
  });
  it('par exercice : nombre de séances, début / fin, évolution', () => {
    expect(t).toMatch(/### Développé couché\n- 3 séances, 5 séries de travail\n- Début \(06\/10\) : échauff\. 40×10 · 65×8 \(RIR 2\) · 65×7\n- Fin \(30\/10\) : échauff\. 40×10 · 67,5×7 \(RIR 1\) · 62,5×8/);
    expect(t).toContain('1RM estimé 82,3 → 83,3 kg (+1 %) ; charge max 65 → 67,5 kg (+4 %) ; reps max 8 → 8 ; volume de la séance 975 → 973 kg (stable)');
    expect(t).toContain('Meilleure séance : 15/10 (1RM estimé 85,5 kg)');
    expect(t).toContain('### Développé incliné haltères — charge par haltère/main');
    expect(t).toContain('### Dips — lest ajouté au poids du corps');
    expect(t).toContain('lest max 10 → 12,5 kg (+25 %)');
    expect(t).toContain('charge max par haltère 30 → 30 kg (stable)');
    expect(t).toContain('+10×8 (échec)');
    expect(t).toMatch(/### Leg press\n- 1 séance, 1 série de travail\n- 15\/10 : 113×9/);
  });
  it('détail des séances avec note et poids du jour', () => {
    expect(t).toMatch(/\*\*Push — .* 06\/10\*\* \(78,4 kg\) · « Bonne forme »/);
  });
  it('période vide', () => {
    expect(construireResume(d, { du: '2027-01-01' })).toBe('Aucune séance enregistrée sur cette période.');
  });
});

describe('résumé d’une seule séance (06)', () => {
  const t = construireResumeSeance(d, libre.id);
  it('séance libre : titre, contexte, durée, ressenti', () => {
    expect(t).toMatch(/^# Ma séance de musculation : Séance libre, .*02\/11\/2026/);
    expect(t).toContain('- Début 18:00, durée 1 h 05');
    expect(t).toContain('- Poids de corps : 77,5 kg');
    expect(t).toContain('- Ressenti : « Fatigué »');
    expect(t).toContain('- 2 exercices, 3 séries de travail');
  });
  it('compare chaque exercice à la fois d’avant et au record', () => {
    expect(t).toContain('- Séries : 70×6 (RIR 0) · 65×8');
    expect(t).toContain('- La fois d’avant (30/10, il y a 3 jours) : échauff. 40×10 · 67,5×7 (RIR 1) · 62,5×8');
    expect(t).toContain('1RM estimé 83,3 → 84 kg (+1 %)');
    expect(t).toContain('- Record de 1RM estimé : 85,5 kg (98 % atteint aujourd’hui)');
    expect(t).toContain('- Déjà fait 4 fois avant cette séance');
    expect(t).toMatch(/### Leg press\n- Séries : 120×8\n- La fois d’avant \(15\/10, il y a 18 jours\) : 113×9/);
    expect(t).toContain('- Nouveau record de 1RM estimé (ancien : 146,9 kg)');
  });
  it('séance inconnue', () => {
    expect(construireResumeSeance(d, 'zzz')).toBe('Séance introuvable.');
  });
});
