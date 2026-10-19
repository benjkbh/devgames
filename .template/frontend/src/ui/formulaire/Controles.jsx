import { forwardRef } from 'react';

import { cx } from '../classes';
import { IcoChevronBas, IcoRecherche } from '../primitives/Icones';
import { Sr } from '../primitives/Sr';
import './formulaire.css';

// Contrôles nus de saisie (voir `Saisie.jsx` pour `Saisie`). Les props non
// listées passent à l'élément natif.
// `taille="s"` : hauteur réduite ; `erreur` pose `aria-invalid` et la bordure
// rouge.

export const SaisieNative = forwardRef(function SaisieNative({
  taille, erreur, className, ...reste
}, ref) {
  return (
    <input
      ref={ref}
      className={cx('saisie', taille && `saisie-${taille}`, className)}
      aria-invalid={erreur ? 'true' : undefined}
      {...reste}
    />
  );
});

// Liste déroulante (`<select>`) ; `bloc` : pleine largeur.
export const Selecteur = forwardRef(function Selecteur({
  taille, erreur, bloc, className, children, ...reste
}, ref) {
  return (
    <span className={cx('selecteur', taille && `selecteur-${taille}`,
      bloc && 'selecteur-bloc', className)}>
      <select
        ref={ref}
        className={cx('saisie', taille && `saisie-${taille}`)}
        aria-invalid={erreur ? 'true' : undefined}
        {...reste}
      >
        {children}
      </select>
      <IcoChevronBas className="selecteur-chevron" />
    </span>
  );
});

export const ZoneTexte = forwardRef(function ZoneTexte({
  erreur, className, ...reste
}, ref) {
  return (
    <textarea
      ref={ref}
      className={cx('saisie', 'saisie-zone', className)}
      aria-invalid={erreur ? 'true' : undefined}
      {...reste}
    />
  );
});

// Champ de recherche avec loupe ; `libelle` : texte lecteur d'écran.
export function Recherche({ libelle, taille, className, ...reste }) {
  return (
    <label className={cx('recherche', taille && `recherche-${taille}`,
      className)}>
      <Sr>{libelle}</Sr>
      <IcoRecherche className="recherche-ico" />
      <input
        type="search"
        className={cx('saisie', taille && `saisie-${taille}`)}
        {...reste}
      />
    </label>
  );
}
