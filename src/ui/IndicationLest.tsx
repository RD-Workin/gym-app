import { chargeEffective } from '../core/calculs';
import { Aide } from './Aide';

const kg = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;

/**
 * Sous le champ de charge d'un exercice au poids du corps (mode « lest ») : ce qu'on note, et la charge réelle
 * (poids du corps + lest) quand le poids est connu. Un lest négatif = une aide (élastique, machine).
 */
export function IndicationLest({ lestKg, poidsCorporelKg }: { lestKg: number; poidsCorporelKg?: number }) {
  const reelle = chargeEffective({ chargeKg: lestKg, modeCharge: 'lest' }, poidsCorporelKg);
  const ce =
    lestKg < 0
      ? `Aidé de ${kg(-lestKg)} (élastique ou machine).`
      : lestKg > 0
        ? `${kg(lestKg)} ajoutés à ton poids (ceinture, gilet, haltère).`
        : 'Poids du corps seul. Monte avec + pour un lest, descends sous 0 si un élastique ou une machine t’aide.';
  const calcul =
    poidsCorporelKg == null
      ? 'Note ton poids au début d’une séance (« Ton poids ? ») pour voir la charge réelle.'
      : lestKg === 0
        ? `Charge réelle : ${kg(poidsCorporelKg)}.`
        : `Charge réelle : ${kg(poidsCorporelKg)} ${lestKg > 0 ? '+' : '−'} ${kg(Math.abs(lestKg))} = ${kg(reelle ?? 0)}.`;
  return (
    <p class="ui-attenue ui-indication-lest">
      {ce} {calcul} <Aide mot="lest" />
    </p>
  );
}
