import { Children, useId } from 'react';

import { cx } from '../classes';
import './CarteJeu.css';

// Carte à jouer, dessinée en SVG (grille 100 × 150) : carte de UNO ou carte
// d'un jeu de 52 cartes. Sans `onClick`, c'est une image ; avec, un bouton.
//   jeu             uno · classique
//   couleur         UNO : rouge · jaune · vert · bleu · noir (jokers)
//   valeur          UNO : 0…9 · passe · inversion · +2 · joker · +4
//   enseigne        52 cartes : pique · coeur · carreau · trefle
//   rang            52 cartes : A · 2…10 · V · D · R · joker
//   face            recto · verso (carte retournée : seul le dos est montré)
//   taille          xs · s · m · l · xl
//   couleurChoisie  UNO, joker ou +4 posé : couleur annoncée (liseré)
//   jouable · selectionnee · desactivee   états d'une carte en main
//   inclinaison     rotation en degrés (éventail, pile en désordre)
//   libelle         nom accessible ; à défaut, calculé (« 7 rouge »)
// Les autres props passent à l'élément racine.

export const COULEURS_UNO = ['rouge', 'jaune', 'vert', 'bleu'];
export const VALEURS_UNO = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'passe', 'inversion', '+2', 'joker', '+4'];
export const ENSEIGNES = ['pique', 'coeur', 'carreau', 'trefle'];
export const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V',
  'D', 'R'];

const NOIRES = ['joker', '+4'];
const NOMS_VALEURS = { passe: 'Passe', inversion: 'Inversion', joker: 'Joker' };
const NOMS_RANGS = { A: 'As', V: 'Valet', D: 'Dame', R: 'Roi' };
const NOMS_ENSEIGNES = {
  pique: 'pique', coeur: 'cœur', carreau: 'carreau', trefle: 'trèfle',
};

// Nom lisible d'une carte : « 7 rouge », « +4 », « Dame de cœur ».
export function nomCarte({
  jeu = 'uno', couleur, valeur, enseigne, rang, face = 'recto',
}) {
  if (face === 'verso') return 'Carte retournée';
  if (jeu === 'classique') {
    if (rang === 'joker') return 'Joker';
    return `${NOMS_RANGS[rang] || rang} de ${NOMS_ENSEIGNES[enseigne] || enseigne}`;
  }
  const nom = NOMS_VALEURS[valeur] || valeur;
  return NOIRES.includes(valeur) || !couleur ? nom : `${nom} ${couleur}`;
}

// -- UNO ------------------------------------------------------------------

// Palette des cartes, propre au site : jetons `--uno-*` de
// `styles/tokens.css` (sang, or, forêt, nuit, sur papier parchemin),
// identiques dans les deux thèmes. Les valeurs de repli servent hors de
// l'application (rendu isolé). Posées par `style` : une variable CSS n'est
// pas lue dans un attribut de présentation SVG.
const TEINTES = {
  rouge: 'var(--uno-rouge, #a3261e)',
  jaune: 'var(--uno-jaune, #d4a54a)',
  vert: 'var(--uno-vert, #3e7d4a)',
  bleu: 'var(--uno-bleu, #3a5a8c)',
  noir: 'var(--uno-noir, #0d0f16)',
};
const PAPIER = 'var(--uno-papier, #ece4d2)';
const ENCRE = 'var(--uno-encre, #0a0c11)';
const peint = (fill, stroke) => (stroke ? { fill, stroke } : { fill });

// Texte contouré d'encre, à la manière des cartes imprimées.
function Inscription({ x, y, taille, couleur, children, retourne }) {
  return (
    <text x={x} y={y} fontSize={taille} style={peint(couleur, ENCRE)}
          className="cj-inscription"
          transform={retourne ? `rotate(180 ${x} ${y})` : undefined}>
      {children}
    </text>
  );
}

function SymbolePasse({ couleur, epaisseur = 7, r = 17 }) {
  return (
    <g style={{ fill: 'none', stroke: couleur }} strokeWidth={epaisseur}
       strokeLinecap="round">
      <circle r={r} />
      <path d={`M${-r * 0.7} ${r * 0.7}L${r * 0.7} ${-r * 0.7}`} />
    </g>
  );
}

function SymboleInversion({ couleur, echelle = 1 }) {
  return (
    <g transform={`rotate(-45) scale(${echelle})`} style={peint(couleur, ENCRE)}
       strokeWidth="1.4" strokeLinejoin="round">
      <path d="M-18 -11h22v-7l13 11-13 11v-7h-22Z" />
      <path d="M18 11h-22v7l-13-11 13-11v7h22Z" />
    </g>
  );
}

// Ovale aux quatre couleurs des jokers.
function OvaleQuatre({ id, rx, ry }) {
  return (
    <g>
      <clipPath id={id}>
        <ellipse rx={rx} ry={ry} transform="rotate(30)" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={-60} y={-60} width={60} height={60} style={peint(TEINTES.rouge)} />
        <rect x={0} y={-60} width={60} height={60} style={peint(TEINTES.bleu)} />
        <rect x={-60} y={0} width={60} height={60} style={peint(TEINTES.jaune)} />
        <rect x={0} y={0} width={60} height={60} style={peint(TEINTES.vert)} />
      </g>
      <ellipse rx={rx} ry={ry} transform="rotate(30)" style={{ fill: 'none', stroke: PAPIER }}
               strokeWidth="2.5" />
    </g>
  );
}

// Petites cartes en éventail au centre du +4 (ou du +2 : deux cartes).
function MiniCartes({ couleurs }) {
  const n = couleurs.length;
  return (
    <g>
      {couleurs.map((c, i) => (
        <rect key={c + i} x={-7} y={-11} width={14} height={21} rx={2}
              style={peint(TEINTES[c] || c, PAPIER)} strokeWidth="1.6"
              transform={`translate(${(i - (n - 1) / 2) * 8} ${(i - (n - 1) / 2) * -4}) rotate(${(i - (n - 1) / 2) * 12})`} />
      ))}
    </g>
  );
}

function CoinUno({ valeur, retourne }) {
  const pos = retourne ? 'translate(85 132) rotate(180)' : 'translate(15 18)';
  if (valeur === 'passe') {
    return <g transform={pos}><SymbolePasse couleur={PAPIER} epaisseur={2.6} r={6} /></g>;
  }
  if (valeur === 'inversion') {
    return <g transform={pos}><SymboleInversion couleur={PAPIER} echelle={0.34} /></g>;
  }
  if (valeur === 'joker') {
    return (
      <g transform={`${pos} scale(.2)`}>
        <MiniCartes couleurs={['rouge', 'bleu', 'jaune', 'vert']} />
      </g>
    );
  }
  return (
    <Inscription x={retourne ? 85 : 15} y={retourne ? 132 : 18} taille={18}
                 couleur={PAPIER} retourne={retourne}>
      {valeur}
    </Inscription>
  );
}

// Filet doré intérieur, commun aux faces et au dos.
function Cadre() {
  return (
    <rect x="8.5" y="8.5" width="83" height="133" rx="4"
          style={{ fill: 'none', stroke: 'var(--uno-filet, rgba(236, 228, 210, .35))' }}
          strokeWidth="1" />
  );
}

function FaceUno({ couleur, valeur }) {
  const id = useId().replace(/:/g, '');
  const noire = NOIRES.includes(valeur);
  const fond = TEINTES[noire ? 'noir' : couleur] || TEINTES.noir;
  let centre;
  if (valeur === 'passe') centre = <SymbolePasse couleur={fond} />;
  else if (valeur === 'inversion') centre = <SymboleInversion couleur={fond} />;
  else if (valeur === '+2') {
    centre = <g transform="scale(1.7)"><MiniCartes couleurs={[fond, fond]} /></g>;
  } else if (valeur === '+4') {
    centre = (
      <g transform="scale(1.5)">
        <MiniCartes couleurs={['vert', 'bleu', 'rouge', 'jaune']} />
      </g>
    );
  } else if (valeur === 'joker') {
    centre = null;
  } else {
    centre = (
      <Inscription x={0} y={2} taille={60} couleur={fond}>
        {valeur}
      </Inscription>
    );
  }
  const souligne = valeur === '6' || valeur === '9';
  return (
    <>
      <rect width="100" height="150" rx="9" style={peint(PAPIER)} />
      <rect x="5" y="5" width="90" height="140" rx="6" style={peint(fond)} />
      <Cadre />
      <g transform="translate(50 75)">
        {valeur === 'joker'
          ? <OvaleQuatre id={`${id}-o`} rx={34} ry={56} />
          : <ellipse rx="34" ry="56" transform="rotate(30)" style={peint(PAPIER)} />}
        {centre}
        {souligne && <rect x={-12} y={26} width={24} height={4} rx={2} style={peint(fond)} />}
      </g>
      <CoinUno valeur={valeur} />
      <CoinUno valeur={valeur} retourne />
    </>
  );
}

// Dos : nuit, ovale rouge sang, croissant de lune et nom du jeu doré.
function DosUno() {
  return (
    <>
      <rect width="100" height="150" rx="9" style={peint(PAPIER)} />
      <rect x="5" y="5" width="90" height="140" rx="6" style={peint(TEINTES.noir)} />
      <Cadre />
      <ellipse cx="50" cy="75" rx="34" ry="56" transform="rotate(30 50 75)"
               style={peint(TEINTES.rouge)} />
      <path d="M57 36a9 9 0 1 0 0 16 10 10 0 0 1 0-16Z" style={peint(PAPIER)} />
      <Inscription x={50} y={80} taille={32} couleur={TEINTES.jaune}>
        <tspan className="cj-logo">UNO</tspan>
      </Inscription>
    </>
  );
}

// -- 52 cartes ----------------------------------------------------------------

// Enseignes, sur une grille 20 × 20 centrée en (10, 10).
const FORMES = {
  coeur: <path d="M10 18C4 13 1 10 1 6.2 1 3.4 3.2 1.5 5.6 1.5c1.8 0 3.4 1.1 4.4 2.7 1-1.6 2.6-2.7 4.4-2.7 2.4 0 4.6 1.9 4.6 4.7C19 10 16 13 10 18Z" />,
  carreau: <path d="M10 1l7.5 9L10 19 2.5 10Z" />,
  pique: <path d="M10 1.5c3 4.5 8.5 7 8.5 10.8 0 2.5-1.9 4.1-4 4.1-1.5 0-2.9-.8-3.6-2 .2 2 1 3.4 2.3 4.4H6.8c1.3-1 2.1-2.4 2.3-4.4-.7 1.2-2.1 2-3.6 2-2.1 0-4-1.6-4-4.1C1.5 8.5 7 6 10 1.5Z" />,
  trefle: (
    <>
      <circle cx="10" cy="5.6" r="4.2" />
      <circle cx="5.2" cy="11.2" r="4.2" />
      <circle cx="14.8" cy="11.2" r="4.2" />
      <path d="M9 10.5c0 4-1 6.8-2.5 8.3h7C12 17.3 11 14.5 11 10.5Z" />
    </>
  ),
};

function Enseigne({ enseigne, x, y, taille, retourne }) {
  const e = taille / 20;
  return (
    <g transform={`translate(${x} ${y})${retourne ? ' rotate(180)' : ''} scale(${e}) translate(-10 -10)`}>
      {FORMES[enseigne]}
    </g>
  );
}

// Disposition des enseignes des cartes 2 à 10 (colonnes 31 / 50 / 69).
const G = 31;
const C = 50;
const D = 69;
const POINTS = {
  2: [[C, 30], [C, 120]],
  3: [[C, 30], [C, 75], [C, 120]],
  4: [[G, 30], [D, 30], [G, 120], [D, 120]],
  5: [[G, 30], [D, 30], [C, 75], [G, 120], [D, 120]],
  6: [[G, 30], [D, 30], [G, 75], [D, 75], [G, 120], [D, 120]],
  7: [[G, 30], [D, 30], [C, 52], [G, 75], [D, 75], [G, 120], [D, 120]],
  8: [[G, 30], [D, 30], [C, 52], [G, 75], [D, 75], [C, 98], [G, 120],
    [D, 120]],
  9: [[G, 30], [D, 30], [G, 60], [D, 60], [C, 75], [G, 90], [D, 90],
    [G, 120], [D, 120]],
  10: [[G, 30], [D, 30], [C, 45], [G, 60], [D, 60], [G, 90], [D, 90],
    [C, 105], [G, 120], [D, 120]],
};

function CoinClassique({ rang, enseigne, retourne }) {
  return (
    <g transform={retourne ? 'rotate(180 50 75)' : undefined}>
      <text x="12" y="19" className="cj-rang" fontSize={rang === '10' ? 14 : 17}>
        {rang}
      </text>
      <Enseigne enseigne={enseigne} x={12} y={31} taille={11} />
    </g>
  );
}

function FaceClassique({ enseigne, rang }) {
  const rouge = enseigne === 'coeur' || enseigne === 'carreau';
  const encre = rouge ? '#b3261e' : '#16161c';
  let centre;
  if (rang === 'joker') {
    return (
      <>
        <rect x=".75" y=".75" width="98.5" height="148.5" rx="8" fill="#fbf7ee"
              stroke="#cfc4ad" strokeWidth="1.5" />
        <g fill="#16161c">
          <text x="50" y="80" className="cj-figure" fontSize="18">JOKER</text>
          <path d="M50 30l5 10 11 1.6-8 7.8 1.9 11L50 55.2l-9.9 5.2 1.9-11-8-7.8 11-1.6Z"
                fill="#b3261e" />
          <path d="M50 95l5 10 11 1.6-8 7.8 1.9 11L50 120.2l-9.9 5.2 1.9-11-8-7.8 11-1.6Z" />
        </g>
      </>
    );
  }
  if (POINTS[rang]) {
    centre = POINTS[rang].map(([x, y]) => (
      <Enseigne key={`${x}-${y}`} enseigne={enseigne} x={x} y={y} taille={17}
                retourne={y > 75} />
    ));
  } else if (rang === 'A') {
    centre = <Enseigne enseigne={enseigne} x={50} y={75} taille={44} />;
  } else {
    // Figures : cadre doré, grande lettre et enseigne.
    centre = (
      <>
        <rect x="24" y="24" width="52" height="102" rx="3" fill="none"
              stroke="#b8862b" strokeWidth="1.6" />
        <rect x="27" y="27" width="46" height="96" rx="2"
              fill={rouge ? '#fbe9e4' : '#ecebf0'} />
        <text x="50" y="72" className="cj-figure" fontSize="40">{rang}</text>
        <Enseigne enseigne={enseigne} x={50} y={104} taille={20} />
      </>
    );
  }
  return (
    <>
      <rect x=".75" y=".75" width="98.5" height="148.5" rx="8" fill="#fbf7ee"
            stroke="#cfc4ad" strokeWidth="1.5" />
      <g fill={encre}>
        {centre}
        <CoinClassique rang={rang} enseigne={enseigne} />
        <CoinClassique rang={rang} enseigne={enseigne} retourne />
      </g>
    </>
  );
}

// Dos : treillis doré sur rouge sang, dans l'esprit de l'application.
function DosClassique() {
  const id = useId().replace(/:/g, '');
  return (
    <>
      <defs>
        <pattern id={`${id}-t`} width="10" height="10" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(45)">
          <path d="M0 5h10M5 0v10" stroke="#d4a54a" strokeWidth="1" opacity=".55" />
        </pattern>
      </defs>
      <rect width="100" height="150" rx="9" fill="#fbf7ee" />
      <rect x="6" y="6" width="88" height="138" rx="5" fill="#6e1212" />
      <rect x="6" y="6" width="88" height="138" rx="5" fill={`url(#${id}-t)`} />
      <rect x="11" y="11" width="78" height="128" rx="3" fill="none"
            stroke="#d4a54a" strokeWidth="1.2" />
      <circle cx="50" cy="75" r="14" fill="#6e1212" stroke="#d4a54a" strokeWidth="1.4" />
      <path d="M54 68a8 8 0 1 0 0 14 9 9 0 0 1 0-14Z" fill="#ece4d2" />
    </>
  );
}

// -- composant -------------------------------------------------------------

export function CarteJeu({
  jeu = 'uno', couleur = 'rouge', valeur = '7', enseigne = 'coeur', rang = 'A',
  face = 'recto', taille = 'm', couleurChoisie, jouable, selectionnee,
  desactivee, inclinaison, onClick, libelle, className, style, ...reste
}) {
  const verso = face === 'verso';
  const nom = libelle || nomCarte({
    jeu, couleur, valeur, enseigne, rang, face,
  });
  let dessin;
  if (jeu === 'classique') dessin = verso ? <DosClassique /> : <FaceClassique enseigne={enseigne} rang={rang} />;
  else dessin = verso ? <DosUno /> : <FaceUno couleur={couleur} valeur={valeur} />;

  const classes = cx('cj', `cj-${taille}`, onClick && 'cj-bouton',
    jouable && 'cj-jouable', selectionnee && 'cj-selectionnee',
    desactivee && 'cj-desactivee',
    couleurChoisie && `cj-annonce cj-annonce-${couleurChoisie}`, className);
  const styles = inclinaison ? { ...style, '--cj-inclinaison': `${inclinaison}deg` } : style;
  const svg = (
    <svg viewBox="0 0 100 150" aria-hidden="true" focusable="false" className="cj-svg">
      {dessin}
    </svg>
  );
  if (onClick) {
    return (
      <button type="button" className={classes} style={styles} onClick={onClick}
              disabled={desactivee} aria-label={nom}
              aria-pressed={selectionnee === undefined ? undefined : Boolean(selectionnee)}
              {...reste}>
        {svg}
      </button>
    );
  }
  return (
    <span role="img" aria-label={nom} className={classes} style={styles} {...reste}>
      {svg}
    </span>
  );
}

// Cartes posées côte à côte et chevauchées : une main, une pioche étalée.
//   chevauchement  part de la largeur recouverte par la carte suivante (0 à
//                  0,9) ; arc : cartes inclinées en éventail ;
//   libelle        nom accessible de la liste.
// Chaque enfant (en général une `CarteJeu`) devient un élément de liste.
export function Eventail({
  chevauchement = 0.45, arc, libelle, className, children,
}) {
  const cartes = Children.toArray(children);
  const n = cartes.length;
  const recouvre = Math.max(0, Math.min(0.9, Number(chevauchement) || 0));
  return (
    <ul className={cx('eventail', arc && 'eventail-arc', className)}
        aria-label={libelle} style={{ '--eventail-recouvre': recouvre }}>
      {cartes.map((carte, i) => {
        const pos = n > 1 ? i / (n - 1) - 0.5 : 0;
        return (
          <li key={carte.key ?? i} className="eventail-place"
              style={arc ? {
                '--eventail-angle': `${pos * Math.min(50, n * 6)}deg`,
                '--eventail-creux': `${Math.abs(pos) * Math.min(30, n * 3)}%`,
              } : undefined}>
            {carte}
          </li>
        );
      })}
    </ul>
  );
}
