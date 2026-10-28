import { cx } from '../classes';
import './Journal.css';

// Fil des derniers événements d'une partie, du plus récent au plus ancien.
// `evenements` : `[{ cle, contenu, ton, couleur }]` :
//   contenu  texte ou élément (un `<strong>` pour l'essentiel) ;
//   ton      actif (point doré : ce qui se passe maintenant) ou neutre ;
//   couleur  couleur CSS : un carré de cette couleur remplace le point (la
//            couleur d'une carte jouée).
// Rend `null` si la liste est vide.
export function Journal({ evenements, libelle = 'Journal', className }) {
  if (!evenements || !evenements.length) return null;
  return (
    <ol className={cx('journal', className)} aria-label={libelle}>
      {evenements.map(({
        cle, contenu, ton, couleur,
      }) => (
        <li key={cle} className={cx('journal-ligne', ton === 'actif' && 'actif')}>
          <span className={cx('journal-marque', couleur && 'carre')} aria-hidden="true"
                style={couleur ? { background: couleur } : undefined} />
          <span className="journal-texte">{contenu}</span>
        </li>
      ))}
    </ol>
  );
}
