import { useLayoutEffect, useRef } from 'react';

// Glissement des cartes sur le tapis : une carte posée glisse de la main (ou
// du siège) du joueur vers la défausse, une carte piochée glisse de la pioche
// vers la main (le même geste, à l'envers). Très bref : de quoi donner du
// mouvement sans ralentir le jeu.
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
const PAS = 90; // décalage entre deux cartes piochées, ms
const COURBE = 'cubic-bezier(.2, .75, .25, 1)';

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
    // Première lecture de la manche : on montre l'état, sans rejouer.
    if (avant.manche !== manche || n <= avant.n) return;
    const el = racine.current;
    if (!el || mouvementReduit()) return;

    const nouveaux = evenements.filter((e) => e.n > avant.n);
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
