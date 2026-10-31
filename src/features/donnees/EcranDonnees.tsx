// Écran Sauvegarde : export, import, rappel. Propriétaire : 06-donnees.
import { useRef, useState } from 'preact/hooks';
import { Bouton, Carte, Liste, ElementListe, Puce } from '../../ui';
import { exporterCsv, exporterJson } from './exporter';
import { lireSauvegarde, restaurer, type Apercu } from './importer';
import { JOURS_RAPPEL, libelleDerniere, useEtatSauvegarde } from './rappel';

const PILE = { display: 'flex', flexDirection: 'column', gap: 'var(--e-3)' } as const;

const dateFr = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function EcranDonnees() {
  const etat = useEtatSauvegarde();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ton: 'progres' | 'alerte'; texte: string } | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);

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
      if (await exporterCsv()) setMessage({ ton: 'progres', texte: 'Tableau CSV créé.' });
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
        aside={etat && <Puce ton={etat.due ? 'alerte' : 'progres'}>{etat.due ? 'À faire' : 'À jour'}</Puce>}
      >
        <p>{etat ? libelleDerniere(etat) : '…'}</p>
        <p class="ui-element-detail">Tes données ne quittent le téléphone que si tu les partages. Rappel tous les {JOURS_RAPPEL} jours.</p>
      </Carte>

      <Bouton taille="geant" icone="donnees" onClick={exportJson} disabled={occupe}>
        Sauvegarder (JSON)
      </Bouton>
      <Bouton variante="secondaire" taille="large" icone="tableau" onClick={exportCsv} disabled={occupe} detail="Une ligne par série, à envoyer à un coach ou une IA">
        Exporter le tableau (CSV)
      </Bouton>
      <Bouton variante="contour" taille="large" icone="importer" onClick={() => champFichier.current?.click()} disabled={occupe} detail="Depuis un fichier .json de sauvegarde">
        Restaurer une sauvegarde
      </Bouton>
      <input ref={champFichier} type="file" accept="application/json,.json" hidden onChange={choisirFichier} />

      {message && <Carte ton={message.ton}><p>{message.texte}</p></Carte>}
    </section>
  );
}
