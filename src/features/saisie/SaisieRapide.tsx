// Saisie rapide d'un set (séries × reps × kg) depuis la fiche d'un exercice. Propriétaire : 04-seance.
// Stats et suggestions : 05-progression (suggestion.ts).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Aide, Bouton, Carte, Puce, ToastRecord } from '../../ui';
import { fmtDuree, signeLest, uniteCharge } from '../../core/calculs';
import { eclatSur } from '../../anim';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import type { Exercice, Id, Variante } from '../../core/types';
import { libelleGroupe } from '../../data/groupes';
import { kg, pointsExercice } from '../progression/calculs';
import { objectifAtteintPar } from '../objectifs/objectifs';
import { recordsDeLaSerie, type DonneesProgression } from '../progression/donnees';
import { corrigerSeriesExercice, derniereFois, resumeSeries } from '../seance/logique';
import { annulerSetRapide, dejaNoteAujourdhui, enregistrerSetRapide, type LigneSet, type ResultatRapide } from './saisieRapide';
import { EditeurLignes, ligneActive } from './EditeurLignes';
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
  // Séries déjà notées aujourd'hui pour cet exercice (même variante) : on peut les corriger au lieu d'en rajouter.
  const deja = useRequete(() => dejaNoteAujourdhui(exercice.id), [exercice.id]);
  const dejaVariante = deja?.series.filter((s) => (s.varianteId ?? '') === varianteId) ?? [];
  // « La dernière fois » ne répète pas les séries du jour, déjà montrées (ou en cours de correction) juste au-dessus.
  const derniereFoisDuJour = !!deja && avantVariante?.[0]?.seanceId === deja.seanceId;
  const [correction, setCorrection] = useState(false);
  const [corrige, setCorrige] = useState(false);

  const i = ligneActive(lignes, sel);
  const ligne = lignes[i];
  const majLigne = (p: Partial<LigneSet>) => setLignes((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const corriger = () => {
    setLignes(dejaVariante.map((s) => ({ id: s.id, type: s.type, reps: s.reps, chargeKg: s.chargeKg ?? 0, dureeSec: s.dureeSec })));
    setSel(0);
    setCorrection(true);
    setCorrige(false);
    setDernier(undefined);
  };
  const quitterCorrection = () => {
    setCorrection(false);
    // Repart des séries de la dernière fois, comme à l'ouverture de la fiche.
    setInitialise('');
  };
  const enregistrerCorrection = async () => {
    if (occupe || !deja) return;
    setOccupe(true);
    try {
      await corrigerSeriesExercice(deja.seanceId, exercice.id, lignes, { modeCharge, enSecondes: tenu, varianteId });
      setCorrection(false);
      setCorrige(true);
      setInitialise('');
    } finally {
      setOccupe(false);
    }
  };
  const supprimerDuJour = async () => {
    if (occupe || !deja) return;
    if (!confirm(`Supprimer les ${dejaVariante.length} séries de ${exercice.nom} notées aujourd’hui ?`)) return;
    setOccupe(true);
    try {
      await corrigerSeriesExercice(deja.seanceId, exercice.id, [], { modeCharge, enSecondes: tenu, varianteId });
      setCorrection(false);
      setInitialise('');
    } finally {
      setOccupe(false);
    }
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
    if (avant === undefined || initialise === cle || correction) return;
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
  // Record perso (PR) : la charge la plus lourde vraiment soulevée, à côté du 1RM estimé (le potentiel).
  const pr = tenu ? null : points.reduce<number | null>((m, p) => (p.chargeMax != null && (m == null || p.chargeMax > m) ? p.chargeMax : m), null);
  // Reps faites à cette charge (affichées « 80 kg × 3 », comme dans les records) ; absentes si la charge est recalculée (lest, 2 mains).
  const repsPr =
    pr == null
      ? undefined
      : points
          .filter((p) => p.chargeMax === pr)
          .flatMap((p) => p.series.filter((x) => x.chargeKg === pr).map((x) => x.reps))
          .reduce<number | undefined>((m, r) => (r != null && (m == null || r > m) ? r : m), undefined);
  const sansCharge = modeCharge === 'sans_charge';
  const lest = modeCharge === 'lest';
  const unite = uniteCharge(modeCharge);
  const fmtKg = (v?: number) => (lest ? signeLest(v ?? 0) : '') + (v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  const enregistrer = async (e: Event) => {
    if (occupe) return;
    setCorrige(false);
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
        {correction ? (
          <p class="ui-attenue sr-intro">
            Tu corriges les séries notées aujourd’hui : touche une série, change {tenu ? 'ses secondes' : 'ses reps'}
            {sansCharge ? '' : ` ou ${lest ? 'son lest' : 'sa charge'}`}, retire-la ou ajoute-en une, puis enregistre.
          </p>
        ) : (
          <p class="ui-attenue sr-intro">
            Fait sans lancer de séance ? Touche une série (S1, S2…), règle {tenu ? 'combien de secondes tu as tenu' : 'ses reps'}
            {sansCharge ? '' : ` et ${lest ? 'son lest' : 'sa charge'}`}, puis enregistre.
          </p>
        )}
        {!correction && !dernier && dejaVariante.length > 0 && (
          <div class="sr-deja" role="group" aria-label="Déjà noté aujourd’hui">
            <span>
              <span class="ui-surtitre">Déjà noté aujourd’hui</span>
              <span class="ui-chiffre">{resumeSeries(dejaVariante)}</span>
            </span>
            <button type="button" class="prog-puce sr-corriger" onClick={corriger}>
              Corriger ces séries
            </button>
          </div>
        )}
        {corrige && !correction && (
          <div class="sr-confirmation" role="status">
            <Puce ton="progres">✓ Séries corrigées</Puce>
          </div>
        )}
        {(ref != null || meilleureTenue != null || (!!avantVariante?.length && !derniereFoisDuJour)) && (
          <div class="sr-stats">
            {avantVariante && avantVariante.length > 0 && !derniereFoisDuJour && (
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
            {pr != null && pr > 0 && (
              <div>
                <span class="ui-surtitre">
                  Record perso (PR){modeCharge === 'par_main' ? ' (2 mains)' : ''} <Aide mot="pr" />
                </span>
                <span class="ui-chiffre">
                  {kg(pr)}
                  {repsPr ? ` × ${repsPr}` : ''}
                </span>
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

        {variantes.length > 0 && !correction && (
          <div class="prog-puces" role="group" aria-label="Variante">
            {[{ id: '', nom: 'Standard' }, ...variantes].map((v) => (
              <button key={v.id} type="button" class="prog-puce" aria-pressed={varianteId === v.id} onClick={() => setVarianteId(v.id)}>
                {v.nom}
              </button>
            ))}
          </div>
        )}

        <EditeurLignes lignes={lignes} setLignes={setLignes} sel={i} setSel={setSel} modeCharge={modeCharge} tenu={tenu} pas={pas} poidsCorporelKg={poidsActuel} />

        {suggestion && !correction && (
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

        {correction ? (
          <>
            <Bouton taille="geant" icone="valider" onClick={enregistrerCorrection} disabled={occupe}>
              Enregistrer la correction
            </Bouton>
            <div class="ui-ligne-entre">
              <Bouton variante="secondaire" onClick={quitterCorrection}>
                Annuler
              </Bouton>
              <Bouton variante="danger" onClick={supprimerDuJour} disabled={occupe}>
                Supprimer
              </Bouton>
            </div>
          </>
        ) : (
          <Bouton taille="geant" icone="valider" onClick={enregistrer} disabled={occupe}>
            Enregistrer {lignes.length} série{lignes.length > 1 ? 's' : ''}
          </Bouton>
        )}

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
            {dejaVariante.length > 0 && (
              <button type="button" class="prog-puce" onClick={corriger}>
                Corriger
              </button>
            )}
          </div>
        )}
      </div>
      {toast && <ToastRecord texte={toast} onFin={() => setToast(undefined)} />}
    </Carte>
  );
}
