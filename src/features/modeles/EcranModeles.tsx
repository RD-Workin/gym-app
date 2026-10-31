// Modèles de séance : liste et éditeur (propriétaire : 04-seance).
import { useState } from 'preact/hooks';
import { Bouton, Carte, ElementListe, Liste } from '../../ui';
import { db } from '../../core/db';
import { lien, naviguer } from '../../core/router';
import { useRequete } from '../../core/requetes';
import { nouvelId } from '../../core/ids';
import type { BlocModele, Modele } from '../../core/types';
import { ChoixExercice } from '../seance/ChoixExercice';
import { demarrerSeance, dureeTexte, groupes } from '../seance/logique';
import { enregistrerModele, nouveauModele } from './modeles';
import '../seance/seance.css';

export function EcranModeles() {
  const modeles = useRequete(() => db.modeles.orderBy('nom').filter((m) => !m.archive).toArray());
  const [edite, setEdite] = useState<Modele>();
  if (edite) return <EditeurModele initial={edite} onFin={() => setEdite(undefined)} />;
  if (!modeles) return null;

  return (
    <section class="sc">
      <div class="sc-entete">
        <a class="sc-lien" href={lien('/seance')}>
          ‹ Séance
        </a>
      </div>
      <h1>Modèles de séance</h1>
      {modeles.length ? (
        <Liste label="Modèles">
          {modeles.map((m) => (
            <ElementListe key={m.id} titre={m.nom} detail={`${m.blocs.length} exercices`} onClick={() => setEdite(m)} />
          ))}
        </Liste>
      ) : (
        <p class="sc-attenue">Aucun modèle. Crée-en un, ou ouvre une séance faite et choisis « Créer un modèle depuis cette séance ».</p>
      )}
      <Bouton taille="geant" icone="plus" onClick={() => setEdite(nouveauModele())}>
        Nouveau modèle
      </Bouton>
    </section>
  );
}

function EditeurModele({ initial, onFin }: { initial: Modele; onFin: () => void }) {
  const [m, setM] = useState<Modele>(initial);
  const [choix, setChoix] = useState(false);
  const exercices = useRequete(async () => new Map((await db.exercices.toArray()).map((e) => [e.id, e])));
  if (!exercices) return null;
  if (choix)
    return (
      <ChoixExercice
        onAnnuler={() => setChoix(false)}
        onChoix={(e) => {
          setM({ ...m, blocs: [...m.blocs, { id: nouvelId(), exerciceId: e.id, seriesCibles: 3, repsCibles: '8-12', reposSec: 90 }] });
          setChoix(false);
        }}
      />
    );

  const majBloc = (i: number, maj: Partial<BlocModele>) => setM({ ...m, blocs: m.blocs.map((b, j) => (j === i ? { ...b, ...maj } : b)) });
  const deplacer = (i: number, d: -1 | 1) => {
    const blocs = [...m.blocs];
    const j = i + d;
    if (j < 0 || j >= blocs.length) return;
    [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
    setM({ ...m, blocs });
  };
  const lier = (i: number) => {
    // Lie le bloc i au précédent (superset), ou le délie.
    const prec = m.blocs[i - 1];
    const b = m.blocs[i];
    if (b.supersetId && prec?.supersetId === b.supersetId) return majBloc(i, { supersetId: undefined });
    const sid = prec.supersetId ?? nouvelId();
    setM({ ...m, blocs: m.blocs.map((x, j) => (j === i - 1 || j === i ? { ...x, supersetId: sid } : x)) });
  };
  const nettoyer = (blocs: BlocModele[]) => {
    // Un superset d'un seul bloc n'en est pas un.
    const g = groupes(blocs);
    return blocs.map((b, i) => (b.supersetId && g.find((x) => x.includes(i))!.length < 2 ? { ...b, supersetId: undefined } : b));
  };
  const valide = m.nom.trim() && m.blocs.length;
  const enregistrer = async () => {
    if (!valide) return;
    await enregistrerModele({ ...m, nom: m.nom.trim(), blocs: nettoyer(m.blocs) });
    onFin();
  };
  const lancer = async () => {
    await enregistrer();
    const frais = await db.modeles.get(m.id);
    if (frais) await demarrerSeance(frais);
    naviguer('/seance');
  };
  const archiver = async () => {
    if (!confirm(`Supprimer le modèle « ${m.nom} » ? Les séances faites restent.`)) return;
    if (await db.modeles.get(m.id)) await enregistrerModele({ ...m, archive: true });
    onFin();
  };
  const num = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return (
    <section class="sc">
      <div class="sc-entete">
        <button type="button" class="sc-lien" onClick={onFin}>
          ‹ Annuler
        </button>
        <Bouton onClick={enregistrer} disabled={!valide}>
          Enregistrer
        </Bouton>
      </div>
      <input class="sc-champ sc-champ-titre" placeholder="Nom (Push, Pull, Jambes…)" value={m.nom} onInput={(e) => setM({ ...m, nom: (e.target as HTMLInputElement).value })} aria-label="Nom du modèle" />
      {m.blocs.map((b, i) => {
        const enSuperset = !!b.supersetId && (m.blocs[i - 1]?.supersetId === b.supersetId || m.blocs[i + 1]?.supersetId === b.supersetId);
        return (
          <Carte key={b.id} titre={`${i + 1}${enSuperset ? ' · superset' : ''}`} ton={enSuperset ? 'mise-en-avant' : 'neutre'}>
            <div class="sc-nom-bloc">{exercices.get(b.exerciceId)?.nom ?? 'Exercice supprimé'}</div>
            <div class="sc-grille">
              <label>
                Séries
                <input class="sc-champ" inputMode="numeric" value={b.seriesCibles ?? ''} onInput={(e) => majBloc(i, { seriesCibles: num((e.target as HTMLInputElement).value) })} />
              </label>
              <label>
                Reps
                <input class="sc-champ" value={b.repsCibles ?? ''} placeholder="8-10" onInput={(e) => majBloc(i, { repsCibles: (e.target as HTMLInputElement).value.trim() || undefined })} />
              </label>
              <label>
                Repos (s)
                <input class="sc-champ" inputMode="numeric" value={b.reposSec ?? ''} placeholder="90" onInput={(e) => majBloc(i, { reposSec: num((e.target as HTMLInputElement).value) })} />
              </label>
            </div>
            <input class="sc-champ" placeholder="Note (technique, tempo…)" value={b.note ?? ''} onInput={(e) => majBloc(i, { note: (e.target as HTMLInputElement).value || undefined })} />
            <div class="sc-ligne sc-actions-bloc">
              <button type="button" class="sc-lien" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label="Monter">
                ↑
              </button>
              <button type="button" class="sc-lien" disabled={i === m.blocs.length - 1} onClick={() => deplacer(i, 1)} aria-label="Descendre">
                ↓
              </button>
              {i > 0 && (
                <button type="button" class="sc-lien" onClick={() => lier(i)}>
                  {b.supersetId && m.blocs[i - 1].supersetId === b.supersetId ? 'Délier' : 'Superset avec ↑'}
                </button>
              )}
              <button type="button" class="sc-lien danger" onClick={() => setM({ ...m, blocs: m.blocs.filter((_, j) => j !== i) })}>
                Retirer
              </button>
            </div>
            {b.reposSec ? <span class="sc-attenue">Repos {dureeTexte(b.reposSec)}</span> : null}
          </Carte>
        );
      })}
      <Bouton variante="contour" icone="plus" onClick={() => setChoix(true)}>
        Ajouter un exercice
      </Bouton>
      {valide && (
        <Bouton variante="secondaire" onClick={lancer}>
          Enregistrer et démarrer
        </Bouton>
      )}
      <Bouton variante="danger" onClick={archiver}>
        Supprimer le modèle
      </Bouton>
    </section>
  );
}
