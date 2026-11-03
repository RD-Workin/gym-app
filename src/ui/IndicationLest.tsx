import { chargeEffective } from '../core/calculs';
import { Aide } from './Aide';

const kg = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;

/**
 * Sous le champ de charge d'un exercice au poids du corps (mode « lest ») : ce qu'on note, et la charge réelle
 * (poids du corps + lest) quand le poids est connu. Un lest négatif = une aide (élastique, machine).
 */
export function IndicationLest({ lestKg, poidsCorporelKg }: { lestKg: number; poidsCorporelKg?: number }) {
  const reelle = chargeEffective({ chargeKg: lestKg, modeCharge: 'lest' }, poidsCorporelKg);
  const calcul =
    poidsCorporelKg == null
      ? 'Note ton poids du corps en début de séance pour voir la charge réelle.'
      : lestKg === 0
        ? `Charge réelle : ton poids, ${kg(poidsCorporelKg)}.`
        : `Charge réelle : ${kg(poidsCorporelKg)} ${lestKg > 0 ? '+' : '−'} ${kg(Math.abs(lestKg))} = ${kg(reelle ?? 0)}.`;
  return (
    <p class="ui-attenue ui-indication-lest">
      {lestKg < 0 ? 'Aide : ' : lestKg > 0 ? 'Lest ajouté : ' : 'Sans lest : '}
      {lestKg < 0 ? 'en négatif = kg retirés par un élastique ou une machine.' : lestKg > 0 ? 'ceinture, gilet ou haltère en plus de ton poids.' : 'poids du corps seul. En négatif si tu te fais aider.'}{' '}
      {calcul} <Aide mot="lest" />
    </p>
  );
}
