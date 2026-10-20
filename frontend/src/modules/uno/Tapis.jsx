import { useRef } from 'react';

import {
  Badge, CarteJeu, Eventail, IcoFermer, Pastille, Sr, cx,
} from '../../ui';
import { useGlissements } from './animations';
import { useEcranEtroit } from './ecran';

// Le tapis de jeu, commun au joueur et au spectateur : un plateau de bois et
// de feutre vert, les joueurs assis autour (leurs cartes en dos), au centre la
// pioche, la défausse et l'anneau de la couleur demandée, que parcourent les
// flèches du sens du jeu. Le contenu du bas (la main du joueur, le résultat de
// la manche) est passé en `children` : il est posé sur le même tapis.

// Décor du feutre, dans l'esprit du village la nuit : pleine lune, loup qui
// hurle sur son rocher, lisière de sapins, étoiles, et une bougie à chaque
// coin. Purement décoratif : derrière tout, sans réaction à la souris.
const ETOILES = Array.from({ length: 26 }, (_, i) => [
  (i * 241) % 1000, 10 + ((i * 97) % 330), i % 4 === 0 ? 1.6 : 1,
]);
const SAPINS = Array.from({ length: 30 }, (_, i) => [
  i * 35 + ((i * 17) % 22), 26 + ((i * 41) % 30), i % 3 === 0,
]);
const LOUP = 'M8 96C18 94 26 92 31 85C34 77 40 69 48 65C53 61 55 53 57 45C58 39 59 35 61 31L60 20L66 28C70 26 75 22 86 12L87 18C83 25 79 31 73 35C70 39 69 45 69 53C69 61 71 67 71 75L69 96L57 96L59 81C55 83 52 89 51 96L40 96C38 91 35 92 33 96Z';

function Decor() {
  return (
    <div className="uno-decor" aria-hidden="true">
      <svg className="uno-decor-ciel" viewBox="0 0 1000 360" preserveAspectRatio="xMidYMin slice">
        {ETOILES.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </svg>
      <span className="uno-lune" />
      <svg className="uno-loup" viewBox="0 0 100 100">
        <path d="M2 99C10 88 24 90 40 88C56 86 78 90 98 99Z" className="uno-rocher" />
        <path d={LOUP} />
      </svg>
      <svg className="uno-sapins" viewBox="0 0 1060 90" preserveAspectRatio="none">
        {SAPINS.map(([x, h, avant]) => (
          <path key={x} className={avant ? 'avant' : undefined}
                d={`M${x} 90 L${x - 15} 90 L${x - 5} ${90 - h * 0.45} L${x - 12} ${90 - h * 0.45} L${x - 2} ${90 - h * 0.85} L${x - 8} ${90 - h * 0.85} L${x} ${90 - h - 20} L${x + 8} ${90 - h * 0.85} L${x + 2} ${90 - h * 0.85} L${x + 12} ${90 - h * 0.45} L${x + 5} ${90 - h * 0.45} L${x + 15} 90Z`} />
        ))}
      </svg>
      {['hg', 'hd', 'bg', 'bd'].map((coin) => (
        <span key={coin} className={`uno-bougie uno-bougie-${coin}`}>
          <i /><b />
        </span>
      ))}
    </div>
  );
}

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
  joueur, table, actif, onExclure,
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
      {joueur.expose && (
        <span className="uno-contre" title="Il n’a pas dit UNO : on peut le contrer">
          Sans UNO !
        </span>
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
// maintenant) ; `boutonUno` : le bouton UNO, posé au centre ; `onContrer` :
// un joueur peut contrer celui qui n'a pas dit UNO (gros bouton au centre,
// face au bouton UNO) ; `origine` : ref
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
  // Un autre joueur a posé son avant-dernière carte sans dire UNO.
  const contrable = !finie && p.joueurs.find((j) => j.expose && j.nom !== moi);
  return (
    <div ref={racine} className={cx('uno-tapis', `uno-centre-${p.couleur}`)}>
      <div className="uno-feutre">
        <Decor />
        <ul className="uno-sieges" aria-label="Joueurs">
          {sieges.map((j) => (
            <Siege key={j.nom} joueur={j} table={table} actif={p.tour === j.nom}
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
          {onContrer && contrable && (
            <button type="button" className="uno-bouton-contre"
                    aria-label={`Contre-UNO : ${contrable.nom} n’a pas dit UNO`}
                    title={`${contrable.nom} n’a pas dit UNO : 2 cartes pour lui !`}
                    onClick={() => onContrer(contrable.nom)}>
              <span className="uno-bouton-contre-texte" aria-hidden="true">
                Contre
                <br />
                UNO&nbsp;!
              </span>
              <span className="uno-bouton-contre-nom" aria-hidden="true">{contrable.nom}</span>
            </button>
          )}
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
