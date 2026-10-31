import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import { Icone, type NomIcone } from './Icone';

export type VarianteBouton = 'primaire' | 'secondaire' | 'contour' | 'danger';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'type' | 'disabled' | 'href'> {
  variante?: VarianteBouton;
  /** geant : action principale d'un écran (64 px, pleine largeur). large : bouton-ligne avec détail. */
  taille?: 'normal' | 'geant' | 'large';
  icone?: NomIcone;
  /** Ligne secondaire sous le libellé (taille « large »). */
  detail?: ComponentChildren;
  /** Rend un lien <a> au lieu d'un bouton. */
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: ComponentChildren;
}

export function Bouton({ variante = 'primaire', taille = 'normal', icone, detail, href, children, class: cls, type = 'button', ...reste }: Props) {
  const classe = ['ui-bouton', variante, taille !== 'normal' && taille, cls].filter(Boolean).join(' ');
  const contenu = (
    <>
      {icone && <Icone nom={icone} />}
      {detail ? (
        <span>
          {children}
          <span class="ui-bouton-detail">{detail}</span>
        </span>
      ) : (
        children
      )}
    </>
  );
  if (href) {
    return (
      <a class={classe} href={href}>
        {contenu}
      </a>
    );
  }
  return (
    <button class={classe} type={type} {...reste}>
      {contenu}
    </button>
  );
}
