import { useCallback, useRef, useState } from 'react';

import { cx } from '../classes';
import { Sr } from '../primitives/Sr';
import { Popup } from './Popup';
import './surcouches.css';

// Bouton qui ouvre une popup ancrée sur lui.
// `icone` : contenu visible du bouton ; `libelle` : texte pour lecteurs
// d'écran ; `className` : apparence du bouton (aucune par défaut).
export function BoutonPopup({
  titre, libelle, icone, className, title, children,
}) {
  const [ouvert, setOuvert] = useState(false);
  // Référence du bouton, transmise à la popup comme ancre.
  const bouton = useRef(null);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <span className="ancre-popup">
      <button
        ref={bouton}
        type="button"
        className={className}
        aria-expanded={ouvert}
        title={title}
        onClick={() => setOuvert((o) => !o)}
      >
        {icone}
        <Sr>{libelle}</Sr>
      </button>
      <Popup ouvert={ouvert} onFermer={fermer} ancre={bouton} titre={titre}>
        {children}
      </Popup>
    </span>
  );
}

// Petit bouton rond d'aide ouvrant une popup ; `symbole` : « ? » par défaut.
export function BoutonAide({
  titre, symbole = '?', libelle = 'En savoir plus', className, children,
}) {
  return (
    <BoutonPopup
      titre={titre}
      libelle={libelle}
      className={cx('bouton-aide', className)}
      icone={<span aria-hidden="true">{symbole}</span>}
    >
      {children}
    </BoutonPopup>
  );
}
