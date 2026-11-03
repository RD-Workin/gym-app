import { describe, expect, it } from 'vitest';
import { conseilsObjectif, etatObjectif, evaluerObjectif, pente, phraseMarge } from '../../src/features/objectifs/calculs';
import { lignesCsv, COLONNES_CSV } from '../../src/features/donnees/exporter';
import { construireResume } from '../../src/features/donnees/resume';
import { migrerExport } from '../../src/core/migrations';
import type { Objectif, Seance, Serie } from '../../src/core/types';

const AUJ = new Date('2026-11-03T12:00:00+01:00');
let n = 0;
const id = () => `id-${++n}`;

/** Une séance par semaine (ou tous les `pas` jours) avec une série de travail. */
function historique(exerciceId: string, charges: number[], reps = 5, pasJours = 7, extra: Partial<Serie> = {}) {
  const seances: Seance[] = [];
  const series: Serie[] = [];
  charges.forEach((c, i) => {
    const t = AUJ.getTime() - (charges.length - 1 - i) * pasJours * 864e5 - 864e5;
    const debut = new Date(t).toISOString();
    const s = { id: id(), debut, contexte: {}, creeLe: debut, modifieLe: debut } as Seance;
    seances.push(s);
    series.push({ id: id(), seanceId: s.id, exerciceId, ordre: 0, chargeKg: c, modeCharge: 'total', reps, type: 'travail', faiteLe: debut, creeLe: debut, modifieLe: debut, ...extra });
  });
  return { seances, series };
}
const donnees = (h: { seances: Seance[]; series: Serie[] }) => ({
  series: h.series,
  seancesParId: new Map(h.seances.map((s) => [s.id, s])),
  poids: new Map<string, number | undefined>(),
});
const obj = (p: Partial<Objectif>): Objectif => ({ id: 'o1', exerciceId: 'dc', mesure: 'charge_max', cible: 100, creeLe: '', modifieLe: '', ...p });

describe('objectifs : lest négatif (tractions aidées)', () => {
  it('équivalence et jauge calculées sur la charge réelle', () => {
    const h = historique('tr', [-20, -15, -10], 5, 7, { modeCharge: 'lest', exerciceId: 'tr' });
    const d = { ...donnees(h), poids: new Map<string, number | undefined>(h.seances.map((s) => [s.id, 80])) };
    const { etat } = evaluerObjectif(obj({ exerciceId: 'tr', mesure: 'serie', reps: 5, cible: 0 }), d, AUJ);
    expect(etat.actuel).toBeCloseTo(-10);
    expect(etat.reste).toBeCloseTo(10);
    expect(etat.pourcentage).toBeCloseTo(87.5); // 70 kg réels sur 80
    expect(etat.atteint).toBe(false);
    const { etat: e2 } = evaluerObjectif(obj({ exerciceId: 'tr', mesure: 'serie', reps: 5, cible: -10 }), d, AUJ);
    expect(e2.atteint).toBe(true);
  });
});

describe('objectifs : calculs', () => {
  it('pente des moindres carrés par semaine', () => {
    const w = 7 * 864e5;
    expect(pente([{ t: 0, v: 80 }, { t: w, v: 81 }, { t: 2 * w, v: 82 }])).toBeCloseTo(1);
    expect(pente([{ t: 0, v: 80 }, { t: w, v: 81 }])).toBeNull();
  });

  it('marge, rythme et date estimée', () => {
    const h = historique('dc', [80, 81, 82, 83, 84, 85]); // +1 kg/sem.
    const { etat } = evaluerObjectif(obj({}), donnees(h), AUJ);
    expect(etat.actuel).toBe(85);
    expect(etat.reste).toBe(15);
    expect(Math.round(etat.pourcentage)).toBe(85);
    expect(etat.rythme).toBeCloseTo(1, 1);
    expect(etat.projection).toBe('2027-02-16'); // ~15 semaines
    expect(etat.statut).toBe('en_progres');
    expect(phraseMarge(obj({}), etat)).toBe('85 / 100 kg, reste 15 kg (85\u00a0%)');
  });

  it('date visée : en retard si le rythme ne suffit pas, et conseil adapté', () => {
    const h = historique('dc', [80, 81, 82, 83, 84, 85]);
    const o = obj({ echeance: '2026-12-01' }); // 4 semaines pour 15 kg
    const { etat, points } = evaluerObjectif(o, donnees(h), AUJ);
    expect(etat.statut).toBe('en_retard');
    expect(etat.rythmeRequis).toBeGreaterThan(3);
    expect(conseilsObjectif(o, etat, points).map((c) => c.regle)).toContain('retard');
  });

  it('stagnation et fréquence faible déclenchent leurs conseils', () => {
    const h = historique('dc', [90, 90, 90, 90, 90], 5, 14); // une fois toutes les 2 semaines, plat
    const o = obj({});
    const { etat, points } = evaluerObjectif(o, donnees(h), AUJ);
    expect(etat.statut).toBe('stagne');
    const regles = conseilsObjectif(o, etat, points).map((c) => c.regle);
    expect(regles).toContain('frequence');
    expect(regles).toContain('stagnation');
  });

  it('séries longues : conseil de plage de reps ; RIR élevé : conseil d’effort', () => {
    const h = historique('dc', [60, 61, 62, 63], 12, 3.5, { rir: 5 });
    const o = obj({ mesure: 'un_rm' });
    const { etat, points } = evaluerObjectif(o, donnees(h), AUJ);
    const regles = conseilsObjectif(o, etat, points, 'barre', 5).map((c) => c.regle);
    expect(regles).toContain('plage');
    expect(regles).toContain('effort');
  });

  it('objectif atteint et objectif en reps', () => {
    const h = historique('dc', [95, 100]);
    const { etat } = evaluerObjectif(obj({}), donnees(h), AUJ);
    expect(etat.atteint).toBe(true);
    expect(conseilsObjectif(obj({}), etat, [])[0].regle).toBe('atteint');
    const t = historique('tr', [0, 0, 0], 12);
    const e2 = etatObjectif({ mesure: 'reps', cible: 15 }, evaluerObjectif(obj({ exerciceId: 'tr', mesure: 'reps', cible: 15 }), donnees(t), AUJ).points, AUJ);
    expect(e2.actuel).toBe(12);
    expect(e2.reste).toBe(3);
  });

  it('objectif série N × X kg : équivalent Epley, « à tenter », puis atteint avec une vraie série', () => {
    // 6 × 78 kg → 1RM ≈ 93,6 → équivalent 8 reps ≈ 73,9 kg
    const h = historique('dc', [70, 72, 74, 76, 78], 6);
    const o = obj({ mesure: 'serie', cible: 75, reps: 8 });
    const r1 = evaluerObjectif(o, donnees(h), AUJ);
    expect(r1.etat.actuel).toBeCloseTo(73.9, 1);
    expect(r1.etat.atteint).toBe(false);
    expect(r1.etat.statut).toBe('en_progres');
    expect(phraseMarge(o, r1.etat)).toMatch(/^équivalent 8 × 74 \/ 75 kg, reste 1 kg/);
    expect(conseilsObjectif(o, r1.etat, r1.points, 'barre', 5).map((c) => c.regle)).toContain('reps_cible');
    // 5 × 82 kg : équivalent 8 reps > 75 kg, mais aucune vraie série de 8 à 75 kg.
    const h2 = historique('dc', [76, 78, 80, 82], 5);
    const r2 = evaluerObjectif(o, donnees(h2), AUJ);
    expect(r2.etat.atteint).toBe(false);
    expect(r2.etat.statut).toBe('a_tenter');
    expect(conseilsObjectif(o, r2.etat, r2.points)[0].regle).toBe('tenter');
    // 8 × 75 kg réellement fait.
    const h3 = historique('dc', [70, 75], 8);
    expect(evaluerObjectif(o, donnees(h3), AUJ).etat.atteint).toBe(true);
    // 1 × 100 kg : 1 rep, équivalent = 1RM estimé.
    const o1 = obj({ mesure: 'serie', cible: 100, reps: 1 });
    expect(evaluerObjectif(o1, donnees(historique('dc', [90], 3)), AUJ).etat.actuel).toBeCloseTo(99, 0);
  });

  it('pas assez de données : statut « à suivre » et conseil pour en avoir', () => {
    const h = historique('dc', [80]);
    const { etat, points } = evaluerObjectif(obj({}), donnees(h), AUJ);
    expect(etat.statut).toBe('pas_assez');
    expect(conseilsObjectif(obj({}), etat, points)[0].regle).toBe('donnees');
  });
});

describe('objectifs dans les exports', () => {
  const h = historique('dc', [80, 81, 82, 83, 84, 85]);
  const d = {
    exercices: [{ id: 'dc', nom: 'Développé couché', equipement: 'barre', modeCharge: 'total', groupesMusculaires: [], archive: false }],
    variantes: [],
    modeles: [],
    seances: h.seances,
    series: h.series,
    objectifs: [obj({ echeance: '2027-03-01' })],
  } as never;

  it('résumé IA : section « Mes objectifs » et question qui y renvoie', () => {
    const t = construireResume(d, {}, AUJ);
    expect(t).toContain('## Mes objectifs');
    expect(t).toContain('Développé couché : objectif Charge max 100 kg d’ici le 01/03/2027 ; actuel 85 kg, reste 15 kg (85 % de la cible)');
    expect(t).toContain('date estimée à ce rythme : 16/02/2027');
    expect(t).toContain('au regard de mes objectifs');
  });

  it('CSV : colonnes objectif sur les lignes de l’exercice', () => {
    const lignes = lignesCsv(d, {}, AUJ);
    const col = (c: string) => (COLONNES_CSV as readonly string[]).indexOf(c);
    expect(lignes[0].length).toBe(COLONNES_CSV.length);
    expect(lignes[0][col('objectif')]).toBe('Charge max 100 kg');
    expect(lignes[0][col('objectif_cible')]).toBe('100');
    expect(lignes[0][col('objectif_actuel')]).toBe('85');
    expect(lignes[0][col('objectif_reste')]).toBe('15');
    expect(lignes[0][col('objectif_date_visee')]).toBe('2027-03-01');
    expect(lignes[0][col('objectif_date_estimee')]).toBe('2027-02-16');
  });

  it('plusieurs objectifs sur un exercice : tous dans le résumé, séparés par | dans le CSV', () => {
    const d2 = { ...(d as object), objectifs: [obj({ id: 'a', mesure: 'serie', cible: 100, reps: 1, creeLe: '1' }), obj({ id: 'b', mesure: 'serie', cible: 75, reps: 8, creeLe: '2' })] } as never;
    const t = construireResume(d2, {}, AUJ);
    expect(t).toContain('Développé couché : objectif 1RM 100 kg');
    expect(t).toContain('Développé couché : objectif charge d’entraînement 8 × 75 kg');
    const l = lignesCsv(d2, {}, AUJ)[0];
    expect(l[(COLONNES_CSV as readonly string[]).indexOf('objectif')]).toBe('1RM 100 kg | 8 × 75 kg');
  });

  it('sauvegarde v2 importée : table objectifs ajoutée vide', () => {
    const m = migrerExport({ schemaVersion: 2, exporteLe: '', donnees: { exercices: [] } });
    expect(m.donnees.objectifs).toEqual([]);
  });
});
