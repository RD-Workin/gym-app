// Objectifs de la fiche exercice (plusieurs par exercice) : fixer une cible, voir la marge, la projection et des conseils.
import { useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import type { Exercice, MesureObjectif, Objectif } from '../../core/types';
import { Aide, Bouton, Carte, Onglets, Puce, Stepper } from '../../ui';
import { LEST_MAX_KG, LEST_MIN_KG, signeLest } from '../../core/calculs';
import type { DonneesProgression } from '../progression/donnees';
import { conseilsObjectif, evaluerObjectif, fmtValeur, LIBELLE_STATUT, phraseCourte, phraseMarge, repsCible, typeObjectif, uniteMesure, type StatutObjectif } from './calculs';
import { enregistrerObjectif, objectifsDe, supprimerObjectif } from './objectifs';
import './objectifs.css';

/** Types proposés : 1RM (1 rep au max visé) et charge d'entraînement (X kg pour Y reps), tous deux en mesure `serie`. */
type TypeForm = '1rm' | 'entrainement' | 'reps';
const TYPES: { valeur: TypeForm; libelle: string }[] = [
  { valeur: '1rm', libelle: '1RM' },
  { valeur: 'entrainement', libelle: 'Charge d’entraînement' },
];
const TON: { [s in StatutObjectif]: 'progres' | 'alerte' | 'record' | undefined } = {
  atteint: 'record',
  a_tenter: 'record',
  en_avance: 'progres',
  dans_les_temps: 'progres',
  en_progres: 'progres',
  en_retard: 'alerte',
  stagne: 'alerte',
  pas_assez: undefined,
};

/** Tous les objectifs de l'exercice, puis le bouton d'ajout. `edition` = id de l'objectif modifié, ou 'nouveau'. */
export function CarteObjectif({ exercice, d }: { exercice: Exercice; d: DonneesProgression }) {
  const objectifs = useRequete(() => objectifsDe(exercice.id), [exercice.id]);
  const [edition, setEdition] = useState<string | null>(null);
  if (objectifs === undefined) return null;
  const fermer = () => setEdition(null);
  return (
    <div class="ui-pile">
      {objectifs.map((o) =>
        edition === o.id ? (
          <FormulaireObjectif key={o.id} exercice={exercice} d={d} objectif={o} fermer={fermer} />
        ) : (
          <SuiviObjectif key={o.id} exercice={exercice} d={d} objectif={o} modifier={() => setEdition(o.id)} />
        ),
      )}
      {edition === 'nouveau' ? (
        <FormulaireObjectif exercice={exercice} d={d} fermer={fermer} />
      ) : (
        <button type="button" class="obj-fixer" onClick={() => setEdition('nouveau')}>
          <span aria-hidden="true">🎯</span> {objectifs.length ? 'Ajouter un objectif' : 'Fixer un objectif sur cet exercice'}
        </button>
      )}
    </div>
  );
}

/** Carte courte : cible, où j'en suis, une ligne de marge / date, puis 2 conseils repliés. */
function SuiviObjectif({ exercice, d, objectif, modifier }: { exercice: Exercice; d: DonneesProgression; objectif: Objectif; modifier: () => void }) {
  const { points, etat } = useMemo(() => evaluerObjectif(objectif, d), [objectif, d]);
  const conseils = useMemo(() => conseilsObjectif(objectif, etat, points, exercice.equipement, 2), [objectif, etat, points, exercice.equipement]);
  const lest = exercice.modeCharge === 'lest' && objectif.mesure === 'serie';
  const u = lest ? 'kg de lest' : uniteMesure(objectif.mesure);
  const fmt = (v: number) => (lest ? signeLest(v) : '') + fmtValeur(v, objectif.mesure);
  const entrainement = objectif.mesure === 'serie' && repsCible(objectif) > 1;
  const sousTitre = objectif.mesure === 'serie' ? (entrainement ? 'ton niveau actuel' : '1RM estimé') : objectif.mesure === 'reps' ? 'meilleure série' : 'actuel';
  return (
    <Carte
      ton="progres"
      titre={`🎯 ${typeObjectif(objectif)}`}
      aside={<Puce ton={TON[etat.statut]}>{etat.atteint ? '🎉 ' : ''}{LIBELLE_STATUT[etat.statut]}</Puce>}
    >
      <div class="obj-chiffres">
        {entrainement && <span class="ui-attenue obj-reps">{repsCible(objectif)} ×</span>}
        <span class="ui-chiffre obj-actuel">{etat.actuel != null ? fmt(etat.actuel) : '–'}</span>
        <span class="ui-attenue">/ {fmt(objectif.cible)} {u}</span>
        <span class="ui-attenue obj-sous">{sousTitre}</span>
      </div>
      <div class="obj-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(etat.pourcentage)} aria-label={phraseMarge(objectif, etat)}>
        <span style={{ width: `${etat.pourcentage}%` }} />
      </div>
      <p class="obj-marge">{phraseCourte(objectif, etat)}</p>
      {conseils.length > 0 && !etat.atteint && (
        <details class="obj-conseils">
          <summary>Conseils pour y arriver</summary>
          <ul>
            {conseils.map((c) => (
              <li key={c.regle}>{c.texte}</li>
            ))}
          </ul>
        </details>
      )}
      <button type="button" class="obj-modifier" onClick={modifier}>Modifier</button>
    </Carte>
  );
}

function FormulaireObjectif({ exercice, d, objectif, fermer }: { exercice: Exercice; d: DonneesProgression; objectif?: Objectif; fermer: () => void }) {
  const sansCharge = exercice.modeCharge === 'sans_charge';
  const lestEx = exercice.modeCharge === 'lest';
  // Un ancien objectif « 1RM estimé » ou « charge max » se modifie comme un objectif 1RM.
  const typeInitial: TypeForm = objectif
    ? objectif.mesure === 'reps' ? 'reps' : objectif.mesure === 'serie' && repsCible(objectif) > 1 ? 'entrainement' : '1rm'
    : sansCharge ? 'reps' : '1rm';
  const [type, setType] = useState<TypeForm>(typeInitial);
  const [repsEntrainement, setReps] = useState<number>(objectif?.reps && objectif.reps > 1 ? objectif.reps : 8);
  const reps = type === '1rm' ? 1 : repsEntrainement;
  const mesure: MesureObjectif = type === 'reps' ? 'reps' : 'serie';
  const actuelPour = (m: MesureObjectif, r: number) =>
    evaluerObjectif({ id: '', exerciceId: exercice.id, mesure: m, cible: 1, reps: r, creeLe: '', modifieLe: '' }, d).etat.actuel;
  const proposition = (t: TypeForm, r: number) => {
    if (t === 'reps') {
      const a = actuelPour('reps', 1);
      return a ? Math.ceil(a * 1.25) : 10;
    }
    const a = actuelPour('serie', t === '1rm' ? 1 : r);
    // Lest : 2,5 kg de plus que le niveau actuel (ou 2,5 kg d'aide en moins), la cible peut être 0 ou négative.
    if (lestEx) return a != null ? Math.ceil((a + 2.5) / 2.5) * 2.5 : 10;
    return a ? Math.ceil((a * 1.05) / 2.5) * 2.5 : 50;
  };
  const [cible, setCible] = useState<number>(() => objectif?.cible ?? proposition(typeInitial, reps));
  const [echeance, setEcheance] = useState(objectif?.echeance ?? '');
  const actuel = actuelPour(mesure, reps);
  const lest = lestEx && mesure === 'serie';
  const fmt = (v: number) => (lest ? signeLest(v) : '') + fmtValeur(v, mesure);
  const uKg = lest ? 'kg de lest' : 'kg';
  const cibleValide = lest ? Number.isFinite(cible) : cible > 0;
  const changerType = (t: TypeForm) => {
    setType(t);
    if (t !== typeInitial || !objectif) setCible(proposition(t, repsEntrainement));
  };
  const changerReps = (r: number) => {
    setReps(r);
    // Pas encore touché à la charge : on la recale sur le nouveau nombre de reps.
    if (!objectif) setCible(proposition('entrainement', r));
  };
  const valider = async (e: Event) => {
    e.preventDefault();
    if (!cibleValide) return;
    await enregistrerObjectif(exercice.id, { mesure, cible, reps, echeance }, objectif);
    fermer();
  };
  const enReps = type === 'reps';
  const options = sansCharge || objectif?.mesure === 'reps' ? [...TYPES, { valeur: 'reps' as const, libelle: 'Reps max' }] : TYPES;
  const aide =
    actuel == null
      ? 'Pas encore de mesure sur cet exercice.'
      : type === '1rm'
        ? `Ton 1RM estimé aujourd'hui : ${fmt(actuel)} ${uKg}.`
        : type === 'entrainement'
          ? `Ton niveau aujourd'hui : ${reps} × ${fmt(actuel)} ${uKg}.`
          : `Actuellement : ${fmt(actuel)} reps`;
  return (
    <Carte ton="progres" titre={objectif ? 'Modifier l’objectif' : 'Nouvel objectif'}>
      <form class="ui-pile" onSubmit={valider}>
        <Onglets label="Type d'objectif" options={options} valeur={type} onChange={changerType} />
        <div class="ex-champ">
          <span class="ui-surtitre">
            {type === '1rm' ? (lest ? 'Lest visé (1 rep)' : 'Max visé (1 rep)') : type === 'entrainement' ? (lest ? 'Lest' : 'Charge') : 'Reps visées'}
            {lest && <Aide mot="lest" />}
          </span>
          <Stepper
            id="obj-cible"
            valeur={cible}
            onChange={setCible}
            unite={enReps ? 'reps' : uKg}
            pas={enReps ? 1 : 2.5}
            min={enReps ? 1 : lest ? LEST_MIN_KG : 0}
            max={enReps ? 200 : lest ? LEST_MAX_KG : 600}
            decimales={enReps ? 0 : 1}
          />
          {lest && <span class="ui-attenue obj-aide">Kg ajoutés à ton poids du corps. 0 = sans lest, en négatif = avec une aide (élastique, machine).</span>}
        </div>
        {type === 'entrainement' && (
          <div class="ex-champ">
            <span class="ui-surtitre">Reps</span>
            <Stepper id="obj-reps" valeur={repsEntrainement} onChange={changerReps} unite="reps" pas={1} min={2} max={50} decimales={0} />
          </div>
        )}
        <span class="ui-attenue obj-aide">{aide}</span>
        <label class="ex-champ">
          <span class="ui-surtitre">Date visée (facultatif)</span>
          <input type="date" value={echeance} onInput={(e) => setEcheance(e.currentTarget.value)} />
        </label>
        <div class="ui-ligne">
          <Bouton type="submit" icone="valider" disabled={!cibleValide}>Enregistrer</Bouton>
          <Bouton variante="contour" onClick={fermer}>Annuler</Bouton>
        </div>
        {objectif && (
          <button type="button" class="obj-supprimer" onClick={async () => confirm('Supprimer cet objectif ?') && (await supprimerObjectif(objectif.id), fermer())}>
            Supprimer cet objectif
          </button>
        )}
      </form>
    </Carte>
  );
}
