import type { ComponentChildren } from 'preact';
import { Icone } from './Icone';

export function Liste({ children, label }: { children: ComponentChildren; label?: string }) {
  return (
    <ul class="ui-liste" aria-label={label}>
      {children}
    </ul>
  );
}

interface PropsElement {
  titre: ComponentChildren;
  detail?: ComponentChildren;
  /** À gauche : Medaille, icône… */
  debut?: ComponentChildren;
  /** À droite : valeur, Puce… */
  fin?: ComponentChildren;
  href?: string;
  onClick?: () => void;
  /** Fond doré léger (ex. record récent). */
  surligne?: boolean;
}

export function ElementListe({ titre, detail, debut, fin, href, onClick, surligne }: PropsElement) {
  const classe = `ui-element${surligne ? ' surligne' : ''}`;
  const corps = (
    <>
      {debut}
      <span class="ui-element-texte">
        <span class="ui-element-titre">{titre}</span>
        {detail && <span class="ui-element-detail">{detail}</span>}
      </span>
      {(fin || href) && (
        <span class="ui-element-fin">
          {fin}
          {href && (
            <span class="ui-element-chevron">
              <Icone nom="chevron" />
            </span>
          )}
        </span>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <a class={classe} href={href}>{corps}</a>
      ) : onClick ? (
        <button class={classe} type="button" onClick={onClick}>{corps}</button>
      ) : (
        <div class={classe}>{corps}</div>
      )}
    </li>
  );
}

/** Pastille dorée des records. */
export function Medaille() {
  return (
    <span class="ui-medaille">
      <Icone nom="etoile" />
    </span>
  );
}
