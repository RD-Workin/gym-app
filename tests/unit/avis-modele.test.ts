import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE, MODELES_DEPART, blocsDepart, reposDepart } from '../../src/data/bibliotheque';
import { analyserModele, dureeEstimeeSec, typeSeance } from '../../src/features/modeles/avis';
import { blocPropose, proposerExercices, type ExerciceCandidat } from '../../src/features/modeles/suggestions';
import type { BlocModele } from '../../src/core/types';

const biblio: ExerciceCandidat[] = BIBLIOTHEQUE.map((x) => ({ id: x.cle, nom: x.nom, groupesMusculaires: [...x.groupes] }));
const parId = new Map(biblio.map((e) => [e.id, e]));
let n = 0;
const bloc = (cle: string, series = 3, reps = '8-10', reposSec?: number): BlocModele => ({ id: `b${n++}`, exerciceId: cle, seriesCibles: series, repsCibles: reps, reposSec: reposSec ?? reposDepart(cle) ?? 90 });

describe('avis sur une séance type', () => {
  it('séance vide', () => {
    expect(analyserModele('Push', [], parId).verdict).toBe('vide');
  });

  it('type déduit du nom, sinon du contenu', () => {
    expect(typeSeance('Mon Push du lundi', {})).toBe('push');
    expect(typeSeance('Legs', {})).toBe('jambes');
    expect(typeSeance('Séance A', { dos: 8, biceps: 4 })).toBe('pull');
    expect(typeSeance('Séance A', { dos: 4, pectoraux: 4, quadriceps: 4 })).toBe('full');
    expect(typeSeance('Séance A', {}, 'push')).toBe('push');
  });

  it('Push équilibré : adaptée', () => {
    const blocs = [bloc('dc', 4, '6-10'), bloc('dev-incline-halt', 3), bloc('shoulder-press', 3), bloc('pec-fly', 3, '10-12'), bloc('extension-poulie', 3, '10-12')];
    const a = analyserModele('Push', blocs, parId);
    expect(a.remarques.filter((r) => r.ton !== 'ok')).toEqual([]);
    expect(a.verdict).toBe('adaptee');
  });

  it('muscle attendu absent : incomplète', () => {
    const a = analyserModele('Jambes', [bloc('leg-press', 4), bloc('leg-extension', 4), bloc('hack-squat', 4)], parId);
    expect(a.verdict).toBe('incomplete');
    expect(a.remarques[0].texte).toMatch(/ischios/);
  });

  it('trop de séries : trop chargée', () => {
    const blocs = ['dc', 'dev-incline-halt', 'chest-press', 'bench-plate', 'dips', 'shoulder-press', 'pec-fly', 'extension-poulie', 'seated-triceps', 'vertical-chest'].map((c) => bloc(c, 4));
    const a = analyserModele('Push', blocs, parId);
    expect(a.verdict).toBe('trop-chargee');
    expect(a.remarques.some((r) => /pectoraux/.test(r.texte) && /Beaucoup/.test(r.texte))).toBe(true);
  });

  it('isolation avant un gros exercice du même muscle : conseil d’ordre', () => {
    const a = analyserModele('Push', [bloc('pec-fly'), bloc('dc'), bloc('shoulder-press'), bloc('extension-poulie')], parId);
    expect(a.remarques.some((r) => r.texte.startsWith('Place Développé couché avant Pec fly'))).toBe(true);
  });

  it('repos court sur un gros exercice', () => {
    const a = analyserModele('Push', [bloc('dc', 4, '8', 60), bloc('shoulder-press'), bloc('extension-poulie')], parId);
    expect(a.remarques.some((r) => /Repos court sur Développé couché/.test(r.texte))).toBe(true);
  });

  it('durée : un repos par tour en superset', () => {
    const a = { ...bloc('pec-fly', 3, '10', 90), supersetId: 's' };
    const b = { ...bloc('extension-poulie', 3, '10', 90), supersetId: 's' };
    expect(dureeEstimeeSec([a, b])).toBe(2 * 60 + 3 * 40 + 3 * (40 + 90));
  });

  it.each(MODELES_DEPART.map((m) => [m.nom, m]))('modèle de départ %s : un avis sans plantage', (_, m) => {
    const blocs = blocsDepart(m).map((b) => bloc(b.cle, b.series, b.reps));
    const a = analyserModele(m.nom, blocs, parId);
    expect(a.remarques.length).toBeGreaterThan(0);
  });
});

describe('propositions d’exercices', () => {
  it('Push vide : 3-4 propositions, un gros exercice pour les pectoraux en tête', () => {
    const p = proposerExercices('push', [], biblio);
    expect(p.length).toBeGreaterThanOrEqual(3);
    expect(p.length).toBeLessThanOrEqual(4);
    expect(p[0].gros).toBe(true);
    expect(p[0].exercice.groupesMusculaires[0]).toBe('pectoraux');
    expect(p.every((x) => !['quadriceps', 'dos', 'biceps'].includes(x.exercice.groupesMusculaires[0]))).toBe(true);
  });

  it('après les pectoraux, propose ce qui manque (épaules, triceps)', () => {
    const blocs = [blocPropose('dc', true, 'hypertrophie', 'a'), blocPropose('dev-incline-halt', true, 'hypertrophie', 'b')];
    const p = proposerExercices('push', blocs, biblio);
    const muscles = p.map((x) => x.exercice.groupesMusculaires[0]);
    expect(muscles.some((g) => g === 'epaules' || g === 'triceps')).toBe(true);
    expect(p.some((x) => x.exercice.id === 'dc')).toBe(false);
  });

  it('Jambes : propose les ischios quand seuls les quadriceps sont faits', () => {
    const blocs = [blocPropose('leg-press', true, 'hypertrophie', 'a'), blocPropose('leg-extension', false, 'hypertrophie', 'b')];
    expect(proposerExercices('jambes', blocs, biblio).some((x) => x.exercice.id === 'leg-curl')).toBe(true);
  });

  it('exclus : « Proposer d’autres » ne repropose pas les mêmes', () => {
    const p1 = proposerExercices('pull', [], biblio);
    const p2 = proposerExercices('pull', [], biblio, { exclus: new Set(p1.map((x) => x.exercice.id)) });
    expect(p2.some((x) => p1.some((y) => y.exercice.id === x.exercice.id))).toBe(false);
  });

  it('séance complète : plus rien à proposer', () => {
    const blocs = ['dc', 'dev-incline-halt', 'bench-plate', 'shoulder-press', 'dips', 'extension-poulie', 'seated-triceps'].map((c) => bloc(c, 4));
    expect(proposerExercices('push', blocs, biblio)).toEqual([]);
  });
});

describe('Full Upper', () => {
  it('type reconnu au nom, avant « full »', () => {
    expect(typeSeance('Full Upper', {})).toBe('upper');
    expect(typeSeance('Haut du corps', {})).toBe('upper');
    expect(typeSeance('Séance B', { pectoraux: 6, dos: 6, biceps: 2, triceps: 2 })).toBe('upper');
  });

  it('modèle de départ : adapté', () => {
    const m = MODELES_DEPART.find((x) => x.nom === 'Full Upper')!;
    const blocs = blocsDepart(m).map((b) => bloc(b.cle, b.series, b.reps));
    const a = analyserModele(m.nom, blocs, parId);
    expect(a.remarques.filter((r) => r.ton !== 'ok')).toEqual([]);
    expect(a.verdict).toBe('adaptee');
  });

  it('propositions : haut du corps seulement, un muscle par proposition', () => {
    const p = proposerExercices('upper', [], biblio);
    expect(p.length).toBeGreaterThanOrEqual(3);
    const muscles = p.map((x) => x.exercice.groupesMusculaires[0]);
    expect(new Set(muscles).size).toBe(muscles.length);
    expect(muscles.some((g) => ['quadriceps', 'ischios', 'fessiers', 'mollets'].includes(g))).toBe(false);
  });

  it('sans les jambes : pas de remarque sur les jambes', () => {
    const a = analyserModele('Full Upper', [bloc('dc'), bloc('lat-pulldown')], parId);
    expect(a.remarques.some((r) => /quadriceps|ischios/.test(r.texte))).toBe(false);
  });

  it('reps hautes : rien jusqu’à 30 (efficace près de l’échec), conseil au-delà', () => {
    const base = [bloc('dc', 4, '6-10'), bloc('dev-incline-halt', 3), bloc('shoulder-press', 3), bloc('extension-poulie', 3, '10-12')];
    const r25 = analyserModele('Push', [...base, bloc('pec-fly', 3, '20-25')], parId);
    expect(r25.remarques.some((r) => /reps sur/.test(r.texte))).toBe(false);
    const r40 = analyserModele('Push', [...base, bloc('pec-fly', 3, '30-40')], parId);
    expect(r40.remarques.some((r) => /Plus de 30 reps/.test(r.texte))).toBe(true);
  });
});
