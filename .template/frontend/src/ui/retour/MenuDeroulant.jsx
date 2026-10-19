import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../classes';
import { Bouton } from '../primitives/Bouton';
import { IcoChevronBas } from '../primitives/Icones';
import { useClicExterieur, useEchap } from '../hooks/evenements';
import './surcouches.css';

// Bouton qui déroule une liste d'actions.
// `items` : `[{ cle, libelle, description, desactive, onClick }]`. `note` :
// texte non cliquable sous la liste. Un clic extérieur ou Échap referme.
export function MenuDeroulant({
  libelle, icone, variante = 'principal', taille, desactive, items, note,
  alignement = 'fin',
}) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef(null);
  const liste = useRef(null);
  const [pos, setPos] = useState(null);
  const fermer = useCallback(() => setOuvert(false), []);
  useClicExterieur([zone, liste], fermer, ouvert);
  useEchap(fermer, ouvert);

  // La liste est rendue dans `document.body` : position fixe calculée sur le
  // bouton, alignée à son bord droit (`fin`) ou gauche (`debut`).
  useLayoutEffect(() => {
    if (!ouvert || !zone.current) return;
    const r = zone.current.getBoundingClientRect();
    setPos({
      haut: r.bottom + 6,
      ...(alignement === 'fin'
        ? { droite: window.innerWidth - r.right } : { gauche: r.left }),
    });
  }, [ouvert, alignement]);
  // Le défilement et le redimensionnement referment la liste (sa position
  // n'est calculée qu'à l'ouverture).
  useEffect(() => {
    if (!ouvert) return undefined;
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', fermer);
    return () => {
      window.removeEventListener('scroll', fermer, true);
      window.removeEventListener('resize', fermer);
    };
  }, [ouvert, fermer]);

  return (
    <span className="menu-deroulant" ref={zone}>
      <Bouton
        variante={variante}
        taille={taille}
        icone={icone}
        disabled={desactive}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        onClick={() => setOuvert((o) => !o)}
      >
        {libelle}
        <IcoChevronBas className="btn-chevron" />
      </Bouton>
      {ouvert && createPortal(
        <div ref={liste} className={cx('menu-liste')} role="menu"
             style={pos ? {
               top: `${pos.haut}px`, left: pos.gauche, right: pos.droite,
             } : { top: 0, left: 0, visibility: 'hidden' }}>
          {items.map((i) => (
            <button
              key={i.cle}
              type="button"
              role="menuitem"
              className="menu-item"
              disabled={i.desactive}
              onClick={() => { setOuvert(false); i.onClick(); }}
            >
              <span className="menu-item-libelle">{i.libelle}</span>
              {i.description && (
                <span className="menu-item-description">{i.description}</span>
              )}
            </button>
          ))}
          {note && <p className="menu-note">{note}</p>}
        </div>,
        document.body,
      )}
    </span>
  );
}
