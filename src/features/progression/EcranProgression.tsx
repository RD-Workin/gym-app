// Écran Progrès : exercices, records, vue globale, historique. Propriétaire : 05-progression.
import { useMemo, useState } from 'preact/hooks';
import { Carte, ElementListe, Icone, Liste, Medaille, Onglets, Puce } from '../../ui';
import { db } from '../../core/db';
import { useRequete } from '../../core/requetes';
import type { Id } from '../../core/types';
import {
  bilanRecords,
  kg,
  libelleRecord,
  NOM_TYPE_RECORD,
  nombre,
  pointsExercice,
  resumeSeance,
  seancesParSemaine,
  semainesDAffilee,
  volumeParGroupe,
  type RecordPerso,
} from './calculs';
import { Barres } from './Courbe';
import { useDonneesProgression, type DonneesProgression } from './donnees';
import { FicheProgression } from './FicheProgression';
import './progression.css';

type Vue = 'exercices' | 'records' | 'global' | 'historique';
const VUES: { valeur: Vue; libelle: string }[] = [
  { valeur: 'exercices', libelle: 'Exercices' },
  { valeur: 'records', libelle: 'Records' },
  { valeur: 'global', libelle: 'Global' },
  { valeur: 'historique', libelle: 'Séances' },
];
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function EcranProgression() {
  const d = useDonneesProgression();
  const [vue, setVue] = useState<Vue>('exercices');
  const [exercice, setExercice] = useState<Id | null>(null);

  if (exercice && d) {
    const ex = d.exercices.get(exercice);
    return (
      <section class="ui-pile prog">
        <button type="button" class="prog-retour" onClick={() => setExercice(null)}>
          <Icone nom="retour" /> Progrès
        </button>
        <h1 class="prog-titre">{ex?.nom ?? 'Exercice'}</h1>
        <FicheProgression exerciceId={exercice} donnees={d} />
      </section>
    );
  }

  return (
    <section class="ui-pile prog">
      <h1 class="prog-titre">Progrès</h1>
      <Onglets label="Vue" options={VUES} valeur={vue} onChange={setVue} />
      {!d ? null : d.series.length === 0 ? (
        <Carte ton="mise-en-avant" titre="Rien à afficher pour l'instant">
          <p>Termine une première séance : tes courbes et tes records apparaîtront ici.</p>
        </Carte>
      ) : vue === 'exercices' ? (
        <VueExercices d={d} ouvrir={setExercice} />
      ) : vue === 'records' ? (
        <VueRecords d={d} ouvrir={setExercice} />
      ) : vue === 'global' ? (
        <VueGlobale d={d} />
      ) : (
        <VueHistorique d={d} />
      )}
    </section>
  );
}

function VueExercices({ d, ouvrir }: { d: DonneesProgression; ouvrir: (id: Id) => void }) {
  const lignes = useMemo(() => {
    const ids = [...new Set(d.series.filter((s) => s.type !== 'echauffement').map((s) => s.exerciceId))];
    return ids
      .map((id) => {
        const pts = pointsExercice(d.series, d.seancesParId, d.poids, id, null);
        const tous = pts.length ? pts : pointsExercice(d.series, d.seancesParId, d.poids, id);
        const der = tous[tous.length - 1];
        const avant = tous[tous.length - 2];
        return { id, nom: d.exercices.get(id)?.nom ?? 'Exercice supprimé', der, avant, nb: tous.length };
      })
      .filter((l) => l.der)
      .sort((a, b) => b.der.date.localeCompare(a.der.date));
  }, [d]);

  return (
    <Liste label="Exercices pratiqués">
      {lignes.map((l) => {
        const v = l.der.unRm ?? l.der.chargeMax;
        const av = l.avant ? (l.der.unRm != null ? l.avant.unRm : l.avant.chargeMax) : null;
        const delta = v != null && av != null ? v - av : 0;
        return (
          <ElementListe
            key={l.id}
            onClick={() => ouvrir(l.id)}
            titre={l.nom}
            detail={`${l.nb} séance${l.nb > 1 ? 's' : ''} · ${dateCourte(l.der.date)}`}
            fin={
              <>
                {v != null && <span class="ui-chiffre prog-val">{kg(v)}</span>}
                {Math.abs(delta) >= 0.5 && <Puce ton={delta > 0 ? 'progres' : 'alerte'}>{delta > 0 ? '▲' : '▼'}</Puce>}
                <span class="ui-element-chevron prog-chevron"><Icone nom="chevron" /></span>
              </>
            }
          />
        );
      })}
    </Liste>
  );
}

function VueRecords({ d, ouvrir }: { d: DonneesProgression; ouvrir: (id: Id) => void }) {
  const { evenements, actuels } = useMemo(() => bilanRecords(d.series, d.poids), [d]);
  const [groupe, setGroupe] = useState('tous');
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
  const ceMois = evenements.filter((e) => e.date >= debutMois).length;
  const dernier = evenements[evenements.length - 1];
  const jours = dernier ? Math.floor((maintenant.getTime() - new Date(dernier.date).getTime()) / 864e5) : null;

  // Le record le plus récent de chaque exercice / variante (1RM d'abord, sinon charge max).
  const groupes = [...new Set([...d.exercices.values()].flatMap((e) => e.groupesMusculaires))].sort();
  const liste: { r: RecordPerso; nom: string }[] = [];
  for (const [, a] of actuels) {
    const r = a.unRm ?? a.chargeMax;
    if (!r) continue;
    const ex = d.exercices.get(r.exerciceId);
    if (groupe !== 'tous' && !ex?.groupesMusculaires.includes(groupe)) continue;
    const v = r.varianteId ? d.variantes.get(r.varianteId)?.nom : undefined;
    liste.push({ r, nom: `${ex?.nom ?? 'Exercice'}${v ? ` (${v})` : ''}` });
  }
  liste.sort((a, b) => b.r.date.localeCompare(a.r.date));
  const recents = evenements.slice(-30).reverse();

  return (
    <div class="ui-pile">
      <div class="prog-tuiles">
        <Carte><span class="ui-chiffre prog-tuile prog-or">{ceMois}</span><span class="ui-attenue">ce mois-ci</span></Carte>
        <Carte><span class="ui-chiffre prog-tuile">{evenements.length}</span><span class="ui-attenue">au total</span></Carte>
        <Carte><span class="ui-chiffre prog-tuile">{jours == null ? '–' : `${jours} j`}</span><span class="ui-attenue">depuis le dernier</span></Carte>
      </div>
      {groupes.length > 1 && (
        <div class="prog-puces" role="group" aria-label="Groupe musculaire">
          {['tous', ...groupes].map((g) => (
            <button key={g} type="button" class="prog-puce" aria-pressed={g === groupe} onClick={() => setGroupe(g)}>
              {g === 'tous' ? 'Tous' : g}
            </button>
          ))}
        </div>
      )}
      <span class="ui-surtitre">Meilleurs actuels</span>
      <Liste label="Records actuels">
        {liste.map(({ r, nom }) => (
          <ElementListe
            key={`${r.exerciceId}${r.varianteId ?? ''}`}
            onClick={() => ouvrir(r.exerciceId)}
            surligne={r.date >= debutMois}
            debut={<Medaille />}
            titre={nom}
            detail={`${NOM_TYPE_RECORD[r.type]} · ${dateCourte(r.date)}`}
            fin={<span class="ui-chiffre prog-val">{kg(r.valeur)}</span>}
          />
        ))}
      </Liste>
      {recents.length > 0 && (
        <details class="prog-details">
          <summary>Derniers records battus</summary>
          <Liste>
            {recents.map((r, i) => (
              <ElementListe key={i} titre={libelleRecord(r, d.exercices.get(r.exerciceId)?.nom ?? 'Exercice')} detail={dateCourte(r.date)} />
            ))}
          </Liste>
        </details>
      )}
    </div>
  );
}

function VueGlobale({ d }: { d: DonneesProgression }) {
  const terminees = d.seances.filter((s) => s.fin);
  const semaines = seancesParSemaine(terminees, 12);
  const affilee = semainesDAffilee(terminees);
  const moy4 = semaines.slice(-5, -1).reduce((a, s) => a + s.nb, 0) / 4;
  const depuis = new Date(Date.now() - 30 * 864e5);
  const groupes = volumeParGroupe(d.series, d.exercices, d.poids, depuis);
  const maxG = Math.max(1, ...groupes.map((g) => g.series));

  return (
    <div class="ui-pile">
      <div class="prog-tuiles">
        <Carte><span class="ui-chiffre prog-tuile">{semaines[semaines.length - 1].nb}</span><span class="ui-attenue">cette semaine</span></Carte>
        <Carte><span class="ui-chiffre prog-tuile">{moy4.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span><span class="ui-attenue">par sem. (4 sem.)</span></Carte>
        <Carte><span class={`ui-chiffre prog-tuile${affilee >= 4 ? ' prog-vert' : ''}`}>{affilee}</span><span class="ui-attenue">sem. d'affilée</span></Carte>
      </div>
      <Carte titre="Séances par semaine">
        <Barres valeurs={semaines.map((s) => s.nb)} libelles={semaines.map((s, i) => (i % 3 === 0 || i === semaines.length - 1 ? `${s.semaine.getDate()}/${s.semaine.getMonth() + 1}` : ''))} label="Séances par semaine sur 12 semaines" />
      </Carte>
      <Carte titre="Par groupe musculaire · 30 jours">
        {groupes.length === 0 ? (
          <p class="ui-attenue">Aucune série ces 30 derniers jours.</p>
        ) : (
          <ul class="prog-groupes">
            {groupes.map((g) => (
              <li key={g.groupe}>
                <span class="prog-groupe-nom">{g.groupe}</span>
                <span class="prog-jauge"><span style={{ width: `${(g.series / maxG) * 100}%` }} /></span>
                <span class="ui-chiffre prog-groupe-val">{g.series} séries</span>
                <span class="ui-attenue prog-groupe-vol">{nombre(g.volume)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}

function VueHistorique({ d }: { d: DonneesProgression }) {
  const seances = useMemo(() => {
    const parSeance = new Map<Id, typeof d.series>();
    for (const s of d.series) {
      const l = parSeance.get(s.seanceId) ?? [];
      l.push(s);
      parSeance.set(s.seanceId, l);
    }
    return [...d.seances]
      .sort((a, b) => b.debut.localeCompare(a.debut))
      .map((s) => ({ s, r: resumeSeance(parSeance.get(s.id) ?? [], d.poids.get(s.id)) }));
  }, [d]);
  const modeles = useModeles();

  return (
    <Liste label="Séances">
      {seances.map(({ s, r }) => {
        const duree = s.fin ? Math.round((new Date(s.fin).getTime() - new Date(s.debut).getTime()) / 6e4) : null;
        const t = s.contexte?.temperatureC;
        return (
          <ElementListe
            key={s.id}
            href={`#/seance/${s.id}`}
            titre={`${(s.modeleId && modeles?.get(s.modeleId)) || 'Séance libre'}${s.fin ? '' : ' · en cours'}`}
            detail={`${dateLongue(s.debut)}${t != null ? ` · ${Math.round(t)} °C` : ''}${duree ? ` · ${duree} min` : ''}`}
            fin={<span class="prog-hist-fin"><span class="ui-chiffre">{nombre(r.volume)} kg</span><span class="ui-attenue">{r.nbSeries} séries</span></span>}
          />
        );
      })}
    </Liste>
  );
}

const useModeles = () => useRequete(async () => new Map((await db.modeles.toArray()).map((m) => [m.id, m.nom])));
