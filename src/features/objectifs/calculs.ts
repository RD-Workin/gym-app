// Objectifs par exercice : marge, rythme, projection et conseils. Fonctions pures, sans IA ni accès à la base.
// Les valeurs sont celles de la courbe de progression (1RM estimé, charge max effective) pour rester cohérent.
import type { Equipement, Id, MesureObjectif, Objectif, Seance, Serie } from '../../core/types';
import { fmtDuree } from '../../core/calculs';
import { kg, pointsExercice, type FiltreVariante, type PointSeance } from '../progression/calculs';

const JOUR = 864e5;
const SEMAINE = 7 * JOUR;
/** Fenêtre de la valeur « actuelle » : meilleure valeur des 8 dernières semaines. */
const FENETRE_ACTUEL = 56;
/** Fenêtre du rythme : 12 dernières semaines, comme la tendance de la fiche. */
const FENETRE_RYTHME = 84;

export const NOM_MESURE: { [m in MesureObjectif]: string } = {
  serie: 'Série',
  un_rm: '1RM estimé',
  charge_max: 'Record perso (PR)',
  reps: 'Reps (meilleure série)',
  duree: 'Temps tenu (meilleure série)',
};
export const uniteMesure = (m: MesureObjectif) => (m === 'reps' ? 'reps' : m === 'duree' ? 's' : 'kg');

/** Epley, avec 1 rep = la charge elle-même (même règle que src/core/calculs.ts). */
export const epley = (charge: number, reps: number) => (reps <= 1 ? charge : charge * (1 + reps / 30));
/** Charge équivalente pour `reps` reps à partir d'un 1RM estimé. */
export const chargePourReps = (unRm: number, reps: number) => (reps <= 1 ? unRm : unRm / (1 + reps / 30));
const REPS_MAX_EQUIVALENT = 20;

type ObjectifCalc = Pick<Objectif, 'mesure' | 'cible' | 'echeance' | 'reps'>;
export const repsCible = (o: Pick<Objectif, 'reps'>) => Math.max(1, o.reps ?? 1);

/** Une série réelle remplit-elle l'objectif « N reps à X kg » ? (charge telle que notée) */
export const remplitSerie = (s: Pick<Serie, 'chargeKg' | 'reps'>, o: Pick<Objectif, 'cible' | 'reps'>) =>
  (s.chargeKg ?? 0) >= o.cible && s.reps >= repsCible(o);

export function valeurPoint(p: PointSeance, o: MesureObjectif | Pick<Objectif, 'mesure' | 'reps'>): number | null {
  const m = typeof o === 'string' ? o : o.mesure;
  if (m === 'serie') {
    // Meilleure série de la séance ramenée à l'équivalent « N reps » (Epley), charge telle que notée.
    const r = typeof o === 'string' ? 1 : repsCible(o);
    let best: number | null = null;
    for (const s of p.series) {
      if (s.reps < 1 || s.reps > REPS_MAX_EQUIVALENT) continue;
      let v: number;
      if (s.modeCharge === 'lest' && p.poidsKg != null) {
        // Lest (négatif = aide) : l'équivalence se calcule sur la charge réelle (poids du corps + lest), puis on retire le poids.
        const reelle = p.poidsKg + (s.chargeKg ?? 0);
        if (reelle <= 0) continue;
        v = chargePourReps(epley(reelle, s.reps), r) - p.poidsKg;
      } else {
        if (!s.chargeKg || s.chargeKg <= 0) continue;
        v = chargePourReps(epley(s.chargeKg, s.reps), r);
      }
      if (best == null || v > best) best = v;
    }
    return best;
  }
  if (m === 'un_rm') return p.unRm;
  if (m === 'charge_max') return p.chargeMax;
  if (m === 'duree') return p.dureeMax;
  return p.series.length ? Math.max(...p.series.map((s) => s.reps)) : null;
}

/** Dernier poids du corps connu si l'exercice se note en lest, sinon 0. */
function poidsLest(points: PointSeance[]): number {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].series[0]?.modeCharge !== 'lest') return 0;
    if (points[i].poidsKg != null) return points[i].poidsKg!;
  }
  return 0;
}

/** Filtre de variante d'un objectif : sa variante, sinon le standard s'il existe, sinon tout. */
export function filtreObjectif(o: Pick<Objectif, 'exerciceId' | 'varianteId'>, series: Serie[]): FiltreVariante {
  if (o.varianteId) return o.varianteId;
  return series.some((s) => s.exerciceId === o.exerciceId && !s.varianteId && s.type !== 'echauffement') ? null : undefined;
}

export type StatutObjectif = 'atteint' | 'a_tenter' | 'en_avance' | 'dans_les_temps' | 'en_retard' | 'en_progres' | 'stagne' | 'pas_assez';

export interface EtatObjectif {
  /** Meilleure valeur des 8 dernières semaines (sinon dernière valeur connue). */
  actuel: number | null;
  /** Meilleure valeur de tout l'historique. */
  meilleur: number | null;
  reste: number;
  /** actuel / cible, 0 à 100. */
  pourcentage: number;
  atteint: boolean;
  /** Progression par semaine (droite de tendance sur 12 semaines). `null` si pas assez de séances. */
  rythme: number | null;
  /** Date estimée d'atteinte au rythme actuel (AAAA-MM-JJ), si le rythme est positif et l'horizon < 2 ans. */
  projection: string | null;
  /** Progression par semaine nécessaire pour tenir l'échéance. */
  rythmeRequis: number | null;
  semainesRestantes: number | null;
  /** Séances par semaine sur les 4 dernières semaines. */
  frequence: number;
  /** Semaines écoulées depuis le dernier meilleur (si au moins 3 séances depuis). */
  semainesSansProgres: number;
  nbSeances: number;
  statut: StatutObjectif;
}

const jourIso = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Pente (par semaine) de la droite des moindres carrés. `null` si moins de 3 points ou moins de 2 semaines. */
export function pente(pts: { t: number; v: number }[]): number | null {
  if (pts.length < 3) return null;
  const t0 = pts[0].t;
  if (pts[pts.length - 1].t - t0 < 14 * JOUR) return null;
  const xs = pts.map((p) => (p.t - t0) / SEMAINE);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => {
    num += (xs[i] - mx) * (p.v - my);
    den += (xs[i] - mx) ** 2;
  });
  return den ? num / den : null;
}

export function etatObjectif(o: ObjectifCalc, points: PointSeance[], maintenant = new Date()): EtatObjectif {
  const now = maintenant.getTime();
  const pts = points
    .map((p) => ({ t: new Date(p.date).getTime(), v: valeurPoint(p, o) }))
    .filter((p): p is { t: number; v: number } => p.v != null && p.t <= now)
    .sort((a, b) => a.t - b.t);

  const recents = pts.filter((p) => p.t >= now - FENETRE_ACTUEL * JOUR);
  const actuel = recents.length ? Math.max(...recents.map((p) => p.v)) : pts.length ? pts[pts.length - 1].v : null;
  const meilleur = pts.length ? Math.max(...pts.map((p) => p.v)) : null;
  // Série : atteint seulement avec une vraie série N reps × X kg ces 8 dernières semaines (l'équivalent ne suffit pas).
  const recent = (p: PointSeance) => {
    const t = new Date(p.date).getTime();
    return t >= now - FENETRE_ACTUEL * JOUR && t <= now;
  };
  const atteint =
    o.mesure === 'serie' ? points.some((p) => recent(p) && p.series.some((s) => remplitSerie(s, o))) : actuel != null && actuel >= o.cible;
  const pret = !atteint && actuel != null && actuel >= o.cible;
  const reste = actuel == null ? o.cible : Math.max(0, o.cible - actuel);
  // Lest : la jauge compare les charges réelles (poids du corps + lest), car la cible peut valoir 0 ou être négative.
  const decalage = o.mesure === 'serie' ? poidsLest(points) : 0;
  const pourcentage = actuel == null || o.cible + decalage <= 0 ? 0 : Math.max(0, Math.min(100, ((actuel + decalage) / (o.cible + decalage)) * 100));

  const rythme = pente(pts.filter((p) => p.t >= now - FENETRE_RYTHME * JOUR));
  let projection: string | null = null;
  if (!atteint && !pret && rythme != null && rythme > 0) {
    const semaines = reste / rythme;
    if (semaines <= 104) projection = jourIso(now + semaines * SEMAINE);
  }

  let rythmeRequis: number | null = null;
  let semainesRestantes: number | null = null;
  if (o.echeance) {
    semainesRestantes = (new Date(`${o.echeance}T23:59:59`).getTime() - now) / SEMAINE;
    if (!atteint && !pret && semainesRestantes > 0) rythmeRequis = reste / Math.max(1, semainesRestantes);
  }

  const frequence = pts.filter((p) => p.t >= now - 28 * JOUR).length / 4;

  // Stagnation : le meilleur n'a pas bougé depuis N semaines alors qu'on a continué à s'entraîner.
  let semainesSansProgres = 0;
  if (meilleur != null) {
    const iBest = pts.findIndex((p) => p.v === meilleur);
    if (pts.length - 1 - iBest >= 3) semainesSansProgres = Math.floor((now - pts[iBest].t) / SEMAINE);
  }

  let statut: StatutObjectif;
  if (atteint) statut = 'atteint';
  else if (pret) statut = 'a_tenter';
  else if (pts.length < 3 || rythme == null) statut = 'pas_assez';
  else if (semainesSansProgres >= 3 || rythme <= 0) statut = 'stagne';
  else if (rythmeRequis != null) statut = rythme >= rythmeRequis * 1.15 ? 'en_avance' : rythme >= rythmeRequis * 0.9 ? 'dans_les_temps' : 'en_retard';
  else if (o.echeance && semainesRestantes != null && semainesRestantes <= 0) statut = 'en_retard';
  else statut = 'en_progres';

  return { actuel, meilleur, reste, pourcentage, atteint, rythme, projection, rythmeRequis, semainesRestantes, frequence, semainesSansProgres, nbSeances: pts.length, statut };
}

export const LIBELLE_STATUT: { [s in StatutObjectif]: string } = {
  atteint: 'Atteint',
  a_tenter: 'À tenter',
  en_avance: 'En avance',
  dans_les_temps: 'Dans les temps',
  en_retard: 'En retard',
  en_progres: 'En progrès',
  stagne: 'Stagne',
  pas_assez: 'À suivre',
};

// ---------------------------------------------------------------- Conseils (règles, pas d'IA)

const nb = (v: number, dec = 1) => (Math.round(v * 10 ** dec) / 10 ** dec).toLocaleString('fr-FR', { maximumFractionDigits: dec });
const arrondiA = (v: number, pas: number) => Math.round(v / pas) * pas;
export const dateFr = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Saut de charge conseillé selon le matériel. */
const saut = (eq: Equipement | undefined) => (eq === 'halteres' || eq === 'kettlebell' ? '1 à 2 kg par haltère' : eq === 'machine' || eq === 'poulie' ? 'un cran' : '2,5 kg');

export interface Conseil {
  /** Identifiant stable de la règle (tests, et pour éviter les doublons). */
  regle: string;
  texte: string;
}

/**
 * 2 ou 3 conseils choisis selon la situation, du plus important au moins important.
 * Fondés sur les repères de la fiche « Conseils du coach » (surcharge progressive, fréquence 2×/sem., décharge, plages de reps).
 */
export function conseilsObjectif(
  o: ObjectifCalc,
  e: EtatObjectif,
  points: PointSeance[],
  equipement?: Equipement,
  max = 3,
): Conseil[] {
  const c: Conseil[] = [];
  const u = uniteMesure(o.mesure);
  const duree = o.mesure === 'duree';
  const charge = o.mesure !== 'reps' && !duree;

  if (e.atteint) {
    const suivant =
      o.mesure === 'serie'
        ? `${repsCible(o)} × ${nb(o.cible + 2.5)} kg ou ${repsCible(o) + 1} × ${nb(o.cible)} kg`
        : duree
          ? fmtDuree(arrondiA(o.cible * 1.2, 5))
          : `${nb(o.mesure === 'reps' ? o.cible + 2 : arrondiA(o.cible * 1.05, 2.5))} ${u}`;
    c.push({ regle: 'atteint', texte: `Objectif atteint ! Fixe le suivant un cran plus haut, par exemple ${suivant}.` });
    return c;
  }
  if (e.statut === 'a_tenter') {
    c.push({
      regle: 'tenter',
      texte: `D’après ta meilleure série récente, tu as le niveau : tente ${libelleCible(o)} en début de séance, après l’échauffement et 2 à 3 min de repos.`,
    });
  }
  if (e.nbSeances < 3) {
    c.push({ regle: 'donnees', texte: 'Fais au moins 3 séances de cet exercice sur 2 semaines : l’app pourra estimer ton rythme et une date d’atteinte.' });
  }
  if (e.nbSeances >= 1 && e.frequence < 1) {
    const f = e.frequence === 0 ? 'Tu n’as pas fait cet exercice depuis 4 semaines' : `Tu fais cet exercice environ ${nb(e.frequence)} fois par semaine`;
    c.push({ regle: 'frequence', texte: `${f}. Le travailler 2 fois par semaine fait progresser plus vite qu’une seule grosse séance.` });
  }
  if (e.statut === 'stagne') {
    c.push({
      regle: 'stagnation',
      texte: charge
        ? `Pas de nouveau record depuis ${e.semainesSansProgres || 'plusieurs'} semaines : fais une semaine plus légère (environ −10 % de charge, une série de moins), puis repars, ou change de plage de reps quelques semaines.`
        : duree
          ? `Pas de nouveau record depuis ${e.semainesSansProgres || 'plusieurs'} semaines : ajoute une série tenue, ou passe à une version un peu plus dure moins longtemps (lest, pieds surélevés), puis reviens.`
          : `Pas de nouveau record depuis ${e.semainesSansProgres || 'plusieurs'} semaines : ajoute une série, ou fais des négatives lentes (3–5 s) en fin de séance.`,
    });
  }
  if (e.statut === 'en_retard' && e.rythmeRequis != null) {
    const actuel = e.rythme != null && e.rythme > 0 ? `tu en es à +${nb(e.rythme)}` : 'tu ne progresses pas pour l’instant';
    c.push({
      regle: 'retard',
      texte: `Pour tenir ta date, il faudrait +${nb(e.rythmeRequis)} ${u} par semaine et ${actuel}.` + (e.projection ? ` Une échéance vers le ${dateFr(e.projection)} serait plus réaliste.` : ' Repousse un peu l’échéance ou augmente la fréquence.'),
    });
  }

  // Plage de reps et effort des dernières séances.
  const recentes = points.slice(-3).flatMap((p) => p.series);
  if (recentes.length && !duree) {
    const repsMoy = recentes.reduce((a, s) => a + s.reps, 0) / recentes.length;
    const avecRir = recentes.filter((s) => s.rir != null);
    const rirMoy = avecRir.length ? avecRir.reduce((a, s) => a + s.rir!, 0) / avecRir.length : null;
    if (charge && repsMoy >= 10 && e.actuel && (o.mesure !== 'serie' || repsCible(o) <= 6)) {
      const cibleCharge = o.mesure === 'un_rm' ? ` (vers ${nb(arrondiA(e.actuel * 0.85, 2.5))} kg)` : '';
      c.push({ regle: 'plage', texte: `Tes séries tournent autour de ${Math.round(repsMoy)} reps. Pour gagner en force, ajoute des séries lourdes de 3 à 6 reps${cibleCharge}.` });
    }
    if (rirMoy != null && rirMoy >= 4) {
      c.push({ regle: 'effort', texte: `Tu gardes en moyenne ${nb(rirMoy, 0)} reps en réserve : rapproche-toi de l’échec (1 à 3 en réserve), sinon la séance stimule peu.` });
    }
  }

  if (o.mesure === 'serie' && e.statut !== 'a_tenter' && e.nbSeances >= 1) {
    // Travail ciblé : la charge de l'objectif sur des séries plus courtes, puis une rep de plus par séance.
    const r = repsCible(o);
    if (r >= 3) {
      c.push({ regle: 'reps_cible', texte: `Travaille directement à ${nb(o.cible)} kg : séries de ${Math.max(1, r - 3)} à ${r - 1} reps, puis ajoute une rep par séance jusqu’à ${r}.` });
    }
  }
  if (!e.atteint && e.statut !== 'a_tenter' && e.actuel != null && e.reste / o.cible <= 0.05) {
    c.push({
      regle: 'proche',
      texte: charge
        ? 'Tu es à moins de 5 % : après un bon échauffement, tente une série lourde de 1 à 3 reps en début de séance, avec un pareur si besoin.'
        : duree
          ? 'Tu touches au but : tente ta tenue max en début de séance, bien reposé.'
          : 'Tu touches au but : tente ta série max en début de séance, bien reposé.',
    });
  }
  if (c.length < max) {
    c.push({
      regle: 'surcharge',
      texte: charge
        ? `Surcharge progressive : quand tu fais toutes tes reps cibles avec 1 à 2 en réserve, ajoute ${saut(equipement)} à la séance suivante.`
        : duree
          ? 'Ajoute 5 à 10 s à une série à chaque séance ; quand tu tiens facilement ta cible partout, ajoute un lest ou passe à une version plus dure.'
          : 'Ajoute une rep à une série à chaque séance ; quand tu dépasses ta cible de 2 reps partout, passe à la variante plus dure ou ajoute un lest.',
    });
  }
  if (c.length < max && e.frequence >= 1) {
    c.push({ regle: 'recup', texte: 'Dors 7 h ou plus et mange assez de protéines (1,6 g par kg de poids de corps) : c’est là que la force se construit.' });
  }
  return c.slice(0, max);
}

// ---------------------------------------------------------------- Pour les écrans et les exports

export interface DonneesObjectif {
  series: Serie[];
  seancesParId: Map<Id, Pick<Seance, 'debut'>>;
  poids: Map<Id, number | undefined>;
}

/** Points de l'objectif (bonne variante) puis son état. */
export function evaluerObjectif(o: Objectif, d: DonneesObjectif, maintenant = new Date()) {
  const points = pointsExercice(d.series, d.seancesParId, d.poids, o.exerciceId, filtreObjectif(o, d.series));
  return { points, etat: etatObjectif(o, points, maintenant) };
}

/** Valeur affichée : même arrondi que la courbe (kg) ou entier (reps, secondes). */
export const fmtValeur = (v: number, m: MesureObjectif) => (m === 'reps' || m === 'duree' ? String(Math.round(v)) : kg(v).replace(' kg', ''));

/** Les deux types principaux : 1RM (1 rep au max visé) et charge d'entraînement (X kg pour Y reps). */
export function typeObjectif(o: Pick<Objectif, 'mesure' | 'reps'>): string {
  if (o.mesure === 'serie') return repsCible(o) === 1 ? '1RM' : 'Charge d’entraînement';
  return o.mesure === 'reps' ? 'Reps max' : o.mesure === 'duree' ? 'Temps tenu' : NOM_MESURE[o.mesure];
}

/** « 8 × 75 kg », « 1RM 100 kg », « 1RM estimé 100 kg », « 15 reps ». */
export function libelleCible(o: Pick<Objectif, 'mesure' | 'cible' | 'reps'>): string {
  const f = fmtValeur(o.cible, o.mesure);
  if (o.mesure === 'serie') return repsCible(o) === 1 ? `1RM ${f} kg` : `${repsCible(o)} × ${f} kg`;
  if (o.mesure === 'reps') return `${f} reps`;
  if (o.mesure === 'duree') return `tenir ${fmtDuree(o.cible)}`;
  return `${NOM_MESURE[o.mesure]} ${f} kg`;
}

/** Phrase de marge, ex. « 82 / 100 kg, reste 18 kg (82 %) » ; série : « équivalent 8 × 71 / 75 kg… ». */
export function phraseMarge(o: Pick<Objectif, 'mesure' | 'cible' | 'reps'>, e: EtatObjectif): string {
  const u = uniteMesure(o.mesure);
  const f = (v: number) => fmtValeur(v, o.mesure);
  if (o.mesure === 'serie') {
    const r = repsCible(o);
    if (r === 1) {
      if (e.actuel == null) return `objectif 1RM ${f(o.cible)} kg, pas encore de mesure`;
      if (e.atteint) return `1RM ${f(o.cible)} kg, atteint`;
      if (e.reste === 0) return `1RM estimé ${f(e.actuel)} kg pour ${f(o.cible)} kg : à tenter`;
      return `1RM estimé ${f(e.actuel)} / ${f(o.cible)} kg, reste ${f(e.reste)} kg (${Math.round(e.pourcentage)}\u00a0%)`;
    }
    if (e.actuel == null) return `objectif ${r} × ${f(o.cible)} kg, pas encore de mesure`;
    if (e.atteint) return `${r} × ${f(o.cible)} kg, atteint`;
    if (e.reste === 0) return `équivalent ${r} × ${f(e.actuel)} kg pour ${r} × ${f(o.cible)} kg : à tenter`;
    return `équivalent ${r} × ${f(e.actuel)} / ${f(o.cible)} kg, reste ${f(e.reste)} kg (${Math.round(e.pourcentage)}\u00a0%)`;
  }
  if (e.actuel == null) return `objectif ${f(o.cible)} ${u}, pas encore de mesure`;
  if (e.atteint) return `${f(e.actuel)} / ${f(o.cible)} ${u}, atteint`;
  return `${f(e.actuel)} / ${f(o.cible)} ${u}, reste ${f(e.reste)} ${u} (${Math.round(e.pourcentage)}\u00a0%)`;
}

const dateCourte = (jour: string) => {
  const d = new Date(`${jour}T12:00:00`);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

/** Une seule ligne pour la carte : ce qu'il reste et quand, ou quoi faire. */
export function phraseCourte(o: Pick<Objectif, 'mesure' | 'cible' | 'reps' | 'echeance'>, e: EtatObjectif): string {
  const u = uniteMesure(o.mesure);
  if (e.atteint) return 'Objectif atteint, bravo !';
  if (e.actuel == null) return 'Note une série pour voir où tu en es';
  if (e.statut === 'a_tenter') return o.mesure === 'serie' && repsCible(o) > 1 ? `Tu as le niveau : tente ${repsCible(o)} reps à ${fmtValeur(o.cible, o.mesure)} kg.` : 'Tu as le niveau : tente-le en début de séance.';
  const morceaux = [`Reste ${fmtValeur(e.reste, o.mesure)} ${u}`];
  if (e.projection) morceaux.push(`prévu vers le ${dateCourte(e.projection)}`);
  else if (e.rythme != null) morceaux.push('pas de progrès ces dernières semaines');
  if (o.echeance) morceaux.push(`objectif le ${dateCourte(o.echeance)}`);
  return morceaux.join(' · ');
}

/** Phrase de rythme et de projection, ex. « +1,2 kg/sem. sur 12 semaines, objectif vers le 14 février 2027 ». */
export function phraseProjection(o: Pick<Objectif, 'mesure' | 'echeance'>, e: EtatObjectif): string {
  const u = uniteMesure(o.mesure);
  const morceaux: string[] = [];
  if (e.rythme != null) morceaux.push(`${e.rythme >= 0 ? '+' : ''}${nb(e.rythme)} ${u}/sem. ces 12 dernières semaines`);
  if (e.statut === 'a_tenter') morceaux.push('niveau suffisant, reste à faire la série');
  else if (!e.atteint) {
    if (e.projection) morceaux.push(`objectif estimé vers le ${dateFr(e.projection)}`);
    else if (e.rythme != null) morceaux.push('pas atteignable au rythme actuel');
    else morceaux.push('pas encore assez de séances pour estimer une date');
  }
  if (o.echeance) {
    morceaux.push(`date visée : ${dateFr(o.echeance)}` + (e.rythmeRequis != null ? ` (il faut +${nb(e.rythmeRequis)} ${u}/sem.)` : ''));
  }
  return morceaux.join(' ; ');
}
