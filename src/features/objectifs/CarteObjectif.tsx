// Carte « Objectif » de la fiche exercice : fixer une cible, voir la marge, la projection et des conseils.
import { useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import type { Exercice, MesureObjectif, Objectif } from '../../core/types';
import { Bouton, Carte, Onglets, Puce, Stepper } from '../../ui';
import type { DonneesProgression } from '../progression/donnees';
import { conseilsObjectif, evaluerObjectif, fmtValeur, LIBELLE_STATUT, NOM_MESURE, phraseMarge, phraseProjection, uniteMesure, type StatutObjectif } from './calculs';
import { enregistrerObjectif, objectifDe, supprimerObjectif } from './objectifs';
import './objectifs.css';

const MESURES: { valeur: MesureObjectif; libelle: string }[] = [
  { valeur: 'un_rm', libelle: '1RM estimé' },
  { valeur: 'charge_max', libelle: 'Charge max' },
  { valeur: 'reps', libelle: 'Reps' },
];
const TON: { [s in StatutObjectif]: 'progres' | 'alerte' | 'record' | undefined } = {
  atteint: 'record',
  en_avance: 'progres',
  dans_les_temps: 'progres',
  en_progres: 'progres',
  en_retard: 'alerte',
  stagne: 'alerte',
  pas_assez: undefined,
};

export function CarteObjectif({ exercice, d }: { exercice: Exercice; d: DonneesProgression }) {
  const objectif = useRequete(() => objectifDe(exercice.id).then((o) => o ?? null), [exercice.id]);
  const [edition, setEdition] = useState(false);
  if (objectif === undefined) return null;
  if (edition || !objectif) {
    if (!edition)
      return (
        <button type="button" class="obj-fixer" onClick={() => setEdition(true)}>
          <span aria-hidden="true">🎯</span> Fixer un objectif sur cet exercice
        </button>
      );
    return <FormulaireObjectif exercice={exercice} d={d} objectif={objectif ?? undefined} fermer={() => setEdition(false)} />;
  }
  return <SuiviObjectif exercice={exercice} d={d} objectif={objectif} modifier={() => setEdition(true)} />;
}

function SuiviObjectif({ exercice, d, objectif, modifier }: { exercice: Exercice; d: DonneesProgression; objectif: Objectif; modifier: () => void }) {
  const { points, etat } = useMemo(() => evaluerObjectif(objectif, d), [objectif, d]);
  const conseils = useMemo(() => conseilsObjectif(objectif, etat, points, exercice.equipement), [objectif, etat, points, exercice.equipement]);
  const u = uniteMesure(objectif.mesure);
  const fmt = (v: number) => fmtValeur(v, objectif.mesure);
  return (
    <Carte
      ton="progres"
      titre={`Objectif · ${NOM_MESURE[objectif.mesure]}`}
      aside={<Puce ton={TON[etat.statut]}>{etat.atteint ? '🎉 ' : ''}{LIBELLE_STATUT[etat.statut]}</Puce>}
    >
      <div class="obj-chiffres">
        <span class="ui-chiffre obj-actuel">{etat.actuel != null ? fmt(etat.actuel) : '–'}</span>
        <span class="ui-attenue">/ {fmt(objectif.cible)} {u}</span>
      </div>
      <div class="obj-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(etat.pourcentage)} aria-label={phraseMarge(objectif, etat)}>
        <span style={{ width: `${etat.pourcentage}%` }} />
      </div>
      <p class="obj-marge">{etat.atteint ? 'Cible atteinte sur les 8 dernières semaines.' : etat.actuel == null ? 'Pas encore de série notée.' : `Reste ${fmt(etat.reste)} ${u} (${Math.round(etat.pourcentage)} % de la cible).`}</p>
      <p class="obj-projection ui-attenue">{phraseProjection(objectif, etat)}.</p>
      {conseils.length > 0 && (
        <div class="obj-conseils">
          <span class="ui-surtitre">Pour y arriver</span>
          <ul>
            {conseils.map((c) => (
              <li key={c.regle}>{c.texte}</li>
            ))}
          </ul>
        </div>
      )}
      <div class="ui-ligne">
        <Bouton variante="secondaire" onClick={modifier}>Modifier</Bouton>
        <Bouton variante="contour" onClick={() => confirm('Supprimer cet objectif ?') && supprimerObjectif(objectif.id)}>Supprimer</Bouton>
      </div>
      {points.length > 0 && objectif.mesure !== 'reps' && (
        <p class="prog-note ui-attenue">Même valeur que la courbe {objectif.mesure === 'un_rm' ? '1RM' : 'charge max'} (charge effective{exercice.modeCharge === 'par_main' ? ', les 2 haltères' : exercice.modeCharge === 'lest' ? ', poids du corps inclus' : ''}).</p>
      )}
      {points.length > 0 && objectif.mesure === 'reps' && <p class="prog-note ui-attenue">Meilleure série de travail, toutes charges confondues.</p>}
    </Carte>
  );
}


function FormulaireObjectif({ exercice, d, objectif, fermer }: { exercice: Exercice; d: DonneesProgression; objectif?: Objectif; fermer: () => void }) {
  const sansCharge = exercice.modeCharge === 'sans_charge';
  const [mesure, setMesure] = useState<MesureObjectif>(objectif?.mesure ?? (sansCharge ? 'reps' : 'un_rm'));
  const actuelPour = (m: MesureObjectif) => evaluerObjectif({ id: '', exerciceId: exercice.id, mesure: m, cible: 1, creeLe: '', modifieLe: '' }, d).etat.actuel;
  const proposition = (m: MesureObjectif) => {
    const a = actuelPour(m);
    if (m === 'reps') return a ? Math.ceil(a * 1.25) : 10;
    return a ? Math.ceil((a * 1.1) / 2.5) * 2.5 : 50;
  };
  const [cible, setCible] = useState<number>(objectif?.cible ?? proposition(mesure));
  const [echeance, setEcheance] = useState(objectif?.echeance ?? '');
  const actuel = actuelPour(mesure);
  const fmt = (v: number) => fmtValeur(v, mesure);
  const changerMesure = (m: MesureObjectif) => {
    setMesure(m);
    if (!objectif || objectif.mesure !== m) setCible(proposition(m));
  };
  const valider = async (e: Event) => {
    e.preventDefault();
    if (!(cible > 0)) return;
    await enregistrerObjectif(exercice.id, { mesure, cible, echeance }, objectif);
    fermer();
  };
  const reps = mesure === 'reps';
  return (
    <Carte ton="progres" titre={objectif ? 'Modifier l’objectif' : 'Nouvel objectif'}>
      <form class="ui-pile" onSubmit={valider}>
        <Onglets label="Mesure de l'objectif" options={MESURES} valeur={mesure} onChange={changerMesure} />
        <div class="ex-champ">
          <span class="ui-surtitre">Cible</span>
          <Stepper id="obj-cible" valeur={cible} onChange={setCible} unite={reps ? 'reps' : 'kg'} pas={reps ? 1 : 2.5} min={reps ? 1 : 0} max={reps ? 200 : 600} decimales={reps ? 0 : 1} />
          <span class="ui-attenue obj-aide">{actuel != null ? `Actuellement : ${fmt(actuel)} ${reps ? 'reps' : 'kg'}` : 'Pas encore de mesure sur cet exercice.'}</span>
        </div>
        <label class="ex-champ">
          <span class="ui-surtitre">Date visée (facultatif)</span>
          <input type="date" value={echeance} onInput={(e) => setEcheance(e.currentTarget.value)} />
        </label>
        <div class="ui-ligne">
          <Bouton type="submit" icone="valider" disabled={!(cible > 0)}>Enregistrer</Bouton>
          <Bouton variante="contour" onClick={fermer}>Annuler</Bouton>
        </div>
      </form>
    </Carte>
  );
}
