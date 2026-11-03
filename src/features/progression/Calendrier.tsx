// Calendrier du mois : chaque jour d'entraînement, coloré selon les progrès de la séance. Propriétaire : 05-progression.
import { useMemo, useState } from 'preact/hooks';
import { Aide, Carte, ElementListe, Liste, Puce } from '../../ui';
import { db } from '../../core/db';
import { useRequete } from '../../core/requetes';
import type { Id, Seance } from '../../core/types';
import { jourLocal, joursDuMois, nombre, progresParSeance, resumeSeance, type ProgresSeance } from './calculs';
import type { DonneesProgression } from './donnees';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

type Etat = 'record' | 'progres' | 'faite';
const etatSeance = (p?: ProgresSeance): Etat => (p?.records ? 'record' : p?.enHausse ? 'progres' : 'faite');
const RANG: Record<Etat, number> = { faite: 0, progres: 1, record: 2 };

export function Calendrier({ d }: { d: DonneesProgression }) {
  const auj = new Date();
  const [mois, setMois] = useState({ a: auj.getFullYear(), m: auj.getMonth() });
  const [jour, setJour] = useState<string | null>(null);
  const modeles = useRequete(async () => new Map((await db.modeles.toArray()).map((m) => [m.id, m.nom])));

  const { progres, resumes, parJour } = useMemo(() => {
    const parSeance = new Map<Id, typeof d.series>();
    for (const s of d.series) {
      const l = parSeance.get(s.seanceId) ?? [];
      l.push(s);
      parSeance.set(s.seanceId, l);
    }
    const parJour = new Map<string, Seance[]>();
    for (const s of [...d.seances].sort((a, b) => b.debut.localeCompare(a.debut))) {
      if (!parSeance.get(s.id)?.length) continue;
      const j = jourLocal(new Date(s.debut));
      parJour.set(j, [...(parJour.get(j) ?? []), s]);
    }
    const resumes = new Map([...parSeance].map(([id, l]) => [id, resumeSeance(l, d.poids.get(id))]));
    return { progres: progresParSeance(d.series, d.seancesParId, d.poids), resumes, parJour };
  }, [d]);

  const cases = joursDuMois(mois.a, mois.m);
  const prefixe = `${mois.a}-${String(mois.m + 1).padStart(2, '0')}-`;
  const duMois = [...parJour].filter(([j]) => j.startsWith(prefixe)).flatMap(([, l]) => l);
  const liste = jour ? (parJour.get(jour) ?? []) : duMois;
  const nbProgres = duMois.filter((s) => etatSeance(progres.get(s.id)) !== 'faite').length;
  const nbRecords = duMois.reduce((t, s) => t + (progres.get(s.id)?.records ?? 0), 0);
  const estMoisCourant = mois.a === auj.getFullYear() && mois.m === auj.getMonth();
  const titreMois = new Date(mois.a, mois.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const changerMois = (delta: number) => {
    const n = new Date(mois.a, mois.m + delta, 1);
    setMois({ a: n.getFullYear(), m: n.getMonth() });
    setJour(null);
  };
  const aujourdhui = jourLocal(auj);

  return (
    <div class="ui-pile">
      <Carte>
        <div class="cal-entete">
          <button type="button" class="cal-nav" onClick={() => changerMois(-1)} aria-label="Mois précédent">
            ‹
          </button>
          <span class="cal-mois">{titreMois}</span>
          <button type="button" class="cal-nav" onClick={() => changerMois(1)} disabled={estMoisCourant} aria-label="Mois suivant">
            ›
          </button>
        </div>
        <div class="cal-grille" role="grid" aria-label={`Séances de ${titreMois}`}>
          {JOURS.map((j, i) => (
            <span key={`t${i}`} class="cal-tete" aria-hidden="true">
              {j}
            </span>
          ))}
          {cases.map((c, i) => {
            if (!c) return <span key={i} />;
            const j = jourLocal(c);
            const seances = parJour.get(j);
            const classes = ['cal-jour', j === aujourdhui ? 'auj' : '', j > aujourdhui ? 'futur' : '', jour === j ? 'choisi' : ''];
            if (!seances)
              return (
                <span key={j} class={classes.join(' ')}>
                  {c.getDate()}
                </span>
              );
            const etat = seances.map((s) => etatSeance(progres.get(s.id))).reduce((a, b) => (RANG[b] > RANG[a] ? b : a));
            const texte = etat === 'record' ? 'record battu' : etat === 'progres' ? 'en progrès' : 'séance faite';
            return (
              <button
                key={j}
                type="button"
                class={[...classes, 'fait', etat].join(' ')}
                aria-pressed={jour === j}
                aria-label={`${c.getDate()} : ${texte}`}
                onClick={() => setJour(jour === j ? null : j)}
              >
                {c.getDate()}
              </button>
            );
          })}
        </div>
        <div class="cal-legende" aria-hidden="true">
          <span>
            <i class="cal-pastille faite" /> Séance
          </span>
          <span>
            <i class="cal-pastille progres" /> En progrès
          </span>
          <span>
            <i class="cal-pastille record" /> Record
          </span>
          <Aide mot="progres" />
        </div>
      </Carte>

      {duMois.length === 0 ? (
        <p class="ui-attenue cal-vide">Aucune séance ce mois-ci. Les jours où tu t'entraînes s'allument ici.</p>
      ) : (
        <>
          <span class="ui-surtitre">
            {jour
              ? `Le ${new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
              : `${pluriel(duMois.length, 'séance')} · ${nbProgres} en progrès${nbRecords ? ` · ${pluriel(nbRecords, 'record')}` : ''}`}
          </span>
          <Liste label="Séances">
            {liste.map((s) => {
              const p = progres.get(s.id);
              const r = resumes.get(s.id);
              const duree = s.fin ? Math.round((new Date(s.fin).getTime() - new Date(s.debut).getTime()) / 6e4) : null;
              return (
                <ElementListe
                  key={s.id}
                  href={`#/seance/${s.id}`}
                  titre={`${(s.modeleId && modeles?.get(s.modeleId)) || 'Séance libre'}${s.fin ? '' : ' · en cours'}`}
                  detail={
                    <>
                      {dateLongue(s.debut)}
                      {duree ? ` · ${duree} min` : ''}
                      {r ? ` · ${nombre(r.volume)} kg` : ''}
                      <span class="cal-progres">
                        <PhraseProgres p={p} />
                      </span>
                    </>
                  }
                />
              );
            })}
          </Liste>
          {jour && (
            <button type="button" class="cal-tout" onClick={() => setJour(null)}>
              Voir tout le mois
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** « 2 records · 3 exercices en progrès sur 5 », en mots, sans jargon. */
function PhraseProgres({ p }: { p?: ProgresSeance }) {
  if (!p || (!p.compares && !p.records)) return <>Première fois pour ces exercices</>;
  return (
    <>
      {p.records > 0 && <Puce ton="record">{pluriel(p.records, 'record')}</Puce>}
      {p.enHausse > 0 ? (
        <Puce ton="progres">
          {p.enHausse} exercice{p.enHausse > 1 ? 's' : ''} en progrès sur {p.compares}
        </Puce>
      ) : p.compares > 0 ? (
        <span>{p.enBaisse > 0 ? `${p.enBaisse} exercice${p.enBaisse > 1 ? 's' : ''} en dessous de la dernière fois` : 'Comme la dernière fois'}</span>
      ) : null}
    </>
  );
}
