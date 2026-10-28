import { cx } from '../classes';
import { Bouton } from '../primitives/Bouton';
import { IcoOuvrir } from '../primitives/Icones';
import { Sr } from '../primitives/Sr';
import { BoutonAide } from '../retour/BoutonPopup';
import { estVide } from '../outils/format';
import './Tableau.css';

// Tableau de données : cadre, légende, en-tête. Le corps (`<tbody>`) est
// passé en enfant.
// `colonnes` : `[{ cle, libelle, largeur, nombre, sr, className }]`.
//   largeur  pose un `<colgroup>` ; avec `fixe`, les largeurs priment sur le
//            contenu ;
//   nombre   aligné à droite, chiffres tabulaires ;
//   sr       en-tête réservé aux lecteurs d'écran ;
//   triable  l'en-tête est un bouton qui trie par cette colonne.
//   aide     `{ titre, libelle, contenu }` : bouton « ? » à droite du titre,
//            qui ouvre une popup (`contenu`) ;
// `tri` : `{ cle, sens }` (`asc` ou `desc`) de la colonne triée ;
// `onTri(cle)` : appelé au clic sur un en-tête triable.
// `collant` : en-tête fixe au défilement ; `niveau` : variante du cadre.
export function Tableau({
  legende, colonnes, fixe, niveau, collant, className, tri, onTri, children,
}) {
  const largeurs = colonnes && colonnes.some((c) => c.largeur);
  return (
    <div className={cx('tableau-cadre', niveau && `tableau-${niveau}`)}>
      <table className={cx('tableau', fixe && 'tableau-fixe',
        collant && 'tableau-collant', className)}>
        {legende && <caption className="sr">{legende}</caption>}
        {largeurs && (
          <colgroup>
            {colonnes.map((c) => (
              <col key={c.cle}
                   style={c.largeur ? { width: c.largeur } : undefined} />
            ))}
          </colgroup>
        )}
        {colonnes && (
          <thead>
            <tr>
              {colonnes.map((c) => (
                <th key={c.cle} scope="col"
                    className={cx(c.nombre && 'col-nombre', c.className)}
                    aria-sort={c.triable && tri && tri.cle === c.cle
                      ? (tri.sens === 'asc' ? 'ascending' : 'descending')
                      : undefined}>
                  <EnteteColonne colonne={c} tri={tri} onTri={onTri} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        {children}
      </table>
    </div>
  );
}

// Titre d'une colonne : bouton de tri, texte ou lecteur d'écran, puis l'aide
// éventuelle, hors du bouton de tri.
function EnteteColonne({ colonne: c, tri, onTri }) {
  const titre = c.triable && onTri ? (
    <button type="button" className="th-tri" onClick={() => onTri(c.cle)}>
      {c.libelle}
      <span className="th-fleche" aria-hidden="true">
        {tri && tri.cle === c.cle ? (tri.sens === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  ) : (c.sr ? <Sr>{c.libelle}</Sr> : c.libelle);
  if (!c.aide) return titre;
  return (
    <span className="th-avec-aide">
      {titre}
      <BoutonAide titre={c.aide.titre} libelle={c.aide.libelle}>
        {c.aide.contenu}
      </BoutonAide>
    </span>
  );
}

// Valeur de cellule ; un tiret si elle est absente.
export function Valeur({ children }) {
  if (estVide(children)) return <span className="valeur-vide">-</span>;
  return children;
}

// Bouton d'une ligne qui ouvre son détail dans une fenêtre (`FenetreDetail`).
// `libelle` : texte lecteur d'écran ; `ouvert` : fenêtre de cette ligne ouverte.
export function BoutonOuvrir({
  libelle, ouvert, titre = 'Voir le détail', onClick,
}) {
  return (
    <Bouton
      taille="s"
      className="btn-ouvrir"
      libelle={libelle}
      title={titre}
      icone={<IcoOuvrir />}
      aria-haspopup="dialog"
      aria-expanded={Boolean(ouvert)}
      onClick={onClick}
      variante="fantome" />
  );
}
