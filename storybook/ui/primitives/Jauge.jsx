import { cx } from '../classes';
import './Jauge.css';

// Remplissage d'une capacité : « 3 / 10 places » et une barre.
// `valeur`, `max` ; `unite` : texte après le maximum ; `libelle` : nom
// accessible de la barre (à défaut, l'unité).
export function Jauge({
  valeur, max, unite, libelle, className,
}) {
  const part = max > 0 ? Math.min(100, Math.max(0, (valeur / max) * 100)) : 0;
  return (
    <span className={cx('jauge', className)}>
      <span className="jauge-texte">
        <strong>{valeur}</strong>
        {` / ${max}${unite ? ` ${unite}` : ''}`}
      </span>
      <span className="jauge-barre" role="progressbar" aria-valuemin={0}
            aria-valuemax={max} aria-valuenow={valeur}
            aria-label={libelle || unite}>
        <span className="jauge-plein" style={{ width: `${part}%` }} />
      </span>
    </span>
  );
}
