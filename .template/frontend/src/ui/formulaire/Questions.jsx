import { cx } from '../classes';
import './formulaire.css';

// Question à choix exclusif : options en boutons radio.
// `options` : `[{ valeur, libelle, resume }]` ; une valeur vide est une option
// valide. `valeur` : valeur choisie ; `onChange(valeur)` ; `nom` : nom du
// groupe radio.
// `disposition` :
//   cartes    option cliquable en entier, titre et résumé
//   segments  options courtes côte à côte
// Avec `legende`, le groupe est un `<fieldset>` ; sans, un `radiogroup`.
export function QuestionChoix({
  nom, legende, options, valeur, onChange, desactive, disposition = 'cartes',
  note, title, id, className,
}) {
  const liste = (
    <div className="radios-options">
      {options.map((o) => {
        const choisi = valeur === o.valeur;
        return (
          <label key={o.valeur || 'aucun'} title={title}
                 className={cx('radio', choisi && 'choisi')}>
            <input
              type="radio"
              name={nom}
              value={o.valeur}
              checked={choisi}
              disabled={desactive}
              onChange={() => onChange(o.valeur)}
            />
            <span className="radio-textes">
              <span className="radio-titre">{o.libelle}</span>
              {o.resume && <span className="radio-resume">{o.resume}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
  const classes = cx('radios', `radios-${disposition}`,
    desactive && 'radios-desactive', className);

  if (!legende) {
    return (
      <div className={classes} role="radiogroup" id={id}>
        {liste}
        {note && <p className="radios-note">{note}</p>}
      </div>
    );
  }
  return (
    <fieldset className={classes} disabled={desactive} id={id}>
      <legend>{legende}</legend>
      {liste}
      {note && <p className="radios-note">{note}</p>}
    </fieldset>
  );
}

// Question oui / non : case à cocher avec description ; `onChange(coché)`.
export function QuestionBool({
  libelle, description, checked, onChange, disabled, className,
}) {
  return (
    <label className={cx('case', className)}>
      <input type="checkbox" checked={checked} disabled={disabled}
             onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="case-libelle">{libelle}</span>
        {description && <span className="case-description">{description}</span>}
      </span>
    </label>
  );
}
