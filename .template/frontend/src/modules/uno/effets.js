import {
  auHasard, choisir, coup, souffle,
} from './synthese';

// Bruitages des cartes : on en joue un, au hasard, à chaque carte posée ou
// piochée. Trois variantes de chaque, jamais deux fois la même de suite, et
// de légères variations de hauteur : le jeu ne sonne pas mécanique.
//   pose     une carte tombe sur le feutre : claquement net, tape douce,
//            double tape ;
//   pioche   une carte quitte le tas : glissement, frottement de cartes,
//            souffle suivi d'un tic.
// Chaque variante reçoit le moteur `m` (`synthese.js`) et l'instant `t`.

const jitter = () => auHasard(0.9, 1.15);

const POSES = [
  // Claquement net : bruit clair et choc sourd.
  (m, t) => {
    const j = jitter();
    souffle(m, t, { freq: 2800 * j, q: 1.1, force: 0.55, duree: 0.07 });
    coup(m, t, { freq: 170 * j, fin: 70, force: 0.5, duree: 0.09 });
  },
  // Tape douce : plus sourde, plus longue.
  (m, t) => {
    const j = jitter();
    souffle(m, t, {
      type: 'lowpass', freq: 1700 * j, q: 0.7, force: 0.5, duree: 0.1,
    });
    coup(m, t, { freq: 125 * j, fin: 55, force: 0.55, duree: 0.12 });
  },
  // Double tape : la carte rebondit.
  (m, t) => {
    const j = jitter();
    souffle(m, t, { freq: 3200 * j, q: 1.3, force: 0.5, duree: 0.05 });
    coup(m, t, { freq: 160 * j, fin: 75, force: 0.4, duree: 0.07 });
    souffle(m, t + 0.05, { freq: 2400 * j, q: 1.2, force: 0.28, duree: 0.045 });
  },
];

const PIOCHES = [
  // Glissement : un souffle qui monte.
  (m, t) => {
    const j = jitter();
    souffle(m, t, {
      freq: 900 * j, fin: 3600 * j, q: 0.9, force: 0.28, attaque: 0.04,
      duree: 0.16,
    });
  },
  // Frottement : trois petits tics qui montent, le doigt sur les cartes.
  (m, t) => {
    const j = jitter();
    [0, 0.035, 0.072].forEach((decalage, i) => {
      souffle(m, t + decalage, {
        type: 'highpass', freq: (2200 + i * 700) * j, q: 0.8, force: 0.26,
        duree: 0.03,
      });
    });
  },
  // Souffle, puis tic de la carte qui se détache.
  (m, t) => {
    const j = jitter();
    souffle(m, t, {
      type: 'highpass', freq: 1800 * j, q: 0.6, force: 0.16, attaque: 0.05,
      duree: 0.13,
    });
    souffle(m, t + 0.12, { freq: 3400 * j, q: 1.4, force: 0.32, duree: 0.035 });
  },
];

const FAMILLES = { pose: POSES, pioche: PIOCHES };
const derniere = {};

// Joue un bruitage de la famille `nom` à l'instant `t`.
export function effet(m, nom, t) {
  const variantes = FAMILLES[nom];
  if (!variantes) return;
  let v = choisir(variantes);
  if (variantes.length > 1 && v === derniere[nom]) {
    v = variantes[(variantes.indexOf(v) + 1) % variantes.length];
  }
  derniere[nom] = v;
  v(m, t);
}
