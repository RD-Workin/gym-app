// Résumé texte d'une période, à coller dans un message à un coach ou à une IA. Propriétaire : 06-donnees.
import { signeLest, unRmEstime, volume } from '../../core/calculs';
import type { Exercice, Modele, Objectif, Seance, Serie, Variante } from '../../core/types';
import { evaluerObjectif, libelleCible, LIBELLE_STATUT, repsCible, uniteMesure } from '../objectifs/calculs';
import { poidsParSeance } from '../progression/calculs';
import { dansPeriode, type Periode } from './exporter';

export interface DonneesResume {
  exercices: Exercice[];
  variantes: Variante[];
  modeles: Modele[];
  seances: Seance[];
  series: Serie[];
  objectifs?: Objectif[];
}

const nb = (v: number, dec = 1) => {
  const f = 10 ** dec;
  return String(Math.round(v * f) / f).replace('.', ',');
};
const jour = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
};
const jourCourt = (iso: string) => jour(iso).slice(0, 5);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function ecart(a: number, b: number, unite: string, dec = 1): string {
  const p = a ? Math.round(((b - a) / a) * 100) : null;
  const pct = p == null ? '' : p === 0 ? ' (stable)' : ` (${p > 0 ? '+' : ''}${p} %)`;
  return `${nb(a, dec)} → ${nb(b, dec)} ${unite}${pct}`;
}

/** « 65×8 », « +10×8 » (lest), « PDC×12 » (sans charge), suivi du RIR / type. */
function serieCourte(s: Serie): string {
  const c = s.chargeKg;
  const charge =
    s.modeCharge === 'sans_charge' ? 'PDC' : s.modeCharge === 'lest' ? (c ? `${signeLest(c)}${nb(c)}` : 'PDC') : c != null ? nb(c) : '?';
  const extras: string[] = [];
  if (s.type === 'echec') extras.push('échec');
  if (s.type === 'degressive') extras.push('dégressive');
  if (s.rir != null) extras.push(`RIR ${s.rir}`);
  // Série tenue : « 45 s », « +10 45 s » (lest).
  const coeur = s.dureeSec != null ? `${charge === 'PDC' ? '' : `${charge} `}${s.dureeSec} s` : `${charge}×${s.reps}`;
  return `${s.type === 'echauffement' ? 'échauff. ' : ''}${coeur}${extras.length ? ` (${extras.join(', ')})` : ''}`;
}

interface Passage {
  seance: Seance;
  series: Serie[]; // toutes, dans l'ordre
}

/** Indicateurs d'une séance pour un exercice (séries de travail seulement). */
function indicateurs(p: Passage) {
  const pc = p.seance.contexte?.poidsCorporelKg;
  const travail = p.series.filter((s) => s.type !== 'echauffement');
  let rm = 0;
  let charge = 0;
  let vol = 0;
  let reps = 0;
  let duree = 0;
  for (const s of travail) {
    if (s.dureeSec != null) {
      duree = Math.max(duree, s.dureeSec);
      charge = Math.max(charge, s.chargeKg ?? 0);
      continue;
    }
    rm = Math.max(rm, unRmEstime(s, pc) ?? 0);
    charge = Math.max(charge, s.chargeKg ?? 0); // telle que saisie : par haltère, lest seul…
    vol += volume(s, pc);
    reps = Math.max(reps, s.reps);
  }
  return { rm, charge, vol, reps, duree, nbSeries: travail.length };
}

function precisionCharge(e: Exercice | undefined): string {
  switch (e?.modeCharge) {
    case 'par_main':
      return ' — charge par haltère/main';
    case 'lest':
      return ' — lest ajouté au poids du corps';
    case 'sans_charge':
      return ' — poids du corps';
    default:
      return '';
  }
}

/**
 * Texte prêt à coller : contexte de la période, poids de corps début → fin, puis pour chaque exercice
 * le nombre de séances, la 1re et la dernière fois, et l'évolution (1RM estimé, charge max, reps, volume).
 * Le détail séance par séance suit. Données seulement : la question, c'est l'utilisateur qui la pose.
 */
export function construireResume(d: DonneesResume, periode: Periode = {}, aujourdhui = new Date()): string {
  const exo = new Map(d.exercices.map((e) => [e.id, e]));
  const vari = new Map(d.variantes.map((v) => [v.id, v.nom]));
  const mod = new Map(d.modeles.map((m) => [m.id, m.nom]));
  const seances = d.seances.filter((s) => dansPeriode(s.debut, periode)).sort((a, b) => a.debut.localeCompare(b.debut));
  const ids = new Set(seances.map((s) => s.id));
  const seriesParSeance = new Map<string, Serie[]>();
  for (const s of d.series) {
    if (!ids.has(s.seanceId)) continue;
    (seriesParSeance.get(s.seanceId) ?? seriesParSeance.set(s.seanceId, []).get(s.seanceId)!).push(s);
  }
  for (const l of seriesParSeance.values()) l.sort((a, b) => a.ordre - b.ordre);
  const actives = seances.filter((s) => seriesParSeance.get(s.id)?.length);

  const L: string[] = [];
  if (!actives.length) return 'Aucune séance enregistrée sur cette période.';
  const debut = actives[0].debut;
  const fin = actives[actives.length - 1].debut;
  const du = periode.du ?? debut.slice(0, 10);
  const au = periode.au ?? fin.slice(0, 10);
  L.push(`# Mes séances de musculation du ${jour(du)} au ${jour(au)}`);
  L.push('');

  // --- Vue d'ensemble
  const joursPeriode = Math.max(1, Math.round((Date.parse(au) - Date.parse(du)) / 86_400_000) + 1);
  const parModele = new Map<string, number>();
  for (const s of actives) {
    const nom = s.modeleId ? mod.get(s.modeleId) ?? 'Séance' : 'Libre';
    parModele.set(nom, (parModele.get(nom) ?? 0) + 1);
  }
  const totalSeries = actives.reduce((n, s) => n + seriesParSeance.get(s.id)!.filter((x) => x.type !== 'echauffement').length, 0);
  L.push('## Vue d’ensemble');
  L.push(
    `- ${pluriel(actives.length, 'séance')} en ${pluriel(joursPeriode, 'jour')}` +
      (joursPeriode >= 7 ? `, soit ${nb((actives.length * 7) / joursPeriode)} par semaine` : '') +
      ` : ${[...parModele].map(([n, c]) => `${n} ×${c}`).join(', ')}`,
  );
  L.push(`- ${pluriel(totalSeries, 'série')} de travail au total (échauffements exclus)`);
  const pesees = actives.filter((s) => s.contexte?.poidsCorporelKg != null);
  if (pesees.length) {
    const p0 = pesees[0];
    const p1 = pesees[pesees.length - 1];
    L.push(
      pesees.length > 1
        ? `- Poids de corps : ${nb(p0.contexte.poidsCorporelKg!)} kg le ${jourCourt(p0.debut)} → ${nb(p1.contexte.poidsCorporelKg!)} kg le ${jourCourt(p1.debut)} (${p1.contexte.poidsCorporelKg! - p0.contexte.poidsCorporelKg! >= 0 ? '+' : ''}${nb(p1.contexte.poidsCorporelKg! - p0.contexte.poidsCorporelKg!)} kg)`
        : `- Poids de corps : ${nb(p0.contexte.poidsCorporelKg!)} kg le ${jourCourt(p0.debut)} (une seule pesée)`,
    );
  } else {
    L.push('- Poids de corps : non renseigné');
  }
  L.push('');
  L.push('Notation : charge en kg × reps. « +10 » = lest ajouté au poids du corps, « −15 » = aidé de 15 kg (élastique, machine), PDC = poids du corps seul. « 45 s » = série tenue 45 secondes (gainage, dead hang…). RIR = reps en réserve. 1RM estimé : formule d’Epley sur les séries ≤ 12 reps, poids du corps inclus pour les exercices lestés. Volume = charge × reps des séries de travail.');
  L.push('');

  // --- Objectifs (état à aujourd'hui, sur tout l'historique : référentiel pour le coach / l'IA)
  const objectifs = d.objectifs ?? [];
  if (objectifs.length) {
    const seancesParId = new Map(d.seances.map((s) => [s.id, s]));
    const poids = poidsParSeance(d.seances);
    L.push('## Mes objectifs');
    L.push('Valeurs comparables aux cibles : 1RM estimé et charge max en charge effective (les 2 haltères additionnées, poids du corps inclus pour les exercices lestés) ; reps = meilleure série de travail. « Actuel » = meilleure valeur des 8 dernières semaines. Objectifs « 1RM X kg » (1 rep au max visé) et « charge d’entraînement N × X kg » (charge telle que notée) : « actuel » = 1RM estimé ou charge que je tiendrais pour N reps d’après ma meilleure série récente (Epley) ; atteint seulement si j’ai vraiment fait la série.');
    for (const o of [...objectifs].sort((a, b) => (exo.get(a.exerciceId)?.nom ?? '').localeCompare(exo.get(b.exerciceId)?.nom ?? '', 'fr') || a.creeLe.localeCompare(b.creeLe))) {
      const { etat: e } = evaluerObjectif(o, { series: d.series, seancesParId, poids }, aujourdhui);
      const u = uniteMesure(o.mesure);
      const nom = exo.get(o.exerciceId)?.nom ?? '(exercice supprimé)';
      const variante = o.varianteId ? ` (${vari.get(o.varianteId) ?? 'variante'})` : '';
      const serie = o.mesure === 'serie';
      const actuel = (v: number) => (serie ? `équivalent actuel ${repsCible(o)} × ${nb(v)} kg` : `actuel ${nb(v)} ${u}`);
      const morceaux = [`objectif ${serie && repsCible(o) > 1 ? 'charge d’entraînement ' : ''}${libelleCible(o)}${o.echeance ? ` d’ici le ${jour(o.echeance)}` : ''}`];
      morceaux.push(
        e.actuel == null
          ? 'pas encore de mesure'
          : e.atteint
            ? serie ? 'atteint (série réellement faite)' : `${actuel(e.actuel)}, atteint`
            : e.statut === 'a_tenter'
              ? `${actuel(e.actuel)} : niveau suffisant, série pas encore réalisée`
              : `${actuel(e.actuel)}, reste ${nb(e.reste)} ${u} (${Math.round(e.pourcentage)} % de la cible)`,
      );
      if (e.rythme != null) morceaux.push(`rythme ${e.rythme >= 0 ? '+' : ''}${nb(e.rythme)} ${u}/semaine sur 12 semaines`);
      if (!e.atteint && e.projection) morceaux.push(`date estimée à ce rythme : ${jour(e.projection)}`);
      if (e.rythmeRequis != null) morceaux.push(`rythme nécessaire pour la date visée : +${nb(e.rythmeRequis)} ${u}/semaine`);
      morceaux.push(`${nb(e.frequence)} séance(s)/semaine sur cet exercice ce dernier mois`);
      morceaux.push(`statut : ${LIBELLE_STATUT[e.statut].toLowerCase()}`);
      L.push(`- ${nom}${variante} : ${morceaux.join(' ; ')}`);
    }
    L.push('');
  }

  // --- Évolution par exercice
  const passages = new Map<string, Passage[]>();
  for (const s of actives) {
    const parExo = new Map<string, Serie[]>();
    for (const x of seriesParSeance.get(s.id)!) (parExo.get(x.exerciceId) ?? parExo.set(x.exerciceId, []).get(x.exerciceId)!).push(x);
    for (const [e, l] of parExo) (passages.get(e) ?? passages.set(e, []).get(e)!).push({ seance: s, series: l });
  }
  const nomExo = (id: string) => exo.get(id)?.nom ?? '(exercice supprimé)';
  const ordreExos = [...passages.keys()].sort((a, b) => passages.get(b)!.length - passages.get(a)!.length || nomExo(a).localeCompare(nomExo(b), 'fr'));

  L.push('## Évolution par exercice (première → dernière séance de la période)');
  for (const id of ordreExos) {
    const ps = passages.get(id)!;
    const e = exo.get(id);
    const nbSeries = ps.reduce((n, p) => n + indicateurs(p).nbSeries, 0);
    L.push('');
    L.push(`### ${nomExo(id)}${precisionCharge(e)}`);
    L.push(`- ${pluriel(ps.length, 'séance')}, ${pluriel(nbSeries, 'série')} de travail`);
    const a = ps[0];
    const b = ps[ps.length - 1];
    const liste = (p: Passage) => p.series.map(serieCourte).join(' · ');
    if (ps.length === 1) {
      L.push(`- ${jourCourt(a.seance.debut)} : ${liste(a)}`);
      continue;
    }
    L.push(`- Début (${jourCourt(a.seance.debut)}) : ${liste(a)}`);
    L.push(`- Fin (${jourCourt(b.seance.debut)}) : ${liste(b)}`);
    const ia = indicateurs(a);
    const ib = indicateurs(b);
    const evol: string[] = [];
    if (ia.rm && ib.rm) evol.push(`1RM estimé ${ecart(ia.rm, ib.rm, 'kg')}`);
    const libCharge = e?.modeCharge === 'lest' ? 'lest max' : e?.modeCharge === 'par_main' ? 'charge max par haltère' : 'charge max';
    if (ia.charge && ib.charge) evol.push(`${libCharge} ${ecart(ia.charge, ib.charge, 'kg')}`);
    if (ia.duree || ib.duree) evol.push(`temps tenu max ${ia.duree} → ${ib.duree} s`);
    else evol.push(`reps max ${ia.reps} → ${ib.reps}`);
    if (ia.vol && ib.vol) evol.push(`volume de la séance ${ecart(ia.vol, ib.vol, 'kg', 0)}`);
    L.push(`- Évolution : ${evol.join(' ; ')}`);
    const meilleur = ps.reduce((m, p) => (indicateurs(p).rm > indicateurs(m).rm ? p : m), a);
    if (meilleur !== a && meilleur !== b && indicateurs(meilleur).rm) {
      L.push(`- Meilleure séance : ${jourCourt(meilleur.seance.debut)} (1RM estimé ${nb(indicateurs(meilleur).rm)} kg)`);
    }
  }
  L.push('');

  // --- Détail
  L.push('## Détail des séances');
  for (const s of actives) {
    const dt = new Date(s.debut);
    const jourSemaine = Number.isNaN(dt.getTime()) ? '' : `${dt.toLocaleDateString('fr-FR', { weekday: 'short' })} `;
    const ctx: string[] = [];
    if (s.contexte?.poidsCorporelKg != null) ctx.push(`${nb(s.contexte.poidsCorporelKg)} kg`);
    if (s.contexte?.temperatureC != null) ctx.push(`${nb(s.contexte.temperatureC, 0)} °C`);
    L.push('');
    L.push(
      `**${s.modeleId ? mod.get(s.modeleId) ?? 'Séance' : 'Libre'} — ${jourSemaine}${jourCourt(s.debut)}**` +
        (ctx.length ? ` (${ctx.join(', ')})` : '') +
        (s.note ? ` · « ${s.note} »` : ''),
    );
    const parExo = new Map<string, Serie[]>();
    for (const x of seriesParSeance.get(s.id)!) {
      const cle = `${x.exerciceId}|${x.varianteId ?? ''}`;
      (parExo.get(cle) ?? parExo.set(cle, []).get(cle)!).push(x);
    }
    for (const [cle, l] of parExo) {
      const [eid, vid] = cle.split('|');
      const notes = l.map((x) => x.note).filter(Boolean);
      const reglage = l.find((x) => x.reglagesMachine)?.reglagesMachine;
      L.push(
        `- ${nomExo(eid)}${vid ? ` (${vari.get(vid) ?? 'variante'})` : ''}${reglage ? ` [${reglage}]` : ''} : ${l.map(serieCourte).join(' · ')}` +
          (notes.length ? ` — ${notes.join(' ; ')}` : ''),
      );
    }
  }
  return L.join('\n') + '\n';
}

/**
 * Résumé d'une seule séance (libre ou issue d'un modèle) : contexte, puis pour chaque exercice les séries,
 * la dernière fois qu'il a été fait avant et l'écart (1RM estimé, charge, reps, volume), et s'il bat le record.
 */
export function construireResumeSeance(d: DonneesResume, seanceId: string): string {
  const seance = d.seances.find((s) => s.id === seanceId);
  if (!seance) return 'Séance introuvable.';
  const exo = new Map(d.exercices.map((e) => [e.id, e]));
  const vari = new Map(d.variantes.map((v) => [v.id, v.nom]));
  const nomModele = seance.modeleId ? d.modeles.find((m) => m.id === seance.modeleId)?.nom ?? 'Séance' : 'Séance libre';
  const seancesParId = new Map(d.seances.map((s) => [s.id, s]));
  const siennes = d.series.filter((s) => s.seanceId === seanceId).sort((a, b) => a.ordre - b.ordre);
  if (!siennes.length) return 'Aucune série enregistrée dans cette séance.';
  const nomExo = (id: string) => exo.get(id)?.nom ?? '(exercice supprimé)';

  const L: string[] = [];
  const dt = new Date(seance.debut);
  const jourSemaine = Number.isNaN(dt.getTime()) ? '' : `${dt.toLocaleDateString('fr-FR', { weekday: 'long' })} `;
  L.push(`# Ma séance de musculation : ${nomModele}, ${jourSemaine}${jour(seance.debut)}`);
  L.push('');
  const ctx: string[] = [`- Début ${seance.debut.slice(11, 16)}`];
  if (seance.fin) {
    const min = Math.round((Date.parse(seance.fin) - Date.parse(seance.debut)) / 60_000);
    if (min > 0) ctx[0] += `, durée ${min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`}`;
  }
  L.push(ctx[0]);
  if (seance.contexte?.poidsCorporelKg != null) L.push(`- Poids de corps : ${nb(seance.contexte.poidsCorporelKg)} kg`);
  if (seance.contexte?.temperatureC != null) L.push(`- Température : ${nb(seance.contexte.temperatureC, 0)} °C`);
  if (seance.contexte?.lieu) L.push(`- Lieu : ${seance.contexte.lieu}`);
  if (seance.note) L.push(`- Ressenti : « ${seance.note} »`);
  const ordre: string[] = [];
  for (const s of siennes) if (!ordre.includes(s.exerciceId)) ordre.push(s.exerciceId);
  const travail = siennes.filter((s) => s.type !== 'echauffement');
  L.push(`- ${pluriel(ordre.length, 'exercice')}, ${pluriel(travail.length, 'série')} de travail`);
  L.push('');
  L.push('Notation : charge en kg × reps. « +10 » = lest ajouté au poids du corps, « −15 » = aidé de 15 kg (élastique, machine), PDC = poids du corps seul. RIR = reps en réserve. 1RM estimé : formule d’Epley sur les séries ≤ 12 reps, poids du corps inclus pour les exercices lestés. Volume = charge × reps des séries de travail. « La fois d’avant » = la dernière séance précédente où j’ai fait l’exercice.');
  L.push('');
  L.push('## Exercices, dans l’ordre');

  // Séances antérieures, par exercice
  const avant = new Map<string, Map<string, Serie[]>>(); // exerciceId → seanceId → séries
  for (const s of d.series) {
    if (s.seanceId === seanceId || !ordre.includes(s.exerciceId)) continue;
    const se = seancesParId.get(s.seanceId);
    if (!se || se.debut >= seance.debut) continue;
    const m = avant.get(s.exerciceId) ?? avant.set(s.exerciceId, new Map()).get(s.exerciceId)!;
    (m.get(s.seanceId) ?? m.set(s.seanceId, []).get(s.seanceId)!).push(s);
  }

  for (const id of ordre) {
    const e = exo.get(id);
    const l = siennes.filter((s) => s.exerciceId === id);
    const p: Passage = { seance, series: l };
    const i = indicateurs(p);
    const vid = l.find((s) => s.varianteId)?.varianteId;
    const reglage = l.find((s) => s.reglagesMachine)?.reglagesMachine;
    L.push('');
    L.push(`### ${nomExo(id)}${vid ? ` (${vari.get(vid) ?? 'variante'})` : ''}${precisionCharge(e)}${l[0].supersetId ? ' — en superset' : ''}`);
    L.push(`- Séries : ${l.map(serieCourte).join(' · ')}${reglage ? ` [${reglage}]` : ''}`);
    const notes = l.map((s) => s.note).filter(Boolean);
    if (notes.length) L.push(`- Notes : ${notes.join(' ; ')}`);
    const precedentes = [...(avant.get(id) ?? new Map<string, Serie[]>())]
      .map(([sid, ss]) => ({ seance: seancesParId.get(sid)!, series: ss.sort((a, b) => a.ordre - b.ordre) }))
      .sort((a, b) => a.seance.debut.localeCompare(b.seance.debut));
    if (!precedentes.length) {
      L.push('- Première fois que je fais cet exercice dans l’app');
      continue;
    }
    const prec = precedentes[precedentes.length - 1];
    const ip = indicateurs(prec);
    L.push(`- La fois d’avant (${jourCourt(prec.seance.debut)}, il y a ${pluriel(Math.max(0, Math.round((Date.parse(seance.debut) - Date.parse(prec.seance.debut)) / 86_400_000)), 'jour')}) : ${prec.series.map(serieCourte).join(' · ')}`);
    const evol: string[] = [];
    if (ip.rm && i.rm) evol.push(`1RM estimé ${ecart(ip.rm, i.rm, 'kg')}`);
    const libCharge = e?.modeCharge === 'lest' ? 'lest max' : e?.modeCharge === 'par_main' ? 'charge max par haltère' : 'charge max';
    if (ip.charge && i.charge) evol.push(`${libCharge} ${ecart(ip.charge, i.charge, 'kg')}`);
    evol.push(`reps max ${ip.reps} → ${i.reps}`);
    if (ip.vol && i.vol) evol.push(`volume ${ecart(ip.vol, i.vol, 'kg', 0)}`);
    L.push(`- Écart : ${evol.join(' ; ')}`);
    const record = Math.max(...precedentes.map((x) => indicateurs(x).rm));
    if (i.rm && record) {
      L.push(
        i.rm > record
          ? `- Nouveau record de 1RM estimé (ancien : ${nb(record)} kg)`
          : `- Record de 1RM estimé : ${nb(record)} kg (${Math.round((i.rm / record) * 100)} % atteint aujourd’hui)`,
      );
    }
    L.push(`- Déjà fait ${precedentes.length} fois avant cette séance`);
  }
  return L.join('\n') + '\n';
}
