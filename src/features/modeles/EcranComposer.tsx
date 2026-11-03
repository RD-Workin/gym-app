// « Composer ma séance » : l'app propose les exercices un par un (propriétaire : 04-seance, libellés relus par 11).
import { useState } from 'preact/hooks';
import { Aide, Bouton, Carte, Onglets } from '../../ui';
import { nouvelId } from '../../core/ids';
import { lien, naviguer } from '../../core/router';
import type { BlocModele } from '../../core/types';
import { ChoixExercice } from '../seance/ChoixExercice';
import { OBJECTIFS, demarrerSeance, dureeTexte, type Objectif } from '../seance/logique';
import { analyserModele, poly, type TypeSeance } from './avis';
import { CarteAvis } from './CarteAvis';
import { enregistrerModele, nouveauModele } from './modeles';
import { Propositions, useBibliotheque } from './Propositions';
import { BUT_OBJECTIF, NOMS_OBJECTIF, blocPropose } from './suggestions';
import '../seance/seance.css';
import './modeles.css';

const TYPES: { type: TypeSeance; nom: string; detail: string }[] = [
  { type: 'push', nom: 'Push', detail: 'Pousser : pectoraux, épaules, triceps' },
  { type: 'pull', nom: 'Pull', detail: 'Tirer : dos, biceps' },
  { type: 'jambes', nom: 'Jambes', detail: 'Quadriceps, ischios, fessiers, mollets' },
  { type: 'upper', nom: 'Full Upper', detail: 'Tout le haut du corps : pecs, dos, épaules, bras (sans les jambes)' },
  { type: 'full', nom: 'Full body', detail: 'Tout le corps en une séance' },
  { type: 'autre', nom: 'Libre', detail: 'Tu choisis les muscles, l’app te propose tes exercices habituels' },
];


export function EcranComposer() {
  const biblio = useBibliotheque();
  const [type, setType] = useState<TypeSeance>();
  const [objectif, setObjectif] = useState<Objectif>('hypertrophie');
  const [blocs, setBlocs] = useState<BlocModele[]>([]);
  const [nom, setNom] = useState('');
  const [choix, setChoix] = useState(false);
  const [occupe, setOccupe] = useState(false);
  if (!biblio) return null;

  /* Étape 1 : type et objectif */
  if (!type)
    return (
      <section class="sc">
        <div class="sc-entete">
          <a class="sc-lien" href={lien('/seance')}>
            ‹ Séance
          </a>
        </div>
        <h1>Composer ma séance</h1>
        <p class="sc-attenue sc-intro">Choisis le type de séance. L’app te propose ensuite les exercices un par un, et tu gardes ceux qui te plaisent.</p>
        <Carte
          titre={
            <>
              Ton objectif <Aide mot="objectif" />
            </>
          }
        >
          <Onglets
            label="Objectif"
            options={(Object.keys(OBJECTIFS) as Objectif[]).map((o) => ({ valeur: o, libelle: NOMS_OBJECTIF[o] }))}
            valeur={objectif}
            onChange={setObjectif}
          />
          <p class="sc-attenue sc-intro">
            {BUT_OBJECTIF[objectif]} : {OBJECTIFS[objectif].reps} reps par série, {OBJECTIFS[objectif].plage} de repos.
          </p>
        </Carte>
        <span class="ui-surtitre">Type de séance</span>
        {TYPES.map((t) => (
          <Bouton
            key={t.type}
            variante="secondaire"
            taille="large"
            detail={t.detail}
            onClick={() => {
              setType(t.type);
              setNom(t.type === 'autre' ? 'Ma séance' : `Mon ${t.nom}`);
            }}
          >
            {t.nom}
          </Bouton>
        ))}
      </section>
    );

  if (choix)
    return (
      <ChoixExercice
        onAnnuler={() => setChoix(false)}
        onChoix={(e) => {
          setBlocs([...blocs, blocPropose(e.id, poly(e), objectif, nouvelId())]);
          setChoix(false);
        }}
      />
    );

  /* Étape 2 : construction */
  const avis = analyserModele(nom, blocs, biblio.parId, type);
  const deplacer = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocs.length) return;
    const b = [...blocs];
    [b[i], b[j]] = [b[j], b[i]];
    setBlocs(b);
  };
  const valide = nom.trim() && blocs.length > 0;
  const enregistrer = async (lancer: boolean) => {
    if (!valide || occupe) return;
    setOccupe(true);
    const m = { ...nouveauModele(nom.trim()), blocs, type };
    await enregistrerModele(m);
    if (lancer) await demarrerSeance(m);
    naviguer('/seance');
  };
  const retour = () => {
    if (blocs.length && !confirm('Abandonner cette séance ? Les exercices choisis ne seront pas gardés.')) return;
    setBlocs([]);
    setType(undefined);
  };

  return (
    <section class="sc">
      <div class="sc-entete">
        <button type="button" class="sc-lien" onClick={retour}>
          ‹ Type de séance
        </button>
        <Bouton variante="contour" onClick={() => enregistrer(false)} disabled={!valide || occupe}>
          Enregistrer
        </Bouton>
      </div>
      <input class="sc-champ sc-champ-titre" placeholder="Nom de la séance" value={nom} onInput={(e) => setNom((e.target as HTMLInputElement).value)} aria-label="Nom de la séance" />
      <Propositions
        type={type}
        blocs={blocs}
        bibliotheque={biblio.exercices}
        frequence={biblio.frequence}
        onChoix={(p) => setBlocs([...blocs, blocPropose(p.exercice.id, p.gros, objectif, nouvelId())])}
        onAutre={() => setChoix(true)}
      />
      <Carte titre={`Ta séance${blocs.length ? ` · ${blocs.length} exercice${blocs.length > 1 ? 's' : ''}` : ''}`}>
        {blocs.length === 0 ? (
          <p class="sc-attenue sc-intro">Vide pour l’instant : choisis un exercice ci-dessus.</p>
        ) : (
          <ol class="mo-liste">
            {blocs.map((b, i) => {
              const e = biblio.parId.get(b.exerciceId);
              return (
                <li key={b.id} class="mo-ligne">
                  <span class="mo-num">{i + 1}</span>
                  <span class="mo-ligne-texte">
                    <b>{e?.nom ?? 'Exercice supprimé'}</b>
                    <span class="sc-attenue">
                      {b.seriesCibles} séries de {b.repsCibles} reps · repos {dureeTexte(b.reposSec ?? 90)}
                    </span>
                  </span>
                  <span class="mo-ligne-actions">
                    <button type="button" class="sc-lien" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label={`Monter ${e?.nom ?? ''}`}>
                      ↑
                    </button>
                    <button type="button" class="sc-lien" disabled={i === blocs.length - 1} onClick={() => deplacer(i, 1)} aria-label={`Descendre ${e?.nom ?? ''}`}>
                      ↓
                    </button>
                    <button type="button" class="sc-lien danger" onClick={() => setBlocs(blocs.filter((_, j) => j !== i))} aria-label={`Retirer ${e?.nom ?? ''}`}>
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {blocs.length > 0 && <p class="sc-attenue sc-intro">Séries, reps et repos sont réglés selon ton objectif. Tu pourras les changer après l’enregistrement.</p>}
      </Carte>
      {blocs.length > 0 && <CarteAvis avis={avis} />}
      {valide && (
        <Bouton onClick={() => enregistrer(true)} disabled={occupe}>
          Enregistrer et démarrer
        </Bouton>
      )}
    </section>
  );
}
