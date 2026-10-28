import { cx } from '../classes';
import './TuileChoix.css';

// Option à cocher présentée en tuile : pictogramme, titre, description et
// case. La tuile entière est cliquable ; cochée, elle s'allume.
// `icone` : un élément (icône, ou court texte comme « 7·0 ») ; `checked`,
// `onChange(coché)` ; `disabled`. À ranger dans `.tuiles-choix` (grille de
// deux colonnes, une seule sur écran étroit) ou dans une colonne.
export function TuileChoix({
  icone, titre, description, checked, onChange, disabled, className,
}) {
  return (
    <label className={cx('tuile-choix', checked && 'cochee', disabled && 'desactivee', className)}>
      {icone && <span className="tuile-choix-ico" aria-hidden="true">{icone}</span>}
      <span className="tuile-choix-texte">
        <span className="tuile-choix-titre">{titre}</span>
        {description && <span className="tuile-choix-description">{description}</span>}
      </span>
      <input type="checkbox" className="tuile-choix-case" checked={Boolean(checked)}
             disabled={disabled}
             onChange={(e) => onChange && onChange(e.target.checked)} />
    </label>
  );
}
