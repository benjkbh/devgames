import { cx } from '../classes';
import './Avatar.css';

// Initiales d'un nom (« Ada Lovelace » → AL, « admin » → AD).
export function initiales(nom) {
  const mots = String(nom || '').trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  const lettres = mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2);
  return lettres.toUpperCase();
}

// Rond aux initiales d'une personne, avec sa présence en pastille.
// `nom` ; `presence` : true (pastille verte), false (grise), absent : sans
// pastille ; `couleur` : neutre, or ou vert ; `taille` : s ou m.
// Décoratif : le nom est écrit à côté.
export function Avatar({
  nom, presence, couleur = 'neutre', taille = 'm', className,
}) {
  return (
    <span className={cx('avatar', `avatar-${taille}`, `avatar-${couleur}`, className)}
          aria-hidden="true">
      {initiales(nom)}
      {presence !== undefined && (
        <span className={cx('avatar-presence', presence ? 'present' : 'absent')} />
      )}
    </span>
  );
}
