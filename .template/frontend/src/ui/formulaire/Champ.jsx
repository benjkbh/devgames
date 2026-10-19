import { cx } from '../classes';
import { BoutonAide } from '../retour/BoutonPopup';
import './formulaire.css';

// Champ de formulaire : libellé, contrôle (en enfant), aide, erreur.
// Le contrôle doit porter `id` et, en cas d'erreur,
// `aria-describedby={`${id}-err`}` (voir `aideErreur`).
//   aide         ligne sous le contrôle, masquée si une erreur est affichée
//   aideDetail   texte long ouvert par un bouton « i »
//   etiquette    annotation à droite du libellé
//   verrouille   champ lisible mais atténué
//   requis       ajoute l'astérisque au libellé
export function Champ({
  id, libelle, requis, aide, aideDetail, erreur, etiquette, verrouille,
  title, className, children,
}) {
  return (
    <div className={cx('champ', erreur && 'champ-erreur',
      verrouille && 'champ-verrouille', className)} title={title}>
      <div className="champ-tete">
        <label htmlFor={id} className="champ-libelle">
          {libelle}
          {requis && <span className="champ-requis" aria-hidden="true">*</span>}
        </label>
        {aideDetail && (
          <BoutonAide titre={libelle} symbole="i">{aideDetail}</BoutonAide>
        )}
        {etiquette}
      </div>
      {children}
      {aide && !erreur && <p className="champ-aide">{aide}</p>}
      {erreur && <p className="champ-err" id={`${id}-err`}>{erreur}</p>}
    </div>
  );
}

// Attributs `aria-invalid` et `aria-describedby` reliant un contrôle à son
// erreur.
export function aideErreur(id, erreur) {
  return {
    'aria-invalid': erreur ? 'true' : undefined,
    'aria-describedby': erreur ? `${id}-err` : undefined,
  };
}

// Rangée de boutons d'un formulaire. `alignement` : debut, fin, entre ;
// `collante` : fixée en bas de l'écran au défilement.
export function BarreActions({ alignement = 'debut', collante, className, children }) {
  return (
    <div className={cx('barre-actions', `barre-actions-${alignement}`,
      collante && 'barre-actions-collante', className)}>
      {children}
    </div>
  );
}
