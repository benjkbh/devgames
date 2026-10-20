import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Bouton } from '../primitives/Bouton';
import { IcoFermer } from '../primitives/Icones';
import { useClicExterieur, useEchap } from '../hooks/evenements';
import './surcouches.css';

// Petite fenêtre ancrée sur le bouton `ancre` (référence), rendue dans
// `document.body` par un portail. Placée sous l'ancre, ou au-dessus si elle
// déborde de l'écran ; fermée par Échap, un clic extérieur, un défilement ou
// un redimensionnement.
const MARGE = 8;

export function Popup({ ouvert, onFermer, titre, children, ancre }) {
  const boite = useRef(null);
  const [pos, setPos] = useState(null);

  // Calcule la position à partir du rectangle de l'ancre.
  useLayoutEffect(() => {
    if (!ouvert || !ancre || !ancre.current) return;
    const r = ancre.current.getBoundingClientRect();
    const b = boite.current ? boite.current.getBoundingClientRect() : null;
    const largeur = b ? b.width : 300;
    const hauteur = b ? b.height : 160;
    let gauche = r.left;
    if (gauche + largeur > window.innerWidth - MARGE) {
      gauche = Math.max(MARGE, window.innerWidth - largeur - MARGE);
    }
    let haut = r.bottom + 6;
    if (haut + hauteur > window.innerHeight - MARGE) {
      haut = Math.max(MARGE, r.top - hauteur - 6);
    }
    setPos({ haut, gauche });
  }, [ouvert, ancre, titre]);

  useEchap(onFermer, ouvert);
  // Zones intérieures : la fenêtre et son ancre.
  useClicExterieur([boite, ancre], onFermer, ouvert);

  useEffect(() => {
    if (!ouvert) return undefined;
    // La position est calculée une fois ; défilement et redimensionnement
    // ferment la fenêtre.
    window.addEventListener('scroll', onFermer, true);
    window.addEventListener('resize', onFermer);
    if (boite.current) boite.current.focus();
    return () => {
      window.removeEventListener('scroll', onFermer, true);
      window.removeEventListener('resize', onFermer);
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return createPortal(
    <div
      ref={boite}
      className="popup"
      role="dialog"
      aria-label={titre}
      tabIndex={-1}
      style={pos
        ? { top: `${pos.haut}px`, left: `${pos.gauche}px` }
        // Invisible au premier rendu, le temps de mesurer.
        : { top: 0, left: 0, visibility: 'hidden' }}
    >
      <div className="popup-tete">
        <strong>{titre}</strong>
        <Bouton taille="s" libelle="Fermer" icone={<IcoFermer />}
                     onClick={onFermer}
          variante="fantome" />
      </div>
      <div className="popup-corps">{children}</div>
    </div>,
    document.body,
  );
}
