import { useEffect, useState } from 'preact/hooks';
import { Bouton, Carte } from '../../ui';
import { db } from '../db';
import { installerMiseAJour, useMiseAJourDisponible } from '../miseAJour';
import { CLE_NOUVEAUTES_VUES, DERNIERE_NOUVEAUTE, NOUVEAUTES } from '../nouveautes';
import { correctifsEnAttente, traiterCorrectifs, type Correctif } from '../correctifs';
import { useRequete } from '../requetes';
import './mise-a-jour.css';

/** Bandeau global : une nouvelle version est téléchargée et attend d'être activée. */
export function BanniereMiseAJour() {
  const dispo = useMiseAJourDisponible();
  const [encours, setEncours] = useState(false);
  if (!dispo) return null;
  return (
    <button
      type="button"
      class="maj-banniere"
      disabled={encours}
      onClick={() => {
        setEncours(true);
        void installerMiseAJour();
      }}
    >
      <span>
        {encours ? 'Mise à jour…' : 'Nouvelle version disponible'}
        <small>Toucher pour mettre à jour (tes données sont conservées).</small>
      </span>
    </button>
  );
}

/** Carte « Quoi de neuf » sur l'accueil, une fois par version, avec les corrections de contenu proposées. */
export function CarteNouveautes() {
  const vue = useRequete(async () => ((await db.reglages.get(CLE_NOUVEAUTES_VUES))?.valeur as number | undefined) ?? 0);
  const [correctifs, setCorrectifs] = useState<{ correctif: Correctif; nombre: number }[]>([]);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (vue !== undefined && vue < DERNIERE_NOUVEAUTE) void correctifsEnAttente().then(setCorrectifs);
  }, [vue]);

  if (vue === undefined || vue >= DERNIERE_NOUVEAUTE) {
    return message ? <p class="ui-attenue">{message}</p> : null;
  }

  const fermer = async (appliquer: boolean) => {
    if (correctifs.length) {
      const n = await traiterCorrectifs(appliquer);
      if (appliquer) setMessage(`${n} correction${n > 1 ? 's' : ''} appliquée${n > 1 ? 's' : ''}.`);
    }
    await db.reglages.put({ cle: CLE_NOUVEAUTES_VUES, valeur: DERNIERE_NOUVEAUTE });
  };

  const points = NOUVEAUTES.filter((n) => n.numero > vue).flatMap((n) => n.points);

  return (
    <div class="maj-nouveautes">
      <Carte titre="Quoi de neuf" ton="mise-en-avant">
        <ul>
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {correctifs.length > 0 && (
          <>
            <p>Corrections proposées pour tes données (seules les valeurs que tu n'as pas modifiées changent) :</p>
            <ul>
              {correctifs.map(({ correctif }) => (
                <li key={correctif.id}>{correctif.description}</li>
              ))}
            </ul>
          </>
        )}
        <div class="maj-actions">
          {correctifs.length > 0 ? (
            <>
              <Bouton onClick={() => void fermer(true)}>Appliquer les corrections</Bouton>
              <Bouton variante="secondaire" onClick={() => void fermer(false)}>
                Garder mes valeurs
              </Bouton>
            </>
          ) : (
            <Bouton variante="secondaire" onClick={() => void fermer(false)}>
              OK
            </Bouton>
          )}
        </div>
      </Carte>
    </div>
  );
}
