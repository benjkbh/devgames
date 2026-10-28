import { cx } from '../classes';
import { Avatar } from './Avatar';
import { IcoCouronne, IcoFermer, IcoPlus } from './Icones';
import './Places.css';

// Places autour d'une table de jeu : les joueurs assis, puis les places
// libres jusqu'à `max`.
// `joueurs` : `[{ nom, detail, ton, presence, couronne }]` :
//   detail    ligne sous le nom (« Hôte · vous », « Prêt ») ;
//   ton       or (hôte, ou soi) ou vert (prêt) : la place s'allume ;
//   presence  true / false : pastille de l'avatar ; absent : sans pastille ;
//   couronne  marque l'hôte.
// `onInviter` : chaque place libre devient un bouton « + » (copier le lien
// d'invitation…), nommé par `libelleInviter` ; sans, elle reste un cercle en
// pointillé. `onRetirer(nom)` : bouton de retrait sur les places des autres
// (exclusion par l'hôte) ; `retirable(joueur)` filtre les places concernées.
// `colonnes` : nombre de places par rangée (sinon, autant qu'il en tient) ;
// sur écran étroit, la grille reprend la main.
export function Places({
  joueurs, max, onInviter, libelleInviter = 'Inviter un joueur', onRetirer,
  retirable = () => true, colonnes, libelle = 'Places', className,
}) {
  const libres = Math.max(0, max - joueurs.length);
  return (
    <ol className={cx('places', colonnes && 'places-colonnes', className)} aria-label={libelle}
        style={colonnes ? { '--places-colonnes': colonnes } : undefined}>
      {joueurs.map((j) => (
        <li key={j.nom} className={cx('place', j.ton && `place-${j.ton}`)}>
          {j.couronne && <IcoCouronne className="place-couronne" />}
          <Avatar nom={j.nom} presence={j.presence}
                  couleur={j.ton === 'vert' ? 'vert' : (j.ton && 'or') || 'neutre'} />
          <span className="place-nom">{j.nom}</span>
          {j.detail && <span className="place-detail">{j.detail}</span>}
          {onRetirer && retirable(j) && (
            <button type="button" className="place-retirer"
                    title={`Retirer ${j.nom}`} aria-label={`Retirer ${j.nom}`}
                    onClick={() => onRetirer(j.nom)}>
              <IcoFermer />
            </button>
          )}
        </li>
      ))}
      {Array.from({ length: libres }, (_, i) => {
        const n = joueurs.length + i + 1;
        return (
          <li key={`libre-${n}`} className="place place-libre">
            {onInviter ? (
              <button type="button" className="place-inviter" onClick={onInviter}
                      aria-label={`${libelleInviter} (place ${n})`}>
                <span className="place-rond"><IcoPlus /></span>
                <span className="place-detail">{`Place ${n}`}</span>
              </button>
            ) : (
              <>
                <span className="place-rond" />
                <span className="place-detail">{`Place ${n}`}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
