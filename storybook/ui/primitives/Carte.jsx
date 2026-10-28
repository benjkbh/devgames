import { cx } from '../classes';
import './Carte.css';

// Surface encadrée, avec ou sans en-tête.
// `titre`, `sousTitre` et `actions` forment l'en-tête ; `corps={false}` ne
// rend pas les enfants (en-tête seul), même s'ils sont définis ; `niveau` : `attention` ou `accent` (liseré) ;
// `compacte` : marges réduites ; `as` : balise racine (`section` par défaut).
export function Carte({
  titre, sousTitre, actions, as: Balise = 'section', corps = true, niveau,
  compacte, className, children, ...reste
}) {
  const tete = titre || sousTitre || actions;
  return (
    <Balise className={cx('carte', niveau && `carte-${niveau}`,
      compacte && 'carte-compacte', className)} {...reste}>
      {tete && (
        <header className="carte-tete">
          <div className="carte-titres">
            {titre && <h3 className="carte-titre">{titre}</h3>}
            {sousTitre && <p className="carte-sous-titre">{sousTitre}</p>}
          </div>
          {actions && <div className="carte-actions">{actions}</div>}
        </header>
      )}
      {corps && <div className="carte-corps">{children}</div>}
    </Balise>
  );
}
