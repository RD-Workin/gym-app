import { Icone } from './Icone';

/** Même forme que FicheConseil (src/data/conseils.ts). */
export interface ContenuConseils {
  resume: string;
  sections: { titre: string; points: string[] }[];
}

interface Props {
  fiche: ContenuConseils;
  /** Titre du panneau. Par défaut « Conseils du coach ». */
  titre?: string;
  ouvert?: boolean;
}

/** Panneau repliable de conseils. Fermé : titre + résumé. Ouvert : sections à puces. */
export function PanneauConseils({ fiche, titre = 'Conseils du coach', ouvert = false }: Props) {
  return (
    <details class="ui-conseils" open={ouvert}>
      <summary>
        <span class="ui-conseils-icone">
          <Icone nom="info" />
        </span>
        <span class="ui-conseils-tete">
          <span class="ui-conseils-titre">{titre}</span>
          <span class="ui-conseils-resume">{fiche.resume}</span>
        </span>
        <span class="ui-conseils-chevron">
          <Icone nom="chevron" />
        </span>
      </summary>
      <div class="ui-conseils-corps">
        {fiche.sections.map((s) => (
          <section key={s.titre}>
            <h3 class="ui-surtitre">{s.titre}</h3>
            <ul>
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
