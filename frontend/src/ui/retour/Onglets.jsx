import { cx } from '../classes';
import { Pastille } from '../primitives/Badge';
import { BoutonAide } from './BoutonPopup';
import './surcouches.css';

// Barre d'onglets.
// `onglets` : `[{ cle, libelle, compte, puce, aide }]`.
//   compte  nombre affiché à côté du libellé ;
//   puce    pastille d'attention sur l'onglet ;
//   aide    infobulle ;
//   aideDetail  texte d'un « ? » à côté de l'onglet, ouvrant une popup.
// `variante` : `souligne` ou `pilule`.
export function Onglets({
  onglets, actif, onChange, libelle, variante = 'souligne', className,
}) {
  return (
    <div className={cx('onglets', `onglets-${variante}`, className)}
         role="tablist" aria-label={libelle}>
      {onglets.map((o) => {
        const choisi = actif === o.cle;
        const bouton = (
          <button
            key={o.cle || 'tout'}
            type="button"
            role="tab"
            aria-selected={choisi}
            className={cx('onglet', choisi && 'actif')}
            title={o.aide}
            onClick={() => onChange(o.cle)}
          >
            {o.libelle}
            {o.compte !== undefined && o.compte !== null && (
              <span className="onglet-compte">{o.compte}</span>
            )}
            {o.puce && <Pastille couleur="orange" compact />}
          </button>
        );
        if (!o.aideDetail) return bouton;
        return (
          <span key={o.cle || 'tout'} className="onglet-groupe">
            {bouton}
            <BoutonAide titre={o.libelle} libelle={`À propos de ${o.libelle}`}>
              {o.aideDetail}
            </BoutonAide>
          </span>
        );
      })}
    </div>
  );
}
