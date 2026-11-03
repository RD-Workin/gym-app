// Détail d'une séance faite (propriétaire : 04-seance).
import { useEffect, useState } from 'preact/hooks';
import { Bouton, Carte, ElementListe, Icone, Liste } from '../../ui';
import { celebrer, Flamme, feuArtifice, useCompteur, vibrer } from '../../anim';
import type { Seance } from '../../core/types';
import { bilanAJouer, calculerBilan } from './bilan';
import { db } from '../../core/db';
import { lien, naviguer } from '../../core/router';
import { useRequete } from '../../core/requetes';
import { BandeauContexte } from '../contexte/BandeauContexte';
import { creerModeleDepuisSeance } from '../modeles/modeles';
import { construireResumeUneSeance, copierResume } from '../donnees/exporter';
import { dureeTexte, groupes, resumeSeries, supprimerSeance } from './logique';
import './seance.css';

export function EcranSeance({ id }: { id: string }) {
  // Juste après « Terminer » : bilan animé (une seule fois).
  const [bilan] = useState(() => bilanAJouer(id));
  const [copie, setCopie] = useState<string | null>(null);
  // Calculé à l'avance : Safari n'autorise la copie que dans le geste.
  const [resume, setResume] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    construireResumeUneSeance(id).then((t) => actif && setResume(t), () => actif && setResume(null));
    return () => {
      actif = false;
    };
  }, [id]);
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
  const copier = async () => {
    if (!resume) return;
    const r = await copierResume(resume);
    if (r === 'copie') setCopie('Analyse copiée. Colle-la dans un message à ton coach ou dans ChatGPT / Claude.');
    if (r === 'partage') setCopie('Résumé de la séance créé.');
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
      {bilan && seance.fin && <BilanAnime seance={seance} duree={duree} />}
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
        <Bouton variante="secondaire" icone="copier" onClick={copier} disabled={!resume} detail="Séries et comparaison avec la fois d’avant, en texte">
          Copier pour l’IA ou un coach
        </Bouton>
      )}
      {copie && (
        <Carte ton="progres">
          <p role="status">{copie}</p>
        </Carte>
      )}
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

/** Écran de fin de séance : les chiffres défilent, les records tombent un par un, la flamme s'allume. */
function BilanAnime({ seance, duree }: { seance: Seance; duree?: number }) {
  const b = useRequete(() => calculerBilan(seance), [seance.id]);
  const vol = useCompteur(b?.volumeKg ?? 0, 1200);
  const nb = useCompteur(b?.series ?? 0, 900);
  const min = useCompteur(Math.round((duree ?? 0) / 60), 900);
  useEffect(() => {
    if (!b) return;
    vibrer([20, 60, 20]);
    if (b.records.length) feuArtifice(Math.min(5, 2 + b.records.length));
    else celebrer();
  }, [!!b]);
  if (!b) return null;
  const autres = b.records.length - 4;
  return (
    <div class="bil" role="status">
      <div class="bil-titre anim-entree-titre">Séance terminée</div>
      <div class="bil-tuiles anim-cascade">
        <div>
          <span class="bil-chiffre">{vol.toLocaleString('fr-FR')}</span>
          <span class="bil-lib">kg soulevés</span>
        </div>
        <div>
          <span class="bil-chiffre">{nb}</span>
          <span class="bil-lib">séries</span>
        </div>
        {duree != null && duree >= 60 && (
          <div>
            <span class="bil-chiffre">{min}</span>
            <span class="bil-lib">minutes</span>
          </div>
        )}
      </div>
      {b.records.length > 0 && (
        <ul class="bil-records">
          {b.records.slice(0, 4).map((t, i) => (
            <li key={t} class={`bil-record d${i}`}>
              <span class="ui-medaille anim-medaille-tourne">
                <Icone nom="records" />
              </span>
              <span>
                <b>Record</b> {t}
              </span>
            </li>
          ))}
          {autres > 0 && <li class="bil-plus">et {autres} autre{autres > 1 ? 's' : ''} record{autres > 1 ? 's' : ''}</li>}
        </ul>
      )}
      {b.semaines >= 2 && (
        <div class="bil-flamme">
          <Flamme />
          <span>
            <b>{b.semaines}</b> semaine{b.semaines > 1 ? 's' : ''} d'affilée avec au moins une séance
          </span>
        </div>
      )}
    </div>
  );
}
