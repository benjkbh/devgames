import { cx } from '../classes';
import { Carte } from '../primitives/Carte';
import './BarreFiltres.css';

// Barre de filtres d'une liste : recherche, sélecteurs, période, limite.
// Les contrôles passent en enfants ; `actions` se place à droite (bouton de
// création). `carte` : encadrée, avec `titre` facultatif ; `colonne` : un
// contrôle par ligne.
export function BarreFiltres({
  titre, carte, colonne, actions, className, children,
}) {
  const contenu = (
    <>
      {children}
      {actions && <span className="barre-filtres-actions">{actions}</span>}
    </>
  );
  const classes = cx('barre-filtres', colonne && 'barre-filtres-colonne',
    className);
  if (carte) {
    return (
      <Carte as="aside" titre={titre} compacte className={classes}>
        {contenu}
      </Carte>
    );
  }
  return <div className={classes}>{contenu}</div>;
}
