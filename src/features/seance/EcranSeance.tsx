// Détail d'une séance faite (propriétaire : 04-seance).
import { Bouton, Carte, ElementListe, Liste } from '../../ui';
import { db } from '../../core/db';
import { lien, naviguer } from '../../core/router';
import { useRequete } from '../../core/requetes';
import { BandeauContexte } from '../contexte/BandeauContexte';
import { creerModeleDepuisSeance } from '../modeles/modeles';
import { dureeTexte, groupes, resumeSeries, supprimerSeance } from './logique';
import './seance.css';

export function EcranSeance({ id }: { id: string }) {
  const d = useRequete(async () => {
    const seance = await db.seances.get(id);
    if (!seance) return null;
    const series = await db.series.where('seanceId').equals(id).sortBy('ordre');
    const exercices = new Map((await db.exercices.bulkGet([...new Set(series.map((s) => s.exerciceId))])).filter((e) => !!e).map((e) => [e!.id, e!]));
    const modele = seance.modeleId ? await db.modeles.get(seance.modeleId) : undefined;
    return { seance, series, exercices, modele };
  }, [id]);
  if (d === undefined) return null;
  if (d === null)
    return (
      <section class="sc">
        <p>
          Séance introuvable. <a href={lien('/seance')}>Retour</a>
        </p>
      </section>
    );
  const { seance, series, exercices, modele } = d;

  // Un bloc par exercice, dans l'ordre de la première série ; supersets regroupés.
  const ordre: string[] = [];
  for (const s of series) if (!ordre.includes(s.exerciceId)) ordre.push(s.exerciceId);
  const blocs = ordre.map((exId) => ({ exId, supersetId: series.find((s) => s.exerciceId === exId)?.supersetId }));
  const grps = groupes(blocs.map((b) => ({ id: b.exId, exerciceId: b.exId, supersetId: b.supersetId })));
  const duree = seance.fin ? (new Date(seance.fin).getTime() - new Date(seance.debut).getTime()) / 1000 : undefined;

  const modeleDepuis = async () => {
    const nom = prompt('Nom du modèle', modele?.nom ? `${modele.nom} (bis)` : 'Ma séance');
    if (!nom?.trim()) return;
    await creerModeleDepuisSeance(id, nom.trim());
    naviguer('/modeles');
  };
  const supprimer = async () => {
    if (!confirm('Supprimer cette séance et toutes ses séries ?')) return;
    await supprimerSeance(id);
    naviguer('/seance');
  };

  return (
    <section class="sc">
      <div class="sc-entete">
        <a class="sc-lien" href={lien('/seance')}>
          ‹ Séances
        </a>
      </div>
      <h1>{modele?.nom ?? 'Séance libre'}</h1>
      <BandeauContexte seance={seance} />
      {!seance.fin && (
        <Bouton taille="geant" href={lien('/seance')}>
          Reprendre la séance
        </Bouton>
      )}
      <Carte titre="Résumé">
        <span class="sc-num">
          {ordre.length} exercices · {series.length} séries{duree ? ` · ${dureeTexte(duree)}` : ''}
        </span>
      </Carte>
      {grps.map((g) => (
        <Carte key={g[0]} titre={g.length > 1 ? 'Superset' : undefined}>
          <Liste>
            {g.map((i) => {
              const exId = blocs[i].exId;
              const sx = series.filter((s) => s.exerciceId === exId);
              return <ElementListe key={exId} titre={exercices.get(exId)?.nom ?? 'Exercice supprimé'} detail={resumeSeries(sx)} href={lien(`/exercices/${exId}`)} />;
            })}
          </Liste>
        </Carte>
      ))}
      {series.length > 0 && (
        <Bouton variante="secondaire" onClick={modeleDepuis}>
          Créer un modèle depuis cette séance
        </Bouton>
      )}
      <Bouton variante="danger" onClick={supprimer}>
        Supprimer la séance
      </Bouton>
    </section>
  );
}
