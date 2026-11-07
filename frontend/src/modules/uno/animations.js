import { useLayoutEffect, useRef } from 'react';

import { musique } from './ambiance';

// Glissement des cartes sur le tapis : une carte posée glisse de la main (ou
// du siège) du joueur vers la défausse, une carte piochée glisse de la pioche
// vers la main (le même geste, à l'envers). Très bref : de quoi donner du
// mouvement sans ralentir le jeu. À l'ouverture d'une manche, la donne : les
// cartes partent de la pioche une à une, en tournant autour de la table.
//
// Le serveur numérote les poses et les pioches (`partie.evenements`) ; le
// hook rejoue celles qu'il n'a pas encore vues, une fois le rendu fait, en
// animant les éléments déjà à leur place depuis l'endroit d'où ils viennent
// (technique FLIP, API Web Animations). Repères dans le DOM, posés par
// `Tapis` et `Plateau` :
//   [data-uno="pioche"] · [data-uno="defausse"]   les deux piles
//   [data-uno-joueur="nom"]                        le siège d'un joueur
//   [data-uno-main]                                la main du joueur
//   [data-carte="id"]                              une carte de la main

const DUREE = 280;
// Décalage entre deux cartes piochées, ms : elles arrivent une à une (+2,
// +4, pioche jusqu'à pouvoir jouer), assez vite pour ne pas retarder le jeu.
const PAS = 200;
const COURBE = 'cubic-bezier(.2, .75, .25, 1)';
// Durée de la donne (ms), quel que soit le nombre de joueurs ; une carte au
// plus toutes les `PAS_DONNE` ms.
const DONNE = 2400;
const PAS_DONNE = 90;

const mouvementReduit = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// L'élément à animer : une carte d'un éventail glisse avec sa place (la place
// porte l'inclinaison, la translation s'applique donc dans le repère de
// l'écran).
const mobile = (el) => el.closest('.eventail-place') || el;

// Fait glisser `el`, déjà à sa place, depuis le rectangle `depuis` : il part
// de là, à la taille de ce rectangle, et rejoint sa place.
function glisser(el, depuis, delai = 0) {
  if (!el || !depuis || typeof el.animate !== 'function') return;
  const cible = mobile(el);
  const vers = el.getBoundingClientRect();
  if (!vers.width || !depuis.width) return;
  const dx = depuis.left + depuis.width / 2 - (vers.left + vers.width / 2);
  const dy = depuis.top + depuis.height / 2 - (vers.top + vers.height / 2);
  const echelle = Math.max(0.3, Math.min(3.5, depuis.width / vers.width));
  const fin = window.getComputedStyle(cible).transform;
  const reste = fin && fin !== 'none' ? ` ${fin}` : '';
  const avant = cible.style.zIndex;
  cible.style.zIndex = '30';
  // Une main défile (`overflow`) : pendant le vol, elle laisse passer la carte
  // qui vient de la pioche.
  const liste = cible.closest('.eventail');
  if (liste) {
    liste.dataset.vols = String(Number(liste.dataset.vols || 0) + 1);
    liste.style.overflow = 'visible';
  }
  const anim = cible.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${echelle})${reste}` },
    { transform: fin && fin !== 'none' ? fin : 'none' },
  ], {
    duration: DUREE, delay: delai, easing: COURBE, fill: 'backwards',
  });
  // Une carte qui attend son tour reste invisible : pas de pile de cartes
  // découvertes sur la pioche.
  if (delai > 0) cible.animate([{ opacity: 0 }, { opacity: 0 }], { duration: delai });
  const rendre = () => {
    cible.style.zIndex = avant;
    if (liste) {
      const restant = Number(liste.dataset.vols) - 1;
      if (restant > 0) {
        liste.dataset.vols = String(restant);
      } else {
        delete liste.dataset.vols;
        liste.style.overflow = '';
      }
    }
  };
  anim.onfinish = rendre;
  anim.oncancel = rendre;
}

const rectDe = (el) => (el ? el.getBoundingClientRect() : null);

// La donne : une carte à chacun, dans l'ordre de la table, autant de tours
// qu'il y a de cartes en main, puis la première carte retournée sur la
// défausse. Chaque carte attend sur la pioche que son tour vienne
// (`fill: 'backwards'` de `glisser`).
function distribuer(el, partie, moi) {
  const source = rectDe(el.querySelector('[data-uno="pioche"]'));
  if (!source) return;
  const main = [...el.querySelectorAll('[data-uno-main] [data-carte]')];
  const dos = (nom) => {
    const s = [...el.querySelectorAll('[data-uno-joueur]')]
      .find((x) => x.dataset.unoJoueur === nom);
    return s ? [...s.querySelectorAll('.cj')] : [];
  };
  const paquets = partie.joueurs.map((j) => (j.nom === moi ? main : dos(j.nom)));
  const total = paquets.reduce((somme, cartes) => somme + cartes.length, 0);
  if (!total) return;
  const pas = Math.min(PAS_DONNE, DONNE / total);
  const tours = Math.max(...paquets.map((cartes) => cartes.length));
  let delai = 0;
  let distribuees = 0;
  for (let k = 0; k < tours; k += 1) {
    paquets.forEach((cartes) => {
      if (k >= cartes.length) return;
      glisser(cartes[k], source, delai);
      // Un froissement toutes les trois cartes : le bruit d'une donne, sans
      // cacophonie à dix joueurs.
      if (distribuees % 3 === 0) musique.effet('pioche', delai / 1000);
      distribuees += 1;
      delai += pas;
    });
  }
  const retournee = delai + 150;
  glisser(el.querySelector('[data-uno="defausse"]'), source, retournee);
  musique.effet('pose', (retournee + DUREE * 0.6) / 1000);
}

// `racine` : ref de l'élément qui contient le tapis ; `partie` : la manche
// vue par le joueur (ou par un spectateur) ; `manche` : numéro de la manche
// (les événements repartent de 1 à chaque manche) ; `moi` : le joueur, ou
// null pour un spectateur ; `origine` : ref du rectangle de la carte que le
// joueur vient de cliquer (elle a quitté le DOM au rendu suivant).
export function useGlissements(racine, partie, manche, moi, origine) {
  const vu = useRef({ manche: null, n: 0, main: new Set() });

  useLayoutEffect(() => {
    const evenements = partie.evenements || [];
    const n = evenements.length ? evenements[evenements.length - 1].n : 0;
    const main = new Set((partie.main || []).map((c) => c.id));
    const avant = vu.current;
    vu.current = { manche, n, main };
    const depart = origine && origine.current;
    if (origine) origine.current = null;
    // Première lecture de la manche : on montre l'état, sans rejouer. Si
    // rien n'a encore été joué, la donne vient d'avoir lieu : on la montre.
    if (avant.manche !== manche) {
      if (n === 0 && racine.current && !mouvementReduit()) {
        distribuer(racine.current, partie, moi);
      }
      return;
    }
    if (n <= avant.n) return;
    const nouveaux = evenements.filter((e) => e.n > avant.n);

    // Bruitages : une carte posée claque quand elle arrive sur le tapis ; une
    // carte piochée se détache de la pioche, chacune un peu après la
    // précédente.
    let retard = 0;
    nouveaux.forEach((e) => {
      if (e.type === 'pose') {
        musique.effet('pose', DUREE / 1000 * 0.6);
      } else if (e.type === 'pioche') {
        for (let i = 0; i < Math.min(e.cartes, 12); i += 1) {
          musique.effet('pioche', retard);
          retard += PAS / 1000;
        }
      }
    });

    const el = racine.current;
    if (!el || mouvementReduit()) return;
    const siege = (nom) => [...el.querySelectorAll('[data-uno-joueur]')]
      .find((s) => s.dataset.unoJoueur === nom);
    const pioche = el.querySelector('[data-uno="pioche"]');
    const defausse = el.querySelector('[data-uno="defausse"]');

    // Pose : la dernière glisse vers la défausse.
    const poses = nouveaux.filter((e) => e.type === 'pose');
    if (poses.length) {
      const { joueur } = poses[poses.length - 1];
      let source = null;
      if (joueur === moi) {
        source = depart || rectDe(el.querySelector('[data-uno-main]'));
      } else {
        const s = siege(joueur);
        const dos = s ? [...s.querySelectorAll('.cj')] : [];
        source = rectDe(dos.length ? dos[dos.length - 1] : s);
      }
      glisser(defausse, source);
    }

    // Pioche : de la pioche vers la main (les cartes nouvelles) ou le siège.
    let delai = 0;
    nouveaux.filter((e) => e.type === 'pioche').forEach((e) => {
      const source = rectDe(pioche);
      let cartes = [];
      if (e.joueur === moi) {
        cartes = [...main].filter((id) => !avant.main.has(id))
          .map((id) => el.querySelector(`[data-carte="${id}"]`));
      } else {
        const s = siege(e.joueur);
        cartes = s ? [...s.querySelectorAll('.cj')].slice(-e.cartes) : [];
      }
      cartes.forEach((c) => {
        glisser(c, source, delai);
        delai += PAS;
      });
    });
  }, [partie, manche]); // eslint-disable-line react-hooks/exhaustive-deps
}
