import { useCallback, useEffect, useRef, useState } from 'react';

import { identique } from '@ui';

// Une table de jeu tenue à jour par attente longue : chaque lecture donne au
// serveur la version de la table qu'on a déjà, et sa réponse part au premier
// changement (un coup, un joueur qui arrive, part ou s'absente) ou au bout
// de 25 s (`backend/commun/salons.py`, `attendre`). La lecture suivante part
// dès la réponse reçue : un coup s'affiche chez tous les joueurs à peu près
// en même temps, sans relecture à intervalle fixe.
//
// `lecteur({ code, version }, { signal })` : `lireTable` du jeu, ou la vue du
// spectateur. Rend `{ donnees, erreur, relire, remplacer }` :
//   relire     relance la lecture tout de suite (après s'être assis…) ;
//   remplacer  pose une table reçue autrement, celle qu'un coup renvoie.
// Après une erreur (réseau, serveur arrêté), nouvel essai toutes les
// `REPRISE` ms ; les dernières données restent affichées.

const REPRISE = 2000;

export function useTable(lecteur, code) {
  const [etat, setEtat] = useState({ donnees: null, erreur: null });
  const version = useRef(null);
  const relance = useRef(() => {});

  // Une table plus ancienne que celle qu'on a (réponse croisée avec celle
  // d'un coup) est ignorée ; une table identique ne provoque aucun rendu.
  const remplacer = useCallback((d) => {
    if (!d || (version.current !== null && d.version < version.current)) return;
    version.current = d.version;
    setEtat((prec) => (!prec.erreur && identique(prec.donnees, d)
      ? prec : { donnees: d, erreur: null }));
  }, []);

  useEffect(() => {
    let vivant = true;
    let controle = null;
    let minuteur = null;
    version.current = null;
    setEtat({ donnees: null, erreur: null });

    const lire = async () => {
      minuteur = null;
      controle = new AbortController();
      try {
        const d = await lecteur({ code, version: version.current },
          { signal: controle.signal });
        if (!vivant) return;
        remplacer(d);
        lire();
      } catch (e) {
        if (!vivant) return;
        // Abandon demandé par `relire` : on repart aussitôt.
        if (e.name === 'AbortError') {
          lire();
          return;
        }
        setEtat((prec) => ({ ...prec, erreur: e.message }));
        minuteur = setTimeout(lire, REPRISE);
      }
    };
    relance.current = () => {
      if (minuteur) {
        clearTimeout(minuteur);
        lire();
      } else if (controle) {
        controle.abort();
      }
    };
    lire();
    return () => {
      vivant = false;
      clearTimeout(minuteur);
      if (controle) controle.abort();
    };
  }, [lecteur, code, remplacer]);

  const relire = useCallback(() => relance.current(), []);
  return {
    donnees: etat.donnees, erreur: etat.erreur, relire, remplacer,
  };
}
