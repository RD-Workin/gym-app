// Saisie rapide d'un set (séries × reps × kg) depuis la fiche d'un exercice. Propriétaire : 04-seance.
// Stats et suggestions : 05-progression (suggestion.ts).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Bouton, Carte, Puce, Stepper, ToastRecord } from '../../ui';
import { eclatSur } from '../../anim';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import type { Exercice, Id, Variante } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';
import { kg, pointsExercice } from '../progression/calculs';
import { recordsDeLaSerie, type DonneesProgression } from '../progression/donnees';
import { derniereFois, formatCharge } from '../seance/logique';
import { annulerSetRapide, enregistrerSetRapide, type ResultatRapide } from './saisieRapide';
import { depuisDerniereFois, maxProjete, suggererCharge, unRmRecent } from './suggestion';
import './saisie.css';

const pasCharge = (e: Exercice) => (e.equipement === 'barre' || e.equipement === 'machine' || e.equipement === 'poulie' ? 2.5 : e.modeCharge === 'par_main' ? 1 : 1.25);

export function SaisieRapide({ exercice, variantes, d }: { exercice: Exercice; variantes: Variante[]; d: DonneesProgression }) {
  const [varianteId, setVarianteId] = useState<Id | ''>('');
  const avant = useRequete(() => derniereFois(exercice.id), [exercice.id]);
  const avantVariante = avant?.filter((s) => (s.varianteId ?? '') === varianteId);

  const modeCharge = exercice.modeCharge;
  const pas = pasCharge(exercice);
  const poidsActuel = useMemo(() => [...d.seances].sort((a, b) => b.debut.localeCompare(a.debut)).find((s) => s.contexte?.poidsCorporelKg != null)?.contexte.poidsCorporelKg, [d]);

  const points = useMemo(
    () => pointsExercice(d.series, d.seancesParId, d.poids, exercice.id, varianteId === '' ? null : varianteId),
    [d, exercice.id, varianteId],
  );
  // « Force générale » : 1RM récents des autres exercices du même muscle principal.
  const autres = useMemo(() => {
    const g = exercice.groupesMusculaires[0];
    if (!g) return [];
    const res: { unRm: number; memeEquipement: boolean }[] = [];
    for (const e of d.exercices.values()) {
      if (e.id === exercice.id || e.groupesMusculaires[0] !== g) continue;
      const r = unRmRecent(pointsExercice(d.series, d.seancesParId, d.poids, e.id));
      if (r != null) res.push({ unRm: r, memeEquipement: e.equipement === exercice.equipement });
    }
    return res;
  }, [d, exercice]);

  const [series, setSeries] = useState(3);
  const [reps, setReps] = useState(10);
  const [charge, setCharge] = useState(0);
  const [initialise, setInitialise] = useState('');
  const [toast, setToast] = useState<string>();
  const [dernier, setDernier] = useState<ResultatRapide & { texte: string }>();
  const [occupe, setOccupe] = useState(false);

  const suggestion = suggererCharge({
    points,
    reps,
    mode: modeCharge,
    pas,
    poidsCorporelKg: poidsActuel,
    autres,
    nomMuscle: exercice.groupesMusculaires[0] ? libelleGroupe(exercice.groupesMusculaires[0]) : undefined,
  });

  // Préremplissage : la dernière fois, sinon la suggestion.
  useEffect(() => {
    const cle = `${exercice.id}|${varianteId}`;
    if (avant === undefined || initialise === cle) return;
    const p = depuisDerniereFois(avantVariante);
    if (p) {
      setSeries(p.series);
      setReps(p.reps);
      setCharge(p.chargeKg ?? 0);
    } else if (suggestion) setCharge(suggestion.chargeKg);
    setInitialise(cle);
  }, [avant, exercice.id, varianteId, suggestion?.chargeKg]);

  const ref = unRmRecent(points);
  const projete = maxProjete(points);
  const sansCharge = modeCharge === 'sans_charge';
  const unite = modeCharge === 'par_main' ? 'kg/main' : modeCharge === 'lest' ? 'kg lest' : 'kg';

  const ajouter = async (e: Event) => {
    if (occupe || reps < 1) return;
    const bouton = e.currentTarget as Element;
    setOccupe(true);
    try {
      const r = await enregistrerSetRapide({ exerciceId: exercice.id, varianteId: varianteId || undefined, series, reps, chargeKg: sansCharge ? undefined : charge, modeCharge });
      eclatSur(bouton);
      const texte = `${series} × ${reps}${sansCharge ? '' : ` à ${formatCharge({ chargeKg: charge, modeCharge })}`}`;
      setDernier({ ...r, texte });
      for (const s of r.series) {
        const recs = await recordsDeLaSerie(s);
        if (recs[0]) {
          setToast(recs[0].texte);
          break;
        }
      }
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Carte titre="Noter une perf" ton="mise-en-avant">
      <div class="ui-pile">
        {(ref != null || !!avantVariante?.length) && (
          <div class="sr-stats">
            {avantVariante && avantVariante.length > 0 && (
              <div>
                <span class="ui-surtitre">La dernière fois</span>
                <span class="ui-chiffre">
                  {avantVariante.map((s) => s.reps).join('-')} {sansCharge ? '' : `à ${formatCharge(avantVariante[0])}`}
                </span>
              </div>
            )}
            {ref != null && (
              <div>
                <span class="ui-surtitre">1RM estimé</span>
                <span class="ui-chiffre">{kg(ref)}</span>
              </div>
            )}
            {projete != null && ref != null && projete > ref + 0.5 && (
              <div>
                <span class="ui-surtitre">Max projeté (4 sem.)</span>
                <span class="ui-chiffre">{kg(projete)}</span>
              </div>
            )}
          </div>
        )}

        {variantes.length > 0 && (
          <div class="prog-puces" role="group" aria-label="Variante">
            {[{ id: '', nom: 'Standard' }, ...variantes].map((v) => (
              <button key={v.id} type="button" class="prog-puce" aria-pressed={varianteId === v.id} onClick={() => setVarianteId(v.id)}>
                {v.nom}
              </button>
            ))}
          </div>
        )}

        <div class="sr-champs">
          <Stepper id="sr-series" valeur={series} onChange={setSeries} unite="séries" min={1} max={20} decimales={0} />
          <Stepper id="sr-reps" valeur={reps} onChange={setReps} unite="reps" min={1} max={200} decimales={0} />
          {!sansCharge && <Stepper id="sr-charge" valeur={charge} onChange={setCharge} unite={unite} pas={pas} min={0} max={999} decimales={2} />}
        </div>

        {suggestion && (
          <div class="sr-suggestion">
            <p class="ui-attenue">{suggestion.texte}</p>
            <div class="ui-ligne" style={{ flexWrap: 'wrap', gap: 'var(--e-2)' }}>
              {suggestion.source === 'historique' && suggestion.solide !== charge && (
                <button type="button" class="prog-puce" onClick={() => setCharge(suggestion.solide)}>
                  {suggestion.solide.toLocaleString('fr-FR')} kg
                </button>
              )}
              {suggestion.chargeKg !== charge && (
                <button type="button" class="prog-puce" onClick={() => setCharge(suggestion.chargeKg)}>
                  {suggestion.source === 'historique' ? 'À tester : ' : 'Essayer '}
                  {suggestion.chargeKg.toLocaleString('fr-FR')} kg
                </button>
              )}
            </div>
          </div>
        )}

        <Bouton taille="geant" icone="valider" onClick={ajouter} disabled={occupe}>
          Ajouter {series} × {reps}
          {sansCharge ? '' : ` à ${charge.toLocaleString('fr-FR')} kg`}
        </Bouton>

        {dernier && (
          <div class="sr-confirmation" role="status">
            <Puce ton="progres">✓ {dernier.texte}</Puce>
            <span class="ui-attenue">
              ajouté à {dernier.enCours ? 'la séance en cours' : <a href={lien(`/seance/${dernier.seanceId}`)}>la séance libre du jour</a>}
            </span>
            <button
              type="button"
              class="prog-puce"
              onClick={async () => {
                await annulerSetRapide(dernier);
                setDernier(undefined);
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
      {toast && <ToastRecord texte={toast} onFin={() => setToast(undefined)} />}
    </Carte>
  );
}
