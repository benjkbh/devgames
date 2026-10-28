import { cx } from '../classes';
import './Tuile.css';

// Chiffre-clé : `libelle` au-dessus, `valeur` en grand, `detail` dessous.
export function Tuile({ libelle, valeur, detail, className }) {
  return (
    <div className={cx('tuile', className)}>
      <span className="tuile-libelle">{libelle}</span>
      <span className="tuile-valeur">{valeur}</span>
      {detail && <span className="tuile-detail">{detail}</span>}
    </div>
  );
}

// Rangée de tuiles qui se répartit sur la largeur. `tuiles` :
// `[{ libelle, valeur, detail }]`, rendues avec `Tuile` ; les enfants sont
// ajoutés après (autres tuiles, ou n'importe quel élément). `minimum` : largeur
// minimale d'une tuile, en pixels.
export function GrilleTuiles({
  tuiles = [], minimum = 200, className, children,
}) {
  return (
    <div className={cx('tuiles', className)}
         style={{ '--tuile-min': `${minimum}px` }}>
      {tuiles.map((t) => <Tuile key={t.libelle} {...t} />)}
      {children}
    </div>
  );
}
