// Courbe, records et historique d'un exercice. Propriétaire : 05-progression.
// Réutilisable par 03 dans la fiche exercice : <FicheProgression exerciceId={id} />.
import { useMemo, useState } from 'preact/hooks';
import { useCompteur } from '../../anim';
import { Aide, Carte, ElementListe, Liste, Medaille, Onglets, Puce } from '../../ui';
import { fmtDuree, signeLest } from '../../core/calculs';
import type { Id } from '../../core/types';
import { bilanRecords, kg, libelleChargeDuree, NOM_TYPE_RECORD, nombre, pointsExercice, tendance, valeurMesure, type FiltreVariante, type Mesure } from './calculs';
import { Courbe } from './Courbe';
import { useDonneesProgression, type DonneesProgression } from './donnees';
import { useRequete } from '../../core/requetes';
import { objectifsDe } from '../objectifs/objectifs';
import { epley, repsCible } from '../objectifs/calculs';
import './progression.css';

const MESURES: { valeur: Mesure; libelle: string }[] = [
  { valeur: 'un_rm', libelle: '1RM estimé' },
  { valeur: 'charge_max', libelle: 'Plus lourd' },
  { valeur: 'volume', libelle: 'Volume' },
];
const TITRE_MESURE: { [m in Mesure]: string } = { un_rm: '1RM estimé', charge_max: 'Charge la plus lourde', volume: 'Volume de séance', duree: 'Meilleure tenue' };
const fmt = (m: Mesure) => (m === 'volume' ? (v: number) => `${nombre(v)}` : m === 'duree' ? fmtDuree : kg);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export function FicheProgression({ exerciceId, donnees }: { exerciceId: Id; donnees?: DonneesProgression }) {
  const charge = useDonneesProgression();
  const d = donnees ?? charge;
  if (!d) return null;
  return <Fiche exerciceId={exerciceId} d={d} />;
}

function Fiche({ exerciceId, d }: { exerciceId: Id; d: DonneesProgression }) {
  const [choixMesure, setMesure] = useState<Mesure>('un_rm');
  const seriesEx = useMemo(() => d.series.filter((s) => s.exerciceId === exerciceId), [d, exerciceId]);
  // Exercice tenu (gainage, dead hang…) : une seule mesure, la plus longue tenue de chaque séance.
  const tenu = !!d.exercices.get(exerciceId)?.enSecondes || (seriesEx.length > 0 && seriesEx.every((s) => s.dureeSec != null));
  const mesure: Mesure = tenu ? 'duree' : choixMesure;

  // Variantes présentes dans l'historique : on ne mélange jamais deux variantes sur une courbe.
  const options = useMemo(() => {
    const ids = new Set(seriesEx.map((s) => s.varianteId ?? ''));
    const o: { valeur: string; libelle: string }[] = [];
    if (ids.has('')) o.push({ valeur: '', libelle: 'Standard' });
    for (const id of ids) if (id) o.push({ valeur: id, libelle: d.variantes.get(id)?.nom ?? 'Variante' });
    return o;
  }, [seriesEx, d]);
  const [choixVariante, setVariante] = useState<string | undefined>();
  const varianteCle = choixVariante ?? options[0]?.valeur ?? '';
  const filtre: FiltreVariante = varianteCle === '' ? null : varianteCle;

  const points = useMemo(() => pointsExercice(seriesEx, d.seancesParId, d.poids, exerciceId, filtre), [seriesEx, d, exerciceId, filtre]);
  const bilan = useMemo(() => bilanRecords(seriesEx, d.poids), [seriesEx, d]);
  const recs = bilan.actuels.get(`${exerciceId}|${varianteCle}`);
  const seancesRecord = new Set(
    bilan.evenements.filter((e) => (e.varianteId ?? '') === varianteCle && (e.type === 'un_rm' || e.type === 'charge_max' || e.type === 'duree_max')).map((e) => e.seanceId),
  );

  const pc = points
    .map((p) => ({ date: p.date, valeur: valeurMesure(p, mesure) ?? NaN, record: seancesRecord.has(p.seanceId), incertain: p.poidsInconnu }))
    .filter((p) => !Number.isNaN(p.valeur));
  const dernier = pc[pc.length - 1];
  const t = tendance(points, mesure);
  const f = fmt(mesure);
  // Lignes d'objectif sur la courbe : objectifs de la même mesure ; « N reps × X kg » ramené au 1RM (charge totale seulement).
  const objectifs = useRequete(() => objectifsDe(exerciceId), [exerciceId]);
  const totale = d.exercices.get(exerciceId)?.modeCharge === 'total';
  const cibles = (objectifs ?? []).flatMap((o) =>
    o.mesure === mesure ? [o.cible] : mesure === 'un_rm' && o.mesure === 'serie' && totale ? [epley(o.cible, repsCible(o))] : [],
  );
  const affiche = useCompteur(dernier?.valeur ?? 0, 700, mesure === 'volume' || mesure === 'duree' ? 0 : 1);

  if (seriesEx.filter((s) => s.type !== 'echauffement').length === 0) {
    return <Carte titre="Progression"><p class="ui-attenue">Aucune série enregistrée pour cet exercice.</p></Carte>;
  }

  return (
    <div class="ui-pile anim-cascade">
      {options.length > 1 && (
        <div class="prog-puces" role="group" aria-label="Variante">
          {options.map((o) => (
            <button key={o.valeur} type="button" class="prog-puce" aria-pressed={o.valeur === varianteCle} onClick={() => setVariante(o.valeur)}>
              {o.libelle}
            </button>
          ))}
        </div>
      )}
      <Carte>
        <div class="ui-ligne-entre">
          <div>
            <span class="ui-surtitre">
              {TITRE_MESURE[mesure]} <Aide mot={mesure === 'un_rm' ? 'unRm' : mesure === 'volume' ? 'volume' : mesure === 'duree' ? 'enSecondes' : 'chargeMax'} />
            </span>
            <div class="prog-grand">
              <span class="ui-chiffre">{dernier ? (mesure === 'volume' ? nombre(affiche) : mesure === 'duree' ? Math.round(affiche) : kg(affiche).replace(' kg', '')) : '–'}</span>
              <span class="ui-attenue">{mesure === 'duree' ? 's' : 'kg'}</span>
            </div>
          </div>
          {t && t.delta !== 0 && (
            <Puce ton={t.delta > 0 ? 'progres' : 'alerte'}>
              {t.delta > 0 ? '▲ +' : '▼ '}
              {mesure === 'volume' ? nombre(t.delta) + ' kg' : mesure === 'duree' ? fmtDuree(Math.abs(t.delta)) : kg(t.delta)} en {t.semaines} sem.
            </Puce>
          )}
          {t && t.delta === 0 && <Puce ton="alerte">stagne</Puce>}
        </div>
        {!tenu && <Onglets label="Mesure affichée" options={MESURES} valeur={mesure} onChange={setMesure} />}
        <Courbe points={pc} format={f} label={`Évolution : ${TITRE_MESURE[mesure]}`} cibles={cibles} />
        {mesure === 'un_rm' && <p class="prog-note ui-attenue">Formule d'Epley, séries de 12 reps au plus.</p>}
      </Carte>

      {recs && (
        <>
          <span class="ui-surtitre">Records</span>
          <Liste label="Records de l'exercice">
            {recs.chargeMax && <ElementListe debut={<span class="anim-zoom prog-medaille"><Medaille /></span>} titre={<>{NOM_TYPE_RECORD.charge_max} <Aide mot="pr" /></>} detail={`${recs.chargeMax.reps ? `soulevé pour ${pluriel(recs.chargeMax.reps, 'rep')} · ` : ''}${dateLongue(recs.chargeMax.date)}`} fin={<span class="ui-chiffre prog-val">{kg(recs.chargeMax.valeur)}</span>} />}
            {recs.unRm && <ElementListe debut={<span class="anim-zoom prog-medaille"><Medaille /></span>} titre={<>{NOM_TYPE_RECORD.un_rm} <Aide mot="unRm" /></>} detail={`potentiel calculé · ${dateLongue(recs.unRm.date)}`} fin={<span class="ui-chiffre prog-val">{kg(recs.unRm.valeur)}</span>} />}
            {recs.dureeMax && <ElementListe debut={<span class="anim-zoom prog-medaille"><Medaille /></span>} titre={NOM_TYPE_RECORD.duree_max} detail={dateLongue(recs.dureeMax.date)} fin={<span class="ui-chiffre prog-val">{fmtDuree(recs.dureeMax.valeur)}</span>} />}
            {recs.volumeSeance && <ElementListe debut={<span class="anim-zoom prog-medaille"><Medaille /></span>} titre={NOM_TYPE_RECORD.volume_seance} detail={dateLongue(recs.volumeSeance.date)} fin={<span class="ui-chiffre prog-val">{nombre(recs.volumeSeance.valeur)} kg</span>} />}
          </Liste>
          {recs.dureeACharge.length > 1 && (
            <details class="prog-details">
              <summary>Meilleures tenues par charge</summary>
              <Liste>
                {recs.dureeACharge.slice(0, 12).map((r) => (
                  <ElementListe key={r.chargeKg} titre={<span class="ui-chiffre">{libelleChargeDuree(r)}</span>} detail={dateLongue(r.date)} fin={<span class="ui-chiffre prog-val">{fmtDuree(r.valeur)}</span>} />
                ))}
              </Liste>
            </details>
          )}
          {recs.repsACharge.length > 0 && (
            <details class="prog-details">
              <summary>Meilleures séries par charge</summary>
              <Liste>
                {recs.repsACharge.slice(0, 12).map((r) => (
                  <ElementListe key={r.chargeKg} titre={<span class="ui-chiffre">{r.lestKg != null ? `${signeLest(r.lestKg)}${kg(r.lestKg)} de lest` : kg(r.chargeKg!)}</span>} detail={dateLongue(r.date)} fin={<span class="ui-chiffre prog-val">{r.valeur} reps</span>} />
                ))}
              </Liste>
            </details>
          )}
        </>
      )}

      <span class="ui-surtitre">Historique</span>
      <Liste label="Historique de l'exercice">
        {[...points].reverse().map((p) => {
          const s = d.seancesParId.get(p.seanceId);
          const temp = s?.contexte?.temperatureC;
          const charges = [...new Set(p.series.map((x) => x.chargeKg ?? 0))];
          const lest = p.series[0]?.modeCharge === 'lest';
          const charge = charges.length === 1 ? `${lest ? signeLest(charges[0]) : ''}${kg(charges[0])}${lest ? ' de lest' : p.series[0].modeCharge === 'par_main' ? ' /main' : ''}` : 'charges variées';
          return (
            <ElementListe
              key={p.seanceId}
              href={`#/seance/${p.seanceId}`}
              surligne={seancesRecord.has(p.seanceId)}
              titre={
                <span class="ui-chiffre">
                  {tenu
                    ? `${p.series[0]?.modeCharge === 'sans_charge' || charges.every((c) => !c) ? '' : `${charge} · `}${p.series.map((x) => x.dureeSec ?? 0).join('-')} s`
                    : `${p.series[0]?.modeCharge === 'sans_charge' ? 'PDC' : charge} · ${p.series.map((x) => x.reps).join('-')}`}
                </span>
              }
              detail={`${dateLongue(p.date)}${temp != null ? ` · ${Math.round(temp)} °C` : ''}`}
              fin={
                seancesRecord.has(p.seanceId) ? <Puce ton="record">★ record</Puce> : p.unRm ? <span class="ui-attenue">1RM {Math.round(p.unRm)}</span> : p.dureeMax ? <span class="ui-attenue">max {fmtDuree(p.dureeMax)}</span> : undefined
              }
            />
          );
        })}
      </Liste>
    </div>
  );
}
