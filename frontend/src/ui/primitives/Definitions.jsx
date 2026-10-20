import { cx } from '../classes';
import './Definitions.css';

// Liste libellé / valeur en lecture seule.
// `items` : `[[libelle, valeur], ...]` ; `libelle` sert de clé et doit être
// unique dans la liste.
// `disposition` :
//   pile    libellé au-dessus de la valeur, séparés d'un trait
//   grille  cases réparties sur la largeur
//   ligne   paires à la suite, avec retour à la ligne
// `mono` : valeurs en chasse fixe.
export function Definitions({
  items, disposition = 'pile', mono, className,
}) {
  return (
    <dl className={cx('defs', `defs-${disposition}`, mono && 'defs-mono',
      className)}>
      {items.map(([libelle, valeur]) => (
        <div className="defs-item" key={libelle}>
          <dt>{libelle}</dt>
          <dd>{valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
