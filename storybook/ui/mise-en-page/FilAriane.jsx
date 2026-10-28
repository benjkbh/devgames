import { cx } from '../classes';
import './FilAriane.css';

// Fil d'Ariane : où l'on est (« Jeux de la veillée / UNO »).
// `elements` : textes ou liens (un `<Link>` du routeur, un `<a>`), du plus
// général au plus précis ; le dernier est la page courante.
export function FilAriane({ elements, libelle = 'Fil d’Ariane', className }) {
  return (
    <nav className={cx('fil-ariane', className)} aria-label={libelle}>
      <ol>
        {elements.map((e, i) => {
          const dernier = i === elements.length - 1;
          return (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className={cx(dernier && 'courant')}
                aria-current={dernier ? 'page' : undefined}>
              {e}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
