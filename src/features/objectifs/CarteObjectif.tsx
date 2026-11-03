// Objectifs de la fiche exercice (plusieurs par exercice) : fixer une cible, voir la marge, la projection et des conseils.
import { useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import type { Exercice, MesureObjectif, Objectif } from '../../core/types';
import { Bouton, Carte, Onglets, Puce, Stepper } from '../../ui';
import type { DonneesProgression } from '../progression/donnees';
import { conseilsObjectif, evaluerObjectif, fmtValeur, libelleCible, LIBELLE_STATUT, phraseMarge, phraseProjection, repsCible, uniteMesure, type StatutObjectif } from './calculs';
import { enregistrerObjectif, objectifsDe, supprimerObjectif } from './objectifs';
import './objectifs.css';

const MESURES: { valeur: MesureObjectif; libelle: string }[] = [
  { valeur: 'serie', libelle: 'Reps × kg' },
  { valeur: 'un_rm', libelle: '1RM estimé' },
  { valeur: 'reps', libelle: 'Reps max' },
];
const TITRE: { [m in MesureObjectif]: string } = { serie: 'Série', un_rm: '1RM estimé', charge_max: 'Charge max', reps: 'Reps max' };
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

function SuiviObjectif({ exercice, d, objectif, modifier }: { exercice: Exercice; d: DonneesProgression; objectif: Objectif; modifier: () => void }) {
  const { points, etat } = useMemo(() => evaluerObjectif(objectif, d), [objectif, d]);
  const conseils = useMemo(() => conseilsObjectif(objectif, etat, points, exercice.equipement), [objectif, etat, points, exercice.equipement]);
  const u = uniteMesure(objectif.mesure);
  const fmt = (v: number) => fmtValeur(v, objectif.mesure);
  const serie = objectif.mesure === 'serie';
  return (
    <Carte
      ton="progres"
      titre={`Objectif · ${objectif.mesure === 'serie' ? libelleCible(objectif) : TITRE[objectif.mesure]}`}
      aside={<Puce ton={TON[etat.statut]}>{etat.atteint ? '🎉 ' : ''}{LIBELLE_STATUT[etat.statut]}</Puce>}
    >
      <div class="obj-chiffres">
        {serie && <span class="ui-attenue">{repsCible(objectif)} ×</span>}
        <span class="ui-chiffre obj-actuel">{etat.actuel != null ? fmt(etat.actuel) : '–'}</span>
        <span class="ui-attenue">/ {fmt(objectif.cible)} {u}</span>
      </div>
      <div class="obj-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(etat.pourcentage)} aria-label={phraseMarge(objectif, etat)}>
        <span style={{ width: `${etat.pourcentage}%` }} />
      </div>
      <p class="obj-marge">
        {etat.atteint
          ? serie ? `Fait : ${libelleCible(objectif)} ou mieux ces 8 dernières semaines.` : 'Cible atteinte sur les 8 dernières semaines.'
          : etat.actuel == null
            ? 'Pas encore de série notée.'
            : etat.statut === 'a_tenter'
              ? `Ton niveau équivaut déjà à ${repsCible(objectif)} × ${fmt(etat.actuel)} kg : il reste à le faire pour de vrai.`
              : `Reste ${fmt(etat.reste)} ${u} (${Math.round(etat.pourcentage)} % de la cible).`}
      </p>
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
      {points.length > 0 && serie && (
        <p class="prog-note ui-attenue">Le grand chiffre est la charge que tu tiendrais pour {repsCible(objectif)} reps d'après ta meilleure série récente (formule d'Epley), charge telle que notée.</p>
      )}
      {points.length > 0 && (objectif.mesure === 'un_rm' || objectif.mesure === 'charge_max') && (
        <p class="prog-note ui-attenue">Même valeur que la courbe {objectif.mesure === 'un_rm' ? '1RM' : 'charge max'} (charge effective{exercice.modeCharge === 'par_main' ? ', les 2 haltères' : exercice.modeCharge === 'lest' ? ', poids du corps inclus' : ''}).</p>
      )}
      {points.length > 0 && objectif.mesure === 'reps' && <p class="prog-note ui-attenue">Meilleure série de travail, toutes charges confondues.</p>}
    </Carte>
  );
}


function FormulaireObjectif({ exercice, d, objectif, fermer }: { exercice: Exercice; d: DonneesProgression; objectif?: Objectif; fermer: () => void }) {
  const sansCharge = exercice.modeCharge === 'sans_charge';
  const [mesure, setMesure] = useState<MesureObjectif>(objectif?.mesure ?? (sansCharge ? 'reps' : 'serie'));
  const [reps, setReps] = useState<number>(objectif?.reps ?? 8);
  const actuelPour = (m: MesureObjectif, r = reps) =>
    evaluerObjectif({ id: '', exerciceId: exercice.id, mesure: m, cible: 1, reps: r, creeLe: '', modifieLe: '' }, d).etat.actuel;
  const proposition = (m: MesureObjectif, r = reps) => {
    const a = actuelPour(m, r);
    if (m === 'reps') return a ? Math.ceil(a * 1.25) : 10;
    return a ? Math.ceil((a * (m === 'serie' ? 1.05 : 1.1)) / 2.5) * 2.5 : 50;
  };
  const [cible, setCible] = useState<number>(() => objectif?.cible ?? proposition(mesure));
  const [echeance, setEcheance] = useState(objectif?.echeance ?? '');
  const actuel = actuelPour(mesure);
  const fmt = (v: number) => fmtValeur(v, mesure);
  const changerMesure = (m: MesureObjectif) => {
    setMesure(m);
    if (!objectif || objectif.mesure !== m) setCible(proposition(m));
  };
  const changerReps = (r: number) => {
    setReps(r);
    // Pas encore touché à la charge : on la recale sur le nouveau nombre de reps.
    if (!objectif) setCible(proposition('serie', r));
  };
  const valider = async (e: Event) => {
    e.preventDefault();
    if (!(cible > 0)) return;
    await enregistrerObjectif(exercice.id, { mesure, cible, reps, echeance }, objectif);
    fermer();
  };
  const enReps = mesure === 'reps';
  const serie = mesure === 'serie';
  const options = objectif?.mesure === 'charge_max' ? [...MESURES, { valeur: 'charge_max' as const, libelle: 'Charge max' }] : MESURES;
  const aide =
    actuel == null
      ? 'Pas encore de mesure sur cet exercice.'
      : serie
        ? `Aujourd'hui, ton niveau équivaut à ${reps} × ${fmt(actuel)} kg${reps > 1 ? ` (1RM estimé ${fmt(actuelPour('serie', 1)!)} kg)` : ''}.`
        : `Actuellement : ${fmt(actuel)} ${enReps ? 'reps' : 'kg'}`;
  return (
    <Carte ton="progres" titre={objectif ? 'Modifier l’objectif' : 'Nouvel objectif'}>
      <form class="ui-pile" onSubmit={valider}>
        <Onglets label="Type d'objectif" options={options} valeur={mesure} onChange={changerMesure} />
        {serie && (
          <div class="ex-champ">
            <span class="ui-surtitre">Reps</span>
            <Stepper id="obj-reps" valeur={reps} onChange={changerReps} unite="reps" pas={1} min={1} max={50} decimales={0} />
          </div>
        )}
        <div class="ex-champ">
          <span class="ui-surtitre">{serie ? 'Charge' : 'Cible'}</span>
          <Stepper id="obj-cible" valeur={cible} onChange={setCible} unite={enReps ? 'reps' : 'kg'} pas={enReps ? 1 : 2.5} min={enReps ? 1 : 0} max={enReps ? 200 : 600} decimales={enReps ? 0 : 1} />
          <span class="ui-attenue obj-aide">{aide}</span>
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
