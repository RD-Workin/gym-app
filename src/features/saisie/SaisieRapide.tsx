// Saisie rapide d'un set (séries × reps × kg) depuis la fiche d'un exercice. Propriétaire : 04-seance.
// Stats et suggestions : 05-progression (suggestion.ts).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Aide, Bouton, Carte, IndicationLest, Puce, Stepper, ToastRecord } from '../../ui';
import { fmtDuree, LEST_MAX_KG, LEST_MIN_KG, signeLest, uniteCharge } from '../../core/calculs';
import { eclatSur } from '../../anim';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import type { Exercice, Id, Variante } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';
import { kg, pointsExercice } from '../progression/calculs';
import { objectifAtteintPar } from '../objectifs/objectifs';
import { recordsDeLaSerie, type DonneesProgression } from '../progression/donnees';
import { derniereFois } from '../seance/logique';
import { annulerSetRapide, enregistrerSetRapide, type LigneSet, type ResultatRapide } from './saisieRapide';
import { depuisDerniereFois, maxProjete, resumeLignes, suggererCharge, unRmRecent } from './suggestion';
import './saisie.css';

const pasCharge = (e: Exercice) => (e.equipement === 'barre' || e.equipement === 'machine' || e.equipement === 'poulie' ? 2.5 : e.modeCharge === 'par_main' ? 1 : 1.25);

export function SaisieRapide({ exercice, variantes, d }: { exercice: Exercice; variantes: Variante[]; d: DonneesProgression }) {
  const [varianteId, setVarianteId] = useState<Id | ''>('');
  const avant = useRequete(() => derniereFois(exercice.id), [exercice.id]);
  const avantVariante = avant?.filter((s) => (s.varianteId ?? '') === varianteId);

  const modeCharge = exercice.modeCharge;
  // Exercice tenu (gainage, dead hang…) : chaque série se note en secondes.
  const tenu = !!exercice.enSecondes;
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

  const [lignes, setLignes] = useState<LigneSet[]>([{ reps: 10, chargeKg: 0 }]);
  const [sel, setSel] = useState(0);
  const [initialise, setInitialise] = useState('');
  const [toast, setToast] = useState<string>();
  const [dernier, setDernier] = useState<ResultatRapide & { texte: string }>();
  const [occupe, setOccupe] = useState(false);

  const i = Math.min(sel, lignes.length - 1);
  const ligne = lignes[i];
  const majLigne = (p: Partial<LigneSet>) => setLignes((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const ajouterLigne = () => {
    setLignes((l) => [...l, { ...l[l.length - 1] }]);
    setSel(lignes.length);
  };
  const retirerLigne = () => {
    if (lignes.length < 2) return;
    setLignes((l) => l.filter((_, j) => j !== i));
    setSel(Math.max(0, i - 1));
  };

  const suggestion = tenu ? null : suggererCharge({
    points,
    reps: ligne.reps,
    mode: modeCharge,
    pas,
    poidsCorporelKg: poidsActuel,
    autres,
    nomMuscle: exercice.groupesMusculaires[0] ? libelleGroupe(exercice.groupesMusculaires[0]) : undefined,
    unite: uniteCharge(modeCharge),
  });

  // Préremplissage : les séries de la dernière fois (chacune avec ses reps et sa charge), sinon la suggestion.
  useEffect(() => {
    const cle = `${exercice.id}|${varianteId}`;
    if (avant === undefined || initialise === cle) return;
    const p = depuisDerniereFois(avantVariante);
    if (tenu) setLignes(p ? p.map((l) => ({ reps: 0, dureeSec: l.dureeSec ?? 30, chargeKg: l.chargeKg ?? 0 })) : [0, 1, 2].map(() => ({ reps: 0, dureeSec: 30, chargeKg: 0 })));
    else if (p) setLignes(p.map((l) => ({ reps: l.dureeSec != null ? 10 : l.reps, chargeKg: l.chargeKg ?? 0 })));
    else setLignes([0, 1, 2].map(() => ({ reps: 10, chargeKg: suggestion?.chargeKg ?? 0 })));
    setSel(0);
    setInitialise(cle);
  }, [avant, exercice.id, varianteId, suggestion?.chargeKg]);

  const ref = unRmRecent(points);
  const meilleureTenue = tenu ? points.reduce<number | null>((m, p) => (p.dureeMax != null && (m == null || p.dureeMax > m) ? p.dureeMax : m), null) : null;
  const projete = maxProjete(points);
  const sansCharge = modeCharge === 'sans_charge';
  const lest = modeCharge === 'lest';
  const unite = uniteCharge(modeCharge);
  const fmtKg = (v?: number) => (lest ? signeLest(v ?? 0) : '') + (v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  const enregistrer = async (e: Event) => {
    if (occupe) return;
    const bouton = e.currentTarget as Element;
    setOccupe(true);
    try {
      const r = await enregistrerSetRapide({ exerciceId: exercice.id, varianteId: varianteId || undefined, series: lignes, modeCharge, enSecondes: tenu });
      eclatSur(bouton);
      const texte = tenu && sansCharge ? lignes.map((l) => l.dureeSec ?? 0).join('-') + ' s' : sansCharge ? lignes.map((l) => l.reps).join('-') + ' reps' : resumeLignes(lignes, unite);
      setDernier({ ...r, texte });
      let texteToast: string | undefined;
      for (const s of r.series) {
        const recs = await recordsDeLaSerie(s);
        if (recs[0]) {
          texteToast = recs[0].texte;
          break;
        }
      }
      // Objectif atteint : prioritaire sur le record (il le contient souvent).
      for (const s of r.series) {
        const obj = await objectifAtteintPar(s);
        if (obj) {
          texteToast = obj;
          break;
        }
      }
      if (texteToast) setToast(texteToast);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Carte titre="Noter une perf" ton="mise-en-avant" aside={<Aide mot="noterExercice" />}>
      <div class="ui-pile">
        <p class="ui-attenue sr-intro">
          Fait sans lancer de séance ? Touche une série (S1, S2…), règle {tenu ? 'combien de secondes tu as tenu' : 'ses reps'}
          {sansCharge ? '' : ` et ${lest ? 'son lest' : 'sa charge'}`}, puis enregistre.
        </p>
        {(ref != null || meilleureTenue != null || !!avantVariante?.length) && (
          <div class="sr-stats">
            {avantVariante && avantVariante.length > 0 && (
              <div>
                <span class="ui-surtitre">La dernière fois</span>
                <span class="ui-chiffre">
                  {sansCharge
                    ? avantVariante.some((s) => s.dureeSec != null)
                      ? `${avantVariante.map((s) => s.dureeSec ?? 0).join('-')} s`
                      : `${avantVariante.map((s) => s.reps).join('-')} reps`
                    : resumeLignes(avantVariante, unite)}
                </span>
              </div>
            )}
            {meilleureTenue != null && (
              <div>
                <span class="ui-surtitre">
                  Meilleure tenue <Aide mot="enSecondes" />
                </span>
                <span class="ui-chiffre">{fmtDuree(meilleureTenue)}</span>
              </div>
            )}
            {ref != null && (
              <div>
                <span class="ui-surtitre">
                  1RM estimé{modeCharge === 'par_main' ? ' (2 mains)' : ''} <Aide mot="unRm" />
                </span>
                <span class="ui-chiffre">{kg(ref)}</span>
              </div>
            )}
            {projete != null && ref != null && projete > ref + 0.5 && (
              <div>
                <span class="ui-surtitre">
                  Max projeté (4 sem.) <Aide texte="Le 1RM que tu pourrais atteindre dans 4 semaines si tu continues au même rythme (tendance de tes 12 dernières semaines)." libelle="Max projeté" />
                </span>
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

        <div class="sr-lignes" role="group" aria-label="Séries à enregistrer">
          {lignes.map((l, j) => (
            <button key={j} type="button" class="sr-ligne" aria-pressed={j === i} onClick={() => setSel(j)}>
              <span class="sr-num">S{j + 1}</span>
              <span class="ui-chiffre">
                {tenu ? `${l.dureeSec ?? 0} s` : `${l.reps} reps`}
                {sansCharge ? '' : ` · ${fmtKg(l.chargeKg)} ${unite}`}
              </span>
            </button>
          ))}
          <button type="button" class="sr-ligne sr-plus" onClick={ajouterLigne} aria-label="Ajouter une série">
            + Série
          </button>
        </div>

        <div class="sr-champs">
          <div class="ui-ligne-entre">
            <span class="ui-surtitre">Série {i + 1}</span>
            {lignes.length > 1 && (
              <button type="button" class="prog-puce" onClick={retirerLigne}>
                Retirer S{i + 1}
              </button>
            )}
          </div>
          {/* key par série : le champ repart de la valeur de la série touchée, sans délai de synchro. */}
          {tenu ? (
            <Stepper key={`duree-${i}`} id="sr-duree" valeur={ligne.dureeSec ?? 0} onChange={(v) => majLigne({ dureeSec: v })} unite="secondes" pas={5} min={1} max={3600} decimales={0} />
          ) : (
            <Stepper key={`reps-${i}`} id="sr-reps" valeur={ligne.reps} onChange={(v) => majLigne({ reps: v })} unite="reps" min={1} max={200} decimales={0} />
          )}
          {!sansCharge && (
            <Stepper
              key={`charge-${i}`}
              id="sr-charge"
              valeur={ligne.chargeKg ?? 0}
              onChange={(v) => majLigne({ chargeKg: v })}
              unite={unite}
              pas={pas}
              min={lest ? LEST_MIN_KG : 0}
              max={lest ? LEST_MAX_KG : 999}
              decimales={2}
            />
          )}
          {lest && <IndicationLest lestKg={ligne.chargeKg ?? 0} poidsCorporelKg={poidsActuel} />}
        </div>

        {suggestion && (
          <div class="sr-suggestion">
            <p class="ui-attenue">{suggestion.texte}</p>
            <div class="ui-ligne" style={{ flexWrap: 'wrap', gap: 'var(--e-2)' }}>
              {suggestion.source === 'historique' && suggestion.solide !== ligne.chargeKg && (
                <button type="button" class="prog-puce" onClick={() => majLigne({ chargeKg: suggestion.solide })}>
                  {fmtKg(suggestion.solide)} {unite}
                </button>
              )}
              {suggestion.chargeKg !== ligne.chargeKg && (
                <button type="button" class="prog-puce" onClick={() => majLigne({ chargeKg: suggestion.chargeKg })}>
                  {suggestion.source === 'historique' ? 'À tester : ' : 'Essayer '}
                  {fmtKg(suggestion.chargeKg)} {unite}
                </button>
              )}
            </div>
          </div>
        )}

        <Bouton taille="geant" icone="valider" onClick={enregistrer} disabled={occupe}>
          Enregistrer {lignes.length} série{lignes.length > 1 ? 's' : ''}
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
