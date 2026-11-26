// Hauteur atteinte série par série (tractions…), sur le schéma du haut du corps. Propriétaire : 04-seance.
// Utilisé dans le détail d'une séance faite et dans l'historique d'un exercice (Progrès).
import { SchemaHauteur, type BarreSchema } from '../../ui';
import { barreTexte, hauteurTexte } from '../../core/hauteur';
import type { Serie } from '../../core/types';

/** Barres du schéma : une par hauteur distincte, la plus haute en premier (couleur pleine), avec ses n° de séries. */
export function barresDesSeries(series: Pick<Serie, 'hauteur' | 'type'>[], record?: number): BarreSchema[] {
  const travail = series.filter((s) => s.type !== 'echauffement');
  const parValeur = new Map<number, number[]>();
  travail.forEach((s, i) => {
    if (s.hauteur == null) return;
    (parValeur.get(s.hauteur) ?? parValeur.set(s.hauteur, []).get(s.hauteur)!).push(i + 1);
  });
  const barres: BarreSchema[] = [...parValeur]
    .sort((a, b) => b[0] - a[0])
    .map(([valeur, nums]) => ({ valeur, legende: nums.map((n) => `S${n}`).join(' ') }));
  if (record != null && !parValeur.has(record)) barres.push({ valeur: record, legende: 'record', ton: 'record' });
  return barres;
}

export function HauteursSeries({ series, nom, record }: { series: Serie[]; nom: string; record?: number }) {
  const travail = series.filter((s) => s.type !== 'echauffement');
  const barres = barresDesSeries(series, record);
  const texte = travail
    .map((s, i) => `S${i + 1} : ${[s.hauteur != null ? barreTexte(s.hauteur) : 'hauteur pas notée', s.explosif ? 'explosive' : ''].filter(Boolean).join(', ')}`)
    .join(' · ');
  return (
    <div class="sc-hauteurs-corps">
      {barres.length > 0 && (
        <SchemaHauteur compact barres={barres} label={`${nom}, hauteur atteinte : ${barres.filter((b) => b.ton !== 'record').map((b) => `${b.legende} ${hauteurTexte(b.valeur)}`).join(', ')}`} />
      )}
      <p class="sc-attenue sc-hauteurs-texte">{texte}</p>
    </div>
  );
}
