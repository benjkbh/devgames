import { cx } from '../classes';
import './Badge.css';

// Étiquette courte (statut, rôle, compte).
// `titre` : le texte (à défaut, les enfants, pour un contenu riche) ;
// `couleur` : gris, bleu, vert, orange, rouge ; `majuscules` : variante en
// capitales pour annoter une valeur voisine ; `suffixe` : valeur chiffrée
// affichée après le texte (« figé 3 j »), en chiffres tabulaires.
export function Badge({
  titre, couleur = 'gris', majuscules, suffixe, className, children, ...reste
}) {
  return (
    <span className={cx('badge', `badge-${couleur}`, majuscules && 'badge-maj',
      className)} {...reste}>
      {titre}
      {children}
      {suffixe !== undefined && suffixe !== null && suffixe !== '' && (
        <span className="badge-suffixe">{suffixe}</span>
      )}
    </span>
  );
}

// Badge d'un état vrai / faux : `couleurVrai` (vert) ou `couleurFaux` (gris) ;
// `vrai` est converti en booléen. Les autres props, `titre` et `suffixe`
// compris, vont au `Badge`.
export function BadgeBooleen({
  vrai, couleurVrai = 'vert', couleurFaux = 'gris', ...reste
}) {
  return <Badge couleur={vrai ? couleurVrai : couleurFaux} {...reste} />;
}

// Pastille d'état : rond coloré, masqué aux lecteurs d'écran.
// `couleur` : vert, bleu, rouge, orange, ardoise, gris ou vide (anneau sans
// remplissage). `compact` : petit point sans halo, pour signaler quelque chose
// à côté d'un texte.
export function Pastille({ couleur, compact, className }) {
  return (
    <span className={cx('pastille', couleur && `pastille-${couleur}`,
      compact && 'pastille-compact', className)} aria-hidden="true" />
  );
}
