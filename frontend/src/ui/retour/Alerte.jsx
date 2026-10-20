import { cx } from '../classes';
import {
  IcoAttention, IcoErreur, IcoInfo, IcoSucces,
} from '../primitives/Icones';
import './surcouches.css';

// Encadré de message (erreur, avertissement, information).
// `niveau` : danger, attention, info, succes ou neutre. `role="alert"` est posé
// par défaut sur le niveau danger uniquement.
const ICONES = {
  danger: IcoErreur,
  attention: IcoAttention,
  info: IcoInfo,
  succes: IcoSucces,
  neutre: IcoInfo,
};

export function Alerte({
  niveau = 'danger', titre, compacte, role, className, children,
}) {
  const Ico = ICONES[niveau] || IcoInfo;
  return (
    <div
      className={cx('alerte', `alerte-${niveau}`, compacte && 'alerte-compacte',
        className)}
      role={role === undefined ? (niveau === 'danger' ? 'alert' : undefined) : role}
    >
      <Ico className="alerte-ico" />
      <div className="alerte-contenu">
        {titre && <p className="alerte-titre">{titre}</p>}
        {children}
      </div>
    </div>
  );
}

// Indicateur de chargement avec libellé.
export function Chargement({ texte = 'Chargement…', compact }) {
  return (
    <div className={cx('etat-vide', 'etat-vide-chargement',
      compact && 'etat-vide-compact')} role="status">
      <span className="roue" aria-hidden="true" />
      <span>{texte}</span>
    </div>
  );
}

// État vide : icône, titre et texte explicatif facultatifs.
export function EtatVide({ titre, icone, compact, children }) {
  return (
    <div className={cx('etat-vide', compact && 'etat-vide-compact')}>
      {icone && <span className="etat-vide-ico">{icone}</span>}
      {titre && <p className="etat-vide-titre">{titre}</p>}
      {children && <div className="etat-vide-texte">{children}</div>}
    </div>
  );
}
