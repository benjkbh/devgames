import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../classes';
import { Bouton } from '../primitives/Bouton';
import { IcoFermer } from '../primitives/Icones';
import { BarreActions } from '../formulaire/Champ';
import { useBlocageDefilement, useEchap } from '../hooks/evenements';
import './surcouches.css';

// Fenêtre modale centrée sur un voile, rendue dans `document.body`.
// Échap et un clic sur le voile appellent `onFermer`.
// `onSubmit` transforme la boîte en `<form>` ; le bouton d'envoi se déclare
// `type="submit"` dans `actions`. `alerte` : rôle `alertdialog`.
// `taille` : m (défaut), l ou xl (hauteur fixe, corps défilant).
// `entete` : contenu sous le titre ; `barre` : bandeau entre l'en-tête et le
// corps (onglets) ; `actionsTete` : boutons à droite du titre.
// Le focus entre dans la boîte à l'ouverture s'il n'est pas déjà dedans.
// Échap est ignoré tant qu'une popup est ouverte : elle se ferme seule.
// La page derrière ne défile pas tant que la fenêtre est ouverte.
export function Dialogue({
  ouvert, titre, description, entete, barre, children, actions, onFermer,
  onSubmit, alerte, taille = 'm', actionsTete,
}) {
  const boite = useRef(null);
  const idTitre = useId();
  useEchap(() => {
    if (!document.querySelector('.popup')) onFermer();
  }, ouvert);
  useBlocageDefilement(ouvert);

  useEffect(() => {
    if (!ouvert || !boite.current) return;
    if (!boite.current.contains(document.activeElement)) boite.current.focus();
  }, [ouvert]);

  if (!ouvert) return null;

  const Balise = onSubmit ? 'form' : 'div';
  return createPortal(
    <div
      className="voile"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <Balise
        ref={boite}
        className={cx('dialogue', `dialogue-${taille}`)}
        role={alerte ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        onSubmit={onSubmit}
        autoComplete={onSubmit ? 'off' : undefined}
      >
        <header className="dialogue-tete">
          <div className="dialogue-titres">
            <h2 className="dialogue-titre" id={idTitre}>{titre}</h2>
            {description && <p className="dialogue-description">{description}</p>}
            {entete && <div className="dialogue-entete">{entete}</div>}
          </div>
          <div className="dialogue-actions-tete">
            {actionsTete}
            <Bouton libelle="Fermer" icone={<IcoFermer />} onClick={onFermer} variante="fantome" />
          </div>
        </header>
        {barre && <div className="dialogue-barre">{barre}</div>}
        {children && <div className="dialogue-corps">{children}</div>}
        {actions && (
          <footer className="dialogue-pied">
            <BarreActions alignement="fin">{actions}</BarreActions>
          </footer>
        )}
      </Balise>
    </div>,
    document.body,
  );
}

// Dialogue de confirmation. `libelle` : texte du bouton de confirmation ;
// `danger` : variante danger ; `occupe` : bouton en cours d'action.
export function Confirmation({
  ouvert, titre, message, libelle, danger, occupe, onConfirmer, onAnnuler,
}) {
  return (
    <Dialogue
      ouvert={ouvert}
      titre={titre}
      alerte
      onFermer={onAnnuler}
      actions={(
        <>
          <Bouton variante="principal" couleur={danger ? 'rouge' : 'sang'}
                  waiting={occupe}
                  onClick={onConfirmer} titre={libelle} />
          <Bouton variante="secondaire" onClick={onAnnuler} titre="Revenir" />
        </>
      )}
    >
      <p className="dialogue-message">{message}</p>
    </Dialogue>
  );
}
