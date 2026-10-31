// Courbe, records et historique d'un exercice. Propriétaire : 05-progression.
// Réutilisable par 03 dans la fiche exercice : <FicheProgression exerciceId={id} />.
import { useMemo, useState } from 'preact/hooks';
import { Carte, ElementListe, Liste, Medaille, Onglets, Puce } from '../../ui';
import type { Id } from '../../core/types';
import { bilanRecords, kg, NOM_TYPE_RECORD, nombre, pointsExercice, tendance, valeurMesure, type FiltreVariante, type Mesure } from './calculs';
import { Courbe } from './Courbe';
import { useDonneesProgression, type DonneesProgression } from './donnees';

const MESURES: { valeur: Mesure; libelle: string }[] = [
  { valeur: 'un_rm', libelle: '1RM' },
  { valeur: 'charge_max', libelle: 'Charge max' },
  { valeur: 'volume', libelle: 'Volume' },
];
const TITRE_MESURE: { [m in Mesure]: string } = { un_rm: '1RM estimé', charge_max: 'Charge max', volume: 'Volume de séance' };
const fmt = (m: Mesure) => (m === 'volume' ? (v: number) => `${nombre(v)}` : kg);
const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export function FicheProgression({ exerciceId, donnees }: { exerciceId: Id; donnees?: DonneesProgression }) {
  const charge = useDonneesProgression();
  const d = donnees ?? charge;
  if (!d) return null;
  return <Fiche exerciceId={exerciceId} d={d} />;
}

function Fiche({ exerciceId, d }: { exerciceId: Id; d: DonneesProgression }) {
  const [mesure, setMesure] = useState<Mesure>('un_rm');
  const seriesEx = useMemo(() => d.series.filter((s) => s.exerciceId === exerciceId), [d, exerciceId]);

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
  const seancesRecord = new Set(bilan.evenements.filter((e) => (e.varianteId ?? '') === varianteCle && (e.type === 'un_rm' || e.type === 'charge_max')).map((e) => e.seanceId));

  if (seriesEx.filter((s) => s.type !== 'echauffement').length === 0) {
    return <Carte titre="Progression"><p class="ui-attenue">Aucune série enregistrée pour cet exercice.</p></Carte>;
  }

  const pc = points
    .map((p) => ({ date: p.date, valeur: valeurMesure(p, mesure) ?? NaN, record: seancesRecord.has(p.seanceId), incertain: p.poidsInconnu }))
    .filter((p) => !Number.isNaN(p.valeur));
  const dernier = pc[pc.length - 1];
  const t = tendance(points, mesure);
  const f = fmt(mesure);

  return (
    <div class="ui-pile">
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
            <span class="ui-surtitre">{TITRE_MESURE[mesure]}</span>
            <div class="prog-grand">
              <span class="ui-chiffre">{dernier ? (mesure === 'volume' ? nombre(dernier.valeur) : kg(dernier.valeur).replace(' kg', '')) : '–'}</span>
              <span class="ui-attenue">kg</span>
            </div>
          </div>
          {t && t.delta !== 0 && (
            <Puce ton={t.delta > 0 ? 'progres' : 'alerte'}>
              {t.delta > 0 ? '▲ +' : '▼ '}
              {mesure === 'volume' ? nombre(t.delta) + ' kg' : kg(t.delta)} en {t.semaines} sem.
            </Puce>
          )}
          {t && t.delta === 0 && <Puce ton="alerte">stagne</Puce>}
        </div>
        <Onglets label="Mesure affichée" options={MESURES} valeur={mesure} onChange={setMesure} />
        <Courbe points={pc} format={f} label={`Évolution : ${TITRE_MESURE[mesure]}`} />
        {mesure === 'un_rm' && <p class="prog-note ui-attenue">Formule d'Epley, séries de 12 reps au plus.</p>}
      </Carte>

      {recs && (
        <>
          <span class="ui-surtitre">Records</span>
          <Liste label="Records de l'exercice">
            {recs.unRm && <ElementListe debut={<Medaille />} titre={NOM_TYPE_RECORD.un_rm} detail={dateLongue(recs.unRm.date)} fin={<span class="ui-chiffre prog-val">{kg(recs.unRm.valeur)}</span>} />}
            {recs.chargeMax && <ElementListe debut={<Medaille />} titre={NOM_TYPE_RECORD.charge_max} detail={dateLongue(recs.chargeMax.date)} fin={<span class="ui-chiffre prog-val">{kg(recs.chargeMax.valeur)}</span>} />}
            {recs.volumeSeance && <ElementListe debut={<Medaille />} titre={NOM_TYPE_RECORD.volume_seance} detail={dateLongue(recs.volumeSeance.date)} fin={<span class="ui-chiffre prog-val">{nombre(recs.volumeSeance.valeur)} kg</span>} />}
          </Liste>
          {recs.repsACharge.length > 0 && (
            <details class="prog-details">
              <summary>Meilleures séries par charge</summary>
              <Liste>
                {recs.repsACharge.slice(0, 12).map((r) => (
                  <ElementListe key={r.chargeKg} titre={<span class="ui-chiffre">{r.lestKg != null ? `+${kg(r.lestKg)}` : kg(r.chargeKg!)}</span>} detail={dateLongue(r.date)} fin={<span class="ui-chiffre prog-val">{r.valeur} reps</span>} />
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
          const charge = charges.length === 1 ? `${lest ? '+' : ''}${kg(charges[0])}${p.series[0].modeCharge === 'par_main' ? ' /main' : ''}` : 'charges variées';
          return (
            <ElementListe
              key={p.seanceId}
              href={`#/seance/${p.seanceId}`}
              surligne={seancesRecord.has(p.seanceId)}
              titre={<span class="ui-chiffre">{p.series[0]?.modeCharge === 'sans_charge' ? 'PDC' : charge} · {p.series.map((x) => x.reps).join('-')}</span>}
              detail={`${dateLongue(p.date)}${temp != null ? ` · ${Math.round(temp)} °C` : ''}`}
              fin={seancesRecord.has(p.seanceId) ? <Puce ton="record">★ record</Puce> : p.unRm ? <span class="ui-attenue">1RM {Math.round(p.unRm)}</span> : undefined}
            />
          );
        })}
      </Liste>
    </div>
  );
}
