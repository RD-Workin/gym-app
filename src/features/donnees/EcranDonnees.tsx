// Écran Sauvegarde : export, import, rappel. Propriétaire : 06-donnees.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Bouton, Carte, Liste, ElementListe, Onglets, Puce } from '../../ui';
import { bornesPeriode, compterPeriode, construireResumePeriode, copierResume, exporterCsv, exporterJson, type ChoixPeriode, type Periode } from './exporter';
import './donnees.css';
import { lireSauvegarde, restaurer, type Apercu } from './importer';
import { JOURS_RAPPEL, libelleDerniere, useEtatSauvegarde } from './rappel';

const PILE = { display: 'flex', flexDirection: 'column', gap: 'var(--e-3)' } as const;

const CHOIX_PERIODE: { valeur: ChoixPeriode; libelle: string }[] = [
  { valeur: '2s', libelle: '2 sem.' },
  { valeur: '1m', libelle: '30 j' },
  { valeur: '3m', libelle: '3 mois' },
  { valeur: 'tout', libelle: 'Tout' },
  { valeur: 'dates', libelle: 'Dates' },
];

const jourCourt = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function libellePeriode(p: Periode): string {
  if (p.du && p.au) return `du ${jourCourt(p.du)} au ${jourCourt(p.au)}`;
  if (p.du) return `depuis le ${jourCourt(p.du)}`;
  if (p.au) return `jusqu'au ${jourCourt(p.au)}`;
  return 'tout l’historique';
}

const dateFr = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function EcranDonnees() {
  const etat = useEtatSauvegarde();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ton: 'progres' | 'alerte'; texte: string } | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const [choix, setChoix] = useState<ChoixPeriode>('1m');
  const [dates, setDates] = useState<Periode>({});
  const periode = useMemo(() => bornesPeriode(choix, dates), [choix, dates]);
  const [compte, setCompte] = useState<{ seances: number; series: number } | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    setResume(null);
    compterPeriode(periode).then((c) => actif && setCompte(c), () => actif && setCompte(null));
    construireResumePeriode(periode).then((t) => actif && setResume(t), () => actif && setResume(null));
    return () => {
      actif = false;
    };
  }, [periode]);

  async function agir(f: () => Promise<void>) {
    setOccupe(true);
    setMessage(null);
    try {
      await f();
    } catch (e) {
      setMessage({ ton: 'alerte', texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setOccupe(false);
    }
  }

  const exportJson = () =>
    agir(async () => {
      if (await exporterJson()) setMessage({ ton: 'progres', texte: 'Sauvegarde créée. Range-la dans Fichiers ou iCloud Drive.' });
    });
  const exportCsv = () =>
    agir(async () => {
      if (await exporterCsv(periode)) setMessage({ ton: 'progres', texte: 'Tableau CSV créé.' });
    });

  // Pas d'attente avant writeText : Safari n'autorise la copie que dans le geste.
  const copier = () =>
    resume != null &&
    agir(async () => {
      const r = await copierResume(resume);
      if (r === 'copie') setMessage({ ton: 'progres', texte: 'Résumé copié. Colle-le dans un message à ton coach ou dans ChatGPT / Claude.' });
      if (r === 'partage') setMessage({ ton: 'progres', texte: 'Résumé créé.' });
    });

  const choisirFichier = (ev: Event) => {
    const input = ev.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    agir(async () => setApercu(await lireSauvegarde(f)));
  };

  const confirmer = () =>
    agir(async () => {
      if (!apercu) return;
      await restaurer(apercu);
      setApercu(null);
      setMessage({ ton: 'progres', texte: 'Données restaurées.' });
    });

  if (apercu) {
    const d = apercu.donnees;
    return (
      <section style={PILE}>
        <h1>Restaurer ?</h1>
        <Carte titre="Contenu du fichier" aside={<Puce>du {dateFr(apercu.exporteLe)}</Puce>}>
          <Liste>
            <ElementListe titre="Séances" fin={String(d.seances.length)} detail={d.seances.length ? `du ${dateFr(apercu.premiereSeance)} au ${dateFr(apercu.derniereSeance)}` : undefined} />
            <ElementListe titre="Séries" fin={String(d.series.length)} />
            <ElementListe titre="Exercices" fin={String(d.exercices.length)} />
            <ElementListe titre="Modèles de séance" fin={String(d.modeles.length)} />
          </Liste>
        </Carte>
        <Carte ton="alerte">
          <p>Toutes les données actuelles du téléphone seront remplacées par celles du fichier. Cette action est définitive.</p>
        </Carte>
        {message && <Carte ton={message.ton}><p>{message.texte}</p></Carte>}
        <Bouton variante="danger" taille="geant" onClick={confirmer} disabled={occupe}>
          Remplacer mes données
        </Bouton>
        <Bouton variante="secondaire" onClick={() => setApercu(null)} disabled={occupe}>
          Annuler
        </Bouton>
      </section>
    );
  }

  return (
    <section style={PILE}>
      <h1>Sauvegarde</h1>
      <Carte
        titre="État"
        ton={etat?.due ? 'alerte' : 'neutre'}
        aside={etat && <Puce ton={etat.due ? 'alerte' : 'progres'}>{etat.due ? 'À faire' : etat.aDesDonnees ? 'À jour' : 'Rien à sauver'}</Puce>}
      >
        <p>{etat ? (etat.aDesDonnees ? libelleDerniere(etat) : 'Aucune série notée pour l’instant.') : '…'}</p>
        <p class="ui-element-detail">
          Une sauvegarde est un fichier à garder (Fichiers, iCloud, mail) : il permet de tout récupérer, par exemple sur un nouveau téléphone.
        </p>
        <p class="ui-element-detail">Tes données ne quittent le téléphone que si tu les partages. Rappel tous les {JOURS_RAPPEL} jours.</p>
      </Carte>

      <Bouton taille="geant" icone="donnees" onClick={exportJson} disabled={occupe}>
        Sauvegarder mes données
      </Bouton>
      <Carte titre="Pour un coach ou une IA" aside={compte && <Puce>{compte.series} séries</Puce>}>
        <div class="dn-periode">
          <Onglets label="Période exportée" options={CHOIX_PERIODE} valeur={choix} onChange={setChoix} />
          {choix === 'dates' && (
            <div class="dn-dates">
              <label>
                Du
                <input class="dn-champ" type="date" value={dates.du ?? ''} max={dates.au || undefined} onInput={(e) => setDates({ ...dates, du: (e.target as HTMLInputElement).value || undefined })} />
              </label>
              <label>
                Au
                <input class="dn-champ" type="date" value={dates.au ?? ''} min={dates.du || undefined} onInput={(e) => setDates({ ...dates, au: (e.target as HTMLInputElement).value || undefined })} />
              </label>
            </div>
          )}
          <p class="ui-element-detail">
            {compte ? `${compte.seances} séance${compte.seances > 1 ? 's' : ''}, ${libellePeriode(periode)}` : libellePeriode(periode)}
          </p>
          <Bouton variante="secondaire" taille="large" icone="tableau" onClick={exportCsv} disabled={occupe || compte?.series === 0} detail="Une ligne par série (CSV)">
            Exporter le tableau
          </Bouton>
          <Bouton variante="secondaire" taille="large" icone="copier" onClick={copier} disabled={occupe || resume == null || compte?.series === 0} detail="Évolution par exo et poids de corps, en texte">
            Copier le résumé pour l’IA
          </Bouton>
        </div>
      </Carte>
      <Bouton variante="contour" taille="large" icone="importer" onClick={() => champFichier.current?.click()} disabled={occupe} detail="Remplace tes données par celles d’un fichier de sauvegarde (.json)">
        Restaurer une sauvegarde
      </Bouton>
      <input ref={champFichier} type="file" accept="application/json,.json" hidden onChange={choisirFichier} />

      {message && <Carte ton={message.ton}><p>{message.texte}</p></Carte>}
    </section>
  );
}
