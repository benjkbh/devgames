import { forwardRef } from 'react';

import { cx } from '../classes';
import { Sr } from './Sr';
import './Bouton.css';

// Bouton de l'interface.
// `variante` : le poids visuel ; `couleur` : la teinte, pour ne pas multiplier
// les variantes.
//   variante  principal   action principale de la zone (aplat)
//             secondaire  action ordinaire (contour) - défaut
//             fantome     action discrète (barre d'outils)
//   couleur   sang (défaut : rouge sang de la marque) · or · bleu (bleu de
//             lune) · rouge (rouge vif : geste destructif) · vert (étape
//             suivante) ; le nom dit la teinte affichée
// `titre` : le texte (à défaut, les enfants, pour un contenu riche). Sans
// texte, avec une `icone`, le bouton est carré : `libelle` en est alors
// l'infobulle et le nom accessible (obligatoire).
// `taille` : s, m, l ; `icone` / `iconeFin` : éléments avant / après le texte ;
// `bloc` : pleine largeur ; `waiting` : roue d'attente, bouton désactivé ;
// `type` : button (défaut), submit ou reset ; `href` : rend un lien, ouvert
// dans un nouvel onglet.
export const Bouton = forwardRef(function Bouton({
  variante = 'secondaire', couleur = 'sang', taille = 'm', titre, libelle,
  icone, iconeFin, waiting, bloc, type = 'button', disabled, href, className,
  children, ...reste
}, ref) {
  const sansTexte = !titre && !children && Boolean(icone);
  const classes = cx('btn', `btn-${variante}`, `btn-${couleur}`,
    `btn-${taille}`, sansTexte && 'btn-carre', bloc && 'btn-bloc', className);
  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...reste}
      >
        {icone && <span className="btn-ico">{icone}</span>}
        {titre}
        {children}
        {iconeFin && <span className="btn-ico">{iconeFin}</span>}
        <Sr> (s’ouvre dans un nouvel onglet)</Sr>
      </a>
    );
  }
  return (
    <button
      ref={ref}
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={classes}
      disabled={disabled || waiting}
      aria-busy={waiting || undefined}
      title={reste.title === undefined && sansTexte ? libelle : reste.title}
      {...reste}
    >
      {waiting ? <span className="btn-roue" aria-hidden="true" />
        : icone && <span className="btn-ico">{icone}</span>}
      {titre}
      {children}
      {sansTexte && libelle && <Sr>{libelle}</Sr>}
      {iconeFin && <span className="btn-ico">{iconeFin}</span>}
    </button>
  );
});
