import { cx } from '../classes';
import { BoutonOuvrir } from './Tableau';
import './Mosaique.css';

// Mosaïque de cartes : une carte par élément, avec le bouton d'ouverture de
// son détail.
// `elements` : `[{ cle, titre, lignes, niveau }]`, `lignes` : `[[libellé, valeur]]`
// affichées sous le titre ; `ouvert` : clé de la carte dont le détail est
// ouvert ; `onOuvrir(cle)` ; `libelleOuvrir(element)` : texte lecteur d'écran
// du bouton.
export function Mosaique({
  elements, ouvert, onOuvrir, libelleOuvrir, className, legende,
}) {
  return (
    <ul className={cx('mosaique', className)} aria-label={legende}>
      {elements.map((e) => (
        <li key={e.cle} className={cx('mosaique-carte', e.cle === ouvert && 'choisie',
          e.niveau && `mosaique-${e.niveau}`)}>
          <div className="mosaique-tete">
            <h3 className="mosaique-titre" title={e.titre}>{e.titre}</h3>
            <BoutonOuvrir libelle={libelleOuvrir(e)} ouvert={e.cle === ouvert}
                          onClick={() => onOuvrir(e.cle)} />
          </div>
          {e.lignes && (
            <dl className="mosaique-lignes">
              {e.lignes.map(([libelle, valeur]) => (
                <div key={libelle} className="mosaique-ligne">
                  <dt>{libelle}</dt>
                  <dd>{valeur}</dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}
