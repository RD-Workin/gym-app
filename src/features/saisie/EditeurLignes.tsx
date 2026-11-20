// Séries à saisir ou à corriger, une par une (S1, S2… puis reps/secondes et charge). Propriétaire : 04-seance.
// Utilisé par « Noter une perf » (fiche exercice) et par la correction d'une séance faite.
import { IndicationLest, Stepper } from '../../ui';
import { LEST_MAX_KG, LEST_MIN_KG, signeLest, uniteCharge } from '../../core/calculs';
import type { ModeCharge } from '../../core/types';
import type { LigneSet } from './saisieRapide';
import '../progression/progression.css';
import './saisie.css';

export interface PropsEditeurLignes {
  lignes: LigneSet[];
  setLignes: (f: (l: LigneSet[]) => LigneSet[]) => void;
  sel: number;
  setSel: (i: number) => void;
  modeCharge: ModeCharge;
  /** Exercice tenu : secondes au lieu de reps. */
  tenu: boolean;
  pas: number;
  poidsCorporelKg?: number;
  /** Préfixe des id de champs (deux éditeurs sur un même écran). */
  idChamps?: string;
}

/** Index de la série affichée (borné à la liste). */
export const ligneActive = (lignes: LigneSet[], sel: number) => Math.max(0, Math.min(sel, lignes.length - 1));

export function EditeurLignes({ lignes, setLignes, sel, setSel, modeCharge, tenu, pas, poidsCorporelKg, idChamps = 'sr' }: PropsEditeurLignes) {
  const i = ligneActive(lignes, sel);
  const ligne = lignes[i];
  const sansCharge = modeCharge === 'sans_charge';
  const lest = modeCharge === 'lest';
  const unite = uniteCharge(modeCharge);
  const fmtKg = (v?: number) => (lest ? signeLest(v ?? 0) : '') + (v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const majLigne = (p: Partial<LigneSet>) => setLignes((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const ajouterLigne = () => {
    // La nouvelle série repart de la dernière (reps et charge), sans reprendre son id.
    setLignes((l) => [...l, { reps: l[l.length - 1]?.reps ?? 10, chargeKg: l[l.length - 1]?.chargeKg, dureeSec: l[l.length - 1]?.dureeSec }]);
    setSel(lignes.length);
  };
  const retirerLigne = () => {
    if (lignes.length < 2) return;
    setLignes((l) => l.filter((_, j) => j !== i));
    setSel(Math.max(0, i - 1));
  };
  const numero = (j: number) => (lignes[j].type === 'echauffement' ? 'É' : `S${j + 1}`);
  if (!ligne) return null;

  return (
    <>
      <div class="sr-lignes" role="group" aria-label="Séries">
        {lignes.map((l, j) => (
          <button key={j} type="button" class="sr-ligne" aria-pressed={j === i} onClick={() => setSel(j)}>
            <span class="sr-num">{numero(j)}</span>
            <span class="ui-chiffre">
              {tenu ? `${l.dureeSec ?? 0} s` : `${l.reps} reps`}
              {sansCharge || (lest && !l.chargeKg) ? '' : ` · ${fmtKg(l.chargeKg)} ${unite}`}
            </span>
          </button>
        ))}
        <button type="button" class="sr-ligne sr-plus" onClick={ajouterLigne} aria-label="Ajouter une série">
          + Série
        </button>
      </div>

      <div class="sr-champs">
        <div class="ui-ligne-entre">
          <span class="ui-surtitre">{ligne.type === 'echauffement' ? 'Série d’échauffement' : `Série ${i + 1}`}</span>
          {lignes.length > 1 && (
            <button type="button" class="prog-puce" onClick={retirerLigne}>
              Retirer {numero(i)}
            </button>
          )}
        </div>
        {/* key par série : le champ repart de la valeur de la série touchée, sans délai de synchro. */}
        {tenu ? (
          <Stepper key={`duree-${i}`} id={`${idChamps}-duree`} valeur={ligne.dureeSec ?? 0} onChange={(v) => majLigne({ dureeSec: v })} unite="secondes" pas={5} min={1} max={3600} decimales={0} />
        ) : (
          <Stepper key={`reps-${i}`} id={`${idChamps}-reps`} valeur={ligne.reps} onChange={(v) => majLigne({ reps: v })} unite="reps" min={1} max={200} decimales={0} />
        )}
        {!sansCharge && (
          <Stepper
            key={`charge-${i}`}
            id={`${idChamps}-charge`}
            valeur={ligne.chargeKg ?? 0}
            onChange={(v) => majLigne({ chargeKg: v })}
            unite={unite}
            pas={pas}
            min={lest ? LEST_MIN_KG : 0}
            max={lest ? LEST_MAX_KG : 999}
            decimales={2}
          />
        )}
        {lest && <IndicationLest lestKg={ligne.chargeKg ?? 0} poidsCorporelKg={poidsCorporelKg} />}
      </div>
    </>
  );
}
