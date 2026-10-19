import { useRef } from 'react';

import {
  Badge, Bouton, CarteJeu, Eventail, IcoFermer, Pastille, Sr, cx,
} from '../../ui';
import { useGlissements } from './animations';
import { useEcranEtroit } from './ecran';

// Le tapis de jeu, commun au joueur et au spectateur : un plateau de bois et
// de feutre vert, les joueurs assis autour (leurs cartes en dos), au centre la
// pioche, la défausse et l'anneau de la couleur demandée, que parcourent les
// flèches du sens du jeu. Le contenu du bas (la main du joueur, le résultat de
// la manche) est passé en `children` : il est posé sur le même tapis.

// Pastille de la couleur demandée, dans la teinte des cartes.
const PASTILLES = { rouge: 'sang', jaune: 'or', vert: 'vert', bleu: 'bleu' };

// Joueurs dans l'ordre de la table, en commençant après `moi`.
export function apresMoi(joueurs, moi) {
  const i = joueurs.findIndex((j) => j.nom === moi);
  return i < 0 ? joueurs : [...joueurs.slice(i + 1), ...joueurs.slice(0, i)];
}

// Joueur à la table (son interface relit la table) ou absent (onglet fermé,
// réseau coupé) : pastille et texte pour les lecteurs d'écran.
export function Presence({ table, nom }) {
  const present = !table.presents || table.presents[nom] !== false;
  return (
    <span className={cx('uno-presence', !present && 'absent')}
          title={present ? 'À la table' : 'Absent : déconnecté de la table'}>
      <Pastille couleur={present ? 'vert' : 'gris'} compact />
      <Sr>{present ? ' (à la table)' : ' (absent)'}</Sr>
      {!present && <span className="uno-presence-texte" aria-hidden="true">absent</span>}
    </span>
  );
}

// Un joueur assis autour du tapis.
function Siege({
  joueur, table, actif, onContrer, onExclure,
}) {
  // Sur un écran étroit, un siège n'a la place que de quelques dos.
  const etroit = useEcranEtroit();
  const visibles = Math.min(joueur.cartes, etroit ? 6 : 10);
  const absent = table.presents && table.presents[joueur.nom] === false;
  return (
    <li className={cx('uno-siege', actif && 'actif', absent && 'absent')}
        data-uno-joueur={joueur.nom}
        aria-current={actif ? 'true' : undefined}>
      <div className="uno-siege-tete">
        <Presence table={table} nom={joueur.nom} />
        <span className="uno-siege-nom">{joueur.nom}</span>
        {joueur.uno && <Badge couleur="rouge" majuscules titre="UNO" />}
        {onExclure && (
          <button type="button" className="uno-siege-exclure"
                  title={`Exclure ${joueur.nom}`}
                  aria-label={`Exclure ${joueur.nom} de la table`}
                  onClick={() => onExclure(joueur.nom)}>
            <IcoFermer />
          </button>
        )}
      </div>
      <Eventail chevauchement={0.7} className="uno-siege-main">
        {Array.from({ length: visibles }, (_, i) => (
          <CarteJeu key={i} face="verso" taille="xs" />
        ))}
      </Eventail>
      <span className="uno-siege-compte">
        {`${joueur.cartes} carte${joueur.cartes > 1 ? 's' : ''}`}
      </span>
      {actif && <span className="uno-siege-tour" aria-hidden="true">Joue…</span>}
      {joueur.expose && onContrer && (
        <Bouton taille="s" couleur="rouge" variante="principal"
                className="uno-contre" titre="Contre-UNO !"
                onClick={() => onContrer(joueur.nom)} />
      )}
    </li>
  );
}

// Flèches qui tournent autour de la défausse, dans le sens du jeu.
function Sens({ inverse }) {
  return (
    <svg className={cx('uno-sens', inverse && 'inverse')} viewBox="-50 -50 100 100"
         aria-hidden="true" focusable="false">
      <g transform={inverse ? 'scale(-1 1)' : undefined}>
        <circle r="44" className="uno-sens-trait" />
        {[0, 120, 240].map((a) => (
          <path key={a} d="M4-44-2.5-48V-40Z" transform={`rotate(${a})`} />
        ))}
      </g>
    </svg>
  );
}

// `partie` : la manche, telle que le joueur (ou le spectateur) la voit ;
// `moi` : le joueur, absent pour un spectateur ; `message` : qui joue ;
// `onPiocher` : rend la pioche cliquable (`peutPiocher` : c'est possible
// maintenant) ; `boutonUno` : le bouton UNO, posé au centre ; `origine` : ref
// du rectangle de la carte que le joueur vient de jouer, d'où elle glisse.
export function Tapis({
  table, partie: p, moi, message, onPiocher, peutPiocher, boutonUno, origine,
  onContrer, onExclure, children,
}) {
  const racine = useRef(null);
  useGlissements(racine, p, table.manches, moi, origine);
  const monTour = Boolean(moi) && p.tour === moi;
  const sieges = moi ? apresMoi(p.joueurs, moi) : p.joueurs;
  const finie = Boolean(p.gagnant);
  return (
    <div ref={racine} className={cx('uno-tapis', `uno-centre-${p.couleur}`)}>
      <div className="uno-feutre">
        <ul className="uno-sieges" aria-label="Joueurs">
          {sieges.map((j) => (
            <Siege key={j.nom} joueur={j} table={table} actif={p.tour === j.nom}
                   onContrer={onContrer}
                   onExclure={onExclure && j.nom !== table.hote ? onExclure : undefined} />
          ))}
        </ul>

        <div className="uno-centre">
          <div className="uno-anneau" aria-hidden="true">
            <Sens inverse={p.sens < 0} />
          </div>
          <div className="uno-piles">
            <div className="uno-pile">
              <CarteJeu data-uno="pioche" face="verso" taille="l"
                        desactivee={onPiocher ? !peutPiocher : undefined}
                        jouable={peutPiocher && p.jouables && p.jouables.length === 0}
                        libelle={`Pioche (${p.pioche} cartes)`}
                        onClick={onPiocher ? () => onPiocher() : undefined} />
              <span className="uno-pile-libelle">{`Pioche · ${p.pioche}`}</span>
            </div>
            <div className="uno-pile uno-defausse">
              <CarteJeu data-uno="defausse" taille="l" couleur={p.dessus.couleur}
                        valeur={p.dessus.valeur}
                        couleurChoisie={p.dessus.couleur === 'noir' ? p.couleur : undefined} />
              <span className="uno-pile-libelle">Défausse</span>
            </div>
          </div>
          {boutonUno}
          <div className="uno-etat">
            <p className={cx('uno-tour', monTour && !finie && 'moi', finie && 'fin')}
               aria-live="polite">
              {message}
            </p>
            <p className="uno-indic">
              <Pastille couleur={PASTILLES[p.couleur]} />
              <span>
                {'Couleur : '}
                <span className="uno-indic-couleur">{p.couleur}</span>
              </span>
              <span className="uno-indic-sep" aria-hidden="true">·</span>
              {p.sens > 0 ? 'Sens horaire' : 'Sens antihoraire'}
            </p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
