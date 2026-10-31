// Fiche exercice : créer, modifier, masquer, variantes. Propriétaire : 03-exercices.
// La courbe et l'historique (05-progression) pourront s'insérer sous la fiche.
import { useEffect, useState } from 'preact/hooks';
import { useRequete } from '../../core/requetes';
import { lien, naviguer } from '../../core/router';
import type { Equipement, ModeCharge } from '../../core/types';
import { EQUIPEMENTS, GROUPES, MODES_CHARGE } from '../../data/groupes';
import { Bouton, Carte, ElementListe, Liste } from '../../ui';
import {
  ajouterVariante,
  creerExercice,
  exerciceEtVariantes,
  masquerExercice,
  modifierExercice,
  supprimerVariante,
  type BrouillonExercice,
} from './exercices';
import './exercices.css';

const VIDE: BrouillonExercice = { nom: '', equipement: 'machine', modeCharge: 'total', groupesMusculaires: [] };

/** Mode de charge par défaut selon l'équipement (modifiable). */
const modeParDefaut = (eq: Equipement): ModeCharge =>
  eq === 'halteres' ? 'par_main' : eq === 'poids_du_corps' ? 'lest' : 'total';

export function EcranExercice({ id }: { id: string }) {
  const nouveau = id === 'nouveau';
  const donnees = useRequete(() => (nouveau ? null : exerciceEtVariantes(id)), [id]);
  const [b, setB] = useState<BrouillonExercice>(VIDE);
  const [modifie, setModifie] = useState(false);
  const [variante, setVariante] = useState('');
  const [message, setMessage] = useState('');

  const ex = donnees?.exercice;
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
          <span class="ui-surtitre">Muscles</span>
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
