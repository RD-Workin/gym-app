// Avis sur le format d'une séance type (propriétaire : 04-seance, libellés relus par 11).
import { useState } from 'preact/hooks';
import { Aide, Carte, Puce } from '../../ui';
import { LIBELLES_TYPE, LIBELLES_VERDICT, dureeTexteMin, type AvisModele } from './avis';

const MAX_VISIBLES = 3;

/** `max` : nombre de points montrés avant « Voir tout » (1 dans l'éditeur, pour ne pas repousser la liste des exercices). */
export function CarteAvis({ avis, max = MAX_VISIBLES }: { avis: AvisModele; max?: number }) {
  const [tout, setTout] = useState(false);
  const bon = avis.verdict === 'adaptee';
  const aRegler = avis.remarques.filter((r) => r.ton !== 'ok');
  const forts = avis.remarques.filter((r) => r.ton === 'ok');
  // Par défaut : les points à régler les plus importants, ou les points forts si tout va bien.
  const visibles = tout ? avis.remarques : aRegler.length ? aRegler.slice(0, max) : forts.slice(0, max);
  const caches = avis.remarques.length - visibles.length;

  return (
    <Carte
      titre={
        <>
          Avis sur ta séance <Aide mot="avisSeance" />
        </>
      }
      aside={avis.verdict !== 'vide' ? <Puce ton={bon ? 'progres' : 'alerte'}>{LIBELLES_VERDICT[avis.verdict]}</Puce> : undefined}
      ton={bon ? 'progres' : avis.verdict === 'vide' ? 'neutre' : 'alerte'}
    >
      {avis.verdict !== 'vide' && (
        <p class="sc-attenue sc-intro">
          {LIBELLES_TYPE[avis.type].split(' (')[0]} · {avis.series} séries · environ {dureeTexteMin(avis.dureeMin)}
        </p>
      )}
      <ul class="mo-remarques">
        {visibles.map((r, i) => (
          <li key={i} class={`mo-remarque ${r.ton}`}>
            <span aria-hidden="true">{r.ton === 'ok' ? '✓' : r.ton === 'probleme' ? '!' : '→'}</span>
            <span>{r.texte}</span>
          </li>
        ))}
      </ul>
      {(caches > 0 || tout) && (
        <button type="button" class="sc-lien" aria-expanded={tout} onClick={() => setTout(!tout)}>
          {tout ? 'Voir moins' : `Voir tout l’avis (${caches} de plus)`}
        </button>
      )}
    </Carte>
  );
}
