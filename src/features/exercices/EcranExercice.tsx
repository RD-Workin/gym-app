// Fiche exercice : créer, modifier, masquer, variantes. Propriétaire : 03-exercices.
// Courbe, records et historique : composant de 05-progression.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien, naviguer } from '../../core/router';
import type { Equipement, ModeCharge } from '../../core/types';
import { EQUIPEMENTS, GROUPES, MODES_CHARGE } from '../../data/groupes';
import { Bouton, Carte, ElementListe, Liste, PanneauConseils } from '../../ui';
import { CONSEILS_EQUIPEMENTS, CONSEILS_GROUPES, conseilsExercice } from '../../data/conseils';
import { libelleGroupe } from '../../data/groupes';
import {
  ajouterVariante,
  creerExercice,
  idCatalogue,
  liensCatalogue,
  exerciceEtVariantes,
  masquerExercice,
  modifierExercice,
  supprimerVariante,
  type BrouillonExercice,
} from './exercices';
import { enregistrerPhoto, retirerPhoto } from './photo';
import { EcranCatalogue } from './EcranCatalogue';
import { CorpsMuscles } from './CorpsMuscles';
import { urlImage } from '../../data/catalogue';
import { FicheProgression } from '../progression/FicheProgression';
import '../progression/progression.css';
import './exercices.css';

const VIDE: BrouillonExercice = { nom: '', equipement: 'machine', modeCharge: 'total', groupesMusculaires: [] };

/** Mode de charge par défaut selon l'équipement (modifiable). */
const modeParDefaut = (eq: Equipement): ModeCharge =>
  eq === 'halteres' ? 'par_main' : eq === 'poids_du_corps' ? 'lest' : 'total';

export function EcranExercice({ id }: { id: string }) {
  if (id.startsWith('cat:')) return <EcranCatalogue id={id.slice(4)} />;
  return <FicheExercice id={id} />;
}

function FicheExercice({ id }: { id: string }) {
  const nouveau = id === 'nouveau';
  const donnees = useRequete(() => (nouveau ? null : exerciceEtVariantes(id)), [id]);
  const [b, setB] = useState<BrouillonExercice>(VIDE);
  const [modifie, setModifie] = useState(false);
  const [variante, setVariante] = useState('');
  const [message, setMessage] = useState('');

  const ex = donnees?.exercice;
  const liens = useRequete(liensCatalogue);
  const catId = ex && liens ? idCatalogue(ex, liens) : undefined;
  const urlPhoto = useMemo(() => (ex?.photo ? URL.createObjectURL(ex.photo) : undefined), [ex?.photo]);
  useEffect(() => () => urlPhoto && URL.revokeObjectURL(urlPhoto), [urlPhoto]);
  useEffect(() => {
    if (ex && !modifie) {
      const { nom, equipement, modeCharge, groupesMusculaires, reglagesMachine, note } = ex;
      setB({ nom, equipement, modeCharge, groupesMusculaires, reglagesMachine, note });
    }
  }, [ex?.modifieLe]);

  const maj = (p: Partial<BrouillonExercice>) => {
    setB((x) => ({ ...x, ...p }));
    setModifie(true);
    setMessage('');
  };
  const basculerGroupe = (g: string) =>
    maj({ groupesMusculaires: b.groupesMusculaires.includes(g) ? b.groupesMusculaires.filter((x) => x !== g) : [...b.groupesMusculaires, g] });

  const enregistrer = async (e: Event) => {
    e.preventDefault();
    if (!b.nom.trim()) return;
    if (nouveau) {
      const nid = await creerExercice(b);
      naviguer(`/exercices/${nid}`);
    } else {
      await modifierExercice(id, b);
      setMessage('Enregistré');
    }
    setModifie(false);
  };

  if (!nouveau && donnees === undefined) return null;
  if (!nouveau && !ex) {
    return (
      <p>
        Exercice introuvable. <a href={lien('/exercices')}>Retour</a>
      </p>
    );
  }

  return (
    <section class="ui-pile">
      <a class="ex-retour" href={lien('/exercices')}>‹ Exercices</a>
      <h1>{nouveau ? 'Nouvel exercice' : b.nom || ex!.nom}</h1>
      {ex?.archive && (
        <Carte ton="alerte" titre="Masqué">
          <p style={{ margin: 0 }}>Absent des listes. L'historique reste visible.</p>
        </Carte>
      )}

      {catId && (
        <a class="ex-images" href={lien(`/exercices/cat:${catId}`)} aria-label="Images et explications">
          <img src={urlImage(catId, 0)} alt="" loading="lazy" />
          <img src={urlImage(catId, 1)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        </a>
      )}
      <Carte titre="Muscles travaillés" aside={catId ? <a href={lien(`/exercices/cat:${catId}`)}>Explications ›</a> : undefined}>
        <CorpsMuscles actifs={b.groupesMusculaires} onBasculer={basculerGroupe} />
      </Carte>
      {!nouveau && <Conseils nom={ex!.nom} groupes={b.groupesMusculaires} equipement={b.equipement} />}
      {!nouveau && <FicheProgression exerciceId={id} />}
      {!nouveau && <h2 style={{ marginTop: 'var(--e-3)' }}>Réglages de l'exercice</h2>}

      <form class="ui-pile" onSubmit={enregistrer}>
        <label class="ex-champ">
          <span class="ui-surtitre">Nom</span>
          <input value={b.nom} required maxLength={80} onInput={(e) => maj({ nom: e.currentTarget.value })} />
        </label>
        <div class="ui-ligne" style={{ alignItems: 'start' }}>
          <label class="ex-champ" style={{ flex: 1 }}>
            <span class="ui-surtitre">Équipement</span>
            <select
              value={b.equipement}
              onChange={(e) => {
                const eq = e.currentTarget.value as Equipement;
                maj({ equipement: eq, modeCharge: modeParDefaut(eq) });
              }}
            >
              {Object.entries(EQUIPEMENTS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label class="ex-champ" style={{ flex: 1 }}>
            <span class="ui-surtitre">Charge notée</span>
            <select value={b.modeCharge} onChange={(e) => maj({ modeCharge: e.currentTarget.value as ModeCharge })}>
              {Object.entries(MODES_CHARGE).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <div class="ex-champ">
          <span class="ui-surtitre">Muscles (ou touche le corps plus haut)</span>
          <div class="ui-ligne" style={{ flexWrap: 'wrap', gap: 'var(--e-2)' }}>
            {Object.entries(GROUPES).map(([g, l]) => (
              <button key={g} type="button" class="ex-filtre" aria-pressed={b.groupesMusculaires.includes(g)} onClick={() => basculerGroupe(g)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label class="ex-champ">
          <span class="ui-surtitre">Réglages machine</span>
          <input value={b.reglagesMachine ?? ''} placeholder="ex. chaise 4" maxLength={80} onInput={(e) => maj({ reglagesMachine: e.currentTarget.value })} />
        </label>
        <label class="ex-champ">
          <span class="ui-surtitre">Note de technique</span>
          <textarea value={b.note ?? ''} maxLength={1000} onInput={(e) => maj({ note: e.currentTarget.value })} />
        </label>
        <Bouton type="submit" disabled={!b.nom.trim() || (!nouveau && !modifie)} icone="valider">
          {nouveau ? 'Créer' : message || 'Enregistrer'}
        </Bouton>
      </form>

      {!nouveau && (
        <>
          <Carte titre="Photo de référence">
            <div class="ui-pile">
              {urlPhoto && <img class="ex-photo" src={urlPhoto} alt={`Photo de référence : ${ex!.nom}`} />}
              <div class="ui-ligne">
                <label class="ui-bouton secondaire ex-photo-choix">
                  {urlPhoto ? 'Changer' : 'Ajouter une photo'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const f = e.currentTarget.files?.[0];
                      e.currentTarget.value = '';
                      if (!f) return;
                      try {
                        await enregistrerPhoto(id, f);
                      } catch {
                        alert('Photo illisible.');
                      }
                    }}
                  />
                </label>
                {urlPhoto && (
                  <Bouton variante="danger" onClick={() => retirerPhoto(id)}>
                    Retirer
                  </Bouton>
                )}
              </div>
            </div>
          </Carte>
          <Carte titre="Variantes (suivies séparément)">
            <div class="ui-pile">
              {donnees!.variantes.length > 0 && (
                <Liste label="Variantes">
                  {donnees!.variantes.map((v) => (
                    <ElementListe
                      key={v.id}
                      titre={v.nom}
                      fin={
                        <button
                          type="button"
                          class="ex-filtre"
                          aria-label={`Supprimer la variante ${v.nom}`}
                          onClick={async () => {
                            if (!(await supprimerVariante(v.id))) alert('Variante déjà utilisée dans des séries : conservée.');
                          }}
                        >
                          Retirer
                        </button>
                      }
                    />
                  ))}
                </Liste>
              )}
              <form
                class="ex-ligne-variante ex-champ"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!variante.trim()) return;
                  await ajouterVariante(id, variante);
                  setVariante('');
                }}
              >
                <input value={variante} placeholder="ex. prise large" aria-label="Nouvelle variante" maxLength={60} onInput={(e) => setVariante(e.currentTarget.value)} />
                <Bouton type="submit" variante="secondaire" icone="plus" disabled={!variante.trim()}>
                  Ajouter
                </Bouton>
              </form>
            </div>
          </Carte>
          <Bouton variante={ex!.archive ? 'contour' : 'danger'} onClick={() => masquerExercice(id, !ex!.archive)}>
            {ex!.archive ? 'Réafficher cet exercice' : 'Masquer cet exercice'}
          </Bouton>
        </>
      )}
    </section>
  );
}

/** Conseils du coach (contenu : 10-coach) : l'exercice, son muscle principal, son matériel. */
function Conseils({ nom, groupes, equipement }: { nom: string; groupes: string[]; equipement: Equipement }) {
  const exo = conseilsExercice(nom);
  const g = groupes[0] as keyof typeof CONSEILS_GROUPES | undefined;
  const muscle = g && CONSEILS_GROUPES[g];
  const materiel = CONSEILS_EQUIPEMENTS[equipement];
  if (!exo && !muscle && !materiel) return null;
  return (
    <div class="ui-pile">
      {exo && <PanneauConseils fiche={exo} titre="Conseils du coach" />}
      {muscle && <PanneauConseils fiche={muscle} titre={`Le muscle : ${libelleGroupe(g!)}`} />}
      {materiel && <PanneauConseils fiche={materiel} titre="Le matériel" />}
    </div>
  );
}
