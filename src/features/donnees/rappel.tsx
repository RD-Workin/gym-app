// Rappel de sauvegarde. Propriétaire : 06-donnees.
// <RappelSauvegarde /> peut être posé sur l'accueil : il ne s'affiche que si un export est dû.
import { db } from '../../core/db';
import { lien } from '../../core/router';
import { useRequete } from '../../core/requetes';
import { Bouton, Carte } from '../../ui';

export const JOURS_RAPPEL = 7;

export interface EtatSauvegarde {
  derniere?: string;
  jours: number | null; // null = jamais sauvegardé
  due: boolean;
  aDesDonnees: boolean;
}

export async function etatSauvegarde(): Promise<EtatSauvegarde> {
  const [r, nbSeries] = await Promise.all([db.reglages.get('derniereSauvegarde'), db.series.count()]);
  const derniere = typeof r?.valeur === 'string' ? r.valeur : undefined;
  const jours = derniere ? Math.floor((Date.now() - Date.parse(derniere)) / 86_400_000) : null;
  const aDesDonnees = nbSeries > 0;
  return { derniere, jours, aDesDonnees, due: aDesDonnees && (jours == null || jours >= JOURS_RAPPEL) };
}

export const useEtatSauvegarde = () => useRequete(etatSauvegarde);

export function libelleDerniere(e: EtatSauvegarde): string {
  if (e.jours == null) return 'Jamais sauvegardé';
  if (e.jours === 0) return "Sauvegardé aujourd'hui";
  if (e.jours === 1) return 'Sauvegardé hier';
  return `Dernière sauvegarde il y a ${e.jours} jours`;
}

export function RappelSauvegarde() {
  const e = useEtatSauvegarde();
  if (!e?.due) return null;
  return (
    <Carte titre="Sauvegarde" ton="alerte">
      <p>{libelleDerniere(e)}. Tes données ne sont que sur ce téléphone.</p>
      <Bouton variante="secondaire" icone="donnees" href={lien('/donnees')}>
        Sauvegarder
      </Bouton>
    </Carte>
  );
}
